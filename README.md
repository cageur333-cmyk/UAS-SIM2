# BuildPro ERP - Sistem Informasi Toko Bangunan & Grosir Material

> **Aplikasi Web-Base Terintegrasi ERP Menggunakan Metode Waterfall SDLC**  
> Dibuat untuk memenuhi Tugas Ujian Akhir Semester (UAS) mata kuliah **Rekayasa Perangkat Lunak / Analisis & Perancangan Sistem Informasi**.

---

## 🌟 Fitur Utama Aplikasi

### 1. Dashboard Eksekutif
- **Stat Cards Real-time:** Nilai Aset Stok Gudang, Omset Penjualan Hari Ini, Saldo Kas Riil, Total Piutang Kontraktor, dan Laba Bersih.
- **Alert Stok Kritis:** Notifikasi otomatis ketika stok material berada di bawah batas safety stock.
- **Grafik Tren Penjualan:** Visualisasi grafik batang omset transaksi penjualan terkini.

### 2. Modul Inventory (Persediaan Barang)
- Katalog material multi-satuan: Sak (Semen), Batang (Besi beton SNI, Pipa PVC), Dus (Keramik Roman), Truk/Pick-up (Pasir Merapi, Batu split), Pail/Kaleng (Cat Dulux, Nippon Paint), Lembar (Triplek).
- Filter kategori & pencarian live search berdasarkan nama atau kode SKU.
- **Stock Opname Fisik:** Penyesuaian stok riil gudang dengan pencatatan selisih otomatis.
- **Kartu Stok (Stock Card Movement):** Buku mutasi riwayat keluar-masuk barang secara kronologis (IN, OUT, ADJUST) lengkap dengan nomor referensi faktur.

### 3. Modul Kasir POS (Penjualan / Sales)
- Dual-column POS interface: Katalog material di kiri & keranjang belanja kasir di kanan.
- Pilihan tipe pembayaran:
  - **Tunai:** Otomatis menghitung kembalian uang dan menambah kas toko.
  - **Tempo / Kredit:** Untuk kontraktor/toko mitra dengan pencatatan uang muka (DP), sisa tagihan, dan tanggal jatuh tempo piutang (AR).
- **Cetak Faktur Penjualan:** Popup nota resmi toko bangunan lengkap dengan nomor invoice, rincian barang, tanggal jatuh tempo, dan tanda tangan penerima/kasir.
- **ERP Integration:** Transaksi langsung memotong stok di gudang dan mengupdate buku kas.

### 4. Modul Pembelian (Restock PO Supplier)
- Form Purchase Order (PO) ke pabrik/supplier (PT Semen Nusantara, PT Baja Krakatau, Depo Pasir, Distributor Cat).
- Penerimaan barang otomatis menaikkan stok fisik di gudang dan mencatat hutang dagang (AP) atau kas keluar.

### 5. Modul Akuntansi & Keuangan
- **Buku Kas & Jurnal Mutasi:** Pencatatan setiap rupiah arus kas masuk (*inflow*) dan kas keluar (*outflow*).
- **Pencatatan Biaya Operasional:** Input pengeluaran bensin solar armada truk, gaji kuli bongkar, listrik, dan pemeliharaan alat.
- **Manajemen Hutang & Piutang (AP & AR):** Daftar tagihan jatuh tempo dan modal pembayaran cicilan bertahap.
- **Laporan Laba Rugi Resmi (Income Statement):** Format akuntansi standar: Penjualan Bersih - Harga Pokok Penjualan (HPP) = Laba Kotor - Beban Operasional = Laba Bersih Usaha.

### 6. Dokumentasi Lengkap Metode Waterfall SDLC
- Halaman interaktif di aplikasi dan file dokumen [DOKUMEN_WATERFALL_UAS.md](file:///c:/Project%20UAS/DOKUMEN_WATERFALL_UAS.md) yang merangkum 5 fase Waterfall klasik:
  1. *Fase 1: Requirements Analysis* (Kebutuhan Fungsional FR-01 s/d FR-10 & Aktor)
  2. *Fase 2: System Design* (ERD 8 Entitas, DFD Level 0 Context Diagram, Use Case & Activity)
  3. *Fase 3: Implementation* (Arsitektur REST API & Vanilla CSS Design System)
  4. *Fase 4: Testing* (Tabel Black Box Testing dengan 8 skenario lulus uji)
  5. *Fase 5: Maintenance & Deployment*

---

## 🌐 Cara Mengakses Aplikasi (Bisa Dibuka Orang Lain)

### Pilihan 1: Link Publik Internet (Bisa dibuka dari HP/Laptop teman & dosen di mana saja):
Aplikasi saat ini telah dipublikasikan secara online melalui Cloudflare Tunnel:
👉 **https://prizes-avenue-fabrics-tension.trycloudflare.com**  
*(Siapa saja di internet bisa langsung membuka link ini tanpa perlu instal apa pun).*

### Pilihan 2: Akses Melalui Jaringan Wi-Fi / Hotspot yang Sama:
Jika dosen atau teman berada di satu ruangan/kelas yang sama dengan Wi-Fi/Hotspot yang sama:
👉 **http://10.71.204.219:3000**

### Menjalankan Server & Link Publik Sekaligus:
Cukup klik ganda (double-click) file:
👉 [`start_share.bat`](file:///c:/Project%20UAS/start_share.bat)

---

## 🚀 Cara Menjalankan Aplikasi Secara Manual
   ```bash
   cd "C:\Project UAS"
   ```

2. **Jalankan Server**:
   ```bash
   npm start
   ```
   *Atau:*
   ```bash
   node server.js
   ```

3. **Buka Browser**:
   Akses alamat berikut di browser:
   ```
   http://localhost:3000
   ```

4. **Fitur Reset Data Demo:**
   Jika sewaktu-waktu ingin mengembalikan seluruh data ke kondisi awal demonstrasi UAS, cukup klik tombol **"🔄 Reset Data Demo"** di bagian bawah sidebar.

---

## 📁 Struktur File Proyek
```
C:\Project UAS\
├── data\
│   └── db.json               # Database persisten (stok, transaksi, kas, hutang, piutang)
├── public\
│   ├── css\
│   │   └── style.css         # Enterprise Vanilla CSS Design System & layout POS
│   ├── js\
│   │   └── app.js           # Engine client-side JavaScript (SPA, REST API calls, modals)
│   └── index.html            # Antarmuka SPA lengkap dengan 8 modul ERP & tab UAS
├── db.js                     # Modul database JSON persisten & initial demo seed
├── server.js                 # Backend Express.js dengan RESTful API lengkap
├── package.json              # Dependensi npm (Express, Cors, Morgan)
├── DOKUMEN_WATERFALL_UAS.md  # Laporan lengkap 5 Fase Waterfall untuk diserahkan ke dosen
└── README.md                 # Panduan sistem
```
