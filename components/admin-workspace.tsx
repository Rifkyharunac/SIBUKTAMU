"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import {
  Activity,
  Archive,
  ArrowRightLeft,
  BarChart3,
  Bell,
  BookOpenCheck,
  Building2,
  CheckCircle2,
  CheckCheck,
  Clock3,
  Download,
  FileDown,
  FileText,
  History,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  MessageCircle,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Undo2,
  UserCog,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api-client";
import { LogoutButton } from "@/components/logout-button";
import type { AdminIdentity } from "@/lib/admin-auth";

type Visit = {
  id: string; visitCode: string; queueNumber: number; visitorName: string; visitorType: string;
  institutionName: string | null; phone: string; purpose: string | null; employeeName: string | null;
  status: string; source: string; checkInAt: string; checkOutAt: string | null; durationMinutes: number | null;
  departmentId: string; departmentName: string; serviceId: string; serviceName: string; signaturePath: string;
};
type Department = { id: string; code: string; name: string; description: string; whatsappNumber: string | null; email: string | null; isActive: boolean };
type Service = { id: string; name: string; category: string; description: string; departmentId: string; departmentName: string; whatsappNumber: string | null; requiresPurpose: boolean; allowsEmployee: boolean; isActive: boolean };
type Employee = { id: string; name: string; position: string; departmentId: string; departmentName: string; isActive: boolean };
type AdminUser = { id: string; name: string; email: string; username: string | null; mustChangePassword: boolean | null; roleId: string; role: string; roleName: string; departmentId: string | null; whatsappNumber: string | null; isActive: boolean; lastSeenAt: string | null };
type Notification = {
  id: string; visitId: string; recipient: string | null; message: string; status: string; attempts: number;
  isRead: boolean; readAt: string | null; archivedAt: string | null; errorMessage: string | null; createdAt: string;
  visitCode: string; visitorName: string; serviceName: string; departmentId: string;
};
type Audit = { id: string; action: string; entity: string; entityId: string | null; newValue: string | null; ipAddress: string | null; createdAt: string; userName: string | null };
type Setting = { key: string; value: string };
type Overview = {
  unreadNotifications: number;
  analytics: {daily:{date:string;count:number}[];byService:{name:string;count:number}[];byType:{name:string;count:number}[]};
  identity: AdminIdentity;
  serverTime: { timestamp: string };
  stats: { today: number; month: number; active: number; waiting: number; serving: number; completed: number; averageDuration: number };
  visits: Visit[]; departments: Department[]; services: Service[]; employees: Employee[]; users: AdminUser[];
  notifications: Notification[]; notificationConfig: { whatsappConfigured: boolean }; auditLogs: Audit[]; settings: Setting[];
};

const sectionTitles: Record<string, string> = {
  dashboard: "Dashboard Pelayanan", kunjungan: "Data Kunjungan", bidang: "Master Bidang", layanan: "Master Layanan",
  pegawai: "Data Pegawai", users: "Pengguna & Peran", whatsapp: "Konfigurasi WhatsApp", qrcode: "QR Code Buku Tamu",
  laporan: "Laporan Buku Tamu", notifikasi: "Pusat Notifikasi", "audit-log": "Audit Log", settings: "Pengaturan Sistem",
};

const navItems = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ALL"] },
  { key: "kunjungan", label: "Kunjungan", icon: BookOpenCheck, roles: ["ALL"] },
  { key: "input-tamu", label: "Input Tamu", icon: UserRound, roles: ["SUPER_ADMIN", "FRONT_OFFICE"], href: "/kiosk" },
  { key: "bidang", label: "Bidang", icon: Building2, roles: ["SUPER_ADMIN"] },
  { key: "layanan", label: "Layanan", icon: Activity, roles: ["SUPER_ADMIN"] },
  { key: "pegawai", label: "Pegawai", icon: Users, roles: ["SUPER_ADMIN"] },
  { key: "users", label: "Pengguna", icon: UserCog, roles: ["SUPER_ADMIN"] },
  { key: "qrcode", label: "QR Code", icon: QrCode, roles: ["SUPER_ADMIN", "FRONT_OFFICE"] },
  { key: "laporan", label: "Laporan", icon: FileText, roles: ["ALL"] },
  { key: "notifikasi", label: "Notifikasi", icon: Bell, roles: ["SUPER_ADMIN", "ADMIN_BIDANG"] },
  { key: "audit-log", label: "Audit Log", icon: History, roles: ["SUPER_ADMIN"] },
  { key: "settings", label: "Pengaturan", icon: Settings, roles: ["SUPER_ADMIN"] },
  { key: "password", label: "Ganti Sandi", icon: ShieldCheck, roles: ["ALL"] },
];

