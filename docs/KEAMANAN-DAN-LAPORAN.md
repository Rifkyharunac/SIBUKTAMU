# Pembaruan SIBUKTAMU untuk Disnakertrans Sulawesi Tengah

## Identitas dan acuan laporan

Logo daerah: https://sultengprov.go.id/wp-content/uploads/2026/05/logo-sulteng-scaled.png
Logo kecil dari situs Disnakertrans: https://disnakertrans.sultengprov.go.id/img/konfigurasi/icon/1748795241_96a20142bd65fb5dfcec.png
Alamat dan kontak: https://disnakertrans.sultengprov.go.id/
Acuan kop perangkat daerah: Pergub Sulawesi Tengah Nomor 17 Tahun 2023, lampiran halaman 58, https://jdih.sultengprov.go.id/produk-hukum/unduh/854
Dasar nasional: Permendagri Nomor 1 Tahun 2023 tentang Tata Naskah Dinas di Lingkungan Pemerintah Daerah.

Ekspor ini merupakan rekap tabel administrasi buku tamu, bukan surat dinas atau laporan naratif yang telah disahkan. Kop memakai lambang daerah, nama pemerintah daerah dan perangkat daerah dengan rasio ukuran huruf 3:4, alamat, pos-el dan laman. Nama perangkat daerah ditebalkan. PDF A4 landscape, tabel berulang, teks panjang diteruskan dan nomor halaman. Excel berfont Arial, berlogo tertanam, berbingkai, header tetap, filter serta lembar data lengkap. PDF memakai Helvetica bawaan PDF sebagai pengganti sans-serif; penerapan Arial persis dan format akhir perlu diverifikasi bagian tata usaha. Margin tabel landscape disesuaikan untuk keterbacaan. Tidak ada nomor surat, stempel, nama, NIP, atau tanda tangan pejabat yang dibuat otomatis.

Isi jabatan, nama, dan NIP pengesahan pada Pengaturan. Tanda tangan tamu tetap tersimpan di objek privat dan hanya dapat dibuka petugas berwenang dari detail kunjungan; rekap tidak membagikan citra tanda tangan secara massal. Laporan dapat memuat nomor HP sehingga unduhan memerlukan sesi petugas dan pembatasan peran. Viewer memperoleh nomor HP tersamarkan. Unduhan dicatat pada audit log. Maksimal 2.000 baris per ekspor; perkecil rentang apabila melebihi batas.

## Pengamanan yang diterapkan

- Username/sandi instansi, hashing PBKDF2 bersalt, perbandingan hash, cookie sesi Secure/HttpOnly/SameSite dengan masa berlaku 12 jam.
- Sesi lama dicabut saat ganti sandi. Perubahan akun oleh Admin mencabut sesi akun tersebut. Admin tidak dapat menonaktifkan atau menurunkan perannya sendiri.
- Pembatasan peran pada API, ekspor, dan citra tanda tangan tetap berlaku untuk Front Office dan Viewer. Akun lama Admin Bidang memiliki akses penuh yang sama dengan Admin, termasuk tanpa penempatan bidang.
- Validasi Origin dan Sec-Fetch-Site untuk mutasi, tipe konten JSON, batas ukuran badan permintaan, validasi isian dan format/dimensi PNG.
- Pembatasan frekuensi login, pendaftaran, penyelesaian kunjungan, perubahan, dan ekspor melalui penghitung D1 atomik berbasis IP.
- Header CSP, nosniff, no-referrer, pembatasan iframe, HSTS pada HTTPS, serta no-store untuk halaman/data privat. CSP masih mengizinkan inline script/style yang dibutuhkan renderer; bukan perlindungan XSS mutlak.
- Token acak 256-bit untuk tautan pribadi kunjungan, hanya hash disimpan di DB. Token dibawa dalam fragmen URL. Penyelesaian manual membutuhkan nomor HP terdaftar selain kode. Ini bukan verifikasi OTP; hindari membagikan kode, nomor, atau tautan pribadi.
- Perubahan status memakai pemeriksaan status sebelumnya untuk menghindari penimpaan akibat permintaan bersamaan.
- Katalog publik tidak mengekspos kontak internal layanan. Identitas dan tanda tangan tidak disimpan dalam localStorage; hanya kode dan tautan pribadi untuk melanjutkan kunjungan, berlaku 24 jam.

Pengamanan ini tidak menjamin sistem tidak dapat diserang dan bukan hasil audit penetrasi independen. Untuk operasional instansi diperlukan penetapan pengelola, evaluasi hak akses berkala, kebijakan retensi/cadangan, dan pemeriksaan keamanan oleh pihak instansi. MFA/OTP belum tersedia.

## Kinerja dan notifikasi

Seed data tidak ditulis ulang pada setiap permintaan dalam isolate yang sudah siap. Grafik memakai agregasi seluruh data periode, bukan hanya 200 baris pratinjau. Tindakan baca/hapus notifikasi massal tidak dibatasi 100 baris. Pencarian diberi jeda singkat; polling dashboard berhenti saat tab tersembunyi. Pendaftaran mengembalikan bukti setelah data tersimpan; WhatsApp diproses di latar melalui waitUntil. Gangguan antrean notifikasi tidak mengubah pendaftaran yang sudah tersimpan menjadi pesan gagal. Dashboard tetap menjadi sumber status kunjungan. Provider WhatsApp Business harus dikonfigurasi untuk mengirim pesan otomatis.

## Verifikasi

`npm run test:security` menjalankan handler API asli dengan adapter D1 berbasis SQLite memori, tanpa mengirim pesan atau mengubah data produksi. Mencakup autentikasi, rotasi sesi, isolasi peran, token checkout, SQL pendaftaran, antrean, rate limit, dan PDF/Excel. Verifikasi ini bukan uji seluruh infrastruktur hosting. PDF sampel multipage dirender dan workbook diperiksa untuk logo, orientasi landscape, serta input teks yang tidak menjadi formula.

## Hosting mandiri

Konfigurasi server disediakan melalui `wrangler.json`. Pasang database D1, penyimpanan R2, secret akun admin, dan domain milik instansi sebelum operasional. Identitas aplikasi dan laporan menggunakan SIBUKTAMU dan Disnakertrans Sulawesi Tengah. Dependensi sumber terbuka tetap tunduk pada lisensinya masing-masing.
