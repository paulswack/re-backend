/* ============================================================
   RE Back Office — Authentication & UI Helpers
   ============================================================ */

(function () {
  'use strict';

  var PREFIX = 'reb_';

  // ---- Inject settings + notifications CSS ----
  var settingsCSS = document.createElement('style');
  settingsCSS.textContent = [
    // Page loading overlay
    '.page-loader { position: fixed; inset: 0; background: var(--off-white, #F8F9FC); z-index: 9999; display: flex; flex-direction: column; align-items: center; justify-content: center; transition: opacity .3s; }',
    '.page-loader.fade-out { opacity: 0; pointer-events: none; }',
    '.page-loader-spinner { width: 36px; height: 36px; border: 3px solid var(--gray-200, #E2E6EF); border-top-color: var(--indigo, #002242); border-radius: 50%; animation: pageLoaderSpin .7s linear infinite; }',
    '@keyframes pageLoaderSpin { to { transform: rotate(360deg); } }',
    '.page-loader-text { margin-top: 12px; font-size: .85rem; color: var(--gray-400, #9BA5B7); font-weight: 600; }',
    '',
    // Notification bell styles
    '.notif-wrap { position: relative; }',
    '.notif-btn {',
    '  width: 32px; height: 32px; border-radius: 8px;',
    '  border: 1.5px solid var(--gray-200); background: var(--white);',
    '  cursor: pointer; display: flex; align-items: center; justify-content: center;',
    '  transition: all .15s; color: var(--gray-500); padding: 0; position: relative;',
    '}',
    '.notif-btn:hover { border-color: var(--gray-300); background: var(--gray-50); color: var(--gray-700); }',
    '.notif-btn svg { width: 18px; height: 18px; fill: currentColor; }',
    '.notif-badge {',
    '  position: absolute; top: -4px; right: -4px;',
    '  min-width: 16px; height: 16px; border-radius: 99px;',
    '  background: var(--rose); color: #fff; font-size: .6rem; font-weight: 700;',
    '  display: flex; align-items: center; justify-content: center; padding: 0 4px;',
    '}',
    '.notif-dd {',
    '  position: absolute; top: calc(100% + 6px); right: 0;',
    '  width: 340px; background: var(--white); border-radius: 12px;',
    '  box-shadow: 0 10px 40px rgba(0,0,0,.12), 0 0 0 1px rgba(0,0,0,.05);',
    '  z-index: 1001; opacity: 0; pointer-events: none;',
    '  transform: translateY(-4px); transition: all .15s; max-height: 420px; overflow-y: auto;',
    '}',
    '.notif-dd.open { opacity: 1; pointer-events: auto; transform: translateY(0); }',
    '.notif-dd-header {',
    '  padding: 12px 14px; border-bottom: 1px solid var(--gray-100);',
    '  display: flex; align-items: center; justify-content: space-between;',
    '}',
    '.notif-dd-title { font-size: .82rem; font-weight: 700; color: var(--gray-800); }',
    '.notif-dd-clear { font-size: .72rem; color: var(--indigo); cursor: pointer; border: none; background: none; font-weight: 600; }',
    '.notif-dd-clear:hover { text-decoration: underline; }',
    '.notif-item {',
    '  display: flex; gap: 10px; padding: 10px 14px; border-bottom: 1px solid var(--gray-50);',
    '  cursor: pointer; transition: background .1s;',
    '}',
    '.notif-item:hover { background: var(--gray-50); }',
    '.notif-item:last-child { border-bottom: none; }',
    '.notif-icon {',
    '  width: 32px; height: 32px; border-radius: 8px;',
    '  display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: .9rem;',
    '}',
    '.notif-icon.closing { background: #FEF3C7; }',
    '.notif-icon.status { background: var(--indigo-light); }',
    '.notif-icon.meeting { background: #F5F3FF; }',
    '.notif-icon.checklist { background: var(--emerald-light); }',
    '.notif-body { flex: 1; min-width: 0; }',
    '.notif-title { font-size: .82rem; font-weight: 600; color: var(--gray-800); }',
    '.notif-detail { font-size: .75rem; color: var(--gray-400); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
    '.notif-time { font-size: .65rem; color: var(--gray-300); margin-top: 2px; }',
    '.notif-empty { padding: 24px 14px; text-align: center; font-size: .82rem; color: var(--gray-400); }',
    '',
    // Settings dropdown styles (existing)
    '.settings-wrap { position: relative; }',
    '.settings-btn {',
    '  width: 32px; height: 32px; border-radius: 8px;',
    '  border: 1.5px solid var(--gray-200); background: var(--white);',
    '  cursor: pointer; display: flex; align-items: center; justify-content: center;',
    '  transition: all .15s; color: var(--gray-500); padding: 0;',
    '}',
    '.settings-btn:hover { border-color: var(--gray-300); background: var(--gray-50); color: var(--gray-700); }',
    '.settings-btn svg { width: 18px; height: 18px; fill: currentColor; }',
    '.settings-dd {',
    '  position: absolute; top: calc(100% + 6px); right: 0;',
    '  width: 220px; background: var(--white); border-radius: 12px;',
    '  box-shadow: 0 10px 40px rgba(0,0,0,.12), 0 0 0 1px rgba(0,0,0,.05);',
    '  z-index: 1000; padding: 6px; opacity: 0; pointer-events: none;',
    '  transform: translateY(-4px); transition: all .15s;',
    '}',
    '.settings-dd.open { opacity: 1; pointer-events: auto; transform: translateY(0); }',
    '.settings-dd-label {',
    '  font-size: .65rem; font-weight: 700; text-transform: uppercase;',
    '  letter-spacing: .6px; color: var(--gray-400); padding: 8px 10px 4px;',
    '}',
    '.settings-dd-item {',
    '  display: flex; align-items: center; gap: 10px;',
    '  padding: 8px 10px; border-radius: 8px; font-size: .85rem;',
    '  font-weight: 500; color: var(--gray-700); cursor: pointer;',
    '  text-decoration: none; border: none; background: none;',
    '  width: 100%; text-align: left; transition: background .1s;',
    '}',
    '.settings-dd-item:hover { background: var(--gray-50); color: var(--gray-800); }',
    '.settings-dd-item svg { width: 18px; height: 18px; fill: currentColor; flex-shrink: 0; }',
    '.settings-dd-item.danger { color: var(--rose); }',
    '.settings-dd-item.danger:hover { background: var(--rose-light); }',
    '.settings-dd-divider { height: 1px; background: var(--gray-100); margin: 4px 6px; }',
    '',
    // Onboarding wizard modal styles
    '.ob-overlay { position:fixed;inset:0;background:rgba(0,34,66,.55);z-index:10000;display:flex;align-items:center;justify-content:center;animation:obFadeIn .3s ease; }',
    '@keyframes obFadeIn { from{opacity:0} to{opacity:1} }',
    '@keyframes obSlideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }',
    '.ob-modal { background:#fff;border-radius:16px;width:460px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,.2);animation:obSlideUp .35s ease;overflow:hidden; }',
    '.ob-header { background:linear-gradient(135deg,var(--indigo,#002242),var(--navy-mid,#003366));padding:28px 32px 24px;text-align:center;color:#fff; }',
    '.ob-header h2 { font-size:1.35rem;font-weight:800;margin-bottom:4px; }',
    '.ob-header p { font-size:.85rem;opacity:.75;line-height:1.4; }',
    '.ob-body { padding:24px 32px 28px; }',
    '.ob-steps { display:flex;gap:6px;justify-content:center;margin-bottom:20px; }',
    '.ob-dot { width:8px;height:8px;border-radius:50%;background:var(--gray-200,#E2E6EF);transition:all .2s; }',
    '.ob-dot.active { background:var(--indigo,#002242);width:24px;border-radius:4px; }',
    '.ob-dot.done { background:var(--emerald,#1A7F4B); }',
    '.ob-field { margin-bottom:14px; }',
    '.ob-field label { display:block;font-size:.78rem;font-weight:600;color:var(--gray-600,#5A6478);margin-bottom:4px; }',
    '.ob-field input, .ob-field select { width:100%;padding:9px 12px;border:1.5px solid var(--gray-200,#E2E6EF);border-radius:8px;font-size:.88rem;color:var(--gray-800,#2D3444);background:#fff;transition:border-color .15s;outline:none;font-family:inherit; }',
    '.ob-field input:focus, .ob-field select:focus { border-color:var(--indigo,#002242); }',
    '.ob-field .ob-optional { font-weight:400;color:var(--gray-400,#9BA5B7);font-size:.72rem;margin-left:4px; }',
    '.ob-actions { display:flex;gap:10px;margin-top:20px; }',
    '.ob-btn { flex:1;padding:10px 20px;border-radius:8px;font-size:.88rem;font-weight:700;cursor:pointer;transition:all .15s;border:none;font-family:inherit; }',
    '.ob-btn-primary { background:var(--indigo,#002242);color:#fff; }',
    '.ob-btn-primary:hover { background:var(--navy-mid,#003366); }',
    '.ob-btn-skip { background:none;color:var(--gray-400,#9BA5B7);flex:0 0 auto;padding:10px 12px;font-size:.82rem; }',
    '.ob-btn-skip:hover { color:var(--gray-600,#5A6478); }',
    '.ob-success-icon { width:56px;height:56px;border-radius:50%;background:var(--emerald-light,#E6F5EE);display:flex;align-items:center;justify-content:center;margin:0 auto 16px; }',
    '.ob-success-icon svg { width:28px;height:28px;fill:var(--emerald,#1A7F4B); }',
    '.ob-center { text-align:center; }',
    '.ob-center h3 { font-size:1.15rem;font-weight:800;color:var(--gray-800,#2D3444);margin-bottom:6px; }',
    '.ob-center p { font-size:.85rem;color:var(--gray-500,#5A6478);line-height:1.5; }'
  ].join('\n');
  document.head.appendChild(settingsCSS);

  // ---- Seed default users on first load ----
  function seedUsers() {
    // Always ensure admin user has Team Lead role
    var existing = localStorage.getItem(PREFIX + 'users');
    if (existing) {
      try {
        var users = JSON.parse(existing);
        var adminUser = users.find(function(u) { return u.username === 'admin'; });
        if (adminUser && adminUser.role === 'Administrator') {
          adminUser.role = 'Team Lead';
          localStorage.setItem(PREFIX + 'users', JSON.stringify(users));
          // Also fix session if logged in as admin
          var sess = localStorage.getItem(PREFIX + 'session');
          if (sess) {
            var s = JSON.parse(sess);
            if (s.username === 'admin' && s.role === 'Administrator') {
              s.role = 'Team Lead';
              localStorage.setItem(PREFIX + 'session', JSON.stringify(s));
            }
          }
        }
      } catch(e) {}
      return;
    }
    var users = [
      { username: 'admin',  password: 'admin123', displayName: 'Jennifer Walsh', role: 'Team Lead' },
      { username: 'agent1', password: 'demo123',  displayName: 'Marcus Rivera',  role: 'Broker Associate' },
      { username: 'agent2', password: 'demo123',  displayName: 'Sarah Chen',     role: 'Agent' }
    ];
    localStorage.setItem(PREFIX + 'users', JSON.stringify(users));
  }
  seedUsers();

  // ---- Auth object ----
  var Auth = {
    login: function (username, password) {
      var users = JSON.parse(localStorage.getItem(PREFIX + 'users') || '[]');
      var user = users.find(function (u) {
        return u.username === username && u.password === password;
      });
      if (!user) return false;
      var session = {
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        loggedInAt: new Date().toISOString()
      };
      localStorage.setItem(PREFIX + 'session', JSON.stringify(session));
      return true;
    },

    logout: function () {
      localStorage.removeItem(PREFIX + 'session');
      localStorage.removeItem(PREFIX + 'jwt');
      localStorage.removeItem(PREFIX + 'user_cache');
      if (typeof API !== 'undefined' && API.clearSession) {
        API.clearSession();
      }
      window.location.href = 'index.html';
    },

    getSession: function () {
      var raw = localStorage.getItem(PREFIX + 'session');
      return raw ? JSON.parse(raw) : null;
    },

    isLoggedIn: function () {
      return !!Auth.getSession();
    },

    requireAuth: function () {
      // Check API auth first, then localStorage
      if (typeof API !== 'undefined' && API.isLoggedIn()) return;
      if (!Auth.isLoggedIn()) {
        window.location.href = 'login.html';
      }
    },

    isPrivileged: function () {
      var session = Auth.getSession();
      if (!session) return false;
      return session.role === 'Team Lead';
    },

    isDemo: function () {
      return localStorage.getItem(PREFIX + 'demo_mode') === 'true';
    },

    startDemo: function (mode) {
      // Clear everything first
      Object.keys(localStorage).forEach(function (k) {
        if (k.indexOf(PREFIX) === 0) localStorage.removeItem(k);
      });
      localStorage.setItem(PREFIX + 'demo_mode', 'true');
      localStorage.setItem(PREFIX + 'demo_type', mode); // 'solo' or 'team'
      // Seed demo data
      seedDemoData(mode);
      // Auto-login
      var session = {
        username: mode === 'solo' ? 'demo_agent' : 'admin',
        displayName: mode === 'solo' ? 'Alex Morgan' : 'Jennifer Walsh',
        role: 'Team Lead',
        loggedInAt: new Date().toISOString()
      };
      localStorage.setItem(PREFIX + 'session', JSON.stringify(session));
      window.location.href = 'dashboard.html';
    },

    exitDemo: function () {
      Object.keys(localStorage).forEach(function (k) {
        if (k.indexOf(PREFIX) === 0) localStorage.removeItem(k);
      });
      window.location.href = 'index.html';
    },

    isAssistant: function () {
      var session = Auth.getSession();
      if (!session) return false;
      return session.role === 'Assistant';
    },

    getAssignedAgent: function () {
      // Returns the user object this assistant is assigned to
      var session = Auth.getSession();
      if (!session || session.role !== 'Assistant') return null;
      var users = JSON.parse(localStorage.getItem(PREFIX + 'users') || '[]');
      var me = users.find(function (u) { return u.username === session.username; });
      if (!me || !me.assignedTo) return null;
      return users.find(function (u) { return u.username === me.assignedTo; }) || null;
    }
  };

  // ---- Helper: get initials from a full name ----
  function getInitials(name) {
    if (!name) return '??';
    var parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  // ---- Helper: agent avatar class (a-e cycling based on name hash) ----
  function agentClass(name) {
    if (!name) return 'a';
    var hash = 0;
    for (var i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    var classes = ['a', 'b', 'c', 'd', 'e'];
    return classes[Math.abs(hash) % classes.length];
  }

  // ---- Helper: toast notification ----
  function showToast(message, type) {
    type = type || 'success';
    var toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3000);
  }

  // ---- Helper: populate sidebar user block ----
  function populateSidebarUser() {
    var session = Auth.getSession();
    if (!session) return;

    var nameEl = document.querySelector('.sidebar-user-name');
    var roleEl = document.querySelector('.sidebar-user-role');
    var avatarEl = document.querySelector('.sidebar-user-avatar');

    if (nameEl) nameEl.textContent = session.displayName;
    if (roleEl) roleEl.textContent = session.role;

    // Load profile photo if exists
    var profiles = {};
    try { profiles = JSON.parse(localStorage.getItem('reb_profiles') || '{}'); } catch(e) {}
    var myProfile = profiles[session.username] || {};

    if (avatarEl) {
      if (myProfile.photo) {
        avatarEl.innerHTML = '<img src="' + myProfile.photo + '" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">';
      } else {
        avatarEl.textContent = getInitials(session.displayName);
      }
    }

    // Make sidebar user area clickable → go to profile
    var userArea = document.getElementById('sidebarUser') || document.querySelector('.sidebar-user');
    if (userArea) {
      userArea.style.cursor = 'pointer';
      userArea.title = 'Edit your profile & photo';
      userArea.addEventListener('click', function () {
        window.location.href = 'profile.html';
      });
    }
  }

  // ---- Helper: highlight active nav item based on current filename ----
  function setActiveNav() {
    var path = window.location.pathname;
    var filename = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
    var sidebarNav = document.querySelector('.sidebar-nav');
    var navItems = sidebarNav ? sidebarNav.querySelectorAll('.nav-item[data-page]') : [];

    // Reorder nav items based on saved order
    try {
      var raw = localStorage.getItem(PREFIX + 'admin_settings');
      if (raw) {
        var settings = JSON.parse(raw);
        var order = settings.sidebarOrder;
        if (order && order.length && sidebarNav) {
          // Build a map of href -> element
          var itemMap = {};
          navItems.forEach(function (item) {
            itemMap[item.getAttribute('data-page')] = item;
          });
          // Reinsert in saved order
          order.forEach(function (page) {
            if (itemMap[page]) {
              sidebarNav.appendChild(itemMap[page]);
              delete itemMap[page];
            }
          });
          // Append any remaining items not in the order (new pages)
          Object.keys(itemMap).forEach(function (page) {
            sidebarNav.appendChild(itemMap[page]);
          });
        }
      }
    } catch (e) {}

    // Re-query after reorder
    navItems = sidebarNav ? sidebarNav.querySelectorAll('.nav-item[data-page]') : [];
    navItems.forEach(function (item) {
      var href = item.getAttribute('href');
      if (href === filename) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
      // Hide admin-only nav items for non-privileged users
      if ((href === 'recruiting.html' || href === 'meeting-notes.html' || href === 'team.html' || href === 'admin-settings.html') && !Auth.isPrivileged()) {
        item.style.display = 'none';
      }
    });
    // Hide "Team" nav label for non-privileged users
    var teamLabel = document.getElementById('navTeamLabel');
    if (teamLabel && !Auth.isPrivileged()) {
      teamLabel.style.display = 'none';
    }
  }

  // ---- Helper: mobile sidebar toggle ----
  function initSidebarToggle() {
    var hamburger = document.querySelector('.hamburger');
    var sidebar = document.querySelector('.sidebar');
    if (!hamburger || !sidebar) return;

    hamburger.addEventListener('click', function () {
      sidebar.classList.toggle('open');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function (e) {
      if (sidebar.classList.contains('open') &&
          !sidebar.contains(e.target) &&
          !hamburger.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });
  }

  // ---- Settings dropdown ----
  function initSettingsDropdown() {
    var topbarActions = document.querySelector('.topbar-actions');
    if (!topbarActions) return;

    // Don't double-init
    if (topbarActions.querySelector('.settings-wrap')) return;

    var session = Auth.getSession();
    if (!session) return;

    var wrap = document.createElement('div');
    wrap.className = 'settings-wrap';

    // Gear button
    var btn = document.createElement('button');
    btn.className = 'settings-btn';
    btn.title = 'Settings';
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 00-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1112 8.4a3.6 3.6 0 010 7.2z"/></svg>';
    wrap.appendChild(btn);

    // Dropdown
    var dd = document.createElement('div');
    dd.className = 'settings-dd';

    dd.innerHTML = '';

    // Team Members & Team Customization (only for Team Lead)
    if (Auth.isPrivileged()) {
      dd.innerHTML += '<a href="team.html" class="settings-dd-item">' +
          '<svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>' +
          'Team Members' +
        '</a>' +
        '<a href="admin-settings.html" class="settings-dd-item">' +
          '<svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 00-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1112 8.4a3.6 3.6 0 010 7.2z"/></svg>' +
          'Team Customization' +
        '</a>' +
        '<div class="settings-dd-divider"></div>';
    }


    wrap.appendChild(dd);

    // Insert at the beginning of topbar-actions
    topbarActions.insertBefore(wrap, topbarActions.firstChild);

    // Toggle dropdown
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      dd.classList.toggle('open');
    });

    // Close on outside click
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) {
        dd.classList.remove('open');
      }
    });

  }

  // ---- Auto-init settings dropdown on every page ----
  document.addEventListener('DOMContentLoaded', function () {
    initSettingsDropdown();
  });

  // ---- Solo mode helper ----
  function isSoloMode() {
    return localStorage.getItem('reb_plan_mode') === 'solo';
  }

  // ---- Hide team-only nav in solo mode ----
  function applySoloMode() {
    if (!isSoloMode()) return;
    var teamPages = ['leaderboard.html'];
    var navItems = document.querySelectorAll('.nav-item[data-page]');
    navItems.forEach(function (item) {
      var href = item.getAttribute('data-page') || item.getAttribute('href');
      if (teamPages.indexOf(href) !== -1) {
        item.style.display = 'none';
      }
    });
  }

  // Hide tax center for assistants
  function applyAssistantMode() {
    if (!Auth.isAssistant()) return;
    var navItems = document.querySelectorAll('.nav-item[data-page]');
    navItems.forEach(function (item) {
      var href = item.getAttribute('data-page') || item.getAttribute('href');
      if (href === 'tax-center.html') {
        item.style.display = 'none';
      }
    });
  }

  // ---- Apply theme colors from admin settings ----
  function applyTheme() {
    var theme = getAdminSetting('theme', null);
    if (!theme) return;

    var root = document.documentElement;

    // Map theme keys → CSS variable names
    var mapping = {
      primary:       '--indigo',
      primaryLight:  '--indigo-light',
      primaryDark:   '--indigo-dark',
      accent:        '--violet',
      success:       '--emerald',
      successLight:  '--emerald-light',
      warning:       '--amber',
      warningLight:  '--amber-light',
      danger:        '--rose',
      dangerLight:   '--rose-light',
      bodyBg:        '--off-white'
    };

    Object.keys(mapping).forEach(function (themeKey) {
      if (theme[themeKey]) {
        var val = theme[themeKey];
        // Fix invalid hex+alpha like "#6366F118" → convert to proper rgba
        if (/^#[0-9A-Fa-f]{8}$/.test(val)) {
          var hex6 = val.substring(0, 7);
          var alphaHex = val.substring(7, 9);
          var alpha = parseInt(alphaHex, 16) / 255;
          var r = parseInt(hex6.substring(1, 3), 16);
          var g = parseInt(hex6.substring(3, 5), 16);
          var b = parseInt(hex6.substring(5, 7), 16);
          val = 'rgba(' + r + ',' + g + ',' + b + ',' + alpha.toFixed(2) + ')';
        }
        root.style.setProperty(mapping[themeKey], val);
      }
    });

    // Deal source colors
    if (theme.dealSourceCircleBg) root.style.setProperty('--deal-source-circle-bg', theme.dealSourceCircleBg);
    if (theme.dealSourceCircleText) root.style.setProperty('--deal-source-circle-text', theme.dealSourceCircleText);
    if (theme.dealSourceBarStart) root.style.setProperty('--deal-source-bar-start', theme.dealSourceBarStart);
    if (theme.dealSourceBarEnd) root.style.setProperty('--deal-source-bar-end', theme.dealSourceBarEnd);

    // Sidebar — apply directly to avoid overriding --white (used by cards, modals, etc.)
    var sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      if (theme.sidebarBg) sidebar.style.background = theme.sidebarBg;
      if (theme.sidebarText) {
        var navItems = sidebar.querySelectorAll('.nav-item:not(.active)');
        navItems.forEach(function (item) { item.style.color = theme.sidebarText; });
      }
      if (theme.sidebarActiveText) {
        var activeItems = sidebar.querySelectorAll('.nav-item.active');
        activeItems.forEach(function (item) { item.style.color = theme.sidebarActiveText; });
      }
      if (theme.sidebarActiveBg) {
        var activeItems = sidebar.querySelectorAll('.nav-item.active');
        activeItems.forEach(function (item) { item.style.background = theme.sidebarActiveBg; });
      }
    }

    // Dashboard welcome banner gradient
    var welcome = document.querySelector('.dash-welcome');
    if (welcome && theme.headerGradientStart && theme.headerGradientEnd) {
      welcome.style.background = 'linear-gradient(135deg, ' + theme.headerGradientStart + ' 0%, ' + theme.headerGradientEnd + ' 100%)';
    }

    // Body background
    if (theme.bodyBg) {
      document.body.style.background = theme.bodyBg;
      root.style.setProperty('--off-white', theme.bodyBg);
    }
  }

  // ---- Notifications System ----
  var NOTIF_KEY = PREFIX + 'notifications';
  var NOTIF_READ_KEY = PREFIX + 'notifications_read';

  function getNotifications() {
    try { return JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]'); } catch (e) { return []; }
  }

  function saveNotifications(arr) {
    // Keep last 50 max
    if (arr.length > 50) arr = arr.slice(arr.length - 50);
    localStorage.setItem(NOTIF_KEY, JSON.stringify(arr));
  }

  function getReadIds() {
    try {
      var all = JSON.parse(localStorage.getItem(NOTIF_READ_KEY) || '{}');
      var session = Auth.getSession();
      return session ? (all[session.username] || []) : [];
    } catch (e) { return []; }
  }

  function markAllRead() {
    var session = Auth.getSession();
    if (!session) return;
    var all;
    try { all = JSON.parse(localStorage.getItem(NOTIF_READ_KEY) || '{}'); } catch (e) { all = {}; }
    var notifs = getNotifications();
    all[session.username] = notifs.map(function (n) { return n.id; });
    localStorage.setItem(NOTIF_READ_KEY, JSON.stringify(all));
  }

  function addNotification(opts) {
    var notifs = getNotifications();
    // Dedup by type + linkId + targetUser
    var exists = notifs.find(function (n) {
      return n.type === opts.type && n.linkId === opts.linkId && n.targetUser === opts.targetUser;
    });
    if (exists) return;
    notifs.push({
      id: Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5),
      type: opts.type || 'info',
      title: opts.title || '',
      detail: opts.detail || '',
      linkPage: opts.linkPage || '',
      linkId: opts.linkId || '',
      targetUser: opts.targetUser || null,
      createdAt: new Date().toISOString()
    });
    saveNotifications(notifs);
  }

  function generateNotifications() {
    var session = Auth.getSession();
    if (!session) return;

    var notifs = getNotifications();
    var now = new Date();
    var users = JSON.parse(localStorage.getItem(PREFIX + 'users') || '[]');

    // Closing within 7 days
    try {
      var txns = JSON.parse(localStorage.getItem(PREFIX + 'transactions') || '[]');
      txns.forEach(function (t) {
        if (t.status === 'closed' || !t.closeDate) return;
        var close = new Date(t.closeDate);
        var daysLeft = Math.ceil((close - now) / (1000 * 60 * 60 * 24));
        if (daysLeft >= 0 && daysLeft <= 7) {
          var agentUser = users.find(function (u) { return u.displayName === t.agent; });
          var targetUser = agentUser ? agentUser.username : null;
          var dup = notifs.find(function (n) { return n.type === 'closing_soon' && n.linkId === t.id; });
          if (!dup) {
            notifs.push({
              id: Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5),
              type: 'closing_soon',
              title: daysLeft === 0 ? 'Closing today!' : 'Closing in ' + daysLeft + ' day' + (daysLeft !== 1 ? 's' : ''),
              detail: t.address,
              linkPage: 'transactions.html',
              linkId: t.id,
              targetUser: targetUser,
              createdAt: new Date().toISOString()
            });
          }
        }
      });
    } catch (e) {}

    // New meeting notes in last 7 days
    try {
      var notes = JSON.parse(localStorage.getItem(PREFIX + 'meeting_notes') || '[]');
      notes.forEach(function (n) {
        var created = new Date(n.createdAt);
        var daysAgo = Math.floor((now - created) / (1000 * 60 * 60 * 24));
        if (daysAgo <= 7) {
          var dup = notifs.find(function (ex) { return ex.type === 'new_meeting_note' && ex.linkId === n.id; });
          if (!dup) {
            notifs.push({
              id: Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5),
              type: 'new_meeting_note',
              title: 'New meeting note',
              detail: 'Meeting with ' + (n.createdByName || 'Team Lead') + ' on ' + (n.date || ''),
              linkPage: 'meeting-notes.html',
              linkId: n.id,
              targetUser: n.agentUsername,
              createdAt: n.createdAt
            });
          }
        }
      });
    } catch (e) {}

    saveNotifications(notifs);
  }

  function relativeTimeShort(isoStr) {
    if (!isoStr) return '';
    var d = new Date(isoStr);
    var diffMs = new Date() - d;
    var diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'now';
    if (diffMin < 60) return diffMin + 'm';
    var diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return diffHr + 'h';
    var diffDay = Math.floor(diffHr / 24);
    return diffDay + 'd';
  }

  function initNotificationBell() {
    var topbarActions = document.querySelector('.topbar-actions');
    if (!topbarActions) return;
    if (topbarActions.querySelector('.notif-wrap')) return;
    var session = Auth.getSession();
    if (!session) return;

    var notifs = getNotifications();
    var readIds = getReadIds();

    // Filter to this user's notifications
    var myNotifs = notifs.filter(function (n) {
      return !n.targetUser || n.targetUser === session.username;
    }).sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });

    var unreadCount = myNotifs.filter(function (n) { return readIds.indexOf(n.id) === -1; }).length;

    var wrap = document.createElement('div');
    wrap.className = 'notif-wrap';

    var btn = document.createElement('button');
    btn.className = 'notif-btn';
    btn.title = 'Notifications';
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>';
    if (unreadCount > 0) {
      btn.innerHTML += '<span class="notif-badge">' + unreadCount + '</span>';
    }
    wrap.appendChild(btn);

    var dd = document.createElement('div');
    dd.className = 'notif-dd';

    var ddHtml = '<div class="notif-dd-header">';
    ddHtml += '<span class="notif-dd-title">Notifications</span>';
    if (myNotifs.length > 0) {
      ddHtml += '<button class="notif-dd-clear" id="notifMarkRead">Mark all read</button>';
    }
    ddHtml += '</div>';

    if (myNotifs.length === 0) {
      ddHtml += '<div class="notif-empty">No notifications</div>';
    } else {
      var iconMap = {
        closing_soon: { icon: '⏰', cls: 'closing' },
        status_change: { icon: '📌', cls: 'status' },
        new_meeting_note: { icon: '📋', cls: 'meeting' },
        checklist_overdue: { icon: '✅', cls: 'checklist' }
      };
      myNotifs.slice(0, 15).forEach(function (n) {
        var ic = iconMap[n.type] || { icon: '🔔', cls: 'status' };
        var isUnread = readIds.indexOf(n.id) === -1;
        ddHtml += '<div class="notif-item" data-notif-page="' + (n.linkPage || '') + '" data-notif-id="' + (n.linkId || '') + '" style="' + (isUnread ? 'background:var(--gray-50);' : '') + '">';
        ddHtml += '<div class="notif-icon ' + ic.cls + '">' + ic.icon + '</div>';
        ddHtml += '<div class="notif-body">';
        ddHtml += '<div class="notif-title">' + n.title + '</div>';
        if (n.detail) ddHtml += '<div class="notif-detail">' + n.detail + '</div>';
        ddHtml += '<div class="notif-time">' + relativeTimeShort(n.createdAt) + ' ago</div>';
        ddHtml += '</div></div>';
      });
    }

    dd.innerHTML = ddHtml;
    wrap.appendChild(dd);

    // Insert before settings gear
    var settingsWrap = topbarActions.querySelector('.settings-wrap');
    if (settingsWrap) {
      topbarActions.insertBefore(wrap, settingsWrap);
    } else {
      topbarActions.insertBefore(wrap, topbarActions.firstChild);
    }

    // Toggle dropdown
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      dd.classList.toggle('open');
      // Close settings dropdown if open
      var settingsDd = document.querySelector('.settings-dd');
      if (settingsDd) settingsDd.classList.remove('open');
    });

    // Close on outside click
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) dd.classList.remove('open');
    });

    // Mark all read
    var markBtn = dd.querySelector('#notifMarkRead');
    if (markBtn) {
      markBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        markAllRead();
        var badge = btn.querySelector('.notif-badge');
        if (badge) badge.remove();
        // Remove unread backgrounds
        dd.querySelectorAll('.notif-item').forEach(function (item) {
          item.style.background = '';
        });
        showToast('All notifications marked as read');
      });
    }

    // Click notification to navigate
    dd.querySelectorAll('.notif-item').forEach(function (item) {
      item.addEventListener('click', function () {
        var page = this.getAttribute('data-notif-page');
        if (page) window.location.href = page;
      });
    });
  }

  // ---- Loading overlay helpers ----
  function showPageLoader() {
    var page = window.location.pathname;
    if (page.indexOf('login') !== -1 || page.indexOf('index') !== -1 || page === '/') return;
    if (document.getElementById('pageLoader')) return;
    var loader = document.createElement('div');
    loader.className = 'page-loader';
    loader.id = 'pageLoader';
    loader.innerHTML = '<div class="page-loader-spinner"></div><div class="page-loader-text">Loading...</div>';
    document.body.appendChild(loader);
  }

  function hidePageLoader() {
    var loader = document.getElementById('pageLoader');
    if (!loader) return;
    loader.classList.add('fade-out');
    setTimeout(function () { if (loader.parentNode) loader.parentNode.removeChild(loader); }, 300);
  }

  // Auto-run on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', function () {
    // If API bridge is available, load server data into localStorage
    if (typeof ApiBridge !== 'undefined' && ApiBridge.isServerMode()) {
      showPageLoader();
      ApiBridge.init().then(function () {
        applySoloMode();
        applyAssistantMode();
        applyTheme();
        generateNotifications();
        initNotificationBell();
        initOnboarding();
        hidePageLoader();
      }).catch(function () {
        hidePageLoader();
      });
    } else {
      applySoloMode();
      applyAssistantMode();
      applyTheme();
      generateNotifications();
      initNotificationBell();
      initDemoBanner();
      initOnboarding();
    }
  });

  // ---- Demo Banner & Read-Only ----
  function initDemoBanner() {
    // Check if we need to seed demo data
    var pendingDemo = localStorage.getItem(PREFIX + 'demo_pending');
    if (pendingDemo) {
      localStorage.removeItem(PREFIX + 'demo_pending');
      seedDemoData(pendingDemo);
    }

    if (!Auth.isDemo()) return;
    var demoType = localStorage.getItem(PREFIX + 'demo_type') || 'team';

    // Inject banner
    var banner = document.createElement('div');
    banner.id = 'demoBanner';
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:linear-gradient(90deg,#EAB308,#F59E0B);color:#000;text-align:center;padding:8px 16px;font-size:.82rem;font-weight:700;display:flex;align-items:center;justify-content:center;gap:12px';
    banner.innerHTML = '👀 You\'re in <strong>' + (demoType === 'solo' ? 'Solo Agent' : 'Team') + ' Demo Mode</strong> — explore everything, changes won\'t save.' +
      '<button onclick="Auth.exitDemo()" style="background:#000;color:#fff;border:none;padding:5px 14px;border-radius:6px;font-size:.75rem;font-weight:700;cursor:pointer;margin-left:8px">Exit Demo</button>';
    document.body.prepend(banner);

    // Push content down
    document.body.style.paddingTop = '40px';

    // Block all localStorage writes for reb_ keys
    var origSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function (key, value) {
      if (key.indexOf(PREFIX) === 0 && key !== PREFIX + 'demo_mode' && key !== PREFIX + 'demo_type' && key !== PREFIX + 'session') {
        return; // silently block
      }
      origSetItem(key, value);
    };
    var origRemoveItem = localStorage.removeItem.bind(localStorage);
    localStorage.removeItem = function (key) {
      if (key.indexOf(PREFIX) === 0 && key !== PREFIX + 'demo_mode' && key !== PREFIX + 'demo_type' && key !== PREFIX + 'session') {
        return;
      }
      origRemoveItem(key);
    };

    // Override showToast to show "Demo mode" instead of success messages
    if (typeof window.showToast === 'function') {
      var origToast = window.showToast;
      window.showToast = function (msg, type) {
        if (type !== 'error') {
          origToast('Demo mode — changes are not saved', 'info');
        } else {
          origToast(msg, type);
        }
      };
    }
  }

  // ---- Demo Data Seeder ----
  function seedDemoData(mode) {
    var now = new Date();
    var y = now.getFullYear();
    var m = now.getMonth();

    // Users
    var users;
    if (mode === 'solo') {
      users = [
        { username: 'demo_agent', password: 'demo', displayName: 'Alex Morgan', role: 'Team Lead' }
      ];
    } else {
      users = [
        { username: 'admin', password: 'admin123', displayName: 'Jennifer Walsh', role: 'Team Lead' },
        { username: 'agent1', password: 'demo123', displayName: 'Marcus Rivera', role: 'Broker Associate' },
        { username: 'agent2', password: 'demo123', displayName: 'Sarah Chen', role: 'Agent' },
        { username: 'agent3', password: 'demo123', displayName: 'David Kim', role: 'Agent' },
        { username: 'asst1', password: 'demo123', displayName: 'Emily Torres', role: 'Assistant', assignedTo: 'admin' }
      ];
    }
    localStorage.setItem(PREFIX + 'users', JSON.stringify(users));

    var mainAgent = mode === 'solo' ? 'Alex Morgan' : 'Jennifer Walsh';
    var agents = mode === 'solo' ? [mainAgent] : ['Jennifer Walsh', 'Marcus Rivera', 'Sarah Chen', 'David Kim'];

    // Transactions
    var txns = [
      { id: 'txn_d1', address: '742 Evergreen Terrace, Springfield, IL 62704', type: 'Buyer', status: 'closed', price: 485000, agent: agents[0], closeDate: y + '-01-21', source: 'Referral', createdAt: y + '-01-01T10:00:00Z' },
      { id: 'txn_d2', address: '1024 Maple Ave, Austin, TX 78731', type: 'Seller', status: 'closed', price: 725000, agent: agents[0], closeDate: y + '-02-15', source: 'Zillow', createdAt: y + '-01-10T10:00:00Z' },
      { id: 'txn_d3', address: '550 Oak Lane, Denver, CO 80202', type: 'Buyer', status: 'pending', price: 395000, agent: agents[0], closeDate: y + '-05-01', source: 'Sphere of Influence', createdAt: y + '-03-01T10:00:00Z' },
      { id: 'txn_d4', address: '2200 Birch Dr, Portland, OR 97201', type: 'Buyer', status: 'active', price: 540000, agent: agents[0], source: 'Google / SEO', createdAt: y + '-03-15T10:00:00Z' }
    ];
    if (mode === 'team') {
      txns.push(
        { id: 'txn_d5', address: '810 Pine St, Seattle, WA 98101', type: 'Buyer', status: 'closed', price: 620000, agent: 'Marcus Rivera', closeDate: y + '-01-28', source: 'Referral', createdAt: y + '-01-05T10:00:00Z' },
        { id: 'txn_d6', address: '405 Cedar Blvd, San Diego, CA 92101', type: 'Seller', status: 'closed', price: 890000, agent: 'Marcus Rivera', closeDate: y + '-03-10', source: 'Open House', createdAt: y + '-02-01T10:00:00Z' },
        { id: 'txn_d7', address: '1600 Elm Way, Nashville, TN 37201', type: 'Buyer', status: 'pending', price: 350000, agent: 'Sarah Chen', closeDate: y + '-04-20', source: 'Social Media', createdAt: y + '-03-05T10:00:00Z' },
        { id: 'txn_d8', address: '900 Willow Ct, Scottsdale, AZ 85251', type: 'Buyer', status: 'closed', price: 475000, agent: 'Sarah Chen', closeDate: y + '-02-28', source: 'Zillow', createdAt: y + '-01-15T10:00:00Z' },
        { id: 'txn_d9', address: '3300 Aspen Ridge, Park City, UT 84060', type: 'Seller', status: 'active', price: 1200000, agent: 'David Kim', source: 'Referral', createdAt: y + '-03-20T10:00:00Z' }
      );
    }
    localStorage.setItem(PREFIX + 'transactions', JSON.stringify(txns));

    // Listings
    var listings = [
      { id: 'lst_d0', address: '88 Crestview Dr, Malibu, CA 90265', status: 'coming_soon', price: 1450000, agent: agents[0], beds: 5, baths: 4, sqft: 3600, source: 'Sphere of Influence', createdAt: y + '-03-20T10:00:00Z' },
      { id: 'lst_d1', address: '1500 Sunset Blvd, Los Angeles, CA 90028', status: 'active', price: 950000, agent: agents[0], beds: 4, baths: 3, sqft: 2800, listingDate: y + '-03-01', source: 'Sphere of Influence', createdAt: y + '-03-01T10:00:00Z' },
      { id: 'lst_d2', address: '220 Harbor View, Miami, FL 33101', status: 'active', price: 675000, agent: agents[0], beds: 3, baths: 2, sqft: 1950, listingDate: y + '-03-10', source: 'Referral', createdAt: y + '-03-10T10:00:00Z' },
      { id: 'lst_d5', address: '1024 Maple Ave, Austin, TX 78731', status: 'sold', price: 725000, agent: agents[0], beds: 4, baths: 3, sqft: 2400, listingDate: y + '-01-10', source: 'Zillow', createdAt: y + '-01-10T10:00:00Z' }
    ];
    if (mode === 'team') {
      listings.push(
        { id: 'lst_d3', address: '875 Mountain Dr, Boulder, CO 80301', status: 'active', price: 820000, agent: 'Marcus Rivera', beds: 5, baths: 4, sqft: 3400, listingDate: y + '-02-20', source: 'Cold Call / Door Knock', createdAt: y + '-02-20T10:00:00Z' },
        { id: 'lst_d4', address: '460 Lakefront Rd, Chicago, IL 60601', status: 'pending', price: 550000, agent: 'Sarah Chen', beds: 3, baths: 2, sqft: 2100, listingDate: y + '-03-05', source: 'Open House', createdAt: y + '-03-05T10:00:00Z' }
      );
    }
    localStorage.setItem(PREFIX + 'listings', JSON.stringify(listings));

    // Parties
    var parties = {};
    parties['txn_d3'] = {
      buyers: [{ name: 'John Thompson', phone: '555-0101', email: 'john@email.com' }],
      sellers: [{ name: 'Robert Garcia', phone: '555-0201' }],
      lender: 'First National Mortgage — Mark Stevens',
      titleCompany: 'Horizon Title Services'
    };
    localStorage.setItem(PREFIX + 'txn_parties', JSON.stringify(parties));

    // Transaction updates
    var updates = {};
    updates['txn_d3'] = [
      { type: 'offer_accepted', title: 'Offer Accepted!', detail: 'Offer at $395,000 accepted.', timestamp: y + '-03-02T14:30:00Z', by: agents[0] },
      { type: 'earnest_deposited', title: 'EMD Deposited', detail: '$5,000 deposited.', timestamp: y + '-03-05T09:00:00Z', by: agents[0] },
      { type: 'inspection_scheduled', title: 'Inspection Scheduled', detail: 'March 12 at 10 AM.', timestamp: y + '-03-08T11:00:00Z', by: agents[0] },
      { type: 'inspection_complete', title: 'Inspection Complete', detail: 'Minor items found.', timestamp: y + '-03-12T16:00:00Z', by: agents[0] }
    ];
    localStorage.setItem(PREFIX + 'txn_updates', JSON.stringify(updates));

    // Portal links
    var portalLinks = [
      { token: 'demo_portal', txnId: 'txn_d3', type: 'transaction', clientName: 'John Thompson', createdAt: y + '-03-02T10:00:00Z', createdBy: agents[0] }
    ];
    localStorage.setItem(PREFIX + 'portal_links', JSON.stringify(portalLinks));

    // Goals
    var goalData = {};
    agents.forEach(function (a) {
      goalData[a] = { closings: mode === 'solo' ? 12 : 8, volume: mode === 'solo' ? 3000000 : 2000000 };
    });
    localStorage.setItem(PREFIX + 'agent_goals', JSON.stringify(goalData));

    // Vendors
    var vendors = [
      { id: 'v1', name: 'Horizon Title Services', category: 'Title Company', phone: '555-0301', email: 'info@horizontitle.com', notes: 'Fast closings, great communication', rating: 5, is_preferred: true },
      { id: 'v2', name: 'First National Mortgage', category: 'Lender', phone: '555-0302', email: 'loans@firstnational.com', notes: 'Competitive rates, pre-approvals in 24hrs', rating: 5, is_preferred: true },
      { id: 'v3', name: 'Eagle Eye Inspections', category: 'Inspector', phone: '555-0303', email: 'schedule@eagleeye.com', notes: 'Same-day reports', rating: 4, is_preferred: false },
      { id: 'v4', name: 'Showcase Photography', category: 'Photographer', phone: '555-0304', email: 'book@showcase.com', notes: 'Drone + twilight shots available', rating: 5, is_preferred: true },
      { id: 'v5', name: 'CleanSlate Staging', category: 'Stager', phone: '555-0305', email: 'hello@cleanslate.com', notes: 'Modern luxury staging', rating: 4, is_preferred: false }
    ];
    localStorage.setItem(PREFIX + 'vendors', JSON.stringify(vendors));

    // Meeting notes
    var meetingNotes = [
      { id: 'mn1', agentUsername: mode === 'solo' ? 'demo_agent' : 'agent2', agentName: mode === 'solo' ? 'Alex Morgan' : 'Sarah Chen', createdByName: mainAgent, date: y + '-03-15', wins: 'Closed 2 deals this month, got 5-star review from Thompson family', challenges: 'Struggling with lead follow-up timing', goals_text: 'Close 2 more by end of quarter', notes: 'Discussed time-blocking strategy for lead follow-up. Sarah will try the 5-5-5 method.', createdAt: y + '-03-15T14:00:00Z' }
    ];
    localStorage.setItem(PREFIX + 'meeting_notes', JSON.stringify(meetingNotes));

    // Announcements
    var anns = [
      { id: 'ann1', text: 'Welcome to RE Back Office! Explore the demo to see how the system works.', author: mainAgent, timestamp: new Date().toISOString(), pinned: true },
      { id: 'ann2', text: 'Reminder: All listing photos must be uploaded within 48 hours of going active. Contact Showcase Photography for rush orders.', author: mainAgent, timestamp: new Date(Date.now() - 86400000).toISOString(), pinned: false }
    ];
    localStorage.setItem(PREFIX + 'announcements', JSON.stringify(anns));

    // Seed default checklist templates
    var templates = [
      { id: 'tpl-demo-1', name: 'Buyer Closing Checklist', category: 'escrow', items: [
        { id: 'i1', label: 'Open escrow' }, { id: 'i2', label: 'Deposit earnest money' }, { id: 'i3', label: 'Order inspections' },
        { id: 'i4', label: 'Review disclosures' }, { id: 'i5', label: 'Negotiate repairs' }, { id: 'i6', label: 'Order appraisal' },
        { id: 'i7', label: 'Loan approval' }, { id: 'i8', label: 'Remove contingencies' }, { id: 'i9', label: 'Final walkthrough' },
        { id: 'i10', label: 'Sign closing docs' }
      ]},
      { id: 'tpl-demo-2', name: 'New Listing Checklist', category: 'listing', items: [
        { id: 'j1', label: 'Listing agreement signed' }, { id: 'j2', label: 'Order inspections' }, { id: 'j3', label: 'Prelim & NHD' },
        { id: 'j4', label: 'Complete disclosures' }, { id: 'j5', label: 'Agent visual inspection' }, { id: 'j6', label: 'Stage home' },
        { id: 'j7', label: 'Professional photos' }, { id: 'j8', label: 'Go live on MLS' }
      ]}
    ];
    localStorage.setItem(PREFIX + 'checklist_templates', JSON.stringify(templates));
  }

  // ---- Onboarding Walkthrough ----
  var ONBOARDING_KEY = PREFIX + 'onboarding';
  var ONBOARDING_DONE_KEY = PREFIX + 'onboarding_done';

  function initOnboarding() {
    if (Auth.isDemo()) return;

    // Check both API and localStorage auth
    var isLoggedIn = (typeof API !== 'undefined' && API.isLoggedIn()) || Auth.isLoggedIn();
    if (!isLoggedIn) return;

    var isLead = (typeof API !== 'undefined' && API.isPrivileged()) || Auth.isPrivileged();

    // Show wizard modal for new users on dashboard who haven't completed it
    var currentPage = window.location.pathname.split('/').pop() || 'index.html';
    if (currentPage === 'dashboard.html' && !localStorage.getItem(ONBOARDING_DONE_KEY)) {
      showOnboardingWizard(isLead);
      return;
    }

    if (!isLead) return;

    var raw = localStorage.getItem(ONBOARDING_KEY);
    if (raw) {
      try {
        var ob = JSON.parse(raw);
        if (ob.dismissed) return;
      } catch(e) {}
    }

    // Always show onboarding for team leads who haven't dismissed it
    showOnboarding();
  }

  // ---- Onboarding Wizard Modal ----
  function showOnboardingWizard(isLead) {
    var currentStep = 0;
    var totalSteps = isLead ? 4 : 3; // skip "Add Agent" for non-leads
    var stepKeys = isLead ? ['welcome', 'team', 'agent', 'done'] : ['welcome', 'team', 'done'];

    // Get existing team name from admin settings
    var settings = typeof getAdminSettings === 'function' ? getAdminSettings() : {};
    var existingTeamName = (settings.general && settings.general.teamName) || 'RE Back Office';

    // Create overlay
    var overlay = document.createElement('div');
    overlay.className = 'ob-overlay';
    overlay.id = 'obWizardOverlay';

    var modal = document.createElement('div');
    modal.className = 'ob-modal';
    modal.id = 'obWizardModal';
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    function renderStep() {
      var key = stepKeys[currentStep];
      var h = '';

      // Dots
      var dots = '<div class="ob-steps">';
      for (var i = 0; i < totalSteps; i++) {
        var cls = 'ob-dot';
        if (i < currentStep) cls += ' done';
        else if (i === currentStep) cls += ' active';
        dots += '<div class="' + cls + '"></div>';
      }
      dots += '</div>';

      if (key === 'welcome') {
        h += '<div class="ob-header">';
        h += '<h2>Welcome to RE Back Office!</h2>';
        h += '<p>Let\'s get your team set up in under a minute.</p>';
        h += '</div>';
        h += '<div class="ob-body">';
        h += dots;
        h += '<div class="ob-actions">';
        h += '<button class="ob-btn ob-btn-skip" id="obSkipBtn">Skip setup</button>';
        h += '<button class="ob-btn ob-btn-primary" id="obNextBtn">Get Started</button>';
        h += '</div></div>';
      } else if (key === 'team') {
        h += '<div class="ob-header">';
        h += '<h2>Team Info</h2>';
        h += '<p>Tell us a bit about your team.</p>';
        h += '</div>';
        h += '<div class="ob-body">';
        h += dots;
        h += '<div class="ob-field"><label>Team Name</label>';
        h += '<input type="text" id="obTeamName" value="' + escHtml(existingTeamName) + '" placeholder="e.g. Smith Realty Group"></div>';
        h += '<div class="ob-field"><label>Brokerage Name <span class="ob-optional">(optional)</span></label>';
        h += '<input type="text" id="obBrokerage" placeholder="e.g. Keller Williams"></div>';
        h += '<div class="ob-actions">';
        h += '<button class="ob-btn ob-btn-skip" id="obSkipBtn">Skip</button>';
        h += '<button class="ob-btn ob-btn-primary" id="obNextBtn">Next</button>';
        h += '</div></div>';
      } else if (key === 'agent') {
        h += '<div class="ob-header">';
        h += '<h2>Add Your First Agent</h2>';
        h += '<p>Add a team member to get started.</p>';
        h += '</div>';
        h += '<div class="ob-body">';
        h += dots;
        h += '<div class="ob-field"><label>Display Name</label>';
        h += '<input type="text" id="obAgentName" placeholder="e.g. Jane Smith"></div>';
        h += '<div class="ob-field"><label>Email <span class="ob-optional">(optional)</span></label>';
        h += '<input type="email" id="obAgentEmail" placeholder="jane@example.com"></div>';
        h += '<div class="ob-field"><label>Phone <span class="ob-optional">(optional)</span></label>';
        h += '<input type="tel" id="obAgentPhone" placeholder="(555) 123-4567"></div>';
        h += '<div class="ob-field"><label>Role</label>';
        h += '<select id="obAgentRole"><option value="Agent">Agent</option><option value="Broker Associate">Broker Associate</option><option value="Assistant">Assistant</option></select></div>';
        h += '<div class="ob-actions">';
        h += '<button class="ob-btn ob-btn-skip" id="obSkipBtn">Skip</button>';
        h += '<button class="ob-btn ob-btn-primary" id="obNextBtn">Add Agent</button>';
        h += '</div></div>';
      } else if (key === 'done') {
        h += '<div class="ob-header">';
        h += '<h2>All Set!</h2>';
        h += '<p>Your workspace is ready.</p>';
        h += '</div>';
        h += '<div class="ob-body">';
        h += dots;
        h += '<div class="ob-center">';
        h += '<div class="ob-success-icon"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div>';
        h += '<h3>You\'re ready to go!</h3>';
        h += '<p>Start by adding your first listing or transaction.</p>';
        h += '</div>';
        h += '<div class="ob-actions" style="justify-content:center">';
        h += '<button class="ob-btn ob-btn-primary" id="obNextBtn" style="flex:0 0 auto;padding:10px 32px">Go to Dashboard</button>';
        h += '</div></div>';
      }

      modal.innerHTML = h;
      attachStepHandlers();
    }

    function escHtml(str) {
      var d = document.createElement('div');
      d.textContent = str;
      return d.innerHTML.replace(/"/g, '&quot;');
    }

    function attachStepHandlers() {
      var nextBtn = document.getElementById('obNextBtn');
      var skipBtn = document.getElementById('obSkipBtn');

      if (nextBtn) {
        nextBtn.addEventListener('click', function () {
          var key = stepKeys[currentStep];

          if (key === 'team') {
            saveTeamInfo();
          } else if (key === 'agent') {
            saveAgent();
            return; // saveAgent handles advancing
          }

          if (currentStep < totalSteps - 1) {
            currentStep++;
            renderStep();
          } else {
            completeWizard();
          }
        });
      }

      if (skipBtn) {
        skipBtn.addEventListener('click', function () {
          if (currentStep < totalSteps - 1) {
            currentStep++;
            renderStep();
          } else {
            completeWizard();
          }
        });
      }
    }

    function saveTeamInfo() {
      var nameEl = document.getElementById('obTeamName');
      var brokerageEl = document.getElementById('obBrokerage');
      var teamName = nameEl ? nameEl.value.trim() : '';
      var brokerage = brokerageEl ? brokerageEl.value.trim() : '';

      if (teamName && teamName !== existingTeamName) {
        // Update admin settings locally
        var adminRaw = localStorage.getItem(PREFIX + 'admin_settings');
        var adminSettings;
        try { adminSettings = adminRaw ? JSON.parse(adminRaw) : {}; } catch(e) { adminSettings = {}; }
        if (!adminSettings.general) adminSettings.general = {};
        adminSettings.general.teamName = teamName;
        if (brokerage) adminSettings.general.brokerageName = brokerage;
        localStorage.setItem(PREFIX + 'admin_settings', JSON.stringify(adminSettings));

        // Update via API if available
        if (typeof API !== 'undefined' && API.isLoggedIn() && API.updateTeam) {
          var teamData = { name: teamName };
          if (brokerage) teamData.brokerage = brokerage;
          API.updateTeam(teamData).catch(function () {});
        }
        existingTeamName = teamName;
      }
    }

    function saveAgent() {
      var nameEl = document.getElementById('obAgentName');
      var emailEl = document.getElementById('obAgentEmail');
      var phoneEl = document.getElementById('obAgentPhone');
      var roleEl = document.getElementById('obAgentRole');

      var name = nameEl ? nameEl.value.trim() : '';
      if (!name) {
        // No name entered, just advance
        currentStep++;
        renderStep();
        return;
      }

      var agentData = {
        display_name: name,
        role: roleEl ? roleEl.value : 'Agent',
        username: name.toLowerCase().replace(/\s+/g, '.'),
        password: 'changeme123'
      };
      if (emailEl && emailEl.value.trim()) agentData.email = emailEl.value.trim();
      if (phoneEl && phoneEl.value.trim()) agentData.phone = phoneEl.value.trim();

      // Save via API if available
      if (typeof API !== 'undefined' && API.isLoggedIn() && API.createUser) {
        var btn = document.getElementById('obNextBtn');
        if (btn) { btn.textContent = 'Adding...'; btn.disabled = true; }
        API.createUser(agentData).then(function () {
          currentStep++;
          renderStep();
        }).catch(function () {
          // Still advance on error
          currentStep++;
          renderStep();
        });
      } else {
        // Fallback: save to localStorage
        var users = JSON.parse(localStorage.getItem(PREFIX + 'users') || '[]');
        users.push({
          id: Date.now().toString(),
          username: agentData.username,
          displayName: name,
          role: agentData.role,
          email: agentData.email || '',
          phone: agentData.phone || ''
        });
        localStorage.setItem(PREFIX + 'users', JSON.stringify(users));
        currentStep++;
        renderStep();
      }
    }

    function completeWizard() {
      localStorage.setItem(ONBOARDING_DONE_KEY, '1');
      var ov = document.getElementById('obWizardOverlay');
      if (ov) {
        ov.style.transition = 'opacity .25s';
        ov.style.opacity = '0';
        setTimeout(function () { ov.remove(); }, 260);
      }
    }

    renderStep();
  }

  function showOnboarding() {
    var ob;
    try { ob = JSON.parse(localStorage.getItem(ONBOARDING_KEY) || '{}'); } catch(e) { ob = {}; }
    if (!ob.steps) ob.steps = {};

    var steps = [
      { key: 'theme', label: 'Customize Theme', page: 'admin-settings.html' },
      { key: 'team', label: 'Add Team Members', page: 'team.html' },
      { key: 'checklists', label: 'Set Up Checklists', page: 'admin-settings.html' },
      { key: 'listing', label: 'Add First Listing', page: 'listings.html' },
      { key: 'escrow', label: 'Add First Escrow', page: 'transactions.html' },
      { key: 'marketing', label: 'Explore Marketing', page: 'marketing.html' },
      { key: 'reviews', label: 'Set Up Reviews', page: 'reviews.html' },
      { key: 'portal', label: 'Preview Portal', page: 'admin-settings.html' }
    ];

    var done = steps.filter(function (s) { return ob.steps[s.key]; }).length;
    var total = steps.length;
    var pct = Math.round(done / total * 100);

    // Remove existing
    var existing = document.getElementById('onboardingBar');
    if (existing) existing.remove();

    // If all done, show celebration then auto-dismiss after 5 seconds
    if (done === total) {
      var celebration = document.createElement('div');
      celebration.id = 'onboardingBar';
      celebration.style.cssText = 'background:linear-gradient(135deg,#065F46,#10B981);border-radius:var(--radius-lg,12px);padding:20px 24px;margin-bottom:20px;text-align:center;color:#fff;animation:fadeInBar .4s ease';
      celebration.innerHTML =
        '<div style="font-size:1.8rem;margin-bottom:6px">🎉🏡🚀</div>' +
        '<div style="font-size:1.1rem;font-weight:800;margin-bottom:4px">Setup Complete!</div>' +
        '<div style="font-size:.85rem;opacity:.8;margin-bottom:12px">You\'re all set up and ready to manage your team like a pro.</div>' +
        '<button onclick="dismissOnboarding()" style="background:rgba(255,255,255,.2);border:none;color:#fff;padding:8px 24px;border-radius:8px;font-size:.82rem;font-weight:700;cursor:pointer;backdrop-filter:blur(4px)">Got it!</button>';

      // Inject at top of page-body
      var pageBody = document.querySelector('.page-body') || document.getElementById('pageBody');
      if (pageBody) pageBody.insertBefore(celebration, pageBody.firstChild);
      return;
    }

    // Build inline progress bar
    var bar = document.createElement('div');
    bar.id = 'onboardingBar';
    bar.style.cssText = 'background:#fff;border-radius:var(--radius-lg,12px);box-shadow:0 1px 3px rgba(0,0,0,.04),0 4px 20px rgba(0,0,0,.06);padding:16px 20px;margin-bottom:20px;animation:fadeInBar .4s ease';

    var h = '';
    // Top row: title + progress + dismiss
    h += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">';
    h += '<div style="font-size:.9rem;font-weight:700;color:#1E293B">Getting Started</div>';
    h += '<div style="flex:1;height:6px;background:#F1F5F9;border-radius:99px;overflow:hidden"><div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,#3B82F6,#6366F1);border-radius:99px;transition:width .4s ease"></div></div>';
    h += '<span style="font-size:.75rem;font-weight:700;color:#3B82F6">' + done + '/' + total + '</span>';
    h += '<button onclick="dismissOnboarding()" style="background:none;border:none;color:#94A3B8;cursor:pointer;font-size:1rem;padding:2px 4px;line-height:1" title="Dismiss">&times;</button>';
    h += '</div>';

    // Steps as horizontal pills
    h += '<div style="display:flex;gap:6px;flex-wrap:wrap">';
    steps.forEach(function (s) {
      var isDone = ob.steps[s.key];
      var bg = isDone ? '#ECFDF5' : '#F8FAFC';
      var color = isDone ? '#065F46' : '#64748B';
      var border = isDone ? '#D1FAE5' : '#E2E8F0';
      var check = isDone ? '<svg viewBox="0 0 24 24" width="12" height="12" fill="#10B981" style="flex-shrink:0"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' : '<div style="width:12px;height:12px;border-radius:50%;border:2px solid #CBD5E1;flex-shrink:0"></div>';
      h += '<button onclick="toggleOnboardingStep(\'' + s.key + '\',\'' + s.page + '\')" style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:99px;font-size:.72rem;font-weight:600;color:' + color + ';background:' + bg + ';border:1px solid ' + border + ';cursor:pointer;transition:all .15s;white-space:nowrap">';
      h += check + ' ' + s.label + '</button>';
    });
    h += '</div>';

    bar.innerHTML = h;

    // Inject at top of page-body
    var pageBody = document.querySelector('.page-body') || document.getElementById('pageBody');
    if (pageBody) pageBody.insertBefore(bar, pageBody.firstChild);
  }

  window.toggleOnboardingStep = function (key, page) {
    var ob;
    try { ob = JSON.parse(localStorage.getItem(ONBOARDING_KEY) || '{}'); } catch(e) { ob = {}; }
    if (!ob.steps) ob.steps = {};
    ob.steps[key] = !ob.steps[key];
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(ob));
    showOnboarding();
    if (ob.steps[key] && page) {
      var currentPage = window.location.pathname.split('/').pop();
      if (currentPage !== page) {
        window.location.href = page;
      }
    }
  };

  window.dismissOnboarding = function () {
    var ob;
    try { ob = JSON.parse(localStorage.getItem(ONBOARDING_KEY) || '{}'); } catch(e) { ob = {}; }
    ob.dismissed = true;
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(ob));
    var bar = document.getElementById('onboardingBar');
    if (bar) bar.remove();
  };

  // ---- Helper: get the display name to filter data by ----
  // For assistants, returns their assigned agent's displayName
  // For Team Lead, returns null (sees all)
  // For regular agents, returns their own displayName
  function getDataAgentName() {
    var session = Auth.getSession();
    if (!session) return null;
    if (Auth.isPrivileged()) return null; // sees all
    if (Auth.isAssistant()) {
      var assigned = Auth.getAssignedAgent();
      if (!assigned) return session.displayName;
      // If assigned to Team Lead, assistant sees all data
      if (assigned.role === 'Team Lead') return null;
      return assigned.displayName;
    }
    return session.displayName;
  }

  // ---- Admin Settings Reader ----
  // Reads from reb_admin_settings (saved by admin-settings.js)
  // Merges with defaults so pages always have valid values
  var ADMIN_DEFAULTS = {
    general: {
      teamName: 'RE Back Office',
      defaultCommissionRate: 0.03,
      defaultAgentSplit: 0.70,
      estimatedTaxRate: 0.25,
      fiscalYearStartMonth: 1
    },
    transactions: {
      statuses: [
        { key: 'active', label: 'Active', color: '#3B82F6' },
        { key: 'pending', label: 'Pending', color: '#F59E0B' },
        { key: 'closed', label: 'Closed', color: '#10B981' }
      ]
    },
    listings: {
      statuses: [
        { key: 'coming_soon', label: 'Coming Soon', color: '#7C3AED' },
        { key: 'active', label: 'Active', color: '#3B82F6' },
        { key: 'pending', label: 'Pending', color: '#F59E0B' },
        { key: 'sold', label: 'Sold', color: '#10B981' }
      ],
      propertyTypes: [
        'Single Family',
        'Condo / Townhome',
        'Multi-Family',
        'Land / Lot',
        'Commercial',
        'Manufactured'
      ]
    },
    leadSources: [
      'Zillow', 'Realtor.com', 'Referral', 'Sphere of Influence', 'Open House',
      'Sign Call', 'Social Media', 'Google / SEO', 'Cold Call / Door Knock',
      'Past Client', 'Builder / Developer', 'Relocation', 'FSBO',
      'Expired Listing', 'Farming / Mailer', 'Other'
    ],
    expenseCategories: [
      { key: 'Advertising & Marketing', color: '#6366F1' },
      { key: 'Auto & Mileage', color: '#3B82F6' },
      { key: 'Client Gifts & Entertainment', color: '#EC4899' },
      { key: 'Commission Splits / Referral Fees', color: '#14B8A6' },
      { key: 'Continuing Education & Training', color: '#F43F5E' },
      { key: 'Desk Fees / Office Rent', color: '#8B5CF6' },
      { key: 'E&O Insurance', color: '#0EA5E9' },
      { key: 'Health Insurance', color: '#EF4444' },
      { key: 'Home Office', color: '#F97316' },
      { key: 'Legal & Professional Services', color: '#64748B' },
      { key: 'Licensing & Dues', color: '#D946EF' },
      { key: 'Marketing Materials', color: '#A855F7' },
      { key: 'Office Supplies & Equipment', color: '#10B981' },
      { key: 'Phone & Internet', color: '#06B6D4' },
      { key: 'Photography & Staging', color: '#F59E0B' },
      { key: 'Postage & Shipping', color: '#78716C' },
      { key: 'Professional Development', color: '#BE185D' },
      { key: 'Software & Technology', color: '#7C3AED' },
      { key: 'Travel & Lodging', color: '#2563EB' },
      { key: 'Other', color: '#94A3B8' }
    ]
  };

  function getAdminSettings() {
    try {
      var raw = localStorage.getItem(PREFIX + 'admin_settings');
      if (!raw) return JSON.parse(JSON.stringify(ADMIN_DEFAULTS));
      var saved = JSON.parse(raw);
      // Merge with defaults for any missing keys
      var merged = JSON.parse(JSON.stringify(ADMIN_DEFAULTS));
      Object.keys(saved).forEach(function (k) {
        if (typeof saved[k] === 'object' && !Array.isArray(saved[k]) && saved[k] !== null && merged[k] && typeof merged[k] === 'object' && !Array.isArray(merged[k])) {
          Object.assign(merged[k], saved[k]);
        } else {
          merged[k] = saved[k];
        }
      });
      return merged;
    } catch(e) { return JSON.parse(JSON.stringify(ADMIN_DEFAULTS)); }
  }

  function getAdminSetting(key, fallback) {
    var settings = getAdminSettings();
    // Support dot notation: 'general.defaultCommissionRate'
    var parts = key.split('.');
    var val = settings;
    for (var i = 0; i < parts.length; i++) {
      if (val && typeof val === 'object' && parts[i] in val) {
        val = val[parts[i]];
      } else {
        return fallback;
      }
    }
    return val !== undefined && val !== null ? val : fallback;
  }

  // ---- Expose globals ----
  window.Auth = Auth;
  window.getDataAgentName = getDataAgentName;
  window.getInitials = getInitials;
  window.agentClass = agentClass;
  window.showToast = showToast;
  window.populateSidebarUser = populateSidebarUser;
  window.setActiveNav = setActiveNav;
  window.initSidebarToggle = initSidebarToggle;
  window.initSettingsDropdown = initSettingsDropdown;
  window.isSoloMode = isSoloMode;
  // ---- Apply page-specific accent color ----
  function applyPageColor(pageKey) {
    var color = getAdminSetting('theme.pageColors.' + pageKey, null);
    if (!color) return;
    var root = document.documentElement;
    root.style.setProperty('--page-accent', color);
    // Generate a light version
    var r = parseInt(color.substring(1, 3), 16);
    var g = parseInt(color.substring(3, 5), 16);
    var b = parseInt(color.substring(5, 7), 16);
    var mix = function (c) { return Math.round(c * 0.08 + 255 * 0.92); };
    var toHex = function (n) { var h = Math.min(255, n).toString(16); return h.length === 1 ? '0' + h : h; };
    root.style.setProperty('--page-accent-light', '#' + toHex(mix(r)) + toHex(mix(g)) + toHex(mix(b)));
  }

  window.getAdminSettings = getAdminSettings;
  window.getAdminSetting = getAdminSetting;
  window.applyTheme = applyTheme;
  window.applyPageColor = applyPageColor;
  window.addNotification = addNotification;

})();
