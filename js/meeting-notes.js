/* ============================================================
   RE Back Office — Monthly Meeting 1-1 Page
   Agent-centric view with auto-archiving
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

  var viewMode = 'list';
  var selectedNoteId = null;
  var editingId = null;

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
    return { total: items.length, done: items.filter(function (i) { return i.completed; }).length };
  }

  function isArchived(note) {
    var st = getActionStats(note);
    return st.total > 0 && st.done === st.total;
  }

  // ---- Seed ----
  function seedData() {
    if (localStorage.getItem(STORAGE_KEY)) return;
    saveNotes([
      {
        id: 'mn-001', agentUsername: 'agent1', agentName: 'Marcus Rivera', date: '2026-03-25',
        notes: 'Discussed Q1 performance. Marcus closed 2 deals this quarter totaling $935K in volume. He exceeded his contact goal by 15%. We reviewed his pipeline and identified 3 strong leads that could close in Q2.',
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
        notes: 'Reviewed listing strategy for Q2. Sarah has 2 active listings and wants to add 3 more by end of April. We discussed pricing strategies for the South Austin market.',
        actionItems: [
          { id: 'ai-010', label: 'Prepare CMAs for 2 potential listing appointments', completed: false, completedBy: null, completedAt: null },
          { id: 'ai-011', label: 'Schedule open house for 10204 Wommack Rd', completed: true, completedBy: 'Sarah Chen', completedAt: '2026-03-28T11:00:00Z' },
          { id: 'ai-012', label: 'Draft social media content plan for April', completed: false, completedBy: null, completedAt: null },
          { id: 'ai-013', label: 'Connect with relocation department for buyer referrals', completed: false, completedBy: null, completedAt: null }
        ],
        createdBy: 'admin', createdByName: 'Jennifer Walsh', createdAt: '2026-03-27T14:00:00Z'
      }
    ]);
  }
  if (typeof Auth !== 'undefined' && Auth.isDemo && Auth.isDemo()) { seedData(); }

  function render() {
    if (viewMode === 'form') renderForm();
    else if (viewMode === 'detail' && selectedNoteId) renderDetail();
    else renderList();
  }

  // ============================================================
  //  LIST VIEW — Agent-centric, always shows all agents
  // ============================================================
  function renderList() {
    var notes = getNotes().map(migrateActionItems);
    var users = getUsers();
    var agents = users.filter(function (u) { return u.role !== 'Team Lead'; });

    // For non-privileged, only show their own
    if (!privileged) {
      agents = agents.filter(function (u) { return u.username === session.username; });
    }

    var html = '';

    // Header
    html += '<div class="page-header">';
    html += '<div><h2>Monthly 1-on-1 Meetings</h2></div>';
    if (privileged) {
      html += '<button class="btn btn-primary btn-sm" data-action="add-note">' +
        '<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>Add Meeting</button>';
    }
    html += '</div>';

    // Stats
    var allVisible = notes.filter(function (n) {
      return privileged || n.agentUsername === session.username;
    });
    var totalItems = 0; var doneItems = 0;
    allVisible.forEach(function (n) { var s = getActionStats(n); totalItems += s.total; doneItems += s.done; });

    html += '<div class="stats-grid" style="margin-bottom:24px">';
    html += '<div class="stat-card"><div class="stat-icon navy"><svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg></div><div><div class="stat-value">' + agents.length + '</div><div class="stat-label">Agents</div></div></div>';
    html += '<div class="stat-card"><div class="stat-icon green"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div><div><div class="stat-value">' + doneItems + '/' + totalItems + '</div><div class="stat-label">Items Complete</div></div></div>';
    html += '<div class="stat-card"><div class="stat-icon amber"><svg viewBox="0 0 24 24"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg></div><div><div class="stat-value">' + allVisible.length + '</div><div class="stat-label">Total Meetings</div></div></div>';
    html += '</div>';

    // Empty state when no agents
    if (agents.length === 0) {
      html += '<div style="text-align:center;padding:60px 20px;color:var(--gray-400);">';
      html += '<div style="font-size:2rem;margin-bottom:12px">📝</div>';
      html += '<div style="font-weight:600;margin-bottom:4px">No meeting notes yet</div>';
      html += '<div style="font-size:.85rem">Click \'New Note\' to get started.</div>';
      html += '</div>';
      pageBody.innerHTML = html;
      return;
    }

    // Agent cards — each agent always shows
    agents.forEach(function (agent) {
      var agentNotes = notes.filter(function (n) { return n.agentUsername === agent.username; })
        .sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });

      var activeNotes = agentNotes.filter(function (n) { return !isArchived(n); });
      var archivedNotes = agentNotes.filter(function (n) { return isArchived(n); });

      var cls = agentClass(agent.displayName);
      var agentTotal = 0; var agentDone = 0;
      agentNotes.forEach(function (n) { var s = getActionStats(n); agentTotal += s.total; agentDone += s.done; });
      var agentPct = agentTotal > 0 ? Math.round((agentDone / agentTotal) * 100) : 0;

      html += '<div class="lb-card" style="margin-bottom:24px">';

      // Agent header
      html += '<div style="padding:20px 24px;display:flex;align-items:center;gap:14px">';
      html += '<div class="agent-avatar ' + cls + '" style="width:48px;height:48px;font-size:.9rem">' + getInitials(agent.displayName) + '</div>';
      html += '<div style="flex:1">';
      html += '<div style="font-size:1.05rem;font-weight:700;color:var(--gray-900)">' + escapeHtml(agent.displayName) + '</div>';
      html += '<div style="font-size:.78rem;color:var(--gray-400)">' + escapeHtml(agent.role || 'Agent') + ' &middot; ' + agentNotes.length + ' meeting' + (agentNotes.length !== 1 ? 's' : '') + '</div>';
      html += '</div>';
      // Progress ring
      html += '<div style="text-align:center">';
      html += '<div style="font-size:1.1rem;font-weight:800;color:' + (agentPct === 100 ? 'var(--emerald)' : 'var(--gray-800)') + '">' + agentDone + '/' + agentTotal + '</div>';
      html += '<div style="font-size:.65rem;color:var(--gray-400);font-weight:600">ITEMS</div>';
      html += '</div>';
      html += '</div>';

      // Progress bar
      html += '<div style="height:3px;background:var(--gray-100)"><div style="height:100%;width:' + agentPct + '%;background:var(--emerald);transition:width .3s"></div></div>';

      // Active meetings — show action items inline
      if (activeNotes.length > 0) {
        activeNotes.forEach(function (note) {
          var st = getActionStats(note);
          var dp = Data.formatDate(note.date).split(' ');

          // Meeting header row (clickable to detail)
          html += '<div style="padding:14px 24px;border-bottom:1px solid var(--gray-100);display:flex;align-items:center;gap:12px;cursor:pointer" data-action="open-detail" data-id="' + note.id + '">';
          html += '<div style="width:44px;text-align:center;flex-shrink:0">';
          html += '<div style="font-size:.65rem;font-weight:700;color:var(--indigo);text-transform:uppercase">' + (dp[0] || '') + '</div>';
          html += '<div style="font-size:1.05rem;font-weight:800;color:var(--gray-800);line-height:1">' + (dp[1] ? dp[1].replace(',', '') : '') + '</div>';
          html += '</div>';
          html += '<div style="flex:1;min-width:0;font-size:.82rem;color:var(--gray-500)">' + Data.formatDate(note.date) + ' Meeting</div>';
          if (st.total > 0) {
            html += '<span style="font-size:.72rem;font-weight:600;color:' + (st.done === st.total ? 'var(--emerald)' : 'var(--gray-400)') + '">' + st.done + '/' + st.total + '</span>';
          }
          html += '<svg viewBox="0 0 24 24" width="16" height="16" fill="var(--gray-300)" style="flex-shrink:0"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>';
          html += '</div>';

          // Action items inline — visible right on the main page
          if (note.actionItems && note.actionItems.length > 0) {
            note.actionItems.forEach(function (item, idx) {
              html += '<div style="padding:8px 24px 8px 80px;border-bottom:1px solid var(--gray-50);display:flex;align-items:center;gap:10px">';
              html += '<input type="checkbox" data-action="list-toggle-action" data-note-id="' + note.id + '" data-item-idx="' + idx + '"' + (item.completed ? ' checked' : '') + ' style="width:17px;height:17px;accent-color:var(--emerald);flex-shrink:0;cursor:pointer">';
              html += '<span style="font-size:.82rem;flex:1;' + (item.completed ? 'color:var(--gray-400);text-decoration:line-through' : 'color:var(--gray-700)') + '">' + escapeHtml(item.label) + '</span>';
              if (item.completed && item.completedBy) {
                html += '<span style="font-size:.65rem;color:var(--emerald);font-weight:600;flex-shrink:0">' + escapeHtml(item.completedBy.split(' ')[0]) + '</span>';
              }
              html += '</div>';
            });
          }
        });
      } else if (archivedNotes.length === 0) {
        html += '<div style="padding:20px 24px;text-align:center;font-size:.85rem;color:var(--gray-400)">No meetings yet</div>';
      }

      // Archived section
      if (archivedNotes.length > 0) {
        html += '<div style="padding:10px 24px;border-top:1px solid var(--gray-100);cursor:pointer;display:flex;align-items:center;gap:8px" data-action="toggle-archive" data-agent="' + agent.username + '">';
        html += '<svg viewBox="0 0 24 24" width="16" height="16" fill="var(--gray-400)" class="archive-chevron" id="archiveChevron-' + agent.username + '"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>';
        html += '<span style="font-size:.78rem;font-weight:600;color:var(--gray-400)">Archived (' + archivedNotes.length + ')</span>';
        html += '<span style="font-size:.68rem;color:var(--emerald);font-weight:600;margin-left:4px">All items complete</span>';
        html += '</div>';
        html += '<div class="archive-section" id="archive-' + agent.username + '" style="display:none">';
        archivedNotes.forEach(function (note) {
          var st = getActionStats(note);
          html += '<div class="list-row" data-action="open-detail" data-id="' + note.id + '" style="padding:12px 24px;gap:12px;opacity:.6">';
          var dp = Data.formatDate(note.date).split(' ');
          html += '<div style="width:44px;text-align:center;flex-shrink:0">';
          html += '<div style="font-size:.65rem;font-weight:700;color:var(--gray-400);text-transform:uppercase">' + (dp[0] || '') + '</div>';
          html += '<div style="font-size:1.05rem;font-weight:800;color:var(--gray-400);line-height:1">' + (dp[1] ? dp[1].replace(',', '') : '') + '</div>';
          html += '</div>';
          html += '<div style="flex:1;min-width:0">';
          html += '<div style="font-size:.82rem;color:var(--gray-400)">' + escapeHtml(note.notes ? note.notes.substring(0, 60) + '...' : '') + '</div>';
          html += '<span style="font-size:.68rem;color:var(--emerald);font-weight:600">' + st.done + '/' + st.total + ' complete</span>';
          html += '</div>';
          html += '<svg viewBox="0 0 24 24" width="16" height="16" fill="var(--gray-300)"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>';
          html += '</div>';
        });
        html += '</div>';
      }

      html += '</div>';
    });

    pageBody.innerHTML = html;
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
    html += '<div class="agent-avatar ' + cls + '" style="width:56px;height:56px;font-size:1.1rem">' + getInitials(note.agentName) + '</div>';
    html += '<div style="flex:1;min-width:0">';
    html += '<div style="font-size:1.2rem;font-weight:800;color:var(--gray-900)">' + escapeHtml(note.agentName) + '</div>';
    html += '<div style="font-size:.85rem;color:var(--gray-500);margin-top:2px">' + Data.formatDate(note.date) + ' &middot; by ' + escapeHtml(note.createdByName || 'Team Lead') + '</div>';
    html += '</div>';
    if (privileged) {
      html += '<div style="display:flex;gap:8px">';
      html += '<button class="btn btn-outline btn-sm" data-action="edit-note" data-id="' + note.id + '">Edit</button>';
      html += '<button class="btn btn-outline btn-sm" data-action="delete-note" data-id="' + note.id + '" style="color:var(--rose);border-color:var(--gray-200)">Delete</button>';
      html += '</div>';
    }
    html += '</div></div>';

    // Discussion Notes
    html += '<div class="lb-card" style="margin-bottom:20px">';
    html += '<div style="padding:16px 24px;border-bottom:1px solid var(--gray-100);display:flex;align-items:center;gap:10px">';
    html += '<svg viewBox="0 0 24 24" width="18" height="18" fill="var(--emerald)"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/></svg>';
    html += '<span style="font-size:.9rem;font-weight:700;color:var(--gray-800)">Discussion Notes</span></div>';
    html += '<div style="padding:20px 28px;font-size:.9rem;color:var(--gray-700);line-height:1.75;white-space:pre-wrap">' + escapeHtml(note.notes) + '</div>';
    html += '</div>';

    // Action Items
    html += '<div class="lb-card" style="margin-bottom:20px">';
    html += '<div style="padding:16px 24px;border-bottom:1px solid var(--gray-100);display:flex;align-items:center;justify-content:space-between">';
    html += '<div style="display:flex;align-items:center;gap:10px">';
    html += '<svg viewBox="0 0 24 24" width="18" height="18" fill="var(--violet)"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/></svg>';
    html += '<span style="font-size:.9rem;font-weight:700;color:var(--gray-800)">Action Items</span></div>';
    if (st.total > 0) html += '<span style="font-size:.78rem;font-weight:600;color:' + (st.done === st.total ? 'var(--emerald)' : 'var(--violet)') + '">' + st.done + '/' + st.total + '</span>';
    html += '</div>';
    if (st.total > 0) {
      html += '<div style="height:3px;background:var(--gray-100)"><div style="height:100%;width:' + Math.round((st.done / st.total) * 100) + '%;background:var(--emerald);transition:width .3s"></div></div>';
    }

    note.actionItems.forEach(function (item, idx) {
      html += '<div style="padding:12px 24px;border-bottom:1px solid var(--gray-50);display:flex;align-items:flex-start;gap:12px">';
      // Checkbox — anyone can check, only Team Lead can uncheck
      var canToggle = !item.completed || privileged;
      html += '<input type="checkbox"' + (canToggle ? ' data-action="toggle-action" data-note-id="' + note.id + '" data-item-idx="' + idx + '"' : ' disabled') + (item.completed ? ' checked' : '') + ' style="width:20px;height:20px;' + (canToggle ? 'cursor:pointer' : 'cursor:default;opacity:.6') + ';accent-color:var(--emerald);flex-shrink:0;margin-top:2px">';
      html += '<div style="flex:1;min-width:0">';
      html += '<div style="font-size:.88rem;' + (item.completed ? 'color:var(--gray-400);text-decoration:line-through' : 'color:var(--gray-800)') + '">' + escapeHtml(item.label) + '</div>';
      if (item.completed && item.completedBy) html += '<div style="font-size:.7rem;color:var(--emerald);margin-top:2px">Completed by ' + escapeHtml(item.completedBy) + ' · ' + Data.formatDate(item.completedAt) + '</div>';
      html += '</div>';
      // Delete button — Team Lead only
      if (privileged) {
        html += '<button data-action="delete-action-item" data-note-id="' + note.id + '" data-item-idx="' + idx + '" style="background:none;border:none;color:var(--gray-300);cursor:pointer;font-size:1.1rem;padding:4px;flex-shrink:0" title="Remove item">&times;</button>';
      }
      html += '</div>';
    });

    // Add item
    html += '<div style="padding:12px 24px;display:flex;gap:10px;align-items:center">';
    html += '<div style="width:20px;height:20px;border-radius:6px;border:2px dashed var(--gray-200);flex-shrink:0"></div>';
    html += '<input type="text" id="newActionItem" placeholder="Add an action item..." style="flex:1;border:none;outline:none;font-size:.88rem;color:var(--gray-700);padding:4px 0">';
    html += '<button class="btn btn-primary btn-sm" data-action="add-action-item" data-note-id="' + note.id + '" style="padding:6px 14px;font-size:.78rem">Add</button>';
    html += '</div>';
    html += '</div>';

    // AI Recording placeholder
    html += '<div class="lb-card" style="margin-bottom:20px;border:2px dashed var(--gray-200);background:var(--gray-50)">';
    html += '<div style="padding:28px;text-align:center">';
    html += '<div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--indigo),var(--violet));display:flex;align-items:center;justify-content:center;margin:0 auto 14px">';
    html += '<svg viewBox="0 0 24 24" width="24" height="24" fill="#fff"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>';
    html += '</div>';
    html += '<div style="font-size:1rem;font-weight:700;color:var(--gray-800);margin-bottom:4px">AI Meeting Recording</div>';
    html += '<div style="font-size:.85rem;color:var(--gray-400);max-width:360px;margin:0 auto;line-height:1.5">Record your 1-on-1 meetings and let AI automatically generate notes and action items. Coming soon with the full platform launch.</div>';
    html += '<button class="btn btn-outline btn-sm" style="margin-top:16px;color:var(--indigo);border-color:var(--indigo);cursor:default;opacity:.7">Coming Soon</button>';
    html += '</div></div>';

    pageBody.innerHTML = html;

    var newInput = document.getElementById('newActionItem');
    if (newInput) newInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addActionItem(note.id); } });
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
      html += '<option value="' + escapeHtml(u.username) + '"' + (note && note.agentUsername === u.username ? ' selected' : '') + '>' + escapeHtml(u.displayName) + '</option>';
    });
    html += '</select></div>';
    html += '<div class="form-group"><label>Date *</label><input type="date" id="fDate" value="' + (note ? note.date : todayStr()) + '" style="padding:12px 16px"></div>';
    html += '</div></div></div>';

    // AI Recording
    html += '<div class="card" style="padding:0;overflow:hidden;margin-bottom:20px">';
    html += '<div style="padding:14px 20px;background:var(--indigo-light);border-bottom:1px solid rgba(99,102,241,.1);display:flex;align-items:center;gap:10px">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="var(--indigo)"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>';
    html += '<span style="font-size:.92rem;font-weight:700;color:var(--indigo)">AI Meeting Recorder</span></div>';
    html += '<div style="padding:20px 24px;text-align:center" id="recorderArea">';
    html += '<div id="recorderStatus" style="font-size:.85rem;color:var(--gray-500);margin-bottom:16px">Click record to start capturing your meeting. AI will transcribe and summarize it.</div>';
    html += '<div id="recorderTimer" style="font-size:2rem;font-weight:800;color:var(--gray-900);margin-bottom:16px;display:none">00:00</div>';
    html += '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">';
    html += '<button id="btnStartRecord" class="btn btn-primary" data-action="start-recording" style="padding:10px 28px;display:flex;align-items:center;gap:8px">';
    html += '<svg viewBox="0 0 24 24" width="18" height="18" fill="#fff"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>';
    html += 'Start Recording</button>';
    html += '<button id="btnStopRecord" class="btn btn-outline" data-action="stop-recording" style="padding:10px 28px;display:none;color:var(--rose);border-color:var(--rose)">';
    html += '⬛ Stop Recording</button>';
    html += '</div>';
    html += '<div id="recorderProcessing" style="display:none;margin-top:16px;padding:16px;background:var(--gray-50);border-radius:10px">';
    html += '<div style="font-size:.85rem;font-weight:600;color:var(--indigo);margin-bottom:8px">🤖 Processing with AI...</div>';
    html += '<div style="font-size:.78rem;color:var(--gray-400)">Transcribing audio and generating meeting summary. This may take a moment.</div>';
    html += '</div>';
    html += '</div></div>';

    // Notes
    html += '<div class="card" style="padding:0;overflow:hidden;margin-bottom:20px">';
    html += '<div style="padding:14px 20px;background:var(--emerald-light);border-bottom:1px solid rgba(16,185,129,.1);display:flex;align-items:center;gap:10px">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="var(--emerald)"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/></svg>';
    html += '<span style="font-size:.92rem;font-weight:700;color:var(--emerald)">Discussion Notes</span></div>';
    html += '<div style="padding:20px 24px">';
    html += '<div class="form-group"><textarea id="fNotes" rows="8" placeholder="What did you discuss? Key takeaways, performance feedback, goals..." style="padding:12px 16px;font-size:.92rem;line-height:1.6">' + escapeHtml(note ? note.notes : '') + '</textarea></div>';
    html += '</div></div>';

    // Action Items
    html += '<div class="card" style="padding:0;overflow:hidden;margin-bottom:20px">';
    html += '<div style="padding:14px 20px;background:#F5F3FF;border-bottom:1px solid rgba(139,92,246,.1);display:flex;align-items:center;gap:10px">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="var(--violet)"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/></svg>';
    html += '<span style="font-size:.92rem;font-weight:700;color:var(--violet)">Action Items</span></div>';
    html += '<div style="padding:16px 24px" id="formActionItems">';

    var existingItems = (note && note.actionItems) ? note.actionItems : [];
    existingItems.forEach(function (item) {
      html += '<div class="form-action-row" style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--gray-50)">';
      html += '<div style="width:20px;height:20px;border-radius:6px;border:2px solid var(--gray-300);flex-shrink:0"></div>';
      html += '<input type="text" class="form-action-input" value="' + escapeHtml(item.label) + '" style="flex:1;border:none;outline:none;font-size:.88rem;color:var(--gray-700);padding:6px 0">';
      html += '<button type="button" class="form-action-remove" style="background:none;border:none;color:var(--gray-300);cursor:pointer;font-size:1.1rem;padding:4px">&times;</button>';
      html += '</div>';
    });

    html += '<div style="display:flex;align-items:center;gap:10px;padding:10px 0">';
    html += '<div style="width:20px;height:20px;border-radius:6px;border:2px dashed var(--gray-200);flex-shrink:0"></div>';
    html += '<input type="text" id="fNewAction" placeholder="Type an action item and press Enter..." style="flex:1;border:none;outline:none;font-size:.88rem;color:var(--gray-700);padding:6px 0">';
    html += '<button type="button" class="btn btn-outline btn-sm" data-action="form-add-action" style="padding:4px 12px;font-size:.78rem">Add</button>';
    html += '</div>';
    html += '</div></div>';

    // Save
    html += '<div style="display:flex;gap:12px;margin-bottom:40px">';
    html += '<button class="btn btn-primary btn-lg" data-action="form-save" style="padding:14px 32px;font-size:.95rem">' + (isEdit ? 'Save Changes' : 'Create Meeting') + '</button>';
    html += '<button class="btn btn-outline btn-lg" data-action="form-cancel" style="padding:14px 32px;font-size:.95rem">Cancel</button>';
    html += '</div></div>';

    pageBody.innerHTML = html;

    var newActionInput = document.getElementById('fNewAction');
    if (newActionInput) newActionInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addFormAction(); } });
    pageBody.querySelectorAll('.form-action-remove').forEach(function (btn) {
      btn.addEventListener('click', function () { this.closest('.form-action-row').remove(); });
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
      '<button type="button" class="form-action-remove" style="background:none;border:none;color:var(--gray-300);cursor:pointer;font-size:1.1rem;padding:4px">&times;</button>';
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
    migrateActionItems(note);
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
        editingId = null; viewMode = 'form'; render(); break;

      case 'open-detail':
        selectedNoteId = target.getAttribute('data-id'); viewMode = 'detail'; render(); break;

      case 'back-to-list':
        viewMode = 'list'; selectedNoteId = null; render(); break;

      case 'edit-note':
        editingId = target.getAttribute('data-id'); viewMode = 'form'; render(); break;

      case 'delete-note':
        if (confirm('Delete this meeting note?')) {
          saveNotes(getNotes().filter(function (n) { return n.id !== target.getAttribute('data-id'); }));
          showToast('Deleted.'); viewMode = 'list'; selectedNoteId = null; render();
        }
        break;

      case 'form-cancel':
        if (editingId) { viewMode = 'detail'; selectedNoteId = editingId; editingId = null; }
        else { viewMode = 'list'; }
        render(); break;

      case 'form-add-action':
        addFormAction(); break;

      case 'toggle-archive':
        var agentKey = target.getAttribute('data-agent');
        var section = document.getElementById('archive-' + agentKey);
        var chevron = document.getElementById('archiveChevron-' + agentKey);
        if (section) {
          var show = section.style.display === 'none';
          section.style.display = show ? 'block' : 'none';
          if (chevron) chevron.style.transform = show ? 'rotate(90deg)' : '';
        }
        break;

      case 'form-save':
        var fAgent = (document.getElementById('fAgent') || {}).value;
        var fDate = (document.getElementById('fDate') || {}).value;
        var fNotes = (document.getElementById('fNotes') || {}).value.trim();
        if (!fAgent) { showToast('Please select an agent.', 'error'); break; }
        if (!fDate) { showToast('Please select a date.', 'error'); break; }
        if (!fNotes) { showToast('Please enter meeting notes.', 'error'); break; }

        var fItems = [];
        document.querySelectorAll('.form-action-input').forEach(function (inp) {
          var label = inp.value.trim();
          if (label) fItems.push({ id: generateId(), label: label, completed: false, completedBy: null, completedAt: null });
        });

        var users = getUsers();
        var agentUser = users.find(function (u) { return u.username === fAgent; });
        var agentName = agentUser ? agentUser.displayName : fAgent;
        var allNotes = getNotes();

        if (editingId) {
          var idx = allNotes.findIndex(function (n) { return n.id === editingId; });
          if (idx !== -1) {
            var oldNote = migrateActionItems(allNotes[idx]);
            var merged = fItems.map(function (ni) {
              var ex = oldNote.actionItems.find(function (o) { return o.label === ni.label; });
              return ex || ni;
            });
            allNotes[idx].agentUsername = fAgent;
            allNotes[idx].agentName = agentName;
            allNotes[idx].date = fDate;
            allNotes[idx].notes = fNotes;
            allNotes[idx].actionItems = merged;
            saveNotes(allNotes);
            showToast('Meeting updated.');
          }
          viewMode = 'detail'; selectedNoteId = editingId; editingId = null;
        } else {
          var newNote = { id: generateId(), agentUsername: fAgent, agentName: agentName, date: fDate, notes: fNotes, actionItems: fItems, createdBy: session.username, createdByName: session.displayName, createdAt: new Date().toISOString() };
          allNotes.push(newNote);
          saveNotes(allNotes);
          if (typeof addNotification === 'function') addNotification({ type: 'new_meeting_note', title: 'New meeting note', detail: 'Meeting with ' + session.displayName + ' on ' + fDate, linkPage: 'meeting-notes.html', linkId: newNote.id, targetUser: fAgent });
          showToast('Meeting created.');
          viewMode = 'detail'; selectedNoteId = newNote.id;
        }
        render(); break;

      case 'toggle-action':
        var nId = target.getAttribute('data-note-id');
        var iIdx = parseInt(target.getAttribute('data-item-idx'));
        var allN = getNotes();
        var n = allN.find(function (x) { return x.id === nId; });
        if (n) {
          migrateActionItems(n);
          if (n.actionItems[iIdx]) {
            // Agents can only check items ON, not uncheck — only Team Lead can uncheck
            if (n.actionItems[iIdx].completed && !privileged) {
              target.checked = true; // revert the visual uncheck
              break;
            }
            n.actionItems[iIdx].completed = !n.actionItems[iIdx].completed;
            n.actionItems[iIdx].completedBy = n.actionItems[iIdx].completed ? session.displayName : null;
            n.actionItems[iIdx].completedAt = n.actionItems[iIdx].completed ? new Date().toISOString() : null;
            saveNotes(allN);
            renderDetail();
          }
        }
        break;

      case 'delete-action-item':
        if (!privileged) break;
        var dNoteId = target.getAttribute('data-note-id');
        var dItemIdx = parseInt(target.getAttribute('data-item-idx'));
        var dNotes = getNotes();
        var dNote = dNotes.find(function (x) { return x.id === dNoteId; });
        if (dNote) {
          migrateActionItems(dNote);
          dNote.actionItems.splice(dItemIdx, 1);
          saveNotes(dNotes);
          renderDetail();
        }
        break;

      case 'list-toggle-action':
        var lnId = target.getAttribute('data-note-id');
        var liIdx = parseInt(target.getAttribute('data-item-idx'));
        var lNotes = getNotes();
        var ln = lNotes.find(function (x) { return x.id === lnId; });
        if (ln) {
          migrateActionItems(ln);
          if (ln.actionItems[liIdx]) {
            if (ln.actionItems[liIdx].completed && !privileged) {
              target.checked = true;
              break;
            }
            ln.actionItems[liIdx].completed = !ln.actionItems[liIdx].completed;
            ln.actionItems[liIdx].completedBy = ln.actionItems[liIdx].completed ? session.displayName : null;
            ln.actionItems[liIdx].completedAt = ln.actionItems[liIdx].completed ? new Date().toISOString() : null;
            saveNotes(lNotes);
            render();
          }
        }
        break;

      case 'add-action-item':
        addActionItem(target.getAttribute('data-note-id')); break;

      case 'start-recording':
        startRecording(); break;

      case 'stop-recording':
        stopRecording(); break;
    }
  });

  // ============================================================
  //  AI MEETING RECORDER
  // ============================================================
  var mediaRecorder = null;
  var audioChunks = [];
  var recordingTimer = null;
  var recordingSeconds = 0;

  function startRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showToast('Your browser does not support audio recording', 'error');
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      audioChunks = [];
      recordingSeconds = 0;

      mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      mediaRecorder.ondataavailable = function (e) {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = function () {
        stream.getTracks().forEach(function (t) { t.stop(); });
        processRecording();
      };

      mediaRecorder.start(1000); // collect data every second

      // UI updates
      document.getElementById('btnStartRecord').style.display = 'none';
      document.getElementById('btnStopRecord').style.display = 'inline-flex';
      document.getElementById('recorderTimer').style.display = 'block';
      document.getElementById('recorderStatus').textContent = '🔴 Recording... Speak naturally.';
      document.getElementById('recorderStatus').style.color = '#EF4444';

      recordingTimer = setInterval(function () {
        recordingSeconds++;
        var mins = Math.floor(recordingSeconds / 60);
        var secs = recordingSeconds % 60;
        document.getElementById('recorderTimer').textContent =
          (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
      }, 1000);

    }).catch(function (err) {
      console.error('Microphone error:', err);
      showToast('Could not access microphone. Please allow microphone access.', 'error');
    });
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    clearInterval(recordingTimer);

    document.getElementById('btnStopRecord').style.display = 'none';
    document.getElementById('btnStartRecord').style.display = 'none';
    document.getElementById('recorderTimer').style.display = 'none';
    document.getElementById('recorderProcessing').style.display = 'block';
    document.getElementById('recorderStatus').textContent = '';
  }

  function processRecording() {
    var blob = new Blob(audioChunks, { type: 'audio/webm' });
    var formData = new FormData();
    formData.append('audio', blob, 'meeting.webm');

    var token = (typeof API !== 'undefined' && API.getToken) ? API.getToken() : localStorage.getItem('reb_jwt');

    fetch('/api/transcribe', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token },
      body: formData
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data.error) {
        showToast('Transcription failed: ' + data.error, 'error');
        resetRecorderUI();
        return;
      }

      // Fill in the form fields with AI summary
      var notesField = document.getElementById('fNotes');
      if (notesField) {
        var parts = [];
        if (data.summary.wins) parts.push('WINS:\n' + data.summary.wins);
        if (data.summary.challenges) parts.push('CHALLENGES:\n' + data.summary.challenges);
        if (data.summary.goals) parts.push('GOALS:\n' + data.summary.goals);
        if (data.summary.notes) parts.push('NOTES:\n' + data.summary.notes);
        parts.push('---\nFULL TRANSCRIPT:\n' + data.transcript);
        notesField.value = parts.join('\n\n');
      }

      // Add action items
      if (data.summary.actionItems && data.summary.actionItems.length > 0) {
        var container = document.getElementById('formActionItems');
        var addBtn = container.querySelector('[data-action="form-add-action"]');
        var insertBefore = addBtn ? addBtn.closest('div') : null;

        data.summary.actionItems.forEach(function (item) {
          var row = document.createElement('div');
          row.className = 'form-action-row';
          row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--gray-50)';
          row.innerHTML =
            '<div style="width:20px;height:20px;border-radius:6px;border:2px solid var(--gray-300);flex-shrink:0"></div>' +
            '<input type="text" class="form-action-input" value="' + item.replace(/"/g, '&quot;') + '" style="flex:1;border:none;outline:none;font-size:.88rem;color:var(--gray-700);padding:6px 0">' +
            '<button type="button" class="form-action-remove" style="background:none;border:none;color:var(--gray-300);cursor:pointer;font-size:1.1rem;padding:4px">&times;</button>';
          if (insertBefore) {
            container.insertBefore(row, insertBefore);
          } else {
            container.appendChild(row);
          }
        });
      }

      showToast('Meeting transcribed and summarized! Review the notes below.');
      resetRecorderUI();
    })
    .catch(function (err) {
      console.error('Transcription error:', err);
      showToast('Failed to process recording', 'error');
      resetRecorderUI();
    });
  }

  function resetRecorderUI() {
    var processing = document.getElementById('recorderProcessing');
    var startBtn = document.getElementById('btnStartRecord');
    var status = document.getElementById('recorderStatus');
    if (processing) processing.style.display = 'none';
    if (startBtn) { startBtn.style.display = 'inline-flex'; startBtn.textContent = '🎙 Record Again'; }
    if (status) { status.textContent = 'Recording complete. You can record again or edit the notes below.'; status.style.color = 'var(--emerald)'; }
  }

  render();
})();
