# Deskripsi Lengkap Aplikasi: WicakTani

Aplikasi **WicakTani** adalah platform pencatatan keuangan (*financial book-keeping*) dan kalkulator estimasi keuntungan panen tanaman yang dirancang dengan pendekatan *Offline-First* (lokal penuh). Aplikasi ini dikembangkan untuk memudahkan para petani dalam melacak modal awal, memantau pengeluaran operasional secara real-time, mendistribusikan anggaran berdasarkan lahan tanam, serta memproyeksikan laba bersih panen.

Berikut adalah rincian fitur dan cara kerja aplikasi yang dibagi menjadi tiga bagian utama:

---

## 1. Authentication (Autentikasi & Keamanan Lokal)

Meskipun berjalan sepenuhnya secara luring (*offline*), aplikasi WicakTani mengimplementasikan sistem manajemen sesi pengguna berbasis lokal menggunakan `AsyncStorage` untuk menjaga privasi pembukuan antar-petani yang menggunakan perangkat yang sama.

### Fitur di dalam Autentikasi:
*   **Registrasi Akun Baru (`RegisterScreen.js`)**:
    *   Pengguna mendaftarkan akun baru dengan memasukkan *Username*, *Nomor HP*, dan *Password*.
    *   **Validasi**: Memverifikasi keunikan *Username* dan *Nomor HP* (tidak boleh duplikat dengan akun yang sudah ada di database lokal) serta memvalidasi pengisian formulir.
*   **Masuk Sesi (`LoginScreen.js`)**:
    *   Pengguna dapat masuk menggunakan *Username* atau *Nomor HP* yang terdaftar beserta *Password*.
    *   **Sesi Masuk**: Setelah berhasil diautentikasi, informasi sesi pengguna disimpan di bawah kunci `@efarmers:session` sehingga pengguna tidak perlu berulang kali login setiap membuka aplikasi.
*   **Lupa Password (`LupaPasswordScreen.js`)**:
    *   Fitur pemulihan kata sandi lokal mandiri. Pengguna cukup memasukkan *Username* atau *Nomor HP* terdaftar, kemudian memasukkan password baru untuk langsung memperbarui kata sandi secara instan.

---

## 2. Beranda (Dashboard Utama & Detail Tanaman)

Halaman Beranda adalah pusat kendali operasional petani yang menyajikan ringkasan siklus hidup pertanian secara modular dan visual.

### Fitur di dalam Beranda:
*   **Dashboard Finansial & Grafik**:
    *   **Tanaman Aktif**: Kartu geser horizontal (*horizontal slider*) yang menampilkan komoditas yang sedang ditanam beserta akumulasi biaya pengeluaran berjalan masing-masing tanaman.
    *   **Tren Pengeluaran**: Grafik interaktif bulanan yang meringkas arus pengeluaran untuk memantau bulan-bulan dengan pengeluaran tertinggi.
    *   **Widget Ringkasan**: Menampilkan estimasi laba kotor, total pengeluaran berjalan, dan laba bersih dari siklus yang terisi estimasi.
*   **Detail Halaman Tanaman & Analisis (`BerandaScreen.js` - Sub-page)**:
    *   Membuka detail tanaman akan menyembunyikan navigasi utama dan memunculkan bottom tab bar kustom khusus tanaman.
    *   **Tab 1: Analisis & Panen**:
        *   **Kalkulator Panen**: Input estimasi hasil panen (Kg) dan harga jual (Rp/Kg) untuk memproyeksikan pendapatan kotor secara langsung.
        *   **Analisis Proyeksi**: Menyajikan visualisasi skor margin keuntungan berbentuk lingkaran progresif (SVG) beserta narasi evaluasi keuangan (misal: "Keuntungan Sangat Baik", "Kerugian Terdeteksi", dll.).
        *   **Total Pengeluaran Terkunci**: Menampilkan total pengeluaran operasional berjalan yang terkunci secara otomatis (diambil dari catatan transaksi ril) dengan tombol ikon informasi interaktif.
    *   **Tab 2: Detail Pengeluaran**:
        *   Menampilkan seluruh daftar transaksi pengeluaran khusus untuk tanaman terpilih dalam sel kartu 3-kolom yang rapi (Ikon Kategori, Rincian & Tanggal, Nominal & Aksi Edit/Hapus).
*   **Pengaturan & Profil (Menu Settings - Sub-page)**:
    *   **Update Profil**: Pengguna dapat mengubah foto profil, username, nomor HP, dan memperbarui kata sandi.
    *   **Penyimpanan Gambar Profil Aman**: Foto profil yang diambil melalui kamera atau galeri secara otomatis disalin ke folder penyimpanan lokal permanen (`FileSystem.documentDirectory`) agar tidak hilang saat cache didelete oleh sistem operasi.
    *   **Pengingat Keuangan Tani (Notifikasi)**: Menjadwalkan pengingat notifikasi lokal (*local push notifications*) secara harian (pukul 19:00), 3 kali seminggu, atau mingguan untuk mengingatkan petani mencatat pembukuan keuangan mereka.
    *   **Ekspor & Impor Data (Backup & Restore)**: Mengekspor seluruh pembukuan transaksi dan siklus tanaman ke dalam bentuk file `.json` mentah, atau memulihkan data dari file `.json` lama untuk migrasi perangkat tanpa internet.
    *   **Danger Zone**: Opsi untuk menghapus seluruh database pembukuan secara permanen dari penyimpanan perangkat.

---

## 3. Catatan (Buku Kas & Riwayat Transaksi)

Halaman Catatan bertindak sebagai buku kas umum yang mencatat secara detail seluruh riwayat transaksi pengeluaran operasional pertanian.

### Fitur di dalam Catatan:
*   **Pencatatan Buku Kas (`CatatanScreen.js`)**:
    *   **Daftar Terkelompok per Tanggal**: Seluruh transaksi pengeluaran diurutkan berdasarkan tanggal terbaru dan dikelompokkan dalam sekat tanggal yang memiliki fungsionalitas ekspansi (*accordion* lipat/buka).
    *   **Filter Pencarian**: Mempermudah pencarian item transaksi dengan mengetikkan nama pengeluaran di kolom pencarian.
    *   **Filter Lanjutan**: Memfilter transaksi berdasarkan bulan & tahun berjalan, kategori pengeluaran (Pupuk, Bibit, Pestisida, Tenaga Kerja, dll.), serta berdasarkan siklus tanaman spesifik.
    *   **Preservasi Filter**: Status filter tetap tersimpan di dalam memori cache global meskipun pengguna berpindah ke halaman edit atau layar lain, mencegah reset otomatis kembali ke bulan default.
*   **Tambah & Edit Transaksi (`TambahCatatanScreen.js` & `EditCatatanScreen.js`)**:
    *   **Input Multi-Item**: Pengguna dapat mencatat banyak jenis pengeluaran sekaligus dalam satu nota pengisian dengan menekan tombol "Tambah Baris Pengeluaran".
    *   **Alokasi Siklus Tanaman**: Setiap baris pengeluaran dapat didelegasikan ke siklus tanaman aktif yang berbeda-beda.
    *   **Pembuatan Lahan Inline**: Pengguna dapat langsung membuat siklus tanaman baru beserta lokasi lahannya secara langsung dari dalam form pengeluaran jika siklus tanaman belum terdaftar di dashboard.
