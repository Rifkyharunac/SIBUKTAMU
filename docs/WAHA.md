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
Jalankan `node tools/waha-smoke.mjs` terlebih dahulu. Secara default skrip hanya
memverifikasi identitas bot melalui jalur yang sama dengan aplikasi dan tidak
mengirim pesan. Untuk pengiriman, jalankan `node tools/waha-smoke.mjs --send`;
skrip memverifikasi identitas, menolak nomor bot sendiri, lalu mengirim
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

## Diagnosis verifikasi WAHA — 24 September 2026

Sebelumnya semua HTTP gagal pada `/api/sessions/{session}/me` menghasilkan
pesan generik tentang sesi/API key. Penyebab sebenarnya tidak dapat ditentukan
dari pesan lama tersebut. Skrip uji lama juga menggunakan endpoint berbeda,
sehingga keberhasilannya tidak membuktikan jalur aplikasi bekerja.

Sekarang aplikasi dan skrip menggunakan pemeriksaan yang sama. URL dasar boleh
berakhiran `/api`; aplikasi menghindari `/api/api`. Header `X-Api-Key` tetap
dipakai, redirect tidak diikuti, dan header bypass halaman peringatan ngrok
disertakan. Tidak ada nilai konfigurasi rahasia yang perlu diganti.

| Kode diagnosis | Makna dan tindak lanjut |
| --- | --- |
| WAHA_AUTH | HTTP 401/403 dari API: periksa API key, izin sesi, dan autentikasi proxy jika ada. |
| WAHA_SESSION | Sesi/permintaan ditolak (409/422), identitas tidak valid, atau fallback belum WORKING. Periksa sesi dan QR. |
| WAHA_ENDPOINT | Endpoint/sesi tidak ditemukan atau tidak didukung (404/405). Periksa URL, nama sesi, dan versi WAHA. |
| WAHA_TUNNEL | HTML, redirect, atau penanda error tunnel. Periksa URL, halaman perantara, dan akses tunnel/proxy. |
| WAHA_GATEWAY | 502/504 atau kegagalan gateway Cloudflare. Bisa berasal dari tunnel, proxy, atau server di belakangnya; kode HTTP saja belum memastikan akar masalah. |
| WAHA_SERVER | HTTP 5xx lainnya dari layanan API. Periksa log WAHA dan proxy. |
| WAHA_NETWORK / WAHA_TIMEOUT | Koneksi/TLS/jaringan gagal atau batas waktu tercapai. Belum membuktikan API key salah. |
| WAHA_RATE_LIMIT / WAHA_RESPONSE | Batas permintaan atau respons tidak sesuai kontrak. |

Jika `/me` mengembalikan 404/405 tanpa halaman tunnel, aplikasi mencoba
`GET /api/sessions/{session}` satu kali. Pengiriman hanya diizinkan bila nama
sesi cocok, status WORKING, dan `me.id` berisi identitas nomor telepon yang valid.
Fallback tidak digunakan untuk melewati 401/403, timeout, atau gangguan server.
Identitas `@lid` tidak dianggap nomor telepon. Larangan mengirim ke bot sendiri
tetap berlaku. Pemeriksaan identitas tidak menampilkan nomor bot atau rahasia.

Error mencantumkan tahap dan status HTTP jika tersedia, tanpa respons mentah,
URL rahasia, API key, atau isi pesan. Tidak ada pengiriman ulang otomatis dalam
adapter; kegagalan setelah POST perlu diperiksa di WAHA sebelum kirim ulang.

Pengujian otomatis: `node --test tests/waha-provider.test.mjs` dan
`node tests/security-integration.cjs`. Seluruh respons WAHA dalam pengujian ini
disimulasikan. Uji tersebut tidak membuktikan tunnel produksi sedang aktif atau
pesan diterima HP. Rahasia hosting disembunyikan oleh platform, sehingga uji
langsung dijalankan pengelola di lingkungan yang memiliki konfigurasi tersebut.

Acuan kontrak endpoint: https://waha.devlike.pro/docs/how-to/sessions/
