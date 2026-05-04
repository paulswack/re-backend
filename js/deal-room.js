/* ============================================================
   RE Back Office — Deal Room
   Two-column view: Listings (left) | Current Escrows (right)
   Agent filter dropdown with role-based access control
   ============================================================ */

(function () {
  'use strict';

  Auth.requireAuth();
  populateSidebarUser();
  setActiveNav();
  initSidebarToggle();
  applyPageColor('dealRoom');

  document.getElementById('logoutBtn').addEventListener('click', function () { Auth.logout(); });

  var PREFIX = 'reb_';
  var pageBody = document.getElementById('pageBody');

  var _lstSearch = '';
  var _txnSearch = '';
  var _selectedAgentId = '__mine__'; // default: current user's deals

  // ---- Current user info ----
  var _currentUser = (typeof API !== 'undefined' && API.getUser()) || null;
  var _currentUserId = _currentUser ? _currentUser.id : null;
  var _isPrivileged = (typeof API !== 'undefined' && API.isPrivileged()) || Auth.isPrivileged();
  var _teamMembers = [];

  // ---- Helpers ----
  function escapeHtml(s) {
    if (!s && s !== 0) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function getInitials(name) {
    if (!name) return '?';
    var p = name.trim().split(' ');
    return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  }

  // Same agent-color logic as listings.js / transactions.js
  var _agentColorMap = {};
  var _agentColorIdx = 0;
  var AGENT_COLORS = ['indigo','emerald','amber','violet','blue','rose'];
  function agentClass(name) {
    if (!name) return 'indigo';
    if (!_agentColorMap[name]) _agentColorMap[name] = AGENT_COLORS[(_agentColorIdx++) % AGENT_COLORS.length];
    return _agentColorMap[name];
  }

  function avatarHtml(name, size) {
    size = size || 26;
    var cls = agentClass(name);
    return '<div class="agent-avatar ' + cls + '" style="width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size * 0.38) + 'px;flex-shrink:0">' + escapeHtml(getInitials(name)) + '</div>';
  }

  function formatDate(d) {
    if (!d) return '—';
    try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch (e) { return d; }
  }

  function daysUntil(d) {
    if (!d) return null;
    try {
      var dt = new Date(d + 'T00:00:00'), now = new Date();
      now.setHours(0,0,0,0);
      return Math.round((dt - now) / 86400000);
    } catch(e) { return null; }
  }

  // ---- Load team members for dropdown ----
  function loadTeamMembers() {
    var users = JSON.parse(localStorage.getItem(PREFIX + 'users') || '[]');
    _teamMembers = users.filter(function (u) { return u.role !== 'Assistant'; });
    _teamMembers.sort(function (a, b) {
      return (a.displayName || '').localeCompare(b.displayName || '');
    });
  }

  // ---- Build name<->id lookups from team members ----
  var _nameToId = {};   // displayName → user id
  var _idToName = {};   // user id → displayName

  function buildAgentLookups() {
    _nameToId = {};
    _idToName = {};
    _teamMembers.forEach(function (m) {
      if (m.displayName) {
        _nameToId[m.displayName.toLowerCase()] = m.id;
        _idToName[m.id] = m.displayName;
      }
    });
  }

  // Match a deal to a user id — use agentId if set, otherwise match agent name
  function dealAgentId(deal) {
    if (deal.agentId) return deal.agentId;
    if (deal.agent) return _nameToId[deal.agent.toLowerCase()] || null;
    return null;
  }

  // Get the current user's display name for name-based matching
  var _currentUserName = '';
  function refreshCurrentUserName() {
    var session = Auth.getSession();
    _currentUserName = session ? (session.displayName || '').toLowerCase() : '';
  }

  // Check if a deal belongs to a specific user id
  function dealBelongsTo(deal, userId) {
    var did = dealAgentId(deal);
    if (did) return did === userId;
    // If we still can't resolve, try direct name match against the target user's name
    var targetName = _idToName[userId];
    if (targetName && deal.agent) {
      return deal.agent.toLowerCase() === targetName.toLowerCase();
    }
    return false;
  }

  // Check if a deal belongs to the current user
  function dealIsMine(deal) {
    if (_currentUserId && dealBelongsTo(deal, _currentUserId)) return true;
    // Fallback: match on current user's display name
    if (_currentUserName && deal.agent && deal.agent.toLowerCase() === _currentUserName) return true;
    return false;
  }

  // ---- Filter data by selected agent ----
  function filterByAgent(items) {
    if (_selectedAgentId === '__all__') return items;
    if (_selectedAgentId === '__mine__') {
      return items.filter(function (d) { return dealIsMine(d); });
    }
    // Specific agent selected — match by id or name
    return items.filter(function (d) { return dealBelongsTo(d, _selectedAgentId); });
  }

  // ---- Check if current user can open a specific deal ----
  function canOpenDeal(deal) {
    if (_isPrivileged) return true;
    // Non-privileged users can only open their own deals
    return dealIsMine(deal);
  }

  // ---- Agent filter dropdown HTML ----
  function agentFilterHtml() {
    var session = Auth.getSession();
    var myName = session ? session.displayName : 'My Deals';

    var html = '<div class="dr-agent-filter">';
    html += '<label for="drAgentFilter">Agent:</label>';
    html += '<select id="drAgentFilter">';

    // Default option: current user's deals
    html += '<option value="__mine__"' + (_selectedAgentId === '__mine__' ? ' selected' : '') + '>' + escapeHtml(myName) + ' (My Deals)</option>';

    // Team Stats option — visible to everyone
    html += '<option value="__all__"' + (_selectedAgentId === '__all__' ? ' selected' : '') + '>Team Stats (All Agents)</option>';

    // Individual team members — only show for privileged users
    if (_isPrivileged && _teamMembers.length > 1) {
      html += '<optgroup label="Individual Agents">';
      _teamMembers.forEach(function (m) {
        // Skip current user (already shown as "My Deals")
        if (m.id === _currentUserId) return;
        html += '<option value="' + escapeHtml(m.id) + '"' + (_selectedAgentId === m.id ? ' selected' : '') + '>' + escapeHtml(m.displayName) + '</option>';
      });
      html += '</optgroup>';
    }

    html += '</select>';
    html += '</div>';
    return html;
  }

  // ---- Stats ----
  function statTile(label, value, iconPath, color) {
    return '<div class="stat-card">' +
      '<div class="stat-icon ' + color + '"><svg viewBox="0 0 24 24"><path d="' + iconPath + '"/></svg></div>' +
      '<div><div class="stat-value">' + escapeHtml(String(value)) + '</div><div class="stat-label">' + escapeHtml(label) + '</div></div>' +
    '</div>';
  }

  var SEARCH_ICON = '<svg viewBox="0 0 24 24" width="13" height="13" fill="var(--gray-400)" style="flex-shrink:0"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>';

  function sectionHd(key, label, count) {
    return '<div class="dr-section-hd dr-section-hd--' + key + '">' +
      '<div class="dr-section-hd-label">' + escapeHtml(label) + '<span class="dr-section-hd-count">' + count + '</span></div>' +
      '<div class="dr-section-hd-col">Agent</div>' +
      '<div class="dr-section-hd-col dr-section-hd-col--price">Price</div>' +
    '</div>';
  }

  // Open house helpers
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

  function listingRow(l) {
    var addrSub = [l.city, l.state].filter(Boolean).join(', ');
    var specs = [];
    if (l.beds)  specs.push(l.beds + ' bd');
    if (l.baths) specs.push(l.baths + ' ba');
    if (l.sqft)  specs.push(Number(l.sqft).toLocaleString() + ' sqft');
    var subParts = [addrSub, specs.join(' · ')].filter(Boolean);
    var subHtml = subParts.map(function (p, i) {
      return (i > 0 ? '<span class="dr-dot">·</span>' : '') + escapeHtml(p);
    }).join('');
    var statusKey = l.status || 'active';
    var rowClass = 'dr-row dr-row--' + statusKey;

    var rowHtml = '<div style="border-bottom:1px solid var(--gray-100)">' +
      '<a class="' + rowClass + '" href="deal-detail.html#' + l.id + '" style="text-decoration:none;color:inherit;cursor:pointer;border-bottom:none">' +
        '<div class="dr-row-main">' +
          '<div class="dr-row-address">' + escapeHtml(l.address || '—') + '</div>' +
          (subHtml ? '<div class="dr-row-sub">' + subHtml + '</div>' : '') +
        '</div>' +
        '<div class="dr-row-agent-col">' +
          avatarHtml(l.agent, 22) +
          '<span class="dr-row-agent-name">' + escapeHtml((l.agent || '—').split(' ')[0]) + '</span>' +
        '</div>' +
        '<div class="dr-row-price-col">' +
          '<div class="dr-row-price">' + Data.formatCurrencyFull(l.price) + '</div>' +
          (l.listingDate ? '<div class="dr-row-date">' + escapeHtml(formatDate(l.listingDate)) + '</div>' : '') +
        '</div>' +
      '</a>';

    // Open house section for active listings
    if (statusKey === 'active') {
      var ohs = getOpenHouses(l);
      var canAdd = ohs.length < 3;
      var ohHtml = '';
      ohs.forEach(function (oh, idx) {
        ohHtml += '<div style="display:flex;align-items:center;gap:6px;padding:2px 0;flex-wrap:wrap">' +
          '<span style="font-size:.62rem;font-weight:700;color:#fff;background:var(--emerald);padding:1px 7px;border-radius:20px;letter-spacing:.2px">Open House</span>' +
          '<span style="font-size:.75rem;font-weight:600;color:var(--gray-700)">' + escapeHtml(oh.agent || '') + '</span>' +
          '<span style="font-size:.72rem;color:var(--gray-500)">' + fmtOhDate(oh.date) + (oh.time ? ' · ' + fmtOhTime(oh.time) : '') + '</span>' +
          '<button data-action="dr-remove-oh" data-id="' + l.id + '" data-idx="' + idx + '" style="background:none;border:1px solid var(--rose);color:var(--rose);border-radius:4px;padding:0 5px;font-size:.65rem;cursor:pointer;line-height:1.4">&times;</button>' +
        '</div>';
      });
      if (canAdd) {
        ohHtml += '<button data-action="dr-toggle-oh" data-id="' + l.id + '" style="background:none;border:1px solid var(--indigo);color:var(--indigo);border-radius:4px;padding:1px 6px;font-size:.65rem;font-weight:600;cursor:pointer;align-self:flex-start;margin-top:' + (ohs.length > 0 ? '2px' : '0') + '">+ Open House</button>';
      }
      if (ohHtml) {
        rowHtml += '<div style="padding:4px 18px 8px;display:flex;flex-direction:column;gap:2px">' + ohHtml + '</div>';
      }
      // Hidden form
      if (canAdd) {
        var users = JSON.parse(localStorage.getItem('reb_users') || '[]');
        var agentOpts = '<option value="">Select agent...</option>' + users.filter(function (u) { return u.role !== 'Assistant'; }).map(function (u) {
          return '<option value="' + escapeHtml(u.displayName) + '">' + escapeHtml(u.displayName) + '</option>';
        }).join('');
        rowHtml += '<div id="dr-oh-form-' + l.id + '" style="display:none;padding:10px 18px 12px;background:var(--gray-50);border-top:1px solid var(--gray-100)">' +
          '<div style="font-size:.78rem;font-weight:700;color:var(--gray-700);margin-bottom:8px">Schedule Open House</div>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">' +
            '<div style="flex:2;min-width:120px"><label style="display:block;font-size:.65rem;font-weight:700;color:var(--gray-500);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">Agent</label>' +
            '<select id="dr-oh-agent-' + l.id + '" style="width:100%;padding:7px 10px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:.82rem;background:#fff">' + agentOpts + '</select></div>' +
            '<div style="flex:1;min-width:110px"><label style="display:block;font-size:.65rem;font-weight:700;color:var(--gray-500);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">Date</label>' +
            '<input type="date" id="dr-oh-date-' + l.id + '" style="width:100%;padding:7px 10px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:.82rem;background:#fff"></div>' +
            '<div style="flex:1;min-width:100px"><label style="display:block;font-size:.65rem;font-weight:700;color:var(--gray-500);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">Time</label>' +
            '<input type="time" id="dr-oh-time-' + l.id + '" style="width:100%;padding:7px 10px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:.82rem;background:#fff"></div>' +
            '<div style="display:flex;gap:4px;flex-shrink:0">' +
              '<button data-action="dr-save-oh" data-id="' + l.id + '" style="padding:7px 14px;background:var(--indigo);color:#fff;border:none;border-radius:8px;font-size:.8rem;font-weight:600;cursor:pointer">Save</button>' +
              '<button data-action="dr-toggle-oh" data-id="' + l.id + '" style="padding:7px 10px;background:none;border:1.5px solid var(--gray-200);border-radius:8px;font-size:.8rem;cursor:pointer;color:var(--gray-500)">Cancel</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      }
    }

    rowHtml += '</div>';
    return rowHtml;
  }

  function escrowRow(t) {
    var addrSub = [t.city, t.state].filter(Boolean).join(', ');
    var matchLst = (window._drAllListings || []).find(function (l) { return l.address === t.address; });
    var beds  = t.beds  || (matchLst ? matchLst.beds  : null);
    var baths = t.baths || (matchLst ? matchLst.baths : null);
    var sqft  = t.sqft  || (matchLst ? matchLst.sqft  : null);
    var specs = [];
    if (beds)  specs.push(beds + ' bd');
    if (baths) specs.push(baths + ' ba');
    if (sqft)  specs.push(Number(sqft).toLocaleString() + ' sqft');
    var subParts = [addrSub, specs.join(' · ')].filter(Boolean);
    var subHtml = subParts.map(function (p, i) {
      return (i > 0 ? '<span class="dr-dot">·</span>' : '') + escapeHtml(p);
    }).join('');

    var days = daysUntil(t.closeDate);
    var urgency = '', urgencyClass = '';
    if (days !== null) {
      if (days < 0)        { urgency = Math.abs(days) + 'd ago'; urgencyClass = 'dr-urgency--ok'; }
      else if (days === 0) { urgency = 'Today!';  urgencyClass = 'dr-urgency--hot'; }
      else if (days <= 7)  { urgency = days + 'd left'; urgencyClass = 'dr-urgency--hot'; }
      else if (days <= 21) { urgency = days + 'd left'; urgencyClass = 'dr-urgency--warn'; }
      else                 { urgency = days + 'd left'; urgencyClass = 'dr-urgency--ok'; }
    }

    var statusKey = t.status || 'active';
    var rowClass = 'dr-row dr-row--' + statusKey;
    // All deals go through deal-detail.html (unified view)
    var linkedLst = (window._drAllListings || []).find(function (l) { return l.address === t.address; });
    var detailHref = 'deal-detail.html#' + (linkedLst ? linkedLst.id : t.id);
    return '<a class="' + rowClass + '" href="' + detailHref + '" style="text-decoration:none;color:inherit;cursor:pointer">' +
      '<div class="dr-row-main">' +
        '<div class="dr-row-address">' + escapeHtml(t.address || '—') + '</div>' +
        (subHtml ? '<div class="dr-row-sub">' + subHtml + '</div>' : '') +
      '</div>' +
      '<div class="dr-row-agent-col">' +
        avatarHtml(t.agent, 22) +
        '<span class="dr-row-agent-name">' + escapeHtml((t.agent || '—').split(' ')[0]) + '</span>' +
        (t.type ? '<span class="dr-rep-badge dr-rep-badge--' + t.type.toLowerCase() + '">' + escapeHtml(t.type) + '</span>' : '') +
      '</div>' +
      '<div class="dr-row-price-col">' +
        '<div class="dr-row-price">' + Data.formatCurrencyFull(t.price) + '</div>' +
        (t.closeDate ? '<div class="dr-row-date">' + escapeHtml(formatDate(t.closeDate)) + '</div>' : '') +
        (urgency ? '<span class="dr-urgency ' + urgencyClass + '">' + escapeHtml(urgency) + '</span>' : '') +
      '</div>' +
    '</a>';
  }

  // ---- Listing panel ----
  function renderListingsPanel(listings) {
    var all = listings.filter(function (l) { return l.status !== 'sold'; });
    var q = _lstSearch.toLowerCase();
    var filtered = q ? all.filter(function (l) {
      return (l.address + ' ' + (l.city||'') + ' ' + (l.agent||'')).toLowerCase().indexOf(q) !== -1;
    }) : all;
    filtered.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });

    var sections = [
      { key: 'pre_listing', label: 'Pre-Listing' },
      { key: 'coming_soon', label: 'Coming Soon' },
      { key: 'active',      label: 'Active' },
      { key: 'pending',     label: 'Pending' }
    ];

    var rowsHtml = '';
    var totalShown = 0;
    sections.forEach(function (sec) {
      var items = filtered.filter(function (l) { return l.status === sec.key; });
      if (!items.length) return;
      totalShown += items.length;
      rowsHtml += sectionHd(sec.key, sec.label, items.length);
      items.forEach(function (l) { rowsHtml += listingRow(l); });
    });

    if (!totalShown) {
      rowsHtml = '<div class="dr-empty">' +
        '<svg viewBox="0 0 24 24" width="38" height="38"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>' +
        '<div class="dr-empty-title">' + (q ? 'No listings match' : 'No active listings') + '</div>' +
        '<div>' + (q ? 'Try a different search' : 'Add listings to see them here') + '</div>' +
      '</div>';
    }

    return '<div class="dr-panel dr-panel--listings">' +
      '<div class="dr-panel-accent"></div>' +
      '<div class="dr-panel-header">' +
        '<div class="dr-panel-title">' +
          '<div class="dr-panel-icon"><svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg></div>' +
          'Listings' +
          '<span class="dr-panel-count">' + all.length + '</span>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:8px">' +
          '<div class="dr-panel-search">' + SEARCH_ICON +
            '<input type="text" id="lstSearch" placeholder="Search…" value="' + escapeHtml(_lstSearch) + '">' +
          '</div>' +
          '<a href="deal-detail.html?action=new&from=dealRoom" class="dr-add-btn">+ Add Listing</a>' +
        '</div>' +
      '</div>' +
      rowsHtml +
    '</div>';
  }

  // ---- Escrow panel ----
  function renderEscrowsPanel(txns) {
    var all = txns.filter(function (t) { return t.status !== 'closed'; });
    var q = _txnSearch.toLowerCase();
    var filtered = q ? all.filter(function (t) {
      return (t.address + ' ' + (t.city||'') + ' ' + (t.agent||'')).toLowerCase().indexOf(q) !== -1;
    }) : all;
    // Sort by close date (earliest first), no close date at end
    filtered.sort(function (a, b) {
      if (!a.closeDate && !b.closeDate) return 0;
      if (!a.closeDate) return 1;
      if (!b.closeDate) return -1;
      return new Date(a.closeDate) - new Date(b.closeDate);
    });

    var sections = [
      { key: 'pending', label: 'Pending' },
      { key: 'active',  label: 'Active' }
    ];

    var rowsHtml = '';
    var totalShown = 0;
    sections.forEach(function (sec) {
      var items = filtered.filter(function (t) { return t.status === sec.key; });
      if (!items.length) return;
      totalShown += items.length;
      rowsHtml += sectionHd(sec.key, sec.label, items.length);
      items.forEach(function (t) { rowsHtml += escrowRow(t); });
    });

    if (!totalShown) {
      rowsHtml = '<div class="dr-empty">' +
        '<svg viewBox="0 0 24 24" width="38" height="38"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.89 2-2V5c0-1.1-.89-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/></svg>' +
        '<div class="dr-empty-title">' + (q ? 'No escrows match' : 'No active escrows') + '</div>' +
        '<div>' + (q ? 'Try a different search' : 'Add escrows to see them here') + '</div>' +
      '</div>';
    }

    return '<div class="dr-panel dr-panel--escrows">' +
      '<div class="dr-panel-accent"></div>' +
      '<div class="dr-panel-header">' +
        '<div class="dr-panel-title">' +
          '<div class="dr-panel-icon"><svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.89 2-2V5c0-1.1-.89-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/></svg></div>' +
          'Current Escrows' +
          '<span class="dr-panel-count">' + all.length + '</span>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:8px">' +
          '<div class="dr-panel-search">' + SEARCH_ICON +
            '<input type="text" id="txnSearch" placeholder="Search…" value="' + escapeHtml(_txnSearch) + '">' +
          '</div>' +
          '<a href="deal-detail-txn.html?action=new&from=dealRoom" class="dr-add-btn">+ Add Escrow</a>' +
        '</div>' +
      '</div>' +
      rowsHtml +
    '</div>';
  }

  // ---- Main Render ----
  function render() {
    loadTeamMembers();
    buildAgentLookups();
    refreshCurrentUserName();

    var allListings = Data.getListings();
    var allTxns     = Data.getTransactions();

    // Apply agent filter
    var listings = filterByAgent(allListings);
    var txns     = filterByAgent(allTxns);

    var activeLst = listings.filter(function (l) { return l.status === 'pre_listing' || l.status === 'coming_soon' || l.status === 'active'; });
    var activeTxn = txns.filter(function (t) { return t.status !== 'closed'; });

    var totalVol = activeLst.concat(activeTxn).reduce(function (s, d) { return s + (parseFloat(d.price) || 0); }, 0);
    var closingSoon = activeTxn.filter(function (t) {
      var n = daysUntil(t.closeDate);
      return n !== null && n >= 0 && n <= 30;
    }).length;

    var html = '';

    // Agent filter dropdown
    html += agentFilterHtml();

    // Stats strip
    html += '<div class="dr-stats-strip">';
    html += statTile('Pipeline Volume', '$' + Math.round(totalVol).toLocaleString(),
      'M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z', 'indigo');
    html += statTile('Active Listings', activeLst.length,
      'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z', 'blue');
    html += statTile('Active Escrows', activeTxn.length,
      'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.89 2-2V5c0-1.1-.89-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z', 'emerald');
    html += statTile('Closing in 30 Days', closingSoon,
      'M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z', 'amber');
    html += '</div>';

    // Two columns
    window._drAllListings = allListings; // shared for escrow spec lookup
    html += '<div class="dr-columns">';
    html += renderListingsPanel(listings);
    html += renderEscrowsPanel(txns);
    html += '</div>';

    pageBody.innerHTML = html;

    // Agent filter listener
    var agentFilter = document.getElementById('drAgentFilter');
    if (agentFilter) {
      agentFilter.addEventListener('change', function () {
        _selectedAgentId = this.value;
        render();
      });
    }

    // Search listeners
    var lstSearch = document.getElementById('lstSearch');
    if (lstSearch) {
      lstSearch.addEventListener('input', function () { _lstSearch = this.value; render(); });
      if (_lstSearch) lstSearch.setSelectionRange(_lstSearch.length, _lstSearch.length);
    }

    var txnSearch = document.getElementById('txnSearch');
    if (txnSearch) {
      txnSearch.addEventListener('input', function () { _txnSearch = this.value; render(); });
      if (_txnSearch) txnSearch.setSelectionRange(_txnSearch.length, _txnSearch.length);
    }

    // Click handler is attached globally below (outside render)
  }

  // ---- Open house event handlers (delegated) ----
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');
    var id = btn.getAttribute('data-id');

    if (action === 'dr-toggle-oh') {
      e.preventDefault();
      e.stopPropagation();
      var form = document.getElementById('dr-oh-form-' + id);
      if (form) {
        var opening = form.style.display === 'none';
        form.style.display = opening ? '' : 'none';
        if (opening) {
          var ag = document.getElementById('dr-oh-agent-' + id);
          var dt = document.getElementById('dr-oh-date-' + id);
          var tm = document.getElementById('dr-oh-time-' + id);
          if (ag) ag.value = '';
          if (dt) dt.value = '';
          if (tm) tm.value = '';
        }
      }
    }

    if (action === 'dr-save-oh') {
      e.preventDefault();
      e.stopPropagation();
      var agEl = document.getElementById('dr-oh-agent-' + id);
      var dtEl = document.getElementById('dr-oh-date-' + id);
      var tmEl = document.getElementById('dr-oh-time-' + id);
      if (!agEl || !dtEl || !agEl.value || !dtEl.value) {
        showToast('Please select an agent and date.', 'error');
        return;
      }
      var listing = Data.getListings().find(function (l) { return l.id === id; });
      var arr = listing && Array.isArray(listing.openHouses) ? listing.openHouses.slice() :
        (listing && listing.openHouse && listing.openHouse.date) ? [listing.openHouse] : [];
      if (arr.length >= 3) { showToast('Maximum 3 open houses.', 'error'); return; }
      var ohAgent = agEl.value;
      var ohDate = dtEl.value;
      var ohTime = tmEl ? tmEl.value : '';
      arr.push({ agent: ohAgent, date: ohDate, time: ohTime });
      Data.updateListing(id, { openHouses: arr, openHouse: null });
      showToast('Open house scheduled!');

      // Notify the assigned agent (if different from current user)
      var session = Auth.getSession();
      var currentName = session ? session.displayName : '';
      if (ohAgent && ohAgent !== currentName) {
        // In-app notification
        if (typeof addNotification === 'function') {
          addNotification({
            type: 'open_house',
            title: 'Open House Scheduled for You',
            detail: (listing ? listing.address : '') + ' — ' + ohDate + (ohTime ? ' at ' + ohTime : '') + ' (by ' + currentName + ')',
            linkPage: 'deal-room.html',
            linkId: id,
            targetUser: null // visible to all — agent sees it by name in detail
          });
        }
        // Email notification
        var users = JSON.parse(localStorage.getItem('reb_users') || '[]');
        var targetUser = users.find(function (u) { return u.displayName === ohAgent; });
        if (targetUser && targetUser.email) {
          fetch('/api/email/open-house', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (localStorage.getItem('reb_jwt') || '') },
            body: JSON.stringify({
              to: targetUser.email,
              agentName: ohAgent,
              scheduledBy: currentName,
              address: listing ? listing.address : '',
              date: ohDate,
              time: ohTime
            })
          }).catch(function (err) { (window.notifySyncError || console.error)('Open house email', err); });
        }
      }

      render();
    }

    if (action === 'dr-remove-oh') {
      e.preventDefault();
      e.stopPropagation();
      var idx = parseInt(btn.getAttribute('data-idx'));
      var lst = Data.getListings().find(function (l) { return l.id === id; });
      var ohArr = lst && Array.isArray(lst.openHouses) ? lst.openHouses.slice() :
        (lst && lst.openHouse && lst.openHouse.date) ? [lst.openHouse] : [];
      ohArr.splice(idx, 1);
      Data.updateListing(id, { openHouses: ohArr, openHouse: null });
      showToast('Open house removed.');
      render();
    }
  });

  // ---- Init ----
  render();

  // Force fresh data fetch to ensure statuses are up to date
  if (typeof API !== 'undefined' && API.isLoggedIn()) {
    Promise.all([
      API.getListings().then(function (d) {
        if (!d || !Array.isArray(d)) return;
        var mapped = d.map(function (l) {
          return { id: l.id, address: l.address, city: l.city || '', state: l.state || '', zip: l.zip || '',
            status: l.status, price: parseFloat(l.price) || 0, agent: l.agent_name, agentId: l.agent_id,
            beds: l.beds, baths: l.baths, sqft: l.sqft, description: l.description,
            source: l.source, listingDate: l.listing_date, propertyType: l.property_type || '',
            createdAt: l.created_at, updatedAt: l.updated_at || l.created_at };
        });
        localStorage.setItem('reb_listings', JSON.stringify(mapped));
      }).catch(function (err) { console.error('Deal room fetch listings failed:', err); }),
      API.getTransactions().then(function (d) {
        if (!d || !Array.isArray(d)) return;
        var mapped = d.map(function (t) {
          var meta = t.metadata || {};
          return { id: t.id, address: t.address, city: t.city, state: t.state, zip: t.zip,
            type: t.type, status: t.status, price: parseFloat(t.price) || 0,
            agent: t.agent_name, agentId: t.agent_id, source: t.source,
            closeDate: t.close_date, notes: t.notes,
            beds: t.beds || meta.beds || null, baths: t.baths || meta.baths || null,
            sqft: t.sqft || meta.sqft || null, metadata: meta, createdAt: t.created_at };
        });
        localStorage.setItem('reb_transactions', JSON.stringify(mapped));
      }).catch(function (err) { console.error('Deal room fetch transactions failed:', err); })
    ]).then(function () {
      _currentUser = (typeof API !== 'undefined' && API.getUser()) || null;
      _currentUserId = _currentUser ? _currentUser.id : null;
      _isPrivileged = (typeof API !== 'undefined' && API.isPrivileged()) || Auth.isPrivileged();
      render();
    });
  } else {
    // Not logged in via API — show message
    pageBody.innerHTML = '<div style="text-align:center;padding:40px;color:var(--gray-500)"><p>Please log out and log back in to refresh your data.</p><a href="login.html" style="color:var(--indigo);font-weight:600">Go to Login</a></div>';
  }

  document.addEventListener('apiBridgeReady', function () {
    _currentUser = (typeof API !== 'undefined' && API.getUser()) || null;
    _currentUserId = _currentUser ? _currentUser.id : null;
    _isPrivileged = (typeof API !== 'undefined' && API.isPrivileged()) || Auth.isPrivileged();
    render();
  });

  // Auto-refresh every 15 seconds to pick up changes from other computers
  setInterval(function () {
    if (typeof API === 'undefined' || !API.isLoggedIn()) return;
    if (document.hidden) return; // Don't poll when tab is in background
    Promise.all([
      API.getListings().then(function (d) {
        if (!d || !Array.isArray(d)) return;
        var mapped = d.map(function (l) {
          return { id: l.id, address: l.address, city: l.city || '', state: l.state || '', zip: l.zip || '',
            status: l.status, price: parseFloat(l.price) || 0, agent: l.agent_name, agentId: l.agent_id,
            beds: l.beds, baths: l.baths, sqft: l.sqft, description: l.description,
            source: l.source, listingDate: l.listing_date, propertyType: l.property_type || '',
            createdAt: l.created_at, updatedAt: l.updated_at || l.created_at };
        });
        localStorage.setItem('reb_listings', JSON.stringify(mapped));
      }).catch(function () {}),
      API.getTransactions().then(function (d) {
        if (!d || !Array.isArray(d)) return;
        var mapped = d.map(function (t) {
          var meta = t.metadata || {};
          return { id: t.id, address: t.address, city: t.city, state: t.state, zip: t.zip,
            type: t.type, status: t.status, price: parseFloat(t.price) || 0,
            agent: t.agent_name, agentId: t.agent_id, source: t.source,
            closeDate: t.close_date, notes: t.notes,
            beds: t.beds || meta.beds || null, baths: t.baths || meta.baths || null,
            sqft: t.sqft || meta.sqft || null, metadata: meta, createdAt: t.created_at };
        });
        localStorage.setItem('reb_transactions', JSON.stringify(mapped));
      }).catch(function () {})
    ]).then(function () { render(); });
  }, 15000);

})();
