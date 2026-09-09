"use client";

import { useRef, useState } from "react";
import { LoaderCircle, LogOut } from "lucide-react";
import { apiRequest } from "@/lib/api-client";

export function LogoutButton({ className = "" }: { className?: string }) {
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function logout(event: React.FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true; setBusy(true); setError("");
    try {
      const result = await apiRequest<{ success: boolean }>("/api/auth/logout", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
      });
      if (result.success !== true) throw new Error("Sesi belum dapat diakhiri. Silakan coba kembali.");
      window.location.replace("/admin/login");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Belum dapat keluar. Silakan coba kembali.");
      pending.current = false; setBusy(false);
    }
  }
  return <form action="/api/auth/logout" method="post" onSubmit={logout}>
    <button type="submit" disabled={busy} aria-busy={busy} className={`mt-4 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs font-bold transition disabled:opacity-60 ${className}`}>
      {busy ? <LoaderCircle className="size-4 animate-spin" /> : <LogOut className="size-4" />}{busy ? "Mengakhiri sesi…" : "Keluar dari Sistem"}
    </button>
    {error && <p role="alert" className="mt-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
  </form>;
}