export function AdminWorkspace({ section, initialIdentity, focusedVisitId }: { section: string; initialIdentity: AdminIdentity; focusedVisitId?: string }) {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);

  const latestRequest = useRef(0);
  const load = useCallback(async (quiet = false) => {
    const requestId=++latestRequest.current;
    if (!quiet) setLoading(true);
    try {
      const params = new URLSearchParams({ ...(search ? { search } : {}), ...(status ? { status } : {}), ...(department ? { department } : {}) });
      const result = await apiRequest<Overview>(`/api/admin/overview?${params}`);
      if(requestId !== latestRequest.current) return;
      setData(result);
      if (focusedVisitId) setSelectedVisit(result.visits.find((visit: Visit) => visit.id === focusedVisitId) ?? null);
      setError("");
    } catch (caught) { if (requestId === latestRequest.current) setError(caught instanceof Error ? caught.message : "Data belum dapat dimuat."); }
    finally { if (requestId === latestRequest.current) setLoading(false); }
  }, [department, focusedVisitId, search, status]);

  useEffect(() => {
    // The request callback synchronizes the dashboard with server state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const interval = window.setInterval(() => { if (document.visibilityState === "visible") void load(true); }, 15_000);
    return () => window.clearInterval(interval);
  }, [load]);

  const mutationPending = useRef(false);
  const [saving, setSaving] = useState(false);
  async function action(payload: Record<string, unknown>, successMessage = "Perubahan berhasil disimpan.") {
    if (mutationPending.current) return false;
    mutationPending.current = true; setSaving(true);
    setError(""); setNotice("");
    try {
      const result = await apiRequest<{ success: boolean }>("/api/admin/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (result.success !== true) throw new Error("Server belum mengonfirmasi perubahan. Muat ulang data sebelum mencoba kembali.");
      setNotice(successMessage);
      await load(true);
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Perubahan belum berhasil.");
      return false;
    } finally { mutationPending.current = false; setSaving(false); }
  }

  const role = data?.identity.role ?? initialIdentity.role;
  const menu = navItems.filter((item) => item.roles.includes("ALL") || item.roles.includes(role));
  const pendingNotifications = data?.unreadNotifications ?? 0;

  return (
    <div className="min-h-screen bg-[#eef3f1] text-slate-950">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col border-r border-emerald-950/30 bg-[#063d2f] text-white shadow-2xl shadow-emerald-950/10 transition-transform lg:translate-x-0 ${mobileMenu ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex min-h-24 items-center justify-between border-b border-white/10 px-5 py-4"><BrandMark compact inverse /><button className="grid size-9 place-items-center rounded-lg border border-white/15 text-white lg:hidden" onClick={() => setMobileMenu(false)} aria-label="Tutup menu"><X className="size-5" /></button></div>
        <nav className="scrollbar-thin flex-1 space-y-1 overflow-y-auto px-3 py-5">
          <p className="mb-3 px-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-200/70">Menu Administrasi</p>
          {menu.map((item) => {
            const Icon = item.icon;
            const href = item.href ?? `/admin/${item.key}`;
            const active = section === item.key;
            return <Link key={item.key} href={href} aria-current={active ? "page" : undefined} onClick={() => setMobileMenu(false)} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? "bg-white text-[#063d2f] shadow-lg shadow-black/10" : "text-emerald-50/80 hover:bg-white/10 hover:text-white"}`}><span className={`grid size-8 place-items-center rounded-lg ${active ? "bg-emerald-100 text-[#087f5b]" : "bg-white/8 text-emerald-100 group-hover:bg-white/12"}`}><Icon className="size-[18px]" /></span>{item.label}{item.key === "notifikasi" && pendingNotifications > 0 && <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-amber-400 px-1 text-[10px] font-black text-emerald-950">{pendingNotifications}</span>}</Link>;
          })}
        </nav>
        <div className="border-t border-white/10 bg-black/10 p-4">
          <div className="flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-200 text-sm font-black text-emerald-950">{initialIdentity.name.slice(0, 1).toUpperCase()}</span><div className="min-w-0"><p className="truncate text-sm font-extrabold text-white">{initialIdentity.name}</p><p className="truncate text-xs text-emerald-200">{initialIdentity.roleLabel}</p></div></div>
          <LogoutButton className="text-emerald-100 hover:bg-white/10 hover:text-white" />
        </div>
      </aside>
      {mobileMenu && <button className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setMobileMenu(false)} aria-label="Tutup menu" />}

      <div className="lg:pl-[280px]">
        <header className="sticky top-0 z-20 flex min-h-20 items-center justify-between gap-4 border-b border-slate-200/90 bg-white/95 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3"><button className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white shadow-sm lg:hidden" onClick={() => setMobileMenu(true)} aria-label="Buka menu"><Menu className="size-5" /></button><div className="min-w-0"><p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#087f5b]">Administrasi Internal</p><h1 className="truncate text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{sectionTitles[section] ?? "Dashboard Pelayanan"}</h1></div></div>
          <div className="flex items-center gap-2"><div className="mr-2 hidden text-right xl:block"><p className="text-xs font-extrabold text-slate-800">{initialIdentity.name}</p><p className="text-[11px] text-slate-500">{initialIdentity.roleLabel}</p></div><Button variant="outline" size="icon" className="rounded-xl bg-white shadow-sm" title="Muat ulang" onClick={() => load()}><RefreshCw className={loading ? "animate-spin" : ""} /></Button>{menu.some(item => item.key === "notifikasi") && <Button asChild variant="outline" size="icon" className="relative rounded-xl bg-white shadow-sm"><Link href="/admin/notifikasi" onClick={() => setMobileMenu(false)} aria-label={`${pendingNotifications} notifikasi belum dibaca`}><Bell />{pendingNotifications > 0 && <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-rose-600 ring-2 ring-white" />}</Link></Button>}</div>
        </header>
        <main className="mx-auto w-full max-w-[1680px] p-4 sm:p-6 lg:p-8">
          {notice && <div className="mb-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900 shadow-sm"><CheckCircle2 className="size-5 shrink-0" />{notice}</div>}
          {error && <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">{error}</div>}
          {saving && <p role="status" className="mb-4 text-sm text-emerald-800">Menyimpan perubahan…</p>}
          <fieldset disabled={saving} aria-busy={saving}>
          {loading && !data ? <LoadingState /> : data && <SectionContent section={section} data={data} search={search} setSearch={setSearch} status={status} setStatus={setStatus} department={department} setDepartment={setDepartment} load={load} action={action} selectVisit={setSelectedVisit} />}
          </fieldset>
        </main>
      </div>
      <VisitSheet key={selectedVisit?.id ?? "none"} visit={selectedVisit} departments={data?.departments ?? []} onClose={() => setSelectedVisit(null)} action={action} />
    </div>
  );
}

function SectionContent(props: {
  section: string; data: Overview; search: string; setSearch: (value: string) => void; status: string; setStatus: (value: string) => void;
  department: string; setDepartment: (value: string) => void; load: (quiet?: boolean) => Promise<void>;
  action: (payload: Record<string, unknown>, message?: string) => Promise<boolean>; selectVisit: (visit: Visit) => void;
}) {
  switch (props.section) {
    case "kunjungan": return <VisitsSection {...props} />;
    case "bidang": return <DepartmentSection data={props.data} action={props.action} />;
    case "layanan": return <ServiceSection data={props.data} action={props.action} />;
    case "pegawai": return <EmployeeSection data={props.data} action={props.action} />;
    case "users": return <UserSection data={props.data} action={props.action} />;
    case "qrcode": return <QrSection />;
    case "laporan": return <ReportSection data={props.data} selectVisit={props.selectVisit} />;
    case "notifikasi":
    case "whatsapp": return <NotificationSection data={props.data} action={props.action} />;
    case "audit-log": return <AuditSection data={props.data} />;
    case "settings": return <SettingsSection data={props.data} action={props.action} />;
    default: return <DashboardSection data={props.data} selectVisit={props.selectVisit} />;
  }
}

function DashboardSection({ data, selectVisit }: { data: Overview; selectVisit: (visit: Visit) => void }) {
  const stats = [
    { label: "Datang Hari Ini", value: data.stats.today, icon: Users, tone: "emerald" },
    { label: "Menunggu", value: data.stats.waiting, icon: Clock3, tone: "amber" },
    { label: "Sedang Dilayani", value: data.stats.serving, icon: Activity, tone: "violet" },
    { label: "Selesai Hari Ini", value: data.stats.completed, icon: CheckCircle2, tone: "blue" },
    { label: "Total Bulan Ini", value: data.stats.month, icon: BarChart3, tone: "emerald" },
    { label: "Rata-rata Durasi", value: `${data.stats.averageDuration} mnt`, icon: Clock3, tone: "slate" },
  ];
  const lastSeven = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(new Date(data.serverTime.timestamp).getTime() - (6 - index) * 86_400_000);
    const key = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Makassar", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
    return { key, label: new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Makassar", weekday: "short" }).format(date), count: data.analytics.daily.find(item => item.date === key)?.count || 0 };
  });
  const max = Math.max(1, ...lastSeven.map((item) => item.count));
  const serviceCounts: [string,number][] = data.analytics.byService.map(item => [item.name,item.count]);
  const visitorTypes: [string,number][] = data.analytics.byType.map(item => [item.name,item.count]);
  return <div className="space-y-6">
    <div className="relative overflow-hidden rounded-2xl bg-[#063d2f] p-5 text-white shadow-lg shadow-emerald-950/10 sm:p-6">
      <div className="absolute -right-16 -top-20 size-56 rounded-full border-[36px] border-white/5" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-200">Ringkasan Operasional</p><h2 className="mt-2 text-xl font-black tracking-tight sm:text-2xl">Layanan Tenaga Kerja</h2><p className="mt-1.5 max-w-2xl text-sm leading-6 text-emerald-50/75">Monitoring kunjungan Bidang Pelatihan dan Penempatan Tenaga Kerja serta Hubungan Industrial dan Pengawasan Ketenagakerjaan.</p></div>
        <div className="w-fit rounded-xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur"><p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-200">Tamu di Kantor</p><p className="mt-1 text-2xl font-black">{data.stats.active} <span className="text-sm font-semibold text-emerald-100">orang</span></p></div>
      </div>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">{stats.map((stat) => <StatCard key={stat.label} {...stat} />)}</div>
    <div className="grid gap-6 xl:grid-cols-[1.25fr_0.85fr_0.75fr]">
      <Panel title="Kunjungan 7 hari terakhir" subtitle="Pola kedatangan yang tercatat di sistem">
        <div className="flex h-56 items-end gap-3 pt-6">{lastSeven.map((item) => <div key={item.key} className="flex flex-1 flex-col items-center gap-2"><span className="text-xs font-bold text-slate-600">{item.count}</span><div className="w-full max-w-12 rounded-t-lg bg-[#087f5b] transition" style={{ height: `${Math.max(8, (item.count / max) * 150)}px` }} /><span className="text-xs text-slate-500">{item.label}</span></div>)}</div>
      </Panel>
      <Panel title="Layanan teratas" subtitle="Seluruh kunjungan bulan ini">
        <div className="space-y-4">{serviceCounts.length ? serviceCounts.map(([name, value], index) => <div key={name}><div className="mb-1 flex justify-between gap-3 text-sm"><span className="truncate font-semibold text-slate-700">{index + 1}. {name}</span><span className="font-bold">{value}</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.max(12, (value / serviceCounts[0][1]) * 100)}%` }} /></div></div>) : <EmptyState text="Belum ada data layanan." />}</div>
      </Panel>
      <Panel title="Profil pengunjung" subtitle="Komposisi jenis tamu">
        <div className="space-y-3">{visitorTypes.length ? visitorTypes.map(([name, value]) => <div key={name} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-3"><span className="text-sm font-semibold text-slate-700">{statusLabel(name)}</span><span className="grid min-w-8 place-items-center rounded-lg bg-white px-2 py-1 text-sm font-black text-[#087f5b] shadow-sm">{value}</span></div>) : <EmptyState text="Belum ada data pengunjung." />}</div>
      </Panel>
    </div>
    <Panel title="Tamu terbaru" subtitle="Data diperbarui otomatis setiap 15 detik"><VisitList visits={data.visits.slice(0, 8)} selectVisit={selectVisit} compact /></Panel>
  </div>;
}

function VisitsSection(props: {
  data: Overview; search: string; setSearch: (value: string) => void; status: string; setStatus: (value: string) => void;
  department: string; setDepartment: (value: string) => void; load: (quiet?: boolean) => Promise<void>; selectVisit: (visit: Visit) => void;
}) {
  return <div className="space-y-5">
    <Panel title="Filter Data Kunjungan" subtitle="Temukan data berdasarkan identitas tamu, status pelayanan, atau bidang tujuan.">
      <div className="grid items-end gap-3 md:grid-cols-[minmax(240px,1fr)_190px_240px_auto]">
        <FormField label="Pencarian"><div className="relative"><Search className="absolute left-3 top-2.5 size-5 text-slate-400" /><Input className="pl-10" value={props.search} onChange={(event) => props.setSearch(event.target.value)} placeholder="Nama, nomor HP, instansi, atau kode" /></div></FormField>
        <FormField label="Status Pelayanan"><NativeSelect className="w-full" value={props.status} onChange={(event) => props.setStatus(event.target.value)}><NativeSelectOption value="">Semua status</NativeSelectOption>{["BARU","MENUNGGU","DITERIMA","SEDANG_DILAYANI","SELESAI","DIALIHKAN","BATAL"].map((item) => <NativeSelectOption key={item} value={item}>{statusLabel(item)}</NativeSelectOption>)}</NativeSelect></FormField>
        <FormField label="Bidang Tujuan"><NativeSelect className="w-full" value={props.department} onChange={(event) => props.setDepartment(event.target.value)}><NativeSelectOption value="">Semua bidang</NativeSelectOption>{props.data.departments.map((item) => <NativeSelectOption key={item.id} value={item.id}>{item.name}</NativeSelectOption>)}</NativeSelect></FormField>
        <Button className="h-11 bg-[#087f5b] px-5 hover:bg-[#066c4d]" onClick={() => props.load()}><Search />Tampilkan</Button>
      </div>
    </Panel>
    <Panel title={`${props.data.visits.length} Kunjungan Ditemukan`} subtitle="Pilih salah satu data untuk melihat detail serta memperbarui proses pelayanan."><VisitList visits={props.data.visits} selectVisit={props.selectVisit} /></Panel>
  </div>;
}

function VisitList({ visits, selectVisit, compact = false }: { visits: Visit[]; selectVisit: (visit: Visit) => void; compact?: boolean }) {
  if (!visits.length) return <EmptyState text="Belum ada kunjungan pada filter ini." />;
  return <>
    <div className="hidden overflow-hidden rounded-xl border border-slate-200 md:block"><Table><TableHeader><TableRow className="bg-slate-50 hover:bg-slate-50"><TableHead className="font-extrabold text-slate-600">Antrean / Waktu</TableHead><TableHead className="font-extrabold text-slate-600">Nama & Instansi</TableHead><TableHead className="font-extrabold text-slate-600">Layanan Tujuan</TableHead><TableHead className="font-extrabold text-slate-600">Status</TableHead><TableHead className="text-right font-extrabold text-slate-600">Tindakan</TableHead></TableRow></TableHeader><TableBody>{visits.map((visit) => <TableRow key={visit.id} className="transition hover:bg-emerald-50/40"><TableCell><p className="font-black text-slate-900">{String(visit.queueNumber).padStart(3, "0")}</p><p className="mt-0.5 text-xs text-slate-500">{formatTime(visit.checkInAt)} WITA</p></TableCell><TableCell><p className="font-bold text-slate-900">{visit.visitorName}</p><p className="mt-0.5 max-w-52 truncate text-xs text-slate-500">{visit.institutionName || statusLabel(visit.visitorType)}</p></TableCell><TableCell><p className="max-w-64 truncate font-semibold text-slate-700">{visit.serviceName}</p>{!compact && <p className="mt-0.5 max-w-64 truncate text-xs text-slate-500">{visit.departmentName}</p>}</TableCell><TableCell><StatusBadge status={visit.status} /></TableCell><TableCell className="text-right"><Button variant="outline" size="sm" className="border-emerald-200 text-emerald-800 hover:bg-emerald-50" onClick={() => selectVisit(visit)}>Lihat Detail</Button></TableCell></TableRow>)}</TableBody></Table></div>
    <div className="grid gap-3 md:hidden">{visits.map((visit) => <button type="button" key={visit.id} onClick={() => selectVisit(visit)} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition active:scale-[0.99]"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-extrabold uppercase tracking-wide text-[#087f5b]">Antrean {String(visit.queueNumber).padStart(3, "0")} · {formatTime(visit.checkInAt)} WITA</p><p className="mt-2 truncate font-extrabold text-slate-900">{visit.visitorName}</p><p className="mt-0.5 truncate text-xs text-slate-500">{visit.institutionName || statusLabel(visit.visitorType)}</p></div><StatusBadge status={visit.status} /></div><p className="mt-3 border-t border-slate-100 pt-3 text-sm font-semibold text-slate-700">{visit.serviceName}</p></button>)}</div>
  </>;
}

function VisitSheet({ visit, departments, onClose, action }: { visit: Visit | null; departments: Department[]; onClose: () => void; action: (payload: Record<string, unknown>, message?: string) => Promise<boolean> }) {
  const [transferDepartment, setTransferDepartment] = useState("");
  const [reason, setReason] = useState("");
  async function update(status: string) { if (!visit) return; if (await action({ action: "UPDATE_VISIT_STATUS", visitId: visit.id, status }, `Status kunjungan menjadi ${statusLabel(status)}.`)) onClose(); }
  async function transfer() { if (!visit || !transferDepartment) return; if (await action({ action: "TRANSFER_VISIT", visitId: visit.id, departmentId: transferDepartment, reason }, "Kunjungan berhasil dialihkan.")) onClose(); }
  return <Sheet open={!!visit} onOpenChange={(open) => !open && onClose()}><SheetContent className="w-full overflow-y-auto sm:max-w-xl"><SheetHeader className="border-b"><SheetTitle className="text-xl">Detail Kunjungan</SheetTitle><SheetDescription>{visit?.visitCode}</SheetDescription></SheetHeader>{visit && <div className="space-y-6 p-5">
    <div className="flex items-center justify-between gap-3"><div><p className="text-2xl font-extrabold">{visit.visitorName}</p><p className="text-sm text-slate-500">{visit.institutionName || visit.visitorType}</p></div><StatusBadge status={visit.status} /></div>
    <div className="grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2"><Info label="No. WhatsApp" value={visit.phone} /><Info label="Jam masuk" value={formatDateTime(visit.checkInAt)} /><Info label="Layanan" value={visit.serviceName} /><Info label="Bidang" value={visit.departmentName} /><Info label="Pegawai tujuan" value={visit.employeeName || "Belum ditentukan"} /><Info label="Sumber input" value={visit.source.replaceAll("_", " ")} /><div className="sm:col-span-2"><Info label="Maksud dan tujuan" value={visit.purpose || "Tidak ada keterangan tambahan"} /></div></div>
    <div><p className="mb-2 text-sm font-bold">Tanda tangan digital</p><div className="rounded-xl border bg-white p-3"><img src={`/api/admin/signature?key=${encodeURIComponent(visit.signaturePath)}`} alt={`Tanda tangan ${visit.visitorName}`} className="h-28 w-full object-contain" /></div></div>
    <div><p className="mb-3 text-sm font-bold">Tindakan pelayanan</p><div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => update("DITERIMA")}>Terima tamu</Button><Button variant="outline" onClick={() => update("SEDANG_DILAYANI")}>Layani</Button><Button className="bg-[#087f5b] hover:bg-[#066c4d]" onClick={() => update("SELESAI")}>Selesaikan</Button><Button variant="destructive" onClick={() => update("BATAL")}>Batalkan</Button></div></div>
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="flex items-center gap-2 font-bold text-amber-950"><ArrowRightLeft className="size-4" />Alihkan ke bidang lain</p><NativeSelect className="mt-3 w-full bg-white" value={transferDepartment} onChange={(event) => setTransferDepartment(event.target.value)}><NativeSelectOption value="">Pilih bidang tujuan</NativeSelectOption>{departments.filter((item) => item.id !== visit.departmentId && item.isActive).map((item) => <NativeSelectOption key={item.id} value={item.id}>{item.name}</NativeSelectOption>)}</NativeSelect><Textarea className="mt-3 bg-white" placeholder="Alasan pengalihan" value={reason} onChange={(event) => setReason(event.target.value)} /><Button className="mt-3" variant="outline" disabled={!transferDepartment || !reason.trim()} onClick={transfer}>Alihkan kunjungan</Button></div>
  </div>}</SheetContent></Sheet>;
}

function DepartmentSection({ data, action }: { data: Overview; action: (payload: Record<string, unknown>, message?: string) => Promise<boolean> }) {
  const empty = { id: "", code: "", name: "", description: "", whatsappNumber: "", email: "", isActive: true };
  const [form, setForm] = useState(empty);
  async function save() { if (await action({ action: "SAVE_DEPARTMENT", ...form }, "Data bidang berhasil disimpan.")) setForm(empty); }
  return <div className="grid items-start gap-6 2xl:grid-cols-[440px_minmax(0,1fr)]">
    <Editor title={form.id ? "Ubah Data Bidang" : "Tambah Bidang"} onSave={save} onReset={() => setForm(empty)}>
      <FormField label="Kode Bidang"><Input placeholder="Contoh: P4TK" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></FormField>
      <FormField label="Nama Bidang"><Input placeholder="Nama lengkap bidang" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></FormField>
      <FormField label="Uraian Tugas"><Textarea className="min-h-24" placeholder="Jelaskan layanan dan tanggung jawab bidang" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></FormField>
      <FormField label="WhatsApp Admin Bidang"><Input inputMode="tel" placeholder="08xxxxxxxxxx" value={form.whatsappNumber} onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })} /></FormField>
      <FormField label="Email Bidang"><Input type="email" placeholder="bidang@instansi.go.id" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></FormField>
      <CheckLabel label="Bidang aktif dan dapat menerima kunjungan" checked={form.isActive} setChecked={(value) => setForm({ ...form, isActive: value })} />
    </Editor>
    <Panel title={`${data.departments.length} Bidang Terdaftar`} subtitle="Layanan tamu diarahkan berdasarkan susunan bidang aktif."><MasterCards items={data.departments} onEdit={(item) => setForm({ ...item, whatsappNumber: item.whatsappNumber ?? "", email: item.email ?? "" })} onToggle={(item) => action({ action: "SAVE_DEPARTMENT", ...item, isActive: !item.isActive })} /></Panel>
  </div>;
}

