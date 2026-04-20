/* ============================================================
   RE Back Office — Transactions Page (Complete Rewrite)
   List View + Full-Page Detail View
   ============================================================ */

(function () {
  'use strict';

  Auth.requireAuth();
  populateSidebarUser();
  setActiveNav();
  initSidebarToggle();
  applyPageColor('escrows');

  document.getElementById('logoutBtn').addEventListener('click', function () {
    Auth.logout();
  });

  // ---- State ----
  var viewMode = 'list';       // 'list' or 'detail'
  var selectedTxnId = null;
  var fromDealRoom = false;

  // Deep-link: open specific transaction
  (function () {
    if (window._forceDetailMode) {
      fromDealRoom = true;
      if (window._forceDetailId) {
        selectedTxnId = window._forceDetailId;
        viewMode = 'detail';
      } else {
        viewMode = 'form';
      }
    } else {
      var params = new URLSearchParams(window.location.search);
      var deepId = params.get('id');
      if (params.get('from') === 'dealRoom' || params.get('from') === 'dashboard') fromDealRoom = true;
      if (params.get('action') === 'new') viewMode = 'form';
      if (deepId) { selectedTxnId = deepId; viewMode = 'detail'; }
    }
    if (fromDealRoom) {
      var topH1 = document.querySelector('.topbar-title h1');
      if (topH1) topH1.textContent = viewMode === 'form' ? 'New Escrow' : 'Deal Detail';
    }
  })();
  var editingId = null;
  var _detailRendered = false;
  var editingPartyType = null; // 'buyer' or 'seller'

  // ---- DOM refs ----
  var pageBody = document.getElementById('pageBody');
  var txnModal = document.getElementById('txnModal');
  var modalTitle = document.getElementById('modalTitle');
  var txnForm = document.getElementById('txnForm');
  var partyModal = document.getElementById('partyModal');
  var partyModalTitle = document.getElementById('partyModalTitle');

  // ---- Helpers ----
  var PREFIX = 'reb_';

  function getUsers() {
    try { return JSON.parse(localStorage.getItem(PREFIX + 'users') || '[]'); } catch (e) { return []; }
  }

  function getParties() {
    try { return JSON.parse(localStorage.getItem(PREFIX + 'txn_parties') || '{}'); } catch (e) { return {}; }
  }

  function saveParties(data) {
    localStorage.setItem(PREFIX + 'txn_parties', JSON.stringify(data));
  }

  function getNotes() {
    try { return JSON.parse(localStorage.getItem(PREFIX + 'txn_notes') || '{}'); } catch (e) { return {}; }
  }

  function saveNotes(data) {
    localStorage.setItem(PREFIX + 'txn_notes', JSON.stringify(data));
  }

  function getKeyDates() {
    try { return JSON.parse(localStorage.getItem(PREFIX + 'txn_key_dates') || '{}'); } catch (e) { return {}; }
  }

  function saveKeyDates(data) {
    localStorage.setItem(PREFIX + 'txn_key_dates', JSON.stringify(data));
  }

  var DEFAULT_KEY_DATES = [
    { label: 'Earnest Money Due' },
    { label: 'Inspection Deadline' },
    { label: 'Appraisal Deadline' },
    { label: 'Loan Contingency Removal' },
    { label: 'Seller Disclosure Deadline' },
    { label: 'HOA Document Review' }
  ];

  function getCalendarEvents() {
    try { return JSON.parse(localStorage.getItem(PREFIX + 'calendar_events') || '[]'); } catch (e) { return []; }
  }

  function saveCalendarEvents(events) {
    localStorage.setItem(PREFIX + 'calendar_events', JSON.stringify(events));
  }

  // ---- Client Updates (milestone timeline sent to portal) ----
  function getUpdates() {
    try { return JSON.parse(localStorage.getItem(PREFIX + 'txn_updates') || '{}'); } catch (e) { return {}; }
  }

  function saveUpdates(data) {
    localStorage.setItem(PREFIX + 'txn_updates', JSON.stringify(data));
  }

  function addUpdate(txnId, type, title, detail, auto) {
    var allUpdates = getUpdates();
    if (!allUpdates[txnId]) allUpdates[txnId] = [];
    var session = Auth.getSession();
    allUpdates[txnId].push({
      id: generateId(),
      type: type,         // milestone, status, note, appointment
      title: title,
      detail: detail || '',
      auto: !!auto,       // true = system-generated
      author: session ? session.displayName : 'System',
      timestamp: new Date().toISOString()
    });
    saveUpdates(allUpdates);
  }

  // Milestone options for the Update Client dropdown — read from admin config or use defaults
  var MILESTONES = (function () {
    try {
      var raw = localStorage.getItem('reb_portal_config');
      if (raw) {
        var cfg = JSON.parse(raw);
        if (cfg.txnMilestones && cfg.txnMilestones.length) return cfg.txnMilestones;
      }
    } catch (e) {}
    return [
      { key: 'offer_accepted',    label: 'Offer Accepted',         icon: '🎉' },
      { key: 'earnest_deposited', label: 'Earnest Money Deposited', icon: '💰' },
      { key: 'inspection_scheduled', label: 'Inspection Scheduled', icon: '📅' },
      { key: 'inspection_complete', label: 'Inspection Complete',   icon: '✅' },
      { key: 'repairs_requested', label: 'Repairs Requested',       icon: '🔧' },
      { key: 'repairs_agreed',    label: 'Repairs Agreed Upon',     icon: '🤝' },
      { key: 'appraisal_ordered', label: 'Appraisal Ordered',      icon: '📋' },
      { key: 'appraisal_complete', label: 'Appraisal Complete',     icon: '📊' },
      { key: 'appraisal_came_in', label: 'Appraisal Came In at Value', icon: '✅' },
      { key: 'appraisal_low',    label: 'Appraisal Came In Low',   icon: '⚠️' },
      { key: 'loan_approved',    label: 'Loan Approved',            icon: '🏦' },
      { key: 'clear_to_close',   label: 'Clear to Close',           icon: '🎯' },
      { key: 'closing_scheduled', label: 'Closing Date Scheduled',  icon: '📆' },
      { key: 'final_walkthrough', label: 'Final Walkthrough',       icon: '🏠' },
      { key: 'closing_complete', label: 'Closing Complete!',         icon: '🔑' },
      { key: 'keys_delivered',   label: 'Keys Delivered',            icon: '🗝️' },
      { key: 'custom',           label: 'Custom Update...',          icon: '✏️' }
    ];
  })();

  function generateId() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
  }

  function migratePartyData(data) {
    if (!data) return { buyers: [], sellers: [], contacts: {} };
    if (data.buyer && !data.buyers) {
      data.buyers = [];
      if (data.buyer.name || data.buyer.phone || data.buyer.email) {
        data.buyers.push({ name: data.buyer.name || '', phone: data.buyer.phone || '', email: data.buyer.email || '', relationship: 'Primary' });
      }
      if (data.buyer.spouse && data.buyer.spouse.name) {
        data.buyers.push({ name: data.buyer.spouse.name, phone: data.buyer.spouse.phone || '', email: data.buyer.spouse.email || '', relationship: data.buyer.spouse.relationship || 'Spouse' });
      }
      delete data.buyer;
    }
    if (data.seller && !data.sellers) {
      data.sellers = [];
      if (data.seller.name || data.seller.phone || data.seller.email) {
        data.sellers.push({ name: data.seller.name || '', phone: data.seller.phone || '', email: data.seller.email || '', relationship: 'Primary' });
      }
      if (data.seller.spouse && data.seller.spouse.name) {
        data.sellers.push({ name: data.seller.spouse.name, phone: data.seller.spouse.phone || '', email: data.seller.spouse.email || '', relationship: data.seller.spouse.relationship || 'Spouse' });
      }
      delete data.seller;
    }
    if (!data.buyers) data.buyers = [];
    if (!data.sellers) data.sellers = [];
    if (data.contacts) {
      ['escrow','title','lender','otherAgent','tc','assistant'].forEach(function(key) {
        var c = data.contacts[key];
        if (c && c.contact !== undefined && c.phone === undefined) {
          c.phone = '';
          c.email = '';
          if (!c.name) c.name = c.contact || '';
          delete c.contact;
        }
      });
    }
    if (!data.contacts) data.contacts = {};
    return data;
  }

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---- Checklist helpers ----
  var DEFAULT_CHECKLIST_TEMPLATES = [
    {
      id: 'tpl-buyer-closing', name: 'Buyer Closing Checklist', category: 'escrow',
      items: [
        { id: 'i1', label: 'Earnest money deposited' }, { id: 'i2', label: 'Home inspection scheduled' },
        { id: 'i3', label: 'Home inspection complete' }, { id: 'i4', label: 'Repair negotiations' },
        { id: 'i5', label: 'Appraisal ordered' }, { id: 'i6', label: 'Appraisal complete' },
        { id: 'i7', label: 'Loan approved' }, { id: 'i8', label: 'Clear to close' },
        { id: 'i9', label: 'Final walkthrough' }, { id: 'i10', label: 'Closing day' }
      ]
    },
    {
      id: 'tpl-seller-closing', name: 'Seller Closing Checklist', category: 'escrow',
      items: [
        { id: 'i11', label: 'Listing agreement signed' }, { id: 'i12', label: 'Disclosure documents prepared' },
        { id: 'i13', label: 'Accept offer' }, { id: 'i14', label: 'Inspection access scheduled' },
        { id: 'i15', label: 'Repair negotiations' }, { id: 'i16', label: 'Appraisal access' },
        { id: 'i17', label: 'Review closing statement' }, { id: 'i18', label: 'Closing day' }
      ]
    }
  ];

  function loadChecklistTemplates() {
    var stored = localStorage.getItem(PREFIX + 'checklist_templates');
    if (!stored) return DEFAULT_CHECKLIST_TEMPLATES.slice();
    try {
      var parsed = JSON.parse(stored);
      // Fall back to defaults if stored value is empty or has no items in any template
      if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_CHECKLIST_TEMPLATES.slice();
      return parsed;
    } catch (e) { return DEFAULT_CHECKLIST_TEMPLATES.slice(); }
  }

  function getDealChecklists() {
    try { return JSON.parse(localStorage.getItem(PREFIX + 'deal_checklists') || '{}'); } catch (e) { return {}; }
  }

  function saveDealChecklists(data) {
    localStorage.setItem(PREFIX + 'deal_checklists', JSON.stringify(data));
  }

  function daysUntil(dateStr) {
    if (!dateStr) return null;
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    var now = new Date();
    now.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return Math.ceil((d - now) / (1000 * 60 * 60 * 24));
  }

  function formatTime(timeStr) {
    if (!timeStr) return '';
    var parts = timeStr.split(':');
    var h = parseInt(parts[0], 10);
    var m = parts[1] || '00';
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + m + ' ' + ampm;
  }

  function relativeTime(isoStr) {
    if (!isoStr) return '';
    var d = new Date(isoStr);
    var now = new Date();
    var diffMs = now - d;
    var diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return diffMin + 'm ago';
    var diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return diffHr + 'h ago';
    var diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return diffDay + 'd ago';
    return Data.formatDate(isoStr);
  }

  function populateAgentSelect(selectEl, selectedVal) {
    var users = getUsers();
    var opts = '<option value="">Select agent...</option>';
    users.forEach(function (u) {
      var name = u.displayName || u.username;
      var sel = (name === selectedVal) ? ' selected' : '';
      opts += '<option value="' + escapeHtml(name) + '"' + sel + '>' + escapeHtml(name) + '</option>';
    });
    selectEl.innerHTML = opts;
  }

  // ---- Main Render Dispatcher ----
  function render() {
    if (viewMode === 'form') {
      renderForm();
    } else if (viewMode === 'detail' && selectedTxnId) {
      renderDetail();
    } else {
      renderList();
    }
  }

  // ============================================================
  //  FORM VIEW (full page add/edit)
  // ============================================================
  function renderForm() {
    var isEdit = !!editingId;
    var t = isEdit ? Data.getTransactions().find(function (x) { return x.id === editingId; }) : null;
    var allParties = getParties();
    var rawParty = allParties[isEdit ? editingId : '__new'] || {};
    var party = migratePartyData(rawParty);
    var buyers = party.buyers.length ? party.buyers : [{ name: '', phone: '', email: '', relationship: 'Primary' }];
    var sellers = party.sellers.length ? party.sellers : [{ name: '', phone: '', email: '', relationship: 'Primary' }];
    var contacts = party.contacts;

    var html = '';
    html += '<button class="detail-back-btn" data-action="form-cancel"><svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>' + (isEdit ? 'Back to Escrow' : fromDealRoom ? 'Back to Deal Room' : 'Back to Escrows') + '</button>';

    html += '<div style="max-width:800px">';
    html += '<h2 style="font-size:1.3rem;font-weight:800;color:var(--gray-900);margin-bottom:24px">' + (isEdit ? 'Edit Escrow' : 'New Escrow') + '</h2>';

    // Property Info
    html += '<div class="card" style="padding:0;overflow:hidden;margin-bottom:20px">';
    html += '<div style="padding:14px 20px;background:var(--indigo-light);border-bottom:1px solid rgba(99,102,241,.1);display:flex;align-items:center;gap:10px">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="var(--indigo)"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>';
    html += '<span style="font-size:.92rem;font-weight:700;color:var(--indigo)">Property Information</span></div>';
    html += '<div style="padding:20px 24px">';
    html += '<div class="form-group"><label>Address *</label><input type="text" id="fAddress" value="' + escapeHtml(t ? t.address : '') + '" placeholder="123 Main St" style="font-size:1rem;padding:12px 16px"></div>';
    html += '<div class="form-row" style="grid-template-columns:2fr 1fr 1fr">';
    html += '<div class="form-group"><label>City</label><input type="text" id="fCity" value="' + escapeHtml(t ? t.city || '' : '') + '" placeholder="Santa Barbara" style="padding:12px 16px"></div>';
    html += '<div class="form-group"><label>State</label><input type="text" id="fState" value="' + escapeHtml(t ? t.state || '' : '') + '" placeholder="CA" maxlength="2" style="padding:12px 16px"></div>';
    html += '<div class="form-group"><label>Zip</label><input type="text" id="fZip" value="' + escapeHtml(t ? t.zip || '' : '') + '" placeholder="93101" maxlength="10" style="padding:12px 16px"></div>';
    html += '</div>';
    html += '<div class="form-row" style="grid-template-columns:1fr 1fr 1fr">';
    var _fPriceVal = (t && t.price) ? '$' + parseFloat(t.price).toLocaleString('en-US') : '';
    html += '<div class="form-group"><label>Price *</label><input type="text" id="fPrice" value="' + _fPriceVal + '" placeholder="$500,000" style="font-size:1rem;padding:12px 16px" oninput="var r=this.value.replace(/[^0-9]/g,\'\');this.value=r?\'$\'+parseInt(r,10).toLocaleString(\'en-US\'):\'\'"></div>';
    var _txnStatuses = getAdminSetting('transactions.statuses', [{ key: 'active', label: 'Active' }, { key: 'pending', label: 'Pending' }, { key: 'closed', label: 'Closed' }]).filter(function (s) { return s.key !== 'active'; });
    html += '<div class="form-group"><label>Status</label><select id="fStatus" style="padding:12px 16px">' + _txnStatuses.map(function (s) { return '<option value="' + s.key + '"' + (t && t.status === s.key ? ' selected' : '') + '>' + s.label + '</option>'; }).join('') + '</select></div>';
    html += '<div class="form-group"><label>Close Date</label><input type="date" id="fCloseDate" value="' + (t ? t.closeDate || '' : '') + '" style="padding:12px 16px"></div>';
    html += '</div>';
    html += '<div class="form-row" style="grid-template-columns:1fr 1fr">';
    html += '<div class="form-group"><label>Agent *</label><select id="fAgent" style="padding:12px 16px"></select></div>';
    var _leadSources = getAdminSetting('leadSources', ['Zillow','Realtor.com','Referral','Sphere of Influence','Open House','Sign Call','Social Media','Google / SEO','Past Client','Other']);
    html += '<div class="form-group"><label>Lead Source</label><select id="fSource" style="padding:12px 16px"><option value="">Select source...</option>' +
      _leadSources.map(function (s) { return '<option value="' + escapeHtml(s) + '"' + (t && t.source === s ? ' selected' : '') + '>' + escapeHtml(s) + '</option>'; }).join('') +
    '</select></div>';
    html += '</div>';
    html += '<div class="form-row" style="grid-template-columns:1fr 1fr 1fr">';
    html += '<div class="form-group"><label>Beds</label><input type="number" id="fBeds" value="' + (t && t.beds ? t.beds : '') + '" placeholder="—" min="0" style="padding:12px 16px"></div>';
    html += '<div class="form-group"><label>Baths</label><input type="number" id="fBaths" value="' + (t && t.baths ? t.baths : '') + '" placeholder="—" min="0" step="0.5" style="padding:12px 16px"></div>';
    html += '<div class="form-group"><label>Sq Ft</label><input type="number" id="fSqft" value="' + (t && t.sqft ? t.sqft : '') + '" placeholder="—" min="0" style="padding:12px 16px"></div>';
    html += '</div>';
    html += '<div class="form-group"><label>Notes</label><textarea id="fNotes" rows="2" placeholder="Additional details..." style="padding:12px 16px">' + escapeHtml(t ? t.notes || '' : '') + '</textarea></div>';
    html += '</div></div>';

    // Buyer Info
    html += '<div class="card" style="padding:0;overflow:hidden;margin-bottom:20px">';
    html += '<div style="padding:14px 20px;background:var(--indigo-light);border-bottom:1px solid rgba(99,102,241,.1);display:flex;align-items:center;gap:10px;justify-content:space-between">';
    html += '<div style="display:flex;align-items:center;gap:10px">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="var(--indigo)"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
    html += '<span style="font-size:.92rem;font-weight:700;color:var(--indigo)">Buyer(s)</span></div>';
    html += '<button type="button" class="btn btn-outline btn-sm" data-action="add-person" data-ptype="buyer" style="color:var(--indigo);border-color:var(--indigo);padding:4px 12px;font-size:.78rem">+ Add Buyer</button>';
    html += '</div>';
    html += '<div style="padding:20px 24px" id="buyersContainer">';
    buyers.forEach(function (b, idx) {
      if (idx > 0) html += '<div style="border-top:1px solid var(--gray-100);margin-top:12px;padding-top:12px"></div>';
      html += '<div class="form-row" style="grid-template-columns:1fr 1fr 1fr 1fr' + (idx > 0 ? ' auto' : '') + '">';
      html += '<div class="form-group"><label>Name</label><input type="text" class="party-field" data-ptype="buyer" data-idx="' + idx + '" data-pfield="name" value="' + escapeHtml(b.name || '') + '" placeholder="Full name"></div>';
      html += '<div class="form-group"><label>Phone</label><input type="tel" class="party-field" data-ptype="buyer" data-idx="' + idx + '" data-pfield="phone" value="' + escapeHtml(b.phone || '') + '" placeholder="(555) 555-5555"></div>';
      html += '<div class="form-group"><label>Email</label><input type="email" class="party-field" data-ptype="buyer" data-idx="' + idx + '" data-pfield="email" value="' + escapeHtml(b.email || '') + '" placeholder="buyer@email.com"></div>';
      html += '<div class="form-group"><label>Relationship</label><select class="party-field" data-ptype="buyer" data-idx="' + idx + '" data-pfield="relationship">';
      ['Primary','Spouse','Co-Buyer','Parent','Other'].forEach(function (r) {
        html += '<option value="' + r + '"' + ((b.relationship || 'Primary') === r ? ' selected' : '') + '>' + r + '</option>';
      });
      html += '</select></div>';
      if (idx > 0) html += '<div class="form-group" style="display:flex;align-items:flex-end"><button type="button" class="btn btn-outline btn-sm" data-action="remove-person" data-ptype="buyer" data-idx="' + idx + '" style="color:var(--rose);border-color:var(--gray-200);padding:8px 10px" title="Remove">&times;</button></div>';
      html += '</div>';
    });
    html += '</div></div>';

    // Seller Info
    html += '<div class="card" style="padding:0;overflow:hidden;margin-bottom:20px">';
    html += '<div style="padding:14px 20px;background:#FDF2F8;border-bottom:1px solid rgba(236,72,153,.1);display:flex;align-items:center;gap:10px;justify-content:space-between">';
    html += '<div style="display:flex;align-items:center;gap:10px">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="#EC4899"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
    html += '<span style="font-size:.92rem;font-weight:700;color:#BE185D">Seller(s)</span></div>';
    html += '<button type="button" class="btn btn-outline btn-sm" data-action="add-person" data-ptype="seller" style="color:#BE185D;border-color:#EC4899;padding:4px 12px;font-size:.78rem">+ Add Seller</button>';
    html += '</div>';
    html += '<div style="padding:20px 24px" id="sellersContainer">';
    sellers.forEach(function (s, idx) {
      if (idx > 0) html += '<div style="border-top:1px solid var(--gray-100);margin-top:12px;padding-top:12px"></div>';
      html += '<div class="form-row" style="grid-template-columns:1fr 1fr 1fr 1fr' + (idx > 0 ? ' auto' : '') + '">';
      html += '<div class="form-group"><label>Name</label><input type="text" class="party-field" data-ptype="seller" data-idx="' + idx + '" data-pfield="name" value="' + escapeHtml(s.name || '') + '" placeholder="Full name"></div>';
      html += '<div class="form-group"><label>Phone</label><input type="tel" class="party-field" data-ptype="seller" data-idx="' + idx + '" data-pfield="phone" value="' + escapeHtml(s.phone || '') + '" placeholder="(555) 555-5555"></div>';
      html += '<div class="form-group"><label>Email</label><input type="email" class="party-field" data-ptype="seller" data-idx="' + idx + '" data-pfield="email" value="' + escapeHtml(s.email || '') + '" placeholder="seller@email.com"></div>';
      html += '<div class="form-group"><label>Relationship</label><select class="party-field" data-ptype="seller" data-idx="' + idx + '" data-pfield="relationship">';
      ['Primary','Spouse','Co-Seller','Parent','Other'].forEach(function (r) {
        html += '<option value="' + r + '"' + ((s.relationship || 'Primary') === r ? ' selected' : '') + '>' + r + '</option>';
      });
      html += '</select></div>';
      if (idx > 0) html += '<div class="form-group" style="display:flex;align-items:flex-end"><button type="button" class="btn btn-outline btn-sm" data-action="remove-person" data-ptype="seller" data-idx="' + idx + '" style="color:var(--rose);border-color:var(--gray-200);padding:8px 10px" title="Remove">&times;</button></div>';
      html += '</div>';
    });
    html += '</div></div>';

    // Transaction Contacts
    html += '<div class="card" style="padding:0;overflow:hidden;margin-bottom:20px">';
    html += '<div style="padding:14px 20px;background:var(--emerald-light);border-bottom:1px solid rgba(16,185,129,.1);display:flex;align-items:center;gap:10px">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="var(--emerald)"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>';
    html += '<span style="font-size:.92rem;font-weight:700;color:var(--emerald)">Transaction Contacts</span></div>';
    html += '<div style="padding:20px 24px">';
    var _contactTypes = [
      { key: 'escrow', label: 'Escrow Company', namePlaceholder: 'Company / contact name' },
      { key: 'title', label: 'Title Company', namePlaceholder: 'Company / contact name' },
      { key: 'lender', label: 'Lender', namePlaceholder: 'Company / loan officer name' },
      { key: 'otherAgent', label: 'Other Agent', namePlaceholder: 'Agent name' },
      { key: 'tc', label: 'Transaction Coordinator', namePlaceholder: 'Name' },
      { key: 'assistant', label: 'Assistant', namePlaceholder: 'Name' }
    ];
    _contactTypes.forEach(function (ct) {
      var c = contacts[ct.key] || {};
      html += '<div style="margin-bottom:16px">';
      html += '<div style="font-size:.75rem;font-weight:600;color:var(--gray-400);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">' + ct.label + '</div>';
      html += '<div class="form-group" style="margin-bottom:6px"><input type="text" class="contact-field" data-ctype="' + ct.key + '" data-cfield="name" value="' + escapeHtml(c.name || c.company || '') + '" placeholder="' + ct.namePlaceholder + '"></div>';
      html += '<div class="form-row"><div class="form-group"><input type="tel" class="contact-field" data-ctype="' + ct.key + '" data-cfield="phone" value="' + escapeHtml(c.phone || '') + '" placeholder="Phone"></div>';
      html += '<div class="form-group"><input type="email" class="contact-field" data-ctype="' + ct.key + '" data-cfield="email" value="' + escapeHtml(c.email || '') + '" placeholder="Email"></div></div>';
      html += '</div>';
    });
    html += '</div></div>';

    // Save / Cancel buttons
    html += '<div style="display:flex;gap:12px;margin-bottom:40px">';
    html += '<button class="btn btn-primary btn-lg" data-action="form-save" style="padding:14px 32px;font-size:.95rem">' + (isEdit ? 'Save Changes' : 'Create Escrow') + '</button>';
    html += '<button class="btn btn-outline btn-lg" data-action="form-cancel" style="padding:14px 32px;font-size:.95rem">Cancel</button>';
    html += '</div>';

    html += '</div>'; // max-width wrapper

    pageBody.innerHTML = html;
    populateAgentSelect(document.getElementById('fAgent'), t ? t.agent || '' : '');
  }

  // ============================================================
  //  LIST VIEW
  // ============================================================
  function renderList() {
    var allTxns = Data.getTransactions();
    // Exclude closed transactions — those live in the Closed section
    var txns = allTxns.filter(function (t) { return t.status !== 'closed'; });

    var query = '';
    var statusVal = '';
    var agentVal = '';

    // Build stats (only non-closed)
    var total = txns.length;
    var active = txns.filter(function (t) { return t.status === 'active'; }).length;
    var pending = txns.filter(function (t) { return t.status === 'pending'; }).length;
    var volume = txns.reduce(function (sum, t) { return sum + (parseFloat(t.price) || 0); }, 0);

    // Unique agents for filter
    var agentSet = {};
    txns.forEach(function (t) { if (t.agent) agentSet[t.agent] = true; });
    var agents = Object.keys(agentSet).sort();

    var html = '';

    // Page Header
    html += '<div class="page-header">' +
      '<div><h2>All Current Escrows</h2></div>' +
      '<button class="btn btn-primary btn-sm" data-action="add-txn">' +
        '<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>' +
        'Add Escrow' +
      '</button>' +
    '</div>';

    // Stat Cards
    html += '<div class="txn-stats-grid">';
    html += statCard('Total', total, 'indigo', '<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/>');
    html += statCard('Pending', pending, 'amber', '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>');
    html += statCard('Total Volume', Data.formatCurrency(volume), 'violet', '<path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>');
    html += '</div>';

    // Filter Bar
    html += '<div class="filter-bar">' +
      '<input type="text" id="searchInput" placeholder="Search by address or agent...">' +
      '<select id="statusFilter">' +
        '<option value="">All Statuses</option>' +
        getAdminSetting('transactions.statuses', [{ key: 'active', label: 'Active' }, { key: 'pending', label: 'Pending' }, { key: 'closed', label: 'Closed' }]).filter(function (s) { return s.key !== 'closed' && s.key !== 'active'; }).map(function (s) { return '<option value="' + s.key + '">' + s.label + '</option>'; }).join('') +
      '</select>' +
      '<select id="agentFilter">' +
        '<option value="">All Agents</option>' +
        agents.map(function (a) { return '<option value="' + escapeHtml(a) + '">' + escapeHtml(a) + '</option>'; }).join('') +
      '</select>' +
    '</div>';

    // List rows
    html += '<div class="card" id="txnListCard">';
    html += '<div class="list-header">' +
      '<div class="lst-row-address">Address</div>' +
      '<div class="lst-row-specs">Beds / Baths / Sqft</div>' +
      '<div class="lst-row-agent">Agent</div>' +
      '<div class="lst-row-price">Price</div>' +
      '<div class="lst-row-status">Status</div>' +
      '<div class="lst-row-date">Close Date</div>' +
    '</div>';
    html += '<div id="txnListBody"></div>';
    html += '<div id="txnEmpty" class="empty-state" style="display:none;">' +
      '<div style="text-align:center;padding:60px 20px;color:var(--gray-400);">' +
        '<div style="font-size:2rem;margin-bottom:12px">📋</div>' +
        '<div style="font-weight:600;margin-bottom:4px">No active escrows yet</div>' +
        '<div style="font-size:.85rem">Click \'New Escrow\' to get started.</div>' +
      '</div>' +
    '</div>';
    html += '</div>';

    pageBody.innerHTML = html;

    // Now render filtered list rows
    renderListRows();

    // Attach filter listeners
    document.getElementById('searchInput').addEventListener('input', renderListRows);
    document.getElementById('statusFilter').addEventListener('change', renderListRows);
    if (document.getElementById('agentFilter')) {
      document.getElementById('agentFilter').addEventListener('change', renderListRows);
    }
  }

  function statCard(label, value, colorClass, svgPath) {
    return '<div class="stat-card">' +
      '<div class="stat-icon ' + colorClass + '"><svg viewBox="0 0 24 24">' + svgPath + '</svg></div>' +
      '<div><div class="stat-value">' + value + '</div><div class="stat-label">' + label + '</div></div>' +
    '</div>';
  }

  function renderListRows() {
    var allTxns = Data.getTransactions();
    // Exclude closed transactions
    var txns = allTxns.filter(function (t) { return t.status !== 'closed'; });

    var searchEl = document.getElementById('searchInput');
    var statusEl = document.getElementById('statusFilter');
    var agentEl = document.getElementById('agentFilter');
    var listBody = document.getElementById('txnListBody');
    var emptyEl = document.getElementById('txnEmpty');

    if (!listBody) return;

    var query = searchEl ? searchEl.value.toLowerCase() : '';
    var statusVal = statusEl ? statusEl.value : '';
    var agentVal = agentEl ? agentEl.value : '';

    var filtered = txns.filter(function (t) {
      var matchSearch = !query ||
        (t.address && t.address.toLowerCase().indexOf(query) > -1) ||
        (t.agent && t.agent.toLowerCase().indexOf(query) > -1);
      var matchStatus = !statusVal || t.status === statusVal;
      var matchAgent = !agentVal || t.agent === agentVal;
      return matchSearch && matchStatus && matchAgent;
    });

    // Sort by createdAt desc
    filtered.sort(function (a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    if (filtered.length === 0) {
      listBody.innerHTML = '';
      emptyEl.style.display = 'block';
      return;
    }

    emptyEl.style.display = 'none';

    var allListings = Data.getListings();
    listBody.innerHTML = filtered.map(function (t) {
      var cls = agentClass(t.agent);
      // Look up matching listing for bed/bath/sqft
      var matchLst = allListings.find(function (l) { return l.address === t.address; });
      var specsText = [];
      var beds = t.beds || (matchLst ? matchLst.beds : null);
      var baths = t.baths || (matchLst ? matchLst.baths : null);
      var sqft = t.sqft || (matchLst ? matchLst.sqft : null);
      if (beds) specsText.push(beds + ' bd');
      if (baths) specsText.push(baths + ' ba');
      if (sqft) specsText.push(Number(sqft).toLocaleString() + ' sqft');

      var addrSub = [t.city, t.state, t.zip].filter(Boolean).join(', ');
      return '<div class="list-row" data-action="open-detail" data-id="' + t.id + '">' +
        '<div class="lst-row-address">' +
          '<div class="lst-row-address-text">' + escapeHtml(t.address) + '</div>' +
          (addrSub ? '<div style="font-size:.75rem;color:var(--gray-400);margin-top:1px">' + escapeHtml(addrSub) + '</div>' : '') +
        '</div>' +
        '<div class="lst-row-specs">' + (specsText.length > 0 ? specsText.join(' / ') : '—') + '</div>' +
        '<div class="lst-row-agent">' +
          '<div class="agent-avatar ' + cls + '" style="width:28px;height:28px;font-size:.62rem;">' + getInitials(t.agent) + '</div>' +
          '<div class="lst-row-agent-name">' + escapeHtml(t.agent || '—') + '</div>' +
        '</div>' +
        '<div class="lst-row-price">' + Data.formatCurrencyFull(t.price) + '</div>' +
        '<div class="lst-row-status">' + Data.statusBadge(t.status) + '</div>' +
        '<div class="lst-row-date">' + Data.formatDate(t.closeDate) + '</div>' +
      '</div>';
    }).join('');
  }

  // ============================================================
  //  DETAIL VIEW
  // ============================================================
  function renderDetail() {
    var txns = Data.getTransactions();
    var t = txns.find(function (x) { return x.id === selectedTxnId; });

    // Fallback: check sessionStorage for deal passed from deal room
    if (!t) {
      try {
        var cached = JSON.parse(sessionStorage.getItem('reb_deeplink_deal') || 'null');
        if (cached && cached.id === selectedTxnId) {
          var existing = JSON.parse(localStorage.getItem('reb_transactions') || '[]');
          if (!existing.find(function (x) { return x.id === cached.id; })) {
            existing.push(cached);
            localStorage.setItem('reb_transactions', JSON.stringify(existing));
          }
          sessionStorage.removeItem('reb_deeplink_deal');
          t = cached;
        }
      } catch (e) {}
    }

    if (!t) {
      if (viewMode === 'detail' && selectedTxnId) {
        pageBody.innerHTML = '<div style="text-align:center;padding:60px 20px">' +
          '<div style="font-size:1rem;color:var(--gray-500);margin-bottom:8px">Loading deal...</div></div>';
        return;
      }
      viewMode = 'list';
      renderList();
      return;
    }

    var parties = getParties();
    var txnParties = parties[selectedTxnId] || {};
    var party = migratePartyData(txnParties);
    parties[selectedTxnId] = party;


    var tasks = Data.getTasks().filter(function (task) {
      return task.linkedId === selectedTxnId && task.linkedType === 'transaction';
    });
    var pendingTasks = tasks.filter(function (task) { return task.status !== 'done'; });
    var doneTasks = tasks.filter(function (task) { return task.status === 'done'; });

    var calEvents = getCalendarEvents().filter(function (ev) {
      return ev.linkedId === selectedTxnId && ev.linkedType === 'transaction';
    });
    // Upcoming appointments
    var now = new Date();
    now.setHours(0, 0, 0, 0);
    var upcomingAppts = calEvents.filter(function (ev) {
      var evDate = new Date(ev.date);
      evDate.setHours(0, 0, 0, 0);
      return evDate >= now;
    }).sort(function (a, b) { return new Date(a.date) - new Date(b.date); });

    var dtc = daysUntil(t.closeDate);
    var dtcLabel = dtc !== null ? (dtc >= 0 ? dtc + ' days' : Math.abs(dtc) + ' days ago') : '—';

    var docCount = 0; // placeholder for documents count

    var users = getUsers();
    var userOptions = users.map(function (u) {
      var name = u.displayName || u.username;
      return '<option value="' + escapeHtml(name) + '">' + escapeHtml(name) + '</option>';
    }).join('');

    var html = '';

    // Back button
    html += '<button class="detail-back-btn" data-action="back-to-list">' +
      '<svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>' +
      (fromDealRoom ? 'Back to Deal Room' : 'Back to Escrows') +
    '</button>';

    // Inline-editable input style
    var inpStyle = 'background:transparent;border:1.5px solid transparent;border-radius:6px;padding:4px 8px;font-family:inherit;transition:all .15s;width:100%;';
    var inpFocus = 'onfocus="this.style.borderColor=\'var(--indigo)\';this.style.background=\'#fff\'" onblur="this.style.borderColor=\'transparent\';this.style.background=\'transparent\'"';

    // Header Card
    html += '<div class="detail-header-card">';
    html += '<div class="detail-header-accent"></div>';
    html += '<div class="detail-header-body">';

    html += '<div class="detail-header-top">';
    html += '<div style="flex:1;min-width:0">' +
      '<input type="text" class="ie-field" data-field="address" value="' + escapeHtml(t.address) + '" style="font-size:1.35rem;font-weight:800;color:var(--gray-900);letter-spacing:-.3px;' + inpStyle + '" ' + inpFocus + '>' +
      '<div class="detail-csz-grid" style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:8px;margin-top:6px">' +
        '<div><label style="display:block;font-size:.72rem;font-weight:700;color:var(--gray-500);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">City</label>' +
        '<input type="text" class="ie-field" data-field="city" value="' + escapeHtml(t.city || '') + '" placeholder="City" style="width:100%;padding:7px 10px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:.88rem;color:var(--gray-800);background:#fff;font-family:inherit;transition:border-color .15s" onfocus="this.style.borderColor=\'var(--indigo)\'" onblur="this.style.borderColor=\'var(--gray-200)\'"></div>' +
        '<div><label style="display:block;font-size:.72rem;font-weight:700;color:var(--gray-500);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">State</label>' +
        '<input type="text" class="ie-field" data-field="state" value="' + escapeHtml(t.state || '') + '" placeholder="CA" maxlength="2" style="width:100%;padding:7px 10px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:.88rem;color:var(--gray-800);background:#fff;font-family:inherit;transition:border-color .15s" onfocus="this.style.borderColor=\'var(--indigo)\'" onblur="this.style.borderColor=\'var(--gray-200)\'"></div>' +
        '<div><label style="display:block;font-size:.72rem;font-weight:700;color:var(--gray-500);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">Zip</label>' +
        '<input type="text" class="ie-field" data-field="zip" value="' + escapeHtml(t.zip || '') + '" placeholder="93101" maxlength="10" style="width:100%;padding:7px 10px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:.88rem;color:var(--gray-800);background:#fff;font-family:inherit;transition:border-color .15s" onfocus="this.style.borderColor=\'var(--indigo)\'" onblur="this.style.borderColor=\'var(--gray-200)\'"></div>' +
      '</div>' +
      '<input type="text" class="ie-field" data-field="price" value="' + Data.formatCurrency(t.price) + '" data-raw="' + (t.price || '') + '" style="font-size:1.1rem;font-weight:700;color:var(--indigo);margin-top:8px;' + inpStyle + '" ' +
        'onfocus="this.style.borderColor=\'var(--indigo)\';this.style.background=\'#fff\';this.value=this.getAttribute(\'data-raw\')" ' +
        'onblur="this.style.borderColor=\'transparent\';this.style.background=\'transparent\'">' +
    '</div>';
    var zillowUrl = 'https://www.zillow.com/homes/' + encodeURIComponent((t.address || '') + (t.city ? ', ' + t.city : '') + (t.state ? ', ' + t.state : '')) + '_rb/';
    var btnBase = 'display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;font-size:.82rem;font-weight:600;cursor:pointer;font-family:inherit;text-decoration:none;transition:opacity .15s;white-space:nowrap';
    html += '<div class="detail-header-actions">' +
      '<a href="' + zillowUrl + '" target="_blank" rel="noopener" style="' + btnBase + ';background:#006AFF;color:#fff;border:none">' +
        '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 2L2 9.5l1.5 1L12 4.5l8.5 6 1.5-1L12 2zm0 3.5L5 11v10h5v-6h4v6h5V11l-7-5.5z"/></svg>' +
        'Zillow' +
      '</a>' +
      '<button data-action="share-client" data-id="' + t.id + '" style="' + btnBase + ';background:var(--indigo);color:#fff;border:none">Share with Client</button>' +
    '</div>';
    html += '</div>';

    // Detail blocks row — editable
    html += '<div class="detail-blocks-row">';
    html += '<div class="detail-block">' +
      '<div class="detail-block-label">Agent</div>' +
      '<select class="ie-field" data-field="agent" style="font-size:.88rem;font-weight:600;color:var(--gray-800);background:transparent;border:1.5px solid transparent;border-radius:6px;padding:4px 6px;cursor:pointer" ' +
        'onfocus="this.style.borderColor=\'var(--indigo)\'" onblur="this.style.borderColor=\'transparent\'">' +
        users.map(function(u) { return '<option value="' + escapeHtml(u.displayName) + '"' + (u.displayName === t.agent ? ' selected' : '') + '>' + escapeHtml(u.displayName) + '</option>'; }).join('') +
      '</select>' +
    '</div>';
    var _txnDetailStatuses = getAdminSetting('transactions.statuses', [{ key: 'active', label: 'Active' }, { key: 'pending', label: 'Pending' }, { key: 'closed', label: 'Closed' }]);
    html += '<div class="detail-block">' +
      '<div class="detail-block-label">Status</div>' +
      '<select class="ie-field" data-field="status" style="font-size:.88rem;font-weight:600;color:var(--gray-800);background:transparent;border:1.5px solid transparent;border-radius:6px;padding:4px 6px;cursor:pointer" ' +
        'onfocus="this.style.borderColor=\'var(--indigo)\'" onblur="this.style.borderColor=\'transparent\'">' +
        _txnDetailStatuses.map(function (s) { return '<option value="' + s.key + '"' + (t.status === s.key ? ' selected' : '') + '>' + s.label + '</option>'; }).join('') +
      '</select>' +
    '</div>';
    html += '<div class="detail-block">' +
      '<div class="detail-block-label">Close Date</div>' +
      '<input type="date" class="ie-field" data-field="closeDate" value="' + (t.closeDate || '') + '" style="font-size:.88rem;font-weight:600;color:var(--gray-800);' + inpStyle + '" ' + inpFocus + '>' +
    '</div>';
    html += '<div class="detail-block">' +
      '<div class="detail-block-label">Days to Closing</div>' +
      '<div class="detail-block-value">' + dtcLabel + '</div>' +
    '</div>';
    var _detailSources = getAdminSetting('leadSources', ['Zillow','Realtor.com','Referral','Other']);
    html += '<div class="detail-block">' +
      '<div class="detail-block-label">Source</div>' +
      '<select class="ie-field" data-field="source" style="font-size:.88rem;font-weight:600;color:var(--gray-800);background:transparent;border:1.5px solid transparent;border-radius:6px;padding:4px 6px;cursor:pointer" ' +
        'onfocus="this.style.borderColor=\'var(--indigo)\'" onblur="this.style.borderColor=\'transparent\'">' +
        '<option value=""' + (!t.source ? ' selected' : '') + '>—</option>' +
        _detailSources.map(function (s) { return '<option value="' + escapeHtml(s) + '"' + (t.source === s ? ' selected' : '') + '>' + escapeHtml(s) + '</option>'; }).join('') +
      '</select>' +
    '</div>';
    html += '<div class="detail-block">' +
      '<div class="detail-block-label">Beds</div>' +
      '<input type="number" class="ie-field" data-field="beds" value="' + (t.beds || '') + '" placeholder="—" min="0" style="font-size:.88rem;font-weight:600;color:var(--gray-800);' + inpStyle + '" ' + inpFocus + '>' +
    '</div>';
    html += '<div class="detail-block">' +
      '<div class="detail-block-label">Baths</div>' +
      '<input type="number" class="ie-field" data-field="baths" value="' + (t.baths || '') + '" placeholder="—" min="0" step="0.5" style="font-size:.88rem;font-weight:600;color:var(--gray-800);' + inpStyle + '" ' + inpFocus + '>' +
    '</div>';
    html += '<div class="detail-block">' +
      '<div class="detail-block-label">Sq Ft</div>' +
      '<input type="number" class="ie-field" data-field="sqft" value="' + (t.sqft || '') + '" placeholder="—" min="0" style="font-size:.88rem;font-weight:600;color:var(--gray-800);' + inpStyle + '" ' + inpFocus + '>' +
    '</div>';
    html += '</div>'; // detail-blocks-row

    html += '</div>'; // detail-header-body
    html += '</div>'; // detail-header-card

    // Buyer / Seller Info Card
    var repType = t.type || 'Dual';
    var showBuyer = repType === 'Buyer' || repType === 'Dual';
    var showSeller = repType === 'Seller' || repType === 'Dual';
    var partiesCardTitle = repType === 'Buyer' ? 'Buyer Information' : repType === 'Seller' ? 'Seller Information' : 'Buyer &amp; Seller Information';
    html += '<div class="parties-card">';
    html += '<div class="parties-card-header">' + partiesCardTitle + '</div>';
    html += '<div class="parties-grid">';

    // Helper for party inline fields (array-based)
    function partyFieldsArray(type, persons, color) {
      var h = '';
      h += '<div class="party-section">';
      h += '<div class="party-label" style="display:flex;align-items:center;gap:8px"><span style="width:8px;height:8px;border-radius:50%;background:' + color + '"></span>' + (type === 'buyer' ? 'Buyer(s)' : 'Seller(s)') + '</div>';
      persons.forEach(function (person, idx) {
        if (idx > 0) h += '<div style="border-top:1px dashed var(--gray-100);margin:8px 0"></div>';
        h += '<div style="display:flex;flex-direction:column;gap:4px;margin-bottom:4px">';
        h += '<div style="display:flex;gap:6px;align-items:center">';
        h += '<input type="text" class="ie-party" data-party="' + type + '" data-idx="' + idx + '" data-pfield="name" value="' + escapeHtml(person.name || '') + '" placeholder="Name" style="font-size:.92rem;font-weight:700;color:var(--gray-900);flex:1;' + inpStyle + '" ' + inpFocus + '>';
        h += '<span style="font-size:.68rem;color:var(--gray-400);white-space:nowrap">' + escapeHtml(person.relationship || 'Primary') + '</span>';
        h += '</div>';
        h += '<div style="display:flex;gap:6px">';
        h += '<input type="tel" class="ie-party" data-party="' + type + '" data-idx="' + idx + '" data-pfield="phone" value="' + escapeHtml(person.phone || '') + '" placeholder="Phone" style="font-size:.82rem;color:var(--gray-600);flex:1;' + inpStyle + '" ' + inpFocus + '>';
        h += '<input type="email" class="ie-party" data-party="' + type + '" data-idx="' + idx + '" data-pfield="email" value="' + escapeHtml(person.email || '') + '" placeholder="Email" style="font-size:.82rem;color:var(--gray-600);flex:1;' + inpStyle + '" ' + inpFocus + '>';
        h += '</div>';
        h += '</div>';
      });
      if (persons.length === 0) {
        h += '<div style="font-size:.82rem;color:var(--gray-300);font-style:italic">Not added</div>';
      }
      h += '</div>';
      return h;
    }

    if (showBuyer) html += partyFieldsArray('buyer', party.buyers, 'var(--indigo)');
    if (showSeller) html += partyFieldsArray('seller', party.sellers, '#EC4899');

    html += '</div>'; // parties-grid
    html += '</div>'; // parties-card

    // Transaction Contacts Card
    var txnContacts = party.contacts || {};
    var hasContacts = false;
    ['escrow','title','lender','otherAgent','tc','assistant'].forEach(function (k) {
      var c = txnContacts[k];
      if (c && (c.company || c.name || c.phone || c.email)) hasContacts = true;
    });

    html += '<div class="parties-card">';
    html += '<div class="parties-card-header">Transaction Contacts</div>';
    if (hasContacts) {
      html += '<div class="parties-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:0">';
      var contactItems = [
        { label: 'Escrow', icon: '🏦', data: txnContacts.escrow, color: 'var(--indigo)' },
        { label: 'Title Company', icon: '📋', data: txnContacts.title, color: 'var(--violet)' },
        { label: 'Lender', icon: '🏛️', data: txnContacts.lender, color: 'var(--emerald)' },
        { label: 'Other Agent', icon: '🤝', data: txnContacts.otherAgent, color: 'var(--amber)' },
        { label: 'Transaction Coordinator', icon: '📂', data: txnContacts.tc, color: 'var(--indigo)' },
        { label: 'Assistant', icon: '👤', data: txnContacts.assistant, color: 'var(--gray-500)' }
      ];
      contactItems.forEach(function (item, idx) {
        var d = item.data || {};
        var hasData = d.company || d.name || d.phone || d.email;
        var totalItems = contactItems.length;
        var isLastRow = idx >= totalItems - 2;
        html += '<div style="padding:16px 20px;' + (!isLastRow ? 'border-bottom:1px solid var(--gray-100);' : '') + (idx % 2 === 0 ? 'border-right:1px solid var(--gray-100);' : '') + '">';
        html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">';
        html += '<span style="font-size:1rem">' + item.icon + '</span>';
        html += '<span style="font-size:.72rem;font-weight:700;color:var(--gray-400);text-transform:uppercase;letter-spacing:.4px">' + item.label + '</span>';
        html += '</div>';
        if (hasData) {
          html += '<div style="font-size:.88rem;font-weight:600;color:var(--gray-800)">' + escapeHtml(d.name || d.company || '—') + '</div>';
          if (d.phone) html += '<div style="font-size:.78rem;color:var(--gray-500);margin-top:3px">' + escapeHtml(d.phone) + '</div>';
          if (d.email) html += '<div style="font-size:.78rem;color:var(--gray-400);margin-top:2px">' + escapeHtml(d.email) + '</div>';
        } else {
          html += '<div style="font-size:.82rem;color:var(--gray-300);font-style:italic">Not added</div>';
        }
        html += '</div>';
      });
      html += '</div>';
    } else {
      html += '<div style="padding:20px;text-align:center;color:var(--gray-400);font-size:.85rem">No transaction contacts added. Click Edit to add escrow, title, lender, and other agent info.</div>';
    }
    html += '</div>';

    // Key Dates & Contingencies Card
    var allKeyDates = getKeyDates();
    if (!allKeyDates[selectedTxnId]) {
      allKeyDates[selectedTxnId] = DEFAULT_KEY_DATES.map(function (d) {
        return { id: Date.now().toString(36) + '-' + Math.random().toString(36).substr(2,6), label: d.label, date: '', status: 'pending' };
      });
      saveKeyDates(allKeyDates);
    }
    var keyDates = allKeyDates[selectedTxnId];
    var kdToday = new Date(); kdToday.setHours(0,0,0,0);

    html += '<div class="parties-card">';
    html += '<div class="parties-card-header" style="display:flex;align-items:center;justify-content:space-between">';
    html += '<span>Key Dates &amp; Contingencies</span>';
    var kdDone = keyDates.filter(function(d){ return d.status === 'complete' || d.status === 'waived'; }).length;
    html += '<span style="font-size:.75rem;font-weight:700;color:var(--indigo);background:var(--indigo-light);padding:2px 10px;border-radius:20px">' + kdDone + '/' + keyDates.length + ' done</span>';
    html += '</div>';
    html += '<div style="padding:0 0 4px 0">';

    // Closing Date anchor row (read-only, pulled from t.closeDate)
    if (t.closeDate) {
      var cdDate = new Date(t.closeDate + 'T00:00:00');
      var cdDiff = Math.round((cdDate - kdToday) / 86400000);
      var cdLabel = cdDiff < 0 ? (Math.abs(cdDiff) + ' days ago') : (cdDiff === 0 ? 'Today!' : cdDiff + ' days');
      var cdBadgeColor = cdDiff < 0 ? '#DC2626' : cdDiff <= 3 ? '#D97706' : '#6366F1';
      var cdBadgeBg = cdDiff < 0 ? '#FEE2E2' : cdDiff <= 3 ? '#FEF3C7' : '#EEF2FF';
      html += '<div style="display:flex;align-items:center;gap:10px;padding:10px 20px;background:#EEF2FF;border-bottom:2px solid #C7D2FE">';
      html += '<span style="font-size:.75rem;font-weight:800;color:#4338CA;text-transform:uppercase;letter-spacing:.3px;flex:1">&#127942; Closing Date</span>';
      html += '<span style="font-size:.85rem;font-weight:700;color:#3730A3">' + t.closeDate + '</span>';
      html += '<span style="font-size:.72rem;font-weight:700;background:' + cdBadgeBg + ';color:' + cdBadgeColor + ';padding:3px 10px;border-radius:20px;white-space:nowrap">' + cdLabel + '</span>';
      html += '</div>';
    }

    keyDates.forEach(function (kd, idx) {
      var statusColor = kd.status === 'complete' ? 'var(--emerald)' : kd.status === 'waived' ? 'var(--gray-300)' : 'var(--amber)';
      var statusIcon = kd.status === 'complete' ? '✓' : kd.status === 'waived' ? '—' : '○';

      // Days remaining badge + left border color
      var daysBadge = '';
      var leftBorderColor = 'var(--gray-200)';
      if (kd.status === 'complete') {
        leftBorderColor = 'var(--emerald)';
      } else if (kd.status === 'waived') {
        leftBorderColor = 'var(--gray-200)';
      } else if (kd.date) {
        var kdDate = new Date(kd.date + 'T00:00:00');
        var diff = Math.round((kdDate - kdToday) / 86400000);
        if (diff < 0) {
          leftBorderColor = '#DC2626';
          daysBadge = '<span style="font-size:.72rem;font-weight:800;background:#FEE2E2;color:#DC2626;padding:3px 9px;border-radius:20px;white-space:nowrap">' + Math.abs(diff) + 'd overdue</span>';
        } else if (diff <= 3) {
          leftBorderColor = '#D97706';
          daysBadge = '<span style="font-size:.72rem;font-weight:800;background:#FEF3C7;color:#D97706;padding:3px 9px;border-radius:20px;white-space:nowrap">' + diff + 'd left</span>';
        } else if (diff <= 7) {
          leftBorderColor = '#F59E0B';
          daysBadge = '<span style="font-size:.72rem;font-weight:700;background:#FFFBEB;color:#92400E;padding:3px 9px;border-radius:20px;white-space:nowrap">' + diff + 'd</span>';
        } else {
          daysBadge = '<span style="font-size:.72rem;font-weight:600;background:var(--gray-100);color:var(--gray-500);padding:3px 9px;border-radius:20px;white-space:nowrap">' + diff + 'd</span>';
        }
      }

      var rowOpacity = kd.status !== 'pending' ? 'opacity:.55;' : '';
      html += '<div class="kd-row" draggable="true" data-kd-idx="' + idx + '" style="display:flex;align-items:center;gap:10px;padding:10px 16px 10px 0;border-bottom:1px solid var(--gray-50);border-left:4px solid ' + leftBorderColor + ';padding-left:16px;' + rowOpacity + 'cursor:default">';

      // Drag handle
      html += '<span class="kd-handle" style="cursor:grab;color:var(--gray-300);font-size:.85rem;flex-shrink:0;line-height:1;user-select:none" title="Drag to reorder">&#8942;&#8942;</span>';

      // Status toggle button
      html += '<button data-action="toggle-kd-status" data-kd-idx="' + idx + '" title="Click to change status" style="width:24px;height:24px;border-radius:50%;border:2px solid ' + statusColor + ';background:' + (kd.status === 'complete' ? statusColor : 'transparent') + ';color:' + (kd.status === 'complete' ? '#fff' : statusColor) + ';font-size:.72rem;font-weight:700;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;padding:0">' + statusIcon + '</button>';

      // Label (editable)
      html += '<input type="text" class="kd-label" data-kd-idx="' + idx + '" value="' + escapeHtml(kd.label) + '" style="flex:1;font-size:.85rem;font-weight:600;color:var(--gray-800);background:transparent;border:1.5px solid transparent;border-radius:6px;padding:3px 6px;min-width:0;' + (kd.status !== 'pending' ? 'text-decoration:line-through;color:var(--gray-400);' : '') + '" onfocus="this.style.borderColor=\'var(--indigo)\';this.style.background=\'#fff\'" onblur="this.style.borderColor=\'transparent\';this.style.background=\'transparent\'">';

      // Date input
      html += '<input type="date" class="kd-date" data-kd-idx="' + idx + '" value="' + (kd.date || '') + '" style="font-size:.8rem;color:var(--gray-600);background:transparent;border:1.5px solid transparent;border-radius:6px;padding:3px 6px;' + (kd.status !== 'pending' ? 'color:var(--gray-300);' : '') + '" onfocus="this.style.borderColor=\'var(--indigo)\';this.style.background=\'#fff\'" onblur="this.style.borderColor=\'transparent\';this.style.background=\'transparent\'">';

      // Days badge
      html += daysBadge;

      // Notify bell toggle
      var notifyOn = !!kd.notify;
      var bellColor = notifyOn ? '#F59E0B' : 'var(--gray-300)';
      var bellFill = notifyOn ? '#F59E0B' : 'none';
      var bellStroke = notifyOn ? '#F59E0B' : 'var(--gray-300)';
      html += '<button data-action="toggle-kd-notify" data-kd-idx="' + idx + '" title="' + (notifyOn ? 'Notifications on' : 'Enable notifications') + '" style="background:none;border:none;cursor:pointer;padding:2px 4px;flex-shrink:0;display:flex;align-items:center">' +
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="' + (notifyOn ? bellColor : 'none') + '" stroke="' + bellStroke + '" stroke-width="2"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>' +
        '</button>';

      // Remove button
      html += '<button data-action="remove-kd" data-kd-idx="' + idx + '" style="background:none;border:none;cursor:pointer;color:var(--gray-300);font-size:.85rem;padding:2px 4px;flex-shrink:0" title="Remove">&times;</button>';

      html += '</div>';
    });

    // Add date row
    html += '<div style="padding:10px 20px;display:flex;gap:8px;align-items:center">';
    html += '<input type="text" id="newKdLabel" placeholder="Add a date or contingency..." style="flex:1;border:1.5px solid var(--gray-200);border-radius:8px;padding:7px 12px;font-size:.82rem;outline:none">';
    html += '<button class="btn btn-primary btn-sm" data-action="add-kd" style="font-size:.78rem;padding:6px 14px;white-space:nowrap">+ Add</button>';
    html += '</div>';
    html += '</div>';
    html += '</div>';

    // Checklist Card
    var dealChecklists = getDealChecklists();
    var txnChecklist = dealChecklists[selectedTxnId];
    html += '<div class="parties-card">';
    html += '<div class="parties-card-header" style="display:flex;align-items:center;justify-content:space-between">';
    html += '<span>Checklist</span>';
    if (txnChecklist && txnChecklist.items.length > 0) {
      var clDone = txnChecklist.items.filter(function (i) { return i.completed; }).length;
      var clTotal = txnChecklist.items.length;
      html += '<span style="font-size:.75rem;font-weight:700;color:var(--emerald);background:var(--emerald-light);padding:2px 10px;border-radius:20px">' + clDone + '/' + clTotal + '</span>';
    }
    html += '</div>';
    if (txnChecklist && txnChecklist.items.length > 0) {
      var clDoneCount = txnChecklist.items.filter(function (i) { return i.completed; }).length;
      var clTotalCount = txnChecklist.items.length;
      var clPct = Math.round((clDoneCount / clTotalCount) * 100);
      html += '<div style="padding:12px 20px 0 20px">';
      html += '<div style="background:var(--gray-100);border-radius:6px;height:6px;overflow:hidden">';
      html += '<div style="background:var(--emerald);height:100%;width:' + clPct + '%;border-radius:6px;transition:width .3s"></div>';
      html += '</div></div>';
      html += '<div id="clItemList" style="padding:4px 20px 4px">';
      txnChecklist.items.forEach(function (item, idx) {
        var overdue = item.dueDate && !item.completed && new Date(item.dueDate) < new Date();
        var dateColor = overdue ? 'var(--rose)' : 'var(--gray-500)';
        var dateBg = overdue ? '#FFF5F5' : 'var(--gray-50)';
        var dateBorder = overdue ? 'var(--rose)' : 'var(--gray-200)';

        html += '<div class="cl-item" data-item-idx="' + idx + '" style="display:flex;align-items:flex-start;gap:8px;padding:11px 0;border-bottom:1px solid var(--gray-100)">';

        // Drag handle
        html += '<div class="cl-drag" title="Drag to reorder" style="cursor:grab;color:var(--gray-300);font-size:1.1rem;flex-shrink:0;line-height:1;margin-top:2px;padding:0 2px;user-select:none">&#8801;</div>';

        // Checkbox
        html += '<input type="checkbox"' + (item.completed ? ' checked' : '') + ' data-action="toggle-checklist-item" data-item-idx="' + idx + '" style="margin:3px 0 0;cursor:pointer;width:16px;height:16px;flex-shrink:0;accent-color:var(--emerald)">';

        // Body
        html += '<div style="flex:1;min-width:0">';
        html += '<div style="font-size:.9rem;font-weight:500;color:' + (item.completed ? 'var(--gray-400)' : 'var(--gray-800)') + ';' + (item.completed ? 'text-decoration:line-through;' : '') + 'line-height:1.4">' + escapeHtml(item.label) + '</div>';

        // Pill row
        html += '<div style="display:flex;align-items:center;gap:5px;margin-top:7px;flex-wrap:wrap">';

        // Date pill
        html += '<div style="display:inline-flex;align-items:center;gap:4px;background:' + dateBg + ';border:1.5px solid ' + dateBorder + ';border-radius:20px;padding:4px 10px;flex-shrink:0">';
        html += '<svg viewBox="0 0 24 24" width="10" height="10" fill="' + dateColor + '" style="flex-shrink:0"><path d="M19 3h-1V1h-2v2H8V1H6v2H5C3.89 3 3 3.9 3 5v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg>';
        html += '<input type="text" data-action="set-checklist-date" data-item-idx="' + idx + '" value="' + escapeHtml(item.dueDate || '') + '" placeholder="Due date" title="Due date &amp; time" style="border:none;background:transparent;padding:0;font-size:.78rem;color:' + dateColor + ';width:105px;outline:none;cursor:pointer;font-family:inherit">';
        html += '</div>';

        // Vendor pill
        html += '<div style="display:inline-flex;align-items:center;gap:4px;background:var(--gray-50);border:1.5px solid var(--gray-200);border-radius:20px;padding:4px 10px;flex-shrink:0">';
        html += '<svg viewBox="0 0 24 24" width="10" height="10" fill="var(--gray-400)" style="flex-shrink:0"><path d="M20 7h-4V5c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-2 .89-2 2v11c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V9c0-1.11-.89-2-2-2zM10 5h4v2h-4V5z"/></svg>';
        html += '<input type="text" data-action="set-checklist-vendor" data-item-idx="' + idx + '" value="' + escapeHtml(item.vendor || '') + '" placeholder="Vendor" style="border:none;background:transparent;padding:0;font-size:.78rem;color:var(--gray-600);width:130px;outline:none;font-family:inherit">';
        html += '</div>';

        // Note pill
        html += '<div style="display:inline-flex;align-items:center;gap:4px;background:var(--gray-50);border:1.5px solid var(--gray-200);border-radius:20px;padding:4px 10px;flex:1;min-width:80px">';
        html += '<svg viewBox="0 0 24 24" width="10" height="10" fill="var(--gray-400)" style="flex-shrink:0"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>';
        html += '<input type="text" data-action="set-checklist-note" data-item-idx="' + idx + '" value="' + escapeHtml(item.note || '') + '" placeholder="Add a note..." style="border:none;background:transparent;padding:0;font-size:.78rem;color:var(--gray-600);flex:1;min-width:0;outline:none;font-family:inherit">';
        html += '</div>';

        html += '</div>'; // pill row

        if (item.completed && item.completedBy) {
          html += '<div style="margin-top:5px;font-size:.72rem;color:var(--gray-400);display:flex;align-items:center;gap:4px">';
          html += '<svg viewBox="0 0 24 24" width="9" height="9" fill="var(--emerald)"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>';
          html += 'Completed by ' + escapeHtml(item.completedBy) + ' &middot; ' + Data.formatDate(item.completedAt);
          html += '</div>';
        }

        html += '</div>'; // body
        html += '<button style="background:none;border:none;cursor:pointer;color:var(--gray-300);font-size:1rem;padding:3px 5px;line-height:1;flex-shrink:0;border-radius:4px;margin-top:1px" onmouseover="this.style.color=\'var(--rose)\'" onmouseout="this.style.color=\'var(--gray-300)\'" data-action="remove-checklist-item" data-item-idx="' + idx + '" title="Remove">&times;</button>';
        html += '</div>'; // cl-item
      });
      // Add new item input
      html += '<div style="display:flex;gap:8px;padding:10px 0;align-items:center">';
      html += '<input type="text" id="newChecklistItem" placeholder="Add a checklist item..." style="flex:1;border:1.5px solid var(--gray-200);border-radius:8px;padding:7px 12px;font-size:.82rem;outline:none">';
      html += '<button class="btn btn-primary btn-sm" data-action="add-checklist-item" style="font-size:.78rem;padding:6px 14px;white-space:nowrap">+ Add</button>';
      html += '</div>';
      html += '</div>';
    } else {
      // Auto-attach first escrow template
      var escrowTemplates = loadChecklistTemplates().filter(function (tpl) { return tpl.category === 'escrow'; });
      if (escrowTemplates.length > 0) {
        var autoTpl = escrowTemplates[0];
        var dc = getDealChecklists();
        dc[selectedTxnId] = {
          templateId: autoTpl.id,
          templateName: autoTpl.name,
          items: autoTpl.items.map(function (item) {
            return { id: 'chk-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9), label: item.label, completed: false, completedBy: null, completedAt: null, dueDate: null, vendor: '', note: '' };
          })
        };
        saveDealChecklists(dc);
        render();
        return;
      } else {
        html += '<div style="padding:20px;text-align:center;font-size:.85rem;color:var(--gray-400)">No checklist templates found. Create one in Admin Settings → Checklist Templates.</div>';
      }
    }
    html += '</div>';

    // Client Updates (milestone timeline for portal)
    var allUpdates = getUpdates();
    var txnUpdates = (allUpdates[selectedTxnId] || []).slice().sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });

    html += '<div class="notes-card">';
    html += '<div class="notes-card-header" style="display:flex;align-items:center;justify-content:space-between">' +
      '<span>Client Updates</span>' +
      '<span style="font-size:.7rem;color:var(--gray-400);font-weight:500">Visible on client portal</span>' +
    '</div>';

    // Milestone selector
    html += '<div style="padding:16px 20px;border-bottom:1px solid var(--gray-100)">';
    html += '<div style="display:flex;gap:10px;align-items:start;flex-wrap:wrap">';
    html += '<select id="updateMilestone" style="flex:1;min-width:0;padding:9px 12px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:.85rem;color:var(--gray-700);background:var(--white)">';
    html += '<option value="">Select a milestone update...</option>';
    MILESTONES.forEach(function (m) {
      html += '<option value="' + m.key + '">' + m.icon + ' ' + m.label + '</option>';
    });
    html += '</select>';
    html += '<button class="btn btn-primary btn-sm" data-action="send-update" style="white-space:nowrap">Send Update</button>';
    html += '</div>';
    html += '<textarea id="updateDetail" placeholder="Add details for the client (optional)..." style="width:100%;margin-top:10px;padding:9px 12px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:.85rem;min-height:60px;font-family:inherit;resize:vertical;display:none"></textarea>';
    html += '</div>';

    // Updates list
    if (txnUpdates.length === 0) {
      html += '<div style="padding:24px;text-align:center;font-size:.85rem;color:var(--gray-400);font-style:italic">No client updates yet. Send a milestone update to keep your client informed.</div>';
    } else {
      txnUpdates.forEach(function (upd) {
        var milestone = MILESTONES.find(function (m) { return m.key === upd.type; });
        var icon = milestone ? milestone.icon : '📌';
        html += '<div style="padding:14px 20px;border-bottom:1px solid var(--gray-50);display:flex;gap:12px;align-items:start">';
        html += '<span style="font-size:1.2rem;flex-shrink:0;margin-top:1px">' + icon + '</span>';
        html += '<div style="flex:1;min-width:0">';
        html += '<div style="font-size:.88rem;font-weight:600;color:var(--gray-800)">' + escapeHtml(upd.title) + '</div>';
        if (upd.detail) html += '<div style="font-size:.82rem;color:var(--gray-500);margin-top:3px;line-height:1.5">' + escapeHtml(upd.detail) + '</div>';
        html += '<div style="font-size:.7rem;color:var(--gray-400);margin-top:4px">' + escapeHtml(upd.author) + ' &middot; ' + relativeTime(upd.timestamp) + (upd.auto ? ' &middot; Auto' : '') + '</div>';
        html += '</div>';
        html += '</div>';
      });
    }
    html += '</div>';


    // Delete at bottom
    html += '<div style="margin-top:40px;padding-top:20px;border-top:1px solid var(--gray-100);margin-bottom:40px">' +
      '<button class="btn btn-outline btn-sm" data-action="delete-txn" data-id="' + t.id + '" style="color:var(--rose);border-color:var(--gray-200)">Delete This Transaction</button>' +
    '</div>';

    pageBody.innerHTML = html;
    _detailRendered = true;

    initChecklistPickers();

    // Show/hide detail textarea based on milestone selection
    var milestoneSelect = document.getElementById('updateMilestone');
    var updateDetailEl = document.getElementById('updateDetail');
    if (milestoneSelect && updateDetailEl) {
      milestoneSelect.addEventListener('change', function () {
        updateDetailEl.style.display = this.value ? 'block' : 'none';
        if (this.value === 'custom') {
          updateDetailEl.placeholder = 'Describe the update for your client...';
          updateDetailEl.focus();
        } else {
          updateDetailEl.placeholder = 'Add details for the client (optional)...';
        }
      });
    }

    // Auto-save inline editable transaction fields
    var ieFields = pageBody.querySelectorAll('.ie-field');
    ieFields.forEach(function (field) {
      var eventType = (field.tagName === 'SELECT' || field.type === 'date') ? 'change' : 'blur';
      field.addEventListener(eventType, function () {
        var self = this;
        var fieldName = self.getAttribute('data-field');
        var val = self.value;

        // For selects and date inputs, run synchronously (no tab-order concern)
        if (field.tagName === 'SELECT' || field.type === 'date') {
          // Check if status is changing to 'closed'
          if (fieldName === 'status' && val === 'closed') {
            var currentTxn = Data.getTransactions().find(function (x) { return x.id === selectedTxnId; });
            if (currentTxn && currentTxn.status !== 'closed') {
              var updates = { status: 'closed' };
              if (!currentTxn.closeDate) {
                updates.closeDate = new Date().toISOString().split('T')[0];
              }
              Data.updateTransaction(selectedTxnId, updates);
              var linkedListing = Data.getListings().find(function (l) {
                return l.address === currentTxn.address && l.status !== 'sold';
              });
              if (linkedListing) {
                Data.updateListing(linkedListing.id, { status: 'sold' });
              }
              addUpdate(selectedTxnId, 'closing_complete', 'Closing Complete!', 'Your transaction has officially closed. Congratulations!', true);
              notifyClientEmail('transaction', selectedTxnId, 'Closing Complete!', 'Your transaction has officially closed. Congratulations!');
              showToast('Deal closed! Moved to Closed section.');
              setTimeout(function () {
                viewMode = 'list';
                selectedTxnId = null;
                render();
              }, 800);
              return;
            }
          }

          var update = {};
          update[fieldName] = val;

          if (fieldName === 'status') {
            var statusLabels = { active: 'Active', pending: 'Pending' };
            if (statusLabels[val]) {
              addUpdate(selectedTxnId, 'status', 'Status Changed to ' + statusLabels[val], '', true);
              notifyClientEmail('transaction', selectedTxnId, 'Status Changed to ' + statusLabels[val], '');
            }
          }

          if (fieldName === 'closeDate' && val) {
            var closingDetail = 'Closing has been scheduled for ' + Data.formatDate(val) + '.';
            addUpdate(selectedTxnId, 'closing_scheduled', 'Closing Date Scheduled', closingDetail, true);
            notifyClientEmail('transaction', selectedTxnId, 'Closing Date Scheduled', closingDetail);
          }

          Data.updateTransaction(selectedTxnId, update);
          showToast('Saved');
          renderDetail();
          return;
        }

        // For text/number inputs, defer save so Tab focus transfer completes first
        setTimeout(function () {
          if (fieldName === 'price') {
            val = parseFloat(val.replace(/[^0-9.]/g, '')) || 0;
            self.setAttribute('data-raw', val);
            self.value = Data.formatCurrency(val);
          }
          if (fieldName === 'beds') val = val ? parseInt(val) : null;
          if (fieldName === 'baths') val = val ? parseFloat(val) : null;
          if (fieldName === 'sqft') val = val ? parseInt(val) : null;

          var update = {};
          update[fieldName] = val;

          Data.updateTransaction(selectedTxnId, update);
          showToast('Saved');
        }, 0);
      });
    });

    // Drag-to-reorder key dates
    var kdRows = pageBody.querySelectorAll('.kd-row');
    var kdDragSrc = null;
    kdRows.forEach(function (row) {
      row.addEventListener('dragstart', function (e) {
        kdDragSrc = parseInt(this.getAttribute('data-kd-idx'));
        e.dataTransfer.effectAllowed = 'move';
        this.style.opacity = '.4';
      });
      row.addEventListener('dragend', function () {
        this.style.opacity = '';
        pageBody.querySelectorAll('.kd-row').forEach(function (r) { r.style.background = ''; });
      });
      row.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        pageBody.querySelectorAll('.kd-row').forEach(function (r) { r.style.background = ''; });
        this.style.background = 'var(--indigo-light)';
      });
      row.addEventListener('dragleave', function () { this.style.background = ''; });
      row.addEventListener('drop', function (e) {
        e.preventDefault();
        this.style.background = '';
        var dropIdx = parseInt(this.getAttribute('data-kd-idx'));
        if (kdDragSrc === null || kdDragSrc === dropIdx) return;
        var kdReorder = getKeyDates();
        var arr = kdReorder[selectedTxnId] || [];
        var moved = arr.splice(kdDragSrc, 1)[0];
        arr.splice(dropIdx, 0, moved);
        kdReorder[selectedTxnId] = arr;
        saveKeyDates(kdReorder);
        renderDetail();
      });
    });

    // Auto-save key date label and date inputs
    pageBody.querySelectorAll('.kd-label').forEach(function (inp) {
      inp.addEventListener('blur', function () {
        var self = this;
        setTimeout(function () {
          var idx = parseInt(self.getAttribute('data-kd-idx'));
          var kdSave = getKeyDates();
          if (kdSave[selectedTxnId] && kdSave[selectedTxnId][idx] !== undefined) {
            kdSave[selectedTxnId][idx].label = self.value.trim();
            saveKeyDates(kdSave);
          }
        }, 0);
      });
    });
    pageBody.querySelectorAll('.kd-date').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var idx = parseInt(this.getAttribute('data-kd-idx'));
        var kdSave = getKeyDates();
        if (kdSave[selectedTxnId] && kdSave[selectedTxnId][idx] !== undefined) {
          kdSave[selectedTxnId][idx].date = this.value.trim();
          saveKeyDates(kdSave);
          renderDetail();
        }
      });
    });

    // Auto-save inline editable party fields (array-based)
    var iePartyFields = pageBody.querySelectorAll('.ie-party');
    iePartyFields.forEach(function (field) {
      var eventType = (field.tagName === 'SELECT') ? 'change' : 'blur';
      field.addEventListener(eventType, function () {
        var self = this;
        var partyType = self.getAttribute('data-party');
        var pfield = self.getAttribute('data-pfield');
        var idx = parseInt(self.getAttribute('data-idx') || '0');
        var val = self.value.trim();

        // Defer for text inputs so Tab focus transfer completes first
        var doSave = function () {
          var allParties = getParties();
          if (!allParties[selectedTxnId]) allParties[selectedTxnId] = { buyers: [], sellers: [], contacts: {} };
          var partyData = migratePartyData(allParties[selectedTxnId]);
          var arr = partyType === 'buyer' ? partyData.buyers : partyData.sellers;

          while (arr.length <= idx) arr.push({ name: '', phone: '', email: '', relationship: 'Primary' });
          arr[idx][pfield] = val;

          allParties[selectedTxnId] = partyData;
          saveParties(allParties);
          Data.syncTransactionParties(selectedTxnId, partyData.buyers, partyData.sellers);
          showToast('Saved');
        };

        if (field.tagName === 'SELECT') {
          doSave();
        } else {
          setTimeout(doSave, 0);
        }
      });
    });
  }

  // ============================================================
  //  EVENT DELEGATION
  // ============================================================
  document.addEventListener('click', function (e) {
    var target = e.target.closest('[data-action]');
    if (!target) return;

    var action = target.getAttribute('data-action');

    switch (action) {

      case 'add-txn':
        editingId = null;
        viewMode = 'form';
        render();
        break;

      case 'open-detail':
        selectedTxnId = target.getAttribute('data-id');
        viewMode = 'detail';
        render();
        break;

      case 'back-to-list':
        if (fromDealRoom) { window.location.href = 'deal-room.html'; return; }
        viewMode = 'list';
        selectedTxnId = null;
        render();
        break;

      case 'edit-txn':
        editingId = target.getAttribute('data-id');
        viewMode = 'form';
        render();
        break;

      case 'delete-txn': {
        var dtId = target.getAttribute('data-id');
        var dtTxn = Data.getTransactions().find(function (x) { return x.id === dtId; });
        var dtAddr = dtTxn ? dtTxn.address : 'this transaction';
        var dtOverlay = document.createElement('div');
        dtOverlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center';
        dtOverlay.innerHTML =
          '<div style="background:#fff;border-radius:16px;padding:32px 28px;max-width:400px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.2);text-align:center">' +
            '<div style="width:48px;height:48px;background:#FEE2E2;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">' +
              '<svg viewBox="0 0 24 24" width="24" height="24" fill="#EF4444"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>' +
            '</div>' +
            '<div style="font-size:1.1rem;font-weight:700;color:var(--gray-900);margin-bottom:8px">Delete Transaction?</div>' +
            '<div style="font-size:.88rem;color:var(--gray-500);margin-bottom:24px">' + escapeHtml(dtAddr) + ' will be permanently deleted and cannot be recovered.</div>' +
            '<div style="display:flex;gap:10px;justify-content:center">' +
              '<button data-action="dt-cancel" style="flex:1;padding:10px;border:1.5px solid var(--gray-200);background:#fff;border-radius:8px;font-size:.9rem;font-weight:600;cursor:pointer;color:var(--gray-700)">Cancel</button>' +
              '<button data-action="dt-confirm" style="flex:1;padding:10px;background:#EF4444;border:none;border-radius:8px;font-size:.9rem;font-weight:600;cursor:pointer;color:#fff">Delete</button>' +
            '</div>' +
          '</div>';
        document.body.appendChild(dtOverlay);
        dtOverlay.addEventListener('click', function (ev) {
          var act = ev.target.closest('[data-action]');
          if (!act) return;
          if (act.getAttribute('data-action') === 'dt-confirm') {
            Data.deleteTransaction(dtId);
            var parties = getParties();
            delete parties[dtId];
            saveParties(parties);
            showToast('Transaction deleted.');
            viewMode = 'list';
            selectedTxnId = null;
            render();
          }
          document.body.removeChild(dtOverlay);
        });
        break;
      }

      case 'add-person':
        var apType = target.getAttribute('data-ptype');
        var container = document.getElementById(apType === 'buyer' ? 'buyersContainer' : 'sellersContainer');
        if (container) {
          var existingFields = document.querySelectorAll('.party-field[data-ptype="' + apType + '"]');
          var maxIdx = -1;
          existingFields.forEach(function (f) { var i = parseInt(f.getAttribute('data-idx')); if (i > maxIdx) maxIdx = i; });
          var newIdx = maxIdx + 1;
          var relOptions = apType === 'buyer' ? ['Primary','Spouse','Co-Buyer','Parent','Other'] : ['Primary','Spouse','Co-Seller','Parent','Other'];
          var newHtml = '<div style="border-top:1px solid var(--gray-100);margin-top:12px;padding-top:12px"></div>';
          newHtml += '<div class="form-row" style="grid-template-columns:1fr 1fr 1fr 1fr auto">';
          newHtml += '<div class="form-group"><label>Name</label><input type="text" class="party-field" data-ptype="' + apType + '" data-idx="' + newIdx + '" data-pfield="name" value="" placeholder="Full name"></div>';
          newHtml += '<div class="form-group"><label>Phone</label><input type="tel" class="party-field" data-ptype="' + apType + '" data-idx="' + newIdx + '" data-pfield="phone" value="" placeholder="(555) 555-5555"></div>';
          newHtml += '<div class="form-group"><label>Email</label><input type="email" class="party-field" data-ptype="' + apType + '" data-idx="' + newIdx + '" data-pfield="email" value="" placeholder="email@example.com"></div>';
          newHtml += '<div class="form-group"><label>Relationship</label><select class="party-field" data-ptype="' + apType + '" data-idx="' + newIdx + '" data-pfield="relationship">';
          relOptions.forEach(function (r) { newHtml += '<option value="' + r + '"' + (r === 'Spouse' ? ' selected' : '') + '>' + r + '</option>'; });
          newHtml += '</select></div>';
          newHtml += '<div class="form-group" style="display:flex;align-items:flex-end"><button type="button" class="btn btn-outline btn-sm" data-action="remove-person" data-ptype="' + apType + '" data-idx="' + newIdx + '" style="color:var(--rose);border-color:var(--gray-200);padding:8px 10px" title="Remove">&times;</button></div>';
          newHtml += '</div>';
          container.insertAdjacentHTML('beforeend', newHtml);
        }
        break;

      case 'remove-person':
        var rpType = target.getAttribute('data-ptype');
        var rpIdx = target.getAttribute('data-idx');
        var rpFields = document.querySelectorAll('.party-field[data-ptype="' + rpType + '"][data-idx="' + rpIdx + '"]');
        if (rpFields.length > 0) {
          var rpRow = rpFields[0].closest('.form-row');
          if (rpRow) {
            var rpSep = rpRow.previousElementSibling;
            if (rpSep && rpSep.style.borderTop) rpSep.remove();
            rpRow.remove();
          }
        }
        break;

      case 'form-cancel':
        if (editingId) {
          viewMode = 'detail';
          selectedTxnId = editingId;
          editingId = null;
          render();
          return;
        } else if (fromDealRoom) {
          window.location.href = 'deal-room.html';
          return;
        } else {
          viewMode = 'list';
        }
        render();
        break;

      case 'form-save':
        var fAddr = (document.getElementById('fAddress') || {}).value.trim();
        var fPrice = ((document.getElementById('fPrice') || {}).value || '').replace(/[^0-9.]/g, '');
        var fAgent = (document.getElementById('fAgent') || {}).value;
        if (!fAddr || !fPrice || !fAgent) { showToast('Please fill in address, price, and agent.', 'error'); break; }

        var fData = {
          address: fAddr,
          city: (document.getElementById('fCity') || {}).value ? document.getElementById('fCity').value.trim() : '',
          state: (document.getElementById('fState') || {}).value ? document.getElementById('fState').value.trim() : '',
          zip: (document.getElementById('fZip') || {}).value ? document.getElementById('fZip').value.trim() : '',
          price: parseFloat(fPrice),
          agent: fAgent,
          status: (document.getElementById('fStatus') || {}).value || 'active',
          closeDate: (document.getElementById('fCloseDate') || {}).value || '',
          notes: (document.getElementById('fNotes') || {}).value.trim(),
          source: (document.getElementById('fSource') || {}).value || '',
          beds: (document.getElementById('fBeds') || {}).value ? parseInt(document.getElementById('fBeds').value) : null,
          baths: (document.getElementById('fBaths') || {}).value ? parseFloat(document.getElementById('fBaths').value) : null,
          sqft: (document.getElementById('fSqft') || {}).value ? parseInt(document.getElementById('fSqft').value) : null
        };

        var fTxnId;
        if (editingId) {
          Data.updateTransaction(editingId, fData);
          fTxnId = editingId;
          showToast('Escrow updated.');
        } else {
          var fResult = Data.addTransaction(fData);
          fTxnId = fResult.id;
          showToast('Escrow created.');
        }

        // Save parties (buyers/sellers as arrays, contacts with split fields)
        var fParties = getParties();
        if (!fParties[fTxnId]) fParties[fTxnId] = { buyers: [], sellers: [], contacts: {} };

        // Collect buyers array
        var fBuyers = [];
        var fBuyerFields = document.querySelectorAll('.party-field[data-ptype="buyer"]');
        var fBuyerMap = {};
        fBuyerFields.forEach(function (f) {
          var idx = f.getAttribute('data-idx');
          if (!fBuyerMap[idx]) fBuyerMap[idx] = {};
          fBuyerMap[idx][f.getAttribute('data-pfield')] = f.value.trim();
        });
        Object.keys(fBuyerMap).sort(function (a, b) { return parseInt(a) - parseInt(b); }).forEach(function (idx) {
          var entry = fBuyerMap[idx];
          if (entry.name || entry.phone || entry.email) {
            fBuyers.push({ name: entry.name || '', phone: entry.phone || '', email: entry.email || '', relationship: entry.relationship || 'Primary' });
          }
        });

        // Collect sellers array
        var fSellers = [];
        var fSellerFields = document.querySelectorAll('.party-field[data-ptype="seller"]');
        var fSellerMap = {};
        fSellerFields.forEach(function (f) {
          var idx = f.getAttribute('data-idx');
          if (!fSellerMap[idx]) fSellerMap[idx] = {};
          fSellerMap[idx][f.getAttribute('data-pfield')] = f.value.trim();
        });
        Object.keys(fSellerMap).sort(function (a, b) { return parseInt(a) - parseInt(b); }).forEach(function (idx) {
          var entry = fSellerMap[idx];
          if (entry.name || entry.phone || entry.email) {
            fSellers.push({ name: entry.name || '', phone: entry.phone || '', email: entry.email || '', relationship: entry.relationship || 'Primary' });
          }
        });

        // Collect contacts with split fields
        var fContacts = {};
        var contactFields = document.querySelectorAll('.contact-field');
        contactFields.forEach(function (f) {
          var ctype = f.getAttribute('data-ctype');
          var cfield = f.getAttribute('data-cfield');
          if (!fContacts[ctype]) fContacts[ctype] = {};
          fContacts[ctype][cfield] = f.value.trim();
        });

        fParties[fTxnId].buyers = fBuyers;
        fParties[fTxnId].sellers = fSellers;
        fParties[fTxnId].contacts = fContacts;
        // Clean up old format keys if they exist
        delete fParties[fTxnId].buyer;
        delete fParties[fTxnId].seller;
        saveParties(fParties);
        Data.syncTransactionParties(fTxnId, fBuyers, fSellers);

        // Auto-apply escrow checklist template if not already set
        var _existingCl = getDealChecklists()[fTxnId];
        if (!_existingCl) {
          var allTemplates = loadChecklistTemplates();
          var selectedTpl = allTemplates.filter(function (t) { return t.category === 'escrow'; })[0];
          if (selectedTpl) {
            var dealChecklists = getDealChecklists();
            dealChecklists[fTxnId] = {
              templateId: selectedTpl.id,
              templateName: selectedTpl.name,
              items: selectedTpl.items.map(function (item) {
                return {
                  id: 'chk-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9),
                  label: item.label,
                  completed: false,
                  completedBy: null,
                  completedAt: null
                };
              })
            };
            saveDealChecklists(dealChecklists);
          }
        }

        viewMode = 'detail';
        selectedTxnId = fTxnId;
        editingId = null;
        render();
        break;

      case 'share-client':
        openShareClientModal(target.getAttribute('data-id'));
        break;

      case 'edit-party':
        editingPartyType = target.getAttribute('data-party');
        openPartyModal(editingPartyType);
        break;

      case 'send-update':
        sendClientUpdate();
        break;

      case 'dismiss-email-prompt':
        var emailModal = document.getElementById('emailPromptModal');
        if (emailModal) emailModal.parentNode.removeChild(emailModal);
        break;

      case 'attach-checklist':
        var attachSelect = document.getElementById('attachChecklistSelect');
        if (!attachSelect || !attachSelect.value) { showToast('Please select a template.', 'error'); break; }
        var attachTplId = attachSelect.value;
        var attachTemplates = loadChecklistTemplates();
        var attachTpl = attachTemplates.find(function (t) { return t.id === attachTplId; });
        if (attachTpl && selectedTxnId) {
          var dcls = getDealChecklists();
          dcls[selectedTxnId] = {
            templateId: attachTpl.id,
            templateName: attachTpl.name,
            items: attachTpl.items.map(function (item) {
              return {
                id: 'chk-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9),
                label: item.label,
                completed: false,
                completedBy: null,
                completedAt: null
              };
            })
          };
          saveDealChecklists(dcls);
          showToast('Checklist attached.');
          renderDetail();
        }
        break;

      case 'add-checklist-item':
        var newItemInput = document.getElementById('newChecklistItem');
        var newLabel = newItemInput ? newItemInput.value.trim() : '';
        if (!newLabel) { if (newItemInput) newItemInput.focus(); break; }
        var addDc = getDealChecklists();
        if (addDc[selectedTxnId]) {
          addDc[selectedTxnId].items.push({
            id: 'chk-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9),
            label: newLabel,
            completed: false,
            completedBy: null,
            completedAt: null,
            dueDate: null,
            vendor: '',
            note: ''
          });
          saveDealChecklists(addDc);
          showToast('Item added');
          renderDetail();
        }
        break;

      case 'remove-checklist-item':
        var rmIdx = parseInt(target.getAttribute('data-item-idx'));
        var rmDc = getDealChecklists();
        if (rmDc[selectedTxnId] && rmDc[selectedTxnId].items[rmIdx] !== undefined) {
          rmDc[selectedTxnId].items.splice(rmIdx, 1);
          saveDealChecklists(rmDc);
          showToast('Item removed');
          renderDetail();
        }
        break;

      case 'toggle-kd-status':
        var kdIdx = parseInt(target.getAttribute('data-kd-idx'));
        var kdAll = getKeyDates();
        var kdArr = kdAll[selectedTxnId] || [];
        if (kdArr[kdIdx]) {
          var cycle = { pending: 'complete', complete: 'waived', waived: 'pending' };
          kdArr[kdIdx].status = cycle[kdArr[kdIdx].status] || 'pending';
          kdAll[selectedTxnId] = kdArr;
          saveKeyDates(kdAll);
          renderDetail();
        }
        break;

      case 'toggle-kd-notify':
        var nIdx = parseInt(target.getAttribute('data-kd-idx'), 10);
        var allKdN = getKeyDates();
        allKdN[selectedTxnId][nIdx].notify = !allKdN[selectedTxnId][nIdx].notify;
        saveKeyDates(allKdN);
        renderDetail();
        break;

      case 'add-kd':
        var newKdInput = document.getElementById('newKdLabel');
        var newKdLabel = newKdInput ? newKdInput.value.trim() : '';
        if (!newKdLabel) { if (newKdInput) newKdInput.focus(); break; }
        var addKdAll = getKeyDates();
        if (!addKdAll[selectedTxnId]) addKdAll[selectedTxnId] = [];
        addKdAll[selectedTxnId].push({ id: Date.now().toString(36) + '-' + Math.random().toString(36).substr(2,6), label: newKdLabel, date: '', status: 'pending', notify: false });
        saveKeyDates(addKdAll);
        renderDetail();
        break;

      case 'remove-kd':
        var rkIdx = parseInt(target.getAttribute('data-kd-idx'));
        var rkAll = getKeyDates();
        if (rkAll[selectedTxnId]) {
          rkAll[selectedTxnId].splice(rkIdx, 1);
          saveKeyDates(rkAll);
          renderDetail();
        }
        break;

      case 'add-task':
        addTask();
        break;

      case 'add-appointment':
        addAppointment();
        break;

      case 'toggle-task':
        var taskId = target.getAttribute('data-task-id');
        if (target.checked) {
          Data.updateTask(taskId, { status: 'done', completedAt: new Date().toISOString() });
        } else {
          Data.updateTask(taskId, { status: 'todo', completedAt: null });
        }
        renderDetail();
        break;

      case 'modal-close':
      case 'modal-cancel':
        closeModal(txnModal);
        break;

      case 'modal-save':
        saveTransaction();
        break;

      case 'party-modal-close':
        closeModal(partyModal);
        break;

      case 'party-modal-save':
        saveParty();
        break;
    }
  });

  // Also handle checkbox change events via delegation
  document.addEventListener('change', function (e) {
    // Checklist item toggle
    var clTarget = e.target.closest('[data-action="toggle-checklist-item"]');
    if (clTarget && selectedTxnId) {
      var itemIdx = parseInt(clTarget.getAttribute('data-item-idx'));
      var dcls = getDealChecklists();
      var cl = dcls[selectedTxnId];
      if (cl && cl.items[itemIdx]) {
        var session = Auth.getSession();
        if (clTarget.checked) {
          cl.items[itemIdx].completed = true;
          cl.items[itemIdx].completedBy = session ? session.displayName : 'Unknown';
          cl.items[itemIdx].completedAt = new Date().toISOString();
        } else {
          cl.items[itemIdx].completed = false;
          cl.items[itemIdx].completedBy = null;
          cl.items[itemIdx].completedAt = null;
        }
        saveDealChecklists(dcls);
        renderDetail();
      }
      return;
    }

    var target = e.target.closest('[data-action="toggle-task"]');
    if (!target) return;
    var taskId = target.getAttribute('data-task-id');
    if (target.checked) {
      Data.updateTask(taskId, { status: 'done', completedAt: new Date().toISOString() });
    } else {
      Data.updateTask(taskId, { status: 'todo', completedAt: null });
    }
    renderDetail();
  });

  // Checklist date pickers
  function initChecklistPickers() {
    if (typeof flatpickr === 'undefined') return;
    document.querySelectorAll('[data-action="set-checklist-date"]').forEach(function (input) {
      if (input._flatpickr) return;
      flatpickr(input, {
        enableTime: true,
        dateFormat: 'Y-m-d H:i',
        altInput: true,
        altFormat: 'D, M j, Y h:iK',
        allowInput: false,
        disableMobile: false,
        minuteIncrement: 15,
        monthSelectorType: 'static',
        onReady: function (_, __, fp) {
          if (fp.altInput) {
            fp.altInput.style.cssText = fp.input.getAttribute('style') || '';
            fp.altInput.setAttribute('data-action', 'set-checklist-date');
          }
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.textContent = 'Done';
          btn.style.cssText = 'display:block;width:calc(100% - 24px);margin:8px 12px 4px;padding:8px;background:var(--indigo,#6366F1);color:#fff;border:none;border-radius:8px;font-size:.85rem;font-weight:700;cursor:pointer;font-family:inherit';
          btn.addEventListener('click', function () { fp.close(); });
          fp.calendarContainer.appendChild(btn);
        },
        onChange: function (selectedDates, dateStr) {
          var itemIdx = parseInt(this.element.getAttribute('data-item-idx'));
          var dcls = getDealChecklists();
          var cl = dcls[selectedTxnId];
          if (cl && cl.items[itemIdx] !== undefined) {
            cl.items[itemIdx].dueDate = dateStr || null;
            saveDealChecklists(dcls);
          }
        }
      });
    });
  }

  // Checklist vendor/note input (debounced)
  var _clDebounce = {};
  document.addEventListener('input', function (e) {
    var noteTarget = e.target.closest('[data-action="set-checklist-note"]');
    var vendorTarget = e.target.closest('[data-action="set-checklist-vendor"]');
    var clInput = noteTarget || vendorTarget;
    if (!clInput || !selectedTxnId) return;
    var field = noteTarget ? 'note' : 'vendor';
    var itemIdx = parseInt(clInput.getAttribute('data-item-idx'));
    var val = clInput.value;
    if (_clDebounce[itemIdx + field]) clearTimeout(_clDebounce[itemIdx + field]);
    _clDebounce[itemIdx + field] = setTimeout(function () {
      var dcls = getDealChecklists();
      var cl = dcls[selectedTxnId];
      if (cl && cl.items[itemIdx] !== undefined) {
        cl.items[itemIdx][field] = val;
        saveDealChecklists(dcls);
      }
    }, 600);
  });

  // Close modals on overlay click
  txnModal.addEventListener('click', function (e) {
    if (e.target === txnModal) closeModal(txnModal);
  });
  partyModal.addEventListener('click', function (e) {
    if (e.target === partyModal) closeModal(partyModal);
  });

  // ============================================================
  //  MODAL HELPERS
  // ============================================================
  function openModal(el) {
    el.classList.add('open');
  }

  function closeModal(el) {
    el.classList.remove('open');
    if (el === txnModal) {
      txnForm.reset();
      editingId = null;
      modalTitle.textContent = 'Add Escrow';
    }
    if (el === partyModal) {
      document.getElementById('partyForm').reset();
      editingPartyType = null;
    }
  }

  function openEditModal(id) {
    var txns = Data.getTransactions();
    var t = txns.find(function (x) { return x.id === id; });
    if (!t) return;

    editingId = id;
    modalTitle.textContent = 'Edit Escrow';

    document.getElementById('txnAddress').value = t.address || '';
    document.getElementById('txnCity').value = t.city || '';
    document.getElementById('txnState').value = t.state || '';
    document.getElementById('txnZip').value = t.zip || '';
    document.getElementById('txnPrice').value = t.price || '';
    populateAgentSelect(document.getElementById('txnAgent'), t.agent || '');
    document.getElementById('txnStatus').value = t.status || 'active';
    document.getElementById('txnCloseDate').value = t.closeDate || '';
    document.getElementById('txnNotes').value = t.notes || '';

    // Populate buyer/seller fields (migrated format)
    var parties = getParties();
    var txnParties = migratePartyData(parties[id] || {});
    var buyer = txnParties.buyers[0] || {};
    var seller = txnParties.sellers[0] || {};

    if (document.getElementById('txnBuyerName')) document.getElementById('txnBuyerName').value = buyer.name || '';
    if (document.getElementById('txnBuyerPhone')) document.getElementById('txnBuyerPhone').value = buyer.phone || '';
    if (document.getElementById('txnBuyerEmail')) document.getElementById('txnBuyerEmail').value = buyer.email || '';
    if (document.getElementById('txnSellerName')) document.getElementById('txnSellerName').value = seller.name || '';
    if (document.getElementById('txnSellerPhone')) document.getElementById('txnSellerPhone').value = seller.phone || '';
    if (document.getElementById('txnSellerEmail')) document.getElementById('txnSellerEmail').value = seller.email || '';

    // Transaction contacts (migrated format)
    var contacts = txnParties.contacts || {};
    if (document.getElementById('txnEscrowCompany')) document.getElementById('txnEscrowCompany').value = (contacts.escrow && (contacts.escrow.name || contacts.escrow.company)) || '';
    if (document.getElementById('txnEscrowContact')) document.getElementById('txnEscrowContact').value = (contacts.escrow && (contacts.escrow.phone || contacts.escrow.contact)) || '';
    if (document.getElementById('txnTitleCompany')) document.getElementById('txnTitleCompany').value = (contacts.title && (contacts.title.name || contacts.title.company)) || '';
    if (document.getElementById('txnTitleContact')) document.getElementById('txnTitleContact').value = (contacts.title && (contacts.title.phone || contacts.title.contact)) || '';
    if (document.getElementById('txnLender')) document.getElementById('txnLender').value = (contacts.lender && (contacts.lender.name || contacts.lender.company)) || '';
    if (document.getElementById('txnLenderContact')) document.getElementById('txnLenderContact').value = (contacts.lender && (contacts.lender.phone || contacts.lender.contact)) || '';
    if (document.getElementById('txnOtherAgent')) document.getElementById('txnOtherAgent').value = (contacts.otherAgent && contacts.otherAgent.name) || '';
    if (document.getElementById('txnOtherAgentContact')) document.getElementById('txnOtherAgentContact').value = (contacts.otherAgent && (contacts.otherAgent.phone || contacts.otherAgent.contact)) || '';

    openModal(txnModal);
  }

  function saveTransaction() {
    var address = document.getElementById('txnAddress').value.trim();
    var price = document.getElementById('txnPrice').value;
    var agent = document.getElementById('txnAgent').value;
    var status = document.getElementById('txnStatus').value;
    var closeDate = document.getElementById('txnCloseDate').value;
    var notes = document.getElementById('txnNotes').value.trim();

    if (!address || !price || !agent) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    var city = (document.getElementById('txnCity') || {}).value ? document.getElementById('txnCity').value.trim() : '';
    var state = (document.getElementById('txnState') || {}).value ? document.getElementById('txnState').value.trim() : '';
    var zip = (document.getElementById('txnZip') || {}).value ? document.getElementById('txnZip').value.trim() : '';

    var data = {
      address: address,
      city: city,
      state: state,
      zip: zip,
      price: parseFloat(price),
      agent: agent,
      status: status,
      closeDate: closeDate,
      notes: notes
    };

    var txnId;
    if (editingId) {
      Data.updateTransaction(editingId, data);
      txnId = editingId;
      showToast('Escrow updated successfully.');
    } else {
      var result = Data.addTransaction(data);
      txnId = result.id;
      showToast('Escrow added successfully.');
    }

    // Save buyer/seller parties (modal path — saves as new array format)
    var parties = getParties();
    var existingParty = migratePartyData(parties[txnId] || {});

    var buyerNameEl = document.getElementById('txnBuyerName');
    var sellerNameEl = document.getElementById('txnSellerName');
    if (buyerNameEl) {
      var mbName = buyerNameEl.value.trim();
      var mbPhone = (document.getElementById('txnBuyerPhone') || {}).value.trim();
      var mbEmail = (document.getElementById('txnBuyerEmail') || {}).value.trim();
      if (mbName || mbPhone || mbEmail) {
        if (existingParty.buyers.length > 0) {
          existingParty.buyers[0] = { name: mbName, phone: mbPhone, email: mbEmail, relationship: existingParty.buyers[0].relationship || 'Primary' };
        } else {
          existingParty.buyers = [{ name: mbName, phone: mbPhone, email: mbEmail, relationship: 'Primary' }];
        }
      }
    }
    if (sellerNameEl) {
      var msName = sellerNameEl.value.trim();
      var msPhone = (document.getElementById('txnSellerPhone') || {}).value.trim();
      var msEmail = (document.getElementById('txnSellerEmail') || {}).value.trim();
      if (msName || msPhone || msEmail) {
        if (existingParty.sellers.length > 0) {
          existingParty.sellers[0] = { name: msName, phone: msPhone, email: msEmail, relationship: existingParty.sellers[0].relationship || 'Primary' };
        } else {
          existingParty.sellers = [{ name: msName, phone: msPhone, email: msEmail, relationship: 'Primary' }];
        }
      }
    }

    // Save transaction contacts (modal path)
    var escCompEl = document.getElementById('txnEscrowCompany');
    if (escCompEl) {
      existingParty.contacts = {
        escrow: {
          name: (document.getElementById('txnEscrowCompany') || {}).value.trim(),
          phone: (document.getElementById('txnEscrowContact') || {}).value.trim(),
          email: ''
        },
        title: {
          name: (document.getElementById('txnTitleCompany') || {}).value.trim(),
          phone: (document.getElementById('txnTitleContact') || {}).value.trim(),
          email: ''
        },
        lender: {
          name: (document.getElementById('txnLender') || {}).value.trim(),
          phone: (document.getElementById('txnLenderContact') || {}).value.trim(),
          email: ''
        },
        otherAgent: {
          name: (document.getElementById('txnOtherAgent') || {}).value.trim(),
          phone: (document.getElementById('txnOtherAgentContact') || {}).value.trim(),
          email: ''
        }
      };
    }

    parties[txnId] = existingParty;
    delete parties[txnId].buyer;
    delete parties[txnId].seller;
    saveParties(parties);

    closeModal(txnModal);

    if (viewMode === 'detail' && selectedTxnId === txnId) {
      renderDetail();
    } else {
      render();
    }
  }

  // ============================================================
  //  PARTY MODAL
  // ============================================================
  function openPartyModal(type) {
    var isBuyer = type === 'buyer';
    partyModalTitle.textContent = isBuyer ? 'Buyer Information' : 'Seller Information';

    // Style the banner
    var banner = document.getElementById('partyBanner');
    var bannerIcon = document.getElementById('partyBannerIcon');
    var bannerTitle = document.getElementById('partyBannerTitle');
    var bannerSub = document.getElementById('partyBannerSub');
    if (isBuyer) {
      banner.style.background = 'var(--indigo-light)';
      bannerIcon.style.background = 'var(--indigo)'; bannerIcon.style.color = '#fff';
      bannerTitle.style.color = 'var(--indigo)';
      bannerTitle.textContent = 'Buyer Details';
      bannerSub.style.color = 'var(--indigo)';
      bannerSub.textContent = 'Primary buyer and any co-buyers or family members on this transaction.';
    } else {
      banner.style.background = '#FDF2F8';
      bannerIcon.style.background = '#EC4899'; bannerIcon.style.color = '#fff';
      bannerTitle.style.color = '#BE185D';
      bannerTitle.textContent = 'Seller Details';
      bannerSub.style.color = '#BE185D';
      bannerSub.textContent = 'Primary seller and any co-sellers or family members on this transaction.';
    }

    var parties = getParties();
    var txnP = migratePartyData(parties[selectedTxnId] || {});
    var arr = type === 'buyer' ? txnP.buyers : txnP.sellers;
    var data = arr[0] || {};
    var data2 = arr[1] || {};

    document.getElementById('partyName').value = data.name || '';
    document.getElementById('partyPhone').value = data.phone || '';
    document.getElementById('partyEmail').value = data.email || '';
    document.getElementById('partySpouseName').value = data2.name || '';
    document.getElementById('partySpousePhone').value = data2.phone || '';
    document.getElementById('partySpouseEmail').value = data2.email || '';
    document.getElementById('partySpouseRelation').value = data2.relationship || '';

    openModal(partyModal);
  }

  function saveParty() {
    var name = document.getElementById('partyName').value.trim();
    var phone = document.getElementById('partyPhone').value.trim();
    var email = document.getElementById('partyEmail').value.trim();
    var spouseName = document.getElementById('partySpouseName').value.trim();
    var spousePhone = document.getElementById('partySpousePhone').value.trim();
    var spouseEmail = document.getElementById('partySpouseEmail').value.trim();
    var spouseRelation = document.getElementById('partySpouseRelation').value;

    var parties = getParties();
    if (!parties[selectedTxnId]) parties[selectedTxnId] = { buyers: [], sellers: [], contacts: {} };
    var partyData = migratePartyData(parties[selectedTxnId]);

    var arr = editingPartyType === 'buyer' ? partyData.buyers : partyData.sellers;
    // Set primary (index 0)
    var primary = { name: name, phone: phone, email: email, relationship: 'Primary' };
    if (arr.length > 0) {
      arr[0] = primary;
    } else {
      arr.push(primary);
    }
    // Set secondary (index 1) if provided
    if (spouseName || spousePhone || spouseEmail) {
      var secondary = { name: spouseName, phone: spousePhone, email: spouseEmail, relationship: spouseRelation || 'Spouse' };
      if (arr.length > 1) {
        arr[1] = secondary;
      } else {
        arr.push(secondary);
      }
    } else if (arr.length > 1) {
      arr.splice(1, 1);
    }

    parties[selectedTxnId] = partyData;
    saveParties(parties);

    showToast((editingPartyType === 'buyer' ? 'Buyer' : 'Seller') + ' info updated.');
    closeModal(partyModal);
    renderDetail();
  }

  // ============================================================
  //  SEND CLIENT UPDATE
  // ============================================================
  function sendClientUpdate() {
    var select = document.getElementById('updateMilestone');
    var detailEl = document.getElementById('updateDetail');
    if (!select || !select.value) {
      showToast('Please select a milestone update.', 'error');
      return;
    }

    var milestoneKey = select.value;
    var milestone = MILESTONES.find(function (m) { return m.key === milestoneKey; });
    var detail = detailEl ? detailEl.value.trim() : '';
    var title;

    if (milestoneKey === 'custom') {
      if (!detail) {
        showToast('Please add details for your custom update.', 'error');
        return;
      }
      title = 'Update from Your Agent';
      addUpdate(selectedTxnId, 'custom', title, detail, false);
    } else {
      title = milestone ? milestone.label : milestoneKey;
      addUpdate(selectedTxnId, milestoneKey, title, detail, false);
    }

    showToast('Client update sent!');

    // Auto-prompt email notification to client
    notifyClientEmail('transaction', selectedTxnId, title, detail);

    renderDetail();
  }

  // ---- Auto-notify client via email ----
  function notifyClientEmail(type, id, updateTitle, updateDetail) {
    // Get client email
    var clientEmail = '';
    var clientName = '';
    var address = '';
    var portalUrl = '';

    if (type === 'transaction') {
      var parties = getParties();
      var p = migratePartyData(parties[id] || {});
      var firstBuyer = p.buyers[0] || {};
      var firstSeller = p.sellers[0] || {};
      clientEmail = firstBuyer.email || firstSeller.email || '';
      clientName = firstBuyer.name || firstSeller.name || '';
      var txn = Data.getTransactions().find(function (t) { return t.id === id; });
      address = txn ? txn.address : '';
    }

    // Get portal link
    var links = getPortalLinks();
    var link = links.find(function (l) { return l.txnId === id; });
    if (link) {
      var baseUrl = window.location.href.split('/').slice(0, -1).join('/');
      portalUrl = baseUrl + '/client-portal.html?token=' + link.token;
    }

    // If no client email, skip silently
    if (!clientEmail) return;

    var session = Auth.getSession();
    var agentName = session ? session.displayName : 'Your Agent';

    var firstName = clientName ? clientName.split(' ')[0] : '';
    var greeting = firstName ? 'Hi ' + firstName + ',\n\n' : 'Hi,\n\n';

    var subject = 'Update: ' + updateTitle + ' — ' + address;
    var body = greeting +
      'There\'s a new update on your transaction at ' + address + ':\n\n' +
      '📌 ' + updateTitle + '\n' +
      (updateDetail ? updateDetail + '\n' : '') +
      '\n' +
      (portalUrl ? 'View your full transaction portal here:\n' + portalUrl + '\n\n' : '') +
      'If you have any questions, don\'t hesitate to reach out.\n\n' +
      'Best regards,\n' + agentName;

    // Show notification prompt
    showEmailPrompt(clientEmail, subject, body);
  }

  function showEmailPrompt(email, subject, body) {
    var encodedSubject = encodeURIComponent(subject);
    var encodedBody = encodeURIComponent(body);
    var mailtoLink = 'mailto:' + encodeURIComponent(email) + '?subject=' + encodedSubject + '&body=' + encodedBody;

    var promptHtml = '<div class="modal-overlay open" id="emailPromptModal">' +
      '<div class="modal" style="max-width:480px">' +
        '<div class="modal-header">' +
          '<h3>Notify Client?</h3>' +
          '<button class="modal-close" data-action="dismiss-email-prompt">&times;</button>' +
        '</div>' +
        '<div class="modal-body" style="padding:24px">' +
          '<p style="font-size:.88rem;color:var(--gray-600);margin-bottom:6px">Send an email notification to:</p>' +
          '<p style="font-size:.95rem;font-weight:700;color:var(--gray-800);margin-bottom:20px">' + escapeHtml(email) + '</p>' +
          '<div style="display:flex;gap:10px">' +
            '<a href="' + mailtoLink + '" class="btn btn-primary btn-sm" style="display:inline-flex;align-items:center;gap:6px;text-decoration:none" data-action="dismiss-email-prompt">' +
              '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>' +
              'Send Email' +
            '</a>' +
            '<button class="btn btn-outline btn-sm" data-action="dismiss-email-prompt">Skip</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';

    document.body.insertAdjacentHTML('beforeend', promptHtml);
    var emailOverlay = document.getElementById('emailPromptModal');
    if (emailOverlay) {
      emailOverlay.addEventListener('click', function (e) { if (e.target === emailOverlay) emailOverlay.parentNode.removeChild(emailOverlay); });
    }
  }


  // ============================================================
  //  ADD TASK
  // ============================================================
  function addTask() {
    var titleEl = document.getElementById('taskTitle');
    var title = titleEl ? titleEl.value.trim() : '';
    if (!title) {
      showToast('Please enter a task title.', 'error');
      return;
    }

    var priority = document.getElementById('taskPriority').value;
    var dueDate = document.getElementById('taskDue').value;
    var assignee = document.getElementById('taskAssignee').value;

    Data.addTask({
      title: title,
      priority: priority,
      dueDate: dueDate,
      assignedTo: assignee,
      status: 'todo',
      linkedId: selectedTxnId,
      linkedType: 'transaction'
    });

    showToast('Task added.');
    renderDetail();
  }

  // ============================================================
  //  ADD APPOINTMENT
  // ============================================================
  function addAppointment() {
    var titleEl = document.getElementById('apptTitle');
    var title = titleEl ? titleEl.value.trim() : '';
    if (!title) {
      showToast('Please enter an appointment title.', 'error');
      return;
    }

    var date = document.getElementById('apptDate').value;
    if (!date) {
      showToast('Please select a date.', 'error');
      return;
    }

    var time = document.getElementById('apptTime').value;
    var category = document.getElementById('apptCategory').value;
    var location = document.getElementById('apptLocation').value.trim();

    var events = getCalendarEvents();
    events.push({
      id: generateId(),
      title: title,
      date: date,
      startTime: time,
      category: category,
      location: location,
      linkedId: selectedTxnId,
      linkedType: 'transaction',
      createdAt: new Date().toISOString()
    });
    saveCalendarEvents(events);

    showToast('Appointment added to calendar.');
    renderDetail();
  }

  // ============================================================
  //  SHARE WITH CLIENT — Portal Link
  // ============================================================
  function getPortalLinks() {
    try { return JSON.parse(localStorage.getItem(PREFIX + 'portal_links') || '[]'); } catch (e) { return []; }
  }

  function savePortalLinks(links) {
    localStorage.setItem(PREFIX + 'portal_links', JSON.stringify(links));
  }

  function generateToken() {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var token = '';
    for (var i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  function openShareClientModal(txnId) {
    var txns = Data.getTransactions();
    var t = txns.find(function (x) { return x.id === txnId; });
    if (!t) return;

    var parties = getParties();
    var txnP = migratePartyData(parties[txnId] || {});
    var buyer = txnP.buyers[0] || {};
    var seller = txnP.sellers[0] || {};

    // Check for existing portal link for this txn
    var links = getPortalLinks();
    var existingLink = links.find(function (l) { return l.txnId === txnId; });
    var token;

    if (existingLink) {
      token = existingLink.token;
    } else {
      // Generate new token and store
      token = generateToken();
      var session = Auth.getSession();
      links.push({
        token: token,
        txnId: txnId,
        clientType: buyer.name ? 'buyer' : (seller.name ? 'seller' : 'buyer'),
        clientName: buyer.name || seller.name || '',
        createdAt: new Date().toISOString(),
        createdBy: session ? session.displayName : 'Unknown'
      });
      savePortalLinks(links);
    }

    // Build URL
    var baseUrl = window.location.href.split('/').slice(0, -1).join('/');
    var portalUrl = baseUrl + '/client-portal.html?token=' + token;

    // Email templates
    var session = Auth.getSession();
    var agentName = session ? session.displayName : (t.agent || 'Your Agent');
    var clientName = buyer.name || seller.name || '';
    var clientFirst = clientName.split(' ')[0] || '';

    // Build signature from profile
    var agentProfile = {};
    try { var allProfiles = JSON.parse(localStorage.getItem('reb_profiles') || '{}'); agentProfile = allProfiles[session.username] || {}; } catch(e) {}
    var sigParts = [agentName];
    if (agentProfile.phone) sigParts.push(agentProfile.phone);
    if (agentProfile.email) sigParts.push(agentProfile.email);
    if (agentProfile.license) sigParts.push('DRE# ' + agentProfile.license);
    var signature = sigParts.join('\n');

    var portalTemplates = [
      {
        name: 'Welcome to Your Portal',
        subject: 'Your Transaction Portal — {{address}}',
        body: 'Hi {{clientFirst}},\n\nGreat news! I\'ve set up a personal portal where you can track every step of your transaction.\n\n{{portalUrl}}\n\nHere you can see:\n- Real-time progress updates\n- Key dates and milestones\n- Everyone involved in the transaction\n- What to expect next at each stage\n\nI\'ll be posting updates here as we move through the process. Feel free to check it anytime!\n\n{{signature}}'
      },
      {
        name: 'New Update Posted',
        subject: 'Update on {{address}}',
        body: 'Hi {{clientFirst}},\n\nI just posted a new update on your transaction portal. Check it out here:\n\n{{portalUrl}}\n\nLet me know if you have any questions!\n\n{{signature}}'
      },
      {
        name: 'Milestone Reached',
        subject: 'Great news on {{address}}!',
        body: 'Hi {{clientFirst}},\n\nWe\'ve hit another milestone on your transaction! Log in to your portal to see the latest progress:\n\n{{portalUrl}}\n\nWe\'re moving right along. I\'ll keep you updated every step of the way.\n\n{{signature}}'
      },
      {
        name: 'Closing Coming Up',
        subject: 'Closing is approaching — {{address}}',
        body: 'Hi {{clientFirst}},\n\nWe\'re getting close to closing! Here\'s your portal link to review everything:\n\n{{portalUrl}}\n\nPlease make sure to:\n- Review your closing disclosure\n- Prepare your closing funds\n- Bring a valid photo ID to closing\n\nI\'ll be in touch with final details soon. Exciting times ahead!\n\n{{signature}}'
      }
    ];

    var templateVars = {
      address: t.address || '',
      clientName: clientName,
      clientFirst: clientFirst,
      agentName: agentName,
      portalUrl: portalUrl,
      price: Data.formatCurrencyFull(t.price),
      signature: signature
    };

    function mergeVars(text) {
      return text.replace(/\{\{(\w+)\}\}/g, function (m, key) { return templateVars[key] || m; });
    }

    // Build modal HTML
    var modalHtml = '<div class="modal-overlay open" id="shareClientModal">' +
      '<div class="modal" style="max-width:600px;">' +
        '<div class="modal-header">' +
          '<h3>Share Portal with Client</h3>' +
          '<button class="modal-close" data-action="close-share-modal">&times;</button>' +
        '</div>' +
        '<div class="modal-body">' +
          '<div style="margin-bottom:16px;">' +
            '<div style="font-size:.82rem;font-weight:600;color:var(--gray-600);margin-bottom:6px;">Portal URL</div>' +
            '<div style="display:flex;gap:8px;">' +
              '<input type="text" id="sharePortalUrl" value="' + escapeHtml(portalUrl) + '" readonly style="flex:1;padding:9px 14px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:.82rem;color:var(--gray-700);background:var(--gray-50);">' +
              '<button class="btn btn-primary btn-sm" data-action="copy-portal-link" style="white-space:nowrap;">Copy Link</button>' +
            '</div>' +
          '</div>';

    // Email compose section — include all buyers and sellers
    var allEmails = [];
    txnP.buyers.forEach(function (b) {
      if (b.email) allEmails.push({ label: 'Buyer' + (b.relationship ? ' (' + b.relationship + ')' : '') + ' — ' + (b.name || b.email), email: b.email });
    });
    txnP.sellers.forEach(function (s) {
      if (s.email) allEmails.push({ label: 'Seller' + (s.relationship ? ' (' + s.relationship + ')' : '') + ' — ' + (s.name || s.email), email: s.email });
    });

    modalHtml += '<div style="border-top:1px solid var(--gray-100);padding-top:16px;">' +
      '<div style="font-size:.82rem;font-weight:600;color:var(--gray-600);margin-bottom:10px;">Email Client</div>';

    if (allEmails.length > 0) {
      // Recipient selector
      modalHtml += '<div class="form-group" style="margin-bottom:10px"><label style="font-size:.78rem;color:var(--gray-500)">To</label><select id="shareEmailTo" style="width:100%;padding:8px 12px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:.85rem">';
      allEmails.forEach(function (e) {
        modalHtml += '<option value="' + escapeHtml(e.email) + '">' + escapeHtml(e.label) + '</option>';
      });
      modalHtml += '</select></div>';

      // Template selector
      modalHtml += '<div class="form-group" style="margin-bottom:10px"><label style="font-size:.78rem;color:var(--gray-500)">Template</label><select id="shareEmailTemplate" style="width:100%;padding:8px 12px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:.85rem">';
      portalTemplates.forEach(function (tpl, i) {
        modalHtml += '<option value="' + i + '">' + escapeHtml(tpl.name) + '</option>';
      });
      modalHtml += '</select></div>';

      // Subject
      modalHtml += '<div class="form-group" style="margin-bottom:10px"><label style="font-size:.78rem;color:var(--gray-500)">Subject</label>' +
        '<input type="text" id="shareEmailSubject" value="' + escapeHtml(mergeVars(portalTemplates[0].subject)) + '" style="width:100%;padding:8px 12px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:.85rem"></div>';

      // Body
      modalHtml += '<div class="form-group" style="margin-bottom:12px"><label style="font-size:.78rem;color:var(--gray-500)">Message</label>' +
        '<textarea id="shareEmailBody" rows="8" style="width:100%;padding:10px 12px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:.82rem;font-family:inherit;line-height:1.6;resize:vertical">' + escapeHtml(mergeVars(portalTemplates[0].body)) + '</textarea></div>';

      // Buttons
      modalHtml += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">' +
        '<button class="btn btn-primary btn-sm" data-action="share-open-gmail" style="flex:1"><svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:#fff;margin-right:4px"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>Open in Gmail</button>' +
        '<button class="btn btn-outline btn-sm" data-action="share-open-outlook" style="flex:1">Open in Outlook</button>' +
        '<button class="btn btn-outline btn-sm" data-action="share-open-yahoo">Yahoo</button>' +
        '</div>' +
        '<div style="display:flex;gap:8px">' +
        '<button class="btn btn-outline btn-sm" data-action="share-copy-email" style="flex:1">Copy Email Text</button>' +
        '<button class="btn btn-outline btn-sm" data-action="share-open-email">Other Email App</button>' +
        '</div>';

      // Store templates data for JS access
      modalHtml += '<script id="portalTemplatesData" type="application/json">' + JSON.stringify(portalTemplates.map(function (tpl) {
        return { subject: mergeVars(tpl.subject), body: mergeVars(tpl.body) };
      })) + '<\/script>';
    } else {
      modalHtml += '<div style="font-size:.82rem;color:var(--gray-400);font-style:italic;padding:8px 0">' +
        'Add buyer or seller email addresses in the Parties section to email them the portal link.</div>';
    }

    modalHtml += '</div></div>' +
        '<div class="modal-footer">' +
          '<button class="btn btn-outline" data-action="close-share-modal">Close</button>' +
        '</div>' +
      '</div>' +
    '</div>';

    // Insert modal into DOM
    var existing = document.getElementById('shareClientModal');
    if (existing) existing.remove();

    var container = document.createElement('div');
    container.innerHTML = modalHtml;
    document.body.appendChild(container.firstElementChild);

    // Overlay click to close
    var modal = document.getElementById('shareClientModal');
    modal.addEventListener('click', function (e) {
      if (e.target === modal) modal.remove();
    });

    // Template selector change
    var tplSelect = document.getElementById('shareEmailTemplate');
    if (tplSelect) {
      tplSelect.addEventListener('change', function () {
        var dataEl = document.getElementById('portalTemplatesData');
        if (!dataEl) return;
        try {
          var templates = JSON.parse(dataEl.textContent);
          var idx = parseInt(this.value);
          if (templates[idx]) {
            document.getElementById('shareEmailSubject').value = templates[idx].subject;
            document.getElementById('shareEmailBody').value = templates[idx].body;
          }
        } catch (e) {}
      });
    }
  }

  // Handle share modal actions via delegation
  document.addEventListener('click', function (e) {
    var target = e.target.closest('[data-action]');
    if (!target) return;
    var action = target.getAttribute('data-action');

    if (action === 'close-share-modal') {
      var m = document.getElementById('shareClientModal');
      if (m) m.remove();
    }

    if (action === 'copy-portal-link') {
      var urlInput = document.getElementById('sharePortalUrl');
      if (urlInput) {
        urlInput.select();
        urlInput.setSelectionRange(0, 99999);
        try {
          navigator.clipboard.writeText(urlInput.value).then(function () {
            showToast('Portal link copied to clipboard!');
          }).catch(function () {
            document.execCommand('copy');
            showToast('Portal link copied to clipboard!');
          });
        } catch (err) {
          document.execCommand('copy');
          showToast('Portal link copied to clipboard!');
        }
      }
    }

    if (action === 'share-open-gmail') {
      var toEl = document.getElementById('shareEmailTo');
      var subEl = document.getElementById('shareEmailSubject');
      var bodyEl = document.getElementById('shareEmailBody');
      if (toEl && subEl && bodyEl) {
        var gmailUrl = 'https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=' + encodeURIComponent(toEl.value) + '&su=' + encodeURIComponent(subEl.value) + '&body=' + encodeURIComponent(bodyEl.value);
        window.open(gmailUrl, 'gmail_compose', 'width=700,height=600,scrollbars=yes');
        showToast('Gmail opened!');
      }
    }

    if (action === 'share-open-outlook') {
      var toEl = document.getElementById('shareEmailTo');
      var subEl = document.getElementById('shareEmailSubject');
      var bodyEl = document.getElementById('shareEmailBody');
      if (toEl && subEl && bodyEl) {
        var outlookUrl = 'https://outlook.live.com/mail/0/deeplink/compose?to=' + encodeURIComponent(toEl.value) + '&subject=' + encodeURIComponent(subEl.value) + '&body=' + encodeURIComponent(bodyEl.value);
        var a=document.createElement('a');a.href=outlookUrl;a.target='_blank';a.rel='noopener';document.body.appendChild(a);a.click();document.body.removeChild(a);
        showToast('Outlook opened!');
      }
    }

    if (action === 'share-open-yahoo') {
      var toEl = document.getElementById('shareEmailTo');
      var subEl = document.getElementById('shareEmailSubject');
      var bodyEl = document.getElementById('shareEmailBody');
      if (toEl && subEl && bodyEl) {
        var yahooUrl = 'https://compose.mail.yahoo.com/?to=' + encodeURIComponent(toEl.value) + '&subject=' + encodeURIComponent(subEl.value) + '&body=' + encodeURIComponent(bodyEl.value);
        var a=document.createElement('a');a.href=yahooUrl;a.target='_blank';a.rel='noopener';document.body.appendChild(a);a.click();document.body.removeChild(a);
        showToast('Yahoo Mail opened!');
      }
    }

    if (action === 'share-open-email') {
      var toEl = document.getElementById('shareEmailTo');
      var subEl = document.getElementById('shareEmailSubject');
      var bodyEl = document.getElementById('shareEmailBody');
      if (toEl && subEl && bodyEl) {
        window.location.href = 'mailto:' + encodeURIComponent(toEl.value) + '?subject=' + encodeURIComponent(subEl.value) + '&body=' + encodeURIComponent(bodyEl.value);
        showToast('Email app opened!');
      }
    }

    if (action === 'share-copy-email') {
      var subEl = document.getElementById('shareEmailSubject');
      var bodyEl = document.getElementById('shareEmailBody');
      if (subEl && bodyEl) {
        var text = 'Subject: ' + subEl.value + '\n\n' + bodyEl.value;
        navigator.clipboard.writeText(text).then(function () {
          showToast('Email text copied to clipboard!');
        }).catch(function () {
          showToast('Failed to copy', 'error');
        });
      }
    }
  });

  // ============================================================
  //  INIT
  // ============================================================
  render();

  // Re-render after bridge loads so DOM IDs match localStorage server IDs
  document.addEventListener('apiBridgeReady', function () {
    if (_detailRendered) return;
    render();
  });

  // Poll for checklist updates from other computers every 10 seconds
  setInterval(function () {
    if (!_detailRendered || !selectedTxnId) return;
    if (typeof API === 'undefined' || !API.isLoggedIn()) return;
    if (document.hidden) return;
    API.getSettings().then(function (settings) {
      if (settings && settings._deal_checklists) {
        var current = localStorage.getItem('reb_deal_checklists');
        var fresh = JSON.stringify(settings._deal_checklists);
        if (current !== fresh) {
          localStorage.setItem('reb_deal_checklists', fresh);
          renderDetail();
        }
      }
    }).catch(function () {});
  }, 10000);

})();
