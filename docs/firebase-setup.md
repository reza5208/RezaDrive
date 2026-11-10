# Konfigurasi Google login dan sync RezaDrive

**Status semasa:** belum diaktifkan. Mod device boleh digunakan dahulu.

Gunakan projek Firebase khusus untuk RezaDrive supaya peraturan RezaOT tidak berubah. Pemilik projek perlu membuat langkah pentadbiran ini dalam Firebase Console atau CLI yang telah dibenarkan; akses GitHub tidak memberikan akses pentadbir Firebase.

1. Cipta/pilih projek Firebase khusus dan daftarkan Web App.
2. Aktifkan Authentication → Google sebagai Sign-in provider.
3. Tambah `reza5208.github.io` pada Authentication → Settings → Authorized domains (tanpa protokol atau `/RezaDrive/`).
4. Cipta Realtime Database dalam locked mode. Simpan databaseURL sebenar, termasuk rantau jika ada.
5. Semak dan deploy `firebase/database.rules.json` ke database projek khusus tersebut. Fail ini ialah ruleset penuh untuk projek baru, **bukan pengganti terus untuk database RezaOT**. Jangan tampal ke database lain yang mempunyai aplikasi atau rules sedia ada.
6. Uji rules: pengguna A hanya boleh baca/tulis UID sendiri; pengguna B, pengguna tanpa login, dan root requests mesti ditolak; jenis rekod/nombor versi yang tidak sah mesti ditolak.
7. Salin public Web App config ke `public/cloud-config.json`, contohnya struktur di `public/cloud-config.example.json`. Jangan letak service-account JSON, private key, kata laluan atau refresh token dalam repo.
8. Tukar `enabled` kepada true selepas rules telah disahkan, kemudian commit. GitHub Actions membina semula app.
9. Buka app dalam Chrome, login Google, tambah satu rekod ujian, dan pastikan lencana **Disimpan di awan**. Buka akaun sama pada device kedua dan semak rekod sama. Uji suntingan serentak dan offline sebelum menggunakan rekod sebenar.

Data cloud berada di `rezadrive/users/<Firebase UID>/records/<UUID>`. Transaksi membandingkan versi rekod untuk mengesan suntingan bercanggah dan menyimpan tombstone untuk padaman. Top-level transaction pada rekod pemilik mengekalkan sesi aktif tunggal dalam operasi client yang sah. Rules menguatkuasakan pemilikan dan bentuk sampul rekod; payload JSON adalah milik pengguna sendiri, bukan input berautoriti untuk tindakan pentadbir.

Kiraan dan cache device tidak mengandungi kata laluan. Firebase SDK mengurus sesi Google. Cache device tidak disulitkan; sesi browser yang boleh diakses mempunyai akses kepada rekod setempat.