function ServiceSection({ data, action }: { data: Overview; action: (payload: Record<string, unknown>, message?: string) => Promise<boolean> }) {
  const empty = { id: "", name: "", category: "Umum", departmentId: "", description: "", whatsappNumber: "", requiresPurpose: false, allowsEmployee: true, isActive: true };
  const [form, setForm] = useState(empty);
  async function save() { if (await action({ action: "SAVE_SERVICE", ...form }, "Data layanan berhasil disimpan.")) setForm(empty); }
  return <div className="grid items-start gap-6 2xl:grid-cols-[460px_minmax(0,1fr)]">
    <Editor title={form.id ? "Ubah Data Layanan" : "Tambah Layanan"} onSave={save} onReset={() => setForm(empty)}>
      <FormField label="Nama Layanan"><Input placeholder="Contoh: Konsultasi ketenagakerjaan" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></FormField>
      <FormField label="Kategori Layanan"><Input placeholder="Contoh: Hubungan Industrial" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></FormField>
      <FormField label="Bidang Penanggung Jawab"><NativeSelect className="w-full" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}><NativeSelectOption value="">Pilih bidang tujuan</NativeSelectOption>{data.departments.map((item) => <NativeSelectOption key={item.id} value={item.id}>{item.name}</NativeSelectOption>)}</NativeSelect></FormField>
      <FormField label="Deskripsi Layanan"><Textarea className="min-h-24" placeholder="Ringkasan layanan untuk ditampilkan kepada tamu" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></FormField>
      <FormField label="WhatsApp Layanan" hint="Opsional. Jika kosong, notifikasi mengikuti nomor admin bidang."><Input inputMode="tel" placeholder="08xxxxxxxxxx" value={form.whatsappNumber} onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })} /></FormField>
      <CheckLabel label="Tamu wajib mengisi rincian keperluan" checked={form.requiresPurpose} setChecked={(value) => setForm({ ...form, requiresPurpose: value })} />
      <CheckLabel label="Tamu dapat memilih pegawai tujuan" checked={form.allowsEmployee} setChecked={(value) => setForm({ ...form, allowsEmployee: value })} />
      <CheckLabel label="Layanan aktif dan dapat dipilih" checked={form.isActive} setChecked={(value) => setForm({ ...form, isActive: value })} />
    </Editor>
    <Panel title={`${data.services.length} Layanan Terdaftar`} subtitle="Daftar layanan publik beserta bidang penanggung jawab dan status ketersediaannya."><div className="grid gap-3">{data.services.length ? data.services.map((item) => <MasterCard key={item.id} title={item.name} description={`${item.category} · ${item.departmentName}`} active={item.isActive} onEdit={() => setForm({ ...item, whatsappNumber: item.whatsappNumber ?? "" })} onToggle={() => action({ action: "SAVE_SERVICE", ...item, isActive: !item.isActive })} />) : <EmptyState text="Belum ada layanan terdaftar." />}</div></Panel>
  </div>;
}

