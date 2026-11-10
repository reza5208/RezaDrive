# RezaDrive

Buku perjalanan Lalamove untuk Reza dan Nissan Grand Livina 1.8.

**App:** https://reza5208.github.io/RezaDrive/

## Status

- GitHub Pages menggunakan aplikasi statik React + Vite.
- Mod device boleh digunakan tanpa akaun. Rekod disimpan dalam browser pada device tersebut, bukan di GitHub.
- Sambungan Google login dan Firebase Realtime Database telah ditulis tetapi **belum diaktifkan**: `public/cloud-config.json` sengaja mempunyai `enabled: false` sehingga projek Firebase dan peraturan keselamatannya disediakan.
- Kod sumber repo adalah awam. Tiada rekod kerja pengguna, lokasi, kata laluan atau token dimasukkan ke repo.
- Versi hosting lama mempunyai backend yang berbeza; rekodnya tidak dipindahkan secara automatik.

## Cara guna

1. Pilih **Guna pada device ini**.
2. Mula sesi dan isi odometer mula.
3. Tambah setiap job. Untuk Cash/QR, isi bayaran kasar dan jumlah potongan komisen + SST. Untuk Wallet, isi angka Earnings yang sudah bersih.
4. Tip tambahan boleh diterima melalui cara berbeza daripada upah. Jangan tambah semula tip atau priority fee yang sudah termasuk dalam Earnings.
5. Tekan **Guna lokasi sekarang** di pickup/drop-off; lokasi tidak dijejak berterusan. Alamat boleh ditaip sendiri.
6. Butang **Tol** / **Makan** membuka amaun terus, dengan pilihan amaun cepat. Parking dan belanja lain turut tersedia. Bayaran balik pelanggan mengurangkan kos belanja itu.
7. Tamat sesi dengan odometer akhir.
8. Rekod isi minyak pada bila-bila masa: bayaran, odometer, liter dan pilihan tangki penuh.
9. Semak sejarah, laporan bulanan, hasil sejam/per km dan lejar wallet. Eksport CSV / salinan JSON melalui Tetapan.

## Kiraan

- Baki utama = upah bersih + tip − belanja selepas bayaran balik, **sebelum minyak**.
- Bayaran isi petrol tidak ditolak habis daripada satu sesi kerana Livina juga digunakan untuk keluarga.
- Anggaran penggunaan memerlukan dua rekod penuh-ke-penuh dan liter bagi semua isian di antaranya. Semua isian mesti direkod.
- Kos petrol anggaran mengikut jarak dipaparkan untuk sesi selesai apabila data mencukupi. Servis, tayar dan susut nilai belum ditolak.
- Topup dan pengeluaran wallet ialah pindahan, bukan pendapatan atau kos. Lejar wallet ialah rekod sendiri, bukan baki langsung Lalamove.

## Simpanan dan offline

Mod device menggunakan localStorage dengan awalan `rezadrive-v1-`. Jangan padam data browser atau gunakan Incognito untuk rekod penting; eksport salinan berkala. Selepas app pernah dibuka dan aset dimuatkan sepenuhnya, service worker menyediakan shell offline. Google/cloud memerlukan konfigurasi dan sambungan internet.

Data mod device tidak dimuat naik atau dipindah ke akaun Google secara automatik apabila login diaktifkan. Kekalkan eksport tempatan dan rancang import yang disemak sebelum cutover. Mod demo berasingan daripada rekod sebenar.

## Aktifkan Google dan sync

Lihat [docs/firebase-setup.md](docs/firebase-setup.md). Jangan gunakan peraturan terbuka `.read: true` / `.write: true`. Tiada peraturan atau konfigurasi Firebase RezaOT diubah oleh migrasi ini.

## Pembangunan

Node 24, React, Vite, Firebase Web SDK.

```sh
npm ci
npm test
npm run build
npm run dev
```

Base path ialah `/RezaDrive/`. GitHub Actions membina dan menerbitkan `dist/` pada setiap push ke main. App ini tidak bergantung pada endpoint `/api/records` atau login ChatGPT.

Ujian pengiraan kewangan dan petrol dijalankan secara setempat. Ujian Google login, peraturan RTDB pada emulator dan sync dua device belum dijalankan; jangan tandakan sync live sebelum ujian tersebut lulus.
