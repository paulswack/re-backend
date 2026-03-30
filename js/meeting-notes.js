/* ============================================================
   RE Back Office — Monthly Meeting 1-1 Page
   Full-page list, detail, and form views
   ============================================================ */

(function () {
  'use strict';

  Auth.requireAuth();
  populateSidebarUser();
  setActiveNav();
  initSidebarToggle();
  applyPageColor('meetingNotes');

  document.getElementById('logoutBtn').addEventListener('click', function () {
    Auth.logout();
  });

  var PREFIX = 'reb_';
  var STORAGE_KEY = PREFIX + 'meeting_notes';
  var pageBody = document.getElementById('pageBody');
  var session = Auth.getSession();
  var privileged = Auth.isPrivileged();

  // ---- State ----
  var viewMode = 'list';
  var selectedNoteId = null;
  var editingId = null;
  var filterAgent = 'all';

  // ---- Helpers ----
  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function generateId() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
  }

  function getUsers() {
    try { return JSON.parse(localStorage.getItem(PREFIX + 'users') || '[]'); } catch (e) { return []; }
  }

  function getNotes() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch (e) { return []; }
  }

  function saveNotes(notes) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  // Migrate old text-based actionItems to array format
  function migrateActionItems(note) {
    if (typeof note.actionItems === 'string') {
      var items = [];
      note.actionItems.split('\n').forEach(function (line) {
        line = line.trim();
        if (line.indexOf('-') === 0 && line.length > 1) {
          items.push({ id: generateId(), label: line.substring(1).trim(), completed: false, completedBy: null, completedAt: null });
        }
      });
      note.actionItems = items;
    }
    if (!Array.isArray(note.actionItems)) note.actionItems = [];
    return note;
  }

  function getActionStats(note) {
    var items = note.actionItems || [];
    var total = items.length;
    var done = items.filter(function (i) { return i.completed; }).length;
    return { total: total, done: done };
  }

  // ---- Seed Data ----
  function seedData() {
    if (localStorage.getItem(STORAGE_KEY)) return;
    var seed = [
      {
        id: 'mn-001', agentUsername: 'agent1', agentName: 'Marcus Rivera', date: '2026-03-25',
        notes: 'Discussed Q1 performance. Marcus closed 2 deals this quarter totaling $935K in volume. He exceeded his contact goal by 15%. We reviewed his pipeline and identified 3 strong leads that could close in Q2. Talked about improving follow-up cadence with warm leads from open houses.',
        actionItems: [
          { id: 'ai-001', label: 'Follow up on 3 warm leads from the Balcones open house', completed: true, completedBy: 'Marcus Rivera', completedAt: '2026-03-27T09:00:00Z' },
          { id: 'ai-002', label: 'Schedule 2 listing appointments by end of week', completed: false, completedBy: null, completedAt: null },
          { id: 'ai-003', label: 'Complete advanced negotiation training module', completed: false, completedBy: null, completedAt: null },
          { id: 'ai-004', label: 'Update CRM notes for all active prospects', completed: true, completedBy: 'Marcus Rivera', completedAt: '2026-03-26T16:00:00Z' }
        ],
        createdBy: 'admin', createdByName: 'Jennifer Walsh', createdAt: '2026-03-25T10:30:00Z'
      },
      {
        id: 'mn-002', agentUsername: 'agent2', agentName: 'Sarah Chen', date: '2026-03-27',
        notes: 'Reviewed listing strategy for Q2. Sarah has 2 active listings and wants to add 3 more by end of April. We discussed pricing strategies for the South Austin market which has seen a 4% price increase this quarter. Also talked about leveraging her condo expertise for the downtown market.',
        actionItems: [
          { id: 'ai-010', label: 'Prepare CMAs for 2 potential listing appointments', completed: false, completedBy: null, completedAt: null },
          { id: 'ai-011', label: 'Schedule open house for 10204 Wommack Rd', completed: true, completedBy: 'Sarah Chen', completedAt: '2026-03-28T11:00:00Z' },
          { id: 'ai-012', label: 'Draft social media content plan for April', completed: false, completedBy: null, completedAt: null },
          { id: 'ai-013', label: 'Connect with relocation department for buyer referrals', completed: false, completedBy: null, completedAt: null }
        ],
        createdBy: 'admin', createdByName: 'Jennifer Walsh', createdAt: '2026-03-27T14:00:00Z'
      }
    ];
    saveNotes(seed);
  }
  seedData();

  // ---- Main Render ----
  function render() {
    if (viewMode === 'form') { renderForm(); }
    else if (viewMode === 'detail' && selectedNoteId) { renderDetail(); }
    else { renderList(); }
  }

  // ============================================================
  //  LIST VIEW
  // ============================================================
  function renderList() {
    var notes = getNotes().map(migrateActionItems);
    var users = getUsers();

    var visibleNotes;
    if (privileged) {
      visibleNotes = filterAgent === 'all' ? notes : notes.filter(function (n) { return n.agentUsername === filterAgent; });
    } else {
      visibleNotes = notes.filter(function (n) { return n.agentUsername === session.username; });
    }
    visibleNotes.sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });

    var html = '';

    // Page header
    html += '<div class="page-header">';
    html += '<div><h2>Monthly 1-on-1 Meetings</h2></div>';
    if (privileged) {
      html += '<button class="btn btn-primary btn-sm" data-action="add-note">' +
        '<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>' +
        'Add Meeting</button>';
    }
    html += '</div>';

    // Stat cards
    var totalActions = visibleNotes.reduce(function (s, n) { var st = getActionStats(n); return s + st.total; }, 0);
    var doneActions = visibleNotes.reduce(function (s, n) { var st = getActionStats(n); return s + st.done; }, 0);
    var pendingActions = totalActions - doneActions;

    html += '<div class="stats-grid" style="margin-bottom:20px">';
    html += '<div class="stat-card"><div class="stat-icon navy"><svg viewBox="0 0 24 24"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg></div><div><div class="stat-value">' + visibleNotes.length + '</div><div class="stat-label">Meetings</div></div></div>';
    html += '<div class="stat-card"><div class="stat-icon green"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div><div><div class="stat-value">' + doneActions + '/' + totalActions + '</div><div class="stat-label">Items Complete</div></div></div>';
    html += '<div class="stat-card"><div class="stat-icon amber"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg></div><div><div class="stat-value">' + pendingActions + '</div><div class="stat-label">Items Pending</div></div></div>';
    html += '</div>';

    // Filter
    if (privileged) {
      html += '<div class="filter-bar">';
      html += '<input type="text" id="searchInput" placeholder="Search notes...">';
      html += '<select id="agentFilter"><option value="all">All Agents</option>';
      users.forEach(function (u) {
        if (u.role === 'Team Lead') return;
        html += '<option value="' + escapeHtml(u.username) + '"' + (filterAgent === u.username ? ' selected' : '') + '>' + escapeHtml(u.displayName) + '</option>';
      });
      html += '</select></div>';
    }

    if (visibleNotes.length === 0) {
      html += '<div class="card" style="padding:60px 24px;text-align:center">';
      html += '<svg viewBox="0 0 24 24" width="48" height="48" fill="var(--gray-200)" style="margin-bottom:16px"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>';
      html += '<h3 style="color:var(--gray-700);margin-bottom:4px">No meetings yet</h3>';
      html += '<p style="color:var(--gray-400);font-size:.88rem">' + (privileged ? 'Click "Add Meeting" to schedule your first 1-on-1.' : 'No meeting notes have been added yet.') + '</p>';
      html += '</div>';
    } else {
      // Group by agent
      var agentGroups = {};
      visibleNotes.forEach(function (n) {
        var key = n.agentUsername || 'unknown';
        if (!agentGroups[key]) agentGroups[key] = { name: n.agentName, notes: [] };
        agentGroups[key].notes.push(n);
      });

      Object.keys(agentGroups).sort(function (a, b) {
        return agentGroups[b].notes.length - agentGroups[a].notes.length;
      }).forEach(function (agentKey) {
        var group = agentGroups[agentKey];
        var cls = agentClass(group.name);
        var agentTotalItems = 0;
        var agentDoneItems = 0;
        group.notes.forEach(function (n) { var st = getActionStats(n); agentTotalItems += st.total; agentDoneItems += st.done; });
        var agentPct = agentTotalItems > 0 ? Math.round((agentDoneItems / agentTotalItems) * 100) : 0;

        html += '<div class="lb-card" style="margin-bottom:20px">';

        // Agent header with progress
        html += '<div style="padding:18px 24px;border-bottom:1px solid var(--gray-100);display:flex;align-items:center;gap:14px">';
        html += '<div class="agent-avatar ' + cls + '" style="width:42px;height:42px;font-size:.8rem">' + getInitials(group.name) + '</div>';
        html += '<div style="flex:1">';
        html += '<div style="font-size:1rem;font-weight:700;color:var(--gray-900)">' + escapeHtml(group.name) + '</div>';
        html += '<div style="font-size:.78rem;color:var(--gray-400)">' + group.notes.length + ' meeting' + (group.notes.length !== 1 ? 's' : '') + '</div>';
        html += '</div>';
        // Action item progress
        html += '<div style="text-align:right">';
        html += '<div style="font-size:.88rem;font-weight:700;color:' + (agentPct === 100 ? 'var(--emerald)' : 'var(--gray-800)') + '">' + agentDoneItems + '/' + agentTotalItems + '</div>';
        html += '<div style="font-size:.68rem;color:var(--gray-400)">items done</div>';
        html += '</div>';
        html += '</div>';

        // Progress bar
        html += '<div style="height:3px;background:var(--gray-100)"><div style="height:100%;width:' + agentPct + '%;background:var(--emerald);transition:width .3s"></div></div>';

        // Note rows
        group.notes.forEach(function (note) {
          var st = getActionStats(note);
          html += '<div class="list-row" data-action="open-detail" data-id="' + note.id + '" style="padding:14px 24px;gap:12px">';
          html += '<div style="width:48px;text-align:center;flex-shrink:0">';
          var dateParts = Data.formatDate(note.date).split(' ');
          html += '<div style="font-size:.68rem;font-weight:700;color:var(--indigo);text-transform:uppercase">' + (dateParts[0] || '') + '</div>';
          html += '<div style="font-size:1.1rem;font-weight:800;color:var(--gray-800);line-height:1">' + (dateParts[1] ? dateParts[1].replace(',', '') : '') + '</div>';
          html += '</div>';
          html += '<div style="flex:1;min-width:0">';
          var preview = note.notes ? note.notes.substring(0, 90) : '';
          if (note.notes && note.notes.length > 90) preview += '...';
          html += '<div style="font-size:.85rem;color:var(--gray-700);margin-bottom:4px">' + escapeHtml(preview) + '</div>';
          // Action items mini progress
          if (st.total > 0) {
            html += '<div style="display:flex;align-items:center;gap:8px">';
            html += '<div style="flex:0 0 60px;height:4px;background:var(--gray-100);border-radius:4px"><div style="height:100%;width:' + (st.total > 0 ? Math.round((st.done / st.total) * 100) : 0) + '%;background:var(--emerald);border-radius:4px"></div></div>';
            html += '<span style="font-size:.7rem;color:' + (st.done === st.total ? 'var(--emerald)' : 'var(--gray-400)') + ';font-weight:600">' + st.done + '/' + st.total + '</span>';
            html += '</div>';
          }
          html += '</div>';
          html += '<svg viewBox="0 0 24 24" width="18" height="18" fill="var(--gray-300)" style="flex-shrink:0"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>';
          html += '</div>';
        });

        html += '</div>';
      });
    }

    pageBody.innerHTML = html;

    var agentFilterEl = document.getElementById('agentFilter');
    if (agentFilterEl) agentFilterEl.addEventListener('change', function () { filterAgent = this.value; render(); });
    var searchEl = document.getElementById('searchInput');
    if (searchEl) searchEl.addEventListener('input', function () {
      var q = this.value.toLowerCase();
      var cards = pageBody.querySelectorAll('.lb-card');
      cards.forEach(function (card) { card.style.display = card.textContent.toLowerCase().indexOf(q) > -1 ? '' : 'none'; });
    });
  }

  // ============================================================
  //  DETAIL VIEW
  // ============================================================
  function renderDetail() {
    var notes = getNotes();
    var note = notes.find(function (n) { return n.id === selectedNoteId; });
    if (!note) { viewMode = 'list'; render(); return; }
    note = migrateActionItems(note);

    var cls = agentClass(note.agentName);
    var st = getActionStats(note);

    var html = '';

    html += '<button class="btn btn-outline btn-sm" data-action="back-to-list" style="margin-bottom:16px;display:inline-flex;align-items:center;gap:6px">' +
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>All Meetings</button>';

    // Header
    html += '<div class="lb-card" style="margin-bottom:20px">';
    html += '<div style="padding:24px 28px;display:flex;align-items:center;gap:18px;flex-wrap:wrap">';
    html += '<div class="agent-avatar ' + cls + '" style="width:60px;height:60px;font-size:1.2rem">' + getInitials(note.agentName) + '</div>';
    html += '<div style="flex:1;min-width:0">';
    html += '<div style="font-size:1.25rem;font-weight:800;color:var(--gray-900)">' + escapeHtml(note.agentName) + '</div>';
    html += '<div style="font-size:.85rem;color:var(--gray-500);margin-top:2px">' + Data.formatDate(note.date) + ' &middot; by ' + escapeHtml(note.createdByName || 'Team Lead') + '</div>';
    html += '</div>';
    if (privileged) {
      html += '<div style="display:flex;gap:8px">';
      html += '<button class="btn btn-outline btn-sm" data-action="edit-note" data-id="' + note.id + '">Edit</button>';
      html += '<button class="btn btn-outline btn-sm" data-action="delete-note" data-id="' + note.id + '" style="color:var(--rose);border-color:var(--gray-200)">Delete</button>';
      html += '</div>';
    }
    html += '</div></div>';

    // Notes
    html += '<div class="lb-card" style="margin-bottom:20px">';
    html += '<div style="padding:18px 24px;border-bottom:1px solid var(--gray-100);display:flex;align-items:center;gap:10px">';
    html += '<svg viewBox="0 0 24 24" width="18" height="18" fill="var(--emerald)"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/></svg>';
    html += '<span style="font-size:.9rem;font-weight:700;color:var(--gray-800)">Discussion Notes</span></div>';
    html += '<div style="padding:20px 28px;font-size:.92rem;color:var(--gray-700);line-height:1.75;white-space:pre-wrap">' + escapeHtml(note.notes) + '</div>';
    html += '</div>';

    // Action Items — interactive checkboxes
    html += '<div class="lb-card" style="margin-bottom:20px">';
    html += '<div style="padding:18px 24px;border-bottom:1px solid var(--gray-100);display:flex;align-items:center;justify-content:space-between">';
    html += '<div style="display:flex;align-items:center;gap:10px">';
    html += '<svg viewBox="0 0 24 24" width="18" height="18" fill="var(--violet)"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/></svg>';
    html += '<span style="font-size:.9rem;font-weight:700;color:var(--gray-800)">Action Items</span></div>';
    if (st.total > 0) html += '<span style="font-size:.78rem;font-weight:600;color:' + (st.done === st.total ? 'var(--emerald)' : 'var(--violet)') + '">' + st.done + '/' + st.total + ' complete</span>';
    html += '</div>';

    // Progress bar
    if (st.total > 0) {
      var pct = Math.round((st.done / st.total) * 100);
      html += '<div style="height:3px;background:var(--gray-100)"><div style="height:100%;width:' + pct + '%;background:var(--emerald);transition:width .3s"></div></div>';
    }

    // Items
    if (note.actionItems.length > 0) {
      note.actionItems.forEach(function (item, idx) {
        html += '<div style="padding:12px 24px;border-bottom:1px solid var(--gray-50);display:flex;align-items:flex-start;gap:12px">';
        html += '<input type="checkbox" data-action="toggle-action" data-note-id="' + note.id + '" data-item-idx="' + idx + '"' + (item.completed ? ' checked' : '') + ' style="width:20px;height:20px;cursor:pointer;accent-color:var(--emerald);flex-shrink:0;margin-top:2px">';
        html += '<div style="flex:1;min-width:0">';
        html += '<div style="font-size:.88rem;' + (item.completed ? 'color:var(--gray-400);text-decoration:line-through' : 'color:var(--gray-800)') + '">' + escapeHtml(item.label) + '</div>';
        if (item.completed && item.completedBy) {
          html += '<div style="font-size:.7rem;color:var(--gray-300);margin-top:2px">' + escapeHtml(item.completedBy) + ' · ' + Data.formatDate(item.completedAt) + '</div>';
        }
        html += '</div></div>';
      });
    }

    // Add item input
    html += '<div style="padding:12px 24px;display:flex;gap:10px;align-items:center">';
    html += '<div style="width:20px;height:20px;border-radius:6px;border:2px dashed var(--gray-200);flex-shrink:0"></div>';
    html += '<input type="text" id="newActionItem" placeholder="Add an action item..." style="flex:1;border:none;outline:none;font-size:.88rem;color:var(--gray-700);padding:4px 0">';
    html += '<button class="btn btn-primary btn-sm" data-action="add-action-item" data-note-id="' + note.id + '" style="padding:6px 14px;font-size:.78rem">Add</button>';
    html += '</div>';

    html += '</div>';

    pageBody.innerHTML = html;

    // Enter key on add item input
    var newItemInput = document.getElementById('newActionItem');
    if (newItemInput) {
      newItemInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          addActionItem(note.id);
        }
      });
    }
  }

  // ============================================================
  //  FORM VIEW
  // ============================================================
  function renderForm() {
    var isEdit = !!editingId;
    var note = isEdit ? migrateActionItems(getNotes().find(function (n) { return n.id === editingId; }) || {}) : null;
    var users = getUsers();
    var agents = users.filter(function (u) { return u.role !== 'Team Lead'; });

    var html = '';

    html += '<button class="btn btn-outline btn-sm" data-action="form-cancel" style="margin-bottom:16px;display:inline-flex;align-items:center;gap:6px">' +
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>' +
      (isEdit ? 'Back to Note' : 'All Meetings') + '</button>';

    html += '<div style="max-width:720px">';
    html += '<h2 style="font-size:1.3rem;font-weight:800;color:var(--gray-900);margin-bottom:24px">' + (isEdit ? 'Edit Meeting' : 'New Meeting') + '</h2>';

    // Meeting Details
    html += '<div class="card" style="padding:0;overflow:hidden;margin-bottom:20px">';
    html += '<div style="padding:14px 20px;background:var(--indigo-light);border-bottom:1px solid rgba(99,102,241,.1);display:flex;align-items:center;gap:10px">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="var(--indigo)"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>';
    html += '<span style="font-size:.92rem;font-weight:700;color:var(--indigo)">Meeting Details</span></div>';
    html += '<div style="padding:20px 24px">';
    html += '<div class="form-row" style="grid-template-columns:1fr 1fr">';
    html += '<div class="form-group"><label>Agent *</label><select id="fAgent" style="padding:12px 16px"><option value="">Select agent...</option>';
    agents.forEach(function (u) {
      var sel = note && note.agentUsername === u.username ? ' selected' : '';
      html += '<option value="' + escapeHtml(u.username) + '"' + sel + '>' + escapeHtml(u.displayName) + '</option>';
    });
    html += '</select></div>';
    html += '<div class="form-group"><label>Date *</label><input type="date" id="fDate" value="' + (note ? note.date : todayStr()) + '" style="padding:12px 16px"></div>';
    html += '</div></div></div>';

    // Notes
    html += '<div class="card" style="padding:0;overflow:hidden;margin-bottom:20px">';
    html += '<div style="padding:14px 20px;background:var(--emerald-light);border-bottom:1px solid rgba(16,185,129,.1);display:flex;align-items:center;gap:10px">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="var(--emerald)"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/></svg>';
    html += '<span style="font-size:.92rem;font-weight:700;color:var(--emerald)">Discussion Notes</span></div>';
    html += '<div style="padding:20px 24px">';
    html += '<div class="form-group"><textarea id="fNotes" rows="8" placeholder="What did you discuss? Key takeaways, performance feedback, goals..." style="padding:12px 16px;font-size:.92rem;line-height:1.6">' + escapeHtml(note ? note.notes : '') + '</textarea></div>';
    html += '</div></div>';

    // Action Items — add individually
    html += '<div class="card" style="padding:0;overflow:hidden;margin-bottom:20px">';
    html += '<div style="padding:14px 20px;background:#F5F3FF;border-bottom:1px solid rgba(139,92,246,.1);display:flex;align-items:center;gap:10px">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="var(--violet)"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/></svg>';
    html += '<span style="font-size:.92rem;font-weight:700;color:var(--violet)">Action Items</span></div>';
    html += '<div style="padding:16px 24px" id="formActionItems">';

    // Existing items (if editing)
    var existingItems = (note && note.actionItems) ? note.actionItems : [];
    existingItems.forEach(function (item, idx) {
      html += '<div class="form-action-row" style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--gray-50)">';
      html += '<div style="width:20px;height:20px;border-radius:6px;border:2px solid var(--gray-300);flex-shrink:0"></div>';
      html += '<input type="text" class="form-action-input" value="' + escapeHtml(item.label) + '" style="flex:1;border:none;outline:none;font-size:.88rem;color:var(--gray-700);padding:6px 0">';
      html += '<button type="button" class="form-action-remove" data-idx="' + idx + '" style="background:none;border:none;color:var(--gray-300);cursor:pointer;font-size:1.1rem;padding:4px" title="Remove">&times;</button>';
      html += '</div>';
    });

    // Add new item row
    html += '<div style="display:flex;align-items:center;gap:10px;padding:10px 0">';
    html += '<div style="width:20px;height:20px;border-radius:6px;border:2px dashed var(--gray-200);flex-shrink:0"></div>';
    html += '<input type="text" id="fNewAction" placeholder="Type an action item and press Enter..." style="flex:1;border:none;outline:none;font-size:.88rem;color:var(--gray-700);padding:6px 0">';
    html += '<button type="button" class="btn btn-outline btn-sm" data-action="form-add-action" style="padding:4px 12px;font-size:.78rem">Add</button>';
    html += '</div>';

    html += '</div></div>';

    // Save / Cancel
    html += '<div style="display:flex;gap:12px;margin-bottom:40px">';
    html += '<button class="btn btn-primary btn-lg" data-action="form-save" style="padding:14px 32px;font-size:.95rem">' + (isEdit ? 'Save Changes' : 'Create Meeting') + '</button>';
    html += '<button class="btn btn-outline btn-lg" data-action="form-cancel" style="padding:14px 32px;font-size:.95rem">Cancel</button>';
    html += '</div>';

    html += '</div>';

    pageBody.innerHTML = html;

    // Wire up add action on Enter
    var newActionInput = document.getElementById('fNewAction');
    if (newActionInput) {
      newActionInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); addFormAction(); }
      });
    }

    // Wire up remove buttons
    pageBody.querySelectorAll('.form-action-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var row = this.closest('.form-action-row');
        if (row) row.remove();
      });
    });
  }

  function addFormAction() {
    var input = document.getElementById('fNewAction');
    if (!input || !input.value.trim()) return;
    var container = document.getElementById('formActionItems');
    var addRow = input.closest('div');
    var newRow = document.createElement('div');
    newRow.className = 'form-action-row';
    newRow.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--gray-50)';
    newRow.innerHTML = '<div style="width:20px;height:20px;border-radius:6px;border:2px solid var(--gray-300);flex-shrink:0"></div>' +
      '<input type="text" class="form-action-input" value="' + escapeHtml(input.value.trim()) + '" style="flex:1;border:none;outline:none;font-size:.88rem;color:var(--gray-700);padding:6px 0">' +
      '<button type="button" class="form-action-remove" style="background:none;border:none;color:var(--gray-300);cursor:pointer;font-size:1.1rem;padding:4px" title="Remove">&times;</button>';
    container.insertBefore(newRow, addRow);
    newRow.querySelector('.form-action-remove').addEventListener('click', function () { newRow.remove(); });
    input.value = '';
    input.focus();
  }

  function addActionItem(noteId) {
    var input = document.getElementById('newActionItem');
    if (!input || !input.value.trim()) return;
    var notes = getNotes();
    var note = notes.find(function (n) { return n.id === noteId; });
    if (!note) return;
    note = migrateActionItems(note);
    note.actionItems.push({ id: generateId(), label: input.value.trim(), completed: false, completedBy: null, completedAt: null });
    saveNotes(notes);
    renderDetail();
  }

  // ============================================================
  //  EVENT DELEGATION
  // ============================================================
  document.addEventListener('click', function (e) {
    var target = e.target.closest('[data-action]');
    if (!target) return;
    var action = target.getAttribute('data-action');

    switch (action) {
      case 'add-note':
        editingId = null;
        viewMode = 'form';
        render();
        break;

      case 'open-detail':
        selectedNoteId = target.getAttribute('data-id');
        viewMode = 'detail';
        render();
        break;

      case 'back-to-list':
        viewMode = 'list';
        selectedNoteId = null;
        render();
        break;

      case 'edit-note':
        editingId = target.getAttribute('data-id');
        viewMode = 'form';
        render();
        break;

      case 'delete-note':
        if (confirm('Delete this meeting note?')) {
          var notes = getNotes();
          saveNotes(notes.filter(function (n) { return n.id !== target.getAttribute('data-id'); }));
          showToast('Meeting note deleted.');
          viewMode = 'list';
          selectedNoteId = null;
          render();
        }
        break;

      case 'form-cancel':
        if (editingId) {
          viewMode = 'detail';
          selectedNoteId = editingId;
          editingId = null;
        } else {
          viewMode = 'list';
        }
        render();
        break;

      case 'form-add-action':
        addFormAction();
        break;

      case 'form-save':
        var fAgent = (document.getElementById('fAgent') || {}).value;
        var fDate = (document.getElementById('fDate') || {}).value;
        var fNotes = (document.getElementById('fNotes') || {}).value.trim();
        if (!fAgent) { showToast('Please select an agent.', 'error'); break; }
        if (!fDate) { showToast('Please select a date.', 'error'); break; }
        if (!fNotes) { showToast('Please enter meeting notes.', 'error'); break; }

        // Collect action items from form
        var fActionItems = [];
        document.querySelectorAll('.form-action-input').forEach(function (inp) {
          var label = inp.value.trim();
          if (label) fActionItems.push({ id: generateId(), label: label, completed: false, completedBy: null, completedAt: null });
        });

        var users = getUsers();
        var agentUser = users.find(function (u) { return u.username === fAgent; });
        var agentName = agentUser ? agentUser.displayName : fAgent;
        var allNotes = getNotes();

        if (editingId) {
          var idx = allNotes.findIndex(function (n) { return n.id === editingId; });
          if (idx !== -1) {
            // Preserve completion status for existing items
            var oldNote = migrateActionItems(allNotes[idx]);
            var mergedItems = fActionItems.map(function (newItem) {
              var existing = oldNote.actionItems.find(function (old) { return old.label === newItem.label; });
              return existing || newItem;
            });
            allNotes[idx].agentUsername = fAgent;
            allNotes[idx].agentName = agentName;
            allNotes[idx].date = fDate;
            allNotes[idx].notes = fNotes;
            allNotes[idx].actionItems = mergedItems;
            saveNotes(allNotes);
            showToast('Meeting updated.');
          }
          viewMode = 'detail';
          selectedNoteId = editingId;
          editingId = null;
        } else {
          var newNote = {
            id: generateId(), agentUsername: fAgent, agentName: agentName,
            date: fDate, notes: fNotes, actionItems: fActionItems,
            createdBy: session.username, createdByName: session.displayName,
            createdAt: new Date().toISOString()
          };
          allNotes.push(newNote);
          saveNotes(allNotes);
          if (typeof addNotification === 'function') {
            addNotification({ type: 'new_meeting_note', title: 'New meeting note', detail: 'Meeting with ' + session.displayName + ' on ' + fDate, linkPage: 'meeting-notes.html', linkId: newNote.id, targetUser: fAgent });
          }
          showToast('Meeting created.');
          viewMode = 'detail';
          selectedNoteId = newNote.id;
        }
        render();
        break;

      case 'toggle-action':
        var noteId = target.getAttribute('data-note-id');
        var itemIdx = parseInt(target.getAttribute('data-item-idx'));
        var allN = getNotes();
        var n = allN.find(function (x) { return x.id === noteId; });
        if (n) {
          n = migrateActionItems(n);
          if (n.actionItems[itemIdx]) {
            n.actionItems[itemIdx].completed = !n.actionItems[itemIdx].completed;
            n.actionItems[itemIdx].completedBy = n.actionItems[itemIdx].completed ? session.displayName : null;
            n.actionItems[itemIdx].completedAt = n.actionItems[itemIdx].completed ? new Date().toISOString() : null;
            saveNotes(allN);
            renderDetail();
          }
        }
        break;

      case 'add-action-item':
        addActionItem(target.getAttribute('data-note-id'));
        break;
    }
  });

  render();
})();
