import { PublicShell } from "@/components/public-shell";

export default function PrivacyPage() {
  return (
    <PublicShell>
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0369a1]">Pemberitahuan Privasi</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">Kebijakan Privasi SIBUKTAMU</h1>
        <div className="mt-8 space-y-6 rounded-2xl border border-slate-200 bg-white p-6 leading-7 text-slate-700 shadow-sm sm:p-8">
          <p>SIBUKTAMU hanya mengumpulkan data yang diperlukan untuk administrasi kunjungan dan mengarahkan masyarakat kepada unit pelayanan yang tepat. Sistem tidak meminta NIK, foto KTP, atau dokumen identitas.</p>
          <section><h2 className="font-bold text-slate-950">Data yang diproses</h2><p>Nama, jenis asal tamu, nama instansi bila relevan, nomor WhatsApp, keperluan, tujuan layanan, nama pegawai bila diisi, waktu kunjungan, status pelayanan, dan tanda tangan digital.</p></section>
          <section><h2 className="font-bold text-slate-950">Tujuan penggunaan</h2><p>Data digunakan untuk penerimaan tamu, koordinasi pelayanan, pencatatan jam masuk dan keluar, penyusunan laporan, peningkatan mutu pelayanan, serta pelaksanaan kewajiban administrasi instansi.</p></section>
          <section><h2 className="font-bold text-slate-950">Akses dan keamanan</h2><p>Akses data dibatasi berdasarkan peran petugas. Pimpinan melihat nomor telepon dalam bentuk tersamarkan. Aktivitas perubahan oleh admin dicatat dalam audit log.</p></section>
          <section><h2 className="font-bold text-slate-950">Daftar penyelesaian layanan</h2><p>Nama tamu yang belum selesai, nomor antrean, dan waktu kedatangan ditampilkan pada halaman publik Selesaikan layanan. Data tersebut dihapus dari daftar aktif setelah kunjungan selesai atau dibatalkan. Nomor WhatsApp, keperluan, dan tanda tangan tidak ditampilkan pada daftar ini.</p></section>
          <section><h2 className="font-bold text-slate-950">Penyimpanan data</h2><p>Data disimpan sesuai kebijakan kearsipan dan retensi yang ditetapkan administrator. Penghapusan tidak dilakukan otomatis tanpa kebijakan resmi.</p></section>
          <p className="text-sm text-slate-500">Untuk pertanyaan mengenai data kunjungan, silakan menghubungi Dinas Tenaga Kerja dan Transmigrasi Provinsi Sulawesi Tengah, Jl. RA. Kartini No. 98, Palu Timur.</p>
        </div>
      </article>
    </PublicShell>
  );
}
