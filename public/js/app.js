/**
 * BUILDPRO ERP - Toko Material & Grosir Bahan Bangunan
 * Client-Side Application Engine (Vanilla JS)
 * SDLC Waterfall Project Implementation
 */

// Global State
const state = {
  currentTab: 'dashboard',
  dashboardData: null,
  inventory: [],
  categories: [],
  suppliers: [],
  customers: [],
  cart: [],
  selectedCustomer: 'CUST-04',
  posPaymentType: 'Tunai',
  posDiscount: 0,
  posPaidAmount: 0,
  purchaseCart: [],
  cashTransactions: [],
  receivables: [],
  payables: []
};

// Utilities
function formatRupiah(number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(number || 0);
}

function formatDate(isoString) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : type === 'danger' ? '✕' : 'ℹ'}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ================= API CALLS ================= //
async function apiGet(endpoint) {
  try {
    const res = await fetch(`/api${endpoint}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    return json;
  } catch (err) {
    showToast(`Error: ${err.message}`, 'danger');
    return null;
  }
}

async function apiPost(endpoint, body) {
  try {
    const res = await fetch(`/api${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    return json;
  } catch (err) {
    showToast(`Error: ${err.message}`, 'danger');
    return null;
  }
}

async function apiPut(endpoint, body) {
  try {
    const res = await fetch(`/api${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    return json;
  } catch (err) {
    showToast(`Error: ${err.message}`, 'danger');
    return null;
  }
}

// ================= TAB NAVIGATION ================= //
function switchTab(tabId) {
  state.currentTab = tabId;

  // Update Nav Active State
  document.querySelectorAll('.nav-item').forEach(el => {
    if (el.dataset.tab === tabId) el.classList.add('active');
    else el.classList.remove('active');
  });

  // Update Page View
  document.querySelectorAll('.page-view').forEach(view => {
    if (view.id === `view-${tabId}`) view.classList.add('active');
    else view.classList.remove('active');
  });

  // Load Specific Tab Data
  if (tabId === 'dashboard') loadDashboard();
  else if (tabId === 'inventory') loadInventory();
  else if (tabId === 'pos') initPOS();
  else if (tabId === 'sales-history') loadSalesHistory();
  else if (tabId === 'purchases') initPurchases();
  else if (tabId === 'finance') loadFinance();
  else if (tabId === 'ar-ap') loadArAp();
  else if (tabId === 'profit-loss') loadProfitLoss();
}

// ================= 1. DASHBOARD ================= //
async function loadDashboard() {
  const res = await apiGet('/dashboard');
  if (!res) return;
  const d = res.data;
  state.dashboardData = d;

  // Render Topbar Info
  document.getElementById('topbarStoreName').textContent = d.store_info.name;
  document.getElementById('topbarCashBadge').textContent = `Kas: ${formatRupiah(d.currentCashBalance)}`;

  // Stat Cards
  document.getElementById('statStockAsset').textContent = formatRupiah(d.totalStockAsset);
  document.getElementById('statTodaySales').textContent = formatRupiah(d.todaySales);
  document.getElementById('statTotalReceivables').textContent = formatRupiah(d.totalReceivables);
  document.getElementById('statNetProfit').textContent = formatRupiah(d.netProfit);
  document.getElementById('statCashBalance').textContent = formatRupiah(d.currentCashBalance);

  // Critical Stock Banner
  const alertContainer = document.getElementById('criticalAlertContainer');
  if (d.criticalStockCount > 0) {
    alertContainer.style.display = 'block';
    document.getElementById('alertStockCount').textContent = d.criticalStockCount;
    const itemsPreview = d.criticalProducts.slice(0, 3).map(p => `${p.name} (sisa ${p.stock} ${p.unit})`).join(', ');
    document.getElementById('alertStockItems').textContent = itemsPreview;
  } else {
    alertContainer.style.display = 'none';
  }

  // Render Recent Sales Table
  const tbody = document.getElementById('dashboardRecentSalesTable');
  if (tbody) {
    tbody.innerHTML = d.recentSales.map(s => `
      <tr>
        <td class="mono font-bold">${s.invoice}</td>
        <td>${s.customer}</td>
        <td>${s.date}</td>
        <td class="mono font-bold text-right">${formatRupiah(s.total)}</td>
      </tr>
    `).join('') || `<tr><td colspan="4" class="text-center text-muted">Belum ada transaksi</td></tr>`;
  }

  // Mini Chart Rendering (SVG)
  renderSalesChart(d.recentSales);
}

function renderSalesChart(sales) {
  const chartBox = document.getElementById('dashboardChart');
  if (!chartBox) return;

  if (!sales || sales.length === 0) {
    chartBox.innerHTML = `<div style="text-align:center; padding: 40px; color:#94a3b8;">Belum cukup data transaksi untuk tren</div>`;
    return;
  }

  const maxVal = Math.max(...sales.map(s => s.total), 5000000);
  const bars = sales.map((s, idx) => {
    const heightPercent = Math.max(10, Math.round((s.total / maxVal) * 100));
    return `
      <div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:8px;">
        <span style="font-size:10px; font-weight:600; color:#64748b; font-family:var(--font-mono);">${formatRupiah(s.total).replace(',00', '')}</span>
        <div style="width:100%; max-width:38px; height:140px; background:#f1f5f9; border-radius:6px; display:flex; align-items:flex-end;">
          <div style="width:100%; height:${heightPercent}%; background:linear-gradient(180deg, #3b82f6, #1d4ed8); border-radius:6px; transition: height 0.5s ease;"></div>
        </div>
        <span style="font-size:11px; color:#475569; font-weight:600;">${s.date}</span>
      </div>
    `;
  }).join('');

  chartBox.innerHTML = `
    <div style="display:flex; align-items:flex-end; justify-content:space-between; height:180px; gap:12px; padding:10px 0;">
      ${bars}
    </div>
  `;
}

// ================= 2. INVENTORY ================= //
async function loadInventory() {
  const search = document.getElementById('inventorySearch')?.value || '';
  const category = document.getElementById('inventoryCategoryFilter')?.value || '';
  const status = document.getElementById('inventoryStatusFilter')?.value || '';

  const res = await apiGet(`/inventory?search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}&status=${status}`);
  if (!res) return;

  state.inventory = res.data;
  state.categories = res.categories;
  state.suppliers = res.suppliers;

  // Populate category filter options if not yet populated
  const catSelect = document.getElementById('inventoryCategoryFilter');
  if (catSelect && catSelect.options.length <= 1) {
    res.categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      catSelect.appendChild(opt);
    });
  }

  // Populate Add/Edit Modal select options
  const modalCatSelect = document.getElementById('prodCategory');
  if (modalCatSelect && modalCatSelect.options.length <= 1) {
    res.categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      modalCatSelect.appendChild(opt);
    });
  }

  const modalSupSelect = document.getElementById('prodSupplier');
  if (modalSupSelect && modalSupSelect.options.length <= 1) {
    res.suppliers.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      modalSupSelect.appendChild(opt);
    });
  }

  // Render Table
  const tbody = document.getElementById('inventoryTableBody');
  if (!tbody) return;

  tbody.innerHTML = res.data.map(p => `
    <tr>
      <td class="mono font-bold">${p.code}</td>
      <td>
        <div style="font-weight:700; color:var(--text-main);">${p.name}</div>
        <small style="color:var(--text-muted); font-size:11px;">Rak/Lokasi: ${p.location}</small>
      </td>
      <td><span class="badge-tag" style="background:#f1f5f9; color:#475569;">${p.category_name}</span></td>
      <td class="mono text-right">${formatRupiah(p.purchase_price)}</td>
      <td class="mono text-right font-bold text-primary">${formatRupiah(p.selling_price)}</td>
      <td class="text-center">
        <span style="font-weight:800; font-size:14px; font-family:var(--font-mono);">${p.stock}</span>
        <span style="color:#64748b; font-size:11px;">${p.unit}</span>
      </td>
      <td>
        <span class="status-pill ${p.statusClass}">
          ● ${p.stockStatus}
        </span>
      </td>
      <td>
        <div style="display:flex; gap:6px;">
          <button class="btn btn-outline btn-sm" onclick="openOpnameModal('${p.id}', '${p.name}', ${p.stock}, '${p.unit}')" title="Stock Opname Fisik">📋 Opname</button>
          <button class="btn btn-outline btn-sm" onclick="openCardStockModal('${p.id}', '${p.name}')" title="Lihat Kartu Stok">📜 Kartu</button>
          <button class="btn btn-outline btn-sm" onclick="openEditProductModal('${p.id}')" title="Edit Data Barang">✏️</button>
        </div>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="8" class="text-center text-muted" style="padding:24px;">Tidak ada data barang yang sesuai.</td></tr>`;
}

// Modal Product (Add/Edit)
function openAddProductModal() {
  document.getElementById('modalProductTitle').textContent = "Tambah Master Barang Material";
  document.getElementById('prodId').value = "";
  document.getElementById('prodCode').value = "";
  document.getElementById('prodName').value = "";
  document.getElementById('prodUnit').value = "Sak";
  document.getElementById('prodPurchasePrice').value = "";
  document.getElementById('prodSellingPrice').value = "";
  document.getElementById('prodStock').value = "0";
  document.getElementById('prodMinStock').value = "10";
  document.getElementById('prodLocation').value = "Gudang Utama";
  document.getElementById('prodStockWrapper').style.display = "block";
  document.getElementById('modalProduct').classList.add('active');
}

function openEditProductModal(id) {
  const p = state.inventory.find(item => item.id === id);
  if (!p) return;

  document.getElementById('modalProductTitle').textContent = "Edit Master Barang Material";
  document.getElementById('prodId').value = p.id;
  document.getElementById('prodCode').value = p.code;
  document.getElementById('prodName').value = p.name;
  document.getElementById('prodCategory').value = p.category_id;
  document.getElementById('prodUnit').value = p.unit;
  document.getElementById('prodPurchasePrice').value = p.purchase_price;
  document.getElementById('prodSellingPrice').value = p.selling_price;
  document.getElementById('prodMinStock').value = p.min_stock;
  document.getElementById('prodLocation').value = p.location;
  document.getElementById('prodSupplier').value = p.supplier_id || "";
  document.getElementById('prodStockWrapper').style.display = "none"; // Stok diubah lewat opname/pembelian
  document.getElementById('modalProduct').classList.add('active');
}

async function saveProductForm(e) {
  e.preventDefault();
  const id = document.getElementById('prodId').value;
  const body = {
    code: document.getElementById('prodCode').value,
    name: document.getElementById('prodName').value,
    category_id: document.getElementById('prodCategory').value,
    unit: document.getElementById('prodUnit').value,
    purchase_price: Number(document.getElementById('prodPurchasePrice').value),
    selling_price: Number(document.getElementById('prodSellingPrice').value),
    min_stock: Number(document.getElementById('prodMinStock').value),
    location: document.getElementById('prodLocation').value,
    supplier_id: document.getElementById('prodSupplier').value,
    stock: Number(document.getElementById('prodStock').value || 0)
  };

  let res;
  if (id) {
    res = await apiPut(`/inventory/${id}`, body);
  } else {
    res = await apiPost('/inventory', body);
  }

  if (res) {
    showToast(res.message);
    closeModal('modalProduct');
    loadInventory();
    loadDashboard();
  }
}

// Modal Opname
function openOpnameModal(id, name, currentStock, unit) {
  document.getElementById('opnameProdId').value = id;
  document.getElementById('opnameProdName').textContent = name;
  document.getElementById('opnameSystemStock').textContent = `${currentStock} ${unit}`;
  document.getElementById('opnameActualStock').value = currentStock;
  document.getElementById('opnameNotes').value = "";
  document.getElementById('modalOpname').classList.add('active');
}

async function submitOpnameForm(e) {
  e.preventDefault();
  const id = document.getElementById('opnameProdId').value;
  const actual_stock = Number(document.getElementById('opnameActualStock').value);
  const notes = document.getElementById('opnameNotes').value;

  const res = await apiPost(`/inventory/${id}/opname`, { actual_stock, notes });
  if (res) {
    showToast(res.message);
    closeModal('modalOpname');
    loadInventory();
    loadDashboard();
  }
}

// Modal Kartu Stok
async function openCardStockModal(productId, productName) {
  document.getElementById('kartuStokProdName').textContent = productName;
  document.getElementById('modalKartuStok').classList.add('active');

  const res = await apiGet(`/inventory/movements?product_id=${productId}`);
  const tbody = document.getElementById('kartuStokTableBody');
  if (!res || res.data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding:20px;">Belum ada riwayat mutasi untuk barang ini.</td></tr>`;
    return;
  }

  tbody.innerHTML = res.data.map(m => `
    <tr>
      <td>${formatDate(m.date)}</td>
      <td class="mono font-bold">${m.ref_id}</td>
      <td>
        <span class="status-pill ${m.type.includes('IN') ? 'success' : 'danger'}">
          ${m.type}
        </span>
      </td>
      <td class="mono text-right font-bold">${m.type.includes('OUT') ? '-' : '+'}${m.qty}</td>
      <td class="mono text-right font-bold text-primary">${m.current_stock}</td>
      <td style="font-size:11px; color:var(--text-muted);">${m.notes}</td>
    </tr>
  `).join('');
}

// ================= 3. POS / KASIR PENJUALAN ================= //
async function initPOS() {
  const res = await apiGet('/inventory');
  const custRes = await apiGet('/master/customers');
  if (!res) return;

  state.inventory = res.data;
  if (custRes) state.customers = custRes.data;

  // Render Customer Select
  const custSelect = document.getElementById('posCustomerSelect');
  if (custSelect) {
    custSelect.innerHTML = state.customers.map(c => `
      <option value="${c.id}" ${c.id === state.selectedCustomer ? 'selected' : ''}>
        ${c.name} (${c.type})
      </option>
    `).join('');
  }

  // Render Categories Tabs for POS
  const catContainer = document.getElementById('posCatTabs');
  if (catContainer) {
    catContainer.innerHTML = `
      <button class="cat-tab active" onclick="filterPosCatalog('ALL', this)">Semua Kategori</button>
      ${res.categories.map(c => `
        <button class="cat-tab" onclick="filterPosCatalog('${c.id}', this)">${c.name}</button>
      `).join('')}
    `;
  }

  renderPosCatalog(state.inventory);
  renderCart();
}

function filterPosCatalog(catId, btnEl) {
  document.querySelectorAll('#posCatTabs .cat-tab').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');

  const search = (document.getElementById('posSearchInput')?.value || '').toLowerCase();
  let filtered = state.inventory;

  if (catId !== 'ALL') {
    filtered = filtered.filter(p => p.category_id === catId);
  }
  if (search) {
    filtered = filtered.filter(p => p.name.toLowerCase().includes(search) || p.code.toLowerCase().includes(search));
  }

  renderPosCatalog(filtered);
}

function onPosSearch(query) {
  const activeTab = document.querySelector('#posCatTabs .cat-tab.active');
  const currentCat = activeTab ? activeTab.getAttribute('onclick').match(/'([^']+)'/)[1] : 'ALL';
  filterPosCatalog(currentCat);
}

function renderPosCatalog(products) {
  const container = document.getElementById('posProductGrid');
  if (!container) return;

  if (products.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; padding: 40px; text-align:center; color:#94a3b8;">Barang material tidak ditemukan.</div>`;
    return;
  }

  container.innerHTML = products.map(p => {
    const isOutOfStock = p.stock <= 0;
    return `
      <div class="pos-product-card" onclick="${isOutOfStock ? `showToast('Stok habis! Lakukan restock terlebih dahulu.', 'danger')` : `addToCart('${p.id}')`}" style="${isOutOfStock ? 'opacity:0.55; cursor:not-allowed;' : ''}">
        <div>
          <span class="pos-product-sku">${p.code}</span>
          <h4 class="pos-product-name">${p.name}</h4>
        </div>
        <div class="pos-product-footer">
          <span class="pos-product-price">${formatRupiah(p.selling_price)}</span>
          <span class="pos-product-stock ${p.stock <= p.min_stock ? 'text-danger font-bold' : ''}">
            Stok: ${p.stock} ${p.unit}
          </span>
        </div>
      </div>
    `;
  }).join('');
}

function addToCart(productId) {
  const prod = state.inventory.find(p => p.id === productId);
  if (!prod) return;

  const existing = state.cart.find(c => c.product_id === productId);
  if (existing) {
    if (existing.qty + 1 > prod.stock) {
      showToast(`Stok "${prod.name}" hanya tersedia ${prod.stock} ${prod.unit}!`, 'warning');
      return;
    }
    existing.qty += 1;
    existing.subtotal = existing.qty * existing.price;
  } else {
    state.cart.push({
      product_id: prod.id,
      code: prod.code,
      name: prod.name,
      unit: prod.unit,
      price: prod.selling_price,
      purchase_price: prod.purchase_price,
      qty: 1,
      subtotal: prod.selling_price
    });
  }

  renderCart();
}

function updateCartQty(productId, delta) {
  const itemIndex = state.cart.findIndex(c => c.product_id === productId);
  if (itemIndex === -1) return;

  const item = state.cart[itemIndex];
  const prod = state.inventory.find(p => p.id === productId);
  const newQty = item.qty + delta;

  if (newQty <= 0) {
    state.cart.splice(itemIndex, 1);
  } else {
    if (prod && newQty > prod.stock) {
      showToast(`Stok "${prod.name}" tidak mencukupi! Maks: ${prod.stock}`, 'warning');
      return;
    }
    item.qty = newQty;
    item.subtotal = item.qty * item.price;
  }

  renderCart();
}

function clearCart() {
  state.cart = [];
  renderCart();
}

function renderCart() {
  const container = document.getElementById('posCartItems');
  if (!container) return;

  if (state.cart.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 40px 10px; color:#94a3b8;">
        <span style="font-size:32px; display:block; margin-bottom:8px;">🛒</span>
        Keranjang kosong.<br>Klik produk material di sebelah kiri untuk menambahkan.
      </div>
    `;
    updateCartSummary(0);
    return;
  }

  container.innerHTML = state.cart.map(item => `
    <div class="cart-item-row">
      <div class="cart-item-info">
        <h4>${item.name}</h4>
        <span>${formatRupiah(item.price)} / ${item.unit}</span>
      </div>
      <div class="cart-qty-ctrl">
        <button class="qty-btn" onclick="updateCartQty('${item.product_id}', -1)">-</button>
        <span class="mono font-bold" style="min-width:24px; text-align:center;">${item.qty}</span>
        <button class="qty-btn" onclick="updateCartQty('${item.product_id}', 1)">+</button>
      </div>
      <div class="mono font-bold" style="font-size:12px; min-width:80px; text-align:right;">
        ${formatRupiah(item.subtotal)}
      </div>
    </div>
  `).join('');

  const subtotal = state.cart.reduce((acc, c) => acc + c.subtotal, 0);
  updateCartSummary(subtotal);
}

function updateCartSummary(subtotal) {
  const discInput = Number(document.getElementById('posDiscountInput')?.value || 0);
  const grandTotal = Math.max(0, subtotal - discInput);

  document.getElementById('posSubtotalDisplay').textContent = formatRupiah(subtotal);
  document.getElementById('posGrandTotalDisplay').textContent = formatRupiah(grandTotal);

  calculatePosPayment();
}

function onPaymentTypeChange(type) {
  state.posPaymentType = type;
  const dueDateWrapper = document.getElementById('posDueDateWrapper');
  const paidLabel = document.getElementById('posPaidAmountLabel');

  if (type === 'Tempo/Kredit') {
    dueDateWrapper.style.display = 'block';
    paidLabel.textContent = "Uang Muka / DP (Bisa Rp 0):";
    document.getElementById('posPaidAmount').placeholder = "0";
  } else {
    dueDateWrapper.style.display = 'none';
    paidLabel.textContent = "Uang Diterima Kasir:";
    document.getElementById('posPaidAmount').placeholder = "Nominal Uang Tunai";
  }

  calculatePosPayment();
}

function calculatePosPayment() {
  const subtotal = state.cart.reduce((acc, c) => acc + c.subtotal, 0);
  const disc = Number(document.getElementById('posDiscountInput')?.value || 0);
  const grandTotal = Math.max(0, subtotal - disc);

  const paid = Number(document.getElementById('posPaidAmount')?.value || 0);
  const changeRow = document.getElementById('posChangeRow');
  const remainingRow = document.getElementById('posRemainingRow');

  if (state.posPaymentType === 'Tunai') {
    changeRow.style.display = 'flex';
    remainingRow.style.display = 'none';
    const change = Math.max(0, paid - grandTotal);
    document.getElementById('posChangeDisplay').textContent = formatRupiah(change);
  } else {
    changeRow.style.display = 'none';
    remainingRow.style.display = 'flex';
    const remaining = Math.max(0, grandTotal - paid);
    document.getElementById('posRemainingDisplay').textContent = formatRupiah(remaining);
  }
}

async function processCheckout() {
  if (state.cart.length === 0) {
    showToast("Keranjang belanja masih kosong!", "warning");
    return;
  }

  const subtotal = state.cart.reduce((acc, c) => acc + c.subtotal, 0);
  const discount = Number(document.getElementById('posDiscountInput').value || 0);
  const grandTotal = Math.max(0, subtotal - discount);
  const paid = Number(document.getElementById('posPaidAmount').value || 0);

  if (state.posPaymentType === 'Tunai' && paid < grandTotal) {
    showToast(`Uang tunai kurang! Total harus dibayar: ${formatRupiah(grandTotal)}`, 'danger');
    return;
  }

  const custId = document.getElementById('posCustomerSelect').value;
  const cust = state.customers.find(c => c.id === custId);
  const dueDate = document.getElementById('posDueDate').value;
  const notes = document.getElementById('posNotes').value;

  const payload = {
    customer_id: custId,
    customer_name: cust ? cust.name : "Pelanggan Umum",
    payment_type: state.posPaymentType,
    due_date: dueDate,
    discount,
    paid_amount: paid,
    items: state.cart,
    notes
  };

  const res = await apiPost('/sales', payload);
  if (res) {
    showToast("Transaksi Berhasil Diproses! Stok terpotong otomatis.", "success");
    // Show Printable Invoice
    showInvoiceModal(res.data);
    clearCart();
    document.getElementById('posPaidAmount').value = "";
    document.getElementById('posNotes').value = "";
    initPOS(); // reload catalog stock
    loadDashboard();
  }
}

// Modal Cetak Nota / Faktur
function showInvoiceModal(sale) {
  const area = document.getElementById('invoicePrintContainer');
  const d = state.dashboardData?.store_info || {
    name: "TB. SINAR ABADI MATERIAL",
    tagline: "Pusat Grosir & Eceran Bahan Bangunan",
    address: "Jl. Raya Industri No. 88, Kawasan Niaga Barat",
    phone: "0812-3456-7890"
  };

  area.innerHTML = `
    <div class="invoice-sheet" id="printableInvoiceArea">
      <div class="invoice-header">
        <div class="invoice-title-block">
          <h2>${d.name}</h2>
          <p>${d.tagline}</p>
          <p>${d.address} | Telp: ${d.phone}</p>
        </div>
        <div class="invoice-meta">
          <h3 style="font-size:16px; font-weight:800; color:#1d4ed8;">FAKTUR PENJUALAN</h3>
          <p class="mono font-bold">No: ${sale.invoice_number}</p>
          <p>Tgl: ${formatDate(sale.date)}</p>
          <p>Status: <strong>${sale.status.toUpperCase()}</strong> (${sale.payment_type})</p>
        </div>
      </div>

      <div style="display:flex; justify-content:space-between; margin-bottom:14px; font-size:12px;">
        <div>
          <strong>Kepada Yth:</strong><br>
          ${sale.customer_name}<br>
          Metode Bayar: <strong>${sale.payment_type}</strong>
        </div>
        ${sale.due_date ? `
          <div style="text-align:right;">
            <strong>Jatuh Tempo Tempo:</strong><br>
            <span style="color:#b91c1c; font-weight:bold;">${sale.due_date}</span>
          </div>
        ` : ''}
      </div>

      <table class="invoice-table">
        <thead>
          <tr>
            <th>No</th>
            <th>Nama Barang Material</th>
            <th style="text-align:center;">Qty</th>
            <th style="text-align:right;">Harga Satuan</th>
            <th style="text-align:right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${sale.items.map((item, idx) => `
            <tr>
              <td style="text-align:center;">${idx + 1}</td>
              <td><strong>${item.product_name}</strong></td>
              <td style="text-align:center;">${item.qty} ${item.unit}</td>
              <td style="text-align:right;">${formatRupiah(item.price)}</td>
              <td style="text-align:right;" class="mono font-bold">${formatRupiah(item.subtotal)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="display:flex; justify-content:flex-end; margin-top:14px;">
        <div style="min-width:240px; font-size:12px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <span>Subtotal:</span>
            <span class="mono">${formatRupiah(sale.subtotal)}</span>
          </div>
          ${sale.discount > 0 ? `
            <div style="display:flex; justify-content:space-between; margin-bottom:4px; color:#b91c1c;">
              <span>Diskon:</span>
              <span class="mono">-${formatRupiah(sale.discount)}</span>
            </div>
          ` : ''}
          <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-weight:800; font-size:14px; border-top:1px solid #cbd5e1; padding-top:6px;">
            <span>Total Akhir:</span>
            <span class="mono">${formatRupiah(sale.total)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <span>Dibayar:</span>
            <span class="mono">${formatRupiah(sale.paid_amount)}</span>
          </div>
          ${sale.change_amount > 0 ? `
            <div style="display:flex; justify-content:space-between; margin-bottom:4px; color:#047857;">
              <span>Kembalian:</span>
              <span class="mono">${formatRupiah(sale.change_amount)}</span>
            </div>
          ` : ''}
          ${sale.remaining_amount > 0 ? `
            <div style="display:flex; justify-content:space-between; margin-bottom:4px; color:#b91c1c; font-weight:bold;">
              <span>Sisa Piutang:</span>
              <span class="mono">${formatRupiah(sale.remaining_amount)}</span>
            </div>
          ` : ''}
        </div>
      </div>

      <div class="invoice-footer">
        <div>
          <p>Tanda Terima Pelanggan,</p>
          <br><br>
          <p>( _______________________ )</p>
        </div>
        <div style="text-align:right;">
          <p>Hormat Kami, Kasir Toko</p>
          <br><br>
          <p>( ${d.name} )</p>
        </div>
      </div>
    </div>
  `;

  document.getElementById('modalInvoice').classList.add('active');
}

// ================= 4. RIWAYAT PENJUALAN ================= //
async function loadSalesHistory() {
  const res = await apiGet('/sales');
  const tbody = document.getElementById('salesHistoryTableBody');
  if (!res || !tbody) return;

  tbody.innerHTML = res.data.map(s => `
    <tr>
      <td class="mono font-bold">${s.invoice_number}</td>
      <td>${formatDate(s.date)}</td>
      <td><strong>${s.customer_name}</strong></td>
      <td><span class="badge-tag" style="background:#f1f5f9;">${s.payment_type}</span></td>
      <td class="mono text-right font-bold">${formatRupiah(s.total)}</td>
      <td class="mono text-right">${formatRupiah(s.paid_amount)}</td>
      <td>
        <span class="status-pill ${s.status === 'Lunas' ? 'success' : 'danger'}">
          ● ${s.status}
        </span>
      </td>
      <td>
        <button class="btn btn-outline btn-sm" onclick='showInvoiceModal(${JSON.stringify(s)})'>🖨️ Cetak Ulang</button>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="8" class="text-center text-muted" style="padding:24px;">Belum ada riwayat penjualan.</td></tr>`;
}

// ================= 5. TRANSAKSI PEMBELIAN (RESTOCK PO) ================= //
async function initPurchases() {
  const invRes = await apiGet('/inventory');
  if (!invRes) return;

  state.inventory = invRes.data;
  state.suppliers = invRes.suppliers;

  // Render Suppliers Select
  const supSelect = document.getElementById('poSupplierSelect');
  if (supSelect) {
    supSelect.innerHTML = state.suppliers.map(s => `
      <option value="${s.id}">${s.name} (${s.contact} - ${s.phone})</option>
    `).join('');
  }

  // Render Product Select for PO
  const prodSelect = document.getElementById('poItemProductSelect');
  if (prodSelect) {
    prodSelect.innerHTML = state.inventory.map(p => `
      <option value="${p.id}" data-price="${p.purchase_price}" data-unit="${p.unit}">
        ${p.name} [Stok: ${p.stock} ${p.unit}]
      </option>
    `).join('');
    onPoProductChange();
  }

  renderPoCart();
  loadPurchasesHistory();
}

function onPoProductChange() {
  const sel = document.getElementById('poItemProductSelect');
  const opt = sel.options[sel.selectedIndex];
  if (opt) {
    document.getElementById('poItemPriceInput').value = opt.dataset.price;
    document.getElementById('poItemUnitLabel').textContent = opt.dataset.unit;
  }
}

function addPoItemToCart() {
  const sel = document.getElementById('poItemProductSelect');
  const prodId = sel.value;
  const qty = Number(document.getElementById('poItemQtyInput').value);
  const purchase_price = Number(document.getElementById('poItemPriceInput').value);

  if (qty <= 0 || purchase_price <= 0) {
    showToast("Jumlah qty dan harga beli harus valid!", "warning");
    return;
  }

  const prod = state.inventory.find(p => p.id === prodId);
  const existing = state.purchaseCart.find(i => i.product_id === prodId);

  if (existing) {
    existing.qty += qty;
    existing.purchase_price = purchase_price;
    existing.subtotal = existing.qty * purchase_price;
  } else {
    state.purchaseCart.push({
      product_id: prod.id,
      name: prod.name,
      unit: prod.unit,
      qty,
      purchase_price,
      subtotal: qty * purchase_price
    });
  }

  renderPoCart();
}

function removePoCartItem(idx) {
  state.purchaseCart.splice(idx, 1);
  renderPoCart();
}

function renderPoCart() {
  const tbody = document.getElementById('poCartTableBody');
  if (!tbody) return;

  if (state.purchaseCart.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding:16px;">Belum ada barang dalam list PO.</td></tr>`;
    document.getElementById('poGrandTotalDisplay').textContent = formatRupiah(0);
    return;
  }

  tbody.innerHTML = state.purchaseCart.map((item, idx) => `
    <tr>
      <td><strong>${item.name}</strong></td>
      <td class="text-center">${item.qty} ${item.unit}</td>
      <td class="mono text-right">${formatRupiah(item.purchase_price)}</td>
      <td class="mono text-right font-bold">${formatRupiah(item.subtotal)}</td>
      <td class="text-center">
        <button class="btn btn-outline btn-sm text-danger" onclick="removePoCartItem(${idx})">✕</button>
      </td>
    </tr>
  `).join('');

  const total = state.purchaseCart.reduce((acc, i) => acc + i.subtotal, 0);
  document.getElementById('poGrandTotalDisplay').textContent = formatRupiah(total);
}

async function submitPurchaseOrder(e) {
  e.preventDefault();
  if (state.purchaseCart.length === 0) {
    showToast("Tambahkan minimal 1 barang material ke dalam PO!", "warning");
    return;
  }

  const supplier_id = document.getElementById('poSupplierSelect').value;
  const payment_type = document.getElementById('poPaymentType').value;
  const due_date = document.getElementById('poDueDate').value;
  const paid_amount = Number(document.getElementById('poPaidAmount').value || 0);
  const notes = document.getElementById('poNotes').value;

  const payload = {
    supplier_id,
    payment_type,
    due_date,
    paid_amount,
    items: state.purchaseCart,
    notes
  };

  const res = await apiPost('/purchases', payload);
  if (res) {
    showToast("PO Penerimaan Barang Berhasil! Stok barang langsung bertambah.", "success");
    state.purchaseCart = [];
    renderPoCart();
    document.getElementById('poPaidAmount').value = "";
    document.getElementById('poNotes').value = "";
    initPurchases();
    loadDashboard();
  }
}

async function loadPurchasesHistory() {
  const res = await apiGet('/purchases');
  const tbody = document.getElementById('purchasesHistoryTableBody');
  if (!res || !tbody) return;

  tbody.innerHTML = res.data.map(p => `
    <tr>
      <td class="mono font-bold">${p.po_number}</td>
      <td>${formatDate(p.date)}</td>
      <td><strong>${p.supplier_name}</strong></td>
      <td><span class="badge-tag" style="background:#f1f5f9;">${p.payment_type}</span></td>
      <td class="mono text-right font-bold">${formatRupiah(p.total)}</td>
      <td class="mono text-right">${formatRupiah(p.paid_amount)}</td>
      <td>
        <span class="status-pill ${p.status === 'Lunas' ? 'success' : 'danger'}">
          ● ${p.status}
        </span>
      </td>
      <td style="font-size:12px;">${p.items.map(i => `${i.product_name} (${i.qty} ${i.unit})`).join(', ')}</td>
    </tr>
  `).join('') || `<tr><td colspan="8" class="text-center text-muted" style="padding:24px;">Belum ada riwayat PO.</td></tr>`;
}

// ================= 6. KEUANGAN & BUKU KAS ================= //
async function loadFinance() {
  const res = await apiGet('/finance/cashflow');
  if (!res) return;

  document.getElementById('financeCashBalance').textContent = formatRupiah(res.currentBalance);

  let totalIn = 0;
  let totalOut = 0;

  res.data.forEach(t => {
    if (t.type === 'IN') totalIn += t.amount;
    else totalOut += t.amount;
  });

  document.getElementById('financeTotalIn').textContent = formatRupiah(totalIn);
  document.getElementById('financeTotalOut').textContent = formatRupiah(totalOut);

  const tbody = document.getElementById('cashflowTableBody');
  tbody.innerHTML = res.data.map(t => `
    <tr>
      <td>${formatDate(t.date)}</td>
      <td>
        <span class="status-pill ${t.type === 'IN' ? 'success' : 'danger'}">
          ${t.type === 'IN' ? 'Masuk (+)' : 'Keluar (-)'}
        </span>
      </td>
      <td><strong>${t.category}</strong></td>
      <td class="mono">${t.ref_id}</td>
      <td>${t.description}</td>
      <td class="mono text-right font-bold ${t.type === 'IN' ? 'text-success' : 'text-danger'}">
        ${t.type === 'IN' ? '+' : '-'}${formatRupiah(t.amount)}
      </td>
      <td class="mono text-right font-bold">${formatRupiah(t.balance_after)}</td>
    </tr>
  `).join('') || `<tr><td colspan="7" class="text-center text-muted" style="padding:24px;">Belum ada transaksi kas.</td></tr>`;
}

async function submitCashEntry(e) {
  e.preventDefault();
  const type = document.getElementById('cashEntryType').value;
  const category = document.getElementById('cashEntryCategory').value;
  const amount = Number(document.getElementById('cashEntryAmount').value);
  const description = document.getElementById('cashEntryDesc').value;

  const res = await apiPost('/finance/cashflow', { type, category, amount, description });
  if (res) {
    showToast("Transaksi kas berhasil dicatat!", "success");
    closeModal('modalCashEntry');
    loadFinance();
    loadDashboard();
  }
}

// ================= 7. HUTANG & PIUTANG (AR & AP) ================= //
async function loadArAp() {
  const arRes = await apiGet('/finance/receivables');
  const apRes = await apiGet('/finance/payables');

  // Render Piutang Pelanggan (AR)
  const arTbody = document.getElementById('arTableBody');
  if (arRes && arTbody) {
    arTbody.innerHTML = arRes.data.map(ar => `
      <tr>
        <td class="mono font-bold">${ar.invoice_number}</td>
        <td><strong>${ar.customer_name}</strong></td>
        <td class="mono text-right">${formatRupiah(ar.total_amount)}</td>
        <td class="mono text-right">${formatRupiah(ar.paid_amount)}</td>
        <td class="mono text-right font-bold text-danger">${formatRupiah(ar.remaining_amount)}</td>
        <td class="font-bold text-muted">${ar.due_date || '-'}</td>
        <td>
          <span class="status-pill ${ar.status === 'Lunas' ? 'success' : 'danger'}">
            ● ${ar.status}
          </span>
        </td>
        <td>
          ${ar.status !== 'Lunas' ? `
            <button class="btn btn-primary btn-sm" onclick="openPayArModal('${ar.id}', '${ar.invoice_number}', '${ar.customer_name}', ${ar.remaining_amount})">
              💳 Bayar Cicilan
            </button>
          ` : '<span style="color:#10b981; font-weight:bold;">Lunas ✓</span>'}
        </td>
      </tr>
    `).join('') || `<tr><td colspan="8" class="text-center text-muted" style="padding:24px;">Tidak ada data piutang.</td></tr>`;
  }

  // Render Hutang Supplier (AP)
  const apTbody = document.getElementById('apTableBody');
  if (apRes && apTbody) {
    apTbody.innerHTML = apRes.data.map(ap => `
      <tr>
        <td class="mono font-bold">${ap.po_number}</td>
        <td><strong>${ap.supplier_name}</strong></td>
        <td class="mono text-right">${formatRupiah(ap.total_amount)}</td>
        <td class="mono text-right">${formatRupiah(ap.paid_amount)}</td>
        <td class="mono text-right font-bold text-danger">${formatRupiah(ap.remaining_amount)}</td>
        <td class="font-bold text-muted">${ap.due_date || '-'}</td>
        <td>
          <span class="status-pill ${ap.status === 'Lunas' ? 'success' : 'danger'}">
            ● ${ap.status}
          </span>
        </td>
        <td>
          ${ap.status !== 'Lunas' ? `
            <button class="btn btn-warning btn-sm" onclick="openPayApModal('${ap.id}', '${ap.po_number}', '${ap.supplier_name}', ${ap.remaining_amount})">
              💸 Bayar Hutang
            </button>
          ` : '<span style="color:#10b981; font-weight:bold;">Lunas ✓</span>'}
        </td>
      </tr>
    `).join('') || `<tr><td colspan="8" class="text-center text-muted" style="padding:24px;">Tidak ada data hutang supplier.</td></tr>`;
  }
}

function openPayArModal(id, invoice, customer, remaining) {
  document.getElementById('payArId').value = id;
  document.getElementById('payArTitle').textContent = `Pelunasan Piutang: ${invoice} (${customer})`;
  document.getElementById('payArRemainingDisplay').textContent = formatRupiah(remaining);
  document.getElementById('payArAmount').max = remaining;
  document.getElementById('payArAmount').value = remaining;
  document.getElementById('modalPayAr').classList.add('active');
}

async function submitPayAr(e) {
  e.preventDefault();
  const id = document.getElementById('payArId').value;
  const amount = Number(document.getElementById('payArAmount').value);
  const note = document.getElementById('payArNote').value;

  const res = await apiPost(`/finance/receivables/${id}/pay`, { amount, note });
  if (res) {
    showToast(res.message, "success");
    closeModal('modalPayAr');
    loadArAp();
    loadDashboard();
  }
}

function openPayApModal(id, po, supplier, remaining) {
  document.getElementById('payApId').value = id;
  document.getElementById('payApTitle').textContent = `Pembayaran Hutang: ${po} (${supplier})`;
  document.getElementById('payApRemainingDisplay').textContent = formatRupiah(remaining);
  document.getElementById('payApAmount').max = remaining;
  document.getElementById('payApAmount').value = remaining;
  document.getElementById('modalPayAp').classList.add('active');
}

async function submitPayAp(e) {
  e.preventDefault();
  const id = document.getElementById('payApId').value;
  const amount = Number(document.getElementById('payApAmount').value);
  const note = document.getElementById('payApNote').value;

  const res = await apiPost(`/finance/payables/${id}/pay`, { amount, note });
  if (res) {
    showToast(res.message, "success");
    closeModal('modalPayAp');
    loadArAp();
    loadDashboard();
  }
}

// ================= 8. LABA RUGI ================= //
async function loadProfitLoss() {
  const res = await apiGet('/finance/income-statement');
  if (!res) return;
  const d = res.data;

  document.getElementById('plTotalSales').textContent = formatRupiah(d.totalPenjualan);
  document.getElementById('plTotalHpp').textContent = formatRupiah(d.totalHpp);
  document.getElementById('plGrossProfit').textContent = formatRupiah(d.labaKotor);
  document.getElementById('plTotalExpenses').textContent = formatRupiah(d.totalBeban);
  document.getElementById('plNetProfit').textContent = formatRupiah(d.labaBersih);

  const expTbody = document.getElementById('plExpensesTableBody');
  if (expTbody) {
    expTbody.innerHTML = d.bebanOperasional.map(b => `
      <tr>
        <td>${formatDate(b.date)}</td>
        <td><strong>${b.category}</strong></td>
        <td>${b.description}</td>
        <td class="mono text-right font-bold">${formatRupiah(b.amount)}</td>
      </tr>
    `).join('') || `<tr><td colspan="4" class="text-center text-muted" style="padding:16px;">Belum ada beban operasional tercatat.</td></tr>`;
  }
}

// ================= 9. RESET DATABASE ================= //
async function triggerResetDemo() {
  if (confirm("Apakah Anda yakin ingin me-reset database ke data demo awal? Semua transaksi tambahan akan dikembalikan ke default.")) {
    const res = await apiPost('/reset', {});
    if (res) {
      showToast("Database berhasil di-reset ke data awal UAS!", "success");
      switchTab('dashboard');
    }
  }
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  switchTab('dashboard');
});
