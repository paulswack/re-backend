/* ============================================================
   RE Back Office — Tax Center (Comprehensive Tax Hub)
   ============================================================ */

(function () {
  'use strict';

  Auth.requireAuth();
  populateSidebarUser();
  setActiveNav();
  initSidebarToggle();
  applyPageColor('taxCenter');

  document.getElementById('logoutBtn').addEventListener('click', function () {
    Auth.logout();
  });

  // Assistants cannot access Tax Center
  if (Auth.isAssistant()) {
    document.querySelector('.page-body').innerHTML =
      '<div style="padding:80px 40px;text-align:center">' +
        '<svg viewBox="0 0 24 24" width="48" height="48" fill="var(--gray-200)" style="display:block;margin:0 auto 12px"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>' +
        '<h3 style="font-size:1rem;font-weight:700;color:var(--gray-600);margin-bottom:6px">Access Restricted</h3>' +
        '<p style="font-size:.88rem;color:var(--gray-400)">Tax information is private to each agent. Contact your agent for any tax-related questions.</p>' +
        '<a href="dashboard.html" class="btn btn-outline btn-sm" style="margin-top:16px">Back to Dashboard</a>' +
      '</div>';
    return;
  }

  var PREFIX = 'reb_';
  var selectedTaxAgent = 'all';
  var IRS_MILEAGE_RATE = 0.67; // 2026 rate
  var EST_TAX_RATE = getAdminSetting('general.estimatedTaxRate', 0.25);

  // ---- Expense Categories (from admin settings) ----
  var DEFAULT_EXPENSE_ICONS = {
    'Advertising & Marketing': '\uD83D\uDCE3',
    'Auto & Mileage': '\uD83D\uDE97',
    'Client Gifts & Entertainment': '\uD83C\uDF81',
    'Commission Splits / Referral Fees': '\uD83E\uDD1D',
    'Continuing Education & Training': '\uD83C\uDF93',
    'Desk Fees / Office Rent': '\uD83C\uDFE2',
    'E&O Insurance': '\uD83D\uDEE1\uFE0F',
    'Health Insurance': '\u2764\uFE0F',
    'Home Office': '\uD83C\uDFE0',
    'Legal & Professional Services': '\u2696\uFE0F',
    'Licensing & Dues': '\uD83C\uDFAB',
    'Marketing Materials': '\uD83D\uDCC7',
    'Office Supplies & Equipment': '\uD83D\uDDA8\uFE0F',
    'Phone & Internet': '\uD83D\uDCF1',
    'Photography & Staging': '\uD83D\uDCF7',
    'Postage & Shipping': '\uD83D\uDCEE',
    'Professional Development': '\uD83D\uDCDA',
    'Software & Technology': '\uD83D\uDCBB',
    'Travel & Lodging': '\u2708\uFE0F',
    'Other': '\uD83D\uDCCB'
  };
  var adminExpenseCategories = getAdminSetting('expenseCategories', []);
  var EXPENSE_CATEGORIES = (adminExpenseCategories.length > 0 ? adminExpenseCategories : [
    { key: 'Advertising & Marketing', color: '#6366F1' },
    { key: 'Auto & Mileage', color: '#3B82F6' },
    { key: 'Client Gifts & Entertainment', color: '#EC4899' },
    { key: 'Commission Splits / Referral Fees', color: '#14B8A6' },
    { key: 'Continuing Education & Training', color: '#F43F5E' },
    { key: 'Desk Fees / Office Rent', color: '#8B5CF6' },
    { key: 'E&O Insurance', color: '#0EA5E9' },
    { key: 'Health Insurance', color: '#EF4444' },
    { key: 'Home Office', color: '#F97316' },
    { key: 'Legal & Professional Services', color: '#64748B' },
    { key: 'Licensing & Dues', color: '#D946EF' },
    { key: 'Marketing Materials', color: '#A855F7' },
    { key: 'Office Supplies & Equipment', color: '#10B981' },
    { key: 'Phone & Internet', color: '#06B6D4' },
    { key: 'Photography & Staging', color: '#F59E0B' },
    { key: 'Postage & Shipping', color: '#78716C' },
    { key: 'Professional Development', color: '#BE185D' },
    { key: 'Software & Technology', color: '#7C3AED' },
    { key: 'Travel & Lodging', color: '#2563EB' },
    { key: 'Other', color: '#94A3B8' }
  ]).map(function (c) {
    return { key: c.key, icon: DEFAULT_EXPENSE_ICONS[c.key] || '\uD83D\uDCCB', color: c.color };
  });

  var INCOME_CATEGORIES = [
    { key: 'Commission', color: '#065F46' },
    { key: 'Referral Fee', color: '#92400E' },
    { key: 'Bonus', color: '#6366F1' },
    { key: 'Rental Income', color: '#0EA5E9' },
    { key: 'Other Income', color: '#64748B' }
  ];

  var CATEGORY_COLOR_MAP = {};
  EXPENSE_CATEGORIES.forEach(function (c) { CATEGORY_COLOR_MAP[c.key] = c.color; });
  INCOME_CATEGORIES.forEach(function (c) { CATEGORY_COLOR_MAP[c.key] = c.color; });

  function getCatColor(cat) {
    return CATEGORY_COLOR_MAP[cat] || '#94A3B8';
  }

  function getCatBg(cat) {
    var color = getCatColor(cat);
    return color + '18'; // hex with low opacity
  }

  // ---- localStorage helpers ----
  function getTaxEntries() {
    return JSON.parse(localStorage.getItem(PREFIX + 'tax_entries') || '[]');
  }
  function saveTaxEntries(entries) {
    localStorage.setItem(PREFIX + 'tax_entries', JSON.stringify(entries));
  }
  function getMileageTrips() {
    return JSON.parse(localStorage.getItem(PREFIX + 'mileage') || '[]');
  }
  function saveMileageTrips(trips) {
    localStorage.setItem(PREFIX + 'mileage', JSON.stringify(trips));
  }
  function getSettings() {
    var adminCommRate = getAdminSetting('general.defaultCommissionRate', 0.03);
    var adminSplit = getAdminSetting('general.defaultAgentSplit', 0.70);
    var defaults = '{"commissionRate":' + adminCommRate + ',"agentSplit":' + adminSplit + '}';
    return JSON.parse(localStorage.getItem(PREFIX + 'tax_settings') || defaults);
  }
  function saveSettings(s) {
    localStorage.setItem(PREFIX + 'tax_settings', JSON.stringify(s));
  }

  function generateId() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
  }

  // ---- Seed sample data ----
  function seedTaxData() {
    if (localStorage.getItem(PREFIX + 'tax_entries')) return;
    var samples = [
      { type: 'expense', category: 'Advertising & Marketing', amount: 1200, date: '2026-01-15', description: 'Facebook & Instagram ads - Q1', vendor: 'Meta' },
      { type: 'expense', category: 'Software & Technology', amount: 49, date: '2026-01-01', description: 'CRM monthly subscription', vendor: 'Follow Up Boss' },
      { type: 'expense', category: 'Auto & Mileage', amount: 340, date: '2026-02-10', description: 'Gas and car maintenance - Feb', vendor: 'Shell' },
      { type: 'expense', category: 'Continuing Education & Training', amount: 250, date: '2026-02-20', description: 'CE course - Real estate ethics', vendor: 'CE Shop' },
      { type: 'expense', category: 'Marketing Materials', amount: 800, date: '2026-03-01', description: 'Listing flyers and signage', vendor: 'FedEx Print' },
      { type: 'expense', category: 'Licensing & Dues', amount: 425, date: '2026-01-10', description: 'MLS and REALTOR association dues', vendor: 'NAR' },
      { type: 'expense', category: 'Office Supplies & Equipment', amount: 120, date: '2026-03-05', description: 'Printer ink and paper', vendor: 'Staples' },
      { type: 'expense', category: 'E&O Insurance', amount: 180, date: '2026-01-01', description: 'E&O insurance monthly premium', vendor: 'CRES Insurance' },
      { type: 'expense', category: 'Software & Technology', amount: 29, date: '2026-02-01', description: 'Zoom Pro subscription', vendor: 'Zoom' },
      { type: 'expense', category: 'Photography & Staging', amount: 450, date: '2026-03-15', description: 'Listing photos and virtual tour', vendor: 'HomeSnap' },
      { type: 'expense', category: 'Client Gifts & Entertainment', amount: 85, date: '2026-02-14', description: 'Closing gift basket', vendor: 'Harry & David' },
      { type: 'expense', category: 'Phone & Internet', amount: 95, date: '2026-01-15', description: 'Cell phone plan', vendor: 'T-Mobile' },
      { type: 'expense', category: 'Phone & Internet', amount: 95, date: '2026-02-15', description: 'Cell phone plan', vendor: 'T-Mobile' },
      { type: 'expense', category: 'Phone & Internet', amount: 95, date: '2026-03-15', description: 'Cell phone plan', vendor: 'T-Mobile' },
      { type: 'expense', category: 'Professional Development', amount: 35, date: '2026-03-10', description: 'Real estate coaching book', vendor: 'Amazon' },
      { type: 'expense', category: 'Desk Fees / Office Rent', amount: 300, date: '2026-01-01', description: 'Desk fee - January', vendor: 'Keller Williams' },
      { type: 'expense', category: 'Desk Fees / Office Rent', amount: 300, date: '2026-02-01', description: 'Desk fee - February', vendor: 'Keller Williams' },
      { type: 'expense', category: 'Desk Fees / Office Rent', amount: 300, date: '2026-03-01', description: 'Desk fee - March', vendor: 'Keller Williams' },
      { type: 'income', category: 'Referral Fee', amount: 2500, date: '2026-02-28', description: 'Referral fee from out-of-state agent', vendor: 'John Smith Realty' },
      { type: 'income', category: 'Bonus', amount: 1000, date: '2026-03-15', description: 'Team production bonus Q1', vendor: '' }
    ];
    samples.forEach(function (s) {
      s.id = generateId();
      s.createdAt = new Date().toISOString();
    });
    saveTaxEntries(samples);
  }

  function seedMileageData() {
    if (localStorage.getItem(PREFIX + 'mileage')) return;
    var trips = [
      { date: '2026-01-12', purpose: 'Showing', from: 'Home office', to: '4512 Balcones Dr', miles: 14.2, notes: 'Buyer showing - 3 homes' },
      { date: '2026-01-20', purpose: 'Closing', from: 'Home office', to: 'Title Company', miles: 8.5, notes: 'Balcones Dr closing' },
      { date: '2026-02-05', purpose: 'Listing Appointment', from: 'Office', to: '2807 S Lamar Blvd', miles: 6.3, notes: 'New listing presentation' },
      { date: '2026-02-14', purpose: 'Client Meeting', from: 'Home office', to: 'Starbucks on Congress', miles: 5.1, notes: 'Buyer consultation' },
      { date: '2026-02-22', purpose: 'Showing', from: 'Office', to: 'South Austin', miles: 18.7, notes: '5 properties tour' },
      { date: '2026-03-01', purpose: 'Open House', from: 'Home office', to: '1605 W 30th St', miles: 9.4, notes: 'Open house setup' },
      { date: '2026-03-08', purpose: 'Inspection', from: 'Office', to: '901 W 9th St', miles: 4.8, notes: 'Attend inspection' },
      { date: '2026-03-15', purpose: 'Showing', from: 'Home office', to: 'East Austin', miles: 22.1, notes: 'Full day showings' },
      { date: '2026-03-20', purpose: 'Office', from: 'Home', to: 'Keller Williams office', miles: 11.3, notes: 'Team meeting' },
      { date: '2026-03-25', purpose: 'Client Meeting', from: 'Office', to: 'Domain area', miles: 15.6, notes: 'Listing consultation' }
    ];
    trips.forEach(function (t) {
      t.id = generateId();
      t.createdAt = new Date().toISOString();
    });
    saveMileageTrips(trips);
  }

  // Only seed demo data in demo mode
  if (typeof Auth !== 'undefined' && Auth.isDemo && Auth.isDemo()) {
    seedTaxData();
    seedMileageData();
  }

  // ---- Populate category dropdown ----
  function populateCategories(type) {
    var sel = document.getElementById('entryCategory');
    sel.innerHTML = '';
    var cats = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    cats.forEach(function (c) {
      var opt = document.createElement('option');
      opt.value = c.key;
      opt.textContent = c.key;
      sel.appendChild(opt);
    });
  }

  // Populate filter category dropdown
  function populateFilterCategories() {
    var sel = document.getElementById('filterCategory');
    sel.innerHTML = '<option value="">All Categories</option>';
    EXPENSE_CATEGORIES.forEach(function (c) {
      var opt = document.createElement('option');
      opt.value = c.key;
      opt.textContent = c.key;
      sel.appendChild(opt);
    });
  }
  populateFilterCategories();

  // ---- Commission settings ----
  var settings = getSettings();

  function initRateSelectors() {
    var commSel = document.getElementById('commRateSelect');
    var commCustom = document.getElementById('commRateCustom');
    var commCustomPct = document.getElementById('commRateCustomPct');
    var splitSel = document.getElementById('agentSplitSelect');
    var splitCustom = document.getElementById('agentSplitCustom');
    var splitCustomPct = document.getElementById('agentSplitCustomPct');

    // Set initial values
    var rateVal = String(settings.commissionRate);
    if (commSel.querySelector('option[value="' + rateVal + '"]')) {
      commSel.value = rateVal;
    } else {
      commSel.value = 'custom';
      commCustom.value = (settings.commissionRate * 100).toFixed(2);
      commCustom.style.display = '';
      commCustomPct.style.display = '';
    }

    var splitVal = String(settings.agentSplit);
    if (splitSel.querySelector('option[value="' + splitVal + '"]')) {
      splitSel.value = splitVal;
    } else {
      splitSel.value = 'custom';
      splitCustom.value = Math.round(settings.agentSplit * 100);
      splitCustom.style.display = '';
      splitCustomPct.style.display = '';
    }

    commSel.addEventListener('change', function () {
      if (commSel.value === 'custom') {
        commCustom.style.display = '';
        commCustomPct.style.display = '';
        commCustom.focus();
      } else {
        commCustom.style.display = 'none';
        commCustomPct.style.display = 'none';
        settings.commissionRate = parseFloat(commSel.value);
        saveSettings(settings);
        render();
      }
    });
    commCustom.addEventListener('change', function () {
      var val = parseFloat(commCustom.value);
      if (val > 0 && val <= 100) {
        settings.commissionRate = val / 100;
        saveSettings(settings);
        render();
      }
    });

    splitSel.addEventListener('change', function () {
      if (splitSel.value === 'custom') {
        splitCustom.style.display = '';
        splitCustomPct.style.display = '';
        splitCustom.focus();
      } else {
        splitCustom.style.display = 'none';
        splitCustomPct.style.display = 'none';
        settings.agentSplit = parseFloat(splitSel.value);
        saveSettings(settings);
        render();
      }
    });
    splitCustom.addEventListener('change', function () {
      var val = parseFloat(splitCustom.value);
      if (val > 0 && val <= 100) {
        settings.agentSplit = val / 100;
        saveSettings(settings);
        render();
      }
    });
  }
  initRateSelectors();

  // ---- Type change -> update categories ----
  document.getElementById('entryType').addEventListener('change', function () {
    populateCategories(this.value);
  });

  // ---- Recurring toggle ----
  document.getElementById('entryRecurring').addEventListener('change', function () {
    document.getElementById('recurFreqGroup').style.display = this.checked ? '' : 'none';
  });

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

  // ---- Modals ----
  var entryModal = document.getElementById('entryModal');
  var mileageModal = document.getElementById('mileageModal');

  function openEntryModal(type, editEntry) {
    document.getElementById('entryForm').reset();
    document.getElementById('recurFreqGroup').style.display = 'none';
    document.getElementById('entryId').value = '';

    if (editEntry) {
      document.getElementById('modalTitle').textContent = 'Edit Entry';
      document.getElementById('entryType').value = editEntry.type;
      populateCategories(editEntry.type);
      document.getElementById('entryCategory').value = editEntry.category;
      document.getElementById('entryAmount').value = editEntry.amount;
      document.getElementById('entryDate').value = editEntry.date;
      document.getElementById('entryDescription').value = editEntry.description || '';
      document.getElementById('entryVendor').value = editEntry.vendor || '';
      document.getElementById('entryNotes').value = editEntry.notes || '';
      document.getElementById('entryId').value = editEntry.id;
      if (editEntry.recurring) {
        document.getElementById('entryRecurring').checked = true;
        document.getElementById('recurFreqGroup').style.display = '';
        document.getElementById('entryRecurFreq').value = editEntry.recurFreq || 'monthly';
      }
      // Pre-fill receipt if exists
      if (editEntry.receiptData) {
        document.getElementById('receiptData').value = editEntry.receiptData;
        document.getElementById('receiptName').value = editEntry.receiptName || '';
        var preview = document.getElementById('receiptPreview');
        var prompt = document.getElementById('receiptPrompt');
        var area = document.getElementById('receiptUploadArea');
        area.style.borderColor = 'var(--indigo)';
        area.style.background = 'var(--indigo-light)';
        prompt.style.display = 'none';
        preview.style.display = 'block';
        var isImg = editEntry.receiptData.startsWith('data:image');
        if (isImg) {
          preview.innerHTML = '<img src="' + editEntry.receiptData + '" style="max-height:80px;border-radius:6px;margin-bottom:4px"><div style="font-size:.78rem;font-weight:600;color:var(--indigo)">' + (editEntry.receiptName || 'Receipt') + '</div><button type="button" onclick="event.stopPropagation();clearReceipt()" style="margin-top:4px;font-size:.72rem;color:var(--rose);background:none;border:none;cursor:pointer;font-weight:600">Remove</button>';
        } else {
          preview.innerHTML = '<div style="display:flex;align-items:center;gap:8px;justify-content:center"><svg viewBox="0 0 24 24" width="24" height="24" fill="var(--indigo)"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg><span style="font-size:.82rem;font-weight:600;color:var(--indigo)">' + (editEntry.receiptName || 'Document') + '</span></div><button type="button" onclick="event.stopPropagation();clearReceipt()" style="margin-top:6px;font-size:.72rem;color:var(--rose);background:none;border:none;cursor:pointer;font-weight:600">Remove</button>';
        }
      } else {
        clearReceipt();
      }
    } else {
      clearReceipt();
      document.getElementById('modalTitle').textContent = 'Add Entry';
      document.getElementById('entryType').value = type || 'expense';
      populateCategories(type || 'expense');
      document.getElementById('entryDate').value = new Date().toISOString().split('T')[0];
    }

    entryModal.classList.add('open');
  }

  function closeEntryModal() {
    entryModal.classList.remove('open');
  }

  function openMileageModal(editTrip) {
    document.getElementById('mileageForm').reset();
    document.getElementById('mileageId').value = '';

    if (editTrip) {
      document.getElementById('mileageModalTitle').textContent = 'Edit Trip';
      document.getElementById('mileageDate').value = editTrip.date;
      document.getElementById('mileagePurpose').value = editTrip.purpose;
      document.getElementById('mileageFrom').value = editTrip.from || '';
      document.getElementById('mileageTo').value = editTrip.to || '';
      document.getElementById('mileageMiles').value = editTrip.miles;
      document.getElementById('mileageNotes').value = editTrip.notes || '';
      document.getElementById('mileageId').value = editTrip.id;
    } else {
      document.getElementById('mileageModalTitle').textContent = 'Log Trip';
      document.getElementById('mileageDate').value = new Date().toISOString().split('T')[0];
    }

    mileageModal.classList.add('open');
  }

  function closeMileageModal() {
    mileageModal.classList.remove('open');
  }

  // Close modals on overlay click
  entryModal.addEventListener('click', function (e) { if (e.target === entryModal) closeEntryModal(); });
  mileageModal.addEventListener('click', function (e) { if (e.target === mileageModal) closeMileageModal(); });

  // ---- Bulk selection state ----
  var selectedExpenseIds = {};

  // ---- Event delegation ----
  document.addEventListener('click', function (e) {
    var action = e.target.getAttribute('data-action') || (e.target.closest('[data-action]') || {}).getAttribute && (e.target.closest('[data-action]') || {}).getAttribute('data-action');
    if (!action) return;

    switch (action) {
      case 'add-expense':
        openEntryModal('expense');
        break;
      case 'add-income':
        openEntryModal('income');
        break;
      case 'close-modal':
        closeEntryModal();
        break;
      case 'close-mileage-modal':
        closeMileageModal();
        break;
      case 'add-mileage':
        openMileageModal();
        break;
      case 'save-entry':
        saveEntry();
        break;
      case 'save-mileage':
        saveMileage();
        break;
      case 'delete-entry':
        var id = e.target.getAttribute('data-id') || e.target.closest('[data-id]').getAttribute('data-id');
        if (id && confirm('Delete this entry?')) {
          var entries = getTaxEntries();
          saveTaxEntries(entries.filter(function (en) { return en.id !== id; }));
          showToast('Entry deleted.');
          render();
        }
        break;
      case 'edit-entry':
        var eid = e.target.getAttribute('data-id') || e.target.closest('[data-id]').getAttribute('data-id');
        var allE = getTaxEntries();
        var found = allE.find(function (en) { return en.id === eid; });
        if (found) openEntryModal(found.type, found);
        break;
      case 'view-receipt':
        var rid = e.target.getAttribute('data-id') || e.target.closest('[data-id]').getAttribute('data-id');
        var rEntry = getTaxEntries().find(function (en) { return en.id === rid; });
        if (rEntry && rEntry.receiptData) {
          var isImg = rEntry.receiptData.startsWith('data:image');
          var overlay = document.createElement('div');
          overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:pointer';
          overlay.innerHTML = '<div style="background:#fff;border-radius:16px;padding:20px;max-width:700px;max-height:85vh;overflow:auto;box-shadow:0 20px 60px rgba(0,0,0,.2);cursor:default" onclick="event.stopPropagation()">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">' +
              '<div><div style="font-size:1rem;font-weight:700;color:var(--gray-900)">Receipt</div><div style="font-size:.78rem;color:var(--gray-400)">' + (rEntry.receiptName || 'Document') + ' &middot; ' + (rEntry.description || rEntry.category) + '</div></div>' +
              '<div style="display:flex;gap:8px">' +
                '<a href="' + rEntry.receiptData + '" download="' + (rEntry.receiptName || 'receipt') + '" class="btn btn-outline btn-sm" onclick="event.stopPropagation()">Download</a>' +
                '<button class="btn btn-outline btn-sm" onclick="this.closest(\'[style]\').parentElement.remove()" style="padding:4px 10px">&times;</button>' +
              '</div>' +
            '</div>' +
            (isImg ? '<img src="' + rEntry.receiptData + '" style="max-width:100%;border-radius:8px;border:1px solid var(--gray-200)">' : '<div style="padding:40px;text-align:center;background:var(--gray-50);border-radius:8px"><svg viewBox="0 0 24 24" width="48" height="48" fill="var(--indigo)" style="display:block;margin:0 auto 12px"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg><div style="font-size:.88rem;font-weight:600;color:var(--gray-700)">' + (rEntry.receiptName || 'PDF Document') + '</div><a href="' + rEntry.receiptData + '" download="' + (rEntry.receiptName || 'receipt') + '" class="btn btn-primary btn-sm" style="margin-top:12px" onclick="event.stopPropagation()">Download PDF</a></div>') +
          '</div>';
          overlay.addEventListener('click', function () { this.remove(); });
          document.body.appendChild(overlay);
        }
        break;
      case 'delete-trip':
        var tid = e.target.getAttribute('data-id') || e.target.closest('[data-id]').getAttribute('data-id');
        if (tid && confirm('Delete this trip?')) {
          var trips = getMileageTrips();
          saveMileageTrips(trips.filter(function (t) { return t.id !== tid; }));
          showToast('Trip deleted.');
          render();
        }
        break;
      case 'edit-trip':
        var mtid = e.target.getAttribute('data-id') || e.target.closest('[data-id]').getAttribute('data-id');
        var allT = getMileageTrips();
        var foundT = allT.find(function (t) { return t.id === mtid; });
        if (foundT) openMileageModal(foundT);
        break;
      case 'bulk-delete':
        var ids = Object.keys(selectedExpenseIds).filter(function (k) { return selectedExpenseIds[k]; });
        if (ids.length && confirm('Delete ' + ids.length + ' selected expense(s)?')) {
          var ents = getTaxEntries();
          saveTaxEntries(ents.filter(function (en) { return !selectedExpenseIds[en.id]; }));
          selectedExpenseIds = {};
          showToast(ids.length + ' expenses deleted.');
          render();
        }
        break;
      case 'print-report':
        window.print();
        break;
      case 'export-report':
        showToast('Export feature coming soon.', 'info');
        break;
    }
  });

  // Bulk checkbox change
  document.addEventListener('change', function (e) {
    if (e.target.classList.contains('bulk-check')) {
      var id = e.target.getAttribute('data-id');
      selectedExpenseIds[id] = e.target.checked;
      if (!e.target.checked) delete selectedExpenseIds[id];
      renderBulkBar();
    }
    if (e.target.id === 'bulkSelectAll') {
      var checks = document.querySelectorAll('.bulk-check');
      checks.forEach(function (cb) {
        cb.checked = e.target.checked;
        selectedExpenseIds[cb.getAttribute('data-id')] = e.target.checked;
        if (!e.target.checked) delete selectedExpenseIds[cb.getAttribute('data-id')];
      });
      renderBulkBar();
    }
  });

  // Filter changes
  ['filterCategory', 'filterDateFrom', 'filterDateTo', 'filterSort'].forEach(function (id) {
    document.getElementById(id).addEventListener('change', function () { render(); });
  });

  // Report year change
  document.getElementById('reportYear').addEventListener('change', function () { render(); });

  // Receipt file upload handler
  var receiptFileInput = document.getElementById('receiptFile');
  if (receiptFileInput) {
    receiptFileInput.addEventListener('change', function () {
      var file = this.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { showToast('File too large. Max 5MB.', 'error'); this.value = ''; return; }
      var reader = new FileReader();
      reader.onload = function (e) {
        document.getElementById('receiptData').value = e.target.result;
        document.getElementById('receiptName').value = file.name;
        var preview = document.getElementById('receiptPreview');
        var prompt = document.getElementById('receiptPrompt');
        var area = document.getElementById('receiptUploadArea');
        area.style.borderColor = 'var(--indigo)';
        area.style.background = 'var(--indigo-light)';
        prompt.style.display = 'none';
        preview.style.display = 'block';
        if (file.type.startsWith('image/')) {
          preview.innerHTML = '<img src="' + e.target.result + '" style="max-height:80px;border-radius:6px;margin-bottom:4px"><div style="font-size:.78rem;font-weight:600;color:var(--indigo)">' + file.name + '</div><button type="button" onclick="event.stopPropagation();clearReceipt()" style="margin-top:4px;font-size:.72rem;color:var(--rose);background:none;border:none;cursor:pointer;font-weight:600">Remove</button>';
        } else {
          preview.innerHTML = '<div style="display:flex;align-items:center;gap:8px;justify-content:center"><svg viewBox="0 0 24 24" width="24" height="24" fill="var(--indigo)"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg><span style="font-size:.82rem;font-weight:600;color:var(--indigo)">' + file.name + '</span></div><button type="button" onclick="event.stopPropagation();clearReceipt()" style="margin-top:6px;font-size:.72rem;color:var(--rose);background:none;border:none;cursor:pointer;font-weight:600">Remove</button>';
        }
      };
      reader.readAsDataURL(file);
    });
  }

  window.clearReceipt = function () {
    document.getElementById('receiptFile').value = '';
    document.getElementById('receiptData').value = '';
    document.getElementById('receiptName').value = '';
    var preview = document.getElementById('receiptPreview');
    var prompt = document.getElementById('receiptPrompt');
    var area = document.getElementById('receiptUploadArea');
    preview.style.display = 'none';
    preview.innerHTML = '';
    prompt.style.display = 'block';
    area.style.borderColor = 'var(--gray-200)';
    area.style.background = 'var(--gray-50)';
  };

  function saveEntry() {
    var type = document.getElementById('entryType').value;
    var category = document.getElementById('entryCategory').value;
    var amount = document.getElementById('entryAmount').value;
    var date = document.getElementById('entryDate').value;
    var description = document.getElementById('entryDescription').value.trim();
    var vendor = document.getElementById('entryVendor').value.trim();
    var notes = document.getElementById('entryNotes').value.trim();
    var recurring = document.getElementById('entryRecurring').checked;
    var recurFreq = document.getElementById('entryRecurFreq').value;
    var editId = document.getElementById('entryId').value;
    var receiptData = document.getElementById('receiptData').value;
    var receiptFileName = document.getElementById('receiptName').value;

    if (!amount || !date) {
      showToast('Please fill in amount and date.', 'error');
      return;
    }

    var entries = getTaxEntries();
    if (editId) {
      var idx = entries.findIndex(function (en) { return en.id === editId; });
      if (idx !== -1) {
        entries[idx].type = type;
        entries[idx].category = category;
        entries[idx].amount = parseFloat(amount);
        entries[idx].date = date;
        entries[idx].description = description;
        entries[idx].vendor = vendor;
        entries[idx].notes = notes;
        entries[idx].recurring = recurring;
        entries[idx].recurFreq = recurring ? recurFreq : null;
        entries[idx].updatedAt = new Date().toISOString();
        if (receiptData) { entries[idx].receiptData = receiptData; entries[idx].receiptName = receiptFileName; }
        saveTaxEntries(entries);
        showToast('Entry updated.');
      }
    } else {
      var taxSession = Auth.getSession();
      var entry = {
        id: generateId(),
        type: type,
        category: category,
        amount: parseFloat(amount),
        date: date,
        description: description,
        vendor: vendor,
        notes: notes,
        recurring: recurring,
        recurFreq: recurring ? recurFreq : null,
        receiptData: receiptData || null,
        receiptName: receiptFileName || null,
        username: taxSession ? taxSession.username : 'admin',
        createdAt: new Date().toISOString()
      };
      entries.push(entry);
      saveTaxEntries(entries);
      showToast('Entry added.');
    }
    clearReceipt();
    closeEntryModal();
    render();
  }

  function saveMileage() {
    var date = document.getElementById('mileageDate').value;
    var purpose = document.getElementById('mileagePurpose').value;
    var from = document.getElementById('mileageFrom').value.trim();
    var to = document.getElementById('mileageTo').value.trim();
    var miles = document.getElementById('mileageMiles').value;
    var notes = document.getElementById('mileageNotes').value.trim();
    var editId = document.getElementById('mileageId').value;

    if (!date || !miles) {
      showToast('Please fill in date and miles.', 'error');
      return;
    }

    var trips = getMileageTrips();
    if (editId) {
      var idx = trips.findIndex(function (t) { return t.id === editId; });
      if (idx !== -1) {
        trips[idx].date = date;
        trips[idx].purpose = purpose;
        trips[idx].from = from;
        trips[idx].to = to;
        trips[idx].miles = parseFloat(miles);
        trips[idx].notes = notes;
        trips[idx].updatedAt = new Date().toISOString();
        saveMileageTrips(trips);
        showToast('Trip updated.');
      }
    } else {
      var mileSession = Auth.getSession();
      var trip = {
        id: generateId(),
        date: date,
        purpose: purpose,
        from: from,
        to: to,
        miles: parseFloat(miles),
        notes: notes,
        username: mileSession ? mileSession.username : 'admin',
        createdAt: new Date().toISOString()
      };
      trips.push(trip);
      saveMileageTrips(trips);
      showToast('Trip logged.');
    }
    closeMileageModal();
    render();
  }

  // ---- Helper: month name ----
  var MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // ---- Populate report year ----
  function populateReportYear() {
    var sel = document.getElementById('reportYear');
    var currentYear = new Date().getFullYear();
    sel.innerHTML = '';
    for (var y = currentYear; y >= currentYear - 3; y--) {
      var opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      sel.appendChild(opt);
    }
  }
  populateReportYear();

  // ---- Render bulk bar ----
  function renderBulkBar() {
    var count = Object.keys(selectedExpenseIds).filter(function (k) { return selectedExpenseIds[k]; }).length;
    var bar = document.getElementById('bulkBar');
    if (count > 0) {
      bar.style.display = '';
      bar.innerHTML = '<div class="bulk-bar"><span>' + count + ' selected</span><button data-action="bulk-delete">Delete Selected</button></div>';
    } else {
      bar.style.display = 'none';
      bar.innerHTML = '';
    }
  }

  // ---- Main Render ----
  function render() {
    var entries = getTaxEntries();
    var trips = getMileageTrips();
    var txns = Data.getTransactions();
    var closedTxns = txns.filter(function (t) { return t.status === 'closed'; });

    // Agent-level access control
    // Prefer in-memory API user (always correct after login) over reb_session (can be stale)
    var apiUser = (typeof API !== 'undefined' && API.isLoggedIn()) ? API.getUser() : null;
    var taxSession = apiUser ? {
      username: apiUser.username,
      displayName: apiUser.displayName,
      role: apiUser.role
    } : Auth.getSession();
    var isLead = apiUser ? (apiUser.role === 'Team Lead') : Auth.isPrivileged();

    if (isLead && selectedTaxAgent && selectedTaxAgent !== 'all') {
      // Team Lead filtering by selected agent
      var users = JSON.parse(localStorage.getItem(PREFIX + 'users') || '[]');
      var selectedUser = users.find(function (u) { return u.username === selectedTaxAgent; });
      if (selectedUser) {
        entries = entries.filter(function (e) { return e.username === selectedTaxAgent || (!e.username && selectedTaxAgent === 'admin'); });
        trips = trips.filter(function (t) { return t.username === selectedTaxAgent || (!t.username && selectedTaxAgent === 'admin'); });
        closedTxns = closedTxns.filter(function (t) { return t.agent === selectedUser.displayName; });
      }
    } else if (!isLead) {
      // Regular agent only sees their own data
      entries = entries.filter(function (e) { return e.username === taxSession.username || (!e.username && taxSession.username === 'admin'); });
      trips = trips.filter(function (t) { return t.username === taxSession.username || (!t.username && taxSession.username === 'admin'); });
      closedTxns = closedTxns.filter(function (t) { return t.agent === taxSession.displayName; });
    }

    var commRate = settings.commissionRate;
    var agentSplit = settings.agentSplit;

    // Commission income
    var grossCommission = closedTxns.reduce(function (sum, t) {
      return sum + ((parseFloat(t.price) || 0) * commRate);
    }, 0);
    var agentCommission = grossCommission * agentSplit;

    // Manual income
    var incomeEntries = entries.filter(function (e) { return e.type === 'income'; });
    var manualIncomeTotal = incomeEntries.reduce(function (sum, e) { return sum + (e.amount || 0); }, 0);
    var totalIncome = agentCommission + manualIncomeTotal;

    // Expenses
    var expenseEntries = entries.filter(function (e) { return e.type === 'expense'; });
    var totalExpenses = expenseEntries.reduce(function (sum, e) { return sum + (e.amount || 0); }, 0);

    // Mileage deduction
    var totalMiles = trips.reduce(function (sum, t) { return sum + (t.miles || 0); }, 0);
    var mileageDeduction = totalMiles * IRS_MILEAGE_RATE;

    var totalDeductions = totalExpenses + mileageDeduction;
    var netProfit = totalIncome - totalDeductions;
    var estTax = Math.max(0, netProfit * EST_TAX_RATE);
    var ytdSavingsNeeded = estTax;

    // ========== AGENT FILTER (Team Lead only) ==========
    var agentFilterEl = document.getElementById('taxAgentFilter');
    if (agentFilterEl) agentFilterEl.remove();
    if (isLead) {
      var users = JSON.parse(localStorage.getItem(PREFIX + 'users') || '[]');
      var filterHtml = '<div id="taxAgentFilter" style="margin-bottom:16px;display:flex;align-items:center;gap:12px">' +
        '<span style="font-size:.85rem;font-weight:600;color:var(--gray-600)">Viewing:</span>' +
        '<select id="taxAgentSelect" style="padding:8px 14px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:.88rem;font-weight:600;color:var(--gray-800);background:#fff;cursor:pointer">' +
          '<option value="all"' + (selectedTaxAgent === 'all' ? ' selected' : '') + '>All Agents</option>' +
          users.map(function (u) { return '<option value="' + u.username + '"' + (selectedTaxAgent === u.username ? ' selected' : '') + '>' + u.displayName + '</option>'; }).join('') +
        '</select>' +
      '</div>';
      document.getElementById('taxStats').insertAdjacentHTML('beforebegin', filterHtml);
      document.getElementById('taxAgentSelect').addEventListener('change', function () {
        selectedTaxAgent = this.value;
        render();
      });
    }

    // ========== STATS ==========
    document.getElementById('taxStats').innerHTML =
      buildStatCard('emerald', '<path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>', Data.formatCurrencyFull(totalIncome), 'Total Income') +
      buildStatCard('rose', '<path d="M7.5 21H2V9h5.5v12zm7.25-18h-5.5v18h5.5V3zM22 11h-5.5v10H22V11z"/>', Data.formatCurrencyFull(totalDeductions), 'Total Deductions') +
      buildStatCard(netProfit >= 0 ? 'indigo' : 'rose', '<path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>', Data.formatCurrencyFull(netProfit), 'Net Profit') +
      buildStatCard('amber', '<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>', Data.formatCurrencyFull(estTax), 'Est. Tax (25%)') +
      buildStatCard('violet', '<path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>', Data.formatCurrencyFull(ytdSavingsNeeded), 'YTD Savings Needed');

    // ========== OVERVIEW TAB ==========
    renderOverview(entries, closedTxns, trips, commRate, agentSplit, totalIncome, totalExpenses, mileageDeduction, netProfit);

    // ========== INCOME TAB ==========
    renderIncome(closedTxns, incomeEntries, commRate, agentSplit, grossCommission, agentCommission);

    // ========== EXPENSES TAB ==========
    renderExpenses(expenseEntries, totalExpenses);

    // ========== MILEAGE TAB ==========
    renderMileage(trips, totalMiles, mileageDeduction);

    // ========== REPORTS TAB ==========
    renderReports(entries, closedTxns, trips, commRate, agentSplit);
  }

  function buildStatCard(colorClass, svgPath, value, label) {
    return '<div class="stat-card">' +
      '<div class="stat-icon ' + colorClass + '"><svg viewBox="0 0 24 24">' + svgPath + '</svg></div>' +
      '<div><div class="stat-value">' + value + '</div><div class="stat-label">' + label + '</div></div>' +
    '</div>';
  }

  // ========== OVERVIEW ==========
  function renderOverview(entries, closedTxns, trips, commRate, agentSplit, totalIncome, totalExpenses, mileageDeduction, netProfit) {
    // Bar chart: last 6 months income vs expenses
    var now = new Date();
    var months = [];
    for (var i = 5; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ year: d.getFullYear(), month: d.getMonth(), label: MONTH_NAMES[d.getMonth()] });
    }

    var monthlyIncome = {};
    var monthlyExpense = {};
    months.forEach(function (m) {
      var key = m.year + '-' + m.month;
      monthlyIncome[key] = 0;
      monthlyExpense[key] = 0;
    });

    // Commission income by close date
    closedTxns.forEach(function (t) {
      if (!t.closeDate) return;
      var d = new Date(t.closeDate);
      var key = d.getFullYear() + '-' + d.getMonth();
      if (monthlyIncome[key] !== undefined) {
        monthlyIncome[key] += (parseFloat(t.price) || 0) * commRate * agentSplit;
      }
    });

    entries.forEach(function (e) {
      if (!e.date) return;
      var d = new Date(e.date);
      var key = d.getFullYear() + '-' + d.getMonth();
      if (e.type === 'income' && monthlyIncome[key] !== undefined) {
        monthlyIncome[key] += (e.amount || 0);
      }
      if (e.type === 'expense' && monthlyExpense[key] !== undefined) {
        monthlyExpense[key] += (e.amount || 0);
      }
    });

    var maxVal = 1;
    months.forEach(function (m) {
      var key = m.year + '-' + m.month;
      maxVal = Math.max(maxVal, monthlyIncome[key], monthlyExpense[key]);
    });

    var chartEl = document.getElementById('overviewBarChart');
    chartEl.innerHTML = months.map(function (m) {
      var key = m.year + '-' + m.month;
      var incH = Math.max(2, (monthlyIncome[key] / maxVal) * 160);
      var expH = Math.max(2, (monthlyExpense[key] / maxVal) * 160);
      return '<div class="bar-group">' +
        '<div class="bar-pair">' +
          '<div class="bar-col" style="height:' + incH + 'px;background:var(--indigo);"></div>' +
          '<div class="bar-col" style="height:' + expH + 'px;background:#F43F5E;"></div>' +
        '</div>' +
        '<div class="bar-label">' + m.label + '</div>' +
      '</div>';
    }).join('');

    // Donut chart: top expense categories
    var expenseEntries = entries.filter(function (e) { return e.type === 'expense'; });
    var catTotals = {};
    expenseEntries.forEach(function (e) {
      var cat = e.category || 'Other';
      catTotals[cat] = (catTotals[cat] || 0) + (e.amount || 0);
    });
    var catArr = Object.keys(catTotals).map(function (cat) {
      return { name: cat, total: catTotals[cat] };
    }).sort(function (a, b) { return b.total - a.total; });

    var expTotal = expenseEntries.reduce(function (s, e) { return s + (e.amount || 0); }, 0);
    var donutEl = document.getElementById('overviewDonut');

    if (catArr.length === 0) {
      donutEl.innerHTML = '<p style="font-size:.85rem;color:var(--gray-400);">No expenses recorded yet.</p>';
    } else {
      // Build conic gradient
      var gradParts = [];
      var angle = 0;
      catArr.forEach(function (c) {
        var pct = expTotal > 0 ? (c.total / expTotal * 360) : 0;
        gradParts.push(getCatColor(c.name) + ' ' + angle + 'deg ' + (angle + pct) + 'deg');
        angle += pct;
      });

      var topCats = catArr.slice(0, 8);
      donutEl.innerHTML = '<div class="donut-wrap">' +
        '<div class="donut-chart" style="background:conic-gradient(' + gradParts.join(',') + ');">' +
          '<div class="donut-center">' +
            '<div class="donut-center-val">' + catArr.length + '</div>' +
            '<div class="donut-center-lbl">Categories</div>' +
          '</div>' +
        '</div>' +
        '<div class="donut-legend">' +
          topCats.map(function (c) {
            var pct = expTotal > 0 ? (c.total / expTotal * 100).toFixed(1) : 0;
            return '<div class="donut-legend-item">' +
              '<div class="donut-legend-dot" style="background:' + getCatColor(c.name) + ';"></div>' +
              '<div class="donut-legend-name">' + c.name + '</div>' +
              '<div class="donut-legend-val">' + pct + '%</div>' +
            '</div>';
          }).join('') +
          (catArr.length > 8 ? '<div style="font-size:.72rem;color:var(--gray-400);">+ ' + (catArr.length - 8) + ' more</div>' : '') +
        '</div>' +
      '</div>';
    }

    // Quick stats
    var avgMonthlyExp = expTotal > 0 ? expTotal / 6 : 0;
    var biggestCat = catArr.length > 0 ? catArr[0].name : 'N/A';
    var deductionCount = expenseEntries.length + trips.length;
    document.getElementById('overviewQuickStats').innerHTML =
      '<div class="quick-stat"><div class="quick-stat-label">Avg Monthly Expense</div><div class="quick-stat-value">' + Data.formatCurrencyFull(avgMonthlyExp) + '</div></div>' +
      '<div class="quick-stat"><div class="quick-stat-label">Biggest Category</div><div class="quick-stat-value">' + biggestCat + '</div></div>' +
      '<div class="quick-stat"><div class="quick-stat-label">Total Deductions</div><div class="quick-stat-value">' + deductionCount + ' items</div></div>' +
      '<div class="quick-stat"><div class="quick-stat-label">Mileage Deduction</div><div class="quick-stat-value">' + Data.formatCurrencyFull(mileageDeduction) + '</div></div>';
  }

  // ========== INCOME ==========
  function renderIncome(closedTxns, incomeEntries, commRate, agentSplit, grossCommission, agentCommission) {
    var ratePct = (commRate * 100).toFixed(commRate * 100 % 1 === 0 ? 0 : 2);
    var splitPct = (agentSplit * 100).toFixed(0);

    document.getElementById('incomeTotalBadge').textContent = '+' + Data.formatCurrencyFull(agentCommission);

    var commList = document.getElementById('commissionList');
    if (closedTxns.length === 0) {
      commList.innerHTML = '<div class="empty-state" style="padding:40px 20px;"><h3>No closings yet</h3><p>Close transactions to see commission income.</p></div>';
    } else {
      commList.innerHTML = closedTxns.map(function (t) {
        var gross = (parseFloat(t.price) || 0) * commRate;
        var net = gross * agentSplit;
        return '<div class="expense-row">' +
          '<div class="expense-cat-dot" style="background:var(--emerald);"></div>' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="font-size:.88rem;font-weight:600;color:var(--gray-800);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + t.address + '</div>' +
            '<div style="font-size:.75rem;color:var(--gray-400);">' + (t.agent || '') + ' &middot; Closed ' + Data.formatDate(t.closeDate) + '</div>' +
          '</div>' +
          '<div style="text-align:right;">' +
            '<div style="font-size:.92rem;font-weight:700;color:var(--emerald);">+' + Data.formatCurrencyFull(net) + '</div>' +
            '<div style="font-size:.72rem;color:var(--gray-400);">' + ratePct + '% of ' + Data.formatCurrencyFull(t.price) + ' &times; ' + splitPct + '% split</div>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    // Manual income
    var manualList = document.getElementById('manualIncomeList');
    if (incomeEntries.length === 0) {
      manualList.innerHTML = '<div class="empty-state" style="padding:30px 20px;"><h3>No manual income entries</h3><p>Add referral fees, bonuses, or other income.</p></div>';
    } else {
      manualList.innerHTML = incomeEntries.sort(function (a, b) { return new Date(b.date) - new Date(a.date); }).map(function (e) {
        return '<div class="expense-row">' +
          '<div class="expense-cat-dot" style="background:' + getCatColor(e.category) + ';"></div>' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="font-size:.88rem;font-weight:600;color:var(--gray-800);">' + (e.description || e.category) + '</div>' +
            '<div style="font-size:.75rem;color:var(--gray-400);">' + e.category + (e.vendor ? ' &middot; ' + e.vendor : '') + ' &middot; ' + Data.formatDate(e.date) + '</div>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:8px;">' +
            '<div style="font-size:.92rem;font-weight:700;color:var(--emerald);">+' + Data.formatCurrencyFull(e.amount) + '</div>' +
            '<button class="btn btn-outline btn-sm" data-action="edit-entry" data-id="' + e.id + '" style="padding:4px 8px;">Edit</button>' +
            '<button class="btn btn-outline btn-sm" data-action="delete-entry" data-id="' + e.id + '" style="padding:4px 8px;color:var(--rose);">Del</button>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    // Income by month
    var byMonth = document.getElementById('incomeByMonth');
    var now = new Date();
    var monthData = [];
    for (var i = 0; i < 12; i++) {
      var m = new Date(now.getFullYear(), i, 1);
      var key = now.getFullYear() + '-' + String(i + 1).padStart(2, '0');
      var commInc = 0;
      closedTxns.forEach(function (t) {
        if (t.closeDate && t.closeDate.startsWith(key)) {
          commInc += (parseFloat(t.price) || 0) * commRate * agentSplit;
        }
      });
      var manualInc = 0;
      incomeEntries.forEach(function (e) {
        if (e.date && e.date.startsWith(key)) {
          manualInc += (e.amount || 0);
        }
      });
      monthData.push({ label: MONTH_NAMES[i], total: commInc + manualInc });
    }
    var maxInc = Math.max.apply(null, monthData.map(function (m) { return m.total; })) || 1;
    byMonth.innerHTML = monthData.map(function (m) {
      var pct = (m.total / maxInc * 100).toFixed(1);
      return '<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">' +
        '<div style="width:36px;font-size:.75rem;font-weight:600;color:var(--gray-500);text-align:right;">' + m.label + '</div>' +
        '<div style="flex:1;background:var(--gray-50);border-radius:6px;height:24px;overflow:hidden;">' +
          '<div style="width:' + pct + '%;background:var(--emerald);height:100%;border-radius:6px;min-width:' + (m.total > 0 ? '2px' : '0') + ';"></div>' +
        '</div>' +
        '<div style="width:80px;font-size:.78rem;font-weight:700;color:var(--gray-700);text-align:right;">' + Data.formatCurrencyFull(m.total) + '</div>' +
      '</div>';
    }).join('');
  }

  // ========== EXPENSES ==========
  function renderExpenses(expenseEntries, totalExpenses) {
    var filterCat = document.getElementById('filterCategory').value;
    var filterFrom = document.getElementById('filterDateFrom').value;
    var filterTo = document.getElementById('filterDateTo').value;
    var sortBy = document.getElementById('filterSort').value;

    var filtered = expenseEntries.slice();
    if (filterCat) filtered = filtered.filter(function (e) { return e.category === filterCat; });
    if (filterFrom) filtered = filtered.filter(function (e) { return e.date >= filterFrom; });
    if (filterTo) filtered = filtered.filter(function (e) { return e.date <= filterTo; });

    switch (sortBy) {
      case 'date-desc': filtered.sort(function (a, b) { return new Date(b.date) - new Date(a.date); }); break;
      case 'date-asc': filtered.sort(function (a, b) { return new Date(a.date) - new Date(b.date); }); break;
      case 'amount-desc': filtered.sort(function (a, b) { return b.amount - a.amount; }); break;
      case 'amount-asc': filtered.sort(function (a, b) { return a.amount - b.amount; }); break;
      case 'category': filtered.sort(function (a, b) { return a.category.localeCompare(b.category); }); break;
    }

    // Category breakdown (unfiltered)
    var catTotals = {};
    expenseEntries.forEach(function (e) {
      var cat = e.category || 'Other';
      catTotals[cat] = (catTotals[cat] || 0) + (e.amount || 0);
    });
    var catArr = Object.keys(catTotals).map(function (cat) {
      return { name: cat, total: catTotals[cat] };
    }).sort(function (a, b) { return b.total - a.total; });

    // Expense bar
    var barEl = document.getElementById('expenseBar');
    if (totalExpenses > 0 && catArr.length > 0) {
      barEl.innerHTML = catArr.map(function (c) {
        var pct = (c.total / totalExpenses * 100);
        return '<div style="width:' + pct + '%;background:' + getCatColor(c.name) + ';" title="' + c.name + ': ' + Data.formatCurrencyFull(c.total) + '"></div>';
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
        var color = getCatColor(c.name);
        var pct = totalExpenses > 0 ? (c.total / totalExpenses * 100).toFixed(1) : 0;
        return '<div class="category-card">' +
          '<div class="category-icon" style="background:' + color + '18;color:' + color + ';">' +
            '<div style="width:12px;height:12px;border-radius:50%;background:' + color + ';"></div>' +
          '</div>' +
          '<div style="flex:1;">' +
            '<div class="category-name">' + c.name + '</div>' +
            '<div class="category-amount">' + Data.formatCurrencyFull(c.total) + '</div>' +
            '<div style="font-size:.7rem;color:var(--gray-400);">' + pct + '% of total</div>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    // Monthly expense trend
    var now = new Date();
    var trendMonths = [];
    for (var i = 5; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      var total = 0;
      expenseEntries.forEach(function (e) {
        if (e.date && e.date.startsWith(key)) total += (e.amount || 0);
      });
      trendMonths.push({ label: MONTH_NAMES[d.getMonth()], total: total });
    }
    var maxExp = Math.max.apply(null, trendMonths.map(function (m) { return m.total; })) || 1;
    document.getElementById('expenseTrendChart').innerHTML = trendMonths.map(function (m) {
      var h = Math.max(2, (m.total / maxExp) * 120);
      return '<div class="bar-group">' +
        '<div class="bar-pair">' +
          '<div class="bar-col" style="height:' + h + 'px;background:#F43F5E;width:28px;"></div>' +
        '</div>' +
        '<div class="bar-label">' + m.label + '<br><span style="font-size:.6rem;color:var(--gray-500);">' + Data.formatCurrency(m.total) + '</span></div>' +
      '</div>';
    }).join('');

    // Expense list
    var expList = document.getElementById('expenseList');
    if (filtered.length === 0) {
      expList.innerHTML = '<div class="empty-state" style="padding:40px 20px;"><h3>No expenses found</h3><p>' + (expenseEntries.length > 0 ? 'Try adjusting your filters.' : 'Add your first expense to start tracking.') + '</p></div>';
    } else {
      expList.innerHTML = filtered.map(function (e) {
        var color = getCatColor(e.category);
        var isChecked = selectedExpenseIds[e.id] ? ' checked' : '';
        var receiptHtml = '';
        if (e.receiptData) {
          var isImage = e.receiptData.startsWith('data:image');
          receiptHtml = '<div style="display:flex;align-items:center;gap:6px">' +
            (isImage
              ? '<div style="width:36px;height:36px;border-radius:6px;overflow:hidden;border:1px solid var(--gray-200);flex-shrink:0;cursor:pointer" data-action="view-receipt" data-id="' + e.id + '"><img src="' + e.receiptData + '" style="width:100%;height:100%;object-fit:cover"></div>'
              : '<div style="width:36px;height:36px;border-radius:6px;background:var(--indigo-light);display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer" data-action="view-receipt" data-id="' + e.id + '"><svg viewBox="0 0 24 24" width="16" height="16" fill="var(--indigo)"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg></div>') +
          '</div>';
        }
        return '<div class="expense-row">' +
          '<input type="checkbox" class="bulk-check" data-id="' + e.id + '"' + isChecked + ' style="accent-color:var(--indigo)">' +
          '<div class="expense-cat-dot" style="background:' + color + ';"></div>' +
          (receiptHtml ? receiptHtml : '') +
          '<div style="flex:1;min-width:0;">' +
            '<div style="font-size:.88rem;font-weight:600;color:var(--gray-800);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (e.description || e.category) + '</div>' +
            '<div style="font-size:.75rem;color:var(--gray-400);">' + e.category + (e.vendor ? ' &middot; ' + e.vendor : '') + ' &middot; ' + Data.formatDate(e.date) + (e.receiptName ? ' &middot; <span style="color:var(--indigo);font-weight:600">' + e.receiptName + '</span>' : '') + '</div>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:8px;">' +
            '<div style="font-size:.92rem;font-weight:700;color:var(--rose);">-' + Data.formatCurrencyFull(e.amount) + '</div>' +
            '<button class="btn btn-outline btn-sm" data-action="edit-entry" data-id="' + e.id + '" style="padding:4px 8px;">Edit</button>' +
            '<button class="btn btn-outline btn-sm" data-action="delete-entry" data-id="' + e.id + '" style="padding:4px 8px;color:var(--rose);">Del</button>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    renderBulkBar();
  }

  // ========== MILEAGE ==========
  function renderMileage(trips, totalMiles, mileageDeduction) {
    // Stats
    document.getElementById('mileageStats').innerHTML =
      buildStatCard('indigo', '<path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>', totalMiles.toFixed(1) + ' mi', 'Total Miles') +
      buildStatCard('emerald', '<path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>', Data.formatCurrencyFull(mileageDeduction), 'Mileage Deduction') +
      buildStatCard('amber', '<path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>', trips.length.toString(), 'Total Trips');

    // Trip list
    var tripList = document.getElementById('tripList');
    if (trips.length === 0) {
      tripList.innerHTML = '<div class="empty-state" style="padding:40px 20px;"><h3>No trips logged</h3><p>Log your first trip to start tracking mileage.</p></div>';
    } else {
      var sorted = trips.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
      tripList.innerHTML = sorted.map(function (t) {
        var ded = (t.miles || 0) * IRS_MILEAGE_RATE;
        return '<div class="trip-row">' +
          '<div style="width:10px;height:10px;border-radius:50%;background:var(--indigo);flex-shrink:0;"></div>' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="font-size:.88rem;font-weight:600;color:var(--gray-800);">' + (t.from || '?') + ' &rarr; ' + (t.to || '?') + '</div>' +
            '<div style="font-size:.75rem;color:var(--gray-400);">' + t.purpose + ' &middot; ' + Data.formatDate(t.date) + (t.notes ? ' &middot; ' + t.notes : '') + '</div>' +
          '</div>' +
          '<div style="text-align:right;min-width:90px;">' +
            '<div style="font-size:.92rem;font-weight:700;color:var(--gray-800);">' + t.miles.toFixed(1) + ' mi</div>' +
            '<div style="font-size:.72rem;color:var(--emerald);font-weight:600;">' + Data.formatCurrencyFull(ded) + ' ded.</div>' +
          '</div>' +
          '<div style="display:flex;gap:4px;">' +
            '<button class="btn btn-outline btn-sm" data-action="edit-trip" data-id="' + t.id + '" style="padding:4px 8px;">Edit</button>' +
            '<button class="btn btn-outline btn-sm" data-action="delete-trip" data-id="' + t.id + '" style="padding:4px 8px;color:var(--rose);">Del</button>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    // Monthly mileage summary
    var monthlyMiles = {};
    trips.forEach(function (t) {
      if (!t.date) return;
      var key = t.date.substring(0, 7); // YYYY-MM
      monthlyMiles[key] = (monthlyMiles[key] || 0) + (t.miles || 0);
    });
    var monthKeys = Object.keys(monthlyMiles).sort();
    var mileageMonthly = document.getElementById('mileageMonthly');
    if (monthKeys.length === 0) {
      mileageMonthly.innerHTML = '<p style="font-size:.85rem;color:var(--gray-400);">No mileage data yet.</p>';
    } else {
      mileageMonthly.innerHTML = '<div class="mileage-month-grid">' + monthKeys.map(function (key) {
        var parts = key.split('-');
        var mLabel = MONTH_NAMES[parseInt(parts[1]) - 1] + ' ' + parts[0];
        var miles = monthlyMiles[key];
        var ded = miles * IRS_MILEAGE_RATE;
        return '<div class="mileage-month-card">' +
          '<div class="mileage-month-name">' + mLabel + '</div>' +
          '<div class="mileage-month-miles">' + miles.toFixed(1) + ' mi</div>' +
          '<div class="mileage-month-ded">' + Data.formatCurrencyFull(ded) + '</div>' +
        '</div>';
      }).join('') + '</div>';
    }
  }

  // ========== REPORTS ==========
  function renderReports(entries, closedTxns, trips, commRate, agentSplit) {
    var year = parseInt(document.getElementById('reportYear').value);

    // Filter by year
    var yearEntries = entries.filter(function (e) { return e.date && e.date.startsWith(String(year)); });
    var yearTxns = closedTxns.filter(function (t) { return t.closeDate && t.closeDate.startsWith(String(year)); });
    var yearTrips = trips.filter(function (t) { return t.date && t.date.startsWith(String(year)); });

    var grossComm = yearTxns.reduce(function (s, t) { return s + ((parseFloat(t.price) || 0) * commRate); }, 0);
    var agentComm = grossComm * agentSplit;
    var manualIncome = yearEntries.filter(function (e) { return e.type === 'income'; }).reduce(function (s, e) { return s + (e.amount || 0); }, 0);
    var totalIncome = agentComm + manualIncome;

    // Expenses by category
    var yearExpenses = yearEntries.filter(function (e) { return e.type === 'expense'; });
    var catTotals = {};
    yearExpenses.forEach(function (e) {
      var cat = e.category || 'Other';
      catTotals[cat] = (catTotals[cat] || 0) + (e.amount || 0);
    });
    var catArr = Object.keys(catTotals).map(function (cat) {
      return { name: cat, total: catTotals[cat] };
    }).sort(function (a, b) { return b.total - a.total; });

    var totalExp = yearExpenses.reduce(function (s, e) { return s + (e.amount || 0); }, 0);
    var totalMiles = yearTrips.reduce(function (s, t) { return s + (t.miles || 0); }, 0);
    var mileageDed = totalMiles * IRS_MILEAGE_RATE;
    var totalDeductions = totalExp + mileageDed;
    var netProfit = totalIncome - totalDeductions;

    // Schedule C Preview
    var schedC = document.getElementById('scheduleCPreview');
    var rows = '<div class="sched-c-row"><div class="sched-c-label">Gross Commission Income</div><div class="sched-c-value">' + Data.formatCurrencyFull(agentComm) + '</div></div>';
    rows += '<div class="sched-c-row"><div class="sched-c-label">Other Income (referrals, bonuses)</div><div class="sched-c-value">' + Data.formatCurrencyFull(manualIncome) + '</div></div>';
    rows += '<div class="sched-c-row total"><div class="sched-c-label">Total Gross Income</div><div class="sched-c-value" style="color:var(--emerald);">' + Data.formatCurrencyFull(totalIncome) + '</div></div>';
    rows += '<div style="height:16px;"></div>';
    rows += '<div style="font-size:.82rem;font-weight:700;color:var(--gray-500);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px;">Expenses</div>';

    catArr.forEach(function (c) {
      rows += '<div class="sched-c-row"><div class="sched-c-label">' + c.name + '</div><div class="sched-c-value">(' + Data.formatCurrencyFull(c.total) + ')</div></div>';
    });

    if (mileageDed > 0) {
      rows += '<div class="sched-c-row"><div class="sched-c-label">Mileage Deduction (' + totalMiles.toFixed(1) + ' mi &times; $0.67)</div><div class="sched-c-value">(' + Data.formatCurrencyFull(mileageDed) + ')</div></div>';
    }

    rows += '<div class="sched-c-row total"><div class="sched-c-label">Total Expenses &amp; Deductions</div><div class="sched-c-value" style="color:var(--rose);">(' + Data.formatCurrencyFull(totalDeductions) + ')</div></div>';
    rows += '<div style="height:8px;"></div>';
    rows += '<div class="sched-c-row total" style="font-size:1.05rem;"><div class="sched-c-label">Net Profit (Schedule C Line 31)</div><div class="sched-c-value" style="color:' + (netProfit >= 0 ? 'var(--emerald)' : 'var(--rose)') + ';">' + Data.formatCurrencyFull(netProfit) + '</div></div>';
    schedC.innerHTML = rows;

    // Quarterly estimates
    var quarterlyEl = document.getElementById('quarterlyEstimates');
    var annualTax = Math.max(0, netProfit * EST_TAX_RATE);
    var quarterlyPayment = annualTax / 4;
    var deadlines = ['Apr 15', 'Jun 15', 'Sep 15', 'Jan 15 (next yr)'];
    var qLabels = ['Q1', 'Q2', 'Q3', 'Q4'];

    quarterlyEl.innerHTML = '<div class="quarterly-grid">' + qLabels.map(function (q, i) {
      return '<div class="quarter-card">' +
        '<div class="quarter-label">' + q + ' — ' + year + '</div>' +
        '<div class="quarter-amount">' + Data.formatCurrencyFull(quarterlyPayment) + '</div>' +
        '<div class="quarter-sub">Due ' + deadlines[i] + '</div>' +
      '</div>';
    }).join('') + '</div>' +
    '<div style="margin-top:12px;font-size:.82rem;color:var(--gray-500);">Annual estimated tax: ' + Data.formatCurrencyFull(annualTax) + ' (25% of ' + Data.formatCurrencyFull(netProfit) + ' net profit)</div>';

    // Category breakdown for tax prep
    var breakdownEl = document.getElementById('reportCategoryBreakdown');
    if (catArr.length === 0 && mileageDed === 0) {
      breakdownEl.innerHTML = '<p style="font-size:.85rem;color:var(--gray-400);">No expenses for ' + year + '.</p>';
    } else {
      var maxCat = catArr.length > 0 ? catArr[0].total : mileageDed;
      if (mileageDed > maxCat) maxCat = mileageDed;

      var bRows = catArr.map(function (c) {
        var pct = maxCat > 0 ? (c.total / maxCat * 100) : 0;
        var countInCat = yearExpenses.filter(function (e) { return e.category === c.name; }).length;
        return '<div style="margin-bottom:12px;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
            '<div style="display:flex;align-items:center;gap:8px;">' +
              '<div style="width:10px;height:10px;border-radius:50%;background:' + getCatColor(c.name) + ';"></div>' +
              '<span style="font-size:.85rem;font-weight:600;color:var(--gray-700);">' + c.name + '</span>' +
              '<span style="font-size:.72rem;color:var(--gray-400);">(' + countInCat + ' entries)</span>' +
            '</div>' +
            '<span style="font-size:.88rem;font-weight:700;color:var(--gray-800);">' + Data.formatCurrencyFull(c.total) + '</span>' +
          '</div>' +
          '<div style="height:6px;background:var(--gray-50);border-radius:6px;overflow:hidden;">' +
            '<div style="width:' + pct + '%;height:100%;background:' + getCatColor(c.name) + ';border-radius:6px;"></div>' +
          '</div>' +
        '</div>';
      });

      if (mileageDed > 0) {
        var mPct = maxCat > 0 ? (mileageDed / maxCat * 100) : 0;
        bRows.push('<div style="margin-bottom:12px;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
            '<div style="display:flex;align-items:center;gap:8px;">' +
              '<div style="width:10px;height:10px;border-radius:50%;background:#3B82F6;"></div>' +
              '<span style="font-size:.85rem;font-weight:600;color:var(--gray-700);">Mileage Deduction</span>' +
              '<span style="font-size:.72rem;color:var(--gray-400);">(' + yearTrips.length + ' trips, ' + totalMiles.toFixed(1) + ' mi)</span>' +
            '</div>' +
            '<span style="font-size:.88rem;font-weight:700;color:var(--gray-800);">' + Data.formatCurrencyFull(mileageDed) + '</span>' +
          '</div>' +
          '<div style="height:6px;background:var(--gray-50);border-radius:6px;overflow:hidden;">' +
            '<div style="width:' + mPct + '%;height:100%;background:#3B82F6;border-radius:6px;"></div>' +
          '</div>' +
        '</div>');
      }

      breakdownEl.innerHTML = bRows.join('');
    }
  }

  // ---- Init ----
  render();

  // Re-render after bridge loads so role/session data is always fresh
  document.addEventListener('apiBridgeReady', function () { render(); });

})();
