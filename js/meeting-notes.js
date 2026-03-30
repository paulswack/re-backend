/* ============================================================
   RE Back Office — Meeting Notes Page
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
  var filterAgent = 'all';
  var expandedNoteId = null;
  var editingNoteId = null;

  // ---- Helpers ----
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function generateId() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
  }

  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem(PREFIX + 'users') || '[]');
    } catch (e) {
      return [];
    }
  }

  function getNotes() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveNotes(notes) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }

  function countActionItems(text) {
    if (!text) return 0;
    var lines = text.split('\n');
    var count = 0;
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].trim().indexOf('-') === 0 && lines[i].trim().length > 1) {
        count++;
      }
    }
    return count;
  }

  function formatActionItems(text) {
    if (!text) return '';
    var lines = text.split('\n');
    var html = '';
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;
      if (line.indexOf('-') === 0) {
        var item = line.substring(1).trim();
        html += '<div style="display:flex;align-items:flex-start;gap:8px;padding:4px 0">' +
          '<svg viewBox="0 0 24 24" width="16" height="16" fill="var(--gray-300)" style="flex-shrink:0;margin-top:2px"><rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="var(--gray-300)" stroke-width="2"/></svg>' +
          '<span style="color:var(--gray-600);font-size:.88rem">' + escapeHtml(item) + '</span>' +
          '</div>';
      } else {
        html += '<div style="padding:4px 0;color:var(--gray-600);font-size:.88rem">' + escapeHtml(line) + '</div>';
      }
    }
    return html;
  }

  function todayStr() {
    var d = new Date();
    var mm = ('0' + (d.getMonth() + 1)).slice(-2);
    var dd = ('0' + d.getDate()).slice(-2);
    return d.getFullYear() + '-' + mm + '-' + dd;
  }

  // ---- Seed Data ----
  function seedData() {
    if (localStorage.getItem(STORAGE_KEY)) return;

    var seed = [
      {
        id: 'mn-001',
        agentUsername: 'agent1',
        agentName: 'Marcus Rivera',
        date: '2026-03-25',
        notes: 'Discussed Q1 performance. Marcus closed 2 deals this quarter totaling $935K in volume. He exceeded his contact goal by 15%. We reviewed his pipeline and identified 3 strong leads that could close in Q2. Talked about improving follow-up cadence with warm leads from open houses.',
        actionItems: '- Follow up on 3 warm leads from the Balcones open house\n- Schedule 2 listing appointments by end of week\n- Complete advanced negotiation training module\n- Update CRM notes for all active prospects',
        createdBy: 'admin',
        createdByName: 'Jennifer Walsh',
        createdAt: '2026-03-25T10:30:00Z'
      },
      {
        id: 'mn-002',
        agentUsername: 'agent2',
        agentName: 'Sarah Chen',
        date: '2026-03-27',
        notes: 'Reviewed listing strategy for Q2. Sarah has 2 active listings and wants to add 3 more by end of April. We discussed pricing strategies for the South Austin market which has seen a 4% price increase this quarter. Also talked about leveraging her condo expertise for the downtown market.',
        actionItems: '- Prepare CMAs for 2 potential listing appointments\n- Schedule open house for 10204 Wommack Rd\n- Draft social media content plan for April\n- Connect with the relocation department for incoming buyer referrals',
        createdBy: 'admin',
        createdByName: 'Jennifer Walsh',
        createdAt: '2026-03-27T14:00:00Z'
      }
    ];

    saveNotes(seed);
  }
  seedData();

  // ---- Render ----
  function render() {
    var notes = getNotes();
    var users = getUsers();

    // Filter notes based on role
    var visibleNotes;
    if (privileged) {
      if (filterAgent === 'all') {
        visibleNotes = notes;
      } else {
        visibleNotes = notes.filter(function (n) { return n.agentUsername === filterAgent; });
      }
    } else {
      visibleNotes = notes.filter(function (n) { return n.agentUsername === session.username; });
    }

    // Sort by date desc
    visibleNotes.sort(function (a, b) {
      if (a.date > b.date) return -1;
      if (a.date < b.date) return 1;
      return 0;
    });

    var html = '';

    // Filter bar
    html += '<div class="filter-bar" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:20px">';
    if (privileged) {
      html += '<select id="agentFilter" class="btn btn-outline" style="padding:8px 12px;font-size:.88rem;border-radius:8px;cursor:pointer">';
      html += '<option value="all"' + (filterAgent === 'all' ? ' selected' : '') + '>All Agents</option>';
      users.forEach(function (u) {
        if (u.role === 'Team Lead') return;
        html += '<option value="' + escapeHtml(u.username) + '"' + (filterAgent === u.username ? ' selected' : '') + '>' + escapeHtml(u.displayName) + '</option>';
      });
      html += '</select>';
      html += '<div style="flex:1"></div>';
      html += '<button class="btn btn-primary" data-action="add-note">' +
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="margin-right:6px"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>' +
        'Add Meeting Note</button>';
    }
    html += '</div>';

    // Modal placeholder
    html += '<div id="noteModal"></div>';

    // Notes list
    if (visibleNotes.length === 0) {
      html += '<div class="card" style="padding:60px 24px;text-align:center">';
      html += '<svg viewBox="0 0 24 24" width="48" height="48" fill="var(--gray-200)" style="margin-bottom:16px"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>';
      html += '<h3 style="color:var(--gray-700);margin-bottom:4px">No meeting notes yet</h3>';
      html += '<p style="color:var(--gray-400);font-size:.88rem">' +
        (privileged ? 'Click "Add Meeting Note" to create your first 1-on-1 note.' : 'Your team lead has not added any meeting notes yet.') +
        '</p>';
      html += '</div>';
    } else {
      html += '<div id="notesList">';
      visibleNotes.forEach(function (note) {
        var cls = agentClass(note.agentName);
        var actionCount = countActionItems(note.actionItems);
        var isExpanded = expandedNoteId === note.id;
        var preview = note.notes ? note.notes.substring(0, 150) : '';
        if (note.notes && note.notes.length > 150) preview += '...';

        html += '<div class="lb-card" style="margin-bottom:16px;cursor:pointer" data-action="toggle-note" data-id="' + note.id + '">';
        html += '<div style="display:flex;align-items:flex-start;gap:14px;padding:20px 24px">';

        // Agent avatar
        html += '<div class="agent-avatar ' + cls + '" style="width:42px;height:42px;font-size:.8rem;flex-shrink:0">' + getInitials(note.agentName) + '</div>';

        // Content
        html += '<div style="flex:1;min-width:0">';
        html += '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:4px">';
        html += '<span style="font-weight:700;color:var(--gray-800);font-size:1rem">' + escapeHtml(note.agentName) + '</span>';
        html += '<span style="font-size:.8rem;color:var(--gray-400)">' + Data.formatDate(note.date) + '</span>';
        if (actionCount > 0) {
          html += '<span style="font-size:.75rem;background:var(--indigo-light);color:var(--indigo);padding:2px 8px;border-radius:12px;font-weight:600">' + actionCount + ' action item' + (actionCount !== 1 ? 's' : '') + '</span>';
        }
        html += '</div>';

        if (!isExpanded) {
          html += '<p style="color:var(--gray-500);font-size:.88rem;margin:0;line-height:1.5">' + escapeHtml(preview) + '</p>';
        } else {
          // Full notes
          html += '<div style="margin-top:8px">';
          html += '<div style="font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--gray-400);margin-bottom:6px">Notes</div>';
          html += '<p style="color:var(--gray-600);font-size:.88rem;margin:0;line-height:1.6;white-space:pre-wrap">' + escapeHtml(note.notes) + '</p>';
          html += '</div>';

          if (note.actionItems && note.actionItems.trim()) {
            html += '<div style="margin-top:16px">';
            html += '<div style="font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--gray-400);margin-bottom:6px">Action Items</div>';
            html += '<div style="background:var(--gray-50);border-radius:10px;padding:12px 16px">';
            html += formatActionItems(note.actionItems);
            html += '</div>';
            html += '</div>';
          }

          html += '<div style="margin-top:12px;font-size:.78rem;color:var(--gray-400)">Created by ' + escapeHtml(note.createdByName) + '</div>';

          // Edit/Delete buttons (Team Lead only)
          if (privileged) {
            html += '<div style="display:flex;gap:8px;margin-top:12px">';
            html += '<button class="btn btn-outline" style="font-size:.82rem;padding:6px 14px" data-action="edit-note" data-id="' + note.id + '">Edit</button>';
            html += '<button class="btn btn-outline" style="font-size:.82rem;padding:6px 14px;color:var(--rose);border-color:var(--rose)" data-action="delete-note" data-id="' + note.id + '">Delete</button>';
            html += '</div>';
          }
        }

        html += '</div>'; // content
        html += '</div>'; // flex row
        html += '</div>'; // lb-card
      });
      html += '</div>';
    }

    pageBody.innerHTML = html;

    // Attach filter listener
    var agentFilter = document.getElementById('agentFilter');
    if (agentFilter) {
      agentFilter.addEventListener('change', function () {
        filterAgent = this.value;
        render();
      });
    }
  }

  // ---- Modal ----
  function showModal(note) {
    var isEdit = !!note;
    var users = getUsers();
    var agents = users.filter(function (u) { return u.role !== 'Team Lead'; });

    var html = '<div class="modal-overlay" data-action="close-modal">';
    html += '<div class="modal" style="max-width:600px" onclick="event.stopPropagation()">';
    html += '<div class="modal-header">';
    html += '<h2 style="margin:0;font-size:1.15rem">' + (isEdit ? 'Edit Meeting Note' : 'New Meeting Note') + '</h2>';
    html += '<button class="btn" style="background:none;border:none;font-size:1.3rem;cursor:pointer;padding:0;color:var(--gray-400)" data-action="close-modal">&times;</button>';
    html += '</div>';
    html += '<div class="modal-body" style="padding:20px 24px">';

    // Agent dropdown
    html += '<div class="form-group" style="margin-bottom:16px">';
    html += '<label style="display:block;font-size:.82rem;font-weight:600;color:var(--gray-600);margin-bottom:6px">Agent</label>';
    html += '<select id="modalAgent" style="width:100%;padding:10px 12px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:.92rem;background:var(--white)">';
    agents.forEach(function (u) {
      var selected = isEdit && note.agentUsername === u.username ? ' selected' : '';
      html += '<option value="' + escapeHtml(u.username) + '"' + selected + '>' + escapeHtml(u.displayName) + '</option>';
    });
    html += '</select>';
    html += '</div>';

    // Date
    html += '<div class="form-group" style="margin-bottom:16px">';
    html += '<label style="display:block;font-size:.82rem;font-weight:600;color:var(--gray-600);margin-bottom:6px">Date</label>';
    html += '<input type="date" id="modalDate" value="' + (isEdit ? note.date : todayStr()) + '" style="width:100%;padding:10px 12px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:.92rem;box-sizing:border-box">';
    html += '</div>';

    // Notes
    html += '<div class="form-group" style="margin-bottom:16px">';
    html += '<label style="display:block;font-size:.82rem;font-weight:600;color:var(--gray-600);margin-bottom:6px">Notes</label>';
    html += '<textarea id="modalNotes" rows="5" style="width:100%;padding:10px 12px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:.92rem;resize:vertical;font-family:inherit;box-sizing:border-box" placeholder="Meeting discussion points...">' + (isEdit ? escapeHtml(note.notes) : '') + '</textarea>';
    html += '</div>';

    // Action Items
    html += '<div class="form-group" style="margin-bottom:16px">';
    html += '<label style="display:block;font-size:.82rem;font-weight:600;color:var(--gray-600);margin-bottom:6px">Action Items</label>';
    html += '<textarea id="modalActionItems" rows="4" style="width:100%;padding:10px 12px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:.92rem;resize:vertical;font-family:inherit;box-sizing:border-box" placeholder="- Follow up on 3 leads\n- Schedule open house\n- Complete training module">' + (isEdit ? escapeHtml(note.actionItems) : '') + '</textarea>';
    html += '</div>';

    // Save button
    html += '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px">';
    html += '<button class="btn btn-outline" data-action="close-modal">Cancel</button>';
    html += '<button class="btn btn-primary" data-action="save-note" data-id="' + (isEdit ? note.id : '') + '">' + (isEdit ? 'Update Note' : 'Save Note') + '</button>';
    html += '</div>';

    html += '</div>'; // modal-body
    html += '</div>'; // modal
    html += '</div>'; // modal-overlay

    var modalContainer = document.getElementById('noteModal');
    if (modalContainer) {
      modalContainer.innerHTML = html;
    }
  }

  function closeModal() {
    var modalContainer = document.getElementById('noteModal');
    if (modalContainer) {
      modalContainer.innerHTML = '';
    }
    editingNoteId = null;
  }

  function saveNote(existingId) {
    var agentSelect = document.getElementById('modalAgent');
    var dateInput = document.getElementById('modalDate');
    var notesInput = document.getElementById('modalNotes');
    var actionItemsInput = document.getElementById('modalActionItems');

    if (!agentSelect || !dateInput || !notesInput) return;

    var agentUsername = agentSelect.value;
    var date = dateInput.value;
    var notesText = notesInput.value.trim();
    var actionItems = actionItemsInput ? actionItemsInput.value.trim() : '';

    if (!agentUsername) {
      showToast('Please select an agent', 'error');
      return;
    }
    if (!date) {
      showToast('Please select a date', 'error');
      return;
    }
    if (!notesText) {
      showToast('Please enter meeting notes', 'error');
      return;
    }

    // Look up agent display name
    var users = getUsers();
    var agentUser = users.find(function (u) { return u.username === agentUsername; });
    var agentName = agentUser ? agentUser.displayName : agentUsername;

    var notes = getNotes();

    if (existingId) {
      // Update
      var idx = -1;
      for (var i = 0; i < notes.length; i++) {
        if (notes[i].id === existingId) { idx = i; break; }
      }
      if (idx === -1) {
        showToast('Note not found', 'error');
        return;
      }
      notes[idx].agentUsername = agentUsername;
      notes[idx].agentName = agentName;
      notes[idx].date = date;
      notes[idx].notes = notesText;
      notes[idx].actionItems = actionItems;
      notes[idx].updatedAt = new Date().toISOString();
      saveNotes(notes);
      showToast('Meeting note updated');
    } else {
      // Create
      var newNote = {
        id: generateId(),
        agentUsername: agentUsername,
        agentName: agentName,
        date: date,
        notes: notesText,
        actionItems: actionItems,
        createdBy: session.username,
        createdByName: session.displayName,
        createdAt: new Date().toISOString()
      };
      notes.push(newNote);
      saveNotes(notes);
      showToast('Meeting note created');
    }

    closeModal();
    expandedNoteId = null;
    render();
  }

  // ---- Event delegation ----
  document.addEventListener('click', function (e) {
    var target = e.target;
    var actionEl = target.closest('[data-action]');
    if (!actionEl) return;

    var action = actionEl.getAttribute('data-action');
    var noteId = actionEl.getAttribute('data-id');

    if (action === 'add-note') {
      e.stopPropagation();
      showModal(null);
      return;
    }

    if (action === 'toggle-note') {
      if (expandedNoteId === noteId) {
        expandedNoteId = null;
      } else {
        expandedNoteId = noteId;
      }
      render();
      return;
    }

    if (action === 'edit-note') {
      e.stopPropagation();
      var notes = getNotes();
      var note = notes.find(function (n) { return n.id === noteId; });
      if (note) {
        editingNoteId = noteId;
        showModal(note);
      }
      return;
    }

    if (action === 'delete-note') {
      e.stopPropagation();
      if (!confirm('Are you sure you want to delete this meeting note?')) return;
      var allNotes = getNotes();
      var filtered = allNotes.filter(function (n) { return n.id !== noteId; });
      saveNotes(filtered);
      expandedNoteId = null;
      showToast('Meeting note deleted');
      render();
      return;
    }

    if (action === 'save-note') {
      e.stopPropagation();
      var editId = actionEl.getAttribute('data-id');
      saveNote(editId || null);
      return;
    }

    if (action === 'close-modal') {
      closeModal();
      return;
    }
  });

  // ---- Init ----
  render();

})();