function EmployeeSection({ data, action }: { data: Overview; action: (payload: Record<string, unknown>, message?: string) => Promise<boolean> }) {
  const empty = { id: "", name: "", position: "", departmentId: "", isActive: true };
  const [form, setForm] = useState(empty);
  async function save() { if (await action({ action: "SAVE_EMPLOYEE", ...form }, "Data pegawai berhasil disimpan.")) setForm(empty); }
  return <div className="grid items-start gap-6 2xl:grid-cols-[440px_minmax(0,1fr)]">
    <Editor title={form.id ? "Ubah Data Pegawai" : "Tambah Pegawai"} onSave={save} onReset={() => setForm(empty)}>
      <FormField label="Nama Lengkap"><Input placeholder="Masukkan nama pegawai" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></FormField>
      <FormField label="Jabatan"><Input placeholder="Jabatan atau fungsi pegawai" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></FormField>
      <FormField label="Unit / Bidang"><NativeSelect className="w-full" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}><NativeSelectOption value="">Pilih bidang penempatan</NativeSelectOption>{data.departments.map((item) => <NativeSelectOption key={item.id} value={item.id}>{item.name}</NativeSelectOption>)}</NativeSelect></FormField>
      <CheckLabel label="Pegawai aktif dan dapat dipilih sebagai tujuan" checked={form.isActive} setChecked={(value) => setForm({ ...form, isActive: value })} />
    </Editor>
    <Panel title={`${data.employees.length} Pegawai Terdaftar`} subtitle="Pegawai aktif dapat dipilih oleh tamu saat mengisi formulir kunjungan."><div className="grid gap-3">{data.employees.length ? data.employees.map((item) => <MasterCard key={item.id} title={item.name} description={`${item.position || "Pegawai"} · ${item.departmentName}`} active={item.isActive} onEdit={() => setForm(item)} onToggle={() => action({ action: "SAVE_EMPLOYEE", ...item, isActive: !item.isActive })} />) : <EmptyState text="Belum ada data pegawai." />}</div></Panel>
  </div>;
}

