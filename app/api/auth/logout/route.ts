import { clearSessionCookie, deleteAdminSession, readSessionToken } from "@/lib/admin-auth";

export async function POST(request: Request) {
  await deleteAdminSession(readSessionToken(request));
  return new Response(null, {
    status: 303,
    headers: { Location: "/admin/login", "Set-Cookie": clearSessionCookie(), "Cache-Control": "no-store" },
  });
}
