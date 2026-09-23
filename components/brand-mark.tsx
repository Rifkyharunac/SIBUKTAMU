

export function BrandMark({ compact = false, inverse = false }: { compact?: boolean; inverse?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`grid shrink-0 place-items-center rounded-xl shadow-sm ${compact ? "size-10" : "size-11"} ${inverse ? "bg-white/12 text-white ring-1 ring-white/20" : "bg-white text-white ring-1 ring-slate-200"}`}>
        <img src="/logo-sulteng-small.png" width="44" height="44" className="size-11 object-contain" alt="Lambang Provinsi Sulawesi Tengah" />
      </div>
      <div className="min-w-0">
        <p className={`text-[10px] font-extrabold uppercase leading-3 tracking-[0.16em] ${inverse ? "text-sky-200" : "text-[#0369a1]"}`}>
          Pemerintah Provinsi Sulawesi Tengah
        </p>
        <p className={`${compact ? "mt-1 text-xs font-extrabold leading-4" : "text-sm font-bold leading-tight"} ${inverse ? "text-white" : "text-slate-900"}`}>
          Dinas Tenaga Kerja dan Transmigrasi
        </p>
      </div>
    </div>
  );
}
