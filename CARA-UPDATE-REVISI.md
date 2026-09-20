# Revisi pengisian tamu dan notifikasi — 19 September 2026

## Perubahan

- Setiap bidang, UPT dan Sekretariat aktif mempunyai pilihan Lainnya di kelompoknya sendiri.
- Pilihan seksi/tujuan bawaan dapat dilanjutkan tanpa keterangan tambahan. Lainnya wajib diisi. Layanan khusus yang sengaja diberi aturan wajib oleh admin tetap mengikuti aturan tersebut.
- Konfirmasi menampilkan penjelasan yang ditulis tamu; jika kosong pada pilihan biasa, menampilkan nama layanan. Penjelasan tersimpan pada kunjungan dan masuk ke pesan WhatsApp.
- Struktur kantor versi 17 September dipertahankan. Migrasi terbaru: `0008_department_other_choices.sql`. Riwayat kunjungan tidak dihapus.
- Notifikasi dikirim ke nomor akun semua Admin Bidang aktif sesuai bidang tujuan, serta semua Super Admin aktif. Nomor yang sama dinormalisasi dan hanya mendapat satu pesan per kunjungan.
- Kontak pada master bidang/layanan dan DEFAULT_ADMIN_WHATSAPP tidak lagi menentukan penerima. Isi nomor penerima pada menu Pengguna.
- Nomor bot diperiksa dari sesi WAHA sebelum pengiriman. Jika sama dengan penerima, pengiriman ditolak dengan penjelasan di riwayat; admin lain tetap diproses.
- Pengiriman paralel ke log yang sama dicegah dengan klaim database. Status Diterima Penyedia berarti API menerima pesan, bukan bukti pesan sudah dibaca.

## Pembaruan di Windows

1. Hentikan aplikasi dan cadangkan seluruh folder lama, terutama `.dev.vars` serta `.wrangler` yang berisi database/tanda tangan lokal.
2. Ekstrak ZIP ini. Salin `.dev.vars` dan `.wrangler` dari cadangan ke folder hasil ekstrak untuk mempertahankan konfigurasi dan data. Jangan menghapus database lama.
3. Gunakan Node.js 24 atau lebih baru, buka terminal di folder `SIBUKTAMU-main`:

```powershell
npm ci
npm run db:migrate:local
npm run dev
```

Untuk instalasi baru, buat `.dev.vars` dari `.dev.vars.example` dan isi konfigurasi sendiri. ZIP tidak menyertakan rahasia, sesi WAHA, atau data tamu laptop.

## Pengaturan bot dan penerima

Pertahankan WAHA yang sudah berjalan dan sesi yang sudah dipasangkan melalui QR.
Konfigurasi server aplikasi:

```dotenv
WHATSAPP_PROVIDER=waha
WAHA_API_URL=http://localhost:3000
WAHA_API_KEY=ISI_API_KEY_WAHA_ANDA
WAHA_SESSION=default
```

Sesuaikan URL/port dengan WAHA Anda. HTTP hanya diizinkan untuk localhost/127.0.0.1. Aplikasi yang dihosting membutuhkan URL HTTPS WAHA yang bisa dijangkau server; localhost server hosting bukan laptop Anda.

Masuk sebagai Super Admin → Pengguna. Pada setiap akun Admin Bidang, tetapkan bidang yang benar, aktifkan akun, dan isi nomor WhatsApp admin penerima. Pada akun Super Admin, isi nomor penerima dan aktifkan akun. Nomor akun bot yang dipasangkan ke WAHA tidak boleh dipakai sebagai nomor penerima.

Coba satu kunjungan baru ke bidang yang sudah diatur. Periksa riwayat notifikasi: setiap nomor penerima unik mempunyai log sendiri. Admin bidang lain tidak menerima pesan kunjungan tersebut. Jika tidak ada penerima valid, log menunjukkan Belum Dikonfigurasi. Setelah memperbaiki akun, uji dengan kunjungan baru; tujuan pada log lama tidak otomatis berubah.

Kegagalan WhatsApp tidak membatalkan kunjungan yang sudah tersimpan. Sebelum mengirim ulang pesan gagal karena timeout, periksa riwayat WAHA untuk menghindari pengiriman ganda. Status Sedang dikirim yang menetap setelah server terhenti perlu diperiksa operator pada riwayat WAHA sebelum dipulihkan.

## Verifikasi dan batas pengujian

Pengujian otomatis mencakup pilihan biasa/Lainnya, penyimpanan penjelasan, penerima beberapa admin, normalisasi/deduplikasi nomor, penolakan kirim ke bot sendiri, pengiriman serentak, login/logout, batas akses, checkout, ekspor PDF/Excel, serta pengelolaan notifikasi.
Pengiriman WAHA diuji memakai respons simulasi, bukan mengirim pesan nyata ke akun Anda. Lakukan uji penerimaan di laptop dengan sesi WAHA aktif sebelum dipakai operasional. Versi ini belum dipublikasikan ke situs atau GitHub.

Referensi endpoint identitas sesi: https://waha.devlike.pro/docs/how-to/sessions/#get-me

Dokumen struktur tanggal sebelumnya tetap tersedia sebagai catatan historis; aturan pengisian dan penerima pada dokumen ini menggantikan aturan lama.
