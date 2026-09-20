# Revisi kontak dan tujuan kunjungan

Revisi ini melanjutkan versi 15 September 2026. Tahap kedua memakai judul
Tujuan Kunjungan. Semua tamu wajib menjelaskan maksud dan tujuan; validasi juga
dijalankan oleh server. Sekretariat tetap paling bawah dengan tiga bagiannya,
pilihan Bertemu Sekretaris Dinas, dan Lainnya khusus Sekretariat.

Lainnya / Belum tahu tujuan berada terpisah pada antrean Penerima Tamu.
Front Office dan Super Admin dapat melihat dan mengalihkan kunjungannya.
Ini adalah antrean operasional aplikasi, bukan tambahan bidang resmi dinas.
Pengelola perlu menentukan nomor WhatsApp penerima pada Master Bidang.
Jika belum diisi, sistem memakai DEFAULT_ADMIN_WHATSAPP bila tersedia.

Alamat dilengkapi dan email resmi ditampilkan. Jam pelayanan informasi mengacu
pada https://disnakertrans.sultengprov.go.id/ yaitu Senin–Jumat 08.00–15.00 WITA.
Migrasi memperbarui pengaturan jam/alamat hanya jika masih memakai nilai bawaan
lama. Pengaturan khusus yang telah dibuat admin dipertahankan.

Uraian kepanjangan lima bidang yang belum terverifikasi dihapus. Singkatan
tujuan tetap mengikuti foto dari staf. Penamaan tiga bagian Sekretariat masih
mengikuti catatan staf, bukan klaim nomenklatur hukum baru.

Setelah mencadangkan proyek dan mempertahankan .dev.vars serta .wrangler,
jalankan npm ci, npm run db:migrate:local, lalu npm run dev.
Untuk server instansi gunakan npm run db:migrate:remote lalu npm run deploy.
Migrasi baru adalah 0006_visit_purpose_and_reception.sql. Data kunjungan lama
tetap tersimpan. Lakukan satu kunjungan uji untuk memastikan nomor penerima dan
pengalihan sesuai petugas yang ditetapkan dinas.
