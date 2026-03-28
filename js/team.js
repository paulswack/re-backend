/* ============================================================
   RE Back Office — Team Member Management
   ============================================================ */

(function () {
  'use strict';

  // ---- Auth gate ----
  Auth.requireAuth();

  if (!Auth.isPrivileged()) {
    document.getElementById('pageBody').innerHTML =
      '<div class="empty-state" style="padding:80px 40px;">' +
        '<svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>' +
        '<h3>Access Denied</h3>' +
        '<p>Only Team Leads can manage team members.</p>' +
      '</div>';
    document.getElementById('statsGrid').style.display = 'none';
    document.getElementById('addMemberBtn').style.display = 'none';
    populateSidebarUser();
    setActiveNav();
    initSidebarToggle();
    return;
  }

  // ---- Helpers ----
  var PREFIX = 'reb_';

  function getUsers() {
    return JSON.parse(localStorage.getItem(PREFIX + 'users') || '[]');
  }

  function saveUsers(users) {
    localStorage.setItem(PREFIX + 'users', JSON.stringify(users));
  }

  // ---- Render stats ----
  function renderStats() {
    var users = getUsers();
    var admins = users.filter(function (u) { return u.role === 'Team Lead'; }).length;
    var agents = users.length - admins;

    document.getElementById('statsGrid').innerHTML =
      '<div class="stat-card">' +
        '<div class="stat-icon indigo"><svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg></div>' +
        '<div><div class="stat-value">' + users.length + '</div><div class="stat-label">Total Members</div></div>' +
      '</div>' +
      '<div class="stat-card">' +
        '<div class="stat-icon violet"><svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg></div>' +
        '<div><div class="stat-value">' + admins + '</div><div class="stat-label">Admins / Leads</div></div>' +
      '</div>' +
      '<div class="stat-card">' +
        '<div class="stat-icon emerald"><svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>' +
        '<div><div class="stat-value">' + agents + '</div><div class="stat-label">Agents</div></div>' +
      '</div>';
  }

  // ---- Render table ----
  function renderTable() {
    var users = getUsers();
    var session = Auth.getSession();
    var tbody = document.getElementById('membersBody');

    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><p>No team members yet.</p></td></tr>';
      return;
    }

    tbody.innerHTML = users.map(function (u) {
      var cls = agentClass(u.displayName);
      var isSelf = u.username === session.username;
      return '<tr>' +
        '<td style="width:48px;"><div class="agent-avatar ' + cls + '">' + getInitials(u.displayName) + '</div></td>' +
        '<td><strong>' + escapeHtml(u.displayName) + '</strong>' + (isSelf ? ' <span class="badge badge-active">You</span>' : '') + '</td>' +
        '<td style="color:var(--gray-400);">' + escapeHtml(u.username) + '</td>' +
        '<td><span class="badge ' + roleBadge(u.role) + '">' + escapeHtml(u.role) + '</span></td>' +
        '<td style="text-align:right;">' +
          '<button class="btn btn-outline btn-sm" data-action="edit" data-username="' + escapeHtml(u.username) + '" style="margin-right:4px;">Edit</button>' +
          (isSelf ? '' : '<button class="btn btn-danger btn-sm" data-action="delete" data-username="' + escapeHtml(u.username) + '">Delete</button>') +
        '</td>' +
      '</tr>';
    }).join('');
  }

  function roleBadge(role) {
    if (role === 'Team Lead') return 'badge-closed';
    if (role === 'Team Lead') return 'badge-active';
    return 'badge-pending';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ---- Modal helpers ----
  var modal = document.getElementById('memberModal');

  function openModal(editUser) {
    document.getElementById('modalTitle').textContent = editUser ? 'Edit Member' : 'Add Member';
    document.getElementById('editUsername').value = editUser ? editUser.username : '';
    document.getElementById('mDisplayName').value = editUser ? editUser.displayName : '';
    document.getElementById('mUsername').value = editUser ? editUser.username : '';
    document.getElementById('mPassword').value = editUser ? editUser.password : '';
    document.getElementById('mRole').value = editUser ? editUser.role : 'Senior Agent';

    // Populate assigned-to dropdown with non-assistant users
    var assignSelect = document.getElementById('mAssignedTo');
    var users = getUsers();
    assignSelect.innerHTML = '<option value="">— Select Agent —</option>' +
      users.filter(function (u) { return u.role !== 'Assistant'; }).map(function (u) {
        var sel = editUser && editUser.assignedTo === u.username ? ' selected' : '';
        return '<option value="' + u.username + '"' + sel + '>' + u.displayName + ' (' + u.role + ')</option>';
      }).join('');

    // Show/hide assigned-to based on role
    var roleSelect = document.getElementById('mRole');
    var assignGroup = document.getElementById('assignedToGroup');
    assignGroup.style.display = roleSelect.value === 'Assistant' ? 'block' : 'none';
    roleSelect.onchange = function () {
      assignGroup.style.display = this.value === 'Assistant' ? 'block' : 'none';
    };

    // Disable username change on edit
    document.getElementById('mUsername').disabled = !!editUser;

    modal.classList.add('open');
  }

  function closeModal() {
    modal.classList.remove('open');
    document.getElementById('memberForm').reset();
    document.getElementById('mUsername').disabled = false;
  }

  function saveMember() {
    var editUsername = document.getElementById('editUsername').value;
    var displayName = document.getElementById('mDisplayName').value.trim();
    var username = document.getElementById('mUsername').value.trim();
    var password = document.getElementById('mPassword').value.trim();
    var role = document.getElementById('mRole').value;
    var assignedTo = role === 'Assistant' ? document.getElementById('mAssignedTo').value : '';

    if (!displayName || !username || !password) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    if (role === 'Assistant' && !assignedTo) {
      showToast('Please select who this assistant is assigned to', 'error');
      return;
    }

    var users = getUsers();

    if (editUsername) {
      // Editing
      var idx = users.findIndex(function (u) { return u.username === editUsername; });
      if (idx === -1) { showToast('User not found', 'error'); return; }
      users[idx].displayName = displayName;
      users[idx].password = password;
      users[idx].role = role;
      users[idx].assignedTo = assignedTo;

      // Update session if editing self
      var session = Auth.getSession();
      if (session && session.username === editUsername) {
        session.displayName = displayName;
        session.role = role;
        localStorage.setItem('reb_session', JSON.stringify(session));
        populateSidebarUser();
      }

      saveUsers(users);
      showToast('Member updated');
    } else {
      // Adding — check for duplicate username
      var exists = users.some(function (u) { return u.username === username; });
      if (exists) {
        showToast('Username already taken', 'error');
        return;
      }
      users.push({ username: username, password: password, displayName: displayName, role: role, assignedTo: assignedTo });
      saveUsers(users);
      showToast('Member added');
    }

    closeModal();
    renderStats();
    renderTable();
  }

  function deleteMember(username) {
    if (!confirm('Delete this team member? This cannot be undone.')) return;
    var users = getUsers();
    users = users.filter(function (u) { return u.username !== username; });
    saveUsers(users);
    showToast('Member deleted');
    renderStats();
    renderTable();
  }

  // ---- Event delegation ----
  document.addEventListener('click', function (e) {
    var action = e.target.getAttribute('data-action') || (e.target.closest('[data-action]') || {}).getAttribute && (e.target.closest('[data-action]') || {}).getAttribute('data-action');
    if (!action) return;

    var target = e.target.closest('[data-action]') || e.target;

    switch (action) {
      case 'closeModal':
        closeModal();
        break;
      case 'saveMember':
        saveMember();
        break;
      case 'edit':
        var editUn = target.getAttribute('data-username');
        var users = getUsers();
        var user = users.find(function (u) { return u.username === editUn; });
        if (user) openModal(user);
        break;
      case 'delete':
        var delUn = target.getAttribute('data-username');
        deleteMember(delUn);
        break;
    }
  });

  // Close modal on overlay click
  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeModal();
  });

  // Add member button
  document.getElementById('addMemberBtn').addEventListener('click', function () {
    openModal(null);
  });

  // Logout button
  var logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () { Auth.logout(); });
  }

  // ---- Init ----
  populateSidebarUser();
  setActiveNav();
  initSidebarToggle();
  renderStats();
  renderTable();

})();
