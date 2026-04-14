/* ============================================================
   RE Back Office — Deal Room
   Combined view of all active listings + current escrows
   ============================================================ */

(function () {
  'use strict';

  Auth.requireAuth();
  populateSidebarUser();
  setActiveNav();
  initSidebarToggle();
  applyPageColor('dealRoom');

  document.getElementById('logoutBtn').addEventListener('click', function () {
    Auth.logout();
  });

  var PREFIX = 'reb_';
  var pageBody = document.getElementById('pageBody');

  // ---- State ----
  var _filter = 'all';      // 'all' | 'listings' | 'escrows'
  var _search = '';
  var _sort = 'price-desc'; // 'price-desc' | 'price-asc' | 'date' | 'agent' | 'closing'

  // ---- Helpers ----
  function escapeHtml(s) {
    if (!s && s !== 0) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function formatDollars(n) {
    return '$' + (parseFloat(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function formatDate(d) {
    if (!d) return '';
    try {
      return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) { return d; }
  }

  function daysUntil(dateStr) {
    if (!dateStr) return null;
    try {
      var dt = new Date(dateStr + 'T00:00:00');
      var now = new Date(); now.setHours(0, 0, 0, 0);
      return Math.round((dt - now) / 86400000);
    } catch (e) { return null; }
  }

  function getInitials(name) {
    if (!name) return '?';
    var p = name.trim().split(' ');
    return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  }

  function getProfilePhoto(agentName) {
    try {
      var profiles = JSON.parse(localStorage.getItem(PREFIX + 'profiles') || '{}');
      var users = JSON.parse(localStorage.getItem(PREFIX + 'users') || '[]');
      var user = users.find(function (u) { return u.displayName === agentName; });
      if (user) {
        var p = profiles[user.username];
        if (p && p.photo) return p.photo;
      }
    } catch (e) {}
    return null;
  }

  function avatarHtml(name, size) {
    size = size || 30;
    var photo = getProfilePhoto(name);
    if (photo) {
      return '<img src="' + escapeHtml(photo) + '" alt="" style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;object-fit:cover;flex-shrink:0">';
    }
    return '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:var(--indigo-light);color:var(--indigo);display:flex;align-items:center;justify-content:center;font-size:' + Math.round(size * 0.36) + 'px;font-weight:700;flex-shrink:0;letter-spacing:-.5px">' + escapeHtml(getInitials(name)) + '</div>';
  }

  function getChecklists(key) {
    try { return JSON.parse(localStorage.getItem(PREFIX + key) || '{}'); } catch (e) { return {}; }
  }

  function checklistPct(items) {
    if (!items || !items.length) return null;
    var done = items.filter(function (it) { return it.completed; }).length;
    return { done: done, total: items.length, pct: Math.round(done / items.length * 100) };
  }

  // ---- Data ----
  function buildDeals() {
    var lstChecklists = getChecklists('deal_checklists');
    var txnChecklists = getChecklists('txn_checklists');

    var deals = [];

    Data.getListings().forEach(function (l) {
      if (l.status === 'sold') return;
      var cl = lstChecklists[l.id];
      deals.push({
        _type: 'listing',
        id: l.id,
        address: l.address,
        city: l.city || '', state: l.state || '', zip: l.zip || '',
        price: l.price || 0,
        agent: l.agent || '',
        status: l.status || 'active',
        beds: l.beds, baths: l.baths, sqft: l.sqft,
        listingDate: l.listingDate || '',
        checklist: checklistPct(cl ? cl.items : null)
      });
    });

    Data.getTransactions().forEach(function (t) {
      if (t.status === 'closed') return;
      var cl = txnChecklists[t.id];
      deals.push({
        _type: 'escrow',
        id: t.id,
        address: t.address,
        city: t.city || '', state: t.state || '', zip: t.zip || '',
        price: t.price || 0,
        agent: t.agent || '',
        status: t.status || 'active',
        repType: t.type || 'Buyer',
        closeDate: t.closeDate || '',
        checklist: checklistPct(cl ? cl.items : null)
      });
    });

    // Filter
    if (_filter === 'listings') deals = deals.filter(function (d) { return d._type === 'listing'; });
    if (_filter === 'escrows')  deals = deals.filter(function (d) { return d._type === 'escrow'; });

    // Search
    if (_search) {
      var q = _search.toLowerCase();
      deals = deals.filter(function (d) {
        return (d.address + ' ' + d.city + ' ' + d.agent).toLowerCase().indexOf(q) !== -1;
      });
    }

    // Sort
    deals.sort(function (a, b) {
      if (_sort === 'price-asc')  return a.price - b.price;
      if (_sort === 'price-desc') return b.price - a.price;
      if (_sort === 'agent')      return (a.agent).localeCompare(b.agent);
      if (_sort === 'closing') {
        var da = a.closeDate || '9999', db = b.closeDate || '9999';
        return da.localeCompare(db);
      }
      // date: listings by listingDate, escrows by closeDate, newest first
      var dateA = a.listingDate || a.closeDate || '';
      var dateB = b.listingDate || b.closeDate || '';
      return dateB.localeCompare(dateA);
    });

    return deals;
  }

  // ---- Render helpers ----
  var STATUS_META = {
    coming_soon: { label: 'Coming Soon', bg: '#EEF2FF', color: '#3B5BDB', border: '#BAC8FF' },
    active:      { label: 'Active',      bg: '#E6F5EE', color: '#1A7F4B', border: '#A3D9B3' },
    pending:     { label: 'Pending',     bg: '#FFF4E0', color: '#B86B00', border: '#FFD280' },
    sold:        { label: 'Sold',        bg: '#E6F5EE', color: '#1A7F4B', border: '#A3D9B3' },
    closed:      { label: 'Closed',      bg: '#E6F5EE', color: '#1A7F4B', border: '#A3D9B3' }
  };

  function statusMeta(s) {
    return STATUS_META[s] || { label: s, bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' };
  }

  function dealCard(d) {
    var isListing = d._type === 'listing';
    var isBuyer   = d.repType === 'Buyer';

    // Accent colors: indigo for listings, emerald for buyer escrow, amber for seller escrow
    var accent     = isListing ? 'var(--indigo)'   : (isBuyer ? 'var(--emerald)' : '#B86B00');
    var typeBg     = isListing ? '#EEF2FF'          : (isBuyer ? '#E6F5EE'        : '#FFF8EE');
    var typeColor  = isListing ? '#3B5BDB'          : (isBuyer ? '#1A7F4B'        : '#B86B00');
    var typeLabel  = isListing ? 'Listing'          : (isBuyer ? 'Buyer Escrow'   : 'Seller Escrow');

    var sm = statusMeta(d.status);
    var addrSub = [d.city, d.state, d.zip].filter(Boolean).join(', ');

    // Specs line (listings only)
    var specsHtml = '';
    if (isListing) {
      var parts = [];
      if (d.beds)  parts.push(d.beds + ' bd');
      if (d.baths) parts.push(d.baths + ' ba');
      if (d.sqft)  parts.push(Number(d.sqft).toLocaleString() + ' sqft');
      if (parts.length) {
        specsHtml = '<div style="font-size:.76rem;color:var(--gray-400);margin-top:3px;display:flex;align-items:center;gap:4px">' +
          '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>' +
          escapeHtml(parts.join(' · ')) +
        '</div>';
      }
    }

    // Closing info (escrows only)
    var closingHtml = '';
    if (!isListing && d.closeDate) {
      var days = daysUntil(d.closeDate);
      var urgency = '', urgencyColor = 'var(--gray-400)';
      if (days !== null) {
        if (days < 0)       { urgency = 'Closed ' + Math.abs(days) + 'd ago'; urgencyColor = 'var(--emerald)'; }
        else if (days === 0){ urgency = 'Closing today!'; urgencyColor = 'var(--rose)'; }
        else if (days <= 7) { urgency = days + 'd left'; urgencyColor = 'var(--rose)'; }
        else if (days <= 21){ urgency = days + 'd left'; urgencyColor = '#B86B00'; }
        else                { urgency = days + 'd left'; urgencyColor = 'var(--gray-400)'; }
      }
      closingHtml = '<div style="display:flex;align-items:center;gap:6px;margin-top:10px;padding:8px 10px;background:var(--gray-50);border-radius:8px">' +
        '<svg viewBox="0 0 24 24" width="13" height="13" fill="var(--gray-400)"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>' +
        '<span style="font-size:.78rem;color:var(--gray-600)">Close: <b>' + escapeHtml(formatDate(d.closeDate)) + '</b></span>' +
        (urgency ? '<span style="font-size:.72rem;font-weight:700;color:' + urgencyColor + ';margin-left:auto">' + escapeHtml(urgency) + '</span>' : '') +
      '</div>';
    }

    // Date line (listings)
    var dateHtml = '';
    if (isListing && d.listingDate) {
      dateHtml = '<div style="font-size:.76rem;color:var(--gray-400);margin-top:10px;display:flex;align-items:center;gap:5px">' +
        '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>' +
        'Listed ' + escapeHtml(formatDate(d.listingDate)) +
      '</div>';
    }

    // Checklist progress bar
    var clHtml = '';
    if (d.checklist) {
      var pct = d.checklist.pct;
      var barColor = pct >= 100 ? 'var(--emerald)' : pct >= 60 ? 'var(--indigo)' : '#B86B00';
      clHtml = '<div style="border-top:1px solid var(--gray-100);margin-top:14px;padding-top:12px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">' +
          '<span style="font-size:.68rem;font-weight:700;color:var(--gray-400);text-transform:uppercase;letter-spacing:.5px">Checklist</span>' +
          '<span style="font-size:.72rem;font-weight:700;color:var(--gray-600)">' + d.checklist.done + ' / ' + d.checklist.total + '</span>' +
        '</div>' +
        '<div style="height:5px;background:var(--gray-100);border-radius:99px;overflow:hidden">' +
          '<div style="height:5px;width:' + pct + '%;background:' + barColor + ';border-radius:99px;transition:width .4s ease"></div>' +
        '</div>' +
      '</div>';
    }

    return '<div class="dr-card" data-id="' + escapeHtml(d.id) + '" data-type="' + d._type + '">' +
      // Top accent bar
      '<div style="height:4px;background:' + accent + '"></div>' +
      '<div style="padding:16px 18px 18px">' +
        // Status + type row
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:13px">' +
          '<span style="font-size:.67rem;font-weight:700;letter-spacing:.4px;padding:3px 10px;border-radius:20px;background:' + sm.bg + ';color:' + sm.color + ';border:1px solid ' + sm.border + '">' + escapeHtml(sm.label.toUpperCase()) + '</span>' +
          '<span style="font-size:.67rem;font-weight:700;letter-spacing:.3px;padding:3px 10px;border-radius:20px;background:' + typeBg + ';color:' + typeColor + '">' + escapeHtml(typeLabel.toUpperCase()) + '</span>' +
        '</div>' +
        // Address
        '<div style="font-size:.97rem;font-weight:800;color:var(--gray-900);line-height:1.25;margin-bottom:2px">' + escapeHtml(d.address) + '</div>' +
        (addrSub ? '<div style="font-size:.76rem;color:var(--gray-400);margin-bottom:10px">' + escapeHtml(addrSub) + '</div>' : '<div style="margin-bottom:10px"></div>') +
        // Price
        '<div style="font-size:1.28rem;font-weight:900;color:' + accent + ';letter-spacing:-.5px;margin-bottom:10px">' + escapeHtml(formatDollars(d.price)) + '</div>' +
        // Agent row
        '<div style="display:flex;align-items:center;gap:8px">' +
          avatarHtml(d.agent, 28) +
          '<span style="font-size:.82rem;font-weight:600;color:var(--gray-700);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escapeHtml(d.agent || 'Unassigned') + '</span>' +
        '</div>' +
        specsHtml +
        closingHtml +
        dateHtml +
        clHtml +
      '</div>' +
    '</div>';
  }

  function statTile(label, value, icon, color) {
    var colors = {
      indigo:  { bg: 'var(--indigo)',  light: '#EEF2FF', text: '#3B5BDB' },
      emerald: { bg: 'var(--emerald)', light: '#E6F5EE', text: '#1A7F4B' },
      amber:   { bg: '#B86B00',        light: '#FFF4E0', text: '#B86B00' },
      blue:    { bg: '#1E5FA8',        light: '#EFF6FF', text: '#1E5FA8' }
    };
    var c = colors[color] || colors.indigo;
    return '<div class="stat-card">' +
      '<div class="stat-icon ' + color + '"><svg viewBox="0 0 24 24"><path d="' + escapeHtml(icon) + '"/></svg></div>' +
      '<div><div class="stat-value">' + escapeHtml(String(value)) + '</div><div class="stat-label">' + escapeHtml(label) + '</div></div>' +
    '</div>';
  }

  // ---- Main Render ----
  function render() {
    var deals = buildDeals();

    // Compute stats from full unfiltered data
    var allListings = Data.getListings().filter(function (l) { return l.status !== 'sold'; });
    var allEscrows  = Data.getTransactions().filter(function (t) { return t.status !== 'closed'; });
    var totalVol    = allListings.concat(allEscrows).reduce(function (s, d) { return s + (parseFloat(d.price) || 0); }, 0);
    var closingSoon = allEscrows.filter(function (t) {
      var n = daysUntil(t.closeDate);
      return n !== null && n >= 0 && n <= 30;
    }).length;

    var html = '';

    // ---- Stats strip ----
    html += '<div class="dr-stats-strip">';
    html += statTile('Pipeline Volume', '$' + Math.round(totalVol).toLocaleString(),
      'M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z', 'indigo');
    html += statTile('Active Listings', allListings.length,
      'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z', 'blue');
    html += statTile('Active Escrows', allEscrows.length,
      'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z', 'emerald');
    html += statTile('Closing in 30 Days', closingSoon,
      'M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z', 'amber');
    html += '</div>';

    // ---- Filter row ----
    html += '<div class="dr-filter-row">';
    html += '<div class="dr-search-wrap">' +
      '<svg viewBox="0 0 24 24" width="15" height="15" fill="var(--gray-400)" style="flex-shrink:0"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>' +
      '<input type="text" id="drSearch" placeholder="Search address, agent, city…" value="' + escapeHtml(_search) + '" style="border:none;outline:none;background:transparent;font-size:.84rem;color:var(--gray-700);width:100%;font-family:inherit">' +
    '</div>';
    html += '<div class="dr-filter-tabs">' +
      '<button class="dr-tab' + (_filter === 'all'      ? ' dr-tab-active' : '') + '" data-filter="all">All Deals</button>' +
      '<button class="dr-tab' + (_filter === 'listings' ? ' dr-tab-active' : '') + '" data-filter="listings">Listings</button>' +
      '<button class="dr-tab' + (_filter === 'escrows'  ? ' dr-tab-active' : '') + '" data-filter="escrows">Escrows</button>' +
    '</div>';
    html += '<select id="drSort" style="border:1.5px solid var(--gray-200);border-radius:8px;padding:8px 12px;font-size:.82rem;color:var(--gray-700);font-family:inherit;background:#fff;cursor:pointer;outline:none">' +
      '<option value="price-desc"' + (_sort === 'price-desc' ? ' selected' : '') + '>Price: High → Low</option>' +
      '<option value="price-asc"'  + (_sort === 'price-asc'  ? ' selected' : '') + '>Price: Low → High</option>' +
      '<option value="closing"'    + (_sort === 'closing'    ? ' selected' : '') + '>Closing: Soonest</option>' +
      '<option value="date"'       + (_sort === 'date'       ? ' selected' : '') + '>Date: Newest</option>' +
      '<option value="agent"'      + (_sort === 'agent'      ? ' selected' : '') + '>Agent A–Z</option>' +
    '</select>';
    html += '</div>';

    // ---- Deal count line ----
    html += '<div style="font-size:.8rem;color:var(--gray-400);margin-bottom:14px;font-weight:500">' +
      deals.length + (deals.length === 1 ? ' deal' : ' deals') +
      (_search ? ' matching <b style="color:var(--gray-600)">' + escapeHtml(_search) + '</b>' : '') +
    '</div>';

    // ---- Cards grid ----
    if (deals.length === 0) {
      html += '<div style="text-align:center;padding:80px 20px">' +
        '<svg viewBox="0 0 24 24" width="56" height="56" fill="var(--gray-200)" style="margin-bottom:16px"><path d="M17 11V3H7v4H3v14h8v-4h2v4h8V11h-4zM7 19H5v-2h2v2zm0-4H5v-2h2v2zm0-4H5v-2h2v2zm4 4H9v-2h2v2zm0-4H9v-2h2v2zm0-4H9V5h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V5h2v2zm4 12h-2v-2h2v2zm0-4h-2v-2h2v2z"/></svg>' +
        '<div style="font-size:1.1rem;font-weight:700;color:var(--gray-500);margin-bottom:6px">No active deals</div>' +
        '<div style="font-size:.85rem;color:var(--gray-400)">Add listings or escrows to see them here</div>' +
      '</div>';
    } else {
      html += '<div class="dr-grid">';
      deals.forEach(function (d) { html += dealCard(d); });
      html += '</div>';
    }

    pageBody.innerHTML = html;

    // ---- Bind events ----
    var searchEl = document.getElementById('drSearch');
    if (searchEl) {
      searchEl.addEventListener('input', function () { _search = this.value; render(); });
      // Focus cursor at end if search has value
      if (_search) { searchEl.setSelectionRange(_search.length, _search.length); }
    }

    var sortEl = document.getElementById('drSort');
    if (sortEl) sortEl.addEventListener('change', function () { _sort = this.value; render(); });

    pageBody.querySelectorAll('.dr-tab').forEach(function (btn) {
      btn.addEventListener('click', function () { _filter = this.getAttribute('data-filter'); render(); });
    });

    // Click card → navigate to detail
    pageBody.querySelectorAll('.dr-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var id   = this.getAttribute('data-id');
        var type = this.getAttribute('data-type');
        window.location.href = (type === 'listing' ? 'listings.html' : 'transactions.html') + '?id=' + encodeURIComponent(id);
      });
    });
  }

  // ---- Init ----
  render();
  document.addEventListener('apiBridgeReady', function () { render(); });

})();
