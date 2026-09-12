# Uji coba WAHA untuk SIBUKTAMU

Integrasi tersedia, tetapi pengiriman nyata memerlukan server WAHA dan nomor
pengirim yang sudah terhubung. Nomor penerima admin bukan otomatis nomor pengirim.
Gunakan nomor khusus pengirim untuk uji coba. Notifikasi dashboard tetap berjalan
meskipun WhatsApp belum dikonfigurasi atau koneksinya terputus.

## Server

Jalankan `deploy/waha/compose.yaml` pada VPS/server Docker yang tetap menyala.
Sediakan WAHA_API_KEY dan WAHA_DASHBOARD_PASSWORD sebagai rahasia di lingkungan
server, lalu jalankan `docker compose -f deploy/waha/compose.yaml up -d`.
Port dibatasi ke loopback. Pasang reverse proxy HTTPS untuk akses API dari
SIBUKTAMU; batasi akses dashboard dan Swagger untuk pengelola.
Jangan memakai konfigurasi ini sebagai server HTTP publik tanpa pengamanan.
Untuk instalasi yang telah diuji, tetapkan WAHA_IMAGE ke versi/digest yang sama
agar pembaruan image tidak mengubah layanan tanpa pengujian.

Buka dashboard WAHA, buat/start sesi bernama `default`, pindai QR menggunakan
WhatsApp nomor pengirim, dan tunggu status `WORKING`. Simpan volume sesi;
jangan memasukkan sesi, API key, atau sandi ke GitHub.

## Konfigurasi aplikasi

Atur rahasia/runtime aplikasi (bukan lewat formulir tamu):

- WHATSAPP_PROVIDER=waha
- WAHA_API_URL=https://alamat-server-waha-anda (tanpa /api/sendText)
- WAHA_API_KEY=rahasia dari server WAHA
- WAHA_SESSION=default

Provider default tetap `meta` untuk menjaga konfigurasi lama. Pemilihan `waha`
tidak memakai token maupun phone-number-ID Meta. URL WAHA wajib HTTPS.

## Uji pengiriman nyata

Pada komputer/server yang dapat menjangkau WAHA, atur WAHA_API_URL,
WAHA_API_KEY, WAHA_SESSION dan WAHA_TEST_RECIPIENT=6285214900540.
Jalankan `node tools/waha-smoke.mjs`. Skrip memeriksa sesi WORKING lalu mengirim
tepat satu pesan uji tanpa data tamu. Periksa HP admin untuk memastikan pesan
sampai. Jangan mengulang otomatis ketika waktu tunggu habis; pesan sebelumnya
mungkin sudah diterima penyedia.

Sesudah berhasil, uji satu pendaftaran tamu melalui website dan periksa
notifikasi dashboard serta HP admin bidang yang dipilih.

## Makna status dan pengujian

ACCEPTED / Diterima Penyedia: API mengembalikan ID pesan, bukan bukti perangkat
penerima sudah menerima pesan. Pembaruan status delivered/read melalui webhook
belum diterapkan. Pesan yang ACCEPTED tidak ditawarkan untuk kirim ulang.
FAILED menampilkan pesan aman tanpa membocorkan API key/respons mentah penyedia.
NOT_CONFIGURED berarti konfigurasi belum lengkap. Jangan mengubah status
menjadi berhasil jika belum ada ID pesan.

`node tests/security-integration.cjs` mencakup uji WAHA dengan respons HTTP
simulasi: format nomor/payload/header, respons berhasil, API key ditolak,
respons tanpa ID, pembatasan HTTPS, penyimpanan status, dan larangan kirim ulang
pesan yang diterima penyedia. Uji ini tidak mengirim pesan WhatsApp nyata.

Dokumentasi: https://waha.devlike.pro/docs/how-to/send-messages/
Keamanan: https://waha.devlike.pro/docs/how-to/security/
