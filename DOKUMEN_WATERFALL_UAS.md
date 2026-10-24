# LAPORAN TUGAS UAS REKAYASA PERANGKAT LUNAK / ANALISIS & PERANCANGAN SISTEM

## JUDUL PROYEK:
**Rancang Bangun Sistem Informasi Enterprise Resource Planning (ERP) Toko Bangunan & Grosir Material "BuildPro ERP" Berbasis Web Menggunakan Metode Waterfall**

---

### KATA PENGANTAR & RINGKASAN EKSEKUTIF
Sistem Informasi ini dikembangkan untuk mengintegrasikan proses bisnis inti pada toko grosir dan eceran bahan bangunan yang mencakup pengelolaan persediaan (inventory), transaksi penjualan (POS kasir dan faktur tempo/kredit), pengadaan barang dari supplier (Purchase Order), serta pencatatan arus kas keuangan dan pemantauan laba rugi secara real-time.

Metode pengembangan yang digunakan adalah **Metode Waterfall (Classic Life Cycle)**, yang mengeksekusi tahapan secara sekuensial dan sistematis: *Requirement Analysis*, *System Design*, *Implementation*, *Testing*, dan *Deployment/Maintenance*.

---

## BAB I: ANALISIS KEBUTUHAN SISTEM (REQUIREMENTS ANALYSIS)

### 1.1 Latar Belakang & Masalah Bisnis
Toko bahan bangunan memiliki tantangan operasional yang unik:
1. **Kompleksitas Satuan & Stok Fisik:** Barang material memiliki beragam satuan (sak semen, batang besi, kubik/truk pasir, dus keramik, pail cat) yang rentan mengalami selisih stok jika tidak dicatat dengan kartu stok.
2. **Karakteristik Pembayaran Tempo:** Banyak kontraktor atau pelanggan borongan yang membeli material dengan sistem kredit/tempo (piutang), sementara toko juga memiliki kewajiban hutang dagang ke pabrik semen/baja.
3. **Pencatatan Keuangan Terpisah:** Sering kali kasir mencatat penjualan tanpa langsung memperhitungkan Harga Pokok Penjualan (HPP) dan saldo kas riil, sehingga laba bersih tidak dapat diketahui secara akurat.

### 1.2 Ruang Lingkup Sistem (Scope)
Sistem mencakup 4 pilar utama konsep ERP:
- **Modul Inventory Material:** Master barang, alert stok minimum (safety stock), stock opname fisik, dan buku kartu mutasi stok (in/out).
- **Modul Transaksi Kasir POS & Penjualan:** Penjualan langsung tunai dan penjualan tempo (kredit) dengan pencatatan jatuh tempo dan cetak faktur resmi.
- **Modul Transaksi Pembelian Supplier (PO):** Pencatatan penerimaan barang restock dari supplier yang otomatis menaikkan stok fisik dan mencatat hutang/kas keluar.
- **Modul Akuntansi & Keuangan:** Buku kas umum (debet/kredit), monitoring piutang pelanggan (AR), monitoring hutang supplier (AP), serta Laporan Laba Rugi resmi (Income Statement).

### 1.3 Analisis Kebutuhan Fungsional (Functional Requirements)
| Kode FR | Nama Kebutuhan Fungsional | Deskripsi |
|---|---|---|
| **FR-01** | Manajemen Master Barang | Sistem dapat menambah, mengedit, dan melihat daftar material lengkap dengan kode SKU, kategori, satuan, harga beli modal, harga jual, dan batas stok minimum. |
| **FR-02** | Alert Stok Kritis | Sistem otomatis mendeteksi dan menampilkan banner peringatan jika jumlah stok fisik berada di bawah batas minimum (`stock <= min_stock`). |
| **FR-03** | Stock Opname & Kartu Stok | Sistem mencatat penyesuaian fisik barang dan merekam riwayat mutasi stok secara kronologis (tipe IN, OUT, ADJUST) beserta referensi faktur. |
| **FR-04** | Transaksi Kasir POS (Penjualan) | Sistem menyediakan antarmuka kasir cepat dengan filter kategori barang, kalkulasi diskon, pembayaran tunai (dengan kembalian), dan pembayaran tempo/kredit. |
| **FR-05** | Integrasi Pemotongan Stok | Ketika penjualan berhasil diproses, stok barang otomatis terpotong tanpa jeda dan pergerakan dicatat ke kartu stok. |
| **FR-06** | Pengadaan & Pembelian (PO) | Sistem mencatat penerimaan barang dari supplier, otomatis menambah stok gudang, dan mengupdate harga modal pembelian terakhir. |
| **FR-07** | Buku Kas Real-time | Sistem merekam setiap aliran kas masuk (penjualan tunai, pelunasan piutang) dan kas keluar (pembelian tunai, bayar hutang, biaya operasional armada). |
| **FR-08** | Manajemen Piutang & Hutang | Sistem mencatat jatuh tempo piutang kontraktor dan hutang distributor, serta mendukung pembayaran cicilan bertahap. |
| **FR-09** | Laporan Laba Rugi Otomatis | Sistem menghitung Laba Kotor (Penjualan - HPP) dan Laba Bersih setelah dikurangi beban biaya operasional. |
| **FR-10** | Cetak Dokumen Faktur | Sistem dapat menghasilkan cetakan faktur penjualan resmi toko dan laporan keuangan yang siap dicetak fisik. |

