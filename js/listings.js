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
  applyPageColor('listings');

  document.getElementById('logoutBtn').addEventListener('click', function () {
    Auth.logout();
  });

  // ---- State ----
  var viewMode = 'list';       // 'list', 'detail', or 'form'
  var selectedListingId = null;
  var fromDealRoom = false;

  // Deep-link: open specific listing
  (function () {
    if (window._forceDetailMode) {
      fromDealRoom = true;
      if (window._forceDetailId) {
        selectedListingId = window._forceDetailId;
        viewMode = 'detail';
      } else {
        viewMode = 'form';
      }
    } else {
      var params = new URLSearchParams(window.location.search);
      var deepId = params.get('id');
      if (params.get('from') === 'dealRoom' || params.get('from') === 'dashboard') fromDealRoom = true;
      if (params.get('action') === 'new') viewMode = 'form';
      if (deepId) { selectedListingId = deepId; viewMode = 'detail'; }
    }
    if (fromDealRoom) {
      var topH1 = document.querySelector('.topbar-title h1');
      if (topH1) topH1.textContent = viewMode === 'form' ? 'New Listing' : 'Deal Detail';
    }
  })();
  var editingId = null;
  var _detailRendered = false;

  function daysUntil(d) {
    if (!d) return null;
    try {
      // Strip any time component — flatpickr stores 'YYYY-MM-DD HH:mm', also tolerate ISO 'YYYY-MM-DDTHH:mm'
      var datePart = String(d).split(' ')[0].split('T')[0];
      var dt = new Date(datePart + 'T00:00:00'), now = new Date();
      if (isNaN(dt.getTime())) return null;
      now.setHours(0,0,0,0);
      return Math.round((dt - now) / 86400000);
    } catch(e) { return null; }
  }

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

  function getParties() {
    try { return JSON.parse(localStorage.getItem(PREFIX + 'lst_parties') || '{}'); } catch (e) { return {}; }
  }

  function saveParties(data) {
    localStorage.setItem(PREFIX + 'lst_parties', JSON.stringify(data));
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

  // Listing milestone options — read from admin config or use defaults
  var MILESTONES = (function () {
    try {
      var raw = localStorage.getItem('reb_portal_config');
      if (raw) {
        var cfg = JSON.parse(raw);
        if (cfg.lstMilestones && cfg.lstMilestones.length) return cfg.lstMilestones;
      }
    } catch (e) {}
    return [
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
  })();

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

  function migratePartyData(data) {
    if (!data) return { sellers: [], contacts: {} };
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
      id: 'tpl-new-listing', name: 'New Listing Checklist', category: 'listing',
      items: [
        { id: 'i19', label: 'Listing agreement signed' }, { id: 'i20', label: 'Pre-listing prep complete' },
        { id: 'i21', label: 'Professional photos scheduled' }, { id: 'i22', label: 'Photos received & approved' },
        { id: 'i23', label: 'Sign installed' }, { id: 'i24', label: 'MLS listing live' },
        { id: 'i25', label: 'Lockbox placed' }, { id: 'i26', label: 'Open house scheduled' },
        { id: 'i27', label: 'Marketing materials distributed' }
      ]
    }
  ];

  function loadChecklistTemplates() {
    var stored = localStorage.getItem(PREFIX + 'checklist_templates');
    if (!stored) return DEFAULT_CHECKLIST_TEMPLATES.slice();
    try {
      var parsed = JSON.parse(stored);
      if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_CHECKLIST_TEMPLATES.slice();
      return parsed;
    } catch (e) { return DEFAULT_CHECKLIST_TEMPLATES.slice(); }
  }

  function getDealChecklists() {
    try { return JSON.parse(localStorage.getItem(PREFIX + 'deal_checklists') || '{}'); } catch (e) { return {}; }
  }

  function saveDealChecklists(data) {
    window._checklistSavedLocally = true; // Prevent api-bridge from overwriting
    localStorage.setItem(PREFIX + 'deal_checklists', JSON.stringify(data));
    // Save directly to server immediately
    if (typeof API !== 'undefined' && API.isLoggedIn()) {
      API.updateSettings({ _deal_checklists: data }).catch(function (err) {
        console.error('Failed to sync checklist to server:', err);
      });
    }
  }

  // Shared compact card renderer — used by both Listing and Escrow checklists so they look identical.
  // opts: { accent: 'indigo'|'emerald', clickAction, toggleAction, draggable, extraAttrs }
  // Render one checklist item as a single row (Linear-style)
  function renderClItemCard(item, opts) {
    var extra = opts.extraAttrs || '';
    var dLeft = item.dueDate ? daysUntil(item.dueDate) : null;

    // Date pill
    var datePill = '';
    if (item.completed) {
      datePill = '<span class="cl-row-date done"><svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>Done</span>';
    } else if (item.dueDate) {
      var dCls = 'future';
      var dLabel;
      if (dLeft === null) {
        dLabel = item.dueDate;
      } else if (dLeft < 0) {
        dCls = 'overdue';
        dLabel = Math.abs(dLeft) + 'd late';
      } else if (dLeft === 0) {
        dCls = 'soon';
        dLabel = 'Today';
      } else if (dLeft === 1) {
        dCls = 'soon';
        dLabel = 'Tomorrow';
      } else if (dLeft <= 7) {
        dCls = 'soon';
        dLabel = dLeft + 'd';
      } else {
        try {
          var dd = new Date(item.dueDate.split(' ')[0] + 'T00:00:00');
          dLabel = dd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } catch(e) { dLabel = item.dueDate; }
      }
      datePill = '<span class="cl-row-date ' + dCls + '">' + dLabel + '</span>';
    }

    // Subtext: vendor · note · completed-by
    var subParts = [];
    if (item.vendor) subParts.push(item.vendor);
    if (item.note) subParts.push(item.note);
    if (item.completed && item.completedBy) subParts.push('by ' + item.completedBy);

    var html = '';
    html += '<div class="cl-item cl-row' + (item.completed ? ' completed' : '') + '" data-item-id="' + escapeHtml(item.id) + '"' + (opts.draggable ? ' draggable="true"' : '') +
      ' data-action="' + opts.clickAction + '"' + extra + '>';
    html += '<span class="cl-row-drag" title="Drag to reorder">&#8801;</span>';
    html += '<input type="checkbox" class="cl-row-check"' + (item.completed ? ' checked' : '') +
      ' data-action="' + opts.toggleAction + '" data-item-id="' + escapeHtml(item.id) + '"' + extra +
      ' onclick="event.stopPropagation()">';
    html += '<div class="cl-row-body">';
    html += '<div class="cl-row-title">' + escapeHtml(item.label) + '</div>';
    if (subParts.length) {
      html += '<div class="cl-row-meta">' + escapeHtml(subParts.join(' · ')) + '</div>';
    }
    html += '</div>';
    if (datePill) html += datePill;
    html += '</div>';
    return html;
  }

  // Group checklist items into Overdue / Due This Week / Upcoming / Completed
  // and render as collapsible sections. Returns HTML string.
  function renderClGrouped(items, opts) {
    var buckets = { overdue: [], week: [], upcoming: [], done: [] };
    var today = new Date(); today.setHours(0, 0, 0, 0);

    items.forEach(function (item) {
      if (item.completed) { buckets.done.push(item); return; }
      if (!item.dueDate) { buckets.upcoming.push(item); return; }
      var dd = new Date(item.dueDate.split(' ')[0] + 'T00:00:00');
      if (isNaN(dd.getTime())) { buckets.upcoming.push(item); return; }
      var diff = Math.round((dd - today) / 86400000);
      if (diff < 0) buckets.overdue.push(item);
      else if (diff <= 7) buckets.week.push(item);
      else buckets.upcoming.push(item);
    });

    function byDate(a, b) {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    }
    buckets.overdue.sort(byDate);
    buckets.week.sort(byDate);
    buckets.upcoming.sort(byDate);
    buckets.done.sort(function (a, b) { return new Date(b.completedAt || 0) - new Date(a.completedAt || 0); });

    var sections = [
      { key: 'overdue', label: 'Overdue', items: buckets.overdue },
      { key: 'week', label: 'Due This Week', items: buckets.week },
      { key: 'upcoming', label: 'Upcoming', items: buckets.upcoming },
      { key: 'done', label: 'Completed', items: buckets.done }
    ];

    var html = '';
    sections.forEach(function (sec) {
      if (sec.items.length === 0) return;
      var collapsed = sec.key === 'done' ? ' cl-section-collapsed' : '';
      html += '<div class="cl-section cl-section-' + sec.key + collapsed + '">';
      html += '<div class="cl-section-header" data-action="toggle-cl-section">';
      html += '<span class="cl-section-dot"></span>';
      html += '<span class="cl-section-label">' + sec.label + '</span>';
      html += '<span class="cl-section-count">' + sec.items.length + '</span>';
      html += '<svg class="cl-section-chevron" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>';
      html += '</div>';
      html += '<div class="cl-section-body">';
      sec.items.forEach(function (item) {
        html += renderClItemCard(item, opts);
      });
      html += '</div>';
      html += '</div>';
    });

    return html;
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
      // selectedVal may be a UUID (server listing) or display name (local listing) — match both
      var sel = (u.id === selectedVal || name === selectedVal) ? ' selected' : '';
      opts += '<option value="' + escapeHtml(u.id) + '" data-name="' + escapeHtml(name) + '"' + sel + '>' + escapeHtml(name) + '</option>';
    });
    selectEl.innerHTML = opts;
  }

  // ---- Representation Modal (shown when listing goes to Pending) ----
  function showRepresentationModal(listing) {
    var old = document.getElementById('repModal');
    if (old) old.remove();

    var overlay = document.createElement('div');
    overlay.id = 'repModal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px)';
    document.body.appendChild(overlay);

    var selectedRep = null;

    // ---- helpers ----
    var inpStyle = 'width:100%;padding:9px 12px;border:1.5px solid var(--gray-200);border-radius:8px;font-family:inherit;font-size:.88rem;box-sizing:border-box';

    function cancelAndReset() {
      overlay.remove();
      var statusSelect = document.querySelector('.ie-field[data-field="status"]');
      if (statusSelect) {
        var cur = Data.getListings().find(function (x) { return x.id === selectedListingId; });
        if (cur) statusSelect.value = cur.status;
      }
    }

    // ---- Step 1: choose representation ----
    function showStep1() {
      overlay.innerHTML =
        '<div style="background:#fff;border-radius:16px;padding:32px;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.2)">' +
          '<h3 style="font-size:1.1rem;font-weight:800;color:var(--gray-900);margin-bottom:6px">Under Contract</h3>' +
          '<p style="font-size:.85rem;color:var(--gray-500);margin-bottom:20px">How did you represent this deal?</p>' +
          '<div style="display:flex;flex-direction:column;gap:10px">' +
            '<button data-rep="Seller" style="padding:14px 20px;border-radius:10px;border:1.5px solid var(--gray-200);background:var(--white);cursor:pointer;text-align:left;transition:all .15s;font-family:inherit">' +
              '<div style="font-size:.92rem;font-weight:700;color:var(--gray-800)">Seller Side Only</div>' +
              '<div style="font-size:.78rem;color:var(--gray-400);margin-top:2px">I represented the seller on this listing</div>' +
            '</button>' +
            '<button data-rep="Buyer" style="padding:14px 20px;border-radius:10px;border:1.5px solid var(--gray-200);background:var(--white);cursor:pointer;text-align:left;transition:all .15s;font-family:inherit">' +
              '<div style="font-size:.92rem;font-weight:700;color:var(--gray-800)">Buyer Side Only</div>' +
              '<div style="font-size:.78rem;color:var(--gray-400);margin-top:2px">I represented the buyer on this property</div>' +
            '</button>' +
            '<button data-rep="Dual" style="padding:14px 20px;border-radius:10px;border:1.5px solid var(--gray-200);background:var(--white);cursor:pointer;text-align:left;transition:all .15s;font-family:inherit">' +
              '<div style="font-size:.92rem;font-weight:700;color:var(--gray-800)">Both Sides (Dual Agent)</div>' +
              '<div style="font-size:.78rem;color:var(--gray-500);margin-top:2px">I represented both buyer and seller</div>' +
            '</button>' +
          '</div>' +
          '<button id="repNextBtn" disabled style="margin-top:16px;width:100%;padding:12px;border:none;border-radius:10px;background:var(--indigo);color:#fff;font-size:.92rem;font-weight:700;cursor:not-allowed;opacity:.4;font-family:inherit;transition:opacity .15s">Next</button>' +
          '<button id="repCancelBtn" style="margin-top:8px;width:100%;padding:10px;border:none;background:none;color:var(--gray-400);font-size:.82rem;cursor:pointer;font-family:inherit">Cancel</button>' +
        '</div>';

      var repBtns = overlay.querySelectorAll('[data-rep]');
      var nextBtn = overlay.querySelector('#repNextBtn');

      repBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          selectedRep = btn.getAttribute('data-rep');
          repBtns.forEach(function (b) {
            b.style.border = '1.5px solid var(--gray-200)';
            b.style.background = 'var(--white)';
            b.querySelector('div').style.color = 'var(--gray-800)';
          });
          btn.style.border = '2px solid var(--indigo)';
          btn.style.background = 'var(--indigo-light)';
          btn.querySelector('div').style.color = 'var(--indigo)';
          nextBtn.disabled = false;
          nextBtn.style.opacity = '1';
          nextBtn.style.cursor = 'pointer';
        });
      });

      nextBtn.addEventListener('click', function () {
        if (!selectedRep) return;
        showStep2();
      });

      overlay.querySelector('#repCancelBtn').addEventListener('click', cancelAndReset);
      overlay.addEventListener('click', function (e) { if (e.target === overlay) cancelAndReset(); });
    }

    // ---- Step 2: party info ----
    function showStep2() {
      var showBuyer  = selectedRep === 'Buyer'  || selectedRep === 'Dual';
      var showSeller = selectedRep === 'Seller' || selectedRep === 'Dual';

      // mutable arrays for each party list
      var buyers  = [{ name: '', phone: '', email: '' }];
      var sellers = [{ name: '', phone: '', email: '' }];

      function buildPartyRows(type, arr) {
        var color = type === 'buyer' ? 'var(--indigo)' : '#EC4899';
        var label = type === 'buyer' ? 'Buyer' : 'Seller';
        var h = '';
        arr.forEach(function (p, idx) {
          if (idx > 0) h += '<div style="border-top:1px solid var(--gray-100);margin:10px 0"></div>';
          h += '<div style="margin-bottom:6px;display:flex;gap:6px;align-items:center">';
          h += '<input type="text" data-ptype="' + type + '" data-pidx="' + idx + '" data-pf="name" placeholder="' + label + ' name" value="' + escapeHtml(p.name) + '" style="' + inpStyle + '">';
          if (idx > 0) h += '<button type="button" data-rm-party data-ptype="' + type + '" data-pidx="' + idx + '" style="padding:6px 10px;border:1.5px solid var(--gray-200);border-radius:8px;color:var(--rose);background:none;cursor:pointer;flex-shrink:0;font-family:inherit">&times;</button>';
          h += '</div>';
          h += '<div style="display:flex;gap:6px">';
          h += '<input type="tel" data-ptype="' + type + '" data-pidx="' + idx + '" data-pf="phone" placeholder="Phone" value="' + escapeHtml(p.phone) + '" style="' + inpStyle + '">';
          h += '<input type="email" data-ptype="' + type + '" data-pidx="' + idx + '" data-pf="email" placeholder="Email" value="' + escapeHtml(p.email) + '" style="' + inpStyle + '">';
          h += '</div>';
        });
        return h;
      }

      function syncFromDom() {
        // read current field values back into arrays before rebuilding
        overlay.querySelectorAll('[data-pf]').forEach(function (inp) {
          var ptype = inp.getAttribute('data-ptype');
          var idx   = parseInt(inp.getAttribute('data-pidx'), 10);
          var field = inp.getAttribute('data-pf');
          var arr   = ptype === 'buyer' ? buyers : sellers;
          if (arr[idx]) arr[idx][field] = inp.value;
        });
      }

      function renderStep2() {
        var labelStyle = 'font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.4px;margin-bottom:10px;margin-top:18px';
        var h = '';
        h += '<h3 style="font-size:1.1rem;font-weight:800;color:var(--gray-900);margin-bottom:4px">Party Information</h3>';
        h += '<p style="font-size:.82rem;color:var(--gray-400);margin-bottom:6px">' + listing.address + ' &mdash; ' + selectedRep + ' representation</p>';

        if (showBuyer) {
          h += '<div style="' + labelStyle + ';color:var(--indigo)">Buyer(s)</div>';
          h += '<div id="buyerRows">' + buildPartyRows('buyer', buyers) + '</div>';
          h += '<button type="button" id="addBuyerBtn" style="margin-top:8px;padding:6px 14px;border:1.5px dashed var(--indigo);border-radius:8px;background:var(--indigo-light);color:var(--indigo);font-size:.8rem;font-weight:600;cursor:pointer;font-family:inherit">+ Add Buyer</button>';
        }

        if (showSeller) {
          h += '<div style="' + labelStyle + ';color:#BE185D">Seller(s)</div>';
          h += '<div id="sellerRows">' + buildPartyRows('seller', sellers) + '</div>';
          h += '<button type="button" id="addSellerBtn" style="margin-top:8px;padding:6px 14px;border:1.5px dashed #EC4899;border-radius:8px;background:#FDF2F8;color:#BE185D;font-size:.8rem;font-weight:600;cursor:pointer;font-family:inherit">+ Add Seller</button>';
        }

        h += '<div style="font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.4px;margin-top:18px;margin-bottom:8px;color:var(--emerald)">Close of Escrow Date</div>';
        h += '<input type="date" id="repCloseDate" style="' + inpStyle + '">';

        h += '<div style="display:flex;gap:8px;margin-top:20px">';
        h += '<button type="button" id="repBackBtn" style="padding:11px 18px;border:1.5px solid var(--gray-200);border-radius:10px;background:none;color:var(--gray-500);font-size:.88rem;font-weight:600;cursor:pointer;font-family:inherit">Back</button>';
        h += '<button type="button" id="repSavePartyBtn" style="flex:1;padding:12px;border:none;border-radius:10px;background:var(--indigo);color:#fff;font-size:.92rem;font-weight:700;cursor:pointer;font-family:inherit">Save &amp; Create Escrow</button>';
        h += '</div>';
        h += '<button type="button" id="repSkipBtn" style="margin-top:8px;width:100%;padding:8px;border:none;background:none;color:var(--gray-400);font-size:.78rem;cursor:pointer;font-family:inherit">Skip — add party info later</button>';

        overlay.querySelector('#repStep2Inner').innerHTML = h;
        attachStep2Events();
      }

      function attachStep2Events() {
        var addBuyerBtn  = overlay.querySelector('#addBuyerBtn');
        var addSellerBtn = overlay.querySelector('#addSellerBtn');
        var backBtn      = overlay.querySelector('#repBackBtn');
        var saveBtn      = overlay.querySelector('#repSavePartyBtn');
        var skipBtn      = overlay.querySelector('#repSkipBtn');

        if (addBuyerBtn) addBuyerBtn.addEventListener('click', function () {
          syncFromDom();
          buyers.push({ name: '', phone: '', email: '' });
          renderStep2();
        });

        if (addSellerBtn) addSellerBtn.addEventListener('click', function () {
          syncFromDom();
          sellers.push({ name: '', phone: '', email: '' });
          renderStep2();
        });

        overlay.querySelectorAll('[data-rm-party]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            syncFromDom();
            var ptype = btn.getAttribute('data-ptype');
            var idx   = parseInt(btn.getAttribute('data-pidx'), 10);
            if (ptype === 'buyer') buyers.splice(idx, 1);
            else sellers.splice(idx, 1);
            renderStep2();
          });
        });

        if (backBtn) backBtn.addEventListener('click', showStep1);

        if (saveBtn) saveBtn.addEventListener('click', function () {
          syncFromDom();
          var closeDateEl = overlay.querySelector('#repCloseDate');
          finalize(buyers, sellers, closeDateEl ? closeDateEl.value : '');
        });

        if (skipBtn) skipBtn.addEventListener('click', function () {
          var closeDateEl = overlay.querySelector('#repCloseDate');
          finalize([], [], closeDateEl ? closeDateEl.value : '');
        });
      }

      overlay.innerHTML =
        '<div style="background:#fff;border-radius:16px;padding:32px;max-width:520px;width:92%;box-shadow:0 20px 60px rgba(0,0,0,.2);max-height:90vh;overflow-y:auto">' +
          '<div id="repStep2Inner"></div>' +
        '</div>';
      renderStep2();
    }

    // ---- Finalize: create transaction + save parties ----
    function finalize(buyersArr, sellersArr, closeDate) {
      overlay.remove();

      Data.updateListing(selectedListingId, { status: 'pending' });

      var linkedTxn = Data.getTransactions().find(function (t) {
        return t.address === listing.address && t.status !== 'closed';
      });
      var txnId;
      if (linkedTxn) {
        var txnUpdates = { status: 'pending', type: selectedRep };
        if (closeDate) txnUpdates.closeDate = closeDate;
        Data.updateTransaction(linkedTxn.id, txnUpdates);
        txnId = linkedTxn.id;
        showToast('Escrow updated — ' + selectedRep + ' representation');
      } else {
        var newTxn = Data.addTransaction({
          address: listing.address, city: listing.city, state: listing.state, zip: listing.zip,
          price: listing.price, agent: listing.agent, source: listing.source,
          type: selectedRep, status: 'pending',
          notes: 'Created from listing (' + selectedRep + ' representation)', closeDate: closeDate || ''
        });
        txnId = newTxn.id;
        showToast('Transaction created — ' + selectedRep + ' representation');
      }

      // Save party data
      var hasBuyers  = buyersArr.some(function (b) { return b.name || b.phone || b.email; });
      var hasSellers = sellersArr.some(function (s) { return s.name || s.phone || s.email; });
      if (txnId && (hasBuyers || hasSellers)) {
        var allParties = JSON.parse(localStorage.getItem('reb_txn_parties') || '{}');
        var existing = allParties[txnId] || { buyers: [], sellers: [], contacts: {} };
        if (!existing.buyers) existing.buyers = [];
        if (!existing.sellers) existing.sellers = [];
        if (hasBuyers)  existing.buyers  = buyersArr.filter(function (b) { return b.name || b.phone || b.email; }).map(function (b) { return { name: b.name || '', phone: b.phone || '', email: b.email || '', relationship: 'Primary' }; });
        if (hasSellers) existing.sellers = sellersArr.filter(function (s) { return s.name || s.phone || s.email; }).map(function (s) { return { name: s.name || '', phone: s.phone || '', email: s.email || '', relationship: 'Primary' }; });
        allParties[txnId] = existing;
        localStorage.setItem('reb_txn_parties', JSON.stringify(allParties));
      }

      // Navigate to the new escrow in transactions
      window.location.href = 'deal-detail-txn.html#' + txnId;
    }

    showStep1();
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
    html += '<button class="detail-back-btn" data-action="form-cancel"><svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>' + (isEdit ? 'Back to Listing' : fromDealRoom ? 'Back to Deal Room' : 'Back to Listings') + '</button>';

    html += '<div style="max-width:800px">';
    html += '<h2 style="font-size:1.3rem;font-weight:800;color:var(--gray-900);margin-bottom:24px">' + (isEdit ? 'Edit Listing' : 'New Listing') + '</h2>';

    // Property Info Card
    html += '<div class="card" style="padding:0;overflow:hidden;margin-bottom:20px">';
    html += '<div style="padding:14px 20px;background:var(--indigo-light);border-bottom:1px solid rgba(99,102,241,.1);display:flex;align-items:center;gap:10px">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="var(--indigo)"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>';
    html += '<span style="font-size:.92rem;font-weight:700;color:var(--indigo)">Property Information</span></div>';
    html += '<div style="padding:20px 24px">';

    html += '<div class="form-group"><label>Address *</label><input type="text" id="fAddress" value="' + escapeHtml(l ? l.address : '') + '" placeholder="123 Main St" style="font-size:1rem;padding:12px 16px"></div>';
    html += '<div class="form-row" style="grid-template-columns:2fr 1fr 1fr">';
    html += '<div class="form-group"><label>City</label><input type="text" id="fCity" value="' + escapeHtml(l ? l.city || '' : '') + '" placeholder="Santa Barbara" style="padding:12px 16px"></div>';
    html += '<div class="form-group"><label>State</label><input type="text" id="fState" value="' + escapeHtml(l ? l.state || '' : '') + '" placeholder="CA" maxlength="2" style="padding:12px 16px"></div>';
    html += '<div class="form-group"><label>Zip</label><input type="text" id="fZip" value="' + escapeHtml(l ? l.zip || '' : '') + '" placeholder="93101" maxlength="10" style="padding:12px 16px"></div>';
    html += '</div>';

    var _fPriceVal = (l && l.price) ? '$' + parseFloat(l.price).toLocaleString('en-US') : '';
    html += '<div class="form-group"><label>Price *</label><input type="text" id="fPrice" value="' + _fPriceVal + '" placeholder="$500,000" style="font-size:1rem;padding:12px 16px" oninput="var r=this.value.replace(/[^0-9]/g,\'\');this.value=r?\'$\'+parseInt(r,10).toLocaleString(\'en-US\'):\'\'"></div>';

    html += '<div class="form-row" style="grid-template-columns:1fr 1fr 1fr">';
    html += '<div class="form-group"><label>Beds</label><input type="number" id="fBeds" value="' + (l ? l.beds || '' : '') + '" placeholder="3" min="0" style="padding:12px 16px"></div>';
    html += '<div class="form-group"><label>Baths</label><input type="number" id="fBaths" value="' + (l ? l.baths || '' : '') + '" placeholder="2" min="0" step="0.5" style="padding:12px 16px"></div>';
    html += '<div class="form-group"><label>Sq Ft</label><input type="number" id="fSqft" value="' + (l ? l.sqft || '' : '') + '" placeholder="1800" min="0" style="padding:12px 16px"></div>';
    html += '</div>';

    var _lstFormStatuses = getAdminSetting('listings.statuses', [{ key: 'pre_listing', label: 'Pre-Listing' }, { key: 'coming_soon', label: 'Coming Soon' }, { key: 'active', label: 'Active' }, { key: 'pending', label: 'Pending' }, { key: 'sold', label: 'Sold' }]);
    html += '<div class="form-row" style="grid-template-columns:1fr 1fr 1fr">';
    html += '<div class="form-group"><label>Status</label><select id="fStatus" style="padding:12px 16px">' +
      _lstFormStatuses.map(function (s) { return '<option value="' + s.key + '"' + (l && l.status === s.key ? ' selected' : '') + '>' + s.label + '</option>'; }).join('') +
    '</select></div>';
    html += '<div class="form-group"><label>Property Type</label><select id="fPropertyType" style="padding:12px 16px">';
    html += '<option value="">Select type...</option>';
    ['Single Family','Condo','Townhouse','Multi-Family','Land','Commercial','Other'].forEach(function(pt) {
      html += '<option value="' + pt + '"' + (l && l.propertyType === pt ? ' selected' : '') + '>' + pt + '</option>';
    });
    html += '</select></div>';
    html += '<div class="form-group"><label>Listing Date</label><input type="date" id="fDate" value="' + (l ? l.listingDate || '' : '') + '" style="padding:12px 16px"></div>';
    html += '</div>';
    var _lstLeadSources = getAdminSetting('leadSources', ['Zillow','Realtor.com','Referral','Other']);
    html += '<div class="form-row" style="grid-template-columns:1fr 1fr">';
    html += '<div class="form-group"><label>Agent *</label><select id="fAgent" style="padding:12px 16px"></select></div>';
    html += '<div class="form-group"><label>Lead Source</label><select id="fSource" style="padding:12px 16px"><option value="">Select source...</option>' +
      _lstLeadSources.map(function (s) { return '<option value="' + escapeHtml(s) + '"' + (l && l.source === s ? ' selected' : '') + '>' + escapeHtml(s) + '</option>'; }).join('') +
    '</select></div>';
    html += '</div>';

    html += '</div></div>';

    // Load listing parties
    var lstParties = getParties();
    var rawLstP = l ? (lstParties[l.id] || {}) : {};
    var lstP = migratePartyData(rawLstP);
    var sellers = lstP.sellers.length ? lstP.sellers : [{ name: '', phone: '', email: '', relationship: 'Primary' }];
    var contacts = lstP.contacts;

    // Seller Info
    html += '<div class="card" style="padding:0;overflow:hidden;margin-bottom:20px">';
    html += '<div style="padding:14px 20px;background:#FDF2F8;border-bottom:1px solid rgba(236,72,153,.1);display:flex;align-items:center;gap:10px;justify-content:space-between">';
    html += '<div style="display:flex;align-items:center;gap:10px">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="#EC4899"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
    html += '<span style="font-size:.92rem;font-weight:700;color:#BE185D">Seller / Owner(s)</span></div>';
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

    // Listing Contacts
    html += '<div class="card" style="padding:0;overflow:hidden;margin-bottom:20px">';
    html += '<div style="padding:14px 20px;background:var(--emerald-light);border-bottom:1px solid rgba(16,185,129,.1);display:flex;align-items:center;gap:10px">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="var(--emerald)"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>';
    html += '<span style="font-size:.92rem;font-weight:700;color:var(--emerald)">Listing Contacts</span></div>';
    html += '<div style="padding:20px 24px">';
    var _lstContactTypes = [
      { key: 'escrow', label: 'Escrow Company', namePlaceholder: 'Company / contact name' },
      { key: 'title', label: 'Title Company', namePlaceholder: 'Company / contact name' },
      { key: 'otherAgent', label: 'Other Agent', namePlaceholder: 'Agent name' },
      { key: 'tc', label: 'Transaction Coordinator', namePlaceholder: 'Name' },
      { key: 'assistant', label: 'Assistant', namePlaceholder: 'Name' }
    ];
    _lstContactTypes.forEach(function (ct) {
      var c = contacts[ct.key] || {};
      html += '<div style="margin-bottom:16px">';
      html += '<div style="font-size:.75rem;font-weight:600;color:var(--gray-400);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">' + ct.label + '</div>';
      html += '<div class="form-group" style="margin-bottom:6px"><input type="text" class="contact-field" data-ctype="' + ct.key + '" data-cfield="name" value="' + escapeHtml(c.name || c.company || '') + '" placeholder="' + ct.namePlaceholder + '"></div>';
      html += '<div class="form-row"><div class="form-group"><input type="tel" class="contact-field" data-ctype="' + ct.key + '" data-cfield="phone" value="' + escapeHtml(c.phone || '') + '" placeholder="Phone"></div>';
      html += '<div class="form-group"><input type="email" class="contact-field" data-ctype="' + ct.key + '" data-cfield="email" value="' + escapeHtml(c.email || '') + '" placeholder="Email"></div></div>';
      html += '</div>';
    });
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
    populateAgentSelect(document.getElementById('fAgent'), l ? (l.agentId || l.agent || '') : '');
  }

  // ============================================================
  //  LIST VIEW
  // ============================================================
  function renderList() {
    // Silently refresh listings from server so all users always see latest data.
    // Call renderListRows (not render/renderList) to avoid re-triggering refreshListings.
    if (typeof ApiBridge !== 'undefined' && ApiBridge.refreshListings) {
      ApiBridge.refreshListings().then(function () {
        if (viewMode === 'list') renderListRows();
      });
    }
    var listings = Data.getListings();

    // Build stats
    var total = listings.length;
    var comingSoon = listings.filter(function (l) { return l.status === 'coming_soon'; }).length;
    var active = listings.filter(function (l) { return l.status === 'active'; }).length;
    var pending = listings.filter(function (l) { return l.status === 'pending'; }).length;
    var sold = listings.filter(function (l) { return l.status === 'sold'; }).length;

    // Unique agents for filter
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
    html += statCard('Coming Soon', comingSoon, 'violet', '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>');
    html += statCard('Active', active, 'indigo', '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>');
    html += statCard('Pending', pending, 'amber', '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>');
    html += statCard('Sold', sold, 'emerald', '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>');
    html += '</div>';

    // Filter Bar
    html += '<div class="filter-bar">' +
      '<input type="text" id="searchInput" placeholder="Search by address or agent...">' +
      '<select id="agentFilter">' +
        '<option value="">All Agents</option>' +
        agents.map(function (a) { return '<option value="' + escapeHtml(a) + '">' + escapeHtml(a) + '</option>'; }).join('') +
      '</select>' +
    '</div>';

    // List header helper
    var listHeader = '<div class="list-header">' +
      '<div class="lst-row-address">Address</div>' +
      '<div class="lst-row-specs">Beds / Baths / Sqft</div>' +
      '<div class="lst-row-agent">Agent</div>' +
      '<div class="lst-row-price">Price</div>' +
      '<div class="lst-row-status">Status</div>' +
      '<div class="lst-row-date">Listed</div>' +
    '</div>';

    // ---- Coming Soon Section ----
    html += '<div style="margin-bottom:28px">';
    html += '<h3 style="font-size:1rem;font-weight:700;color:var(--gray-800);margin-bottom:10px;display:flex;align-items:center;gap:8px">' +
      '<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;background:#F3E8FF;color:#7C3AED;font-size:.8rem">&#9733;</span>' +
      'Coming Soon <span id="comingSoonCount" style="font-size:.78rem;font-weight:600;color:var(--gray-400)"></span></h3>';
    html += '<div class="card">';
    html += listHeader;
    html += '<div id="lstComingSoonBody"></div>';
    html += '<div id="lstComingSoonEmpty" class="empty-state" style="display:none;padding:24px">' +
      '<p style="font-size:.88rem;color:var(--gray-400)">No coming soon listings</p></div>';
    html += '</div></div>';

    // ---- Active Listings Section ----
    html += '<div style="margin-bottom:28px">';
    html += '<h3 style="font-size:1rem;font-weight:700;color:var(--gray-800);margin-bottom:10px;display:flex;align-items:center;gap:8px">' +
      '<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;background:#DBEAFE;color:#1D4ED8;font-size:.8rem">&#9679;</span>' +
      'Active Listings <span id="activeCount" style="font-size:.78rem;font-weight:600;color:var(--gray-400)"></span></h3>';
    html += '<div class="card">';
    html += listHeader;
    html += '<div id="lstActiveBody"></div>';
    html += '<div id="lstActiveEmpty" class="empty-state" style="display:none;padding:24px">' +
      '<p style="font-size:.88rem;color:var(--gray-400)">No active listings</p></div>';
    html += '</div></div>';

    // ---- Pending Section ----
    html += '<div style="margin-bottom:28px">';
    html += '<h3 style="font-size:1rem;font-weight:700;color:var(--gray-800);margin-bottom:10px;display:flex;align-items:center;gap:8px">' +
      '<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;background:#FEF3C7;color:#92400E;font-size:.8rem">&#9202;</span>' +
      'Pending <span id="pendingCount" style="font-size:.78rem;font-weight:600;color:var(--gray-400)"></span></h3>';
    html += '<div class="card">';
    html += listHeader;
    html += '<div id="lstPendingBody"></div>';
    html += '<div id="lstPendingEmpty" class="empty-state" style="display:none;padding:24px">' +
      '<p style="font-size:.88rem;color:var(--gray-400)">No pending listings</p></div>';
    html += '</div></div>';

    // ---- Sold Section ----
    html += '<div style="margin-bottom:28px">';
    html += '<h3 style="font-size:1rem;font-weight:700;color:var(--gray-800);margin-bottom:10px;display:flex;align-items:center;gap:8px">' +
      '<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;background:var(--emerald-light);color:#065F46;font-size:.8rem">&#10003;</span>' +
      'Sold <span id="soldCount" style="font-size:.78rem;font-weight:600;color:var(--gray-400)"></span></h3>';
    html += '<div class="card">';
    html += listHeader;
    html += '<div id="lstSoldBody"></div>';
    html += '<div id="lstSoldEmpty" class="empty-state" style="display:none;padding:24px">' +
      '<p style="font-size:.88rem;color:var(--gray-400)">No sold listings</p></div>';
    html += '</div></div>';

    pageBody.innerHTML = html;

    // Now render filtered list rows
    renderListRows();

    // Attach filter listeners
    document.getElementById('searchInput').addEventListener('input', renderListRows);
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

    var searchEl = document.getElementById('searchInput');
    var agentEl = document.getElementById('agentFilter');

    var query = searchEl ? searchEl.value.toLowerCase() : '';
    var agentVal = agentEl ? agentEl.value : '';

    var filtered = listings.filter(function (l) {
      var matchSearch = !query ||
        (l.address && l.address.toLowerCase().indexOf(query) > -1) ||
        (l.agent && l.agent.toLowerCase().indexOf(query) > -1);
      var matchAgent = !agentVal || l.agent === agentVal;
      return matchSearch && matchAgent;
    });

    // Sort by createdAt desc
    filtered.sort(function (a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // Split into sections
    var comingSoonList = filtered.filter(function (l) { return l.status === 'coming_soon'; });
    var activeList = filtered.filter(function (l) { return l.status === 'active'; });
    var pendingList = filtered.filter(function (l) { return l.status === 'pending'; });
    var soldList = filtered.filter(function (l) { return l.status === 'sold'; });

    // Render helper
    function renderRows(items) {
      return items.map(function (l) {
        var cls = agentClass(l.agent);
        var specsText = [];
        if (l.beds) specsText.push(l.beds + ' bd');
        if (l.baths) specsText.push(l.baths + ' ba');
        if (l.sqft) specsText.push(Number(l.sqft).toLocaleString() + ' sqft');

        var addrSub = [l.city, l.state, l.zip].filter(Boolean).join(', ');
        return '<div class="list-row" data-action="open-detail" data-id="' + l.id + '">' +
          '<div class="lst-row-address">' +
            '<div class="lst-row-address-text">' + escapeHtml(l.address) + '</div>' +
            (addrSub ? '<div style="font-size:.75rem;color:var(--gray-400);margin-top:1px">' + escapeHtml(addrSub) + '</div>' : '') +
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

    // Active listings with open house scheduling (up to 3 per listing)
    function renderActiveRows(items) {
      var ohUsers = getUsers().filter(function (u) { return u.role !== 'Assistant'; });

      function getOpenHouses(l) {
        if (l.openHouses && Array.isArray(l.openHouses)) return l.openHouses;
        if (l.openHouse && l.openHouse.date) return [l.openHouse];
        return [];
      }

      function fmtOhDate(d) {
        if (!d) return '';
        var dt = new Date(d + 'T00:00:00');
        return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      }

      function fmtOhTime(t) {
        if (!t) return '';
        var p = t.split(':'), h = parseInt(p[0]), m = p[1];
        return (h === 0 ? 12 : h > 12 ? h - 12 : h) + ':' + m + ' ' + (h >= 12 ? 'PM' : 'AM');
      }

      var agentOpts = '<option value="">Select agent...</option>' + ohUsers.map(function (u) {
        return '<option value="' + escapeHtml(u.displayName) + '">' + escapeHtml(u.displayName) + '</option>';
      }).join('');

      var inputStyle = 'padding:9px 12px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:.85rem;color:var(--gray-800);background:#fff;width:100%;transition:border-color .15s';
      var labelStyle = 'display:block;font-size:.7rem;font-weight:700;color:var(--gray-500);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px';

      return items.map(function (l) {
        var cls = agentClass(l.agent);
        var specsText = [];
        if (l.beds) specsText.push(l.beds + ' bd');
        if (l.baths) specsText.push(l.baths + ' ba');
        if (l.sqft) specsText.push(Number(l.sqft).toLocaleString() + ' sqft');

        var ohs = getOpenHouses(l);
        var canAdd = ohs.length < 3;

        var ohListHtml = ohs.map(function (oh, idx) {
          return '<div style="display:flex;align-items:center;gap:8px;padding:4px 0">' +
            '<span style="font-size:.68rem;font-weight:700;color:#fff;background:var(--emerald);padding:2px 8px;border-radius:20px;flex-shrink:0;letter-spacing:.2px">Open House</span>' +
            '<span style="font-size:.8rem;font-weight:600;color:var(--gray-700)">' + escapeHtml(oh.agent || '') + '</span>' +
            '<span style="font-size:.78rem;color:var(--gray-500)">' + fmtOhDate(oh.date) + (oh.time ? ' &middot; ' + fmtOhTime(oh.time) : '') + '</span>' +
            '<button class="btn btn-outline btn-sm" data-action="remove-oh" data-id="' + l.id + '" data-idx="' + idx + '" style="padding:1px 7px;font-size:.7rem;color:var(--rose);border-color:var(--rose);margin-left:2px" title="Remove">&times;</button>' +
          '</div>';
        }).join('');

        var addBtn = canAdd
          ? '<button class="btn btn-outline btn-sm" data-action="toggle-oh-form" data-id="' + l.id + '" style="padding:2px 10px;font-size:.75rem;color:var(--indigo);border-color:var(--indigo);margin-top:' + (ohs.length > 0 ? '5px' : '0') + ';align-self:flex-start">+ Open House</button>'
          : '';

        var ohFormHtml = canAdd
          ? '<div id="oh-form-' + l.id + '" style="display:none;padding:14px 20px 16px;background:var(--gray-50);border-top:1px solid var(--gray-100);border-bottom:1px solid var(--gray-50)">' +
              '<div style="font-size:.82rem;font-weight:700;color:var(--gray-700);margin-bottom:12px">Schedule Open House</div>' +
              '<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">' +
                '<div style="flex:2;min-width:150px">' +
                  '<label style="' + labelStyle + '">Agent</label>' +
                  '<select id="oh-agent-' + l.id + '" style="' + inputStyle + '">' + agentOpts + '</select>' +
                '</div>' +
                '<div style="flex:1;min-width:130px">' +
                  '<label style="' + labelStyle + '">Date</label>' +
                  '<input type="date" id="oh-date-' + l.id + '" style="' + inputStyle + '">' +
                '</div>' +
                '<div style="flex:1;min-width:120px">' +
                  '<label style="' + labelStyle + '">Start Time</label>' +
                  '<input type="time" id="oh-time-' + l.id + '" style="' + inputStyle + '">' +
                '</div>' +
                '<div style="display:flex;gap:6px;padding-bottom:1px;flex-shrink:0">' +
                  '<button class="btn btn-primary btn-sm" data-action="save-oh" data-id="' + l.id + '" style="padding:9px 18px;font-size:.85rem">Save</button>' +
                  '<button class="btn btn-outline btn-sm" data-action="toggle-oh-form" data-id="' + l.id + '" style="padding:9px 12px;font-size:.85rem">Cancel</button>' +
                '</div>' +
              '</div>' +
            '</div>'
          : '';

        return (
          '<div data-action="open-detail" data-id="' + l.id + '" style="cursor:pointer;border-bottom:1px solid var(--gray-50)">' +
            '<div class="list-row" style="border-bottom:none">' +
              '<div class="lst-row-address"><div class="lst-row-address-text">' + escapeHtml(l.address) + '</div>' +
              (addrSub ? '<div style="font-size:.75rem;color:var(--gray-400);margin-top:1px">' + escapeHtml(addrSub) + '</div>' : '') + '</div>' +
              '<div class="lst-row-specs">' + (specsText.length > 0 ? specsText.join(' / ') : '—') + '</div>' +
              '<div class="lst-row-agent">' +
                '<div class="agent-avatar ' + cls + '" style="width:28px;height:28px;font-size:.62rem;">' + getInitials(l.agent) + '</div>' +
                '<div class="lst-row-agent-name">' + escapeHtml(l.agent || '—') + '</div>' +
              '</div>' +
              '<div class="lst-row-price">' + Data.formatCurrencyFull(l.price) + '</div>' +
              '<div class="lst-row-status">' + Data.statusBadge(l.status) + '</div>' +
              '<div class="lst-row-date">' + Data.formatDate(l.listingDate) + '</div>' +
            '</div>' +
            '<div style="padding:6px 20px 8px;background:#fff;display:flex;flex-direction:column">' +
              ohListHtml + addBtn +
            '</div>' +
          '</div>' +
          ohFormHtml
        );
      }).join('');
    }

    // Coming Soon
    var csBody = document.getElementById('lstComingSoonBody');
    var csEmpty = document.getElementById('lstComingSoonEmpty');
    var csCount = document.getElementById('comingSoonCount');
    if (csBody) {
      csBody.innerHTML = renderRows(comingSoonList);
      if (csEmpty) csEmpty.style.display = comingSoonList.length === 0 ? 'block' : 'none';
      if (csCount) csCount.textContent = '(' + comingSoonList.length + ')';
    }

    // Active
    var actBody = document.getElementById('lstActiveBody');
    var actEmpty = document.getElementById('lstActiveEmpty');
    var actCount = document.getElementById('activeCount');
    if (actBody) {
      actBody.innerHTML = renderActiveRows(activeList);
      if (actEmpty) actEmpty.style.display = activeList.length === 0 ? 'block' : 'none';
      if (actCount) actCount.textContent = '(' + activeList.length + ')';
    }

    // Pending
    var penBody = document.getElementById('lstPendingBody');
    var penEmpty = document.getElementById('lstPendingEmpty');
    var penCount = document.getElementById('pendingCount');
    if (penBody) {
      penBody.innerHTML = renderRows(pendingList);
      if (penEmpty) penEmpty.style.display = pendingList.length === 0 ? 'block' : 'none';
      if (penCount) penCount.textContent = '(' + pendingList.length + ')';
    }

    // Sold
    var soldBody = document.getElementById('lstSoldBody');
    var soldEmpty = document.getElementById('lstSoldEmpty');
    var soldCount = document.getElementById('soldCount');
    if (soldBody) {
      soldBody.innerHTML = renderRows(soldList);
      if (soldEmpty) soldEmpty.style.display = soldList.length === 0 ? 'block' : 'none';
      if (soldCount) soldCount.textContent = '(' + soldList.length + ')';
    }
  }

  // ============================================================
  //  DETAIL VIEW
  // ============================================================
  function renderDetail() {
    try {
    var listings = Data.getListings();
    var l = listings.find(function (x) { return x.id === selectedListingId; });

    // Fallback: if no listing found, check if it's a transaction ID
    if (!l) {
      var txnFallback = Data.getTransactions().find(function (x) { return x.id === selectedListingId; });
      if (txnFallback) {
        // Map transaction data to listing format so the same template renders
        l = {
          id: txnFallback.id, address: txnFallback.address, city: txnFallback.city,
          state: txnFallback.state, zip: txnFallback.zip, price: txnFallback.price,
          agent: txnFallback.agent, agentId: txnFallback.agentId,
          status: txnFallback.status, source: txnFallback.source,
          beds: txnFallback.beds, baths: txnFallback.baths, sqft: txnFallback.sqft,
          listingDate: null, propertyType: '', description: '',
          _isTxn: true, _txnId: txnFallback.id, _txnType: txnFallback.type,
          _closeDate: txnFallback.closeDate
        };
      }
    }

    if (!l) {
      if (viewMode === 'detail' && selectedListingId) {
        pageBody.innerHTML = '<div style="text-align:center;padding:60px 20px">' +
          '<div style="font-size:1rem;color:var(--gray-500);margin-bottom:8px">Loading deal...</div></div>';
        return;
      }
      viewMode = 'list';
      renderList();
      return;
    }
    sessionStorage.removeItem('reb_deeplink_deal');

    var allNotes = getNotes();
    var listingNotes = allNotes[selectedListingId] || [];
    // Sort notes newest first
    listingNotes.sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });

    var tasks = Data.getTasks().filter(function (task) {
      return task.linkedId === selectedListingId && task.linkedType === 'listing';
    });

    var users = getUsers();

    var html = '';

    var zillowUrl = 'https://www.zillow.com/homes/' + encodeURIComponent((l.address || '') + (l.city ? ', ' + l.city : '') + (l.state ? ', ' + l.state : '')) + '_rb/';
    var statusColors = { pre_listing: '#7C3AED', coming_soon: '#3B5BDB', active: '#059669', pending: '#D97706', sold: '#DC2626', closed: '#1A7F4B' };
    var statusColor = statusColors[l.status] || 'var(--indigo)';
    var _lstDetailStatuses = getAdminSetting('listings.statuses', [{ key: 'pre_listing', label: 'Pre-Listing' }, { key: 'coming_soon', label: 'Coming Soon' }, { key: 'active', label: 'Active' }, { key: 'pending', label: 'Pending' }, { key: 'sold', label: 'Sold' }]);
    var _lstDetailSources = getAdminSetting('leadSources', ['Zillow','Realtor.com','Referral','Other']);
    var statusLabel = (_lstDetailStatuses.find(function(s){return s.key===l.status}) || {}).label || l.status;

    var _lstStages = ['pre_listing', 'coming_soon', 'active', 'pending', 'sold'];
    var _currentStageIdx = _lstStages.indexOf(l.status);
    if (_currentStageIdx < 0) _currentStageIdx = 0;
    var _activeTab = sessionStorage.getItem('reb_detail_tab') || 'checklist';

    // ─── Sellers data (needed for sidebar) ───
    var detailParties = getParties();
    var rawDetailP = detailParties[selectedListingId] || {};
    var detailP = migratePartyData(rawDetailP);
    var detailSellers = detailP.sellers.length ? detailP.sellers : [{ name: '', phone: '', email: '', relationship: 'Primary' }];
    var _detailUuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    var _localSellersToSync = detailP.sellers.filter(function (s) { return s.name || s.phone || s.email; });
    if (_localSellersToSync.length > 0 && !_detailUuidRe.test(selectedListingId)) {
      Data.syncListingParties(selectedListingId, _localSellersToSync);
    }

    var _coeTxn = Data.getTransactions().find(function (tx) { return tx.address === l.address && tx.status !== 'closed'; });
    var dealChecklists = getDealChecklists();
    var lstChecklist = dealChecklists[selectedListingId];
    var allUpdates = getUpdates();
    var lstUpdates = (allUpdates[selectedListingId] || []).slice().sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });

    // ─── Back button ───
    html += '<button class="detail-back-btn" data-action="back-to-list"><svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>' + (fromDealRoom ? 'Deal Room' : 'Back to Listings') + '</button>';

    html += '<div class="dd-bt-layout">';

    // ═══════════════ SIDEBAR ═══════════════
    html += '<aside class="dd-bt-sidebar">';

    // Photo placeholder with status overlay
    html += '<div class="dd-photo">';
    html += '<div class="dd-photo-img"><svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg></div>';
    html += '<div class="dd-photo-status" style="background:rgba(15,23,42,.78)"><span class="dd-photo-status-dot" style="background:' + statusColor + '"></span>' + escapeHtml(statusLabel) + '</div>';
    html += '</div>';

    // Identity card: address, CSZ, price, pipeline
    html += '<div class="dd-identity">';
    html += '<input type="text" class="ie-field dd-address-input" data-field="address" value="' + escapeHtml(l.address) + '" placeholder="Address">';
    html += '<div class="dd-csz-row">';
    html += '<input type="text" class="ie-field" data-field="city" value="' + escapeHtml(l.city || '') + '" placeholder="City">';
    html += '<input type="text" class="ie-field" data-field="state" value="' + escapeHtml(l.state || '') + '" placeholder="ST" maxlength="2">';
    html += '<input type="text" class="ie-field" data-field="zip" value="' + escapeHtml(l.zip || '') + '" placeholder="Zip" maxlength="10">';
    html += '</div>';
    html += '<input type="text" class="ie-field dd-price-input" data-field="price" value="' + Data.formatCurrency(l.price) + '" data-raw="' + (l.price || '') + '" style="color:' + statusColor + '" onfocus="this.value=this.getAttribute(\'data-raw\')">';

    // Pipeline stage tracker
    html += '<div class="dd-pipeline"><div class="dd-pipeline-bar">';
    for (var _pi = 0; _pi < _lstStages.length; _pi++) {
      var _stepStyle = (_pi <= _currentStageIdx) ? ' style="background:' + statusColor + '"' : '';
      html += '<div class="dd-pipeline-step"' + _stepStyle + '></div>';
    }
    html += '</div>';
    html += '<div class="dd-pipeline-label"><span>Stage</span><span style="color:' + statusColor + '">' + escapeHtml(statusLabel) + '</span></div>';
    html += '</div>';
    html += '</div>'; // dd-identity

    // Quick stats: beds | baths | sqft
    html += '<div class="dd-quickstats">';
    html += '<div class="dd-qs-cell"><input type="number" class="ie-field" data-field="beds" value="' + (l.beds || '') + '" placeholder="—" min="0"><div class="dd-qs-lbl">Beds</div></div>';
    html += '<div class="dd-qs-cell"><input type="number" class="ie-field" data-field="baths" value="' + (l.baths || '') + '" placeholder="—" min="0" step="0.5"><div class="dd-qs-lbl">Baths</div></div>';
    html += '<div class="dd-qs-cell"><input type="number" class="ie-field" data-field="sqft" value="' + (l.sqft || '') + '" placeholder="—" min="0"><div class="dd-qs-lbl">Sq Ft</div></div>';
    html += '</div>';

    // Key facts panel
    html += '<div class="dd-facts">';
    html += '<div class="dd-facts-title">Key Facts</div>';
    html += '<div class="dd-fact-row"><div class="dd-fact-label">Status</div><div class="dd-fact-value"><select class="ie-field" data-field="status">' + _lstDetailStatuses.map(function (s) { return '<option value="' + s.key + '"' + (l.status === s.key ? ' selected' : '') + '>' + s.label + '</option>'; }).join('') + '</select></div></div>';
    html += '<div class="dd-fact-row"><div class="dd-fact-label">Agent</div><div class="dd-fact-value"><select class="ie-field" data-field="agent">' + users.map(function(u) { return '<option value="' + escapeHtml(u.displayName) + '"' + (u.displayName === l.agent ? ' selected' : '') + '>' + escapeHtml(u.displayName) + '</option>'; }).join('') + '</select></div></div>';
    html += '<div class="dd-fact-row"><div class="dd-fact-label">Source</div><div class="dd-fact-value"><select class="ie-field" data-field="source"><option value=""' + (!l.source ? ' selected' : '') + '>—</option>' + _lstDetailSources.map(function (s) { return '<option value="' + escapeHtml(s) + '"' + (l.source === s ? ' selected' : '') + '>' + escapeHtml(s) + '</option>'; }).join('') + '</select></div></div>';
    html += '<div class="dd-fact-row"><div class="dd-fact-label">Listed</div><div class="dd-fact-value"><input type="date" class="ie-field" data-field="listingDate" value="' + (l.listingDate || '') + '"></div></div>';

    // Days on market
    if (l.listingDate) {
      var _lDate = new Date(l.listingDate);
      if (!isNaN(_lDate.getTime())) {
        var _dom = Math.floor((Date.now() - _lDate) / 86400000);
        html += '<div class="dd-fact-row"><div class="dd-fact-label">DOM</div><div class="dd-fact-value" style="font-weight:700;color:var(--gray-800)">' + _dom + ' day' + (_dom !== 1 ? 's' : '') + '</div></div>';
      }
    }

    if (_coeTxn) {
      html += '<div class="dd-fact-row"><div class="dd-fact-label" style="color:var(--emerald)">COE</div><div class="dd-fact-value"><input type="date" id="coeDate" value="' + (_coeTxn.closeDate || '') + '" data-txn-id="' + _coeTxn.id + '"></div></div>';
    }
    html += '</div>';

    // Map preview
    var _mapAddr = (l.address || '') + ' ' + (l.city || '') + ' ' + (l.state || '') + ' ' + (l.zip || '');
    if (l.address) {
      html += '<a class="dd-map" href="https://www.google.com/maps/search/' + encodeURIComponent(_mapAddr.trim()) + '" target="_blank" rel="noopener">';
      html += '<iframe src="https://maps.google.com/maps?q=' + encodeURIComponent(_mapAddr.trim()) + '&output=embed&z=14" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Map of ' + escapeHtml(l.address) + '"></iframe>';
      html += '</a>';
    }

    // Commission breakdown
    var _commissionRate = getAdminSetting('commission.rate', 0.025);
    var _agentSplit = getAdminSetting('commission.agentSplit', 0.80);
    var _gross = (l.price || 0) * _commissionRate;
    var _agentNet = _gross * _agentSplit;
    var _brokerCut = _gross - _agentNet;
    html += '<div class="dd-commission">';
    html += '<div class="dd-commission-header">';
    html += '<span class="dd-commission-title">Your Commission</span>';
    html += '<span class="dd-commission-rate">' + (_commissionRate * 100).toFixed(1) + '% &times; ' + Math.round(_agentSplit * 100) + '%</span>';
    html += '</div>';
    html += '<div class="dd-commission-cells">';
    html += '<div class="dd-commission-cell"><div class="dd-commission-cell-val">' + Data.formatCurrency(_gross) + '</div><div class="dd-commission-cell-lbl">Gross</div></div>';
    html += '<div class="dd-commission-cell"><div class="dd-commission-cell-val">' + Data.formatCurrency(_brokerCut) + '</div><div class="dd-commission-cell-lbl">Broker</div></div>';
    html += '<div class="dd-commission-cell dd-commission-cell-net"><div class="dd-commission-cell-val">' + Data.formatCurrency(_agentNet) + '</div><div class="dd-commission-cell-lbl">You Net</div></div>';
    html += '</div>';
    html += '</div>';

    // Action buttons
    html += '<div class="dd-actions">';
    html += '<a href="' + zillowUrl + '" target="_blank" rel="noopener" class="dd-action-btn dd-action-zillow"><svg viewBox="0 0 24 24"><path d="M12 2L2 9.5l1.5 1L12 4.5l8.5 6 1.5-1L12 2zm0 3.5L5 11v10h5v-6h4v6h5V11l-7-5.5z"/></svg>Zillow</a>';
    html += '<button data-action="share-client" data-id="' + l.id + '" class="dd-action-btn dd-action-share"><svg viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>Share</button>';
    html += '</div>';

    // Seller / Owner card
    html += '<div class="dd-sellers">';
    html += '<div class="dd-sellers-header"><span>Seller / Owner</span><button type="button" class="dd-sellers-add" data-action="detail-add-seller">+ Add</button></div>';
    html += '<div class="dd-sellers-body" id="detailSellersWrap">';
    detailSellers.forEach(function (s, idx) {
      if (idx > 0) html += '<div style="border-top:1px solid var(--gray-100);margin:10px 0"></div>';
      html += '<div style="display:flex;flex-direction:column;gap:6px" data-seller-row="' + idx + '">';
      html += '<input type="text" class="detail-seller-field" data-sidx="' + idx + '" data-sfield="name" value="' + escapeHtml(s.name || '') + '" placeholder="Name" style="font-weight:700">';
      html += '<input type="tel" class="detail-seller-field" data-sidx="' + idx + '" data-sfield="phone" value="' + escapeHtml(s.phone || '') + '" placeholder="Phone">';
      html += '<div style="display:flex;gap:6px;align-items:center">';
      html += '<input type="email" class="detail-seller-field" data-sidx="' + idx + '" data-sfield="email" value="' + escapeHtml(s.email || '') + '" placeholder="Email">';
      if (idx > 0) {
        html += '<button type="button" data-action="detail-remove-seller" data-sidx="' + idx + '" style="background:none;border:none;color:var(--rose);font-size:1.1rem;cursor:pointer;padding:2px 8px;flex-shrink:0" title="Remove">&times;</button>';
      }
      html += '</div>';
      html += '</div>';
    });
    html += '</div>';
    html += '</div>';

    html += '</aside>'; // dd-bt-sidebar

    // ═══════════════ MAIN ═══════════════
    html += '<div class="dd-bt-main">';

    var tasks = Data.getTasks().filter(function (task) {
      return task.linkedId === selectedListingId && task.linkedType === 'listing';
    });
    var _activityCount = listingNotes.length + lstUpdates.length;
    var _checklistCount = lstChecklist ? lstChecklist.items.length : 0;

    // Tab navigation
    html += '<div class="dd-tabs">';
    html += '<button class="dd-tab' + (_activeTab === 'activity' ? ' active' : '') + '" data-dd-tab="activity">Activity' + (_activityCount ? '<span class="dd-tab-count">' + _activityCount + '</span>' : '') + '</button>';
    html += '<button class="dd-tab' + (_activeTab === 'checklist' ? ' active' : '') + '" data-dd-tab="checklist">Checklist' + (_checklistCount ? '<span class="dd-tab-count">' + _checklistCount + '</span>' : '') + '</button>';
    html += '<button class="dd-tab' + (_activeTab === 'updates' ? ' active' : '') + '" data-dd-tab="updates">Client Updates' + (lstUpdates.length ? '<span class="dd-tab-count">' + lstUpdates.length + '</span>' : '') + '</button>';
    html += '</div>';

    // ─── ACTIVITY TAB ───
    html += '<div class="dd-tab-pane' + (_activeTab === 'activity' ? ' active' : '') + '" data-dd-pane="activity">';

    // Add note input
    html += '<div class="dd-add-note">';
    html += '<textarea id="noteInput" placeholder="Add an internal note (visible only to your team)..."></textarea>';
    html += '<div class="dd-add-note-actions"><button class="btn btn-primary btn-sm" data-action="add-note">Add Note</button></div>';
    html += '</div>';

    // Combined timeline: notes + client updates
    var _activity = [];
    listingNotes.forEach(function (n) {
      _activity.push({ kind: 'note', timestamp: n.timestamp, author: n.author, title: 'Internal Note', body: n.text });
    });
    lstUpdates.forEach(function (upd) {
      var _ms = MILESTONES.find(function (m) { return m.key === upd.type; }) || { icon: '📌', label: 'Update' };
      _activity.push({ kind: 'update', timestamp: upd.timestamp, author: upd.author, title: _ms.icon + ' ' + (upd.title || _ms.label), body: upd.detail, auto: upd.auto });
    });
    _activity.sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });

    if (_activity.length === 0) {
      html += '<div class="dd-empty">No activity yet. Add a note above or send a client update to start the timeline.</div>';
    } else {
      html += '<div class="dd-timeline">';
      _activity.forEach(function (item) {
        var _dotIcon = item.kind === 'update' ? '&#9733;' : '&#9998;';
        html += '<div class="dd-tl-item">';
        html += '<div class="dd-tl-dot ' + item.kind + '">' + _dotIcon + '</div>';
        html += '<div class="dd-tl-body">';
        html += '<div class="dd-tl-meta">' + escapeHtml(item.author || 'System') + ' &middot; ' + relativeTime(item.timestamp) + (item.auto ? ' &middot; Auto' : '') + '</div>';
        html += '<div class="dd-tl-title">' + (item.kind === 'update' ? item.title : escapeHtml(item.title)) + '</div>';
        if (item.body) html += '<div class="dd-tl-text">' + escapeHtml(item.body) + '</div>';
        html += '</div></div>';
      });
      html += '</div>';
    }

    html += '</div>'; // activity pane

    // ─── CHECKLIST TAB ───
    html += '<div class="dd-tab-pane' + (_activeTab === 'checklist' ? ' active' : '') + '" data-dd-pane="checklist">';

    // Linked tasks (if any)
    if (tasks.length > 0) {
      html += '<div class="desc-card">';
      html += '<div class="desc-card-header">Linked Tasks (' + tasks.length + ')</div>';
      html += '<div style="padding:12px 20px">';
      tasks.forEach(function (task) {
        var _done = task.status === 'done';
        html += '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:.85rem;color:' + (_done ? 'var(--gray-400)' : 'var(--gray-700)') + ';' + (_done ? 'text-decoration:line-through;' : '') + '">' +
          Data.priorityBadge(task.priority) + ' ' + escapeHtml(task.title) +
        '</div>';
      });
      html += '</div></div>';
    }

    // Listing Checklist card
    html += '<div class="parties-card">';
    html += '<div class="parties-card-header" style="cursor:pointer" data-action="toggle-listing-checklist">';
    html += '<span style="display:flex;align-items:center;gap:8px"><svg viewBox="0 0 24 24" width="14" height="14" fill="var(--indigo)" style="flex-shrink:0"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/></svg>Listing Checklist</span>';
    if (lstChecklist && lstChecklist.items.length > 0) {
      var clDone = lstChecklist.items.filter(function (i) { return i.completed; }).length;
      var clTotal = lstChecklist.items.length;
      html += '<span style="font-size:.75rem;font-weight:700;color:var(--emerald);background:var(--emerald-light);padding:2px 10px;border-radius:20px">' + clDone + '/' + clTotal + '</span>';
    }
    html += '</div>';
    var lstClCollapsed = (l.status === 'pending') ? ' style="display:none"' : '';
    html += '<div id="listingChecklistBody"' + lstClCollapsed + '>';
    if (lstChecklist && lstChecklist.items.length > 0) {
      var clDoneCount = lstChecklist.items.filter(function (i) { return i.completed; }).length;
      var clTotalCount = lstChecklist.items.length;
      var clPct = Math.round((clDoneCount / clTotalCount) * 100);
      html += '<div style="padding:12px 20px 0 20px">';
      html += '<div style="background:var(--gray-100);border-radius:6px;height:6px;overflow:hidden">';
      html += '<div style="background:var(--emerald);height:100%;width:' + clPct + '%;border-radius:6px;transition:width .3s"></div>';
      html += '</div></div>';

      html += '<div id="clItemList">';
      html += renderClGrouped(lstChecklist.items, {
        accent: 'indigo',
        clickAction: 'toggle-cl-expand',
        toggleAction: 'toggle-checklist-item',
        draggable: true
      });
      html += '<div class="cl-add-row">';
      html += '<input type="text" id="newChecklistItem" placeholder="+ Add checklist item...">';
      html += '<button class="btn btn-primary btn-sm" data-action="add-checklist-item">+ Add</button>';
      html += '</div>';
      html += '</div>';

      html += '<div id="clExpandPanel" style="display:none;margin:0 16px 10px;padding:12px 16px;background:linear-gradient(135deg,#F8FAFC,#EEF2FF);border:1.5px solid var(--indigo);border-radius:12px">';
      html += '<div id="clExpandInfo" style="font-size:.82rem;font-weight:700;color:var(--indigo);margin-bottom:8px"></div>';
      html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px" class="cl-expand-grid">';
      html += '<div><div style="font-size:.6rem;font-weight:700;color:var(--gray-400);text-transform:uppercase;margin-bottom:3px">Due Date</div><input type="text" id="clExpandDate" data-action="set-checklist-date" placeholder="Pick date..." style="width:100%;padding:6px 10px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:.82rem;background:#fff;font-family:inherit;cursor:pointer"></div>';
      html += '<div><div style="font-size:.6rem;font-weight:700;color:var(--gray-400);text-transform:uppercase;margin-bottom:3px">Vendor</div><input type="text" id="clExpandVendor" data-action="set-checklist-vendor" placeholder="Vendor" style="width:100%;padding:6px 10px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:.82rem;background:#fff;font-family:inherit"></div>';
      html += '<div><div style="font-size:.6rem;font-weight:700;color:var(--gray-400);text-transform:uppercase;margin-bottom:3px">Note</div><input type="text" id="clExpandNote" data-action="set-checklist-note" placeholder="Add note..." style="width:100%;padding:6px 10px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:.82rem;background:#fff;font-family:inherit"></div>';
      html += '</div>';
      html += '</div>';
    } else {
      var listingTemplates = loadChecklistTemplates().filter(function (tpl) { return tpl.category === 'listing'; });
      if (listingTemplates.length > 0) {
        var autoTpl = listingTemplates[0];
        var dc = getDealChecklists();
        dc[selectedListingId] = {
          templateId: autoTpl.id,
          templateName: autoTpl.name,
          items: autoTpl.items.map(function (item) {
            return { id: 'chk-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9), label: item.label, completed: false, completedBy: null, completedAt: null, dueDate: null, note: '', vendor: '' };
          })
        };
        saveDealChecklists(dc);
        render();
        return;
      } else {
        html += '<div style="padding:20px;text-align:center;font-size:.85rem;color:var(--gray-400)">No checklist templates found. Create one in Admin Settings → Checklist Templates.</div>';
      }
    }
    html += '</div>'; // listingChecklistBody
    html += '</div>'; // parties-card

    // Escrow Checklist (when pending)
    if (l.status === 'pending') {
      var linkedTxn = Data.getTransactions().find(function (tx) {
        return tx.address === l.address && tx.status !== 'closed';
      });
      if (linkedTxn) {
        var txnChecklist = dealChecklists[linkedTxn.id];
        if (!txnChecklist) {
          var escrowTemplates = loadChecklistTemplates().filter(function (tpl) { return tpl.category === 'escrow'; });
          if (escrowTemplates.length > 0) {
            var escTpl = escrowTemplates[0];
            var dc2 = getDealChecklists();
            dc2[linkedTxn.id] = {
              templateId: escTpl.id,
              templateName: escTpl.name,
              items: escTpl.items.map(function (item) {
                return { id: 'chk-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9), label: item.label, completed: false, completedBy: null, completedAt: null, dueDate: null, note: '', vendor: '' };
              })
            };
            saveDealChecklists(dc2);
            txnChecklist = dc2[linkedTxn.id];
          }
        }
        if (txnChecklist && txnChecklist.items && txnChecklist.items.length > 0) {
          var ecDone = txnChecklist.items.filter(function (i) { return i.completed; }).length;
          var ecTotal = txnChecklist.items.length;
          var ecPct = Math.round((ecDone / ecTotal) * 100);
          html += '<div class="parties-card">';
          html += '<div class="parties-card-header" style="cursor:pointer" data-action="toggle-escrow-checklist">';
          html += '<span style="display:flex;align-items:center;gap:8px"><svg viewBox="0 0 24 24" width="14" height="14" fill="var(--emerald)" style="flex-shrink:0"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/></svg>Escrow Checklist</span>';
          html += '<span style="font-size:.75rem;font-weight:700;color:var(--emerald);background:var(--emerald-light);padding:2px 10px;border-radius:20px">' + ecDone + '/' + ecTotal + '</span>';
          html += '</div>';
          html += '<div id="escrowChecklistBody">';
          html += '<div style="padding:12px 20px 0 20px">';
          html += '<div style="background:var(--gray-100);border-radius:6px;height:6px;overflow:hidden">';
          html += '<div style="background:var(--emerald);height:100%;width:' + ecPct + '%;border-radius:6px"></div>';
          html += '</div></div>';
          html += '<div id="ecClItemList">';
          html += renderClGrouped(txnChecklist.items, {
            accent: 'emerald',
            clickAction: 'toggle-ec-expand',
            toggleAction: 'toggle-escrow-cl-item',
            extraAttrs: ' data-txn-id="' + linkedTxn.id + '"'
          });
          html += '<div class="cl-add-row">';
          html += '<input type="text" id="newEscrowClItem" placeholder="+ Add escrow item...">';
          html += '<button class="btn btn-primary btn-sm" data-action="add-escrow-cl-item" data-txn-id="' + linkedTxn.id + '">+ Add</button>';
          html += '</div>';
          html += '</div>';

          html += '<div id="ecExpandPanel" style="display:none;margin:0 16px 10px;padding:12px 16px;background:linear-gradient(135deg,#F0FDF4,#ECFDF5);border:1.5px solid var(--emerald);border-radius:12px">';
          html += '<div id="ecExpandInfo" style="font-size:.82rem;font-weight:700;color:#059669;margin-bottom:8px"></div>';
          html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px" class="cl-expand-grid">';
          html += '<div><div style="font-size:.6rem;font-weight:700;color:var(--gray-400);text-transform:uppercase;margin-bottom:3px">Due Date</div><input type="text" id="ecExpandDate" data-action="set-escrow-cl-date" data-txn-id="' + linkedTxn.id + '" placeholder="Pick date..." style="width:100%;padding:6px 10px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:.82rem;background:#fff;font-family:inherit;cursor:pointer"></div>';
          html += '<div><div style="font-size:.6rem;font-weight:700;color:var(--gray-400);text-transform:uppercase;margin-bottom:3px">Vendor</div><input type="text" id="ecExpandVendor" data-action="set-escrow-cl-vendor" data-txn-id="' + linkedTxn.id + '" placeholder="Vendor" style="width:100%;padding:6px 10px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:.82rem;background:#fff;font-family:inherit"></div>';
          html += '<div><div style="font-size:.6rem;font-weight:700;color:var(--gray-400);text-transform:uppercase;margin-bottom:3px">Note</div><input type="text" id="ecExpandNote" data-action="set-escrow-cl-note" data-txn-id="' + linkedTxn.id + '" placeholder="Add note..." style="width:100%;padding:6px 10px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:.82rem;background:#fff;font-family:inherit"></div>';
          html += '</div>';
          html += '</div>';
          html += '</div></div></div>';
        }
      }
    }

    html += '</div>'; // checklist pane

    // ─── CLIENT UPDATES TAB ───
    html += '<div class="dd-tab-pane' + (_activeTab === 'updates' ? ' active' : '') + '" data-dd-pane="updates">';

    html += '<div class="notes-card">';
    html += '<div class="notes-card-header"><span>Client Updates</span><span style="font-size:.7rem;color:var(--gray-400);font-weight:500">Visible on client portal</span></div>';

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
    html += '</div>'; // notes-card

    html += '</div>'; // updates pane

    html += '</div>'; // dd-bt-main
    html += '</div>'; // dd-bt-layout

    // (legacy two-col layout removed — replaced by BoomTown sidebar + tabs above)

    // Delete button at bottom
    html += '<div style="margin-top:30px;padding-top:16px;border-top:1px solid var(--gray-100);margin-bottom:30px">';
    html += '<button class="btn btn-outline btn-sm" data-action="delete-listing" data-id="' + l.id + '" style="color:var(--rose);border-color:var(--gray-200)">Delete This Listing</button>';
    html += '</div>';

    pageBody.innerHTML = html;
    _detailRendered = true;

    // Tab switching (BoomTown sidebar + tabs layout)
    pageBody.querySelectorAll('[data-dd-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var tab = this.getAttribute('data-dd-tab');
        sessionStorage.setItem('reb_detail_tab', tab);
        pageBody.querySelectorAll('[data-dd-tab]').forEach(function (b) {
          b.classList.toggle('active', b.getAttribute('data-dd-tab') === tab);
        });
        pageBody.querySelectorAll('[data-dd-pane]').forEach(function (p) {
          p.classList.toggle('active', p.getAttribute('data-dd-pane') === tab);
        });
      });
    });

    initChecklistDrag();
    initChecklistPickers();

    // Auto-save for listing checklist expand panel
    function saveExpandField(inputId, field) {
      var inp = document.getElementById(inputId);
      if (!inp) return;
      var saveHandler = function () {
        var panel = document.getElementById('clExpandPanel');
        var itemId = panel ? panel.getAttribute('data-active-id') : null;
        if (!itemId) return;
        var cls = getDealChecklists();
        if (cls[selectedListingId]) {
          var it = cls[selectedListingId].items.find(function (i) { return i.id === itemId; });
          if (it) { it[field] = inp.value; saveDealChecklists(cls); showToast('Saved'); }
        }
      };
      inp.addEventListener('change', saveHandler);
      inp.addEventListener('blur', function () { setTimeout(saveHandler, 0); });
    }
    saveExpandField('clExpandDate', 'dueDate');
    saveExpandField('clExpandVendor', 'vendor');
    saveExpandField('clExpandNote', 'note');

    // Auto-save for escrow checklist expand panel
    function saveEcExpandField(inputId, field) {
      var inp = document.getElementById(inputId);
      if (!inp) return;
      var txnId = inp.getAttribute('data-txn-id');
      var saveHandler = function () {
        var panel = document.getElementById('ecExpandPanel');
        var itemId = panel ? panel.getAttribute('data-active-id') : null;
        if (!itemId) return;
        var tId = txnId || (inp.getAttribute('data-txn-id'));
        var cls = getDealChecklists();
        if (cls[tId]) {
          var it = cls[tId].items.find(function (i) { return i.id === itemId; });
          if (it) { it[field] = inp.value; saveDealChecklists(cls); showToast('Saved'); }
        }
      };
      inp.addEventListener('change', saveHandler);
      inp.addEventListener('blur', function () { setTimeout(saveHandler, 0); });
    }
    saveEcExpandField('ecExpandDate', 'dueDate');
    saveEcExpandField('ecExpandVendor', 'vendor');
    saveEcExpandField('ecExpandNote', 'note');

    // Close of Escrow date change handler
    var coeDateInput = document.getElementById('coeDate');
    if (coeDateInput) {
      coeDateInput.addEventListener('change', function () {
        var dateVal = this.value;
        var txnId = this.getAttribute('data-txn-id');
        if (!txnId || !dateVal) return;
        var token = localStorage.getItem('reb_jwt');
        if (!token) { window.location.href = 'login.html'; return; }
        try {
          var xhr = new XMLHttpRequest();
          xhr.open('PUT', '/api/transactions/' + txnId, false);
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.setRequestHeader('Authorization', 'Bearer ' + token);
          xhr.send(JSON.stringify({ close_date: dateVal }));
          if (xhr.status === 200) {
            Data.updateTransaction(txnId, { closeDate: dateVal });
            showToast('Close date saved');
          } else if (xhr.status === 401) {
            window.location.href = 'login.html';
          }
        } catch (e) {}
      });
    }

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

    // State field maxlength enforced by HTML attribute — no auto-advance

    // Auto-save inline editable fields
    var ieFields = pageBody.querySelectorAll('.ie-field');
    ieFields.forEach(function (field) {
      var eventType = (field.tagName === 'SELECT' || field.type === 'date') ? 'change' : 'blur';
      field.addEventListener(eventType, function () {
        var self = this;
        var fieldName = self.getAttribute('data-field');
        var val = self.value;

        // The deal-detail page renders BOTH listings AND escrows-without-a-listing
        // (buyer-side deals) using the same template (see renderDetail's _isTxn
        // fallback at line ~1056). When selectedListingId is actually a transaction
        // id, every save MUST go to Data.updateTransaction — not Data.updateListing,
        // which silently no-ops because no listing has that id. That silent no-op is
        // why "change escrow to sold" never saved: the local update returned null,
        // no _serverSync was attached, Promise.all([]) resolved instantly, and the
        // user navigated to Closed where nothing was actually closed.
        var _detailListing = Data.getListings().find(function (x) { return x.id === selectedListingId; });
        var _detailTxn = !_detailListing
          ? Data.getTransactions().find(function (x) { return x.id === selectedListingId; })
          : null;
        var _isTxnView = !!_detailTxn && !_detailListing;

        // For selects and date inputs, run synchronously (no tab-order concern)
        if (field.tagName === 'SELECT' || field.type === 'date') {
          if (fieldName === 'status') {
            // ── ESCROW path: selectedListingId is a transaction (no linked listing) ──
            if (_isTxnView) {
              var oldTxnStatus = _detailTxn.status;
              if (oldTxnStatus === val) return;
              // Map listing-style "sold" to escrow "closed"
              var txnVal = (val === 'sold') ? 'closed' : val;
              var txnUpdates = { status: txnVal };
              if (txnVal === 'closed' && !_detailTxn.closeDate) {
                txnUpdates.closeDate = new Date().toISOString().split('T')[0];
              }
              var txnRes = Data.updateTransaction(selectedListingId, txnUpdates);
              if (txnVal === 'closed') {
                showToast('Closing — waiting on server…');
                var pendingEscrow = [];
                if (txnRes && txnRes._serverSync) pendingEscrow.push(txnRes._serverSync);
                Promise.all(pendingEscrow).then(function () {
                  showToast('Deal closed! Moved to Closed section.');
                  window.location.href = 'closed.html';
                }).catch(function (err) {
                  var detail = (err && (err.error || err.message)) || 'server error';
                  showToast('⚠ Could not close deal: ' + detail + '. Stayed on this page so you can retry.', 'error');
                  self.value = oldTxnStatus;
                });
              } else {
                showToast('Saved');
                renderDetail();
              }
              return;
            }

            // ── LISTING path ──
            var currentListing = _detailListing;
            var oldStatus = currentListing ? currentListing.status : '';

            if (val === 'pending') {
              if (!currentListing) return;
              showRepresentationModal(currentListing);
              return;
            }

            // Moving back from pending — remove the linked escrow
            if (oldStatus === 'pending' && val !== 'pending' && val !== 'sold') {
              if (currentListing) {
                var linkedEscrow = Data.getTransactions().find(function (t) {
                  return t.address === currentListing.address && t.status !== 'closed';
                });
                if (linkedEscrow) {
                  if (confirm('Remove the linked escrow for ' + currentListing.address + '?')) {
                    Data.deleteTransaction(linkedEscrow.id);
                    showToast('Escrow removed.');
                  }
                }
              }
            }

            if (val === 'sold' && oldStatus !== 'sold') {
              // Wait for the listing PUT and the escrow PUT to confirm on the
              // server before navigating to closed.html. Otherwise the next
              // loadAll() refetches and overwrites the local "closed" with the
              // stale server "pending" — the bug Shirley hit on Sara Court.
              var lstResult = Data.updateListing(selectedListingId, { status: 'sold' });
              var txnResult = null;
              if (currentListing) {
                var linkedTxn = Data.getTransactions().find(function (t) {
                  return t.address === currentListing.address && t.status !== 'closed';
                });
                if (linkedTxn) {
                  txnResult = Data.updateTransaction(linkedTxn.id, {
                    status: 'closed',
                    closeDate: linkedTxn.closeDate || new Date().toISOString().split('T')[0]
                  });
                } else {
                  txnResult = Data.addTransaction({
                    address: currentListing.address,
                    city: currentListing.city,
                    state: currentListing.state,
                    zip: currentListing.zip,
                    price: currentListing.price,
                    agent: currentListing.agent,
                    source: currentListing.source,
                    type: 'Seller',
                    status: 'closed',
                    notes: 'Created from listing (sold)',
                    closeDate: new Date().toISOString().split('T')[0]
                  });
                }
              }
              showToast('Marking sold — waiting on server…');
              var pending = [];
              if (lstResult && lstResult._serverSync) pending.push(lstResult._serverSync);
              if (txnResult && txnResult._serverSync) pending.push(txnResult._serverSync);
              Promise.all(pending).then(function () {
                showToast('Listing sold! Moved to Closed.');
                window.location.href = 'closed.html';
              }).catch(function (err) {
                var detail = (err && (err.error || err.message)) || 'server error';
                showToast('⚠ Could not mark as sold: ' + detail + '. Stayed on this page so you can retry — your edit is NOT lost.', 'error');
                self.value = oldStatus;
              });
              return;
            }
          }
          // Generic select/date save (non-status or status that didn't take a special branch)
          var update = {};
          update[fieldName] = val;
          if (_isTxnView) {
            Data.updateTransaction(selectedListingId, update);
          } else {
            Data.updateListing(selectedListingId, update);
          }
          showToast('Saved');
          renderDetail();
          return;
        }

        // For text/number inputs, defer the save so Tab focus transfer completes first
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
          if (_isTxnView) {
            Data.updateTransaction(selectedListingId, update);
          } else {
            Data.updateListing(selectedListingId, update);
          }
          showToast('Saved');
        }, 0);
      });
    });

    // Auto-save seller info fields on blur
    function saveDetailSellers() {
      var allP = getParties();
      if (!allP[selectedListingId]) allP[selectedListingId] = { sellers: [], contacts: {} };
      var sellerMap = {};
      pageBody.querySelectorAll('.detail-seller-field').forEach(function (f) {
        var idx = f.getAttribute('data-sidx');
        if (!sellerMap[idx]) sellerMap[idx] = {};
        sellerMap[idx][f.getAttribute('data-sfield')] = f.value.trim();
      });
      var sellers = [];
      Object.keys(sellerMap).sort(function (a, b) { return parseInt(a) - parseInt(b); }).forEach(function (idx) {
        var e = sellerMap[idx];
        sellers.push({ name: e.name || '', phone: e.phone || '', email: e.email || '', relationship: e.relationship || 'Primary' });
      });
      allP[selectedListingId].sellers = sellers;
      saveParties(allP);
      Data.syncListingParties(selectedListingId, sellers);
      showToast('Saved');
    }

    pageBody.querySelectorAll('.detail-seller-field').forEach(function (f) {
      f.addEventListener('blur', function () {
        setTimeout(saveDetailSellers, 0);
      });
    });
    } catch (renderErr) {
      pageBody.innerHTML = '<div style="padding:40px;color:var(--rose);font-size:.9rem"><strong>Error loading deal:</strong> ' + renderErr.message + '</div>';
      console.error('renderDetail error:', renderErr);
    }
  }

  // ============================================================
  //  EVENT DELEGATION
  // ============================================================
  document.addEventListener('click', function (e) {
    var target = e.target.closest('[data-action]');
    if (!target) return;

    var action = target.getAttribute('data-action');

    switch (action) {

      case 'detail-add-seller': {
        var daSellersWrap = document.getElementById('detailSellersWrap');
        if (!daSellersWrap) break;
        var daExisting = daSellersWrap.querySelectorAll('[data-seller-row]');
        var daNewIdx = daExisting.length;
        var daSiInp = 'border:1.5px solid transparent;border-radius:6px;padding:5px 8px;font-family:inherit;font-size:.88rem;width:100%;background:transparent;transition:all .15s;';
        var div = document.createElement('div');
        div.innerHTML = '<div style="border-top:1px solid var(--gray-100);margin:10px 0"></div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end" data-seller-row="' + daNewIdx + '">' +
          '<div style="flex:1;min-width:150px"><div style="font-size:.7rem;font-weight:600;color:var(--gray-400);text-transform:uppercase;letter-spacing:.4px;margin-bottom:3px">Name</div>' +
          '<input type="text" class="detail-seller-field" data-sidx="' + daNewIdx + '" data-sfield="name" value="" placeholder="Full name" style="' + daSiInp + 'font-weight:700;color:var(--gray-800);" onfocus="this.style.borderColor=\'var(--indigo)\';this.style.background=\'#fff\'" onblur="this.style.borderColor=\'transparent\';this.style.background=\'transparent\'"></div>' +
          '<div style="flex:1;min-width:130px"><div style="font-size:.7rem;font-weight:600;color:var(--gray-400);text-transform:uppercase;letter-spacing:.4px;margin-bottom:3px">Phone</div>' +
          '<input type="tel" class="detail-seller-field" data-sidx="' + daNewIdx + '" data-sfield="phone" value="" placeholder="(555) 555-5555" style="' + daSiInp + '" onfocus="this.style.borderColor=\'var(--indigo)\';this.style.background=\'#fff\'" onblur="this.style.borderColor=\'transparent\';this.style.background=\'transparent\'"></div>' +
          '<div style="flex:2;min-width:170px"><div style="font-size:.7rem;font-weight:600;color:var(--gray-400);text-transform:uppercase;letter-spacing:.4px;margin-bottom:3px">Email</div>' +
          '<input type="email" class="detail-seller-field" data-sidx="' + daNewIdx + '" data-sfield="email" value="" placeholder="seller@email.com" style="' + daSiInp + '" onfocus="this.style.borderColor=\'var(--indigo)\';this.style.background=\'#fff\'" onblur="this.style.borderColor=\'transparent\';this.style.background=\'transparent\'"></div>' +
          '<div style="display:flex;align-items:flex-end;padding-bottom:4px"><button type="button" data-action="detail-remove-seller" data-sidx="' + daNewIdx + '" style="background:none;border:1px solid var(--gray-200);color:var(--rose);border-radius:6px;padding:4px 8px;font-size:.8rem;cursor:pointer" title="Remove">&times;</button></div>' +
          '</div>';
        daSellersWrap.appendChild(div);
        // attach blur save to new inputs
        div.querySelectorAll('.detail-seller-field').forEach(function (f) {
          f.addEventListener('blur', function () {
            var allP = getParties();
            if (!allP[selectedListingId]) allP[selectedListingId] = { sellers: [], contacts: {} };
            var sellerMap = {};
            document.querySelectorAll('.detail-seller-field').forEach(function (sf) {
              var idx = sf.getAttribute('data-sidx');
              if (!sellerMap[idx]) sellerMap[idx] = {};
              sellerMap[idx][sf.getAttribute('data-sfield')] = sf.value.trim();
            });
            var sellers = [];
            Object.keys(sellerMap).sort(function (a, b) { return parseInt(a) - parseInt(b); }).forEach(function (i) {
              var entry = sellerMap[i];
              sellers.push({ name: entry.name || '', phone: entry.phone || '', email: entry.email || '', relationship: entry.relationship || 'Primary' });
            });
            allP[selectedListingId].sellers = sellers;
            saveParties(allP);
            showToast('Saved');
          });
        });
        div.querySelector('.detail-seller-field').focus();
        break;
      }

      case 'detail-remove-seller': {
        var drIdx = target.getAttribute('data-sidx');
        var drWrap = document.getElementById('detailSellersWrap');
        if (!drWrap) break;
        var drRow = drWrap.querySelector('[data-seller-row="' + drIdx + '"]');
        if (drRow) {
          // Remove the separator div before it if any
          var drPrev = drRow.previousElementSibling;
          if (drPrev && drPrev.tagName === 'DIV' && !drPrev.hasAttribute('data-seller-row')) drPrev.remove();
          drRow.remove();
        }
        // Re-save
        var drAllP = getParties();
        if (!drAllP[selectedListingId]) drAllP[selectedListingId] = { sellers: [], contacts: {} };
        var drSellerMap = {};
        drWrap.querySelectorAll('.detail-seller-field').forEach(function (f) {
          var idx = f.getAttribute('data-sidx');
          if (!drSellerMap[idx]) drSellerMap[idx] = {};
          drSellerMap[idx][f.getAttribute('data-sfield')] = f.value.trim();
        });
        var drSellers = [];
        Object.keys(drSellerMap).sort(function (a, b) { return parseInt(a) - parseInt(b); }).forEach(function (i) {
          var entry = drSellerMap[i];
          drSellers.push({ name: entry.name || '', phone: entry.phone || '', email: entry.email || '', relationship: entry.relationship || 'Primary' });
        });
        drAllP[selectedListingId].sellers = drSellers;
        saveParties(drAllP);
        showToast('Seller removed');
        break;
      }

      case 'add-listing':
        editingId = null;
        viewMode = 'form';
        render();
        break;

      case 'open-detail':
        selectedListingId = target.getAttribute('data-id');
        viewMode = 'detail';
        window.scrollTo(0, 0);
        render();
        break;

      case 'toggle-cl-expand': {
        var expandEl = target.closest('[data-action="toggle-cl-expand"]');
        var expandId = expandEl ? expandEl.getAttribute('data-item-id') : null;
        if (!expandId) break;
        var panel = document.getElementById('clExpandPanel');
        if (!panel) break;

        // If clicking the same item, toggle off
        if (panel.style.display !== 'none' && panel.getAttribute('data-active-id') === expandId) {
          panel.style.display = 'none';
          panel.setAttribute('data-active-id', '');
          break;
        }

        // Find the item data
        var allCl = getDealChecklists();
        var clData = allCl[selectedListingId];
        var clItem = clData ? clData.items.find(function (i) { return i.id === expandId; }) : null;
        if (!clItem) break;

        // Populate the panel
        var dateInp = document.getElementById('clExpandDate');
        var vendorInp = document.getElementById('clExpandVendor');
        var noteInp = document.getElementById('clExpandNote');
        var infoEl = document.getElementById('clExpandInfo');
        if (dateInp) { dateInp.value = clItem.dueDate || ''; dateInp.setAttribute('data-item-id', expandId); }
        if (vendorInp) { vendorInp.value = clItem.vendor || ''; vendorInp.setAttribute('data-item-id', expandId); }
        if (noteInp) { noteInp.value = clItem.note || ''; noteInp.setAttribute('data-item-id', expandId); }
        if (infoEl) {
          infoEl.innerHTML = clItem.completed && clItem.completedBy
            ? 'Completed by ' + escapeHtml(clItem.completedBy) + ' · ' + Data.formatDate(clItem.completedAt)
            : '<span style="font-weight:600;color:var(--gray-600)">' + escapeHtml(clItem.label) + '</span>';
        }

        panel.setAttribute('data-active-id', expandId);
        panel.style.display = '';

        // Re-init flatpickr on the date input
        if (dateInp && typeof flatpickr !== 'undefined') {
          if (dateInp._flatpickr) dateInp._flatpickr.destroy();
          flatpickr(dateInp, {
            enableTime: true, dateFormat: 'Y-m-d H:i', altInput: true, altFormat: 'D, M j h:iK',
            allowInput: false, disableMobile: false, minuteIncrement: 15,
            onChange: function (sel, dateStr) {
              var ev = new Event('change', { bubbles: true });
              dateInp.dispatchEvent(ev);
            }
          });
        }
        break;
      }

      case 'toggle-ec-expand': {
        var ecExpandEl = target.closest('[data-action="toggle-ec-expand"]');
        var ecExpandId = ecExpandEl ? ecExpandEl.getAttribute('data-item-id') : null;
        var ecExpandTxnId = ecExpandEl ? ecExpandEl.getAttribute('data-txn-id') : null;
        if (!ecExpandId || !ecExpandTxnId) break;
        var ecPanel = document.getElementById('ecExpandPanel');
        if (!ecPanel) break;
        if (ecPanel.style.display !== 'none' && ecPanel.getAttribute('data-active-id') === ecExpandId) {
          ecPanel.style.display = 'none'; break;
        }
        var ecAllCl = getDealChecklists();
        var ecClData = ecAllCl[ecExpandTxnId];
        var ecClItem = ecClData ? ecClData.items.find(function (i) { return i.id === ecExpandId; }) : null;
        if (!ecClItem) break;
        var ecDateI = document.getElementById('ecExpandDate');
        var ecVendI = document.getElementById('ecExpandVendor');
        var ecNoteI = document.getElementById('ecExpandNote');
        var ecInfoI = document.getElementById('ecExpandInfo');
        if (ecDateI) { ecDateI.value = ecClItem.dueDate || ''; ecDateI.setAttribute('data-item-id', ecExpandId); }
        if (ecVendI) { ecVendI.value = ecClItem.vendor || ''; ecVendI.setAttribute('data-item-id', ecExpandId); }
        if (ecNoteI) { ecNoteI.value = ecClItem.note || ''; ecNoteI.setAttribute('data-item-id', ecExpandId); }
        if (ecInfoI) {
          ecInfoI.innerHTML = ecClItem.completed && ecClItem.completedBy
            ? 'Completed by ' + escapeHtml(ecClItem.completedBy) + ' · ' + Data.formatDate(ecClItem.completedAt)
            : '<span style="font-weight:600;color:var(--gray-600)">' + escapeHtml(ecClItem.label) + '</span>';
        }
        ecPanel.setAttribute('data-active-id', ecExpandId);
        ecPanel.style.display = '';
        if (ecDateI && typeof flatpickr !== 'undefined') {
          if (ecDateI._flatpickr) ecDateI._flatpickr.destroy();
          flatpickr(ecDateI, {
            enableTime: true, dateFormat: 'Y-m-d H:i', altInput: true, altFormat: 'D, M j h:iK',
            allowInput: false, disableMobile: false, minuteIncrement: 15,
            onChange: function (sel, dateStr) { ecDateI.dispatchEvent(new Event('change', { bubbles: true })); }
          });
        }
        break;
      }

      case 'toggle-listing-checklist': {
        var lcBody = document.getElementById('listingChecklistBody');
        if (lcBody) lcBody.style.display = lcBody.style.display === 'none' ? '' : 'none';
        break;
      }

      case 'toggle-cl-section': {
        var sec = target.closest('.cl-section');
        if (sec) sec.classList.toggle('cl-section-collapsed');
        break;
      }

      case 'toggle-escrow-checklist': {
        var ecBody = document.getElementById('escrowChecklistBody');
        if (ecBody) ecBody.style.display = ecBody.style.display === 'none' ? '' : 'none';
        break;
      }

      case 'toggle-escrow-cl-item': {
        var ecTxnId = target.getAttribute('data-txn-id');
        var ecItemId = target.getAttribute('data-item-id');
        var ecChecklists = getDealChecklists();
        if (ecChecklists[ecTxnId]) {
          var ecItem = ecChecklists[ecTxnId].items.find(function (i) { return i.id === ecItemId; });
          if (ecItem) {
            ecItem.completed = !ecItem.completed;
            ecItem.completedBy = ecItem.completed ? (Auth.getSession() ? Auth.getSession().displayName : '') : null;
            ecItem.completedAt = ecItem.completed ? new Date().toISOString() : null;
            saveDealChecklists(ecChecklists);
          }
        }
        break;
      }

      case 'set-escrow-cl-date':
      case 'set-escrow-cl-vendor':
      case 'set-escrow-cl-note': {
        // Handled by blur below
        break;
      }

      case 'add-escrow-cl-item': {
        var aecTxnId = target.getAttribute('data-txn-id');
        var aecInput = document.getElementById('newEscrowClItem');
        if (!aecInput || !aecInput.value.trim()) break;
        var aecChecklists = getDealChecklists();
        if (aecChecklists[aecTxnId]) {
          aecChecklists[aecTxnId].items.push({
            id: 'chk-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9),
            label: aecInput.value.trim(), completed: false, completedBy: null, completedAt: null,
            dueDate: null, vendor: '', note: ''
          });
          saveDealChecklists(aecChecklists);
          renderDetail();
        }
        break;
      }

      case 'toggle-oh-form':
        e.stopPropagation();
        var ohToggleId = target.getAttribute('data-id');
        var ohFormEl = document.getElementById('oh-form-' + ohToggleId);
        if (ohFormEl) {
          var opening = ohFormEl.style.display === 'none';
          ohFormEl.style.display = opening ? '' : 'none';
          if (opening) {
            var agSel = document.getElementById('oh-agent-' + ohToggleId);
            var dtIn = document.getElementById('oh-date-' + ohToggleId);
            var tmIn = document.getElementById('oh-time-' + ohToggleId);
            if (agSel) agSel.value = '';
            if (dtIn) dtIn.value = '';
            if (tmIn) tmIn.value = '';
          }
        }
        break;

      case 'save-oh':
        e.stopPropagation();
        var ohSaveId = target.getAttribute('data-id');
        var ohAgentEl = document.getElementById('oh-agent-' + ohSaveId);
        var ohDateEl = document.getElementById('oh-date-' + ohSaveId);
        var ohTimeEl = document.getElementById('oh-time-' + ohSaveId);
        if (!ohAgentEl || !ohDateEl || !ohAgentEl.value || !ohDateEl.value) {
          showToast('Please select an agent and date.', 'error');
          break;
        }
        var ohSaveListing = Data.getListings().find(function (l) { return l.id === ohSaveId; });
        var ohSaveArr = (ohSaveListing && Array.isArray(ohSaveListing.openHouses)) ? ohSaveListing.openHouses.slice() :
          (ohSaveListing && ohSaveListing.openHouse && ohSaveListing.openHouse.date) ? [ohSaveListing.openHouse] : [];
        if (ohSaveArr.length >= 3) { showToast('Maximum 3 open houses per listing.', 'error'); break; }
        ohSaveArr.push({ agent: ohAgentEl.value, date: ohDateEl.value, time: ohTimeEl ? ohTimeEl.value : '' });
        Data.updateListing(ohSaveId, { openHouses: ohSaveArr, openHouse: null });
        showToast('Open house scheduled!');
        renderList();
        break;

      case 'remove-oh':
        e.stopPropagation();
        var ohRemoveId = target.getAttribute('data-id');
        var ohRemoveIdx = parseInt(target.getAttribute('data-idx'));
        var ohRemoveListing = Data.getListings().find(function (l) { return l.id === ohRemoveId; });
        var ohRemoveArr = (ohRemoveListing && Array.isArray(ohRemoveListing.openHouses)) ? ohRemoveListing.openHouses.slice() :
          (ohRemoveListing && ohRemoveListing.openHouse && ohRemoveListing.openHouse.date) ? [ohRemoveListing.openHouse] : [];
        ohRemoveArr.splice(ohRemoveIdx, 1);
        Data.updateListing(ohRemoveId, { openHouses: ohRemoveArr, openHouse: null });
        showToast('Open house removed.');
        renderList();
        break;

      case 'back-to-list':
        if (fromDealRoom) { window.location.href = 'deal-room.html'; return; }
        viewMode = 'list';
        selectedListingId = null;
        render();
        break;

      case 'mark-under-contract':
        var muc = target.getAttribute('data-id');
        var mucListing = Data.getListings().find(function (l) { return l.id === muc; });
        if (mucListing) showRepresentationModal(mucListing);
        break;

      case 'delete-listing': {
        var dlId = target.getAttribute('data-id');
        var dlListing = Data.getListings().find(function (x) { return x.id === dlId; });
        var dlAddr = dlListing ? dlListing.address : 'this listing';
        var dlOverlay = document.createElement('div');
        dlOverlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center';
        dlOverlay.innerHTML =
          '<div style="background:#fff;border-radius:16px;padding:32px 28px;max-width:400px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.2);text-align:center">' +
            '<div style="width:48px;height:48px;background:#FEE2E2;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">' +
              '<svg viewBox="0 0 24 24" width="24" height="24" fill="#EF4444"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>' +
            '</div>' +
            '<div style="font-size:1.1rem;font-weight:700;color:var(--gray-900);margin-bottom:8px">Delete Listing?</div>' +
            '<div style="font-size:.88rem;color:var(--gray-500);margin-bottom:24px">' + escapeHtml(dlAddr) + ' will be permanently deleted and cannot be recovered.</div>' +
            '<div style="display:flex;gap:10px;justify-content:center">' +
              '<button data-action="dl-cancel" style="flex:1;padding:10px;border:1.5px solid var(--gray-200);background:#fff;border-radius:8px;font-size:.9rem;font-weight:600;cursor:pointer;color:var(--gray-700)">Cancel</button>' +
              '<button data-action="dl-confirm" style="flex:1;padding:10px;background:#EF4444;border:none;border-radius:8px;font-size:.9rem;font-weight:600;cursor:pointer;color:#fff">Delete</button>' +
            '</div>' +
          '</div>';
        document.body.appendChild(dlOverlay);
        dlOverlay.addEventListener('click', function (ev) {
          ev.stopPropagation();
          ev.stopImmediatePropagation();
          var act = ev.target.closest('[data-action]');
          if (!act) return;
          var actName = act.getAttribute('data-action');
          if (actName === 'dl-confirm') {
            dlOverlay.remove();
            Data.deleteListing(dlId);
            var notes = getNotes();
            delete notes[dlId];
            saveNotes(notes);
            showToast('Listing deleted.');
            window.location.href = 'deal-room.html';
            return;
          }
          if (actName === 'dl-cancel') {
            dlOverlay.remove();
          }
        }, true);
        break;
      }

      case 'add-person':
        var apType = target.getAttribute('data-ptype');
        var lstContainer = document.getElementById('sellersContainer');
        if (lstContainer) {
          var existingFields = document.querySelectorAll('.party-field[data-ptype="' + apType + '"]');
          var maxIdx = -1;
          existingFields.forEach(function (f) { var i = parseInt(f.getAttribute('data-idx')); if (i > maxIdx) maxIdx = i; });
          var newIdx = maxIdx + 1;
          var relOptions = ['Primary','Spouse','Co-Seller','Parent','Other'];
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
          lstContainer.insertAdjacentHTML('beforeend', newHtml);
        }
        break;

      case 'remove-person':
        var rpIdx = target.getAttribute('data-idx');
        var rpType = target.getAttribute('data-ptype');
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
          selectedListingId = editingId;
          editingId = null;
          render();
        } else if (fromDealRoom) {
          window.location.href = 'deal-room.html';
        } else {
          viewMode = 'list';
          render();
        }
        break;

      case 'form-save':
        var fAddr = (document.getElementById('fAddress') || {}).value.trim();
        var fPrice = ((document.getElementById('fPrice') || {}).value || '').replace(/[^0-9.]/g, '');
        var fAgentEl = document.getElementById('fAgent');
        var fAgentId = fAgentEl ? fAgentEl.value : '';
        var fAgentName = (fAgentEl && fAgentEl.selectedOptions && fAgentEl.selectedOptions[0])
          ? (fAgentEl.selectedOptions[0].getAttribute('data-name') || fAgentId)
          : fAgentId;
        var fAgent = fAgentName || fAgentId;
        if (!fAddr || !fPrice || !fAgent) { showToast('Please fill in address, price, and agent.', 'error'); break; }

        var fData = {
          address: fAddr,
          city: (document.getElementById('fCity') || {}).value ? (document.getElementById('fCity').value.trim()) : '',
          state: (document.getElementById('fState') || {}).value ? (document.getElementById('fState').value.trim()) : '',
          zip: (document.getElementById('fZip') || {}).value ? (document.getElementById('fZip').value.trim()) : '',
          price: parseFloat(fPrice),
          agent: fAgentName,
          agentId: fAgentId || undefined,
          propertyType: (document.getElementById('fPropertyType') || {}).value || '',
          beds: (document.getElementById('fBeds') || {}).value ? parseInt(document.getElementById('fBeds').value) : null,
          baths: (document.getElementById('fBaths') || {}).value ? parseFloat(document.getElementById('fBaths').value) : null,
          sqft: (document.getElementById('fSqft') || {}).value ? parseInt(document.getElementById('fSqft').value) : null,
          status: (document.getElementById('fStatus') || {}).value || 'active',
          listingDate: (document.getElementById('fDate') || {}).value || '',
          description: (document.getElementById('fDescription') || {}).value.trim(),
          source: (document.getElementById('fSource') || {}).value || ''
        };

        // Collect sellers BEFORE creating listing so they can be sent atomically
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

        var fListingId;
        if (editingId) {
          Data.updateListing(editingId, fData);
          fListingId = editingId;
          showToast('Listing updated.');
        } else {
          // Pass sellers so they are included in the server POST atomically.
          // Don't show "created" yet — Data.addListing will show "Listing saved."
          // on server confirmation, or a real error toast if the POST fails.
          var fResult = Data.addListing(fData, fSellers);
          fListingId = fResult.id;
          showToast('Saving listing…');
        }

        // If status is pending, auto-create a linked escrow if one doesn't exist
        if (fData.status === 'pending') {
          var existingEscrow = Data.getTransactions().find(function (t) {
            return t.address === fData.address && t.status !== 'closed';
          });
          if (!existingEscrow) {
            window._suppressTxnSync = true;
            var newEscrow = Data.addTransaction({
              address: fData.address, city: fData.city, state: fData.state, zip: fData.zip,
              price: fData.price, agent: fData.agent, source: fData.source,
              type: 'Seller', status: 'pending',
              notes: 'Created from listing (pending)', closeDate: ''
            });
            window._suppressTxnSync = false;
            showToast('Escrow created for pending listing.');
          }
        }

        // Save listing parties to localStorage
        var fLstParties = getParties();
        if (!fLstParties[fListingId]) fLstParties[fListingId] = { sellers: [], contacts: {} };

        // Collect contacts with split fields
        var fContacts = {};
        var contactFields = document.querySelectorAll('.contact-field');
        contactFields.forEach(function (f) {
          var ctype = f.getAttribute('data-ctype');
          var cfield = f.getAttribute('data-cfield');
          if (!fContacts[ctype]) fContacts[ctype] = {};
          fContacts[ctype][cfield] = f.value.trim();
        });

        fLstParties[fListingId].sellers = fSellers;
        fLstParties[fListingId].contacts = fContacts;
        // Clean up old format keys
        delete fLstParties[fListingId].seller;
        saveParties(fLstParties);
        Data.syncListingParties(fListingId, fSellers);

        // Auto-apply listing checklist template if not already set
        var _existingCl = getDealChecklists()[fListingId];
        if (!_existingCl) {
          var allTemplates = loadChecklistTemplates();
          var selectedTpl = allTemplates.filter(function (t) { return t.category === 'listing'; })[0];
          if (selectedTpl) {
            var dealChecklists = getDealChecklists();
            dealChecklists[fListingId] = {
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

      case 'attach-checklist':
        var attachSelect = document.getElementById('attachChecklistSelect');
        if (!attachSelect || !attachSelect.value) { showToast('Please select a template.', 'error'); break; }
        var attachTplId = attachSelect.value;
        var attachTemplates = loadChecklistTemplates();
        var attachTpl = attachTemplates.find(function (t) { return t.id === attachTplId; });
        if (attachTpl && selectedListingId) {
          var dcls = getDealChecklists();
          dcls[selectedListingId] = {
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
        if (addDc[selectedListingId]) {
          addDc[selectedListingId].items.push({
            id: 'chk-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9),
            label: newLabel,
            completed: false,
            completedBy: null,
            completedAt: null,
            dueDate: null,
            note: ''
          });
          saveDealChecklists(addDc);
          showToast('Item added');
          renderDetail();
        }
        break;

      case 'remove-checklist-item':
        var rmId = target.getAttribute('data-item-id');
        var rmDc = getDealChecklists();
        if (rmDc[selectedListingId]) {
          rmDc[selectedListingId].items = rmDc[selectedListingId].items.filter(function (i) { return i.id !== rmId; });
          saveDealChecklists(rmDc);
          showToast('Item removed');
          renderDetail();
        }
        break;
    }
  });

  // Checklist item toggle
  document.addEventListener('change', function (e) {
    var clTarget = e.target.closest('[data-action="toggle-checklist-item"]');
    if (clTarget && selectedListingId) {
      var itemId = clTarget.getAttribute('data-item-id');
      var dcls = getDealChecklists();
      var cl = dcls[selectedListingId];
      if (cl) {
        var clItem = cl.items.find(function (i) { return i.id === itemId; });
        if (clItem) {
          var session = Auth.getSession();
          if (clTarget.checked) {
            clItem.completed = true;
            clItem.completedBy = session ? session.displayName : 'Unknown';
            clItem.completedAt = new Date().toISOString();
          } else {
            clItem.completed = false;
            clItem.completedBy = null;
            clItem.completedAt = null;
          }
          saveDealChecklists(dcls);
          renderDetail();
        }
      }
    }

    // Checklist due date change
    var dateTarget = e.target.closest('[data-action="set-checklist-date"]');
    if (dateTarget && selectedListingId) {
      var dateItemId = dateTarget.getAttribute('data-item-id');
      var dateVal = dateTarget.value || null;
      var dateDc = getDealChecklists();
      if (dateDc[selectedListingId]) {
        var dateItem = dateDc[selectedListingId].items.find(function (i) { return i.id === dateItemId; });
        if (dateItem) {
          dateItem.dueDate = dateVal;
          saveDealChecklists(dateDc);
          renderDetail();
        }
      }
    }
  });

  // Checklist note + vendor change (debounced — don't re-render on every keystroke)
  var _clDebounce = {};
  document.addEventListener('input', function (e) {
    var noteTarget = e.target.closest('[data-action="set-checklist-note"]');
    var vendorTarget = e.target.closest('[data-action="set-checklist-vendor"]');
    var clInput = noteTarget || vendorTarget;
    if (clInput && selectedListingId) {
      var clItemId = clInput.getAttribute('data-item-id');
      var clField = noteTarget ? 'note' : 'vendor';
      var clVal = clInput.value;
      var clKey = clItemId + clField;
      clearTimeout(_clDebounce[clKey]);
      _clDebounce[clKey] = setTimeout(function () {
        var clDc = getDealChecklists();
        if (clDc[selectedListingId]) {
          var clItem = clDc[selectedListingId].items.find(function (i) { return i.id === clItemId; });
          if (clItem) {
            clItem[clField] = clVal;
            saveDealChecklists(clDc);
          }
        }
      }, 600);
    }
  });

  // Checklist date+time pickers (custom flatpickr — day of week + time)
  function initChecklistPickers() {
    if (typeof flatpickr === 'undefined') return;
    // Also init escrow checklist date pickers
    document.querySelectorAll('[data-action="set-escrow-cl-date"]').forEach(function (input) {
      if (input._flatpickr) return;
      flatpickr(input, {
        enableTime: true, dateFormat: 'Y-m-d H:i', altInput: true, altFormat: 'D, M j, Y h:iK',
        allowInput: false, disableMobile: false, minuteIncrement: 15, monthSelectorType: 'static',
        onReady: function (_, __, fp) {
          if (fp.altInput) {
            fp.altInput.style.cssText = fp.input.getAttribute('style') || '';
            fp.altInput.setAttribute('data-action', 'set-escrow-cl-date');
          }
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.textContent = 'Done';
          btn.style.cssText = 'display:block;width:calc(100% - 24px);margin:8px 12px 4px;padding:8px;background:var(--indigo,#6366F1);color:#fff;border:none;border-radius:8px;font-size:.85rem;font-weight:700;cursor:pointer;font-family:inherit';
          btn.addEventListener('click', function () { fp.close(); });
          fp.calendarContainer.appendChild(btn);
        },
        onChange: function (selectedDates, dateStr) {
          var txnId = input.getAttribute('data-txn-id');
          var itemId = input.getAttribute('data-item-id');
          var cls = getDealChecklists();
          if (cls[txnId]) {
            var it = cls[txnId].items.find(function (i) { return i.id === itemId; });
            if (it) { it.dueDate = dateStr; saveDealChecklists(cls); }
          }
        }
      });
    });
    // Escrow vendor/note blur handlers
    document.querySelectorAll('[data-action="set-escrow-cl-vendor"],[data-action="set-escrow-cl-note"]').forEach(function (input) {
      input.addEventListener('blur', function () {
        var txnId = this.getAttribute('data-txn-id');
        var itemId = this.getAttribute('data-item-id');
        var field = this.getAttribute('data-action') === 'set-escrow-cl-vendor' ? 'vendor' : 'note';
        var cls = getDealChecklists();
        if (cls[txnId]) {
          var it = cls[txnId].items.find(function (i) { return i.id === itemId; });
          if (it) { it[field] = this.value.trim(); saveDealChecklists(cls); }
        }
      });
    });
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
          // Fire change event on original input so the save handler picks it up
          var ev = new Event('change', { bubbles: true });
          this.element.dispatchEvent(ev);
        }
      });
    });
  }

  // Checklist drag-and-drop reordering
  function initChecklistDrag() {
    var list = document.getElementById('clItemList');
    if (!list) return;
    var dragging = null;

    list.querySelectorAll('.cl-item').forEach(function (el) {
      el.addEventListener('dragstart', function (e) {
        dragging = el;
        setTimeout(function () { el.style.opacity = '0.4'; }, 0);
        e.dataTransfer.effectAllowed = 'move';
      });
      el.addEventListener('dragend', function () {
        el.style.opacity = '';
        dragging = null;
        // Persist new order to localStorage
        var newOrder = Array.from(list.querySelectorAll('.cl-item')).map(function (n) { return n.getAttribute('data-item-id'); });
        var dcDrag = getDealChecklists();
        if (dcDrag[selectedListingId]) {
          var idMap = {};
          dcDrag[selectedListingId].items.forEach(function (i) { idMap[i.id] = i; });
          dcDrag[selectedListingId].items = newOrder.map(function (id) { return idMap[id]; }).filter(Boolean);
          saveDealChecklists(dcDrag);
        }
      });
      el.addEventListener('dragover', function (e) {
        e.preventDefault();
        if (!dragging || dragging === el) return;
        var rect = el.getBoundingClientRect();
        if (e.clientY < rect.top + rect.height / 2) {
          list.insertBefore(dragging, el);
        } else {
          list.insertBefore(dragging, el.nextSibling);
        }
      });
    });
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
    var emailOverlay = document.getElementById('emailPromptModal');
    if (emailOverlay) {
      emailOverlay.addEventListener('click', function (e) { if (e.target === emailOverlay) emailOverlay.parentNode.removeChild(emailOverlay); });
    }
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
    var shareOverlay = document.getElementById('shareClientModal');
    if (shareOverlay) {
      shareOverlay.addEventListener('click', function (e) { if (e.target === shareOverlay) shareOverlay.parentNode.removeChild(shareOverlay); });
    }
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

  // Re-render after bridge loads so DOM IDs match localStorage server IDs
  document.addEventListener('apiBridgeReady', function () {
    if (_detailRendered) return;
    render();
  });

  // If apiBridgeReady already fired before we registered the listener, retry now
  if (!_detailRendered && viewMode === 'detail' && selectedListingId) {
    setTimeout(function () {
      if (!_detailRendered) render();
    }, 500);
    setTimeout(function () {
      if (!_detailRendered) render();
    }, 2000);
  }

  // Poll for checklist updates from other computers every 10 seconds
  setInterval(function () {
    if (!_detailRendered || !selectedListingId) return;
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
  }, 5000);

})();