function UserSection({ data, action }: { data: Overview; action: (payload: Record<string, unknown>, message?: string) => Promise<boolean> }) {
  const empty = { id: "", name: "", email: "", username: "", temporaryPassword: "", roleId: "role-viewer", departmentId: "", whatsappNumber: "", isActive: true };
  const [form, setForm] = useState(empty);
  async function save() { if (await action({ action: "SAVE_USER", ...form }, "Pengguna dan peran berhasil disimpan.")) setForm(empty); }
  return <div className="grid items-start gap-6 2xl:grid-cols-[460px_minmax(0,1fr)]">
    <Editor title={form.id ? "Ubah Data Pengguna" : "Tambah Pengguna"} onSave={save} onReset={() => setForm(empty)}>
      <FormField label="Nama Lengkap"><Input placeholder="Masukkan nama petugas" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></FormField>
      <FormField label="Email Petugas" hint="Digunakan sebagai identitas dan kontak administrasi akun."><Input type="email" placeholder="nama@instansi.go.id" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></FormField>
      <FormField label="Username Login" hint="Huruf kecil, angka, titik, garis bawah, atau tanda hubung."><Input autoComplete="off" placeholder="contoh: petugas.p4tk" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })} /></FormField>
      <FormField label={form.id ? "Reset Sandi (Opsional)" : "Sandi Sementara"} hint="Minimal 10 karakter, huruf besar, huruf kecil, dan angka. Petugas wajib menggantinya saat login pertama."><Input type="password" autoComplete="new-password" placeholder={form.id ? "Kosongkan jika tidak diubah" : "Masukkan sandi sementara"} value={form.temporaryPassword} onChange={(e) => setForm({ ...form, temporaryPassword: e.target.value })} /></FormField>
      <FormField label="Peran dan Kewenangan"><NativeSelect className="w-full" value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}><NativeSelectOption value="role-super">Super Admin</NativeSelectOption><NativeSelectOption value="role-front">Front Office</NativeSelectOption><NativeSelectOption value="role-department">Admin Bidang</NativeSelectOption><NativeSelectOption value="role-viewer">Pimpinan / Viewer</NativeSelectOption></NativeSelect></FormField>
      <FormField label="Lingkup Bidang"><NativeSelect className="w-full" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}><NativeSelectOption value="">Semua bidang / tidak terikat</NativeSelectOption>{data.departments.map((item) => <NativeSelectOption key={item.id} value={item.id}>{item.name}</NativeSelectOption>)}</NativeSelect></FormField>
      <FormField label="Nomor WhatsApp" hint="Opsional, digunakan untuk kebutuhan koordinasi internal."><Input inputMode="tel" placeholder="08xxxxxxxxxx" value={form.whatsappNumber} onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })} /></FormField>
      <CheckLabel label="Akun pengguna aktif" checked={form.isActive} setChecked={(value) => setForm({ ...form, isActive: value })} />
    </Editor>
    <Panel title={`${data.users.length} Pengguna Terdaftar`} subtitle="Daftar akun petugas beserta peran dan status aksesnya.">
      <div className="grid gap-3">{data.users.length ? data.users.map((item) => <MasterCard key={item.id} title={item.name} description={`${item.username ? `@${item.username}` : "Login belum dibuat"} · ${item.email} · ${item.role}${item.mustChangePassword ? " · Wajib ganti sandi" : ""}`} active={item.isActive} onEdit={() => setForm({ id: item.id, name: item.name, email: item.email, username: item.username ?? "", temporaryPassword: "", roleId: item.roleId, departmentId: item.departmentId ?? "", whatsappNumber: item.whatsappNumber ?? "", isActive: item.isActive })} onToggle={() => action({ action: "SAVE_USER", ...item, username: item.username ?? "", temporaryPassword: "", isActive: !item.isActive })} />) : <EmptyState text="Belum ada pengguna terdaftar." />}</div>
    </Panel>
  </div>;
}