### 1.4 Aktor Sistem
1. **Kasir Toko:** Mengoperasikan POS penjualan, melayani transaksi tunai/tempo, dan mencetak nota faktur.
2. **Petugas Gudang / Logistik:** Mengelola stok fisik, melakukan stock opname, dan menginput penerimaan barang restock PO supplier.
3. **Bagian Keuangan (Finance):** Mencatat pelunasan piutang pelanggan, pembayaran hutang supplier, dan beban operasional toko.
4. **Pemilik / Direktur (Owner):** Memantau dashboard performa bisnis, nilai aset barang, arus kas, dan laporan laba rugi.

---

## BAB II: PERANCANGAN SISTEM (SYSTEM DESIGN)

### 2.1 Use Case Diagram (Deskripsi Interaksi Aktor)
- **Aktor Kasir:** `Melakukan Penjualan POS` --> `Mencetak Faktur Penjualan` --> `Melihat Katalog Material`.
- **Aktor Petugas Gudang:** `Melakukan Stock Opname` --> `Melihat Kartu Stok` --> `Menginput PO Restock Supplier` --> `Memantau Alert Stok Kritis`.
- **Aktor Keuangan:** `Mencatat Pelunasan Piutang (AR)` --> `Membayar Hutang Supplier (AP)` --> `Mengisi Buku Kas / Biaya Operasional`.
- **Aktor Pemilik:** `Melihat Dashboard Eksekutif KPI` --> `Melihat Laporan Laba Rugi` --> `Evaluasi Nilai Aset Stok`.

### 2.2 Entity Relationship Diagram (ERD) & Struktur Database
Sistem menggunakan 8 entitas utama yang saling berelasi:
```
[CATEGORIES] 1 ----- * [PRODUCTS] * ----- 1 [SUPPLIERS]
                            | 1                   | 1
                            |                     |
                            | *                   | *
                     [STOCK_MOVEMENTS]      [PURCHASES] 1 ----- * [PURCHASE_ITEMS]
                            |                     | 1
                            |                     |
                            |                     | 1
                            | *                   v 1
                      [SALE_ITEMS] * --- 1 [PAYABLES (AP)]
                            |
                            | 1
                            v
                         [SALES] 1 ------------- 1 [RECEIVABLES (AR)]
                            | 1
                            |
                            v *
                  [CASH_TRANSACTIONS (Buku Kas)]
```

#### Spesifikasi Tabel Utama:
1. **`products`:** `id` (PK), `code` (SKU), `name`, `category_id`, `unit`, `purchase_price`, `selling_price`, `stock`, `min_stock`, `location`, `supplier_id`.
2. **`sales`:** `id` (PK), `invoice_number`, `date`, `customer_id`, `customer_name`, `payment_type`, `due_date`, `subtotal`, `discount`, `total`, `hpp_total`, `gross_profit`, `paid_amount`, `remaining_amount`, `status`.
3. **`purchases`:** `id` (PK), `po_number`, `date`, `supplier_id`, `supplier_name`, `payment_type`, `due_date`, `total`, `paid_amount`, `remaining_amount`, `status`.
4. **`stock_movements`:** `id` (PK), `date`, `product_id`, `product_name`, `type` (IN/OUT/ADJUST), `qty`, `current_stock`, `ref_type`, `ref_id`, `notes`.
5. **`cash_transactions`:** `id` (PK), `date`, `type` (IN/OUT), `category`, `amount`, `ref_id`, `description`, `balance_after`.
6. **`receivables`:** `id` (PK), `sale_id`, `invoice_number`, `customer_name`, `total_amount`, `paid_amount`, `remaining_amount`, `due_date`, `status`, `payment_history`.
7. **`payables`:** `id` (PK), `purchase_id`, `po_number`, `supplier_name`, `total_amount`, `paid_amount`, `remaining_amount`, `due_date`, `status`, `payment_history`.

---

## BAB III: IMPLEMENTASI SISTEM (SYSTEM IMPLEMENTATION)

### 3.1 Lingkungan Pengembangan & Teknologi
- **Bahasa Pemrograman:** JavaScript (Node.js runtime v24.x)
- **Web Server & Backend API:** Express.js RESTful API architecture
- **Antarmuka Pengguna (Frontend):** Semantic HTML5, Vanilla CSS Design System (Glassmorphic cards, enterprise typography Plus Jakarta Sans), dan Vanilla JavaScript Client Engine
- **Data Persistence:** File-based Atomic Transactional JSON Database Engine (`db.js`)
- **Port Komunikasi:** Port 3000 (`http://localhost:3000`)

