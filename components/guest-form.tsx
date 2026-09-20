"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronRight,
  CircleHelp,
  Factory,
  LoaderCircle,
  Map,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { SignaturePad } from "@/components/signature-pad";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { needsPurpose, visitPurpose } from "@/lib/guest-purpose";
import { saveActiveVisit } from "@/lib/active-visit";

type Department = { id: string; name: string; code: string; description: string };
type Service = {
  id: string;
  name: string;
  category: string;
  departmentId: string;
  requiresPurpose: boolean;
  allowsEmployee: boolean;
};

const visitorTypes = [
  "Pribadi / Masyarakat",
  "Perusahaan",
  "Instansi Pemerintah",
  "Sekolah / Perguruan Tinggi",
  "Organisasi / Lembaga",
  "Lainnya",
];

const stepLabels = ["Identitas", "Tujuan Kunjungan", "Konfirmasi"];

const departmentIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "dept-p4tk": BriefcaseBusiness,
  "dept-hiwas": Users,
  "dept-pkt": Map,
  "dept-pembangunan": Building2,
  "dept-pengembangan": Factory,
  "dept-upt-wasnaker-1": ShieldCheck,
  "dept-upt-wasnaker-2": ShieldCheck,
  "dept-sekretariat": Building2,
};

function serviceLabel(service: Service) {
  return service.name.startsWith("Lainnya —") ? "Lainnya" : service.name;
}