function QrSection() {
  const [kind, setKind] = useState<"checkin" | "checkout">("checkin");
  const [dataUrl, setDataUrl] = useState("");
  const [svg, setSvg] = useState("");
  const target = typeof window === "undefined" ? "" : `${window.location.origin}${kind === "checkin" ? "/kunjungan" : "/checkout"}`;
  useEffect(() => {
    if (!target) return;
    QRCode.toDataURL(target, { width: 720, margin: 2, errorCorrectionLevel: "H", color: { dark: "#063d2f", light: "#ffffff" } }).then(setDataUrl);
    QRCode.toString(target, { type: "svg", margin: 2, errorCorrectionLevel: "H", color: { dark: "#063d2f", light: "#ffffff" } }).then(setSvg);
  }, [target]);
  function download(href: string, filename: string) { const link = document.createElement("a"); link.href = href; link.download = filename; link.click(); }
  function downloadSvg() { download(URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })), `qr-${kind}-sibuktamu.svg`); }
  return <div className="grid items-start gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
    <Panel title="Pengaturan QR Code" subtitle="Pilih kebutuhan poster lalu unduh dalam format siap cetak.">
      <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">Jenis Layanan</p>
      <div className="space-y-2"><Button className={`h-11 w-full justify-start ${kind === "checkin" ? "bg-[#087f5b] hover:bg-[#066c4d]" : ""}`} variant={kind === "checkin" ? "default" : "outline"} onClick={() => setKind("checkin")}><QrCode />QR Check-in Tamu</Button><Button className={`h-11 w-full justify-start ${kind === "checkout" ? "bg-[#087f5b] hover:bg-[#066c4d]" : ""}`} variant={kind === "checkout" ? "default" : "outline"} onClick={() => setKind("checkout")}><LogOut />QR Check-out Tamu</Button></div>
      <div className="my-5 border-t border-slate-100" />
      <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">Unduh dan Cetak</p>
      <div className="space-y-2"><Button variant="outline" className="h-11 w-full justify-start" disabled={!dataUrl} onClick={() => download(dataUrl, `qr-${kind}-sibuktamu.png`)}><Download />Unduh PNG</Button><Button variant="outline" className="h-11 w-full justify-start" disabled={!svg} onClick={downloadSvg}><FileDown />Unduh SVG</Button><Button variant="outline" className="h-11 w-full justify-start" onClick={() => window.print()}><Printer />Cetak Poster A4</Button></div>
    </Panel>
    <div className="print-area mx-auto w-full max-w-[760px] overflow-hidden rounded-2xl border border-slate-200 bg-white text-center shadow-[0_18px_55px_rgba(15,23,42,0.08)] print:rounded-none print:shadow-none">
      <div className="bg-[#063d2f] px-6 py-5 text-white"><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-200">Pemerintah Provinsi Sulawesi Tengah</p><p className="mt-1 text-lg font-black uppercase tracking-tight">Dinas Tenaga Kerja dan Transmigrasi</p></div>
      <div className="p-8 sm:p-10"><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#087f5b]">SIBUKTAMU</p><h2 className="mt-2 text-4xl font-black uppercase tracking-tight text-slate-950">Selamat Datang</h2><p className="mt-3 text-xl leading-8 text-slate-600">Pindai QR Code untuk<br /><strong className="text-slate-900">{kind === "checkin" ? "Mengisi Buku Tamu" : "Check-out Kunjungan"}</strong></p>{dataUrl ? <img src={dataUrl} alt={`QR ${kind}`} className="mx-auto my-7 size-72 rounded-xl border border-slate-100 p-2" /> : <LoaderCircle className="mx-auto my-20 animate-spin" />}<p className="break-all text-xs text-slate-400">{target}</p><p className="mt-7 font-extrabold uppercase tracking-[0.14em] text-[#087f5b]">Cepat · Mudah · Tanpa Registrasi</p></div>
    </div>
  </div>;
}

function ReportSection({ data, selectVisit }: { data: Overview; selectVisit: (visit: Visit) => void }) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Makassar", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const [from, setFrom] = useState(`${today.slice(0, 8)}01`);
  const [to, setTo] = useState(today);
  const [department, setDepartment] = useState("");
  const [exporting, setExporting] = useState("");
  const [exportError, setExportError] = useState("");
  async function downloadReport(format: "pdf"|"xlsx") {
    setExporting(format);setExportError("");
    try {
      if(!from||!to||from>to) throw new Error("Periksa kembali periode laporan.");
      const response=await fetch(format==="pdf"?pdfUrl:excelUrl);
      if(!response.ok) { const body=await response.json().catch(()=>({})) as {error?:string};throw new Error(body.error||"Laporan belum dapat dibuat."); }
      const blob=await response.blob(),url=URL.createObjectURL(blob),link=document.createElement("a");
      link.href=url;link.download=`buku-tamu-${from}-${to}.${format}`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
    } catch(error) {setExportError(error instanceof Error?error.message:"Laporan belum dapat dibuat.");} finally {setExporting("");}
  }
  const filtered = data.visits.filter((visit) => {
    const date = new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Makassar",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(visit.checkInAt));
    return date >= from && date <= to && (!department || visit.departmentId === department);
  });
  const laborDepartments = data.departments.filter((item) => ["dept-p4tk", "dept-hiwas"].includes(item.id));
  const baseParams = { from, to, ...(department ? { department } : {}) };
  const excelUrl = `/api/admin/export?${new URLSearchParams({ ...baseParams, format: "xlsx" })}`;
  const pdfUrl = `/api/admin/export?${new URLSearchParams({ ...baseParams, format: "pdf" })}`;
  return <div className="space-y-6">
    <Panel title="Laporan kunjungan dinas" subtitle="Kop berlogo, periode, tabel lengkap, total kunjungan, dan ruang pengesahan. Maksimal 2.000 kunjungan per ekspor.">
      <div className="mb-5 grid gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950 sm:grid-cols-3"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Instansi</p><p className="mt-1 font-bold">Disnakertrans Provinsi Sulawesi Tengah</p></div><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Lingkup</p><p className="mt-1 font-bold">P4TK & HIWAS</p></div><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Orientasi PDF</p><p className="mt-1 font-bold">A4 Landscape</p></div></div>
      <div className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[180px_180px_minmax(240px,1fr)_auto_auto]"><FormField label="Tanggal Mulai"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></FormField><FormField label="Tanggal Akhir"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></FormField><FormField label="Bidang Layanan"><NativeSelect className="w-full" value={department} onChange={(e) => setDepartment(e.target.value)}><NativeSelectOption value="">Semua layanan tenaga kerja</NativeSelectOption>{laborDepartments.map((item) => <NativeSelectOption key={item.id} value={item.id}>{item.name}</NativeSelectOption>)}</NativeSelect></FormField><Button disabled={!!exporting} onClick={()=>downloadReport("xlsx")} variant="outline" className="h-11"><FileDown />{exporting==="xlsx"?"Membuat Excel…":"Unduh Excel"}</Button><Button disabled={!!exporting} onClick={()=>downloadReport("pdf")} className="h-11 bg-[#087f5b] hover:bg-[#066c4d]"><FileText />{exporting==="pdf"?"Membuat PDF…":"PDF Landscape"}</Button></div>
    </Panel>
    {exportError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{exportError}</p>}
    <p className="text-sm text-slate-500">Pratinjau menampilkan maksimal 200 kunjungan terbaru. Ekspor mengambil seluruh data dalam periode pilihan. Isi pejabat pengesahan pada Pengaturan sebelum mencetak.</p>
    <div className="print-area"><Panel title="Pratinjau data kunjungan" subtitle={`Periode ${from} sampai ${to} · ${filtered.length} kunjungan`}><VisitList visits={filtered} selectVisit={selectVisit} /></Panel></div>
  </div>;
}

