/** Parse API responses without exposing proxy HTML or JSON parser errors. */
export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function readApiJson<T extends object>(response: Response, fallback = "Layanan belum merespons dengan benar. Silakan coba kembali."): Promise<T> {
  let data: unknown;
  try { data = await response.json(); } catch { throw new ApiError(fallback, response.status); }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new ApiError(fallback, response.status);
  if (!response.ok) {
    const message = (data as { error?: unknown }).error;
    throw new ApiError(typeof message === "string" && message ? message : fallback, response.status);
  }
  return data as T;
}

export async function apiRequest<T extends object>(url: string, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(url, { ...init, credentials: "same-origin", cache: "no-store" });
    if (response.status === 401 && url.startsWith("/api/admin/")) {
      if (typeof window !== "undefined") window.location.replace("/admin/login");
      throw new ApiError("Sesi petugas telah berakhir. Silakan masuk kembali.", 401);
    }
    return await readApiJson<T>(response);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("Koneksi terputus. Periksa jaringan dan coba kembali. Muat ulang untuk memastikan perubahan terakhir tersimpan.", 0);
  }
}
