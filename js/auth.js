/* ============================================================
   RE Back Office — Authentication & UI Helpers
   ============================================================ */

(function () {
  'use strict';

  var PREFIX = 'reb_';

  // ---- Seed default users on first load ----
  function seedUsers() {
    if (localStorage.getItem(PREFIX + 'users')) return;
    var users = [
      { username: 'admin',  password: 'admin123', displayName: 'Jennifer Walsh', role: 'Administrator' },
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
      return session.role === 'Administrator' || session.role === 'Team Lead';
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
    if (avatarEl) avatarEl.textContent = getInitials(session.displayName);
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

  // ---- Expose globals ----
  window.Auth = Auth;
  window.getInitials = getInitials;
  window.agentClass = agentClass;
  window.showToast = showToast;
  window.populateSidebarUser = populateSidebarUser;
  window.setActiveNav = setActiveNav;
  window.initSidebarToggle = initSidebarToggle;

})();