function NotificationSection({ data, action }: { data: Overview; action: (payload: Record<string, unknown>, message?: string) => Promise<boolean> }) {
  const [filter, setFilter] = useState<"active" | "unread" | "archived">("active");
  const autoMarked = useRef(false);
  const counts = {
    active: data.notifications.filter((item) => !item.archivedAt).length,
    unread: data.unreadNotifications,
    archived: data.notifications.filter((item) => item.archivedAt).length,
  };
  const items = data.notifications.filter((item) => filter === "archived" ? item.archivedAt : filter === "unread" ? !item.archivedAt && !item.isRead : !item.archivedAt);
  const canRetryAutomatically = data.notificationConfig.whatsappConfigured;
  const manualLink = (item: Notification) => item.recipient
    ? `https://wa.me/${item.recipient.replace(/\D/g, "").replace(/^0/, "62")}?text=${encodeURIComponent(item.message)}`
    : "#";
  useEffect(() => {
    if (!autoMarked.current && counts.unread > 0) {
      autoMarked.current = true;
      void action({ action: "MARK_ALL_NOTIFICATIONS_READ" }, "Notifikasi baru telah ditandai dibaca.");
    }
  }, [action, counts.unread]);

  return <div className="space-y-5">
    {!canRetryAutomatically && <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-extrabold">Notifikasi aplikasi aktif</p><p className="mt-1 text-sm leading-6 text-amber-800">Pengiriman WhatsApp otomatis belum diaktifkan. Tamu tetap tercatat dan pemberitahuan tetap masuk ke dashboard. Gunakan “Kirim Manual” bila diperlukan.</p></div><Badge className="w-fit shrink-0 bg-amber-100 text-amber-900 hover:bg-amber-100">WhatsApp Manual</Badge></div>}
    <Panel title="Pusat Notifikasi Kunjungan" subtitle="Baca, arsipkan, atau hapus pemberitahuan agar daftar tetap ringkas dan indikator hanya menampilkan pesan baru.">
      <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {([['active', 'Aktif'], ['unread', 'Belum Dibaca'], ['archived', 'Arsip']] as const).map(([key, label]) => <Button key={key} size="sm" variant={filter === key ? "default" : "outline"} className={filter === key ? "bg-[#087f5b] hover:bg-[#066c4d]" : ""} onClick={() => setFilter(key)}>{label}<span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-black ${filter === key ? "bg-white/20" : "bg-slate-100"}`}>{counts[key]}</span></Button>)}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={!counts.unread} onClick={() => action({ action: "MARK_ALL_NOTIFICATIONS_READ" }, "Semua notifikasi telah ditandai dibaca.")}><CheckCheck />Tandai Semua Dibaca</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="outline" size="sm" disabled={!data.notifications.some((item) => item.isRead && !item.archivedAt)} className="text-rose-700 hover:bg-rose-50 hover:text-rose-800"><Trash2 />Bersihkan Terbaca</Button></AlertDialogTrigger>
            <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus notifikasi yang sudah dibaca?</AlertDialogTitle><AlertDialogDescription>Notifikasi yang sudah dibaca akan dihapus permanen dari daftar. Data kunjungan tamu tidak ikut terhapus.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => action({ action: "DELETE_READ_NOTIFICATIONS" }, "Notifikasi yang sudah dibaca berhasil dibersihkan.")}>Hapus Terbaca</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="space-y-3">{items.length ? items.map((item) => <article key={item.id} className={`rounded-2xl border bg-white p-4 transition sm:p-5 ${item.isRead ? "border-slate-200" : "border-emerald-300 shadow-[0_8px_24px_rgba(5,150,105,0.08)]"}`}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <button type="button" className="flex min-w-0 flex-1 gap-3 text-left" onClick={() => !item.isRead && action({ action: "MARK_NOTIFICATION_READ", id: item.id }, "Notifikasi ditandai sudah dibaca.")}>
            <div className={`grid size-11 shrink-0 place-items-center rounded-xl ${item.isRead ? "bg-slate-100 text-slate-500" : "bg-emerald-100 text-[#087f5b]"}`}><MessageCircle className="size-5" /></div>
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-extrabold text-slate-900">Tamu baru · {item.visitorName}</p>{!item.isRead && <span className="size-2 rounded-full bg-rose-600" aria-label="Belum dibaca" />}<StatusBadge status={item.status} /></div><p className="mt-1 text-sm font-semibold text-slate-700">{item.visitCode} · {item.serviceName}</p><p className="mt-1 text-xs text-slate-500">{formatDateTime(item.createdAt)} · tujuan {item.recipient || "belum tersedia"} · {item.attempts} percobaan</p>{item.errorMessage && <p className={`mt-2 text-sm font-medium ${item.status === "FAILED" ? "text-rose-700" : "text-amber-700"}`}>{item.errorMessage}</p>}</div>
          </button>
          <div className="flex flex-wrap gap-2 xl:justify-end">
            {!item.isRead && <Button variant="outline" size="sm" onClick={() => action({ action: "MARK_NOTIFICATION_READ", id: item.id }, "Notifikasi ditandai sudah dibaca.")}><CheckCheck />Sudah Dibaca</Button>}
            {item.status !== "SENT" && canRetryAutomatically && <Button variant="outline" size="sm" className="border-emerald-200 text-emerald-800 hover:bg-emerald-50" onClick={() => action({ action: "RETRY_WHATSAPP", id: item.id }, "Pengiriman ulang telah diproses.")}><RefreshCw />Kirim Ulang</Button>}
            {item.status !== "SENT" && !canRetryAutomatically && item.recipient && <Button asChild variant="outline" size="sm" className="border-emerald-200 text-emerald-800 hover:bg-emerald-50"><a href={manualLink(item)} target="_blank" rel="noreferrer"><MessageCircle />Kirim Manual</a></Button>}
            <Button variant="outline" size="sm" onClick={() => action({ action: "ARCHIVE_NOTIFICATION", id: item.id, archived: !item.archivedAt }, item.archivedAt ? "Notifikasi dikembalikan ke daftar aktif." : "Notifikasi berhasil diarsipkan.")}>{item.archivedAt ? <Undo2 /> : <Archive />}{item.archivedAt ? "Pulihkan" : "Arsipkan"}</Button>
            <AlertDialog>
              <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-rose-700 hover:bg-rose-50 hover:text-rose-800"><Trash2 />Hapus</Button></AlertDialogTrigger>
              <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus notifikasi ini?</AlertDialogTitle><AlertDialogDescription>Notifikasi {item.visitCode} akan dihapus permanen. Data kunjungan tamu tetap aman dan tidak ikut terhapus.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => action({ action: "DELETE_NOTIFICATION", id: item.id }, "Notifikasi berhasil dihapus.")}>Hapus Notifikasi</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </article>) : <EmptyState text={filter === "archived" ? "Belum ada notifikasi yang diarsipkan." : filter === "unread" ? "Tidak ada notifikasi yang belum dibaca." : "Belum ada notifikasi aktif."} />}</div>
    </Panel>
  </div>;
}

function AuditSection({ data }: { data: Overview }) {
  return <Panel title="Audit Aktivitas Sistem" subtitle="Rekam jejak perubahan status, pengalihan kunjungan, dan pengelolaan data master."><div className="space-y-3">{data.auditLogs.length ? data.auditLogs.map((item) => <article key={item.id} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-emerald-200"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100"><ShieldCheck className="size-5 text-slate-600" /></div><div className="min-w-0"><p className="text-sm font-extrabold text-slate-900">{statusLabel(item.action)}</p><p className="mt-1 text-xs leading-5 text-slate-500">Oleh <strong className="text-slate-700">{item.userName || "Sistem"}</strong> · Modul {statusLabel(item.entity)} · {formatDateTime(item.createdAt)}</p></div></article>) : <EmptyState text="Belum ada aktivitas admin yang tercatat." />}</div></Panel>;
}

function SettingsSection({ data, action }: { data: Overview; action: (payload: Record<string, unknown>, message?: string) => Promise<boolean> }) {
  const defaults = data.settings?.length ? data.settings : [
    { key: "office_hours", value: "Senin–Jumat, 08.00–16.00 WITA" },
    { key: "allow_outside_hours", value: "true" },
    { key: "data_retention", value: "Sesuai kebijakan administrator dan ketentuan kearsipan yang berlaku" },
  ];
  const [items, setItems] = useState(defaults);
  const labels: Record<string, { title: string; description: string }> = {
    report_signer_title: {title:"Jabatan Pejabat Pengesahan",description:"Isi sesuai pejabat berwenang yang akan mengesahkan laporan."},
    report_signer_name: {title:"Nama Pejabat Pengesahan",description:"Nama lengkap dan gelar; kosongkan bila belum ditetapkan."},
    report_signer_nip: {title:"NIP Pejabat Pengesahan",description:"NIP pejabat yang berwenang; tidak diisi otomatis."},
    office_hours: { title: "Jam Operasional", description: "Hari dan jam pelayanan tamu di kantor." },
    allow_outside_hours: { title: "Pendaftaran di Luar Jam Layanan", description: "Gunakan nilai true untuk mengizinkan atau false untuk menutup." },
    data_retention: { title: "Kebijakan Retensi Data", description: "Keterangan masa simpan data sesuai ketentuan kearsipan." },
  };
  return <Panel title="Pengaturan Operasional" subtitle="Konfigurasi dasar pelayanan dan pengelolaan data SIBUKTAMU."><div className="space-y-4">{items.map((item, index) => { const label = labels[item.key] ?? { title: statusLabel(item.key), description: "Pengaturan sistem." }; return <article key={item.key} className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4 sm:p-5"><div className="mb-3"><p className="text-sm font-extrabold text-slate-900">{label.title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{label.description}</p></div><div className="flex flex-col gap-2 sm:flex-row"><Input className="h-11 bg-white" value={item.value} onChange={(e) => setItems(items.map((current, currentIndex) => currentIndex === index ? { ...current, value: e.target.value } : current))} /><Button className="h-11 bg-[#087f5b] px-5 hover:bg-[#066c4d]" onClick={() => action({ action: "SAVE_SETTING", key: item.key, value: item.value }, "Pengaturan berhasil disimpan.")}>Simpan Pengaturan</Button></div></article>; })}</div></Panel>;
}

function Editor({ title, onSave, onReset, children }: { title: string; onSave: () => void; onReset: () => void; children: React.ReactNode }) {
  return <Panel title={title} subtitle="Lengkapi data berikut, kemudian simpan perubahan."><div className="admin-editor space-y-4">{children}<div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row"><Button variant="outline" onClick={onReset}>Bersihkan Formulir</Button><Button className="bg-[#087f5b] px-6 hover:bg-[#066c4d]" onClick={onSave}>Simpan Data</Button></div></div></Panel>;
}
function MasterCards({ items, onEdit, onToggle }: { items: Department[]; onEdit: (item: Department) => void; onToggle: (item: Department) => void }) { return <div className="grid gap-3">{items.map((item) => <MasterCard key={item.id} title={`${item.code} — ${item.name}`} description={item.description} active={item.isActive} onEdit={() => onEdit(item)} onToggle={() => onToggle(item)} />)}</div>; }
function MasterCard({ title, description, active, onEdit, onToggle }: { title: string; description: string; active: boolean; onEdit: () => void; onToggle: () => void }) { return <article className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-emerald-200 hover:shadow-md sm:p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-extrabold leading-6 text-slate-900">{title}</p><Badge variant={active ? "default" : "secondary"} className={active ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : "bg-slate-100 text-slate-600"}>{active ? "Aktif" : "Nonaktif"}</Badge></div><p className="mt-1.5 text-sm leading-6 text-slate-500">{description || "Belum ada deskripsi."}</p></div><div className="flex shrink-0 gap-2"><Button variant="outline" size="sm" onClick={onEdit}>Ubah Data</Button><Button variant="ghost" size="sm" className={active ? "text-rose-700 hover:bg-rose-50 hover:text-rose-800" : "text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"} onClick={onToggle}>{active ? "Nonaktifkan" : "Aktifkan"}</Button></div></div></article>; }
function FormField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) { return <label className="block"><span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.12em] text-slate-600">{label}</span>{children}{hint && <span className="mt-1.5 block text-xs leading-5 text-slate-400">{hint}</span>}</label>; }
function CheckLabel({ label, checked, setChecked }: { label: string; checked: boolean; setChecked: (value: boolean) => void }) { return <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-sm font-bold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50/50"><Checkbox checked={checked} onCheckedChange={(value) => setChecked(value === true)} />{label}</label>; }
function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) { return <section className="admin-panel rounded-2xl border border-[#dce6e2] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_28px_rgba(15,23,42,0.035)] sm:p-6"><div className="mb-5 border-b border-slate-100 pb-4"><h2 className="text-base font-black tracking-tight text-slate-950 sm:text-lg">{title}</h2>{subtitle && <p className="mt-1.5 text-sm leading-6 text-slate-500">{subtitle}</p>}</div>{children}</section>; }
function StatCard({ label, value, icon: Icon, tone }: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }>; tone: string }) { const colors: Record<string, string> = { emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100", amber: "bg-amber-50 text-amber-700 ring-amber-100", blue: "bg-blue-50 text-blue-700 ring-blue-100", violet: "bg-violet-50 text-violet-700 ring-violet-100", slate: "bg-slate-100 text-slate-700 ring-slate-200" }; return <article className="relative overflow-hidden rounded-2xl border border-[#dce6e2] bg-white p-5 shadow-[0_6px_22px_rgba(15,23,42,0.04)]"><span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#087f5b] to-emerald-300" /><div className="flex items-start justify-between gap-3"><div><p className="text-3xl font-black tracking-tight text-slate-950">{value}</p><p className="mt-2 text-[11px] font-extrabold uppercase leading-4 tracking-[0.11em] text-slate-500">{label}</p></div><div className={`grid size-11 shrink-0 place-items-center rounded-xl ring-1 ${colors[tone]}`}><Icon className="size-5" /></div></div></article>; }
function StatusBadge({ status }: { status: string }) { const map: Record<string, string> = { BARU: "bg-blue-100 text-blue-800", MENUNGGU: "bg-amber-100 text-amber-800", DITERIMA: "bg-cyan-100 text-cyan-800", SEDANG_DILAYANI: "bg-violet-100 text-violet-800", SELESAI: "bg-emerald-100 text-emerald-800", DIALIHKAN: "bg-orange-100 text-orange-800", BATAL: "bg-rose-100 text-rose-800", SENT: "bg-emerald-100 text-emerald-800", FAILED: "bg-rose-100 text-rose-800", QUEUED: "bg-amber-100 text-amber-800", NOT_CONFIGURED: "bg-slate-100 text-slate-700" }; return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${map[status] ?? "bg-slate-100 text-slate-700"}`}>{statusLabel(status)}</span>; }
function statusLabel(status: string) { const labels: Record<string, string> = { SENT: "Terkirim", FAILED: "Gagal Terkirim", QUEUED: "Dalam Antrean", NOT_CONFIGURED: "WhatsApp Belum Aktif" }; return labels[status] ?? status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold leading-6 text-slate-800">{value}</p></div>; }
function EmptyState({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-12 text-center text-sm font-medium text-slate-500">{text}</div>; }
function LoadingState() { return <div className="grid min-h-[50vh] place-items-center text-sm text-slate-500"><div className="text-center"><LoaderCircle className="mx-auto mb-3 size-7 animate-spin text-[#087f5b]" />Memuat data pelayanan…</div></div>; }
function formatTime(value: string) { return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Makassar", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function formatDateTime(value: string) { return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Makassar", dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