### 3.2 Struktur Direktori Proyek
```
c:\Project UAS\
├── data\
│   └── db.json               # Basis data persisten (produk, transaksi, kas, hutang-piutang)
├── public\
│   ├── css\
│   │   └── style.css         # Enterprise CSS design system & layout kasir POS
│   ├── js\
│   │   └── app.js           # Client-side reactivity, chart rendering, API caller
│   └── index.html            # Antarmuka SPA lengkap dengan 8 modul ERP & tab dokumentasi
├── db.js                     # Handler database persisten & auto-seeding sample awal
├── server.js                 # Express server & API endpoints terpadu ERP
├── package.json              # Konfigurasi dependensi project
└── DOKUMEN_WATERFALL_UAS.md  # Dokumen laporan tugas UAS metode Waterfall
```

---

## BAB IV: PENGUJIAN SISTEM (TESTING - BLACK BOX TESTING)

Pengujian dilakukan menggunakan teknik **Black Box Testing** untuk memvalidasi kesesuaian input pengguna terhadap fungsionalitas sistem ERP:

| No | Test Case ID | Skenario Pengujian | Input Data Uji | Hasil yang Diharapkan (Ekspektasi) | Hasil Aktual | Kesimpulan |
|---|---|---|---|---|---|---|
| 1 | **TC-01** | Transaksi Penjualan Tunai di Kasir POS | Beli 15 Sak Semen Tiga Roda, Metode: Tunai, Uang: Rp 2.000.000 | Stok semen terpotong 15, kas toko bertambah Rp 1.080.000, kembalian Rp 920.000 dihitung tepat, invoice tercetak | Stok produk terpotong real-time, uang masuk kas tercatat, kembalian akurat | **VALID / PASS** |
| 2 | **TC-02** | Transaksi Penjualan Kredit / Tempo | Pelanggan: CV Mandiri Karya, Metode: Tempo, DP: Rp 3.000.000, Jatuh Tempo: 30 hari | Stok terpotong, piutang baru (AR) terbentuk sebesar sisa tagihan, kas bertambah seharga DP | Data masuk ke tab Piutang Pelanggan dengan status 'Belum Lunas' | **VALID / PASS** |
| 3 | **TC-03** | Validasi Stok Kurang Saat Penjualan | Tambah item ke keranjang melebihi stok fisik yang ada | Sistem memblokir penambahan dan memunculkan toast notifikasi batas stok | Muncul toast warning: "Stok tidak mencukupi!", checkout dicegah | **VALID / PASS** |
| 4 | **TC-04** | Penerimaan Barang Restock Supplier (PO) | Restock 50 Batang Besi 10mm dari PT Baja Krakatau, Metode: Tunai | Stok gudang bertambah 50, kas keluar tercatat otomatis, kartu stok mutasi IN bertambah | Stok bertambah, saldo kas berkurang sesuai nilai PO | **VALID / PASS** |
| 5 | **TC-05** | Pelunasan Cicilan Piutang Pelanggan | Buka modal bayar piutang, input cicilan Rp 2.000.000 | Sisa piutang berkurang Rp 2.000.000, kas toko bertambah Rp 2.000.000 | Sisa piutang terupdate, mutasi kas masuk tercatat di jurnal | **VALID / PASS** |
| 6 | **TC-06** | Penyesuaian Fisik (Stock Opname) | Ubah stok Triplek dari 6 menjadi 8 lembar dengan catatan barang ketemu di sudut rak | Stok sistem berubah jadi 8, kartu stok mencatat tipe ADJUST_IN (+2) | Stok fisik terupdate dan mutasi opname tercatat di riwayat | **VALID / PASS** |
| 7 | **TC-07** | Perhitungan Laba Kotor & HPP | Penjualan total Rp 12.580.000, HPP total Rp 10.926.000 | Laba Kotor = Total Penjualan - HPP; Laba Bersih = Laba Kotor - Beban Operasional | Kalkulasi pada tab Laba Rugi sesuai dengan kaidah akuntansi | **VALID / PASS** |
| 8 | **TC-08** | Reset Database ke Data Demo Awal | Klik tombol 'Reset Data Demo' di sidebar | Database ter-reset ke konfigurasi awal bawaan tanpa merusak aplikasi | Data kembali ke default sample TB. Sinar Abadi | **VALID / PASS** |

---

## BAB V: KESIMPULAN & SARAN

### 5.1 Kesimpulan
1. Sistem Informasi ERP Toko Bangunan "BuildPro ERP" berhasil diimplementasikan secara terintegrasi antara modul Inventory, Transaksi (Sales & Purchase), dan Keuangan.
2. Penerapan **Metode Waterfall** terbukti efektif dalam memandu proses pengembangan mulai dari pendefinisian kebutuhan yang baku, pemodelan data relasional, pengkodean terstruktur, hingga pengujian *black-box*.
3. Sifat integrasi real-time ERP memastikan bahwa setiap transaksi kasir atau pengadaan barang langsung memperbarui persediaan fisik dan buku kas keuangan tanpa perlu sinkronisasi manual.

### 5.2 Saran Pengembangan Lanjutan
1. Penambahan fitur barcode scanner kamera berbasis WebRTC untuk pembacaan SKU secara instan di meja kasir.
2. Penambahan integrasi payment gateway (QRIS / Virtual Account) untuk pembayaran non-tunai langsung dari kontraktor.
