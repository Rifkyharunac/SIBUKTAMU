# Struktur berdasarkan papan organisasi kantor

Acuan: foto IMG-20260916-WA0012.jpg.jpeg yang dikirim pengguna. Menurut arahan
staf yang disampaikan pengguna, struktur di website sedang diperbarui. Foto
kantor menjadi acuan nama unit dan hubungan seksi pada revisi ini.

## Tujuan dan bagian

1. Bidang Pembinaan Pelatihan Perluasan Penempatan dan Produktivitas Tenaga Kerja
   - Penempatan dan Perluasan Kesempatan Kerja.
   - Penempatan dan Perlindungan Pekerja Migran Indonesia.
2. Bidang Pembinaan Hubungan Industrial dan Pengawasan Ketenagakerjaan
   - Pembinaan Organisasi Hubungan Industrial.
   - Syarat Kerja, Pengupahan dan Jaminan Sosial.
3. Bidang Perencanaan Kawasan Transmigrasi
   - Pembinaan Potensi Kawasan.
   - Penyediaan Tanah dan Pelayanan Pertanahan Transmigrasi.
4. Bidang Pengembangan Kawasan Transmigrasi dan Penataan Persebaran Penduduk
   - Penyiapan Prasarana dan Sarana Permukiman dan Transmigrasi.
   - Penataan dan Persebaran Penduduk.
5. Bidang Pengembangan Kawasan Transmigrasi Daerah Tertinggal dan Daerah Tertentu
   - Pengembangan Ekonomi dan SDM Masyarakat Transmigrasi, Daerah Tertinggal dan Daerah Tertentu.
   - Evaluasi Perkembangan Permukiman Kawasan Transmigrasi dan Sarana Prasarana Daerah Tertinggal dan Daerah Tertentu.
6. UPT Wilayah I dan UPT Wilayah II, masing-masing:
   - Subbagian Tata Usaha.
   - Pengawasan Norma Kerja.
   - Pengawasan Norma Kesehatan dan Keselamatan Kerja.
7. Sekretariat Dinas, ditempatkan paling bawah:
   - Subbagian Program.
   - Subbagian Keuangan dan Aset.
   - Subbagian Kepegawaian dan Umum.

Masing-masing bidang/UPT menyediakan pilihan bertemu kepalanya. Sekretariat
menyediakan Bertemu Sekretaris Dinas dan Lainnya. Kepala Dinas tidak dimasukkan
sesuai permintaan sebelumnya. Nama pribadi dan NIP pada papan tidak disalin
menjadi akun atau identitas petugas otomatis.

Lainnya / Belum tahu tujuan tetap tersedia melalui antrean Penerima Tamu.
Antrean ini fitur operasional aplikasi, bukan unit tambahan pada struktur.
Total: delapan unit tujuan organisasi, satu antrean bantuan, 29 pilihan.

## Pembaruan

Cadangkan proyek, pertahankan .dev.vars dan .wrangler dari instalasi lama.
Jalankan npm ci, npm run db:migrate:local, dan npm run dev.
Untuk server instansi: npm run db:migrate:remote lalu npm run deploy.

Migrasi 0007 mempertahankan ID bidang, akun dan kontaknya. Pilihan lama yang
digantikan dinonaktifkan tanpa menghapus riwayat. Nama tujuan yang dipakai
bersama oleh data master diperbarui; laporan historis yang mengambil nama dari
master akan menampilkan nama unit terbaru. Nama layanan lama yang sudah
dinonaktifkan tetap tersimpan.

Atur penerima WhatsApp per seksi melalui Master Layanan bila berbeda dari nomor
bidang. Jika belum diatur, layanan mengikuti nomor bidang dan fallback admin
yang telah dikonfigurasi. Seksi bukan role baru: hak akses tetap mengikuti bidang.

Perbaikan tanda tangan, kolom maksud wajib, serta pengaturan kontak dari revisi
sebelumnya tetap berlaku. Foto organisasi tidak dijadikan sumber jam pelayanan.
