/** Server SIBUKTAMU untuk Dinas Tenaga Kerja dan Transmigrasi. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import { rejectUnsafeRequest, secureResponse, boundedJsonRequest } from "../lib/http-security";
import { rateLimit } from "../lib/rate-limit";
import { dispatchQueuedNotification, dispatchVisitNotifications } from "../lib/whatsapp";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    try {
      if (url.pathname.startsWith("/api/")) {
        const rejection = rejectUnsafeRequest(request);
        if (rejection) return secureResponse(rejection, request);
        let budget: [string, number, number] | null = null;
        if (url.pathname === "/api/auth/login") budget = ["login", 20, 900];
        else if (url.pathname === "/api/visits") budget = ["register", 60, 300];
        else if (url.pathname === "/api/checkout/active") budget = request.method === "GET" ? ["checkout-list", 600, 300] : ["checkout-list-complete", 120, 300];
        else if (url.pathname === "/api/checkout") budget = ["checkout", 60, 900];
        else if (url.pathname === "/api/auth/change-password") budget = ["password", 10, 900];
        else if (url.pathname === "/api/admin/export") budget = ["export", 10, 300];
        else if (request.method === "POST") budget = ["mutation", 120, 300];
        if (budget) {
          const limited = await rateLimit(request, ...budget);
          if (limited) return secureResponse(limited, request);
          if (Math.random() < 0.01) ctx.waitUntil(env.DB.prepare("DELETE FROM security_rate_limits WHERE expires_at < ?").bind(Math.floor(Date.now()/1000)).run());
        }
        if (request.body) request = await boundedJsonRequest(request, url.pathname === "/api/visits" ? 750000 : 64000);
      }
      const response = await handler.fetch(request, env, ctx);
      const result = secureResponse(response, request);
      const notificationVisitId = result.headers.get("X-Notification-Visit-Id");
      result.headers.delete("X-Notification-Visit-Id");
      if (notificationVisitId) ctx.waitUntil(dispatchVisitNotifications(notificationVisitId).catch(() => console.error("notification_dispatch_failed")));
      const notificationId = result.headers.get("X-Notification-Id");
      result.headers.delete("X-Notification-Id");
      if (notificationId) ctx.waitUntil(dispatchQueuedNotification(notificationId).catch(() => console.error("notification_dispatch_failed")));
      return result;
    } catch (error) {
      const oversized = error instanceof Error && error.message === "BODY_TOO_LARGE";
      return secureResponse(Response.json({ error: oversized ? "Ukuran data melebihi batas." : "Layanan sementara belum tersedia. Silakan coba kembali." }, {status: oversized ? 413 : 503}), request);
    }
  },
};

export default worker;
