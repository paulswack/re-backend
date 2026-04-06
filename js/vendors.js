/* ============================================================
   RE Back Office — Vendors Page
   ============================================================ */

(function () {
  'use strict';

  Auth.requireAuth();
  populateSidebarUser();
  setActiveNav();
  initSidebarToggle();
  applyPageColor('vendors');

  document.getElementById('logoutBtn').addEventListener('click', function () {
    Auth.logout();
  });

  var STORAGE_KEY = 'reb_vendors';
  var pageBody = document.getElementById('pageBody');
  var currentFilter = 'All';

  // ---- Categories with colors ----
  var CATEGORIES = {
    'Inspector':            { bg: '#E6F5EE', text: '#1A7F4B' },
    'Lender / Mortgage':    { bg: '#E0EDFF', text: '#1D4ED8' },
    'Title & Escrow':       { bg: '#F0E6FF', text: '#6B21A8' },
    'Contractor / Handyman':{ bg: '#FEF3C7', text: '#92400E' },
    'Plumber':              { bg: '#DBEAFE', text: '#1E40AF' },
    'Electrician':          { bg: '#FEF9C3', text: '#854D0E' },
    'HVAC':                 { bg: '#E0F2FE', text: '#075985' },
    'Roofer':               { bg: '#FEE2E2', text: '#991B1B' },
    'Painter':              { bg: '#FCE7F3', text: '#9D174D' },
    'Landscaper':           { bg: '#DCFCE7', text: '#166534' },
    'Cleaner / Stager':     { bg: '#F5F3FF', text: '#5B21B6' },
    'Photographer':         { bg: '#FFF1F2', text: '#BE123C' },
    'Attorney / Legal':     { bg: '#F1F5F9', text: '#334155' },
    'Insurance':            { bg: '#ECFDF5', text: '#065F46' },
    'Appraiser':            { bg: '#FEF3C7', text: '#78350F' },
    'Mover':                { bg: '#FFE4E6', text: '#881337' },
    'Other':                { bg: '#F1F5F9', text: '#475569' }
  };

  var CATEGORY_KEYS = Object.keys(CATEGORIES);

  // ---- Seed data ----
  var SEED_DATA = [
    { name: 'Austin Home Inspectors', contact: 'Mike Daniels', category: 'Inspector', phone: '(512) 555-0101', email: 'mike@austininspect.com', website: 'austinhomeinspectors.com', rating: 5, notes: 'Fast turnaround, very thorough reports.' },
    { name: 'Lone Star Lending', contact: 'Amanda Torres', category: 'Lender / Mortgage', phone: '(512) 555-0202', email: 'atorres@lonestarlending.com', website: '', rating: 5, notes: 'Great rates, responsive loan officers.' },
    { name: 'Capitol Title Co.', contact: 'Brian Park', category: 'Title & Escrow', phone: '(512) 555-0303', email: 'bpark@capitoltitle.com', website: '', rating: 4, notes: 'Reliable closings, good communication.' },
    { name: 'Fix-It Pro Handyman', contact: 'Carlos Ruiz', category: 'Contractor / Handyman', phone: '(512) 555-0404', email: 'carlos@fixitpro.com', website: '', rating: 4, notes: 'Affordable repairs, quick response time.' }
  ];

  // ---- Helpers ----
  function generateId() {
    return 'v_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ---- Data access ----
  function getVendors() {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      if (typeof Auth !== 'undefined' && Auth.isDemo && Auth.isDemo()) {
        var seeded = SEED_DATA.map(function (v) {
          v.id = generateId();
          v.createdAt = new Date().toISOString();
          return v;
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
        return seeded;
      }
      return [];
    }
    try { return JSON.parse(raw); } catch (e) { return []; }
  }

  function saveVendors(vendors) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vendors));
  }

  // ---- Star rating HTML ----
  function starsHtml(rating) {
    var html = '';
    for (var i = 1; i <= 5; i++) {
      if (i <= rating) {
        html += '<span style="color:#F59E0B;font-size:16px;">&#9733;</span>';
      } else {
        html += '<span style="color:#CBD5E1;font-size:16px;">&#9734;</span>';
      }
    }
    return html;
  }

  // ---- Category badge HTML ----
  function categoryBadge(cat) {
    var c = CATEGORIES[cat] || CATEGORIES['Other'];
    return '<span style="display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600;background:' + c.bg + ';color:' + c.text + ';">' + escapeHtml(cat) + '</span>';
  }

  // ---- Render ----
  function render() {
    var vendors = getVendors();

    // Stats
    var total = vendors.length;
    var uniqueCats = {};
    var ratingSum = 0;
    var ratingCount = 0;
    var fiveStarCount = 0;
    vendors.forEach(function (v) {
      if (v.category) uniqueCats[v.category] = true;
      if (v.rating) {
        ratingSum += v.rating;
        ratingCount++;
        if (v.rating === 5) fiveStarCount++;
      }
    });
    var catCount = Object.keys(uniqueCats).length;
    var avgRating = ratingCount ? (ratingSum / ratingCount).toFixed(1) : '0.0';

    // Filter
    var filtered = vendors;
    if (currentFilter !== 'All') {
      filtered = vendors.filter(function (v) { return v.category === currentFilter; });
    }

    // Active categories for tabs
    var activeCats = Object.keys(uniqueCats).sort();

    var html = '';

    // Header
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;">';
    html += '<h2 style="margin:0;font-size:22px;font-weight:700;">Vendors</h2>';
    html += '<button class="btn btn-primary" data-action="add-vendor" style="display:inline-flex;align-items:center;gap:6px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg> Add Vendor</button>';
    html += '</div>';

    // Stat cards
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;margin-bottom:24px;">';
    html += statCard('Total Vendors', total, '#3484D0', '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/></svg>');
    html += statCard('Categories', catCount, '#6B21A8', '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2l-5.5 9h11z M17.5 17.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/></svg>');
    html += statCard('Avg Rating', avgRating, '#F59E0B', '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>');
    html += statCard('5-Star Vendors', fiveStarCount, '#1A7F4B', '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>');
    html += '</div>';

    // Filter tabs
    html += '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px;">';
    html += '<button class="lb-filter-btn' + (currentFilter === 'All' ? ' active' : '') + '" data-action="filter" data-filter="All">All</button>';
    activeCats.forEach(function (cat) {
      html += '<button class="lb-filter-btn' + (currentFilter === cat ? ' active' : '') + '" data-action="filter" data-filter="' + escapeHtml(cat) + '">' + escapeHtml(cat) + '</button>';
    });
    html += '</div>';

    // Vendor grid
    if (filtered.length === 0) {
      html += '<div style="text-align:center;padding:60px 20px;color:var(--gray-400);">';
      html += '<div style="font-size:2rem;margin-bottom:12px">🔧</div>';
      html += '<div style="font-weight:600;margin-bottom:4px">No vendors added yet</div>';
      html += '<div style="font-size:.85rem">Click \'Add Vendor\' to get started.</div>';
      html += '</div>';
    } else {
      html += '<div class="vendor-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;">';
      filtered.forEach(function (v) {
        var c = CATEGORIES[v.category] || CATEGORIES['Other'];
        html += '<div class="vendor-card" style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);overflow:hidden;border:1px solid #E2E8F0;transition:box-shadow 0.2s;">';
        // Color bar
        html += '<div style="height:4px;background:' + c.text + ';"></div>';
        // Body
        html += '<div style="padding:16px;">';
        // Name + category
        html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px;">';
        html += '<div>';
        html += '<div style="font-weight:700;font-size:16px;color:#1E293B;">' + escapeHtml(v.name) + '</div>';
        if (v.contact) {
          html += '<div style="font-size:13px;color:#64748B;margin-top:2px;">' + escapeHtml(v.contact) + '</div>';
        }
        html += '</div>';
        html += categoryBadge(v.category);
        html += '</div>';
        // Stars
        html += '<div style="margin-bottom:10px;">' + starsHtml(v.rating || 0) + '</div>';
        // Contact info
        if (v.phone) {
          html += '<div style="font-size:13px;color:#475569;margin-bottom:4px;"><a href="tel:' + escapeHtml(v.phone) + '" style="color:#3484D0;text-decoration:none;">' + escapeHtml(v.phone) + '</a></div>';
        }
        if (v.email) {
          html += '<div style="font-size:13px;color:#475569;margin-bottom:4px;"><a href="mailto:' + escapeHtml(v.email) + '" style="color:#3484D0;text-decoration:none;">' + escapeHtml(v.email) + '</a></div>';
        }
        if (v.website) {
          var url = v.website.indexOf('http') === 0 ? v.website : 'https://' + v.website;
          html += '<div style="font-size:13px;color:#475569;margin-bottom:4px;"><a href="' + escapeHtml(url) + '" target="_blank" rel="noopener" style="color:#3484D0;text-decoration:none;">' + escapeHtml(v.website) + '</a></div>';
        }
        // Notes
        if (v.notes) {
          html += '<div style="font-size:13px;color:#64748B;margin-top:10px;padding-top:10px;border-top:1px solid #F1F5F9;line-height:1.4;">' + escapeHtml(v.notes) + '</div>';
        }
        // Actions
        html += '<div style="display:flex;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid #F1F5F9;">';
        html += '<button class="btn btn-outline" style="font-size:12px;padding:4px 12px;" data-action="edit-vendor" data-id="' + v.id + '">Edit</button>';
        html += '<button class="btn btn-outline" style="font-size:12px;padding:4px 12px;color:#DC2626;border-color:#FECACA;" data-action="delete-vendor" data-id="' + v.id + '">Delete</button>';
        html += '</div>';
        html += '</div></div>';
      });
      html += '</div>';
    }

    pageBody.innerHTML = html;
  }

  function statCard(label, value, color, iconSvg) {
    return '<div class="stat-card" style="background:#fff;border-radius:12px;padding:18px;box-shadow:0 1px 4px rgba(0,0,0,0.06);border:1px solid #E2E8F0;">' +
      '<div style="display:flex;align-items:center;gap:12px;">' +
      '<div class="stat-icon" style="width:42px;height:42px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:' + color + '20;color:' + color + ';">' + iconSvg + '</div>' +
      '<div>' +
      '<div style="font-size:22px;font-weight:700;color:#1E293B;">' + value + '</div>' +
      '<div style="font-size:13px;color:#64748B;">' + escapeHtml(label) + '</div>' +
      '</div></div></div>';
  }

  // ---- Modal ----
  function openModal(vendor) {
    var isEdit = !!vendor;
    var v = vendor || {};

    var catOptions = CATEGORY_KEYS.map(function (cat) {
      var sel = v.category === cat ? ' selected' : '';
      return '<option value="' + escapeHtml(cat) + '"' + sel + '>' + escapeHtml(cat) + '</option>';
    }).join('');

    var ratingOptions = '';
    for (var i = 1; i <= 5; i++) {
      var sel = v.rating === i ? ' selected' : '';
      ratingOptions += '<option value="' + i + '"' + sel + '>' + i + '</option>';
    }

    var html = '<div class="modal-overlay open" id="vendorModalOverlay">';
    html += '<div class="modal" style="max-width:540px;">';
    html += '<div class="modal-header">';
    html += '<h3 style="margin:0;">' + (isEdit ? 'Edit Vendor' : 'Add Vendor') + '</h3>';
    html += '<button class="modal-close" data-action="close-modal">&times;</button>';
    html += '</div>';
    html += '<div class="modal-body">';

    html += '<div class="form-group"><label>Name *</label><input type="text" id="vName" class="form-control" value="' + escapeHtml(v.name || '') + '" placeholder="Company or vendor name"></div>';

    html += '<div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">';
    html += '<div class="form-group"><label>Category *</label><select id="vCategory" class="form-control"><option value="">Select category</option>' + catOptions + '</select></div>';
    html += '<div class="form-group"><label>Rating</label><select id="vRating" class="form-control"><option value="">No rating</option>' + ratingOptions + '</select></div>';
    html += '</div>';

    html += '<div class="form-group"><label>Contact Person</label><input type="text" id="vContact" class="form-control" value="' + escapeHtml(v.contact || '') + '" placeholder="Primary contact name"></div>';

    html += '<div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">';
    html += '<div class="form-group"><label>Phone</label><input type="text" id="vPhone" class="form-control" value="' + escapeHtml(v.phone || '') + '" placeholder="(555) 555-0100"></div>';
    html += '<div class="form-group"><label>Email</label><input type="email" id="vEmail" class="form-control" value="' + escapeHtml(v.email || '') + '" placeholder="email@example.com"></div>';
    html += '</div>';

    html += '<div class="form-group"><label>Website</label><input type="text" id="vWebsite" class="form-control" value="' + escapeHtml(v.website || '') + '" placeholder="www.example.com"></div>';

    html += '<div class="form-group"><label>Notes</label><textarea id="vNotes" class="form-control" rows="3" placeholder="Additional notes...">' + escapeHtml(v.notes || '') + '</textarea></div>';

    html += '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;">';
    html += '<button class="btn btn-outline" data-action="close-modal">Cancel</button>';
    html += '<button class="btn btn-primary" data-action="save-vendor" data-id="' + (v.id || '') + '">' + (isEdit ? 'Update' : 'Add Vendor') + '</button>';
    html += '</div>';

    html += '</div></div></div>';

    var container = document.createElement('div');
    container.id = 'vendorModal';
    container.innerHTML = html;
    document.body.appendChild(container);

    // Focus first field
    var nameInput = document.getElementById('vName');
    if (nameInput) nameInput.focus();
  }

  function closeModal() {
    var modal = document.getElementById('vendorModal');
    if (modal) modal.parentNode.removeChild(modal);
  }

  function saveVendor(id) {
    var name = document.getElementById('vName').value.trim();
    var category = document.getElementById('vCategory').value;
    var contact = document.getElementById('vContact').value.trim();
    var phone = document.getElementById('vPhone').value.trim();
    var email = document.getElementById('vEmail').value.trim();
    var website = document.getElementById('vWebsite').value.trim();
    var ratingVal = document.getElementById('vRating').value;
    var notes = document.getElementById('vNotes').value.trim();

    if (!name) { showToast('Vendor name is required.', 'error'); return; }
    if (!category) { showToast('Please select a category.', 'error'); return; }

    var vendors = getVendors();
    var rating = ratingVal ? parseInt(ratingVal, 10) : 0;

    if (id) {
      // Edit
      vendors = vendors.map(function (v) {
        if (v.id === id) {
          v.name = name;
          v.category = category;
          v.contact = contact;
          v.phone = phone;
          v.email = email;
          v.website = website;
          v.rating = rating;
          v.notes = notes;
        }
        return v;
      });
      showToast('Vendor updated successfully.');
    } else {
      // Add
      vendors.push({
        id: generateId(),
        name: name,
        category: category,
        contact: contact,
        phone: phone,
        email: email,
        website: website,
        rating: rating,
        notes: notes,
        createdAt: new Date().toISOString()
      });
      showToast('Vendor added successfully.');
    }

    saveVendors(vendors);
    closeModal();
    render();
  }

  function deleteVendor(id) {
    if (!confirm('Delete this vendor?')) return;
    var vendors = getVendors().filter(function (v) { return v.id !== id; });
    saveVendors(vendors);
    showToast('Vendor deleted.');
    render();
  }

  // ---- Event delegation ----
  document.addEventListener('click', function (e) {
    var target = e.target.closest('[data-action]');
    if (!target) return;
    var action = target.getAttribute('data-action');

    if (action === 'add-vendor') {
      openModal(null);
    } else if (action === 'edit-vendor') {
      var id = target.getAttribute('data-id');
      var vendors = getVendors();
      var vendor = null;
      for (var i = 0; i < vendors.length; i++) {
        if (vendors[i].id === id) { vendor = vendors[i]; break; }
      }
      if (vendor) openModal(vendor);
    } else if (action === 'delete-vendor') {
      deleteVendor(target.getAttribute('data-id'));
    } else if (action === 'save-vendor') {
      saveVendor(target.getAttribute('data-id'));
    } else if (action === 'close-modal') {
      closeModal();
    } else if (action === 'filter') {
      currentFilter = target.getAttribute('data-filter');
      render();
    }
  });

  // Close modal on overlay click
  document.addEventListener('click', function (e) {
    var overlay = document.getElementById('vendorModalOverlay');
    if (overlay && e.target === overlay) closeModal();
  });

  // ---- Init ----
  render();

})();
