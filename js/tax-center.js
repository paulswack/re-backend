/* ============================================================
   RE Back Office — Tax Center Page
   ============================================================ */

(function () {
  'use strict';

  Auth.requireAuth();
  populateSidebarUser();
  setActiveNav();
  initSidebarToggle();

  document.getElementById('logoutBtn').addEventListener('click', function () {
    Auth.logout();
  });

  var PREFIX = 'reb_';
  var COMMISSION_RATE = 0.03;

  // ---- Tax entries storage ----
  function getTaxEntries() {
    return JSON.parse(localStorage.getItem(PREFIX + 'tax_entries') || '[]');
  }

  function saveTaxEntries(entries) {
    localStorage.setItem(PREFIX + 'tax_entries', JSON.stringify(entries));
  }

  function addTaxEntry(entry) {
    var entries = getTaxEntries();
    entry.id = Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
    entry.createdAt = new Date().toISOString();
    entries.push(entry);
    saveTaxEntries(entries);
    return entry;
  }

  function deleteTaxEntry(id) {
    var entries = getTaxEntries();
    saveTaxEntries(entries.filter(function (e) { return e.id !== id; }));
  }

  // ---- Seed sample expenses if none exist ----
  function seedTaxData() {
    if (localStorage.getItem(PREFIX + 'tax_entries')) return;
    var samples = [
      { type: 'expense', category: 'Marketing', amount: 1200, date: '2026-01-15', description: 'Facebook & Instagram ads - Q1' },
      { type: 'expense', category: 'Technology', amount: 49, date: '2026-01-01', description: 'CRM monthly subscription' },
      { type: 'expense', category: 'Travel', amount: 340, date: '2026-02-10', description: 'Mileage reimbursement - Feb showings' },
      { type: 'expense', category: 'Education', amount: 250, date: '2026-02-20', description: 'CE course - Real estate ethics' },
      { type: 'expense', category: 'Marketing', amount: 800, date: '2026-03-01', description: 'Listing flyers and signage' },
      { type: 'expense', category: 'Dues', amount: 425, date: '2026-01-10', description: 'MLS and REALTOR association dues' },
      { type: 'expense', category: 'Office', amount: 120, date: '2026-03-05', description: 'Printer ink and paper' },
      { type: 'expense', category: 'Insurance', amount: 180, date: '2026-01-01', description: 'E&O insurance monthly premium' },
      { type: 'expense', category: 'Technology', amount: 29, date: '2026-02-01', description: 'Zoom Pro subscription' },
      { type: 'expense', category: 'Travel', amount: 280, date: '2026-03-15', description: 'Mileage reimbursement - Mar showings' }
    ];
    samples.forEach(function (s) { addTaxEntry(s); });
  }
  seedTaxData();

  // ---- Category colors ----
  var CATEGORY_COLORS = {
    'Marketing':    { bg: '#EEF2FF', color: '#6366F1', bar: '#6366F1' },
    'Office':       { bg: '#ECFDF5', color: '#10B981', bar: '#10B981' },
    'Travel':       { bg: '#FFFBEB', color: '#F59E0B', bar: '#F59E0B' },
    'Technology':   { bg: '#F5F3FF', color: '#8B5CF6', bar: '#8B5CF6' },
    'Education':    { bg: '#FFF1F2', color: '#F43F5E', bar: '#F43F5E' },
    'Insurance':    { bg: '#F0F9FF', color: '#0EA5E9', bar: '#0EA5E9' },
    'Dues':         { bg: '#FDF4FF', color: '#D946EF', bar: '#D946EF' },
    'Commission':   { bg: '#ECFDF5', color: '#065F46', bar: '#065F46' },
    'Referral Fee': { bg: '#FEF3C7', color: '#92400E', bar: '#92400E' },
    'Other':        { bg: '#F1F5F9', color: '#64748B', bar: '#64748B' }
  };

  function getCatColor(cat) {
    return CATEGORY_COLORS[cat] || CATEGORY_COLORS['Other'];
  }

  // ---- Tabs ----
  var tabBtns = document.querySelectorAll('.tab-btn');
  var tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var tab = btn.getAttribute('data-tab');
      tabBtns.forEach(function (b) { b.classList.remove('active'); });
      tabContents.forEach(function (c) { c.classList.remove('active'); });
      btn.classList.add('active');
      document.getElementById('tab-' + tab).classList.add('active');
    });
  });

  // ---- Modal ----
  var modal = document.getElementById('entryModal');
  var modalClose = document.getElementById('modalClose');
  var modalCancel = document.getElementById('modalCancel');
  var modalSave = document.getElementById('modalSave');
  var addBtn = document.getElementById('addExpenseBtn');

  function openModal() { modal.classList.add('open'); }
  function closeModal() {
    modal.classList.remove('open');
    document.getElementById('entryForm').reset();
  }

  addBtn.addEventListener('click', function () {
    document.getElementById('entryForm').reset();
    // Default date to today
    document.getElementById('entryDate').value = new Date().toISOString().split('T')[0];
    openModal();
  });

  modalClose.addEventListener('click', closeModal);
  modalCancel.addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeModal();
  });

  modalSave.addEventListener('click', function () {
    var type = document.getElementById('entryType').value;
    var category = document.getElementById('entryCategory').value;
    var amount = document.getElementById('entryAmount').value;
    var date = document.getElementById('entryDate').value;
    var description = document.getElementById('entryDescription').value.trim();

    if (!amount || !date) {
      showToast('Please fill in amount and date.', 'error');
      return;
    }

    addTaxEntry({
      type: type,
      category: category,
      amount: parseFloat(amount),
      date: date,
      description: description
    });

    showToast('Entry added successfully.');
    closeModal();
    render();
  });

  // ---- Render ----
  function render() {
    var entries = getTaxEntries();
    var txns = Data.getTransactions();
    var closedTxns = txns.filter(function (t) { return t.status === 'closed'; });

    // Calculate commission income from closed transactions
    var commissionIncome = closedTxns.reduce(function (sum, t) {
      return sum + ((parseFloat(t.price) || 0) * COMMISSION_RATE);
    }, 0);

    // Manual income entries
    var manualIncome = entries.filter(function (e) { return e.type === 'income'; });
    var manualIncomeTotal = manualIncome.reduce(function (sum, e) { return sum + (e.amount || 0); }, 0);

    var totalIncome = commissionIncome + manualIncomeTotal;

    // Expenses
    var expenses = entries.filter(function (e) { return e.type === 'expense'; });
    var totalExpenses = expenses.reduce(function (sum, e) { return sum + (e.amount || 0); }, 0);

    var netIncome = totalIncome - totalExpenses;

    // Stats
    var statsEl = document.getElementById('taxStats');
    statsEl.innerHTML =
      '<div class="stat-card">' +
        '<div class="stat-icon emerald"><svg viewBox="0 0 24 24"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg></div>' +
        '<div><div class="stat-value">' + Data.formatCurrencyFull(totalIncome) + '</div><div class="stat-label">Total Income</div></div>' +
      '</div>' +
      '<div class="stat-card">' +
        '<div class="stat-icon rose"><svg viewBox="0 0 24 24"><path d="M22 12l-2.29-2.29 -4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12z"/></svg></div>' +
        '<div><div class="stat-value">' + Data.formatCurrencyFull(totalExpenses) + '</div><div class="stat-label">Total Expenses</div></div>' +
      '</div>' +
      '<div class="stat-card">' +
        '<div class="stat-icon ' + (netIncome >= 0 ? 'indigo' : 'rose') + '"><svg viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg></div>' +
        '<div><div class="stat-value">' + Data.formatCurrencyFull(netIncome) + '</div><div class="stat-label">Net Income</div></div>' +
      '</div>' +
      '<div class="stat-card">' +
        '<div class="stat-icon amber"><svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/></svg></div>' +
        '<div><div class="stat-value">' + closedTxns.length + '</div><div class="stat-label">Closings (3% rate)</div></div>' +
      '</div>';

    // Income Tab
    var incomeEl = document.getElementById('incomeList');
    if (closedTxns.length === 0 && manualIncome.length === 0) {
      incomeEl.innerHTML = '<div class="empty-state" style="padding:40px 20px;"><h3>No income recorded</h3><p>Close transactions to see commission income.</p></div>';
    } else {
      var incomeRows = closedTxns.map(function (t) {
        var commission = (parseFloat(t.price) || 0) * COMMISSION_RATE;
        return '<div class="expense-row">' +
          '<div class="expense-cat-dot" style="background:var(--emerald);"></div>' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="font-size:.88rem;font-weight:600;color:var(--gray-800);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + t.address + '</div>' +
            '<div style="font-size:.75rem;color:var(--gray-400);">' + t.agent + ' &middot; Closed ' + Data.formatDate(t.closeDate) + '</div>' +
          '</div>' +
          '<div style="text-align:right;">' +
            '<div style="font-size:.92rem;font-weight:700;color:var(--emerald);">+' + Data.formatCurrencyFull(commission) + '</div>' +
            '<div style="font-size:.72rem;color:var(--gray-400);">3% of ' + Data.formatCurrencyFull(t.price) + '</div>' +
          '</div>' +
        '</div>';
      });

      // Manual income entries
      manualIncome.forEach(function (e) {
        incomeRows.push('<div class="expense-row">' +
          '<div class="expense-cat-dot" style="background:' + getCatColor(e.category).color + ';"></div>' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="font-size:.88rem;font-weight:600;color:var(--gray-800);">' + (e.description || e.category) + '</div>' +
            '<div style="font-size:.75rem;color:var(--gray-400);">' + Data.formatDate(e.date) + '</div>' +
          '</div>' +
          '<div style="font-size:.92rem;font-weight:700;color:var(--emerald);">+' + Data.formatCurrencyFull(e.amount) + '</div>' +
        '</div>');
      });

      incomeEl.innerHTML = incomeRows.join('');
    }

    // Expenses Tab - category breakdown
    var catTotals = {};
    expenses.forEach(function (e) {
      var cat = e.category || 'Other';
      catTotals[cat] = (catTotals[cat] || 0) + (e.amount || 0);
    });

    var catArr = Object.keys(catTotals).map(function (cat) {
      return { name: cat, total: catTotals[cat] };
    });
    catArr.sort(function (a, b) { return b.total - a.total; });

    // Expense bar
    var barEl = document.getElementById('expenseBar');
    if (totalExpenses > 0 && catArr.length > 0) {
      barEl.innerHTML = catArr.map(function (c) {
        var pct = (c.total / totalExpenses * 100);
        return '<div style="width:' + pct + '%;background:' + getCatColor(c.name).bar + ';"></div>';
      }).join('');
    } else {
      barEl.innerHTML = '<div style="width:100%;background:var(--gray-200);"></div>';
    }

    // Category grid
    var catGrid = document.getElementById('categoryGrid');
    if (catArr.length === 0) {
      catGrid.innerHTML = '<p style="font-size:.85rem;color:var(--gray-400);grid-column:1/-1;">No expenses recorded yet.</p>';
    } else {
      catGrid.innerHTML = catArr.map(function (c) {
        var colors = getCatColor(c.name);
        return '<div class="category-card">' +
          '<div class="category-icon" style="background:' + colors.bg + ';color:' + colors.color + ';">' +
            '<div style="width:12px;height:12px;border-radius:50%;background:' + colors.color + ';"></div>' +
          '</div>' +
          '<div>' +
            '<div class="category-name">' + c.name + '</div>' +
            '<div class="category-amount">' + Data.formatCurrencyFull(c.total) + '</div>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    // Expense list
    var expListEl = document.getElementById('expenseList');
    if (expenses.length === 0) {
      expListEl.innerHTML = '<div class="empty-state" style="padding:40px 20px;"><h3>No expenses yet</h3><p>Add your first expense to start tracking.</p></div>';
    } else {
      var sortedExp = expenses.slice().sort(function (a, b) {
        return new Date(b.date) - new Date(a.date);
      });
      expListEl.innerHTML = sortedExp.map(function (e) {
        var colors = getCatColor(e.category);
        return '<div class="expense-row">' +
          '<div class="expense-cat-dot" style="background:' + colors.color + ';"></div>' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="font-size:.88rem;font-weight:600;color:var(--gray-800);">' + (e.description || e.category) + '</div>' +
            '<div style="font-size:.75rem;color:var(--gray-400);">' + e.category + ' &middot; ' + Data.formatDate(e.date) + '</div>' +
          '</div>' +
          '<div style="font-size:.92rem;font-weight:700;color:var(--rose);">-' + Data.formatCurrencyFull(e.amount) + '</div>' +
        '</div>';
      }).join('');
    }

    // All Entries Tab
    var allBody = document.getElementById('allEntriesBody');
    var allEmpty = document.getElementById('allEmpty');

    // Combine: commission income from txns + manual entries
    var allEntries = [];

    closedTxns.forEach(function (t) {
      allEntries.push({
        id: 'txn-' + t.id,
        type: 'income',
        category: 'Commission',
        description: t.address,
        amount: (parseFloat(t.price) || 0) * COMMISSION_RATE,
        date: t.closeDate,
        isDerived: true
      });
    });

    entries.forEach(function (e) {
      allEntries.push({
        id: e.id,
        type: e.type,
        category: e.category,
        description: e.description,
        amount: e.amount,
        date: e.date,
        isDerived: false
      });
    });

    allEntries.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });

    if (allEntries.length === 0) {
      allBody.innerHTML = '';
      allEmpty.style.display = 'block';
    } else {
      allEmpty.style.display = 'none';
      allBody.innerHTML = allEntries.map(function (e) {
        var isIncome = e.type === 'income';
        var colors = getCatColor(e.category);
        return '<tr>' +
          '<td>' + Data.formatDate(e.date) + '</td>' +
          '<td><span class="badge" style="background:' + (isIncome ? 'var(--emerald-light);color:#065F46' : 'var(--rose-light);color:#9F1239') + ';">' + (isIncome ? 'Income' : 'Expense') + '</span></td>' +
          '<td><span style="display:inline-flex;align-items:center;gap:6px;"><span class="expense-cat-dot" style="background:' + colors.color + ';"></span>' + e.category + '</span></td>' +
          '<td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (e.description || '—') + '</td>' +
          '<td style="font-weight:700;color:' + (isIncome ? 'var(--emerald)' : 'var(--rose)') + ';">' + (isIncome ? '+' : '-') + Data.formatCurrencyFull(e.amount) + '</td>' +
          '<td>' + (e.isDerived ? '' : '<button class="btn btn-outline btn-sm delete-entry-btn" data-id="' + e.id + '">Delete</button>') + '</td>' +
        '</tr>';
      }).join('');

      // Delete buttons
      var deleteBtns = allBody.querySelectorAll('.delete-entry-btn');
      deleteBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (confirm('Delete this entry?')) {
            deleteTaxEntry(btn.getAttribute('data-id'));
            showToast('Entry deleted.');
            render();
          }
        });
      });
    }
  }

  // ---- Init ----
  render();

})();
