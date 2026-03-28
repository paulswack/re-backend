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

  document.getElementById('logoutBtn').addEventListener('click', function () {
    Auth.logout();
  });

  // ---- State ----
  var viewMode = 'list';       // 'list' or 'detail'
  var selectedTxnId = null;
  var editingId = null;
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

  // Milestone options for the Update Client dropdown
  var MILESTONES = [
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

  function generateId() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
  }

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
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
    var parties = getParties();
    var txnParties = isEdit ? (parties[editingId] || { buyer: {}, seller: {}, contacts: {} }) : { buyer: {}, seller: {}, contacts: {} };
    var buyer = txnParties.buyer || {};
    var seller = txnParties.seller || {};
    var contacts = txnParties.contacts || {};

    var html = '';
    html += '<button class="detail-back-btn" data-action="form-cancel"><svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>' + (isEdit ? 'Back to Escrow' : 'Back to Escrows') + '</button>';

    html += '<div style="max-width:800px">';
    html += '<h2 style="font-size:1.3rem;font-weight:800;color:var(--gray-900);margin-bottom:24px">' + (isEdit ? 'Edit Escrow' : 'New Escrow') + '</h2>';

    // Property Info
    html += '<div class="card" style="padding:0;overflow:hidden;margin-bottom:20px">';
    html += '<div style="padding:14px 20px;background:var(--indigo-light);border-bottom:1px solid rgba(99,102,241,.1);display:flex;align-items:center;gap:10px">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="var(--indigo)"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>';
    html += '<span style="font-size:.92rem;font-weight:700;color:var(--indigo)">Property Information</span></div>';
    html += '<div style="padding:20px 24px">';
    html += '<div class="form-group"><label>Address *</label><input type="text" id="fAddress" value="' + escapeHtml(t ? t.address : '') + '" placeholder="123 Main St, City, ST 12345" style="font-size:1rem;padding:12px 16px"></div>';
    html += '<div class="form-row" style="grid-template-columns:1fr 1fr 1fr">';
    html += '<div class="form-group"><label>Price *</label><input type="number" id="fPrice" value="' + (t ? t.price : '') + '" placeholder="500000" min="0" style="font-size:1rem;padding:12px 16px"></div>';
    var _txnStatuses = getAdminSetting('transactions.statuses', [{ key: 'active', label: 'Active' }, { key: 'pending', label: 'Pending' }, { key: 'closed', label: 'Closed' }]);
    html += '<div class="form-group"><label>Status</label><select id="fStatus" style="padding:12px 16px">' + _txnStatuses.map(function (s) { return '<option value="' + s.key + '"' + (t && t.status === s.key ? ' selected' : '') + '>' + s.label + '</option>'; }).join('') + '</select></div>';
    html += '<div class="form-group"><label>Close Date</label><input type="date" id="fCloseDate" value="' + (t ? t.closeDate || '' : '') + '" style="padding:12px 16px"></div>';
    html += '</div>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>Agent *</label><select id="fAgent" style="padding:12px 16px"></select></div>';
    html += '<div class="form-group"><label>Notes</label><textarea id="fNotes" rows="2" placeholder="Additional details..." style="padding:12px 16px">' + escapeHtml(t ? t.notes || '' : '') + '</textarea></div>';
    html += '</div>';
    html += '</div></div>';

    // Buyer Info
    html += '<div class="card" style="padding:0;overflow:hidden;margin-bottom:20px">';
    html += '<div style="padding:14px 20px;background:var(--indigo-light);border-bottom:1px solid rgba(99,102,241,.1);display:flex;align-items:center;gap:10px">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="var(--indigo)"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
    html += '<span style="font-size:.92rem;font-weight:700;color:var(--indigo)">Buyer</span></div>';
    html += '<div style="padding:20px 24px">';
    html += '<div class="form-row" style="grid-template-columns:1fr 1fr 1fr">';
    html += '<div class="form-group"><label>Name</label><input type="text" id="fBuyerName" value="' + escapeHtml(buyer.name || '') + '" placeholder="Full name"></div>';
    html += '<div class="form-group"><label>Phone</label><input type="tel" id="fBuyerPhone" value="' + escapeHtml(buyer.phone || '') + '" placeholder="(555) 555-5555"></div>';
    html += '<div class="form-group"><label>Email</label><input type="email" id="fBuyerEmail" value="' + escapeHtml(buyer.email || '') + '" placeholder="buyer@email.com"></div>';
    html += '</div>';
    html += '<div style="border-top:1px solid var(--gray-100);margin-top:8px;padding-top:14px">';
    html += '<div style="font-size:.75rem;font-weight:600;color:var(--gray-400);margin-bottom:8px">SPOUSE / CO-BUYER</div>';
    html += '<div class="form-row" style="grid-template-columns:1fr 1fr 1fr 1fr">';
    html += '<div class="form-group"><label>Name</label><input type="text" id="fBuyerSpouseName" value="' + escapeHtml(buyer.spouse ? buyer.spouse.name || '' : '') + '" placeholder="Name"></div>';
    html += '<div class="form-group"><label>Phone</label><input type="tel" id="fBuyerSpousePhone" value="' + escapeHtml(buyer.spouse ? buyer.spouse.phone || '' : '') + '" placeholder="Phone"></div>';
    html += '<div class="form-group"><label>Email</label><input type="email" id="fBuyerSpouseEmail" value="' + escapeHtml(buyer.spouse ? buyer.spouse.email || '' : '') + '" placeholder="Email"></div>';
    html += '<div class="form-group"><label>Relationship</label><select id="fBuyerSpouseRel"><option value="">—</option><option value="Spouse"' + (buyer.spouse && buyer.spouse.relationship === 'Spouse' ? ' selected' : '') + '>Spouse</option><option value="Partner"' + (buyer.spouse && buyer.spouse.relationship === 'Partner' ? ' selected' : '') + '>Partner</option><option value="Co-Buyer"' + (buyer.spouse && buyer.spouse.relationship === 'Co-Buyer' ? ' selected' : '') + '>Co-Buyer</option><option value="Parent"' + (buyer.spouse && buyer.spouse.relationship === 'Parent' ? ' selected' : '') + '>Parent</option><option value="Other"' + (buyer.spouse && buyer.spouse.relationship === 'Other' ? ' selected' : '') + '>Other</option></select></div>';
    html += '</div></div>';
    html += '</div></div>';

    // Seller Info
    html += '<div class="card" style="padding:0;overflow:hidden;margin-bottom:20px">';
    html += '<div style="padding:14px 20px;background:#FDF2F8;border-bottom:1px solid rgba(236,72,153,.1);display:flex;align-items:center;gap:10px">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="#EC4899"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
    html += '<span style="font-size:.92rem;font-weight:700;color:#BE185D">Seller</span></div>';
    html += '<div style="padding:20px 24px">';
    html += '<div class="form-row" style="grid-template-columns:1fr 1fr 1fr">';
    html += '<div class="form-group"><label>Name</label><input type="text" id="fSellerName" value="' + escapeHtml(seller.name || '') + '" placeholder="Full name"></div>';
    html += '<div class="form-group"><label>Phone</label><input type="tel" id="fSellerPhone" value="' + escapeHtml(seller.phone || '') + '" placeholder="(555) 555-5555"></div>';
    html += '<div class="form-group"><label>Email</label><input type="email" id="fSellerEmail" value="' + escapeHtml(seller.email || '') + '" placeholder="seller@email.com"></div>';
    html += '</div>';
    html += '<div style="border-top:1px solid var(--gray-100);margin-top:8px;padding-top:14px">';
    html += '<div style="font-size:.75rem;font-weight:600;color:var(--gray-400);margin-bottom:8px">SPOUSE / CO-SELLER</div>';
    html += '<div class="form-row" style="grid-template-columns:1fr 1fr 1fr 1fr">';
    html += '<div class="form-group"><label>Name</label><input type="text" id="fSellerSpouseName" value="' + escapeHtml(seller.spouse ? seller.spouse.name || '' : '') + '" placeholder="Name"></div>';
    html += '<div class="form-group"><label>Phone</label><input type="tel" id="fSellerSpousePhone" value="' + escapeHtml(seller.spouse ? seller.spouse.phone || '' : '') + '" placeholder="Phone"></div>';
    html += '<div class="form-group"><label>Email</label><input type="email" id="fSellerSpouseEmail" value="' + escapeHtml(seller.spouse ? seller.spouse.email || '' : '') + '" placeholder="Email"></div>';
    html += '<div class="form-group"><label>Relationship</label><select id="fSellerSpouseRel"><option value="">—</option><option value="Spouse"' + (seller.spouse && seller.spouse.relationship === 'Spouse' ? ' selected' : '') + '>Spouse</option><option value="Partner"' + (seller.spouse && seller.spouse.relationship === 'Partner' ? ' selected' : '') + '>Partner</option><option value="Co-Seller"' + (seller.spouse && seller.spouse.relationship === 'Co-Seller' ? ' selected' : '') + '>Co-Seller</option><option value="Parent"' + (seller.spouse && seller.spouse.relationship === 'Parent' ? ' selected' : '') + '>Parent</option><option value="Other"' + (seller.spouse && seller.spouse.relationship === 'Other' ? ' selected' : '') + '>Other</option></select></div>';
    html += '</div></div>';
    html += '</div></div>';

    // Transaction Contacts
    html += '<div class="card" style="padding:0;overflow:hidden;margin-bottom:20px">';
    html += '<div style="padding:14px 20px;background:var(--emerald-light);border-bottom:1px solid rgba(16,185,129,.1);display:flex;align-items:center;gap:10px">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="var(--emerald)"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>';
    html += '<span style="font-size:.92rem;font-weight:700;color:var(--emerald)">Transaction Contacts</span></div>';
    html += '<div style="padding:20px 24px">';
    html += '<div class="form-row"><div class="form-group"><label>Escrow Company</label><input type="text" id="fEscrowCompany" value="' + escapeHtml(contacts.escrow ? contacts.escrow.company || '' : '') + '" placeholder="Company name"></div>';
    html += '<div class="form-group"><label>Escrow Contact</label><input type="text" id="fEscrowContact" value="' + escapeHtml(contacts.escrow ? contacts.escrow.contact || '' : '') + '" placeholder="Name · Phone · Email"></div></div>';
    html += '<div class="form-row"><div class="form-group"><label>Title Company</label><input type="text" id="fTitleCompany" value="' + escapeHtml(contacts.title ? contacts.title.company || '' : '') + '" placeholder="Company name"></div>';
    html += '<div class="form-group"><label>Title Contact</label><input type="text" id="fTitleContact" value="' + escapeHtml(contacts.title ? contacts.title.contact || '' : '') + '" placeholder="Name · Phone · Email"></div></div>';
    html += '<div class="form-row"><div class="form-group"><label>Lender</label><input type="text" id="fLender" value="' + escapeHtml(contacts.lender ? contacts.lender.company || '' : '') + '" placeholder="Company name"></div>';
    html += '<div class="form-group"><label>Loan Officer</label><input type="text" id="fLenderContact" value="' + escapeHtml(contacts.lender ? contacts.lender.contact || '' : '') + '" placeholder="Name · Phone · Email"></div></div>';
    html += '<div class="form-row"><div class="form-group"><label>Other Agent</label><input type="text" id="fOtherAgent" value="' + escapeHtml(contacts.otherAgent ? contacts.otherAgent.name || '' : '') + '" placeholder="Agent name"></div>';
    html += '<div class="form-group"><label>Other Agent Contact</label><input type="text" id="fOtherAgentContact" value="' + escapeHtml(contacts.otherAgent ? contacts.otherAgent.contact || '' : '') + '" placeholder="Phone · Email"></div></div>';
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

    // Agent-level access control: non-privileged users only see their own transactions
    var session = Auth.getSession();
    var isLead = Auth.isPrivileged() || (typeof getDataAgentName === "function" && getDataAgentName() === null);
    if (!isLead) {
      txns = txns.filter(function (t) { return t.agent === (typeof getDataAgentName === 'function' && getDataAgentName() ? getDataAgentName() : session.displayName); });
    }

    var query = '';
    var statusVal = '';
    var agentVal = '';

    // Build stats (only non-closed)
    var total = txns.length;
    var active = txns.filter(function (t) { return t.status === 'active'; }).length;
    var pending = txns.filter(function (t) { return t.status === 'pending'; }).length;
    var volume = txns.reduce(function (sum, t) { return sum + (parseFloat(t.price) || 0); }, 0);

    // Unique agents for filter (only for Team Lead)
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
    html += statCard('Active', active, 'indigo', '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>');
    html += statCard('Pending', pending, 'amber', '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>');
    html += statCard('Total Volume', Data.formatCurrency(volume), 'violet', '<path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>');
    html += '</div>';

    // Filter Bar
    html += '<div class="filter-bar">' +
      '<input type="text" id="searchInput" placeholder="Search by address' + (isLead ? ' or agent' : '') + '...">' +
      '<select id="statusFilter">' +
        '<option value="">All Statuses</option>' +
        getAdminSetting('transactions.statuses', [{ key: 'active', label: 'Active' }, { key: 'pending', label: 'Pending' }, { key: 'closed', label: 'Closed' }]).filter(function (s) { return s.key !== 'closed'; }).map(function (s) { return '<option value="' + s.key + '">' + s.label + '</option>'; }).join('') +
      '</select>' +
      (isLead ? '<select id="agentFilter">' +
        '<option value="">All Agents</option>' +
        agents.map(function (a) { return '<option value="' + escapeHtml(a) + '">' + escapeHtml(a) + '</option>'; }).join('') +
      '</select>' : '') +
    '</div>';

    // List rows
    html += '<div class="card" id="txnListCard">';
    html += '<div class="list-header">' +
      '<div class="txn-row-address">Address</div>' +
      '<div class="txn-row-agent">Agent</div>' +
      '<div class="txn-row-price">Price</div>' +
      '<div class="txn-row-status">Status</div>' +
      '<div class="txn-row-date">Close Date</div>' +
    '</div>';
    html += '<div id="txnListBody"></div>';
    html += '<div id="txnEmpty" class="empty-state" style="display:none;">' +
      '<svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/></svg>' +
      '<h3>No transactions found</h3>' +
      '<p>Add your first transaction to get started.</p>' +
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

    // Agent-level access control: non-privileged users only see their own transactions
    var session = Auth.getSession();
    var isLead = Auth.isPrivileged() || (typeof getDataAgentName === "function" && getDataAgentName() === null);
    if (!isLead) {
      txns = txns.filter(function (t) { return t.agent === (typeof getDataAgentName === 'function' && getDataAgentName() ? getDataAgentName() : session.displayName); });
    }

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

    listBody.innerHTML = filtered.map(function (t) {
      var cls = agentClass(t.agent);
      return '<div class="list-row" data-action="open-detail" data-id="' + t.id + '">' +
        '<div class="txn-row-address">' +
          '<div class="txn-row-address-text">' + escapeHtml(t.address) + '</div>' +
        '</div>' +
        '<div class="txn-row-agent">' +
          '<div class="agent-avatar ' + cls + '" style="width:28px;height:28px;font-size:.62rem;">' + getInitials(t.agent) + '</div>' +
          '<div class="txn-row-agent-name">' + escapeHtml(t.agent || '—') + '</div>' +
        '</div>' +
        '<div class="txn-row-price">' + Data.formatCurrencyFull(t.price) + '</div>' +
        '<div class="txn-row-status">' + Data.statusBadge(t.status) + '</div>' +
        '<div class="txn-row-date">' + Data.formatDate(t.closeDate) + '</div>' +
      '</div>';
    }).join('');
  }

  // ============================================================
  //  DETAIL VIEW
  // ============================================================
  function renderDetail() {
    var txns = Data.getTransactions();
    var t = txns.find(function (x) { return x.id === selectedTxnId; });
    if (!t) {
      viewMode = 'list';
      renderList();
      return;
    }

    var parties = getParties();
    var txnParties = parties[selectedTxnId] || { buyer: {}, seller: {} };
    var buyer = txnParties.buyer || {};
    var seller = txnParties.seller || {};

    var allNotes = getNotes();
    var txnNotes = allNotes[selectedTxnId] || [];
    // Sort notes newest first
    txnNotes.sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });

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
      'Back to Escrows' +
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
      '<input type="text" class="ie-field" data-field="price" value="' + Data.formatCurrency(t.price) + '" data-raw="' + (t.price || '') + '" style="font-size:1.1rem;font-weight:700;color:var(--indigo);margin-top:2px;' + inpStyle + '" ' +
        'onfocus="this.style.borderColor=\'var(--indigo)\';this.style.background=\'#fff\';this.value=this.getAttribute(\'data-raw\')" ' +
        'onblur="this.style.borderColor=\'transparent\';this.style.background=\'transparent\'">' +
    '</div>';
    html += '<div class="detail-header-actions">' +
      '<button class="btn btn-outline btn-sm" data-action="share-client" data-id="' + t.id + '" style="color:var(--indigo);border-color:var(--indigo);">Share with Client</button>' +
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
    html += '<div class="detail-block">' +
      '<div class="detail-block-label">Documents</div>' +
      '<div class="detail-block-value">' + docCount + '</div>' +
    '</div>';
    html += '</div>'; // detail-blocks-row

    html += '</div>'; // detail-header-body
    html += '</div>'; // detail-header-card

    // Buyer / Seller Info Card
    html += '<div class="parties-card">';
    html += '<div class="parties-card-header">Buyer &amp; Seller Information</div>';
    html += '<div class="parties-grid">';

    // Helper for party inline fields
    function partyFields(type, data, color, bgColor) {
      var sp = data.spouse || {};
      var h = '';
      h += '<div class="party-section">';
      h += '<div class="party-label" style="display:flex;align-items:center;gap:8px"><span style="width:8px;height:8px;border-radius:50%;background:' + color + '"></span>' + (type === 'buyer' ? 'Buyer' : 'Seller') + '</div>';
      h += '<div style="display:flex;flex-direction:column;gap:4px;margin-bottom:8px">';
      h += '<input type="text" class="ie-party" data-party="' + type + '" data-pfield="name" value="' + escapeHtml(data.name || '') + '" placeholder="Name" style="font-size:.92rem;font-weight:700;color:var(--gray-900);' + inpStyle + '" ' + inpFocus + '>';
      h += '<div style="display:flex;gap:6px">';
      h += '<input type="tel" class="ie-party" data-party="' + type + '" data-pfield="phone" value="' + escapeHtml(data.phone || '') + '" placeholder="Phone" style="font-size:.82rem;color:var(--gray-600);flex:1;' + inpStyle + '" ' + inpFocus + '>';
      h += '<input type="email" class="ie-party" data-party="' + type + '" data-pfield="email" value="' + escapeHtml(data.email || '') + '" placeholder="Email" style="font-size:.82rem;color:var(--gray-600);flex:1;' + inpStyle + '" ' + inpFocus + '>';
      h += '</div>';
      h += '</div>';
      // Spouse/Family
      h += '<div style="padding-top:8px;border-top:1px dashed var(--gray-100)">';
      h += '<div style="font-size:.68rem;font-weight:600;color:var(--gray-400);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Spouse / Family</div>';
      h += '<div style="display:flex;gap:6px;margin-bottom:4px">';
      h += '<input type="text" class="ie-party" data-party="' + type + '" data-pfield="spouse.name" value="' + escapeHtml(sp.name || '') + '" placeholder="Name" style="font-size:.85rem;flex:1;' + inpStyle + '" ' + inpFocus + '>';
      h += '<select class="ie-party" data-party="' + type + '" data-pfield="spouse.relationship" style="font-size:.82rem;' + inpStyle + 'width:auto;min-width:90px;" ' + inpFocus + '>';
      h += '<option value=""' + (!sp.relationship ? ' selected' : '') + '>Relation</option>';
      ['Spouse','Partner','Co-Buyer','Co-Seller','Parent','Child','Other'].forEach(function(r) {
        h += '<option value="' + r + '"' + (sp.relationship === r ? ' selected' : '') + '>' + r + '</option>';
      });
      h += '</select>';
      h += '</div>';
      h += '<div style="display:flex;gap:6px">';
      h += '<input type="tel" class="ie-party" data-party="' + type + '" data-pfield="spouse.phone" value="' + escapeHtml(sp.phone || '') + '" placeholder="Phone" style="font-size:.82rem;flex:1;' + inpStyle + '" ' + inpFocus + '>';
      h += '<input type="email" class="ie-party" data-party="' + type + '" data-pfield="spouse.email" value="' + escapeHtml(sp.email || '') + '" placeholder="Email" style="font-size:.82rem;flex:1;' + inpStyle + '" ' + inpFocus + '>';
      h += '</div>';
      h += '</div>';
      h += '</div>';
      return h;
    }

    html += partyFields('buyer', buyer, 'var(--indigo)', 'var(--indigo-light)');
    html += partyFields('seller', seller, '#EC4899', '#FDF2F8');

    html += '</div>'; // parties-grid
    html += '</div>'; // parties-card

    // Transaction Contacts Card
    var txnContacts = txnParties.contacts || {};
    var hasContacts = (txnContacts.escrow && (txnContacts.escrow.company || txnContacts.escrow.contact)) ||
                      (txnContacts.title && (txnContacts.title.company || txnContacts.title.contact)) ||
                      (txnContacts.lender && (txnContacts.lender.company || txnContacts.lender.contact)) ||
                      (txnContacts.otherAgent && (txnContacts.otherAgent.name || txnContacts.otherAgent.contact));

    html += '<div class="parties-card">';
    html += '<div class="parties-card-header">Transaction Contacts</div>';
    if (hasContacts) {
      html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0">';
      var contactItems = [
        { label: 'Escrow', icon: '🏦', data: txnContacts.escrow, color: 'var(--indigo)' },
        { label: 'Title Company', icon: '📋', data: txnContacts.title, color: 'var(--violet)' },
        { label: 'Lender', icon: '🏛️', data: txnContacts.lender, color: 'var(--emerald)' },
        { label: 'Other Agent', icon: '🤝', data: txnContacts.otherAgent, color: 'var(--amber)' }
      ];
      contactItems.forEach(function (item, idx) {
        var d = item.data || {};
        var hasData = d.company || d.name || d.contact;
        html += '<div style="padding:16px 20px;' + (idx < 2 ? 'border-bottom:1px solid var(--gray-100);' : '') + (idx % 2 === 0 ? 'border-right:1px solid var(--gray-100);' : '') + '">';
        html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">';
        html += '<span style="font-size:1rem">' + item.icon + '</span>';
        html += '<span style="font-size:.72rem;font-weight:700;color:var(--gray-400);text-transform:uppercase;letter-spacing:.4px">' + item.label + '</span>';
        html += '</div>';
        if (hasData) {
          html += '<div style="font-size:.88rem;font-weight:600;color:var(--gray-800)">' + escapeHtml(d.company || d.name || '—') + '</div>';
          if (d.contact) html += '<div style="font-size:.78rem;color:var(--gray-400);margin-top:3px">' + escapeHtml(d.contact) + '</div>';
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
    html += '<select id="updateMilestone" style="flex:1;min-width:200px;padding:9px 12px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:.85rem;color:var(--gray-700);background:var(--white)">';
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

    // Notes (full width)
    html += '<div class="notes-card">';
    html += '<div class="notes-card-header">Activity &amp; Notes</div>';
    html += '<div class="note-input-area">' +
      '<textarea id="noteInput" placeholder="Add a note..."></textarea>' +
      '<div class="note-input-actions">' +
        '<button class="btn btn-primary btn-sm" data-action="add-note">Add Note</button>' +
      '</div>' +
    '</div>';
    if (txnNotes.length === 0) {
      html += '<div style="padding:20px;text-align:center;font-size:.85rem;color:var(--gray-400);font-style:italic;">No notes yet. Add your first note above.</div>';
    } else {
      txnNotes.forEach(function (note) {
        html += '<div class="note-item">' +
          '<div class="note-meta">' +
            '<span class="note-author">' + escapeHtml(note.author) + '</span>' +
            '<span class="note-time">' + relativeTime(note.timestamp) + '</span>' +
          '</div>' +
          '<div class="note-text">' + escapeHtml(note.text) + '</div>' +
        '</div>';
      });
    }
    html += '</div>';

    // Delete at bottom
    html += '<div style="margin-top:40px;padding-top:20px;border-top:1px solid var(--gray-100);margin-bottom:40px">' +
      '<button class="btn btn-outline btn-sm" data-action="delete-txn" data-id="' + t.id + '" style="color:var(--rose);border-color:var(--gray-200)">Delete This Transaction</button>' +
    '</div>';

    pageBody.innerHTML = html;

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
      var eventType = (field.tagName === 'SELECT') ? 'change' : 'blur';
      field.addEventListener(eventType, function () {
        var fieldName = this.getAttribute('data-field');
        var val = this.value;
        if (fieldName === 'price') {
          val = parseFloat(val.replace(/[^0-9.]/g, '')) || 0;
          this.setAttribute('data-raw', val);
          this.value = Data.formatCurrency(val);
        }

        // Check if status is changing to 'closed'
        if (fieldName === 'status' && val === 'closed') {
          var currentTxn = Data.getTransactions().find(function (x) { return x.id === selectedTxnId; });
          if (currentTxn && currentTxn.status !== 'closed') {
            // Set close date to today if not already set
            var updates = { status: 'closed' };
            if (!currentTxn.closeDate) {
              updates.closeDate = new Date().toISOString().split('T')[0];
            }
            Data.updateTransaction(selectedTxnId, updates);
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

        // Auto-generate client updates for key field changes
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
      });
    });

    // Auto-save inline editable party fields
    var iePartyFields = pageBody.querySelectorAll('.ie-party');
    iePartyFields.forEach(function (field) {
      var eventType = (field.tagName === 'SELECT') ? 'change' : 'blur';
      field.addEventListener(eventType, function () {
        var partyType = this.getAttribute('data-party');
        var pfield = this.getAttribute('data-pfield');
        var val = this.value.trim();

        var allParties = getParties();
        if (!allParties[selectedTxnId]) allParties[selectedTxnId] = { buyer: {}, seller: {}, contacts: {} };
        var party = allParties[selectedTxnId][partyType] || {};

        if (pfield.indexOf('spouse.') === 0) {
          var spField = pfield.split('.')[1];
          if (!party.spouse) party.spouse = {};
          party.spouse[spField] = val;
        } else {
          party[pfield] = val;
        }

        allParties[selectedTxnId][partyType] = party;
        saveParties(allParties);
        showToast('Saved');
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
        viewMode = 'list';
        selectedTxnId = null;
        render();
        break;

      case 'edit-txn':
        editingId = target.getAttribute('data-id');
        viewMode = 'form';
        render();
        break;

      case 'delete-txn':
        if (confirm('Delete this escrow? This cannot be undone.')) {
          var delId = target.getAttribute('data-id');
          Data.deleteTransaction(delId);
          // Clean up parties and notes
          var parties = getParties();
          delete parties[delId];
          saveParties(parties);
          var notes = getNotes();
          delete notes[delId];
          saveNotes(notes);
          showToast('Transaction deleted.');
          viewMode = 'list';
          selectedTxnId = null;
          render();
        }
        break;

      case 'form-cancel':
        if (editingId) {
          viewMode = 'detail';
          selectedTxnId = editingId;
          editingId = null;
        } else {
          viewMode = 'list';
        }
        render();
        break;

      case 'form-save':
        var fAddr = (document.getElementById('fAddress') || {}).value.trim();
        var fPrice = (document.getElementById('fPrice') || {}).value;
        var fAgent = (document.getElementById('fAgent') || {}).value;
        if (!fAddr || !fPrice || !fAgent) { showToast('Please fill in address, price, and agent.', 'error'); break; }

        var fData = {
          address: fAddr,
          price: parseFloat(fPrice),
          agent: fAgent,
          status: (document.getElementById('fStatus') || {}).value || 'active',
          closeDate: (document.getElementById('fCloseDate') || {}).value || '',
          notes: (document.getElementById('fNotes') || {}).value.trim()
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

        // Save parties
        var fParties = getParties();
        if (!fParties[fTxnId]) fParties[fTxnId] = { buyer: {}, seller: {}, contacts: {} };

        var fBuyerSpName = (document.getElementById('fBuyerSpouseName') || {}).value.trim();
        var fBuyerSpouse = fBuyerSpName ? {
          name: fBuyerSpName,
          phone: (document.getElementById('fBuyerSpousePhone') || {}).value.trim(),
          email: (document.getElementById('fBuyerSpouseEmail') || {}).value.trim(),
          relationship: (document.getElementById('fBuyerSpouseRel') || {}).value || 'Spouse'
        } : null;

        var fSellerSpName = (document.getElementById('fSellerSpouseName') || {}).value.trim();
        var fSellerSpouse = fSellerSpName ? {
          name: fSellerSpName,
          phone: (document.getElementById('fSellerSpousePhone') || {}).value.trim(),
          email: (document.getElementById('fSellerSpouseEmail') || {}).value.trim(),
          relationship: (document.getElementById('fSellerSpouseRel') || {}).value || 'Spouse'
        } : null;

        fParties[fTxnId].buyer = {
          name: (document.getElementById('fBuyerName') || {}).value.trim(),
          phone: (document.getElementById('fBuyerPhone') || {}).value.trim(),
          email: (document.getElementById('fBuyerEmail') || {}).value.trim(),
          spouse: fBuyerSpouse
        };
        fParties[fTxnId].seller = {
          name: (document.getElementById('fSellerName') || {}).value.trim(),
          phone: (document.getElementById('fSellerPhone') || {}).value.trim(),
          email: (document.getElementById('fSellerEmail') || {}).value.trim(),
          spouse: fSellerSpouse
        };
        fParties[fTxnId].contacts = {
          escrow: { company: (document.getElementById('fEscrowCompany') || {}).value.trim(), contact: (document.getElementById('fEscrowContact') || {}).value.trim() },
          title: { company: (document.getElementById('fTitleCompany') || {}).value.trim(), contact: (document.getElementById('fTitleContact') || {}).value.trim() },
          lender: { company: (document.getElementById('fLender') || {}).value.trim(), contact: (document.getElementById('fLenderContact') || {}).value.trim() },
          otherAgent: { name: (document.getElementById('fOtherAgent') || {}).value.trim(), contact: (document.getElementById('fOtherAgentContact') || {}).value.trim() }
        };
        saveParties(fParties);

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

      case 'add-note':
        addNote();
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
    document.getElementById('txnPrice').value = t.price || '';
    populateAgentSelect(document.getElementById('txnAgent'), t.agent || '');
    document.getElementById('txnStatus').value = t.status || 'active';
    document.getElementById('txnCloseDate').value = t.closeDate || '';
    document.getElementById('txnNotes').value = t.notes || '';

    // Populate buyer/seller fields
    var parties = getParties();
    var txnParties = parties[id] || { buyer: {}, seller: {} };
    var buyer = txnParties.buyer || {};
    var seller = txnParties.seller || {};

    document.getElementById('txnBuyerName').value = buyer.name || '';
    document.getElementById('txnBuyerPhone').value = buyer.phone || '';
    document.getElementById('txnBuyerEmail').value = buyer.email || '';
    document.getElementById('txnSellerName').value = seller.name || '';
    document.getElementById('txnSellerPhone').value = seller.phone || '';
    document.getElementById('txnSellerEmail').value = seller.email || '';

    // Transaction contacts
    var contacts = txnParties.contacts || {};
    document.getElementById('txnEscrowCompany').value = (contacts.escrow && contacts.escrow.company) || '';
    document.getElementById('txnEscrowContact').value = (contacts.escrow && contacts.escrow.contact) || '';
    document.getElementById('txnTitleCompany').value = (contacts.title && contacts.title.company) || '';
    document.getElementById('txnTitleContact').value = (contacts.title && contacts.title.contact) || '';
    document.getElementById('txnLender').value = (contacts.lender && contacts.lender.company) || '';
    document.getElementById('txnLenderContact').value = (contacts.lender && contacts.lender.contact) || '';
    document.getElementById('txnOtherAgent').value = (contacts.otherAgent && contacts.otherAgent.name) || '';
    document.getElementById('txnOtherAgentContact').value = (contacts.otherAgent && contacts.otherAgent.contact) || '';

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

    var data = {
      address: address,
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

    // Save buyer/seller parties
    var buyerName = document.getElementById('txnBuyerName').value.trim();
    var buyerPhone = document.getElementById('txnBuyerPhone').value.trim();
    var buyerEmail = document.getElementById('txnBuyerEmail').value.trim();
    var sellerName = document.getElementById('txnSellerName').value.trim();
    var sellerPhone = document.getElementById('txnSellerPhone').value.trim();
    var sellerEmail = document.getElementById('txnSellerEmail').value.trim();

    var parties = getParties();
    if (!parties[txnId]) parties[txnId] = { buyer: {}, seller: {}, contacts: {} };

    // Preserve existing spouse data
    var existingBuyer = (parties[txnId].buyer || {});
    var existingSeller = (parties[txnId].seller || {});
    parties[txnId].buyer = { name: buyerName, phone: buyerPhone, email: buyerEmail, spouse: existingBuyer.spouse || null };
    parties[txnId].seller = { name: sellerName, phone: sellerPhone, email: sellerEmail, spouse: existingSeller.spouse || null };

    // Save transaction contacts
    parties[txnId].contacts = {
      escrow: {
        company: (document.getElementById('txnEscrowCompany') || {}).value.trim(),
        contact: (document.getElementById('txnEscrowContact') || {}).value.trim()
      },
      title: {
        company: (document.getElementById('txnTitleCompany') || {}).value.trim(),
        contact: (document.getElementById('txnTitleContact') || {}).value.trim()
      },
      lender: {
        company: (document.getElementById('txnLender') || {}).value.trim(),
        contact: (document.getElementById('txnLenderContact') || {}).value.trim()
      },
      otherAgent: {
        name: (document.getElementById('txnOtherAgent') || {}).value.trim(),
        contact: (document.getElementById('txnOtherAgentContact') || {}).value.trim()
      }
    };
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
    var txnParties = parties[selectedTxnId] || { buyer: {}, seller: {} };
    var data = txnParties[type] || {};

    document.getElementById('partyName').value = data.name || '';
    document.getElementById('partyPhone').value = data.phone || '';
    document.getElementById('partyEmail').value = data.email || '';
    document.getElementById('partySpouseName').value = (data.spouse && data.spouse.name) || '';
    document.getElementById('partySpousePhone').value = (data.spouse && data.spouse.phone) || '';
    document.getElementById('partySpouseEmail').value = (data.spouse && data.spouse.email) || '';
    document.getElementById('partySpouseRelation').value = (data.spouse && data.spouse.relationship) || '';

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
    if (!parties[selectedTxnId]) parties[selectedTxnId] = { buyer: {}, seller: {} };

    var partyData = { name: name, phone: phone, email: email };
    if (spouseName || spousePhone || spouseEmail) {
      partyData.spouse = { name: spouseName, phone: spousePhone, email: spouseEmail, relationship: spouseRelation || 'Spouse' };
    } else {
      partyData.spouse = null;
    }

    parties[selectedTxnId][editingPartyType] = partyData;
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
      var p = parties[id] || { buyer: {}, seller: {} };
      var buyer = p.buyer || {};
      var seller = p.seller || {};
      clientEmail = buyer.email || seller.email || '';
      clientName = buyer.name || seller.name || '';
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
  }

  // ============================================================
  //  ADD NOTE
  // ============================================================
  function addNote() {
    var input = document.getElementById('noteInput');
    if (!input) return;
    var text = input.value.trim();
    if (!text) {
      showToast('Please enter a note.', 'error');
      return;
    }

    var session = Auth.getSession();
    var allNotes = getNotes();
    if (!allNotes[selectedTxnId]) allNotes[selectedTxnId] = [];

    allNotes[selectedTxnId].push({
      id: generateId(),
      text: text,
      author: session ? session.displayName : 'Unknown',
      timestamp: new Date().toISOString()
    });

    saveNotes(allNotes);
    showToast('Note added.');
    renderDetail();
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
    var txnParties = parties[txnId] || { buyer: {}, seller: {} };
    var buyer = txnParties.buyer || {};
    var seller = txnParties.seller || {};

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

    // Build email body
    var emailSubject = 'Your Transaction Portal — ' + (t.address || 'Real Estate Transaction');
    var emailBody = 'Hi,\n\nYou can view your transaction details and progress at the link below:\n\n' +
      portalUrl + '\n\n' +
      'Transaction: ' + (t.address || '') + '\n' +
      'Price: ' + Data.formatCurrencyFull(t.price) + '\n\n' +
      'This link gives you read-only access to your transaction status, timeline, tasks, and upcoming appointments.\n\n' +
      'If you have any questions, please don\'t hesitate to reach out.\n\n' +
      'Best regards,\n' + (t.agent || 'Your Agent');

    var encodedSubject = encodeURIComponent(emailSubject);
    var encodedBody = encodeURIComponent(emailBody);

    // Build modal HTML
    var modalHtml = '<div class="modal-overlay open" id="shareClientModal">' +
      '<div class="modal" style="max-width:560px;">' +
        '<div class="modal-header">' +
          '<h3>Share Portal Link</h3>' +
          '<button class="modal-close" data-action="close-share-modal">&times;</button>' +
        '</div>' +
        '<div class="modal-body">' +
          '<div style="margin-bottom:16px;">' +
            '<div style="font-size:.82rem;font-weight:600;color:var(--gray-600);margin-bottom:6px;">Portal URL</div>' +
            '<div style="display:flex;gap:8px;">' +
              '<input type="text" id="sharePortalUrl" value="' + escapeHtml(portalUrl) + '" readonly style="flex:1;padding:9px 14px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:.82rem;color:var(--gray-700);background:var(--gray-50);">' +
              '<button class="btn btn-primary btn-sm" data-action="copy-portal-link" style="white-space:nowrap;">Copy Link</button>' +
            '</div>' +
          '</div>' +
          '<div style="font-size:.78rem;color:var(--gray-400);margin-bottom:20px;">This link provides read-only access to the transaction progress, timeline, and upcoming appointments.</div>';

    // Email buttons
    var hasEmailButtons = false;
    if (buyer.email || seller.email) {
      modalHtml += '<div style="border-top:1px solid var(--gray-100);padding-top:16px;">' +
        '<div style="font-size:.82rem;font-weight:600;color:var(--gray-600);margin-bottom:10px;">Send via Email</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;">';

      if (buyer.email) {
        modalHtml += '<a href="mailto:' + escapeHtml(buyer.email) + '?subject=' + encodedSubject + '&body=' + encodedBody + '" class="btn btn-outline btn-sm" style="text-decoration:none;">' +
          '<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>' +
          'Send to Buyer (' + escapeHtml(buyer.name || buyer.email) + ')</a>';
        hasEmailButtons = true;
      }

      if (seller.email) {
        modalHtml += '<a href="mailto:' + escapeHtml(seller.email) + '?subject=' + encodedSubject + '&body=' + encodedBody + '" class="btn btn-outline btn-sm" style="text-decoration:none;">' +
          '<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>' +
          'Send to Seller (' + escapeHtml(seller.name || seller.email) + ')</a>';
        hasEmailButtons = true;
      }

      modalHtml += '</div></div>';
    }

    if (!hasEmailButtons) {
      modalHtml += '<div style="border-top:1px solid var(--gray-100);padding-top:16px;font-size:.82rem;color:var(--gray-400);font-style:italic;">' +
        'Add buyer or seller email addresses to enable email sharing.' +
      '</div>';
    }

    modalHtml += '</div>' +
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
  }

  // Handle share modal actions via delegation
  document.addEventListener('click', function (e) {
    var target = e.target.closest('[data-action]');
    if (!target) return;
    var action = target.getAttribute('data-action');

    if (action === 'close-share-modal') {
      var modal = document.getElementById('shareClientModal');
      if (modal) modal.remove();
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
  });

  // ============================================================
  //  INIT
  // ============================================================
  render();

})();
