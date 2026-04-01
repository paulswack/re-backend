/* ============================================================
   RE Back Office — Authentication & UI Helpers
   ============================================================ */

(function () {
  'use strict';

  var PREFIX = 'reb_';

  // ---- Inject settings + notifications CSS ----
  var settingsCSS = document.createElement('style');
  settingsCSS.textContent = [
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
      // Hide recruiting nav item for non-privileged users
      if (href === 'recruiting.html' && !Auth.isPrivileged()) {
        item.style.display = 'none';
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

  // Auto-run on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', function () {
    // If API bridge is available, load server data into localStorage
    if (typeof ApiBridge !== 'undefined' && ApiBridge.isServerMode()) {
      ApiBridge.init().then(function () {
        applySoloMode();
        applyAssistantMode();
        applyTheme();
        generateNotifications();
        initNotificationBell();
        initOnboarding();
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
      { id: 'lst_d1', address: '1500 Sunset Blvd, Los Angeles, CA 90028', status: 'active', price: 950000, agent: agents[0], beds: 4, baths: 3, sqft: 2800, listingDate: y + '-03-01', source: 'Sphere of Influence', createdAt: y + '-03-01T10:00:00Z' },
      { id: 'lst_d2', address: '220 Harbor View, Miami, FL 33101', status: 'active', price: 675000, agent: agents[0], beds: 3, baths: 2, sqft: 1950, listingDate: y + '-03-10', source: 'Referral', createdAt: y + '-03-10T10:00:00Z' }
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

    // Announcements
    var anns = [
      { id: 'ann1', text: 'Welcome to RE Back Office! Explore the demo to see how the system works.', author: mainAgent, timestamp: new Date().toISOString(), pinned: true }
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

  function initOnboarding() {
    if (Auth.isDemo()) return;
    if (!Auth.isLoggedIn()) return;
    if (!Auth.isPrivileged()) return;

    var raw = localStorage.getItem(ONBOARDING_KEY);
    if (raw) {
      var ob = JSON.parse(raw);
      if (ob.dismissed) return;
    }

    // Check if this is a fresh install (no transactions, no listings)
    var txns = [];
    var lsts = [];
    try { txns = JSON.parse(localStorage.getItem(PREFIX + 'transactions') || '[]'); } catch(e) {}
    try { lsts = JSON.parse(localStorage.getItem(PREFIX + 'listings') || '[]'); } catch(e) {}
    var users = [];
    try { users = JSON.parse(localStorage.getItem(PREFIX + 'users') || '[]'); } catch(e) {}

    // If there's real data, don't show onboarding
    if (txns.length > 0 || lsts.length > 0 || users.length > 3) {
      if (!raw) localStorage.setItem(ONBOARDING_KEY, JSON.stringify({ dismissed: true }));
      return;
    }

    showOnboarding();
  }

  function showOnboarding() {
    var ob;
    try { ob = JSON.parse(localStorage.getItem(ONBOARDING_KEY) || '{}'); } catch(e) { ob = {}; }
    if (!ob.steps) ob.steps = {};

    var steps = [
      { key: 'theme', label: 'Customize your theme & colors', page: 'admin-settings.html', desc: 'Set your brand colors, sidebar style, and page accents' },
      { key: 'team', label: 'Add your team members', page: 'team.html', desc: 'Add agents with their roles — Broker Associate, Agent, or Assistant' },
      { key: 'checklists', label: 'Set up checklist templates', page: 'admin-settings.html', desc: 'Create your buyer and listing checklists in Team Customization' },
      { key: 'listing', label: 'Add your first listing', page: 'listings.html', desc: 'Enter a listing to see the full listing management flow' },
      { key: 'escrow', label: 'Add your first escrow', page: 'transactions.html', desc: 'Enter a transaction to see the escrow tracking system' },
      { key: 'marketing', label: 'Explore marketing activities', page: 'marketing.html', desc: 'Check off weekly and monthly marketing tasks' },
      { key: 'reviews', label: 'Set up your review links', page: 'reviews.html', desc: 'Add your Google, Zillow, and other review profile URLs' },
      { key: 'portal', label: 'Preview the client portal', page: 'admin-settings.html', desc: 'Customize what clients see when you share a portal link' }
    ];

    var done = steps.filter(function (s) { return ob.steps[s.key]; }).length;
    var total = steps.length;

    var panel = document.createElement('div');
    panel.id = 'onboardingPanel';
    panel.style.cssText = 'position:fixed;bottom:20px;right:20px;width:360px;max-height:80vh;background:#fff;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.15),0 0 0 1px rgba(0,0,0,.05);z-index:9998;overflow:hidden;display:flex;flex-direction:column';

    var h = '';
    // Header
    h += '<div style="padding:18px 20px;border-bottom:1px solid #F1F5F9;background:linear-gradient(135deg,#1E3A5F,#3B82F6);color:#fff">';
    h += '<div style="display:flex;align-items:center;justify-content:space-between">';
    h += '<div style="font-size:.95rem;font-weight:800">Getting Started</div>';
    h += '<button onclick="dismissOnboarding()" style="background:rgba(255,255,255,.2);border:none;color:#fff;width:24px;height:24px;border-radius:50%;cursor:pointer;font-size:.8rem;display:flex;align-items:center;justify-content:center">&times;</button>';
    h += '</div>';
    h += '<div style="font-size:.75rem;opacity:.7;margin-top:4px">' + done + ' of ' + total + ' complete</div>';
    h += '<div style="height:4px;background:rgba(255,255,255,.2);border-radius:99px;margin-top:8px;overflow:hidden"><div style="height:100%;width:' + Math.round(done/total*100) + '%;background:#fff;border-radius:99px;transition:width .3s"></div></div>';
    h += '</div>';

    // Steps
    h += '<div style="overflow-y:auto;flex:1;padding:8px 0">';
    steps.forEach(function (s) {
      var isDone = ob.steps[s.key];
      h += '<div style="display:flex;align-items:flex-start;gap:12px;padding:12px 20px;border-bottom:1px solid #F8FAFC;cursor:pointer" onclick="toggleOnboardingStep(\'' + s.key + '\',\'' + s.page + '\')">';
      h += '<div style="width:22px;height:22px;border-radius:50%;border:2px solid ' + (isDone ? '#10B981' : '#E2E8F0') + ';background:' + (isDone ? '#10B981' : '#fff') + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px">';
      if (isDone) h += '<svg viewBox="0 0 24 24" width="12" height="12" fill="#fff"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
      h += '</div>';
      h += '<div>';
      h += '<div style="font-size:.85rem;font-weight:600;color:' + (isDone ? '#94A3B8' : '#1E293B') + ';' + (isDone ? 'text-decoration:line-through;' : '') + '">' + s.label + '</div>';
      h += '<div style="font-size:.72rem;color:#94A3B8;margin-top:2px">' + s.desc + '</div>';
      h += '</div></div>';
    });
    h += '</div>';

    // Footer
    if (done === total) {
      h += '<div style="padding:16px 20px;border-top:1px solid #F1F5F9;text-align:center">';
      h += '<div style="font-size:.9rem;font-weight:700;color:#10B981;margin-bottom:8px">🎉 All done! You\'re ready to go.</div>';
      h += '<button onclick="dismissOnboarding()" style="background:#3B82F6;color:#fff;border:none;padding:8px 24px;border-radius:8px;font-size:.82rem;font-weight:700;cursor:pointer">Close Setup Guide</button>';
      h += '</div>';
    }

    panel.innerHTML = h;
    // Remove existing
    var existing = document.getElementById('onboardingPanel');
    if (existing) existing.remove();
    document.body.appendChild(panel);
  }

  window.toggleOnboardingStep = function (key, page) {
    var ob;
    try { ob = JSON.parse(localStorage.getItem(ONBOARDING_KEY) || '{}'); } catch(e) { ob = {}; }
    if (!ob.steps) ob.steps = {};
    ob.steps[key] = !ob.steps[key];
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(ob));
    showOnboarding();
    // Navigate if checking (not unchecking)
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
    var panel = document.getElementById('onboardingPanel');
    if (panel) panel.remove();
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
        { key: 'active', label: 'Active', color: '#3B82F6' },
        { key: 'new', label: 'New', color: '#8B5CF6' },
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
