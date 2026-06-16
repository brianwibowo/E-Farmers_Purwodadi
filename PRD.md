# E-Farmers (FEB)

## Aplikasi Pencatatan Keuangan Pertanian Sederhana Berbasis Android

### Informasi Umum

**Nama Aplikasi:** E-Farmers

**Platform:** Android (APK) using Expo React Native

**Target Pengguna:** Petani dan Kelompok Tani

**Tema UI:** Hijau (identitas pertanian)

**Logo:** Logo Kelompok Tani

**Watermark/Footer:**

> Pengembang: Tim Pengabdian DPPM BIMA KEMDIKTISAINTEK UNNES 2026

---

# 1. Latar Belakang

Berdasarkan hasil wawancara dengan kelompok tani, ditemukan bahwa petani sering mengalami kesulitan dalam mengetahui jumlah biaya yang telah dikeluarkan selama proses budidaya.

Pencatatan pengeluaran masih dilakukan secara manual atau bahkan tidak dicatat sama sekali, sehingga ketika panen petani sering tidak mengetahui:

* Total modal yang telah dikeluarkan.
* Biaya produksi yang sebenarnya.
* Apakah usaha tani menghasilkan keuntungan atau kerugian.
* Perkiraan keuntungan sebelum panen berlangsung.

Aplikasi E-Farmers dirancang sebagai buku kas digital sederhana yang membantu petani mencatat pengeluaran dan menghitung estimasi keuntungan usaha tani secara mudah.

---

# 2. Tujuan Aplikasi

Membantu petani untuk:

1. Mencatat seluruh pengeluaran usaha tani.
2. Mengetahui total modal yang telah dikeluarkan.
3. Menghitung estimasi pendapatan panen.
4. Menghitung estimasi untung atau rugi.
5. Mengetahui persentase keuntungan usaha tani.

---

# 3. Ruang Lingkup Sistem

Aplikasi hanya berfokus pada pencatatan keuangan pertanian dasar.

Aplikasi tidak mencakup:

* Prediksi harga pasar otomatis.
* Machine Learning atau AI.
* Manajemen stok gudang.
* Marketplace hasil panen.
* Sistem akuntansi lengkap.
* Multi-user kompleks.
* Integrasi IoT pertanian.

---

# 4. Fitur Utama

## 4.1 Beranda

Beranda menampilkan ringkasan kondisi keuangan usaha tani.

### Informasi yang Ditampilkan

* Total Pengeluaran
* Estimasi Pendapatan
* Estimasi Untung/Rugi
* Persentase Keuntungan

### Contoh Tampilan

```text
Total Pengeluaran
Rp 12.500.000

Estimasi Pendapatan
Rp 18.000.000

Estimasi Keuntungan
Rp 5.500.000

```

---

## 4.2 Catatan Pengeluaran

Fitur untuk mencatat seluruh biaya yang dikeluarkan selama proses budidaya.

### Data yang Dicatat

* Tanggal
* Nama Pengeluaran
* Kategori
* Nominal

### Contoh Data

| Tanggal    | Nama Pengeluaran | Kategori  | Nominal     |
| ---------- | ---------------- | --------- | ----------- |
| 12/02/2026 | Pupuk NPK        | Pupuk     | Rp500.000   |
| 15/02/2026 | Pestisida        | Pestisida | Rp250.000   |
| 18/02/2026 | Sewa Traktor     | Sewa      | Rp1.000.000 |

### Operasi CRUD

* Tambah Data
* Lihat Data
* Edit Data
* Hapus Data

---

## 4.3 Perhitungan Panen

Digunakan untuk menghitung estimasi pendapatan dan keuntungan berdasarkan hasil panen yang diperkirakan.

### Input

* Estimasi Hasil Panen (Kg)
* Harga Jual per Kg

### Output

* Estimasi Pendapatan
* Estimasi Untung/Rugi
* Persentase Keuntungan

### Contoh

Input:

```text
Estimasi Hasil Panen = 1000 Kg

Harga Jual = Rp40.000/Kg
```

Hasil:

```text
Pendapatan = Rp40.000.000

Pengeluaran = Rp25.000.000

Keuntungan = Rp15.000.000
```

---

# 5. Perhitungan Sistem

## Total Pengeluaran

```text
Total Pengeluaran =
Jumlah seluruh biaya yang tercatat
```

---

## Estimasi Pendapatan

```text
Estimasi Pendapatan =
Estimasi Hasil Panen × Harga Jual
```

---

## Untung/Rugi

```text
Untung/Rugi =
Estimasi Pendapatan − Total Pengeluaran
```

---

## Persentase Keuntungan

```text
Persentase Keuntungan =
(Keuntungan / Total Pengeluaran) × 100%
```

---

# 6. Struktur Menu

Untuk memudahkan penggunaan oleh petani, aplikasi hanya memiliki dua menu utama.

## Menu 1 — Beranda

Berisi:

* Ringkasan Keuangan
* Estimasi Pendapatan
* Estimasi Untung/Rugi
* Persentase Keuntungan

---

## Menu 2 — Catatan

Berisi:

* Daftar Pengeluaran
* Tambah Pengeluaran
* Edit Pengeluaran
* Hapus Pengeluaran

---

# 7. Desain Antarmuka

## Prinsip Desain

* Sederhana
* Mudah dipahami
* Font besar
* Tombol besar
* Sedikit menu
* Ramah untuk pengguna usia lanjut

## Warna

Warna utama:

* Hijau

Warna pendukung:

* Putih
* Abu-abu muda

---

# 8. Teknologi yang Digunakan

## Frontend Mobile

* React Native
* Expo

## Backend API

* Node.js (Express) atau Laravel API

## Database

* MySQL

## Format Distribusi

* Android APK

---

# 9. Struktur Database

## Tabel: pengeluaran

| Field            | Tipe Data     |
| ---------------- | ------------- |
| id               | BIGINT        |
| tanggal          | DATE          |
| nama_pengeluaran | VARCHAR(255)  |
| kategori         | VARCHAR(100)  |
| nominal          | DECIMAL(15,2) |
| created_at       | TIMESTAMP     |
| updated_at       | TIMESTAMP     |

---

## Tabel: panen

| Field             | Tipe Data     |
| ----------------- | ------------- |
| id                | BIGINT        |
| estimasi_hasil_kg | DECIMAL(10,2) |
| harga_jual_per_kg | DECIMAL(15,2) |
| created_at        | TIMESTAMP     |
| updated_at        | TIMESTAMP     |

---

# 10. Alur Penggunaan

### Langkah 1

Petani mencatat seluruh pengeluaran selama masa tanam.

### Langkah 2

Sistem menghitung total pengeluaran secara otomatis.

### Langkah 3

Petani memasukkan estimasi hasil panen dan harga jual.

### Langkah 4

Sistem menghitung estimasi pendapatan.

### Langkah 5

Sistem menampilkan:

* Total Pengeluaran
* Estimasi Pendapatan
* Estimasi Untung/Rugi
* Persentase Keuntungan

---

# 11. Manfaat Aplikasi

Bagi petani:

* Mengetahui modal yang sudah dikeluarkan.
* Membantu mengontrol pengeluaran agar tidak overbudget.
* Membantu mengambil keputusan sebelum panen.
* Mengetahui estimasi keuntungan usaha tani.
* Mengurangi pencatatan manual di buku.

Bagi kelompok tani:

* Memudahkan pendampingan usaha tani.
* Membantu evaluasi biaya produksi.
* Menjadi dokumentasi kegiatan budidaya yang lebih tertata.
