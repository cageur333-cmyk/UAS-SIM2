const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { getDb, saveDb, resetDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// Helper for formatting ID and Numbers
function generateId(prefix) {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 900 + 100);
  return `${prefix}-${timestamp}${random}`;
}

function calculateCurrentCash(db) {
  let initialCash = 50000000; // Modal awal kas toko: 50 Juta
  return db.cash_transactions.reduce((acc, curr) => {
    return curr.type === 'IN' ? acc + Number(curr.amount) : acc - Number(curr.amount);
  }, initialCash);
}

// ================= API ROUTES ================= //

// 1. DASHBOARD METRICS
app.get('/api/dashboard', (req, res) => {
  try {
    const db = getDb();
    const today = new Date().toISOString().slice(0, 10);

    // Hitung total aset stok & stok kritis
    let totalStockAsset = 0;
    let criticalStockCount = 0;
    const criticalProducts = [];

    db.products.forEach(p => {
      const asset = Number(p.stock) * Number(p.purchase_price);
      totalStockAsset += asset;
      if (Number(p.stock) <= Number(p.min_stock)) {
        criticalStockCount++;
        criticalProducts.push({
          id: p.id,
          code: p.code,
          name: p.name,
          unit: p.unit,
          stock: p.stock,
          min_stock: p.min_stock
        });
      }
    });

    // Penjualan Hari Ini & Total
    let todaySales = 0;
    let totalSalesVolume = 0;
    let totalHpp = 0;

    db.sales.forEach(s => {
      totalSalesVolume += Number(s.total);
      totalHpp += Number(s.hpp_total || 0);
      const saleDate = new Date(s.date).toISOString().slice(0, 10);
      if (saleDate === today) {
        todaySales += Number(s.total);
      }
    });

    const grossProfit = totalSalesVolume - totalHpp;

    // Total Biaya Operasional
    const totalOperatingExpenses = (db.operating_expenses || []).reduce((acc, curr) => acc + Number(curr.amount), 0);
    const netProfit = grossProfit - totalOperatingExpenses;

    // Total Piutang (AR) & Hutang (AP)
    let totalReceivables = 0;
    db.receivables.forEach(r => {
      if (r.status !== 'Lunas') {
        totalReceivables += Number(r.remaining_amount);
      }
    });

    let totalPayables = 0;
    db.payables.forEach(p => {
      if (p.status !== 'Lunas') {
        totalPayables += Number(p.remaining_amount);
      }
    });

    // Saldo Kas Real-time
    const currentCashBalance = calculateCurrentCash(db);

    // Sales Trend (7 transaksi terakhir untuk mini-chart)
    const recentSales = db.sales.slice(-7).map(s => ({
      invoice: s.invoice_number,
      date: new Date(s.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
      total: s.total,
      customer: s.customer_name
    }));

    res.json({
      success: true,
      data: {
        store_info: db.store_info,
        totalStockAsset,
        criticalStockCount,
        criticalProducts,
        todaySales,
        totalSalesVolume,
        grossProfit,
        totalOperatingExpenses,
        netProfit,
        totalReceivables,
        totalPayables,
        currentCashBalance,
        recentSales,
        totalProductsCount: db.products.length,
        totalTransactionsCount: db.sales.length + db.purchases.length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. INVENTORY (Barang & Stok)
app.get('/api/inventory', (req, res) => {
  const db = getDb();
  const search = (req.query.search || '').toLowerCase();
  const category = req.query.category;
  const status = req.query.status; // 'all', 'low', 'safe'

  let list = db.products.map(p => {
    let stockStatus = 'Aman';
    let statusClass = 'success';
    if (p.stock <= 0) {
      stockStatus = 'Habis';
      statusClass = 'danger';
    } else if (p.stock <= p.min_stock) {
      stockStatus = 'Menipis';
      statusClass = 'warning';
    }
    return {
      ...p,
      stockStatus,
      statusClass,
      assetValue: p.stock * p.purchase_price
    };
  });

  if (search) {
    list = list.filter(p => p.name.toLowerCase().includes(search) || p.code.toLowerCase().includes(search));
  }
  if (category && category !== 'ALL') {
    list = list.filter(p => p.category_id === category);
  }
  if (status === 'low') {
    list = list.filter(p => p.stock <= p.min_stock);
  }

  res.json({
    success: true,
    data: list,
    categories: db.categories,
    suppliers: db.suppliers
  });
});

app.post('/api/inventory', (req, res) => {
  try {
    const db = getDb();
    const { code, name, category_id, unit, purchase_price, selling_price, stock, min_stock, location, supplier_id } = req.body;

    if (!code || !name || !unit || purchase_price === undefined || selling_price === undefined) {
      return res.status(400).json({ success: false, message: "Field kode, nama, satuan, harga beli, dan harga jual wajib diisi!" });
    }

    // Check duplicate code
    if (db.products.some(p => p.code.toLowerCase() === code.toLowerCase())) {
      return res.status(400).json({ success: false, message: `Kode barang "${code}" sudah terdaftar!` });
    }

    const cat = db.categories.find(c => c.id === category_id);

    const newProduct = {
      id: generateId('PRD'),
      code: code.toUpperCase().trim(),
      name: name.trim(),
      category_id: category_id || "CAT-1",
      category_name: cat ? cat.name : "Umum",
      unit: unit.trim(),
      purchase_price: Number(purchase_price),
      selling_price: Number(selling_price),
      stock: Number(stock || 0),
      min_stock: Number(min_stock || 10),
      location: location || "Gudang Utama",
      supplier_id: supplier_id || ""
    };

    db.products.push(newProduct);

    // Catat pergerakan awal jika ada stok
    if (newProduct.stock > 0) {
      db.stock_movements.push({
        id: generateId('SM'),
        date: new Date().toISOString(),
        product_id: newProduct.id,
        product_name: newProduct.name,
        type: 'IN',
        qty: newProduct.stock,
        current_stock: newProduct.stock,
        ref_type: 'INITIAL',
        ref_id: 'STOK-AWAL',
        notes: 'Pencatatan stok awal master barang'
      });
    }

    saveDb(db);
    res.json({ success: true, message: "Barang baru berhasil ditambahkan!", data: newProduct });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/inventory/:id', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const index = db.products.findIndex(p => p.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: "Barang tidak ditemukan!" });
    }

    const cat = db.categories.find(c => c.id === req.body.category_id);
    const existing = db.products[index];

    db.products[index] = {
      ...existing,
      code: req.body.code ? req.body.code.toUpperCase().trim() : existing.code,
      name: req.body.name ? req.body.name.trim() : existing.name,
      category_id: req.body.category_id || existing.category_id,
      category_name: cat ? cat.name : existing.category_name,
      unit: req.body.unit || existing.unit,
      purchase_price: Number(req.body.purchase_price ?? existing.purchase_price),
      selling_price: Number(req.body.selling_price ?? existing.selling_price),
      min_stock: Number(req.body.min_stock ?? existing.min_stock),
      location: req.body.location || existing.location,
      supplier_id: req.body.supplier_id || existing.supplier_id
    };

    saveDb(db);
    res.json({ success: true, message: "Data barang berhasil diperbarui!", data: db.products[index] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Stock Opname / Penyesuaian Stok
app.post('/api/inventory/:id/opname', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { actual_stock, notes } = req.body;

    const product = db.products.find(p => p.id === id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Barang tidak ditemukan!" });
    }

    const previousStock = product.stock;
    const newStock = Number(actual_stock);
    const difference = newStock - previousStock;

    product.stock = newStock;

    db.stock_movements.push({
      id: generateId('SM'),
      date: new Date().toISOString(),
      product_id: product.id,
      product_name: product.name,
      type: difference >= 0 ? 'ADJUST_IN' : 'ADJUST_OUT',
      qty: Math.abs(difference),
      current_stock: newStock,
      ref_type: 'OPNAME',
      ref_id: `OPNAME-${id}`,
      notes: notes || `Stock Opname (Sebelumnya: ${previousStock}, Fisik: ${newStock})`
    });

    saveDb(db);
    res.json({ success: true, message: "Penyesuaian stok opname berhasil disimpan!", product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Riwayat Kartu Stok
app.get('/api/inventory/movements', (req, res) => {
  const db = getDb();
  const productId = req.query.product_id;
  let movements = [...db.stock_movements].reverse();

  if (productId) {
    movements = movements.filter(m => m.product_id === productId);
  }

  res.json({ success: true, data: movements });
});

// 3. TRANSAKSI PENJUALAN (POS / SALES)
app.get('/api/sales', (req, res) => {
  const db = getDb();
  res.json({ success: true, data: [...db.sales].reverse() });
});

app.post('/api/sales', (req, res) => {
  try {
    const db = getDb();
    const { customer_id, customer_name, payment_type, due_date, discount, paid_amount, items, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: "Keranjang belanja masih kosong!" });
    }

    // Validasi ketersediaan stok produk
    for (const item of items) {
      const prod = db.products.find(p => p.id === item.product_id);
      if (!prod) {
        return res.status(400).json({ success: false, message: `Barang dengan ID ${item.product_id} tidak ditemukan!` });
      }
      if (prod.stock < item.qty) {
        return res.status(400).json({
          success: false,
          message: `Stok tidak cukup untuk "${prod.name}"! Stok tersedia: ${prod.stock} ${prod.unit}, Permintaan: ${item.qty} ${prod.unit}.`
        });
      }
    }

    // Kalkulasi subtotal, HPP, diskon, dan total
    let subtotal = 0;
    let hpp_total = 0;
    const finalItems = items.map(item => {
      const prod = db.products.find(p => p.id === item.product_id);
      const itemSubtotal = Number(item.qty) * Number(item.price);
      const itemHpp = Number(item.qty) * Number(prod.purchase_price);
      subtotal += itemSubtotal;
      hpp_total += itemHpp;

      return {
        product_id: prod.id,
        product_code: prod.code,
        product_name: prod.name,
        unit: prod.unit,
        price: Number(item.price),
        purchase_price: Number(prod.purchase_price),
        qty: Number(item.qty),
        subtotal: itemSubtotal
      };
    });

    const disc = Number(discount || 0);
    const grandTotal = Math.max(0, subtotal - disc);
    const gross_profit = grandTotal - hpp_total;

    const count = db.sales.length + 1;
    const invoice_number = `INV/${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(count).padStart(4, '0')}`;
    const saleId = generateId('INV');

    const paid = Number(paid_amount || 0);
    let remaining = 0;
    let status = 'Lunas';
    let change = 0;

    if (payment_type === 'Tempo/Kredit') {
      remaining = Math.max(0, grandTotal - paid);
      status = remaining === 0 ? 'Lunas' : 'Belum Lunas';
    } else {
      // Tunai
      if (paid < grandTotal) {
        return res.status(400).json({ success: false, message: `Pembayaran tunai kurang! Total: Rp ${grandTotal.toLocaleString('id-ID')}, Dibayar: Rp ${paid.toLocaleString('id-ID')}` });
      }
      change = paid - grandTotal;
      remaining = 0;
      status = 'Lunas';
    }

    const saleRecord = {
      id: saleId,
      invoice_number,
      date: new Date().toISOString(),
      customer_id: customer_id || "CUST-04",
      customer_name: customer_name || "Pelanggan Umum",
      payment_type: payment_type || "Tunai",
      due_date: payment_type === 'Tempo/Kredit' ? (due_date || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)) : null,
      subtotal,
      discount: disc,
      total: grandTotal,
      hpp_total,
      gross_profit,
      paid_amount: payment_type === 'Tunai' ? grandTotal : paid,
      change_amount: change,
      remaining_amount: remaining,
      status,
      items: finalItems,
      notes: notes || ""
    };

    // 1. Potong Stok & Buat Kartu Stok (ERP Inventory Link)
    finalItems.forEach(item => {
      const prod = db.products.find(p => p.id === item.product_id);
      prod.stock = Number(prod.stock) - Number(item.qty);

      db.stock_movements.push({
        id: generateId('SM'),
        date: new Date().toISOString(),
        product_id: prod.id,
        product_name: prod.name,
        type: 'OUT',
        qty: item.qty,
        current_stock: prod.stock,
        ref_type: 'SALE',
        ref_id: invoice_number,
        notes: `Penjualan ${invoice_number} ke ${saleRecord.customer_name}`
      });
    });

    // 2. Hubungkan ke Keuangan (ERP Finance Link)
    const currentBalance = calculateCurrentCash(db);

    if (payment_type === 'Tunai') {
      db.cash_transactions.push({
        id: generateId('CSH'),
        date: new Date().toISOString(),
        type: 'IN',
        category: 'Penjualan Tunai POS',
        amount: grandTotal,
        ref_id: invoice_number,
        description: `Penjualan tunai ${invoice_number} (${saleRecord.customer_name})`,
        balance_after: currentBalance + grandTotal
      });
    } else {
      // Tempo / Kredit: Buat Piutang
      const arId = generateId('AR');
      db.receivables.push({
        id: arId,
        sale_id: saleId,
        invoice_number,
        customer_id: saleRecord.customer_id,
        customer_name: saleRecord.customer_name,
        total_amount: grandTotal,
        paid_amount: paid,
        remaining_amount: remaining,
        due_date: saleRecord.due_date,
        status: status,
        payment_history: paid > 0 ? [{ date: new Date().toISOString(), amount: paid, note: "Uang Muka (DP) Penjualan" }] : []
      });

      // Catat DP jika ada
      if (paid > 0) {
        db.cash_transactions.push({
          id: generateId('CSH'),
          date: new Date().toISOString(),
          type: 'IN',
          category: 'Penjualan (DP Piutang)',
          amount: paid,
          ref_id: invoice_number,
          description: `Uang muka penjualan ${invoice_number} dari ${saleRecord.customer_name}`,
          balance_after: currentBalance + paid
        });
      }
    }

    db.sales.push(saleRecord);
    saveDb(db);

    res.json({
      success: true,
      message: "Transaksi penjualan berhasil disimpan dan stok terpotong otomatis!",
      data: saleRecord
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. TRANSAKSI PEMBELIAN / PO SUPPLIER
app.get('/api/purchases', (req, res) => {
  const db = getDb();
  res.json({ success: true, data: [...db.purchases].reverse() });
});

app.post('/api/purchases', (req, res) => {
  try {
    const db = getDb();
    const { supplier_id, payment_type, due_date, paid_amount, items, notes } = req.body;

    if (!supplier_id || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: "Supplier dan barang pembelian wajib diisi!" });
    }

    const supplier = db.suppliers.find(s => s.id === supplier_id);
    const supplier_name = supplier ? supplier.name : "Supplier Grosir";

    let total = 0;
    const finalItems = items.map(item => {
      const prod = db.products.find(p => p.id === item.product_id);
      const subtotal = Number(item.qty) * Number(item.purchase_price);
      total += subtotal;

      return {
        product_id: prod.id,
        product_code: prod.code,
        product_name: prod.name,
        unit: prod.unit,
        purchase_price: Number(item.purchase_price),
        qty: Number(item.qty),
        subtotal
      };
    });

    const count = db.purchases.length + 1;
    const po_number = `PO/${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(count).padStart(4, '0')}`;
    const purchaseId = generateId('PO');

    const paid = Number(paid_amount || 0);
    let remaining = 0;
    let status = 'Lunas';

    if (payment_type === 'Tempo') {
      remaining = Math.max(0, total - paid);
      status = remaining === 0 ? 'Lunas' : 'Belum Lunas';
    } else {
      status = 'Lunas';
      remaining = 0;
    }

    const purchaseRecord = {
      id: purchaseId,
      po_number,
      date: new Date().toISOString(),
      supplier_id,
      supplier_name,
      payment_type: payment_type || "Tunai",
      due_date: payment_type === 'Tempo' ? (due_date || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)) : null,
      total,
      paid_amount: payment_type === 'Tunai' ? total : paid,
      remaining_amount: remaining,
      status,
      items: finalItems,
      notes: notes || ""
    };

    // 1. Tambah Stok & Update Harga Beli Terkini (ERP Inventory Link)
    finalItems.forEach(item => {
      const prod = db.products.find(p => p.id === item.product_id);
      prod.stock = Number(prod.stock) + Number(item.qty);
      prod.purchase_price = item.purchase_price; // update HPP modal terakhir

      db.stock_movements.push({
        id: generateId('SM'),
        date: new Date().toISOString(),
        product_id: prod.id,
        product_name: prod.name,
        type: 'IN',
        qty: item.qty,
        current_stock: prod.stock,
        ref_type: 'PURCHASE',
        ref_id: po_number,
        notes: `Penerimaan restock PO ${po_number} dari ${supplier_name}`
      });
    });

    // 2. Hubungkan ke Keuangan / Kas & Hutang (ERP Finance Link)
    const currentBalance = calculateCurrentCash(db);

    if (payment_type === 'Tunai') {
      db.cash_transactions.push({
        id: generateId('CSH'),
        date: new Date().toISOString(),
        type: 'OUT',
        category: 'Pembelian Stok Barang',
        amount: total,
        ref_id: po_number,
        description: `Pembelian tunai material ${po_number} ke ${supplier_name}`,
        balance_after: currentBalance - total
      });
    } else {
      // Tempo: Buat Hutang Dagang (AP)
      db.payables.push({
        id: generateId('AP'),
        purchase_id: purchaseId,
        po_number,
        supplier_id,
        supplier_name,
        total_amount: total,
        paid_amount: paid,
        remaining_amount: remaining,
        due_date: purchaseRecord.due_date,
        status: status,
        payment_history: paid > 0 ? [{ date: new Date().toISOString(), amount: paid, note: "Uang Muka (DP) PO" }] : []
      });

      if (paid > 0) {
        db.cash_transactions.push({
          id: generateId('CSH'),
          date: new Date().toISOString(),
          type: 'OUT',
          category: 'Pembayaran Hutang / DP PO',
          amount: paid,
          ref_id: po_number,
          description: `Uang muka PO ${po_number} ke ${supplier_name}`,
          balance_after: currentBalance - paid
        });
      }
    }

    db.purchases.push(purchaseRecord);
    saveDb(db);

    res.json({
      success: true,
      message: "Penerimaan barang PO berhasil dicatat dan stok bertambah otomatis!",
      data: purchaseRecord
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. KEUANGAN - BUKU KAS, HUTANG & PIUTANG, LABA RUGI
app.get('/api/finance/cashflow', (req, res) => {
  const db = getDb();
  const currentBalance = calculateCurrentCash(db);
  res.json({
    success: true,
    currentBalance,
    data: [...db.cash_transactions].reverse()
  });
});

app.post('/api/finance/cashflow', (req, res) => {
  try {
    const db = getDb();
    const { type, category, amount, description } = req.body;

    if (!type || !amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: "Jenis arus kas dan nominal harus valid!" });
    }

    const currentBalance = calculateCurrentCash(db);
    const numAmount = Number(amount);
    const newBalance = type === 'IN' ? currentBalance + numAmount : currentBalance - numAmount;

    const cashEntry = {
      id: generateId('CSH'),
      date: new Date().toISOString(),
      type,
      category: category || (type === 'IN' ? 'Pendapatan Lain' : 'Biaya Operasional'),
      amount: numAmount,
      ref_id: 'MANUAL',
      description: description || 'Pencatatan kas manual',
      balance_after: newBalance
    };

    db.cash_transactions.push(cashEntry);

    if (type === 'OUT' && (category || '').includes('Operasional')) {
      db.operating_expenses.push({
        id: generateId('EXP'),
        date: new Date().toISOString(),
        category: category,
        amount: numAmount,
        description: description || ''
      });
    }

    saveDb(db);
    res.json({ success: true, message: "Transaksi kas berhasil dicatat!", data: cashEntry });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Piutang (AR) List & Pembayaran Cicilan
app.get('/api/finance/receivables', (req, res) => {
  const db = getDb();
  res.json({ success: true, data: db.receivables });
});

app.post('/api/finance/receivables/:id/pay', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { amount, note } = req.body;

    const rec = db.receivables.find(r => r.id === id);
    if (!rec) {
      return res.status(404).json({ success: false, message: "Data piutang tidak ditemukan!" });
    }

    const payAmount = Number(amount);
    if (payAmount <= 0 || payAmount > rec.remaining_amount) {
      return res.status(400).json({
        success: false,
        message: `Nominal tidak valid! Sisa piutang: Rp ${rec.remaining_amount.toLocaleString('id-ID')}`
      });
    }

    rec.paid_amount += payAmount;
    rec.remaining_amount -= payAmount;
    if (rec.remaining_amount <= 0) {
      rec.status = 'Lunas';
    }

    if (!rec.payment_history) rec.payment_history = [];
    rec.payment_history.push({
      date: new Date().toISOString(),
      amount: payAmount,
      note: note || "Pelunasan / Cicilan piutang"
    });

    // Update status di tabel sales
    const sale = db.sales.find(s => s.id === rec.sale_id || s.invoice_number === rec.invoice_number);
    if (sale) {
      sale.paid_amount += payAmount;
      sale.remaining_amount = rec.remaining_amount;
      sale.status = rec.status;
    }

    // Catat uang masuk kas
    const currentBalance = calculateCurrentCash(db);
    db.cash_transactions.push({
      id: generateId('CSH'),
      date: new Date().toISOString(),
      type: 'IN',
      category: 'Pelunasan Piutang Pelanggan',
      amount: payAmount,
      ref_id: rec.invoice_number,
      description: `Pelunasan piutang ${rec.invoice_number} (${rec.customer_name})`,
      balance_after: currentBalance + payAmount
    });

    saveDb(db);
    res.json({ success: true, message: "Pembayaran piutang berhasil dicatat ke kas!", data: rec });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Hutang (AP) List & Pembayaran Cicilan
app.get('/api/finance/payables', (req, res) => {
  const db = getDb();
  res.json({ success: true, data: db.payables });
});

app.post('/api/finance/payables/:id/pay', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { amount, note } = req.body;

    const pay = db.payables.find(p => p.id === id);
    if (!pay) {
      return res.status(404).json({ success: false, message: "Data hutang tidak ditemukan!" });
    }

    const payAmount = Number(amount);
    if (payAmount <= 0 || payAmount > pay.remaining_amount) {
      return res.status(400).json({
        success: false,
        message: `Nominal tidak valid! Sisa hutang: Rp ${pay.remaining_amount.toLocaleString('id-ID')}`
      });
    }

    pay.paid_amount += payAmount;
    pay.remaining_amount -= payAmount;
    if (pay.remaining_amount <= 0) {
      pay.status = 'Lunas';
    }

    if (!pay.payment_history) pay.payment_history = [];
    pay.payment_history.push({
      date: new Date().toISOString(),
      amount: payAmount,
      note: note || "Pembayaran hutang supplier"
    });

    // Update status di tabel purchases
    const purchase = db.purchases.find(p => p.id === pay.purchase_id || p.po_number === pay.po_number);
    if (purchase) {
      purchase.paid_amount += payAmount;
      purchase.remaining_amount = pay.remaining_amount;
      purchase.status = pay.status;
    }

    // Catat uang keluar kas
    const currentBalance = calculateCurrentCash(db);
    db.cash_transactions.push({
      id: generateId('CSH'),
      date: new Date().toISOString(),
      type: 'OUT',
      category: 'Pembayaran Hutang Supplier',
      amount: payAmount,
      ref_id: pay.po_number,
      description: `Pembayaran hutang ${pay.po_number} (${pay.supplier_name})`,
      balance_after: currentBalance - payAmount
    });

    saveDb(db);
    res.json({ success: true, message: "Pembayaran hutang supplier berhasil dicatat dari kas!", data: pay });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Laba Rugi (Income Statement)
app.get('/api/finance/income-statement', (req, res) => {
  const db = getDb();

  const totalPenjualan = db.sales.reduce((acc, s) => acc + Number(s.total), 0);
  const totalHpp = db.sales.reduce((acc, s) => acc + Number(s.hpp_total || 0), 0);
  const labaKotor = totalPenjualan - totalHpp;

  const bebanOperasional = db.operating_expenses || [];
  const totalBeban = bebanOperasional.reduce((acc, b) => acc + Number(b.amount), 0);
  const labaBersih = labaKotor - totalBeban;

  res.json({
    success: true,
    data: {
      totalPenjualan,
      totalHpp,
      labaKotor,
      bebanOperasional,
      totalBeban,
      labaBersih
    }
  });
});

// 6. MASTER DATA (Suppliers & Customers)
app.get('/api/master/suppliers', (req, res) => {
  const db = getDb();
  res.json({ success: true, data: db.suppliers });
});

app.post('/api/master/suppliers', (req, res) => {
  const db = getDb();
  const { name, contact, phone, address } = req.body;
  if (!name) return res.status(400).json({ success: false, message: "Nama supplier wajib diisi" });

  const newSupplier = {
    id: generateId('SUP'),
    name,
    contact: contact || "-",
    phone: phone || "-",
    address: address || "-"
  };
  db.suppliers.push(newSupplier);
  saveDb(db);
  res.json({ success: true, data: newSupplier });
});

app.get('/api/master/customers', (req, res) => {
  const db = getDb();
  res.json({ success: true, data: db.customers });
});

app.post('/api/master/customers', (req, res) => {
  const db = getDb();
  const { name, type, phone, address } = req.body;
  if (!name) return res.status(400).json({ success: false, message: "Nama pelanggan wajib diisi" });

  const newCustomer = {
    id: generateId('CUST'),
    name,
    type: type || "Retail",
    phone: phone || "-",
    address: address || "-"
  };
  db.customers.push(newCustomer);
  saveDb(db);
  res.json({ success: true, data: newCustomer });
});

// 7. RESET DATABASE DEMO
app.post('/api/reset', (req, res) => {
  const fresh = resetDb();
  res.json({ success: true, message: "Database berhasil di-reset ke data demo awal!", data: fresh });
});

// Start Server
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`   ERP TOKO BANGUNAN & GROSIR (TB SINAR ABADI)     `);
    console.log(`   Server aktif di: http://localhost:${PORT}        `);
    console.log(`   Metode Waterfall - Tugas UAS Rekayasa Perangkat  `);
    console.log(`====================================================`);
  });
}

module.exports = app;

