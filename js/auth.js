/* ============================================================
   RE Back Office — Authentication & UI Helpers
   ============================================================ */

(function () {
  'use strict';

  var PREFIX = 'reb_';

  // ---- Inject settings dropdown CSS ----
  var settingsCSS = document.createElement('style');
  settingsCSS.textContent = [
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
    '.settings-dd-divider { height: 1px; background: var(--gray-100); margin: 4px 6px; }'
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
      { username: 'agent1', password: 'demo123',  displayName: 'Marcus Rivera',  role: 'Senior Agent' },
      { username: 'agent2', password: 'demo123',  displayName: 'Sarah Chen',     role: "Buyer's Agent" }
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
      window.location.href = 'login.html';
    },

    getSession: function () {
      var raw = localStorage.getItem(PREFIX + 'session');
      return raw ? JSON.parse(raw) : null;
    },

    isLoggedIn: function () {
      return !!Auth.getSession();
    },

    requireAuth: function () {
      if (!Auth.isLoggedIn()) {
        window.location.href = 'login.html';
      }
    },

    isPrivileged: function () {
      var session = Auth.getSession();
      if (!session) return false;
      return session.role === 'Team Lead';
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
    var navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(function (item) {
      var href = item.getAttribute('href');
      if (href === filename) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
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

  // Auto-run on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', function () {
    applySoloMode();
    applyAssistantMode();
  });

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

})();
