# Revisi notifikasi HP — 26 September 2026

## Perilaku yang dituju

Setelah formulir tamu tersimpan, server mengirim Web Push tanpa menunggu dashboard terbuka. Panel notifikasi HP menampilkan “Tamu baru datang” dan “Ada tamu baru menunggu pelayanan”. Ketukan membuka kunjungan tersebut, termasuk bidang dan keperluannya, setelah autentikasi petugas. Nama, nomor telepon, dan keperluan tamu tidak ditampilkan di layar terkunci.

## Hasil pemeriksaan

Versi sebelumnya sudah menggunakan Web Push. Pesan “layanan push menerima pesan uji” hanya membuktikan penyedia menerima permintaan server. Itu tidak membuktikan pesan diterima HP. Pemberitahuan di dalam dashboard berasal dari pemeriksaan berkala yang hanya berjalan ketika halaman terlihat.

Revisi ini memperbaiki celah yang ditemukan pada kode:

- Langganan perangkat dicocokkan dengan kunci server dan waktu kedaluwarsanya sebelum disimpan kembali.
- Kegagalan memperbarui jendela dashboard tidak lagi menghalangi tampilan notifikasi sistem.
- Kegagalan mencatat riwayat notifikasi tidak menghentikan percobaan push setelah kunjungan tersimpan.
- Ketukan notifikasi membuka kunjungan yang benar, termasuk kunjungan di luar 200 data terbaru.
- Admin dapat memperbarui koneksi perangkat serta menguji tampilan HP dan kiriman server secara terpisah. Pesan uji membedakan penerimaan oleh penyedia dan penerimaan oleh service worker perangkat saat aplikasi terbuka.

Penyebab pasti kegagalan penerimaan pada HP pelapor belum dapat dipastikan tanpa uji pada perangkat tersebut. Pengujian otomatis tidak menggantikan uji penerimaan Android.

## Terapkan ke situs yang sudah dipakai

Perubahan GitHub tidak otomatis berarti situs `buku-tamu-digital-disnaker.mahyatibjm12345.chatgpt.site` sudah berubah. Gunakan akun pemilik/editor situs tersebut untuk menerapkan source revisi ke proyek hosting yang sama dan menerbitkan versinya. Pertahankan database D1, bucket R2, kunci `admin_push_config`, konfigurasi rahasia, serta domain lama. Jangan membuat database atau situs pengganti untuk pembaruan ini.

Tidak ada migrasi baru dalam revisi ini. Instalasi harus sudah memiliki tabel dari migrasi `0009_admin_app_notifications.sql`, sebagaimana versi sebelumnya.

## Uji penerimaan pada HP

1. Setelah revisi terbit, buka aplikasi SIBUKTAMU di HP dan muat ulang. Masuk sebagai Admin.
2. Buka **Atur**. Jika belum terdaftar, tekan **Aktifkan notifikasi HP**.
3. Tekan **Uji tampilan HP**. Periksa panel notifikasi Android. Uji ini berjalan lokal tanpa pengiriman server.
4. Tekan **Perbarui koneksi notifikasi**, kemudian **Uji kiriman server**. Pesan penerimaan oleh layanan push saja belum cukup; pastikan notifikasi benar-benar muncul di panel HP.
5. Jika uji lokal muncul tetapi kiriman server tidak muncul, coba jaringan lain serta uji tanpa VPN untuk membedakan masalah koneksi layanan push. Jika keduanya tidak muncul, periksa pengaturan notifikasi aplikasi dan browser Android. Catat browser, versi Android, serta hasil masing-masing uji.
6. Kembali ke layar utama atau kunci HP tanpa menekan Keluar dan tanpa memaksa berhenti browser. Dari perangkat lain, isi satu kunjungan uji sampai halaman berhasil.
7. Pastikan notifikasi masuk sebelum aplikasi dibuka. Ketuk dan cocokkan kunjungan, bidang, dan keperluannya. Ulangi saat aplikasi sedang terbuka.

## Validasi pengembang

Jalankan `npm ci`, `npm test`, `npm run test:security`, `npm run typecheck`, dan `npm run build` dengan Node.js 24+. Pengujian mencakup notifikasi saat aplikasi tertutup/terbuka, kegagalan jendela, klik notifikasi, pembaruan kunci langganan, dan dekripsi pesan nyata menggunakan implementasi kriptografi penerima yang terpisah. Pengujian integrasi memakai database sementara dan transport simulasi; tidak mengirim pesan ke HP sungguhan.
