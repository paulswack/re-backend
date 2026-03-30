/* ============================================================
   RE Back Office — Meeting Notes Page
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
  var viewMode = 'list'; // 'list', 'detail', 'form'
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

  function countActionItems(text) {
    if (!text) return 0;
    return text.split('\n').filter(function (line) { return line.trim().indexOf('-') === 0 && line.trim().length > 1; }).length;
  }

  function formatActionItems(text) {
    if (!text) return '';
    var h = '';
    text.split('\n').forEach(function (line) {
      line = line.trim();
      if (!line) return;
      if (line.indexOf('-') === 0) {
        h += '<div style="display:flex;align-items:flex-start;gap:10px;padding:6px 0">' +
          '<div style="width:20px;height:20px;border-radius:6px;border:2px solid var(--gray-300);flex-shrink:0;margin-top:1px"></div>' +
          '<span style="color:var(--gray-700);font-size:.88rem;line-height:1.5">' + escapeHtml(line.substring(1).trim()) + '</span>' +
        '</div>';
      } else {
        h += '<div style="padding:4px 0;color:var(--gray-600);font-size:.88rem">' + escapeHtml(line) + '</div>';
      }
    });
    return h;
  }

  // ---- Seed Data ----
  function seedData() {
    if (localStorage.getItem(STORAGE_KEY)) return;
    var seed = [
      {
        id: 'mn-001', agentUsername: 'agent1', agentName: 'Marcus Rivera', date: '2026-03-25',
        notes: 'Discussed Q1 performance. Marcus closed 2 deals this quarter totaling $935K in volume. He exceeded his contact goal by 15%. We reviewed his pipeline and identified 3 strong leads that could close in Q2. Talked about improving follow-up cadence with warm leads from open houses.',
        actionItems: '- Follow up on 3 warm leads from the Balcones open house\n- Schedule 2 listing appointments by end of week\n- Complete advanced negotiation training module\n- Update CRM notes for all active prospects',
        createdBy: 'admin', createdByName: 'Jennifer Walsh', createdAt: '2026-03-25T10:30:00Z'
      },
      {
        id: 'mn-002', agentUsername: 'agent2', agentName: 'Sarah Chen', date: '2026-03-27',
        notes: 'Reviewed listing strategy for Q2. Sarah has 2 active listings and wants to add 3 more by end of April. We discussed pricing strategies for the South Austin market which has seen a 4% price increase this quarter. Also talked about leveraging her condo expertise for the downtown market.',
        actionItems: '- Prepare CMAs for 2 potential listing appointments\n- Schedule open house for 10204 Wommack Rd\n- Draft social media content plan for April\n- Connect with the relocation department for incoming buyer referrals',
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
    var notes = getNotes();
    var users = getUsers();

    // Access control
    var visibleNotes;
    if (privileged) {
      visibleNotes = filterAgent === 'all' ? notes : notes.filter(function (n) { return n.agentUsername === filterAgent; });
    } else {
      visibleNotes = notes.filter(function (n) { return n.agentUsername === session.username; });
    }
    visibleNotes.sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });

    // Unique agents
    var agentSet = {};
    notes.forEach(function (n) { if (n.agentUsername) agentSet[n.agentUsername] = n.agentName; });

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
    var totalNotes = visibleNotes.length;
    var totalActions = visibleNotes.reduce(function (s, n) { return s + countActionItems(n.actionItems); }, 0);
    var uniqueAgentCount = Object.keys(agentSet).length;

    html += '<div class="stats-grid" style="margin-bottom:20px">';
    html += '<div class="stat-card"><div class="stat-icon navy"><svg viewBox="0 0 24 24"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg></div><div><div class="stat-value">' + totalNotes + '</div><div class="stat-label">Total Notes</div></div></div>';
    html += '<div class="stat-card"><div class="stat-icon green"><svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg></div><div><div class="stat-value">' + uniqueAgentCount + '</div><div class="stat-label">Agents</div></div></div>';
    html += '<div class="stat-card"><div class="stat-icon blue"><svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/></svg></div><div><div class="stat-value">' + totalActions + '</div><div class="stat-label">Action Items</div></div></div>';
    html += '</div>';

    // Filter bar
    if (privileged) {
      html += '<div class="filter-bar">';
      html += '<input type="text" id="searchInput" placeholder="Search notes...">';
      html += '<select id="agentFilter">' +
        '<option value="all">All Agents</option>';
      users.forEach(function (u) {
        if (u.role === 'Team Lead') return;
        html += '<option value="' + escapeHtml(u.username) + '"' + (filterAgent === u.username ? ' selected' : '') + '>' + escapeHtml(u.displayName) + '</option>';
      });
      html += '</select></div>';
    }

    // Notes list
    if (visibleNotes.length === 0) {
      html += '<div class="card" style="padding:60px 24px;text-align:center">';
      html += '<svg viewBox="0 0 24 24" width="48" height="48" fill="var(--gray-200)" style="margin-bottom:16px"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>';
      html += '<h3 style="color:var(--gray-700);margin-bottom:4px">No meeting notes yet</h3>';
      html += '<p style="color:var(--gray-400);font-size:.88rem">' + (privileged ? 'Click "Add Meeting" to schedule your first 1-on-1.' : 'Your team lead has not added any meeting notes yet.') + '</p>';
      html += '</div>';
    } else {
      // Group by agent
      var agentGroups = {};
      visibleNotes.forEach(function (n) {
        var key = n.agentUsername || 'unknown';
        if (!agentGroups[key]) agentGroups[key] = { name: n.agentName, notes: [] };
        agentGroups[key].notes.push(n);
      });

      var sortedAgentKeys = Object.keys(agentGroups).sort(function (a, b) {
        return agentGroups[b].notes.length - agentGroups[a].notes.length;
      });

      sortedAgentKeys.forEach(function (agentKey) {
        var group = agentGroups[agentKey];
        var cls = agentClass(group.name);
        var agentActions = group.notes.reduce(function (s, n) { return s + countActionItems(n.actionItems); }, 0);

        html += '<div class="lb-card" style="margin-bottom:20px">';

        // Agent header
        html += '<div style="padding:18px 24px;border-bottom:1px solid var(--gray-100);display:flex;align-items:center;gap:14px">';
        html += '<div class="agent-avatar ' + cls + '" style="width:42px;height:42px;font-size:.8rem">' + getInitials(group.name) + '</div>';
        html += '<div style="flex:1">';
        html += '<div style="font-size:1rem;font-weight:700;color:var(--gray-900)">' + escapeHtml(group.name) + '</div>';
        html += '<div style="font-size:.78rem;color:var(--gray-400)">' + group.notes.length + ' meeting' + (group.notes.length !== 1 ? 's' : '') + ' &middot; ' + agentActions + ' action item' + (agentActions !== 1 ? 's' : '') + '</div>';
        html += '</div></div>';

        // Notes rows
        group.notes.forEach(function (note) {
          var actionCount = countActionItems(note.actionItems);
          var preview = note.notes ? note.notes.substring(0, 100) : '';
          if (note.notes && note.notes.length > 100) preview += '...';

          html += '<div class="list-row" data-action="open-detail" data-id="' + note.id + '" style="padding:14px 24px;gap:12px">';
          html += '<div style="width:48px;text-align:center;flex-shrink:0">';
          html += '<div style="font-size:.68rem;font-weight:700;color:var(--indigo);text-transform:uppercase">' + Data.formatDate(note.date).split(',')[0].split(' ')[0] + '</div>';
          html += '<div style="font-size:1.1rem;font-weight:800;color:var(--gray-800);line-height:1">' + Data.formatDate(note.date).split(',')[0].split(' ')[1] + '</div>';
          html += '</div>';
          html += '<div style="flex:1;min-width:0">';
          html += '<div style="font-size:.88rem;font-weight:600;color:var(--gray-800);margin-bottom:2px">' + escapeHtml(preview) + '</div>';
          if (actionCount > 0) {
            html += '<span style="font-size:.7rem;background:var(--indigo-light);color:var(--indigo);padding:2px 8px;border-radius:12px;font-weight:600">' + actionCount + ' action item' + (actionCount !== 1 ? 's' : '') + '</span>';
          }
          html += '</div>';
          html += '<svg viewBox="0 0 24 24" width="18" height="18" fill="var(--gray-300)" style="flex-shrink:0"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>';
          html += '</div>';
        });

        html += '</div>';
      });
    }

    pageBody.innerHTML = html;

    // Filter listeners
    var agentFilterEl = document.getElementById('agentFilter');
    if (agentFilterEl) {
      agentFilterEl.addEventListener('change', function () { filterAgent = this.value; render(); });
    }
    var searchEl = document.getElementById('searchInput');
    if (searchEl) {
      searchEl.addEventListener('input', function () {
        var q = this.value.toLowerCase();
        var rows = document.querySelectorAll('#notesListCard .list-row');
        rows.forEach(function (row) { row.style.display = row.textContent.toLowerCase().indexOf(q) > -1 ? '' : 'none'; });
      });
    }
  }

  // ============================================================
  //  DETAIL VIEW
  // ============================================================
  function renderDetail() {
    var notes = getNotes();
    var note = notes.find(function (n) { return n.id === selectedNoteId; });
    if (!note) { viewMode = 'list'; render(); return; }

    var cls = agentClass(note.agentName);
    var actionCount = countActionItems(note.actionItems);

    var html = '';

    // Back button
    html += '<button class="btn btn-outline btn-sm" data-action="back-to-list" style="margin-bottom:16px;display:inline-flex;align-items:center;gap:6px">' +
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>' +
      'All Meetings</button>';

    // Header card
    html += '<div class="lb-card" style="margin-bottom:20px">';
    html += '<div style="padding:24px 28px;display:flex;align-items:center;gap:18px;flex-wrap:wrap">';
    html += '<div class="agent-avatar ' + cls + '" style="width:60px;height:60px;font-size:1.2rem">' + getInitials(note.agentName) + '</div>';
    html += '<div style="flex:1;min-width:0">';
    html += '<div style="font-size:1.25rem;font-weight:800;color:var(--gray-900)">' + escapeHtml(note.agentName) + '</div>';
    html += '<div style="display:flex;align-items:center;gap:12px;margin-top:4px;flex-wrap:wrap">';
    html += '<span style="font-size:.85rem;color:var(--gray-500)">' + Data.formatDate(note.date) + '</span>';
    html += '<span style="font-size:.75rem;color:var(--gray-400)">by ' + escapeHtml(note.createdByName || 'Team Lead') + '</span>';
    if (actionCount > 0) {
      html += '<span style="font-size:.7rem;background:var(--indigo-light);color:var(--indigo);padding:3px 10px;border-radius:12px;font-weight:600">' + actionCount + ' action item' + (actionCount !== 1 ? 's' : '') + '</span>';
    }
    html += '</div></div>';
    if (privileged) {
      html += '<div style="display:flex;gap:8px">';
      html += '<button class="btn btn-outline btn-sm" data-action="edit-note" data-id="' + note.id + '">Edit</button>';
      html += '<button class="btn btn-outline btn-sm" data-action="delete-note" data-id="' + note.id + '" style="color:var(--rose);border-color:var(--gray-200)">Delete</button>';
      html += '</div>';
    }
    html += '</div></div>';

    // Notes card
    html += '<div class="lb-card" style="margin-bottom:20px">';
    html += '<div style="padding:18px 24px;border-bottom:1px solid var(--gray-100);display:flex;align-items:center;gap:10px">';
    html += '<svg viewBox="0 0 24 24" width="18" height="18" fill="var(--emerald)"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/></svg>';
    html += '<span style="font-size:.9rem;font-weight:700;color:var(--gray-800)">Discussion Notes</span>';
    html += '</div>';
    html += '<div style="padding:20px 28px;font-size:.92rem;color:var(--gray-700);line-height:1.75;white-space:pre-wrap">' + escapeHtml(note.notes) + '</div>';
    html += '</div>';

    // Action Items card
    if (note.actionItems && note.actionItems.trim()) {
      html += '<div class="lb-card" style="margin-bottom:20px">';
      html += '<div style="padding:18px 24px;border-bottom:1px solid var(--gray-100);display:flex;align-items:center;justify-content:space-between">';
      html += '<div style="display:flex;align-items:center;gap:10px">';
      html += '<svg viewBox="0 0 24 24" width="18" height="18" fill="var(--violet)"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/></svg>';
      html += '<span style="font-size:.9rem;font-weight:700;color:var(--gray-800)">Action Items</span>';
      html += '</div>';
      if (actionCount > 0) html += '<span style="font-size:.78rem;font-weight:600;color:var(--violet)">' + actionCount + ' item' + (actionCount !== 1 ? 's' : '') + '</span>';
      html += '</div>';
      html += '<div style="padding:20px 28px">';
      html += formatActionItems(note.actionItems);
      html += '</div>';
      html += '</div>';
    }

    pageBody.innerHTML = html;
  }

  // ============================================================
  //  FORM VIEW (full page)
  // ============================================================
  function renderForm() {
    var isEdit = !!editingId;
    var note = isEdit ? getNotes().find(function (n) { return n.id === editingId; }) : null;
    var users = getUsers();
    var agents = users.filter(function (u) { return u.role !== 'Team Lead'; });

    var html = '';

    // Back button
    html += '<button class="btn btn-outline btn-sm" data-action="form-cancel" style="margin-bottom:16px;display:inline-flex;align-items:center;gap:6px">' +
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>' +
      (isEdit ? 'Back to Note' : 'All Meetings') + '</button>';

    html += '<div style="max-width:720px">';
    html += '<h2 style="font-size:1.3rem;font-weight:800;color:var(--gray-900);margin-bottom:24px">' + (isEdit ? 'Edit Meeting Note' : 'New Meeting Note') + '</h2>';

    // Meeting Info Card
    html += '<div class="card" style="padding:0;overflow:hidden;margin-bottom:20px">';
    html += '<div style="padding:14px 20px;background:var(--indigo-light);border-bottom:1px solid rgba(99,102,241,.1);display:flex;align-items:center;gap:10px">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="var(--indigo)"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>';
    html += '<span style="font-size:.92rem;font-weight:700;color:var(--indigo)">Meeting Details</span></div>';
    html += '<div style="padding:20px 24px">';

    html += '<div class="form-row" style="grid-template-columns:1fr 1fr">';
    html += '<div class="form-group"><label>Agent *</label><select id="fAgent" style="padding:12px 16px">';
    html += '<option value="">Select agent...</option>';
    agents.forEach(function (u) {
      var sel = note && note.agentUsername === u.username ? ' selected' : '';
      html += '<option value="' + escapeHtml(u.username) + '"' + sel + '>' + escapeHtml(u.displayName) + '</option>';
    });
    html += '</select></div>';
    html += '<div class="form-group"><label>Date *</label><input type="date" id="fDate" value="' + (note ? note.date : todayStr()) + '" style="padding:12px 16px"></div>';
    html += '</div>';

    html += '</div></div>';

    // Notes Card
    html += '<div class="card" style="padding:0;overflow:hidden;margin-bottom:20px">';
    html += '<div style="padding:14px 20px;background:var(--emerald-light);border-bottom:1px solid rgba(16,185,129,.1);display:flex;align-items:center;gap:10px">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="var(--emerald)"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h6v6h6v10H6z"/></svg>';
    html += '<span style="font-size:.92rem;font-weight:700;color:var(--emerald)">Meeting Notes</span></div>';
    html += '<div style="padding:20px 24px">';
    html += '<div class="form-group"><textarea id="fNotes" rows="8" placeholder="What did you discuss? Key takeaways, performance feedback, goals..." style="padding:12px 16px;font-size:.92rem;line-height:1.6">' + escapeHtml(note ? note.notes : '') + '</textarea></div>';
    html += '</div></div>';

    // Action Items Card
    html += '<div class="card" style="padding:0;overflow:hidden;margin-bottom:20px">';
    html += '<div style="padding:14px 20px;background:#F5F3FF;border-bottom:1px solid rgba(139,92,246,.1);display:flex;align-items:center;gap:10px">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="var(--violet)"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/></svg>';
    html += '<span style="font-size:.92rem;font-weight:700;color:var(--violet)">Action Items</span></div>';
    html += '<div style="padding:20px 24px">';
    html += '<div class="form-group"><textarea id="fActionItems" rows="5" placeholder="- Follow up with 3 leads by Friday\n- Schedule open house for Elm St listing\n- Complete training module" style="padding:12px 16px;font-size:.92rem;line-height:1.6">' + escapeHtml(note ? note.actionItems : '') + '</textarea></div>';
    html += '<p style="font-size:.75rem;color:var(--gray-400);margin-top:4px">Start each item with a dash (-) for it to appear as a task</p>';
    html += '</div></div>';

    // Save / Cancel
    html += '<div style="display:flex;gap:12px;margin-bottom:40px">';
    html += '<button class="btn btn-primary btn-lg" data-action="form-save" style="padding:14px 32px;font-size:.95rem">' + (isEdit ? 'Save Changes' : 'Create Note') + '</button>';
    html += '<button class="btn btn-outline btn-lg" data-action="form-cancel" style="padding:14px 32px;font-size:.95rem">Cancel</button>';
    html += '</div>';

    html += '</div>';

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
        if (confirm('Delete this meeting note? This cannot be undone.')) {
          var notes = getNotes();
          var filtered = notes.filter(function (n) { return n.id !== target.getAttribute('data-id'); });
          saveNotes(filtered);
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

      case 'form-save':
        var fAgent = (document.getElementById('fAgent') || {}).value;
        var fDate = (document.getElementById('fDate') || {}).value;
        var fNotes = (document.getElementById('fNotes') || {}).value.trim();
        var fActions = (document.getElementById('fActionItems') || {}).value.trim();

        if (!fAgent) { showToast('Please select an agent.', 'error'); break; }
        if (!fDate) { showToast('Please select a date.', 'error'); break; }
        if (!fNotes) { showToast('Please enter meeting notes.', 'error'); break; }

        var users = getUsers();
        var agentUser = users.find(function (u) { return u.username === fAgent; });
        var agentName = agentUser ? agentUser.displayName : fAgent;

        var allNotes = getNotes();

        if (editingId) {
          var idx = allNotes.findIndex(function (n) { return n.id === editingId; });
          if (idx !== -1) {
            allNotes[idx].agentUsername = fAgent;
            allNotes[idx].agentName = agentName;
            allNotes[idx].date = fDate;
            allNotes[idx].notes = fNotes;
            allNotes[idx].actionItems = fActions;
            saveNotes(allNotes);
            showToast('Meeting note updated.');
          }
          viewMode = 'detail';
          selectedNoteId = editingId;
          editingId = null;
        } else {
          var newNote = {
            id: generateId(),
            agentUsername: fAgent,
            agentName: agentName,
            date: fDate,
            notes: fNotes,
            actionItems: fActions,
            createdBy: session.username,
            createdByName: session.displayName,
            createdAt: new Date().toISOString()
          };
          allNotes.push(newNote);
          saveNotes(allNotes);

          // Fire notification
          if (typeof addNotification === 'function') {
            addNotification({ type: 'new_meeting_note', title: 'New meeting note', detail: 'Meeting with ' + session.displayName + ' on ' + fDate, linkPage: 'meeting-notes.html', linkId: newNote.id, targetUser: fAgent });
          }

          showToast('Meeting note created.');
          viewMode = 'detail';
          selectedNoteId = newNote.id;
        }
        render();
        break;
    }
  });

  // ---- Init ----
  render();

})();
