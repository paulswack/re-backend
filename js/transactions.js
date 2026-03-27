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
    if (viewMode === 'detail' && selectedTxnId) {
      renderDetail();
    } else {
      renderList();
    }
  }

  // ============================================================
  //  LIST VIEW
  // ============================================================
  function renderList() {
    var txns = Data.getTransactions();
    var query = '';
    var statusVal = '';
    var agentVal = '';

    // Build stats
    var total = txns.length;
    var active = txns.filter(function (t) { return t.status === 'active'; }).length;
    var pending = txns.filter(function (t) { return t.status === 'pending'; }).length;
    var closed = txns.filter(function (t) { return t.status === 'closed'; }).length;
    var volume = txns.reduce(function (sum, t) { return sum + (parseFloat(t.price) || 0); }, 0);

    // Unique agents for filter
    var agentSet = {};
    txns.forEach(function (t) { if (t.agent) agentSet[t.agent] = true; });
    var agents = Object.keys(agentSet).sort();

    var html = '';

    // Page Header
    html += '<div class="page-header">' +
      '<div><h2>All Transactions</h2></div>' +
      '<button class="btn btn-primary btn-sm" data-action="add-txn">' +
        '<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>' +
        'Add Transaction' +
      '</button>' +
    '</div>';

    // Stat Cards
    html += '<div class="txn-stats-grid">';
    html += statCard('Total', total, 'indigo', '<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/>');
    html += statCard('Active', active, 'indigo', '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>');
    html += statCard('Pending', pending, 'amber', '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>');
    html += statCard('Closed', closed, 'emerald', '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>');
    html += statCard('Total Volume', Data.formatCurrency(volume), 'violet', '<path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>');
    html += '</div>';

    // Filter Bar
    html += '<div class="filter-bar">' +
      '<input type="text" id="searchInput" placeholder="Search by address or agent...">' +
      '<select id="statusFilter">' +
        '<option value="">All Statuses</option>' +
        '<option value="active">Active</option>' +
        '<option value="pending">Pending</option>' +
        '<option value="closed">Closed</option>' +
      '</select>' +
      '<select id="agentFilter">' +
        '<option value="">All Agents</option>' +
        agents.map(function (a) { return '<option value="' + escapeHtml(a) + '">' + escapeHtml(a) + '</option>'; }).join('') +
      '</select>' +
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
    document.getElementById('agentFilter').addEventListener('change', renderListRows);
  }

  function statCard(label, value, colorClass, svgPath) {
    return '<div class="stat-card">' +
      '<div class="stat-icon ' + colorClass + '"><svg viewBox="0 0 24 24">' + svgPath + '</svg></div>' +
      '<div><div class="stat-value">' + value + '</div><div class="stat-label">' + label + '</div></div>' +
    '</div>';
  }

  function renderListRows() {
    var txns = Data.getTransactions();
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
      'Back to Transactions' +
    '</button>';

    // Header Card
    html += '<div class="detail-header-card">';
    html += '<div class="detail-header-accent"></div>';
    html += '<div class="detail-header-body">';

    html += '<div class="detail-header-top">';
    html += '<div>' +
      '<div class="detail-header-address">' + escapeHtml(t.address) + '</div>' +
      '<div class="detail-header-price">' + Data.formatCurrencyFull(t.price) + '</div>' +
    '</div>';
    html += '<div class="detail-header-actions">' +
      '<span style="margin-right:4px;">' + Data.statusBadge(t.status) + '</span>' +
      '<button class="btn btn-outline btn-sm" data-action="edit-txn" data-id="' + t.id + '">Edit</button>' +
      '<button class="btn btn-danger btn-sm" data-action="delete-txn" data-id="' + t.id + '">Delete</button>' +
      '<button class="btn btn-outline btn-sm" data-action="share-client" data-id="' + t.id + '" style="color:var(--indigo);border-color:var(--indigo);">Share with Client</button>' +
    '</div>';
    html += '</div>';

    // Detail blocks row
    html += '<div class="detail-blocks-row">';
    html += '<div class="detail-block">' +
      '<div class="detail-block-label">Agent</div>' +
      '<div class="detail-block-value" style="display:flex;align-items:center;gap:6px;">' +
        '<div class="agent-avatar ' + agentClass(t.agent) + '" style="width:24px;height:24px;font-size:.55rem;">' + getInitials(t.agent) + '</div>' +
        escapeHtml(t.agent || '—') +
      '</div>' +
    '</div>';
    html += '<div class="detail-block">' +
      '<div class="detail-block-label">Status</div>' +
      '<div class="detail-block-value">' + Data.statusBadge(t.status) + '</div>' +
    '</div>';
    html += '<div class="detail-block">' +
      '<div class="detail-block-label">Close Date</div>' +
      '<div class="detail-block-value">' + Data.formatDate(t.closeDate) + '</div>' +
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

    // Buyer
    html += '<div class="party-section">';
    html += '<div class="party-label">Buyer</div>';
    if (buyer.name || buyer.phone || buyer.email) {
      if (buyer.name) html += '<div class="party-field"><div class="party-field-label">Name</div><div class="party-field-value">' + escapeHtml(buyer.name) + '</div></div>';
      if (buyer.phone) html += '<div class="party-field"><div class="party-field-label">Phone</div><div class="party-field-value">' + escapeHtml(buyer.phone) + '</div></div>';
      if (buyer.email) html += '<div class="party-field"><div class="party-field-label">Email</div><div class="party-field-value">' + escapeHtml(buyer.email) + '</div></div>';
      html += '<button class="party-edit-btn" data-action="edit-party" data-party="buyer">Edit Buyer</button>';
    } else {
      html += '<div class="party-empty">No buyer info added yet.</div>';
      html += '<button class="party-add-btn" data-action="edit-party" data-party="buyer">+ Add Buyer</button>';
    }
    html += '</div>';

    // Seller
    html += '<div class="party-section">';
    html += '<div class="party-label">Seller</div>';
    if (seller.name || seller.phone || seller.email) {
      if (seller.name) html += '<div class="party-field"><div class="party-field-label">Name</div><div class="party-field-value">' + escapeHtml(seller.name) + '</div></div>';
      if (seller.phone) html += '<div class="party-field"><div class="party-field-label">Phone</div><div class="party-field-value">' + escapeHtml(seller.phone) + '</div></div>';
      if (seller.email) html += '<div class="party-field"><div class="party-field-label">Email</div><div class="party-field-value">' + escapeHtml(seller.email) + '</div></div>';
      html += '<button class="party-edit-btn" data-action="edit-party" data-party="seller">Edit Seller</button>';
    } else {
      html += '<div class="party-empty">No seller info added yet.</div>';
      html += '<button class="party-add-btn" data-action="edit-party" data-party="seller">+ Add Seller</button>';
    }
    html += '</div>';

    html += '</div>'; // parties-grid
    html += '</div>'; // parties-card

    // Two-column layout
    html += '<div class="detail-columns">';

    // LEFT: Notes
    html += '<div>';
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
    html += '</div>'; // notes-card
    html += '</div>'; // left col

    // RIGHT: Tasks + Appointments
    html += '<div>';

    // Add Task Card
    html += '<div class="side-card">';
    html += '<div class="side-card-header amber">Add Task</div>';
    html += '<div class="side-card-body">';
    html += '<div class="form-group"><label for="taskTitle">Title</label><input type="text" id="taskTitle" placeholder="Task title..."></div>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label for="taskPriority">Priority</label><select id="taskPriority"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>';
    html += '<div class="form-group"><label for="taskDue">Due Date</label><input type="date" id="taskDue"></div>';
    html += '</div>';
    html += '<div class="form-group"><label for="taskAssignee">Assignee</label><select id="taskAssignee"><option value="">Unassigned</option>' + userOptions + '</select></div>';
    html += '<button class="btn btn-primary btn-sm" data-action="add-task" style="width:100%;">Add Task</button>';
    html += '</div></div>';

    // Add Appointment Card
    html += '<div class="side-card">';
    html += '<div class="side-card-header emerald">Add Appointment</div>';
    html += '<div class="side-card-body">';
    html += '<div class="form-group"><label for="apptTitle">Title</label><input type="text" id="apptTitle" placeholder="Appointment title..."></div>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label for="apptDate">Date</label><input type="date" id="apptDate"></div>';
    html += '<div class="form-group"><label for="apptTime">Time</label><input type="time" id="apptTime"></div>';
    html += '</div>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label for="apptCategory">Category</label><select id="apptCategory"><option value="showing">Showing</option><option value="inspection">Inspection</option><option value="appraisal">Appraisal</option><option value="closing">Closing</option><option value="meeting">Meeting</option><option value="other">Other</option></select></div>';
    html += '<div class="form-group"><label for="apptLocation">Location</label><input type="text" id="apptLocation" placeholder="Location..."></div>';
    html += '</div>';
    html += '<button class="btn btn-primary btn-sm" data-action="add-appointment" style="width:100%;">Add to Calendar</button>';
    html += '</div></div>';

    // Pending Tasks List
    html += '<div class="side-card">';
    html += '<div class="side-list-header">Pending Tasks (' + pendingTasks.length + ')</div>';
    if (pendingTasks.length === 0) {
      html += '<div class="side-list-empty">No pending tasks.</div>';
    } else {
      pendingTasks.forEach(function (task) {
        html += '<div class="side-list-item">' +
          '<input type="checkbox" data-action="toggle-task" data-task-id="' + task.id + '">' +
          '<span class="side-list-title">' + escapeHtml(task.title) + '</span>' +
          Data.priorityBadge(task.priority) +
          (task.dueDate ? '<span class="side-list-meta">' + Data.formatDate(task.dueDate) + '</span>' : '') +
        '</div>';
      });
    }
    if (doneTasks.length > 0) {
      html += '<div class="side-list-header" style="font-size:.72rem;color:var(--gray-400);">Completed (' + doneTasks.length + ')</div>';
      doneTasks.forEach(function (task) {
        html += '<div class="side-list-item">' +
          '<input type="checkbox" checked data-action="toggle-task" data-task-id="' + task.id + '">' +
          '<span class="side-list-title side-list-done">' + escapeHtml(task.title) + '</span>' +
        '</div>';
      });
    }
    html += '</div>';

    // Upcoming Appointments List
    html += '<div class="side-card">';
    html += '<div class="side-list-header">Upcoming Appointments (' + upcomingAppts.length + ')</div>';
    if (upcomingAppts.length === 0) {
      html += '<div class="side-list-empty">No upcoming appointments.</div>';
    } else {
      upcomingAppts.forEach(function (ev) {
        var catColors = {
          showing: 'var(--indigo)', inspection: 'var(--amber)', appraisal: 'var(--violet)',
          closing: 'var(--emerald)', meeting: 'var(--rose)', other: 'var(--gray-500)'
        };
        var dotColor = catColors[ev.category] || 'var(--gray-400)';
        html += '<div class="side-list-item">' +
          '<span style="width:8px;height:8px;border-radius:50%;background:' + dotColor + ';flex-shrink:0;"></span>' +
          '<span class="side-list-title">' + escapeHtml(ev.title) + '</span>' +
          '<span class="side-list-meta">' + Data.formatDate(ev.date) +
            (ev.startTime ? ' ' + formatTime(ev.startTime) : '') +
          '</span>' +
        '</div>';
      });
    }
    html += '</div>';

    html += '</div>'; // right col
    html += '</div>'; // detail-columns

    pageBody.innerHTML = html;
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
        modalTitle.textContent = 'Add Transaction';
        txnForm.reset();
        populateAgentSelect(document.getElementById('txnAgent'), '');
        openModal(txnModal);
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
        openEditModal(target.getAttribute('data-id'));
        break;

      case 'delete-txn':
        if (confirm('Delete this transaction? This cannot be undone.')) {
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

      case 'share-client':
        showToast('Client portal sharing coming soon.', 'info');
        break;

      case 'edit-party':
        editingPartyType = target.getAttribute('data-party');
        openPartyModal(editingPartyType);
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
      modalTitle.textContent = 'Add Transaction';
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
    modalTitle.textContent = 'Edit Transaction';

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
      showToast('Transaction updated successfully.');
    } else {
      var result = Data.addTransaction(data);
      txnId = result.id;
      showToast('Transaction added successfully.');
    }

    // Save buyer/seller parties
    var buyerName = document.getElementById('txnBuyerName').value.trim();
    var buyerPhone = document.getElementById('txnBuyerPhone').value.trim();
    var buyerEmail = document.getElementById('txnBuyerEmail').value.trim();
    var sellerName = document.getElementById('txnSellerName').value.trim();
    var sellerPhone = document.getElementById('txnSellerPhone').value.trim();
    var sellerEmail = document.getElementById('txnSellerEmail').value.trim();

    if (buyerName || buyerPhone || buyerEmail || sellerName || sellerPhone || sellerEmail) {
      var parties = getParties();
      if (!parties[txnId]) parties[txnId] = { buyer: {}, seller: {} };
      parties[txnId].buyer = { name: buyerName, phone: buyerPhone, email: buyerEmail };
      parties[txnId].seller = { name: sellerName, phone: sellerPhone, email: sellerEmail };
      saveParties(parties);
    }

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
    partyModalTitle.textContent = 'Edit ' + (type === 'buyer' ? 'Buyer' : 'Seller');

    var parties = getParties();
    var txnParties = parties[selectedTxnId] || { buyer: {}, seller: {} };
    var data = txnParties[type] || {};

    document.getElementById('partyName').value = data.name || '';
    document.getElementById('partyPhone').value = data.phone || '';
    document.getElementById('partyEmail').value = data.email || '';

    openModal(partyModal);
  }

  function saveParty() {
    var name = document.getElementById('partyName').value.trim();
    var phone = document.getElementById('partyPhone').value.trim();
    var email = document.getElementById('partyEmail').value.trim();

    var parties = getParties();
    if (!parties[selectedTxnId]) parties[selectedTxnId] = { buyer: {}, seller: {} };
    parties[selectedTxnId][editingPartyType] = { name: name, phone: phone, email: email };
    saveParties(parties);

    showToast((editingPartyType === 'buyer' ? 'Buyer' : 'Seller') + ' info updated.');
    closeModal(partyModal);
    renderDetail();
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
  //  INIT
  // ============================================================
  render();

})();
