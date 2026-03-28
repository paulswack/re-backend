/* ============================================================
   RE Back Office — Listings Page (Complete Rewrite)
   List View + Full-Page Detail View + Full-Page Form
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
  var viewMode = 'list';       // 'list', 'detail', or 'form'
  var selectedListingId = null;
  var editingId = null;

  // ---- DOM refs ----
  var pageBody = document.getElementById('pageBody');

  // ---- Helpers ----
  var PREFIX = 'reb_';

  function getUsers() {
    try { return JSON.parse(localStorage.getItem(PREFIX + 'users') || '[]'); } catch (e) { return []; }
  }

  function getNotes() {
    try { return JSON.parse(localStorage.getItem(PREFIX + 'listing_notes') || '{}'); } catch (e) { return {}; }
  }

  function saveNotes(data) {
    localStorage.setItem(PREFIX + 'listing_notes', JSON.stringify(data));
  }

  // ---- Client Updates (milestone timeline for listing portal) ----
  function getUpdates() {
    try { return JSON.parse(localStorage.getItem(PREFIX + 'lst_updates') || '{}'); } catch (e) { return {}; }
  }

  function saveUpdates(data) {
    localStorage.setItem(PREFIX + 'lst_updates', JSON.stringify(data));
  }

  function addUpdate(lstId, type, title, detail, auto) {
    var allUpdates = getUpdates();
    if (!allUpdates[lstId]) allUpdates[lstId] = [];
    var session = Auth.getSession();
    allUpdates[lstId].push({
      id: generateId(),
      type: type,
      title: title,
      detail: detail || '',
      auto: !!auto,
      author: session ? session.displayName : 'System',
      timestamp: new Date().toISOString()
    });
    saveUpdates(allUpdates);
  }

  // Listing milestone options
  var MILESTONES = [
    { key: 'listing_agreement',   label: 'Listing Agreement Signed',  icon: '📝' },
    { key: 'pre_listing_prep',    label: 'Pre-Listing Prep Started',  icon: '🏠' },
    { key: 'repairs_started',     label: 'Repairs / Touch-Ups Started', icon: '🔧' },
    { key: 'repairs_complete',    label: 'Repairs Complete',           icon: '✅' },
    { key: 'staging_scheduled',   label: 'Staging Scheduled',         icon: '🛋️' },
    { key: 'staging_complete',    label: 'Staging Complete',          icon: '✨' },
    { key: 'photos_scheduled',    label: 'Photography Scheduled',     icon: '📅' },
    { key: 'photos_complete',     label: 'Photos & Video Complete',   icon: '📸' },
    { key: 'sign_installed',      label: 'Sign Installed',            icon: '🪧' },
    { key: 'mls_live',            label: 'Listed on MLS — Live!',     icon: '🚀' },
    { key: 'open_house_scheduled', label: 'Open House Scheduled',     icon: '🏡' },
    { key: 'showing_feedback',    label: 'Showing Feedback Received', icon: '💬' },
    { key: 'offer_received',      label: 'Offer Received',           icon: '📩' },
    { key: 'multiple_offers',     label: 'Multiple Offers Received',  icon: '🔥' },
    { key: 'offer_accepted',      label: 'Offer Accepted!',          icon: '🎉' },
    { key: 'price_adjustment',    label: 'Price Adjustment',          icon: '💲' },
    { key: 'under_contract',      label: 'Under Contract',           icon: '📋' },
    { key: 'sold',                label: 'Sold!',                     icon: '🔑' },
    { key: 'custom',              label: 'Custom Update...',          icon: '✏️' }
  ];

  // Portal link helpers
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

  function generateId() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
  }

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
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
    } else if (viewMode === 'detail' && selectedListingId) {
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
    var l = isEdit ? Data.getListings().find(function (x) { return x.id === editingId; }) : null;

    var html = '';
    html += '<button class="detail-back-btn" data-action="form-cancel"><svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>' + (isEdit ? 'Back to Listing' : 'Back to Listings') + '</button>';

    html += '<div style="max-width:800px">';
    html += '<h2 style="font-size:1.3rem;font-weight:800;color:var(--gray-900);margin-bottom:24px">' + (isEdit ? 'Edit Listing' : 'New Listing') + '</h2>';

    // Property Info Card
    html += '<div class="card" style="padding:0;overflow:hidden;margin-bottom:20px">';
    html += '<div style="padding:14px 20px;background:var(--indigo-light);border-bottom:1px solid rgba(99,102,241,.1);display:flex;align-items:center;gap:10px">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="var(--indigo)"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>';
    html += '<span style="font-size:.92rem;font-weight:700;color:var(--indigo)">Property Information</span></div>';
    html += '<div style="padding:20px 24px">';

    html += '<div class="form-group"><label>Address *</label><input type="text" id="fAddress" value="' + escapeHtml(l ? l.address : '') + '" placeholder="123 Main St, City, ST 12345" style="font-size:1rem;padding:12px 16px"></div>';

    html += '<div class="form-row" style="grid-template-columns:1fr 1fr">';
    html += '<div class="form-group"><label>Price *</label><input type="number" id="fPrice" value="' + (l ? l.price : '') + '" placeholder="500000" min="0" style="font-size:1rem;padding:12px 16px"></div>';
    html += '<div class="form-group"><label>Agent *</label><select id="fAgent" style="padding:12px 16px"></select></div>';
    html += '</div>';

    html += '<div class="form-row" style="grid-template-columns:1fr 1fr 1fr">';
    html += '<div class="form-group"><label>Beds</label><input type="number" id="fBeds" value="' + (l ? l.beds || '' : '') + '" placeholder="3" min="0" style="padding:12px 16px"></div>';
    html += '<div class="form-group"><label>Baths</label><input type="number" id="fBaths" value="' + (l ? l.baths || '' : '') + '" placeholder="2" min="0" step="0.5" style="padding:12px 16px"></div>';
    html += '<div class="form-group"><label>Sq Ft</label><input type="number" id="fSqft" value="' + (l ? l.sqft || '' : '') + '" placeholder="1800" min="0" style="padding:12px 16px"></div>';
    html += '</div>';

    var _lstFormStatuses = getAdminSetting('listings.statuses', [{ key: 'active', label: 'Active' }, { key: 'pending', label: 'Pending' }, { key: 'sold', label: 'Sold' }]);
    html += '<div class="form-row" style="grid-template-columns:1fr 1fr">';
    html += '<div class="form-group"><label>Status</label><select id="fStatus" style="padding:12px 16px">' +
      _lstFormStatuses.map(function (s) { return '<option value="' + s.key + '"' + (l && l.status === s.key ? ' selected' : '') + '>' + s.label + '</option>'; }).join('') +
    '</select></div>';
    html += '<div class="form-group"><label>Listing Date</label><input type="date" id="fDate" value="' + (l ? l.listingDate || '' : '') + '" style="padding:12px 16px"></div>';
    html += '</div>';

    html += '</div></div>';

    // Description Card
    html += '<div class="card" style="padding:0;overflow:hidden;margin-bottom:20px">';
    html += '<div style="padding:14px 20px;background:var(--indigo-light);border-bottom:1px solid rgba(99,102,241,.1);display:flex;align-items:center;gap:10px">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="var(--indigo)"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h6v6h6v10H6z"/></svg>';
    html += '<span style="font-size:.92rem;font-weight:700;color:var(--indigo)">Description</span></div>';
    html += '<div style="padding:20px 24px">';
    html += '<div class="form-group"><textarea id="fDescription" rows="4" placeholder="Property description..." style="padding:12px 16px">' + escapeHtml(l ? l.description || '' : '') + '</textarea></div>';
    html += '</div></div>';

    // Save / Cancel buttons
    html += '<div style="display:flex;gap:12px;margin-bottom:40px">';
    html += '<button class="btn btn-primary btn-lg" data-action="form-save" style="padding:14px 32px;font-size:.95rem">' + (isEdit ? 'Save Changes' : 'Create Listing') + '</button>';
    html += '<button class="btn btn-outline btn-lg" data-action="form-cancel" style="padding:14px 32px;font-size:.95rem">Cancel</button>';
    html += '</div>';

    html += '</div>'; // max-width wrapper

    pageBody.innerHTML = html;
    populateAgentSelect(document.getElementById('fAgent'), l ? l.agent || '' : '');
  }

  // ============================================================
  //  LIST VIEW
  // ============================================================
  function renderList() {
    var listings = Data.getListings();

    // Agent-level access control: non-privileged users only see their own listings
    var session = Auth.getSession();
    var isLead = Auth.isPrivileged() || (typeof getDataAgentName === "function" && getDataAgentName() === null);
    if (!isLead) {
      listings = listings.filter(function (l) { return l.agent === (typeof getDataAgentName === 'function' && getDataAgentName() ? getDataAgentName() : session.displayName); });
    }

    // Build stats
    var total = listings.length;
    var active = listings.filter(function (l) { return l.status === 'active'; }).length;
    var pending = listings.filter(function (l) { return l.status === 'pending'; }).length;
    var sold = listings.filter(function (l) { return l.status === 'sold'; }).length;

    // Unique agents for filter (only for Team Lead)
    var agentSet = {};
    listings.forEach(function (l) { if (l.agent) agentSet[l.agent] = true; });
    var agents = Object.keys(agentSet).sort();

    var html = '';

    // Page Header
    html += '<div class="page-header">' +
      '<div><h2>All Listings</h2></div>' +
      '<button class="btn btn-primary btn-sm" data-action="add-listing">' +
        '<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>' +
        'Add Listing' +
      '</button>' +
    '</div>';

    // Stat Cards
    html += '<div class="lst-stats-grid">';
    html += statCard('Total', total, 'indigo', '<path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>');
    html += statCard('Active', active, 'indigo', '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>');
    html += statCard('Pending', pending, 'amber', '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>');
    html += statCard('Sold', sold, 'emerald', '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>');
    html += '</div>';

    // Filter Bar
    html += '<div class="filter-bar">' +
      '<input type="text" id="searchInput" placeholder="Search by address' + (isLead ? ' or agent' : '') + '...">' +
      '<select id="statusFilter">' +
        '<option value="">All Statuses</option>' +
        getAdminSetting('listings.statuses', [{ key: 'active', label: 'Active' }, { key: 'pending', label: 'Pending' }, { key: 'sold', label: 'Sold' }]).map(function (s) { return '<option value="' + s.key + '">' + s.label + '</option>'; }).join('') +
      '</select>' +
      (isLead ? '<select id="agentFilter">' +
        '<option value="">All Agents</option>' +
        agents.map(function (a) { return '<option value="' + escapeHtml(a) + '">' + escapeHtml(a) + '</option>'; }).join('') +
      '</select>' : '') +
    '</div>';

    // List rows
    html += '<div class="card" id="lstListCard">';
    html += '<div class="list-header">' +
      '<div class="lst-row-address">Address</div>' +
      '<div class="lst-row-specs">Beds / Baths / Sqft</div>' +
      '<div class="lst-row-agent">Agent</div>' +
      '<div class="lst-row-price">Price</div>' +
      '<div class="lst-row-status">Status</div>' +
      '<div class="lst-row-date">Listed</div>' +
    '</div>';
    html += '<div id="lstListBody"></div>';
    html += '<div id="lstEmpty" class="empty-state" style="display:none;">' +
      '<svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>' +
      '<h3>No listings found</h3>' +
      '<p>Add your first listing to get started.</p>' +
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
    var listings = Data.getListings();

    // Agent-level access control: non-privileged users only see their own listings
    var session = Auth.getSession();
    var isLead = Auth.isPrivileged() || (typeof getDataAgentName === "function" && getDataAgentName() === null);
    if (!isLead) {
      listings = listings.filter(function (l) { return l.agent === (typeof getDataAgentName === 'function' && getDataAgentName() ? getDataAgentName() : session.displayName); });
    }

    var searchEl = document.getElementById('searchInput');
    var statusEl = document.getElementById('statusFilter');
    var agentEl = document.getElementById('agentFilter');
    var listBody = document.getElementById('lstListBody');
    var emptyEl = document.getElementById('lstEmpty');

    if (!listBody) return;

    var query = searchEl ? searchEl.value.toLowerCase() : '';
    var statusVal = statusEl ? statusEl.value : '';
    var agentVal = agentEl ? agentEl.value : '';

    var filtered = listings.filter(function (l) {
      var matchSearch = !query ||
        (l.address && l.address.toLowerCase().indexOf(query) > -1) ||
        (l.agent && l.agent.toLowerCase().indexOf(query) > -1);
      var matchStatus = !statusVal || l.status === statusVal;
      var matchAgent = !agentVal || l.agent === agentVal;
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

    listBody.innerHTML = filtered.map(function (l) {
      var cls = agentClass(l.agent);
      var specsText = [];
      if (l.beds) specsText.push(l.beds + ' bd');
      if (l.baths) specsText.push(l.baths + ' ba');
      if (l.sqft) specsText.push(Number(l.sqft).toLocaleString() + ' sqft');

      return '<div class="list-row" data-action="open-detail" data-id="' + l.id + '">' +
        '<div class="lst-row-address">' +
          '<div class="lst-row-address-text">' + escapeHtml(l.address) + '</div>' +
        '</div>' +
        '<div class="lst-row-specs">' + (specsText.length > 0 ? specsText.join(' / ') : '—') + '</div>' +
        '<div class="lst-row-agent">' +
          '<div class="agent-avatar ' + cls + '" style="width:28px;height:28px;font-size:.62rem;">' + getInitials(l.agent) + '</div>' +
          '<div class="lst-row-agent-name">' + escapeHtml(l.agent || '—') + '</div>' +
        '</div>' +
        '<div class="lst-row-price">' + Data.formatCurrencyFull(l.price) + '</div>' +
        '<div class="lst-row-status">' + Data.statusBadge(l.status) + '</div>' +
        '<div class="lst-row-date">' + Data.formatDate(l.listingDate) + '</div>' +
      '</div>';
    }).join('');
  }

  // ============================================================
  //  DETAIL VIEW
  // ============================================================
  function renderDetail() {
    var listings = Data.getListings();
    var l = listings.find(function (x) { return x.id === selectedListingId; });
    if (!l) {
      viewMode = 'list';
      renderList();
      return;
    }

    var allNotes = getNotes();
    var listingNotes = allNotes[selectedListingId] || [];
    // Sort notes newest first
    listingNotes.sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });

    var tasks = Data.getTasks().filter(function (task) {
      return task.linkedId === selectedListingId && task.linkedType === 'listing';
    });

    var users = getUsers();

    var html = '';

    // Back button
    html += '<button class="detail-back-btn" data-action="back-to-list">' +
      '<svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>' +
      'Back to Listings' +
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
      '<input type="text" class="ie-field" data-field="address" value="' + escapeHtml(l.address) + '" style="font-size:1.35rem;font-weight:800;color:var(--gray-900);letter-spacing:-.3px;' + inpStyle + '" ' + inpFocus + '>' +
      '<input type="text" class="ie-field" data-field="price" value="' + Data.formatCurrency(l.price) + '" data-raw="' + (l.price || '') + '" style="font-size:1.1rem;font-weight:700;color:var(--indigo);margin-top:2px;' + inpStyle + '" ' +
        'onfocus="this.style.borderColor=\'var(--indigo)\';this.style.background=\'#fff\';this.value=this.getAttribute(\'data-raw\')" ' +
        'onblur="this.style.borderColor=\'transparent\';this.style.background=\'transparent\'">' +
    '</div>';
    html += '<div class="detail-header-actions">' +
      '<button class="btn btn-outline btn-sm" data-action="share-client" data-id="' + l.id + '" style="color:var(--indigo);border-color:var(--indigo);">Share with Client</button>' +
    '</div>';
    html += '</div>';

    // Detail blocks row — editable
    html += '<div class="detail-blocks-row">';

    // Beds
    html += '<div class="detail-block">' +
      '<div class="detail-block-label">Beds</div>' +
      '<input type="number" class="ie-field" data-field="beds" value="' + (l.beds || '') + '" placeholder="—" min="0" style="font-size:.88rem;font-weight:600;color:var(--gray-800);' + inpStyle + '" ' + inpFocus + '>' +
    '</div>';

    // Baths
    html += '<div class="detail-block">' +
      '<div class="detail-block-label">Baths</div>' +
      '<input type="number" class="ie-field" data-field="baths" value="' + (l.baths || '') + '" placeholder="—" min="0" step="0.5" style="font-size:.88rem;font-weight:600;color:var(--gray-800);' + inpStyle + '" ' + inpFocus + '>' +
    '</div>';

    // Sqft
    html += '<div class="detail-block">' +
      '<div class="detail-block-label">Sq Ft</div>' +
      '<input type="number" class="ie-field" data-field="sqft" value="' + (l.sqft || '') + '" placeholder="—" min="0" style="font-size:.88rem;font-weight:600;color:var(--gray-800);' + inpStyle + '" ' + inpFocus + '>' +
    '</div>';

    // Agent
    html += '<div class="detail-block">' +
      '<div class="detail-block-label">Agent</div>' +
      '<select class="ie-field" data-field="agent" style="font-size:.88rem;font-weight:600;color:var(--gray-800);background:transparent;border:1.5px solid transparent;border-radius:6px;padding:4px 6px;cursor:pointer" ' +
        'onfocus="this.style.borderColor=\'var(--indigo)\'" onblur="this.style.borderColor=\'transparent\'">' +
        users.map(function(u) { return '<option value="' + escapeHtml(u.displayName) + '"' + (u.displayName === l.agent ? ' selected' : '') + '>' + escapeHtml(u.displayName) + '</option>'; }).join('') +
      '</select>' +
    '</div>';

    // Status
    var _lstDetailStatuses = getAdminSetting('listings.statuses', [{ key: 'active', label: 'Active' }, { key: 'pending', label: 'Pending' }, { key: 'sold', label: 'Sold' }]);
    html += '<div class="detail-block">' +
      '<div class="detail-block-label">Status</div>' +
      '<select class="ie-field" data-field="status" style="font-size:.88rem;font-weight:600;color:var(--gray-800);background:transparent;border:1.5px solid transparent;border-radius:6px;padding:4px 6px;cursor:pointer" ' +
        'onfocus="this.style.borderColor=\'var(--indigo)\'" onblur="this.style.borderColor=\'transparent\'">' +
        _lstDetailStatuses.map(function (s) { return '<option value="' + s.key + '"' + (l.status === s.key ? ' selected' : '') + '>' + s.label + '</option>'; }).join('') +
      '</select>' +
    '</div>';

    // Listing Date
    html += '<div class="detail-block">' +
      '<div class="detail-block-label">Listing Date</div>' +
      '<input type="date" class="ie-field" data-field="listingDate" value="' + (l.listingDate || '') + '" style="font-size:.88rem;font-weight:600;color:var(--gray-800);' + inpStyle + '" ' + inpFocus + '>' +
    '</div>';

    html += '</div>'; // detail-blocks-row

    html += '</div>'; // detail-header-body
    html += '</div>'; // detail-header-card

    // Description Card — inline editable
    html += '<div class="desc-card">';
    html += '<div class="desc-card-header">Description</div>';
    html += '<div class="desc-card-body">';
    html += '<textarea class="ie-field" data-field="description" rows="4" placeholder="Add a property description..." style="width:100%;font-size:.88rem;color:var(--gray-700);line-height:1.6;resize:vertical;font-family:inherit;background:transparent;border:1.5px solid transparent;border-radius:6px;padding:8px 10px;transition:all .15s;" ' +
      'onfocus="this.style.borderColor=\'var(--indigo)\';this.style.background=\'#fff\'" onblur="this.style.borderColor=\'transparent\';this.style.background=\'transparent\'">' + escapeHtml(l.description || '') + '</textarea>';
    html += '</div>';
    html += '</div>';

    // Linked Tasks (read-only display)
    if (tasks.length > 0) {
      html += '<div class="desc-card">';
      html += '<div class="desc-card-header">Linked Tasks (' + tasks.length + ')</div>';
      html += '<div style="padding:12px 20px">';
      tasks.forEach(function (task) {
        var done = task.status === 'done';
        html += '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:.85rem;color:' + (done ? 'var(--gray-400)' : 'var(--gray-700)') + ';' + (done ? 'text-decoration:line-through;' : '') + '">' +
          Data.priorityBadge(task.priority) + ' ' + escapeHtml(task.title) +
        '</div>';
      });
      html += '</div>';
      html += '</div>';
    }

    // Client Updates (milestone timeline for portal)
    var allUpdates = getUpdates();
    var lstUpdates = (allUpdates[selectedListingId] || []).slice().sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });

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
    if (lstUpdates.length === 0) {
      html += '<div style="padding:24px;text-align:center;font-size:.85rem;color:var(--gray-400);font-style:italic">No client updates yet. Send a milestone update to keep your seller informed.</div>';
    } else {
      lstUpdates.forEach(function (upd) {
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

    // Notes
    html += '<div class="notes-card">';
    html += '<div class="notes-card-header">Activity &amp; Notes</div>';
    html += '<div class="note-input-area">' +
      '<textarea id="noteInput" placeholder="Add a note..."></textarea>' +
      '<div class="note-input-actions">' +
        '<button class="btn btn-primary btn-sm" data-action="add-note">Add Note</button>' +
      '</div>' +
    '</div>';
    if (listingNotes.length === 0) {
      html += '<div style="padding:20px;text-align:center;font-size:.85rem;color:var(--gray-400);font-style:italic;">No notes yet. Add your first note above.</div>';
    } else {
      listingNotes.forEach(function (note) {
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
      '<button class="btn btn-outline btn-sm" data-action="delete-listing" data-id="' + l.id + '" style="color:var(--rose);border-color:var(--gray-200)">Delete This Listing</button>' +
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

    // Auto-save inline editable fields
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
        if (fieldName === 'beds') val = val ? parseInt(val) : null;
        if (fieldName === 'baths') val = val ? parseFloat(val) : null;
        if (fieldName === 'sqft') val = val ? parseInt(val) : null;

        // Handle status change business logic
        if (fieldName === 'status') {
          var currentListing = Data.getListings().find(function (x) { return x.id === selectedListingId; });
          var oldStatus = currentListing ? currentListing.status : '';

          // Status → Pending: auto-create a transaction from this listing
          if (val === 'pending' && oldStatus !== 'pending') {
            Data.updateListing(selectedListingId, { status: 'pending' });
            addUpdate(selectedListingId, 'under_contract', 'Under Contract', 'An offer has been accepted and the property is now under contract.', true);
            notifyClientEmail(selectedListingId, 'Under Contract', 'An offer has been accepted and the property is now under contract.');
            // Check if a transaction already exists for this address
            var existingTxn = Data.getTransactions().find(function (t) {
              return currentListing && t.address === currentListing.address;
            });
            if (!existingTxn && currentListing) {
              Data.addTransaction({
                address: currentListing.address,
                price: currentListing.price,
                agent: currentListing.agent,
                status: 'pending',
                notes: 'Created from listing',
                closeDate: ''
              });
              showToast('Transaction created from listing.');
            } else {
              showToast('Saved');
            }
            renderDetail();
            return;
          }

          // Status → Sold: mark listing as sold, and close linked transaction if exists
          if (val === 'sold' && oldStatus !== 'sold') {
            Data.updateListing(selectedListingId, { status: 'sold' });
            if (currentListing) {
              var linkedTxn = Data.getTransactions().find(function (t) {
                return t.address === currentListing.address && t.status !== 'closed';
              });
              if (linkedTxn) {
                Data.updateTransaction(linkedTxn.id, {
                  status: 'closed',
                  closeDate: linkedTxn.closeDate || new Date().toISOString().split('T')[0]
                });
              }
            }
            addUpdate(selectedListingId, 'sold', 'Sold!', 'The property has officially sold. Congratulations!', true);
            notifyClientEmail(selectedListingId, 'Sold!', 'The property has officially sold. Congratulations!');
            showToast('Listing sold! Moved to Closed.');
            renderDetail();
            return;
          }
        }

        var update = {};
        update[fieldName] = val;
        Data.updateListing(selectedListingId, update);
        showToast('Saved');
        // Re-render for selects to update display, but not for text fields (cursor issue)
        if (field.tagName === 'SELECT') {
          renderDetail();
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

      case 'add-listing':
        editingId = null;
        viewMode = 'form';
        render();
        break;

      case 'open-detail':
        selectedListingId = target.getAttribute('data-id');
        viewMode = 'detail';
        render();
        break;

      case 'back-to-list':
        viewMode = 'list';
        selectedListingId = null;
        render();
        break;

      case 'delete-listing':
        if (confirm('Delete this listing? This cannot be undone.')) {
          var delId = target.getAttribute('data-id');
          Data.deleteListing(delId);
          // Clean up notes
          var notes = getNotes();
          delete notes[delId];
          saveNotes(notes);
          showToast('Listing deleted.');
          viewMode = 'list';
          selectedListingId = null;
          render();
        }
        break;

      case 'form-cancel':
        if (editingId) {
          viewMode = 'detail';
          selectedListingId = editingId;
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
          beds: (document.getElementById('fBeds') || {}).value ? parseInt(document.getElementById('fBeds').value) : null,
          baths: (document.getElementById('fBaths') || {}).value ? parseFloat(document.getElementById('fBaths').value) : null,
          sqft: (document.getElementById('fSqft') || {}).value ? parseInt(document.getElementById('fSqft').value) : null,
          status: (document.getElementById('fStatus') || {}).value || 'active',
          listingDate: (document.getElementById('fDate') || {}).value || '',
          description: (document.getElementById('fDescription') || {}).value.trim()
        };

        var fListingId;
        if (editingId) {
          Data.updateListing(editingId, fData);
          fListingId = editingId;
          showToast('Listing updated.');
        } else {
          var fResult = Data.addListing(fData);
          fListingId = fResult.id;
          showToast('Listing created.');
        }

        viewMode = 'detail';
        selectedListingId = fListingId;
        editingId = null;
        render();
        break;

      case 'send-update':
        sendClientUpdate();
        break;

      case 'share-client':
        openShareClientModal(target.getAttribute('data-id'));
        break;

      case 'copy-portal-link':
        var urlInput = document.getElementById('sharePortalUrl');
        if (urlInput) {
          urlInput.select();
          document.execCommand('copy');
          showToast('Link copied!');
        }
        break;

      case 'dismiss-email-prompt':
        var emailModal = document.getElementById('emailPromptModal');
        if (emailModal) emailModal.parentNode.removeChild(emailModal);
        break;

      case 'save-client-email':
        var ceInput = document.getElementById('clientEmailInput');
        if (ceInput && ceInput.value.trim()) {
          var allLinks = getPortalLinks();
          var thisLink = allLinks.find(function (lnk) { return lnk.lstId === selectedListingId; });
          if (thisLink) {
            thisLink.clientEmail = ceInput.value.trim();
            savePortalLinks(allLinks);
            showToast('Client email saved!');
          }
        }
        break;

      case 'modal-close':
        var overlay = document.querySelector('.modal-overlay');
        if (overlay) overlay.parentNode.removeChild(overlay);
        break;

      case 'add-note':
        addNote();
        break;
    }
  });

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
      addUpdate(selectedListingId, 'custom', title, detail, false);
    } else {
      title = milestone ? milestone.label : milestoneKey;
      addUpdate(selectedListingId, milestoneKey, title, detail, false);
    }

    showToast('Client update sent!');
    notifyClientEmail(selectedListingId, title, detail);
    renderDetail();
  }

  // ---- Auto-notify client via email ----
  function notifyClientEmail(lstId, updateTitle, updateDetail) {
    // Get client email from portal link
    var links = getPortalLinks();
    var link = links.find(function (l) { return l.lstId === lstId; });
    var clientEmail = link ? (link.clientEmail || '') : '';
    var clientName = link ? (link.clientName || '') : '';

    if (!clientEmail) return;

    var lst = Data.getListings().find(function (l) { return l.id === lstId; });
    var address = lst ? lst.address : '';

    var portalUrl = '';
    if (link) {
      var baseUrl = window.location.href.split('/').slice(0, -1).join('/');
      portalUrl = baseUrl + '/client-portal.html?token=' + link.token;
    }

    var session = Auth.getSession();
    var agentName = session ? session.displayName : 'Your Agent';
    var firstName = clientName ? clientName.split(' ')[0] : '';
    var greeting = firstName ? 'Hi ' + firstName + ',\n\n' : 'Hi,\n\n';

    var subject = 'Update: ' + updateTitle + ' — ' + address;
    var body = greeting +
      'There\'s a new update on your listing at ' + address + ':\n\n' +
      '📌 ' + updateTitle + '\n' +
      (updateDetail ? updateDetail + '\n' : '') +
      '\n' +
      (portalUrl ? 'View your full listing portal here:\n' + portalUrl + '\n\n' : '') +
      'If you have any questions, don\'t hesitate to reach out.\n\n' +
      'Best regards,\n' + agentName;

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
  //  SHARE WITH CLIENT — Portal Link
  // ============================================================
  function openShareClientModal(lstId) {
    var listings = Data.getListings();
    var l = listings.find(function (x) { return x.id === lstId; });
    if (!l) return;

    var links = getPortalLinks();
    var existingLink = links.find(function (lnk) { return lnk.lstId === lstId; });
    var token;
    var savedClientEmail = '';

    if (existingLink) {
      token = existingLink.token;
      savedClientEmail = existingLink.clientEmail || '';
    } else {
      token = generateToken();
      var session = Auth.getSession();
      links.push({
        token: token,
        lstId: lstId,
        type: 'listing',
        clientName: '',
        clientEmail: '',
        createdAt: new Date().toISOString(),
        createdBy: session ? session.displayName : 'Unknown'
      });
      savePortalLinks(links);
    }

    var baseUrl = window.location.href.split('/').slice(0, -1).join('/');
    var portalUrl = baseUrl + '/client-portal.html?token=' + token;

    var emailSubject = 'Your Listing Portal — ' + (l.address || 'Property Listing');
    var emailBody = 'Hi,\\n\\nYou can view your listing details and progress at the link below:\\n\\n' +
      portalUrl + '\\n\\n' +
      'Listing: ' + (l.address || '') + '\\n' +
      'Price: ' + Data.formatCurrencyFull(l.price) + '\\n\\n' +
      'This link gives you access to your listing status, timeline updates, and progress.\\n\\n' +
      'Best regards,\\n' + (l.agent || 'Your Agent');

    var encodedSubject = encodeURIComponent(emailSubject);
    var encodedBody = encodeURIComponent(emailBody.replace(/\\n/g, '\n'));

    var modalHtml = '<div class="modal-overlay open" id="shareClientModal">' +
      '<div class="modal" style="max-width:560px;">' +
        '<div class="modal-header">' +
          '<h3>Share with Client</h3>' +
          '<button class="modal-close" data-action="modal-close">&times;</button>' +
        '</div>' +
        '<div class="modal-body" style="padding:24px">' +
          '<p style="font-size:.88rem;color:var(--gray-500);margin-bottom:16px">Send your client a link to view their listing progress, updates, and status in real-time.</p>' +
          '<div style="margin-bottom:16px">' +
            '<label style="font-size:.78rem;font-weight:600;color:var(--gray-500);display:block;margin-bottom:4px">Client Email (for update notifications)</label>' +
            '<div style="display:flex;gap:8px">' +
              '<input type="email" id="clientEmailInput" value="' + escapeHtml(savedClientEmail) + '" placeholder="client@email.com" style="flex:1;padding:9px 14px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:.85rem;color:var(--gray-700)">' +
              '<button class="btn btn-outline btn-sm" data-action="save-client-email">Save</button>' +
            '</div>' +
          '</div>' +
          '<div style="display:flex;gap:8px;margin-bottom:16px">' +
            '<input type="text" id="sharePortalUrl" value="' + escapeHtml(portalUrl) + '" readonly style="flex:1;padding:9px 14px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:.82rem;color:var(--gray-700);background:var(--gray-50);">' +
            '<button class="btn btn-primary btn-sm" data-action="copy-portal-link" style="white-space:nowrap;">Copy Link</button>' +
          '</div>' +
          '<a href="mailto:?subject=' + encodedSubject + '&body=' + encodedBody + '" class="btn btn-outline btn-sm" style="display:inline-flex;align-items:center;gap:6px;">' +
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>' +
            'Send via Email' +
          '</a>' +
        '</div>' +
      '</div>' +
    '</div>';

    document.body.insertAdjacentHTML('beforeend', modalHtml);
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
    if (!allNotes[selectedListingId]) allNotes[selectedListingId] = [];

    allNotes[selectedListingId].push({
      id: generateId(),
      text: text,
      author: session ? session.displayName : 'Unknown',
      timestamp: new Date().toISOString()
    });

    saveNotes(allNotes);
    showToast('Note added.');
    renderDetail();
  }

  // ---- Init ----
  render();

})();