export function GuestForm({ source = "QR_TAMU", kiosk = false }: { source?: "QR_TAMU" | "FRONT_OFFICE" | "KIOSK"; kiosk?: boolean }) {
  const [step, setStep] = useState(1);
  const [catalog, setCatalog] = useState<{ departments: Department[]; services: Service[] }>({ departments: [], services: [] });
  const [catalogError, setCatalogError] = useState("");
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [form, setForm] = useState({
    visitorName: "",
    visitorType: "Pribadi / Masyarakat",
    institutionName: "",
    phone: "",
    serviceId: "",
    purpose: "",
    employeeName: "",
    signature: "",
    consent: false,
    website: "",
  });

  useEffect(() => {
    fetch("/api/public/catalog")
      .then(async (response) => {
        const data = await response.json() as {departments:Department[];services:Service[];error?:string};
        if (!response.ok) throw new Error(data.error);
        setCatalog(data);
      })
      .catch(() => setCatalogError("Daftar layanan belum dapat dimuat. Muat ulang halaman untuk mencoba kembali."));
  }, []);

  const selectedService = catalog.services.find((service) => service.id === form.serviceId);
  const selectedDepartment = catalog.departments.find((department) => department.id === selectedService?.departmentId);
  const visibleServices = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? catalog.services.filter((service) => {
      const department = catalog.departments.find((item) => item.id === service.departmentId);
      return `${service.name} ${service.category} ${department?.name ?? ""} ${department?.code ?? ""}`.toLowerCase().includes(term);
    }) : catalog.services;
  }, [catalog.departments, catalog.services, search]);
  const servicesByDepartment = useMemo(() => catalog.departments.map((department) => ({
    department,
    services: visibleServices.filter((service) => service.departmentId === department.id),
  })).filter((group) => group.services.length > 0), [catalog.departments, visibleServices]);
  const displayedPurpose = visitPurpose(selectedService, form.purpose);

  function patch<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
    setDuplicateWarning(false);
  }

  function selectService(service: Service) {
    setForm((current) => ({
      ...current,
      serviceId: service.id,
      employeeName: current.serviceId === service.id ? current.employeeName : "",
      purpose: current.serviceId === service.id ? current.purpose : "",
    }));
    setError("");
    setDuplicateWarning(false);
    setSearch("");
  }

  function nextFromIdentity() {
    if (form.visitorName.trim().length < 2) return setError("Isi nama lengkap Anda.");
    if (form.visitorType !== "Pribadi / Masyarakat" && !form.institutionName.trim()) return setError("Isi nama instansi, perusahaan, atau organisasi.");
    if (!/^08\d{8,11}$/.test(form.phone.replace(/[\s-]/g, ""))) return setError("Gunakan nomor WhatsApp Indonesia, contoh 081234567890.");
    setError("");
    setStep(2);
  }

  function nextFromService() {
    if (!form.serviceId) return setError("Pilih satu keperluan agar kami dapat menentukan bidang tujuan.");
    if (needsPurpose(selectedService) && !form.purpose.trim()) return setError("Tuliskan maksud dan tujuan kunjungan Anda.");
    setError("");
    setStep(3);
  }

  async function submit(confirmDuplicate = false) {
    if (needsPurpose(selectedService) && !form.purpose.trim()) return setError("Ceritakan singkat keperluan Anda.");
    if (!selectedService) return setError("Pilih layanan terlebih dahulu.");
    if (submitting) return;
    if (!form.signature) return setError("Tanda tangan digital belum diisi.");
    if (!form.consent) return setError("Centang persetujuan penggunaan data untuk melanjutkan.");
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, source, confirmDuplicate }),
      });
      const responseText = await response.text();
      let data: {
        code?: string;
        error?: string;
        visit?: { visitCode: string; checkoutToken: string; time: string; departmentName: string; serviceName: string };
      } = {};
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        data = {};
      }
      if (response.status === 409 && data.code === "DUPLICATE_WARNING") {
        setDuplicateWarning(true);
        setError(data.error || "Nomor ini baru saja mengirim kunjungan.");
        return;
      }
      if (!response.ok || !data.visit) throw new Error(data.error || "Data belum berhasil dikirim.");
      const params = new URLSearchParams({
        time: data.visit.time,
        department: data.visit.departmentName,
        service: data.visit.serviceName,
        ...(kiosk ? { kiosk: "1" } : {}),
      });
      const resumePath = `/kunjungan/sukses/${encodeURIComponent(data.visit.visitCode)}?${params}#token=${data.visit.checkoutToken}`;
      if (!kiosk) {
        saveActiveVisit({
          code: data.visit.visitCode,
          resumePath,
          savedAt: Date.now(),
        });
      }
      window.location.replace(resumePath);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Terjadi kendala. Silakan coba kembali.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="guest-form-page mx-auto w-full max-w-4xl px-4 pb-12 pt-7 sm:px-6 sm:pt-10">
      <div className="guest-form-intro mb-7 text-center">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#087f5b]">SIBUKTAMU · Pelayanan Publik</p>
        <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Isi buku tamu dengan mudah</h1>
        <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-slate-600">Hanya tiga langkah singkat. Pilih layanan, tanda tangan, lalu petugas akan menerima data kedatangan Anda.</p>
      </div>

      <div className="guest-progress mb-7 flex items-start justify-center" aria-label={`Tahap ${step} dari 3`}>
        {[1, 2, 3].map((number, index) => (
          <div key={number} className="flex items-start">
            <div className="flex w-24 flex-col items-center sm:w-32">
              <div className={`grid size-10 place-items-center rounded-full border-2 text-sm font-bold shadow-sm ${number <= step ? "border-[#087f5b] bg-[#087f5b] text-white shadow-emerald-900/20" : "border-slate-300 bg-white text-slate-500"}`}>
                {number < step ? <Check className="size-4" /> : number}
              </div>
              <span className={`mt-2 text-xs font-bold sm:text-sm ${number <= step ? "text-[#087f5b]" : "text-slate-500"}`}>{stepLabels[index]}</span>
            </div>
            {index < 2 && <div className={`mt-5 h-0.5 w-5 sm:w-16 ${number < step ? "bg-[#087f5b]" : "bg-slate-300"}`} />}
          </div>
        ))}
      </div>

      <div className="guest-form-card overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/95 shadow-[0_28px_70px_rgba(4,61,49,0.16)] backdrop-blur-sm">
        <div className="border-b border-emerald-900/10 bg-gradient-to-r from-emerald-50 to-white px-5 py-5 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Tahap {step} dari 3</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">{step === 1 ? "Identitas singkat" : step === 2 ? "Tujuan kunjungan" : "Detail dan konfirmasi"}</h2>
        </div>

        <div className="p-5 sm:p-8">
          {step === 1 && (
            <div className="space-y-5">
              <Field label="Nama lengkap" required>
                <Input className="h-12 rounded-xl px-4" autoComplete="name" placeholder="Contoh: Ahmad Pratama" value={form.visitorName} onChange={(event) => patch("visitorName", event.target.value)} />
              </Field>
              <Field label="Asal tamu" required>
                <NativeSelect className="h-12 w-full rounded-xl px-4" value={form.visitorType} onChange={(event) => patch("visitorType", event.target.value)}>
                  {visitorTypes.map((type) => <NativeSelectOption key={type} value={type}>{type}</NativeSelectOption>)}
                </NativeSelect>
              </Field>
              {form.visitorType !== "Pribadi / Masyarakat" && (
                <Field label="Nama instansi / perusahaan / organisasi" required>
                  <Input className="h-12 rounded-xl px-4" placeholder="Nama lembaga asal" value={form.institutionName} onChange={(event) => patch("institutionName", event.target.value)} />
                </Field>
              )}
              <Field label="Nomor HP / WhatsApp" hint="Gunakan nomor Indonesia yang aktif" required>
                <Input className="h-12 rounded-xl px-4" inputMode="tel" autoComplete="tel" placeholder="08xxxxxxxxxx" value={form.phone} onChange={(event) => patch("phone", event.target.value.replace(/[^0-9\s-]/g, ""))} />
              </Field>
              <div className="absolute -left-[9999px]" aria-hidden="true"><label>Website<Input tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => patch("website", event.target.value)} /></label></div>
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="mb-5 text-sm leading-6 text-slate-600">Pilih bidang, UPT, atau Sekretariat, kemudian pilih seksi, subbagian, atau pejabat yang ingin ditemui. Susunan mengikuti papan struktur organisasi di kantor.</p>
              <div className="relative mb-5">
                <Search className="pointer-events-none absolute left-4 top-3.5 size-5 text-slate-400" />
                <Input className="h-12 rounded-xl pl-11" placeholder="Cari bidang atau layanan" value={search} onChange={(event) => setSearch(event.target.value)} />
              </div>
              {catalogError && <ErrorBox>{catalogError}</ErrorBox>}
              {!catalogError && catalog.services.length === 0 && <div className="py-16 text-center text-sm text-slate-500"><LoaderCircle className="mx-auto mb-3 size-6 animate-spin text-[#087f5b]" />Memuat layanan…</div>}
              <div className="grid gap-3 sm:grid-cols-2">
                {servicesByDepartment.map(({ department, services }) => {
                  const Icon = departmentIcons[department.id] ?? CircleHelp;
                  return (
                    <div key={department.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:col-span-2 sm:p-5">
                      <div className="mb-4 flex items-start gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-[#087f5b]"><Icon className="size-5" /></span>
                        <div><p className="text-sm font-extrabold leading-5 text-slate-800">{department.name}</p>{department.description && <p className="mt-1 text-xs leading-5 text-slate-500">{department.description}</p>}</div>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {services.map((service) => (
                          <button
                            type="button"
                            key={service.id}
                            onClick={() => selectService(service)}
                            className={`service-choice flex min-h-18 items-center justify-between gap-3 rounded-2xl border p-4 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100 ${form.serviceId === service.id ? "border-[#087f5b] bg-emerald-50 text-emerald-950 shadow-[0_10px_24px_rgba(8,127,91,0.12)]" : "border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50/50 hover:shadow-md"}`}
                          >
                            <span>{serviceLabel(service)}</span>{form.serviceId === service.id ? <Check className="size-5 shrink-0 text-[#087f5b]" /> : <ChevronRight className="size-4 shrink-0 text-slate-400" />}
                          </button>
                        ))}
                      </div>
                      {selectedService?.departmentId === department.id && (
                        <div className="mt-4"><Field label={needsPurpose(selectedService) ? "Jelaskan keperluan Anda" : "Keterangan tambahan"} hint={needsPurpose(selectedService) ? "Wajib diisi untuk pilihan ini" : "Opsional; boleh langsung lanjut"} required={needsPurpose(selectedService)}>
                          <Textarea aria-label="Penjelasan keperluan" maxLength={1000} className="min-h-24 rounded-xl" placeholder="Tuliskan keperluan Anda di bidang ini" value={form.purpose} onChange={(event) => patch("purpose", event.target.value)} />
                        </Field></div>
                      )}
                    </div>
                  );
                })}
                {visibleServices.length === 0 && <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500 sm:col-span-2">Layanan tidak ditemukan. Pilih “Lainnya” atau ubah kata pencarian.</p>}
              </div>
              {selectedService && (
                <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#087f5b]">Tujuan kunjungan</p>
                  <p className="mt-1 text-sm font-semibold text-emerald-950">{selectedDepartment?.name}</p>
                  {selectedService.category !== "Tujuan" && <p className="mt-0.5 text-xs text-emerald-800">{serviceLabel(selectedService)}</p>}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="rounded-xl bg-slate-50 p-4 text-sm">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Summary label="Nama" value={form.visitorName} />
                  <Summary label="WhatsApp" value={form.phone} />
                  <Summary label="Maksud dan tujuan" value={displayedPurpose} />
                  <Summary label="Tujuan" value={selectedDepartment?.name} />
                </div>
              </div>
              {selectedService?.allowsEmployee && (
                <Field label="Pegawai yang ingin ditemui" hint="Opsional — kosongkan jika belum tahu">
                  <Input className="h-12 rounded-xl" placeholder="Ketik nama pegawai, jika ada" value={form.employeeName} onChange={(event) => patch("employeeName", event.target.value)} />
                </Field>
              )}
              <Field label="Tanda tangan tamu" hint="Gunakan jari, stylus, atau mouse" required>
                <SignaturePad onChange={(value) => patch("signature", value ?? "")} />
              </Field>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm leading-6 text-slate-600">
                <Checkbox className="mt-1 size-5" checked={form.consent} onCheckedChange={(checked) => patch("consent", checked === true)} />
                <span>Saya menyetujui data ini digunakan untuk administrasi kunjungan dan pelayanan Disnakertrans Provinsi Sulawesi Tengah. <a href="/privacy" target="_blank" className="font-semibold text-[#087f5b] underline underline-offset-2">Kebijakan Privasi</a></span>
              </label>
              <div className="flex items-center gap-2 text-xs text-slate-500"><ShieldCheck className="size-4 text-[#087f5b]" />Kami tidak meminta NIK atau foto identitas.</div>
            </div>
          )}

          {error && <div className="mt-5"><ErrorBox>{error}</ErrorBox></div>}
          {duplicateWarning && (
            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
              <span>Jika ini memang kunjungan baru, lanjutkan pengiriman.</span>
              <Button type="button" className="bg-amber-700 hover:bg-amber-800" disabled={submitting} onClick={() => submit(true)}>Tetap kirim kunjungan baru</Button>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
            {step > 1 ? <Button type="button" variant="ghost" className="h-12 px-4" disabled={submitting} onClick={() => { setStep((current) => current - 1); patch("signature", ""); setDuplicateWarning(false); setError(""); }}><ArrowLeft />Kembali</Button> : <span />}
            {step === 1 && <Button type="button" className="h-13 rounded-xl bg-[#087f5b] px-7 text-base shadow-lg shadow-emerald-900/15 hover:bg-[#066c4d]" onClick={nextFromIdentity}>Lanjutkan<ArrowRight /></Button>}
            {step === 2 && <Button type="button" className="h-13 rounded-xl bg-[#087f5b] px-7 text-base shadow-lg shadow-emerald-900/15 hover:bg-[#066c4d]" onClick={nextFromService}>Lanjutkan<ArrowRight /></Button>}
            {step === 3 && <Button type="button" className="h-13 rounded-xl bg-[#087f5b] px-7 text-base shadow-lg shadow-emerald-900/15 hover:bg-[#066c4d]" disabled={submitting || duplicateWarning} onClick={() => submit(false)}>{submitting ? <><LoaderCircle className="animate-spin" />Mengirim…</> : <><Check />Kirim data kunjungan</>}</Button>}
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-slate-500">Data tanggal, jam masuk, nomor urut, kode kunjungan, dan bidang tujuan dibuat otomatis oleh sistem.</p>
    </section>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return <div><div className="mb-2 flex flex-wrap items-baseline justify-between gap-2"><label className="text-sm font-bold text-slate-800">{label}{required && <span className="ml-1 text-rose-600">*</span>}</label>{hint && <span className="text-xs text-slate-500">{hint}</span>}</div>{children}</div>;
}

function Summary({ label, value }: { label: string; value?: string | null }) {
  return <div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-0.5 whitespace-pre-wrap break-words font-semibold text-slate-800">{value || "—"}</p></div>;
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">{children}</div>;
}
