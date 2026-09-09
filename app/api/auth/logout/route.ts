import { clearSessionCookie, deleteAdminSession, readSessionToken } from "@/lib/admin-auth";

export async function POST(request: Request) {
  try {
    await deleteAdminSession(readSessionToken(request));
  } catch {
    return Response.json({ error: "Sesi belum dapat diakhiri. Silakan coba keluar kembali." }, { status: 503 });
  }
  if (request.headers.get("content-type")?.split(";")[0].trim() === "application/json") {
    return Response.json({ success: true }, { headers: { "Set-Cookie": clearSessionCookie(), "Cache-Control": "no-store" } });
  }
  return new Response(null, {
    status: 303,
    headers: { Location: "/admin/login", "Set-Cookie": clearSessionCookie(), "Cache-Control": "no-store" },
  });
}

// Opening the endpoint must never invalidate a session through a GET request.
export function GET() {
  return new Response(null, { status: 303, headers: { Location: "/admin/login", "Cache-Control": "no-store" } });
}
