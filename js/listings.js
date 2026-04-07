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

  // Deep-link: open specific listing from URL param
  (function () {
    var params = new URLSearchParams(window.location.search);
    var deepId = params.get('id');
    if (deepId) {
      selectedListingId = deepId;
      viewMode = 'detail';
      if (window.history.replaceState) {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  })();
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
  function loadChecklistTemplates() {
    var stored = localStorage.getItem(PREFIX + 'checklist_templates');
    if (!stored) return [];
    try { return JSON.parse(stored); } catch (e) { return []; }
  }

  function getDealChecklists() {
    try { return JSON.parse(localStorage.getItem(PREFIX + 'deal_checklists') || '{}'); } catch (e) { return {}; }
  }

  function saveDealChecklists(data) {
    localStorage.setItem(PREFIX + 'deal_checklists', JSON.stringify(data));
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

  // ---- Representation Modal (shown when listing goes to Pending) ----
  function showRepresentationModal(listing) {
    // Remove existing modal if any
    var old = document.getElementById('repModal');
    if (old) old.remove();

    var overlay = document.createElement('div');
    overlay.id = 'repModal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px)';
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
          '<button data-rep="Dual" style="padding:14px 20px;border-radius:10px;border:1.5px solid var(--indigo);background:var(--indigo-light);cursor:pointer;text-align:left;transition:all .15s;font-family:inherit">' +
            '<div style="font-size:.92rem;font-weight:700;color:var(--indigo)">Both Sides (Dual Agent)</div>' +
            '<div style="font-size:.78rem;color:var(--gray-500);margin-top:2px">I represented both buyer and seller — no separate transaction needed</div>' +
          '</button>' +
        '</div>' +
        '<button id="repCancelBtn" style="margin-top:14px;width:100%;padding:10px;border:none;background:none;color:var(--gray-400);font-size:.82rem;cursor:pointer;font-family:inherit">Cancel</button>' +
      '</div>';
    document.body.appendChild(overlay);

    // Handle clicks
    overlay.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-rep]');
      if (btn) {
        var repType = btn.getAttribute('data-rep');
        overlay.remove();

        // Update listing to pending
        Data.updateListing(selectedListingId, { status: 'pending' });
        addUpdate(selectedListingId, 'under_contract', 'Under Contract', 'An offer has been accepted and the property is now under contract.', true);
        notifyClientEmail(selectedListingId, 'Under Contract', 'An offer has been accepted and the property is now under contract.');

        // Create transaction with the selected type
        Data.addTransaction({
          address: listing.address,
          price: listing.price,
          agent: listing.agent,
          source: listing.source,
          type: repType,
          status: 'pending',
          notes: 'Created from listing (' + repType + ' representation)',
          closeDate: ''
        });
        showToast('Transaction created — ' + repType + ' representation');
        renderDetail();
      }
      if (e.target.id === 'repCancelBtn' || e.target === overlay) {
        overlay.remove();
        // Reset the status dropdown back
        var statusSelect = document.querySelector('.ie-field[data-field="status"]');
        if (statusSelect) {
          var currentListing = Data.getListings().find(function (x) { return x.id === selectedListingId; });
          if (currentListing) statusSelect.value = currentListing.status;
        }
      }
    });
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

    html += '<div class="form-group"><label>Price *</label><input type="number" id="fPrice" value="' + (l ? l.price : '') + '" placeholder="500000" min="0" style="font-size:1rem;padding:12px 16px"></div>';

    html += '<div class="form-row" style="grid-template-columns:1fr 1fr 1fr">';
    html += '<div class="form-group"><label>Beds</label><input type="number" id="fBeds" value="' + (l ? l.beds || '' : '') + '" placeholder="3" min="0" style="padding:12px 16px"></div>';
    html += '<div class="form-group"><label>Baths</label><input type="number" id="fBaths" value="' + (l ? l.baths || '' : '') + '" placeholder="2" min="0" step="0.5" style="padding:12px 16px"></div>';
    html += '<div class="form-group"><label>Sq Ft</label><input type="number" id="fSqft" value="' + (l ? l.sqft || '' : '') + '" placeholder="1800" min="0" style="padding:12px 16px"></div>';
    html += '</div>';

    var _lstFormStatuses = getAdminSetting('listings.statuses', [{ key: 'coming_soon', label: 'Coming Soon' }, { key: 'active', label: 'Active' }, { key: 'pending', label: 'Pending' }, { key: 'sold', label: 'Sold' }]);
    html += '<div class="form-row" style="grid-template-columns:1fr 1fr">';
    html += '<div class="form-group"><label>Status</label><select id="fStatus" style="padding:12px 16px">' +
      _lstFormStatuses.map(function (s) { return '<option value="' + s.key + '"' + (l && l.status === s.key ? ' selected' : '') + '>' + s.label + '</option>'; }).join('') +
    '</select></div>';
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
    // Checklist Template selector (listing templates only)
    var _clTemplates = loadChecklistTemplates().filter(function (tpl) { return tpl.category === 'listing'; });
    if (_clTemplates.length > 0) {
      var existingChecklist = isEdit ? getDealChecklists()[editingId] : null;
      html += '<div class="form-group"><label>Checklist Template</label><select id="fChecklistTemplate" style="padding:12px 16px">';
      html += '<option value="">&mdash; None &mdash;</option>';
      _clTemplates.forEach(function (tpl) {
        var sel = existingChecklist && existingChecklist.templateId === tpl.id ? ' selected' : '';
        html += '<option value="' + escapeHtml(tpl.id) + '"' + sel + '>' + escapeHtml(tpl.name) + ' (' + tpl.items.length + ' items)</option>';
      });
      html += '</select></div>';
    }
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

    if (listings.length === 0) {
      var html = '';
      html += '<div class="page-header">' +
        '<div><h2>All Listings</h2></div>' +
        '<button class="btn btn-primary btn-sm" data-action="add-listing">' +
          '<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>' +
          'Add Listing' +
        '</button>' +
      '</div>';
      html += '<div style="text-align:center;padding:60px 20px;color:var(--gray-400);">' +
        '<div style="font-size:2rem;margin-bottom:12px">🏠</div>' +
        '<div style="font-weight:600;margin-bottom:4px">No listings yet</div>' +
        '<div style="font-size:.85rem">Click \'New Listing\' to get started.</div>' +
      '</div>';
      pageBody.innerHTML = html;
      return;
    }

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
      actBody.innerHTML = renderRows(activeList);
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
    var _lstDetailStatuses = getAdminSetting('listings.statuses', [{ key: 'coming_soon', label: 'Coming Soon' }, { key: 'active', label: 'Active' }, { key: 'pending', label: 'Pending' }, { key: 'sold', label: 'Sold' }]);
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

    // Source
    var _lstDetailSources = getAdminSetting('leadSources', ['Zillow','Realtor.com','Referral','Other']);
    html += '<div class="detail-block">' +
      '<div class="detail-block-label">Source</div>' +
      '<select class="ie-field" data-field="source" style="font-size:.88rem;font-weight:600;color:var(--gray-800);background:transparent;border:1.5px solid transparent;border-radius:6px;padding:4px 6px;cursor:pointer" ' +
        'onfocus="this.style.borderColor=\'var(--indigo)\'" onblur="this.style.borderColor=\'transparent\'">' +
        '<option value=""' + (!l.source ? ' selected' : '') + '>—</option>' +
        _lstDetailSources.map(function (s) { return '<option value="' + escapeHtml(s) + '"' + (l.source === s ? ' selected' : '') + '>' + escapeHtml(s) + '</option>'; }).join('') +
      '</select>' +
    '</div>';

    html += '</div>'; // detail-blocks-row

    html += '</div>'; // detail-header-body
    html += '</div>'; // detail-header-card


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

    // Checklist Card
    var dealChecklists = getDealChecklists();
    var lstChecklist = dealChecklists[selectedListingId];
    html += '<div class="parties-card">';
    html += '<div class="parties-card-header" style="display:flex;align-items:center;justify-content:space-between">';
    html += '<span>Checklist</span>';
    if (lstChecklist && lstChecklist.items.length > 0) {
      var clDone = lstChecklist.items.filter(function (i) { return i.completed; }).length;
      var clTotal = lstChecklist.items.length;
      html += '<span style="font-size:.75rem;font-weight:700;color:var(--emerald);background:var(--emerald-light);padding:2px 10px;border-radius:20px">' + clDone + '/' + clTotal + '</span>';
    }
    html += '</div>';
    if (lstChecklist && lstChecklist.items.length > 0) {
      var clDoneCount = lstChecklist.items.filter(function (i) { return i.completed; }).length;
      var clTotalCount = lstChecklist.items.length;
      var clPct = Math.round((clDoneCount / clTotalCount) * 100);
      html += '<div style="padding:12px 20px 0 20px">';
      html += '<div style="background:var(--gray-100);border-radius:6px;height:6px;overflow:hidden">';
      html += '<div style="background:var(--emerald);height:100%;width:' + clPct + '%;border-radius:6px;transition:width .3s"></div>';
      html += '</div></div>';
      html += '<div style="padding:12px 20px">';
      lstChecklist.items.forEach(function (item, idx) {
        html += '<div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid var(--gray-50)">';
        html += '<input type="checkbox"' + (item.completed ? ' checked' : '') + ' data-action="toggle-checklist-item" data-item-idx="' + idx + '" style="margin-top:3px;cursor:pointer;width:16px;height:16px;accent-color:var(--emerald)">';
        html += '<div style="flex:1;min-width:0">';
        html += '<div style="font-size:.88rem;color:' + (item.completed ? 'var(--gray-400)' : 'var(--gray-800)') + ';' + (item.completed ? 'text-decoration:line-through;' : '') + '">' + escapeHtml(item.label) + '</div>';
        if (item.completed && item.completedBy) {
          html += '<div style="font-size:.72rem;color:var(--gray-400);margin-top:2px">Completed by ' + escapeHtml(item.completedBy) + ' &middot; ' + Data.formatDate(item.completedAt) + '</div>';
        }
        html += '</div>';
        html += '<button style="background:none;border:none;cursor:pointer;color:var(--gray-300);font-size:.8rem;padding:2px 4px;line-height:1" data-action="remove-checklist-item" data-item-idx="' + idx + '" title="Remove">&times;</button>';
        html += '</div>';
      });
      // Add new item input
      html += '<div style="display:flex;gap:8px;padding:10px 0;align-items:center">';
      html += '<input type="text" id="newChecklistItem" placeholder="Add a checklist item..." style="flex:1;border:1.5px solid var(--gray-200);border-radius:8px;padding:7px 12px;font-size:.82rem;outline:none">';
      html += '<button class="btn btn-primary btn-sm" data-action="add-checklist-item" style="font-size:.78rem;padding:6px 14px;white-space:nowrap">+ Add</button>';
      html += '</div>';
      html += '</div>';
    } else {
      // Auto-attach first listing template
      var listingTemplates = loadChecklistTemplates().filter(function (tpl) { return tpl.category === 'listing'; });
      if (listingTemplates.length > 0) {
        var autoTpl = listingTemplates[0];
        var dc = getDealChecklists();
        dc[selectedListingId] = {
          templateId: autoTpl.id,
          templateName: autoTpl.name,
          items: autoTpl.items.map(function (item) {
            return { id: 'chk-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9), label: item.label, completed: false, completedBy: null, completedAt: null };
          })
        };
        saveDealChecklists(dc);
        // Re-render to show the auto-attached checklist
        render();
        return;
      } else {
        html += '<div style="padding:20px;text-align:center;font-size:.85rem;color:var(--gray-400)">No checklist templates found. Create one in Admin Settings → Checklist Templates.</div>';
      }
    }
    html += '</div>';

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

          // Status → Pending: ask representation type, then create transaction
          if (val === 'pending' && oldStatus !== 'pending') {
            // Check if a transaction already exists for this address
            var existingTxn = Data.getTransactions().find(function (t) {
              return currentListing && t.address === currentListing.address;
            });
            if (existingTxn) {
              // Transaction already exists, just update status
              Data.updateListing(selectedListingId, { status: 'pending' });
              addUpdate(selectedListingId, 'under_contract', 'Under Contract', 'An offer has been accepted and the property is now under contract.', true);
              notifyClientEmail(selectedListingId, 'Under Contract', 'An offer has been accepted and the property is now under contract.');
              showToast('Saved');
              renderDetail();
              return;
            }
            // Show representation modal
            showRepresentationModal(currentListing);
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
          description: (document.getElementById('fDescription') || {}).value.trim(),
          source: (document.getElementById('fSource') || {}).value || ''
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

        // Save listing parties (sellers as array, contacts with split fields)
        var fLstParties = getParties();
        if (!fLstParties[fListingId]) fLstParties[fListingId] = { sellers: [], contacts: {} };

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

        fLstParties[fListingId].sellers = fSellers;
        fLstParties[fListingId].contacts = fContacts;
        // Clean up old format keys
        delete fLstParties[fListingId].seller;
        saveParties(fLstParties);

        // Clone checklist template if selected
        var fClTplId = (document.getElementById('fChecklistTemplate') || {}).value;
        if (fClTplId) {
          var allTemplates = loadChecklistTemplates();
          var selectedTpl = allTemplates.find(function (t) { return t.id === fClTplId; });
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
            completedAt: null
          });
          saveDealChecklists(addDc);
          showToast('Item added');
          renderDetail();
        }
        break;

      case 'remove-checklist-item':
        var rmIdx = parseInt(target.getAttribute('data-item-idx'));
        var rmDc = getDealChecklists();
        if (rmDc[selectedListingId] && rmDc[selectedListingId].items[rmIdx] !== undefined) {
          rmDc[selectedListingId].items.splice(rmIdx, 1);
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
      var itemIdx = parseInt(clTarget.getAttribute('data-item-idx'));
      var dcls = getDealChecklists();
      var cl = dcls[selectedListingId];
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
    render();
  });

})();
