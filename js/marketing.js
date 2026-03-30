/* ============================================================
   RE Back Office — Marketing Activities Page
   ============================================================ */

(function () {
  'use strict';

  Auth.requireAuth();
  populateSidebarUser();
  setActiveNav();
  initSidebarToggle();
  applyPageColor('marketing');

  document.getElementById('logoutBtn').addEventListener('click', function () {
    Auth.logout();
  });

  var STORAGE_KEY = 'reb_marketing';
  var pageBody = document.getElementById('pageBody');
  var currentTab = 'weekly'; // weekly or monthly

  // ---- Activity definitions ----
  var WEEKLY_ACTIVITIES = [
    { id: 'w1',  label: 'Instagram post' },
    { id: 'w2',  label: 'Facebook post' },
    { id: 'w3',  label: 'LinkedIn post' },
    { id: 'w4',  label: '10+ prospecting calls' },
    { id: 'w5',  label: '5+ follow-up texts/emails' },
    { id: 'w6',  label: 'Host/attend open house' },
    { id: 'w7',  label: 'Door knock/geo-farm' },
    { id: 'w8',  label: 'Handwritten notes' },
    { id: 'w9',  label: 'Engage sphere on social media' },
    { id: 'w10', label: 'Share market update' }
  ];

  var MONTHLY_ACTIVITIES = [
    { id: 'm1',  label: 'Email newsletter' },
    { id: 'm2',  label: 'Mail postcards/flyers' },
    { id: 'm3',  label: 'Request client reviews' },
    { id: 'm4',  label: 'Paid social media ad' },
    { id: 'm5',  label: 'Host client event' },
    { id: 'm6',  label: 'Update Google Business Profile' },
    { id: 'm7',  label: 'Record/publish video' },
    { id: 'm8',  label: 'Attend networking event' },
    { id: 'm9',  label: 'Create market report' },
    { id: 'm10', label: 'Reconnect with 10+ past clients' }
  ];

  // ---- Helpers ----
  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function getSession() {
    return Auth.getSession();
  }

  function getUsers() {
    try { return JSON.parse(localStorage.getItem('reb_users') || '[]'); } catch (e) { return []; }
  }

  // ---- Period key calculations ----
  function getWeekKey(date) {
    // ISO week: YYYY-WXX
    var d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    var yearStart = new Date(d.getFullYear(), 0, 4);
    var weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    var weekStr = weekNum < 10 ? '0' + weekNum : String(weekNum);
    return d.getFullYear() + '-W' + weekStr;
  }

  function getMonthKey(date) {
    var d = new Date(date);
    var m = d.getMonth() + 1;
    return d.getFullYear() + '-' + (m < 10 ? '0' + m : String(m));
  }

  function getCurrentWeekKey() {
    return getWeekKey(new Date());
  }

  function getCurrentMonthKey() {
    return getMonthKey(new Date());
  }

  function getPreviousWeekKey(weekKey) {
    // Parse YYYY-WXX and go back one week
    var parts = weekKey.split('-W');
    var year = parseInt(parts[0], 10);
    var week = parseInt(parts[1], 10);
    week--;
    if (week < 1) {
      year--;
      week = 52;
    }
    var weekStr = week < 10 ? '0' + week : String(week);
    return year + '-W' + weekStr;
  }

  // ---- Data access ----
  function getData() {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    try { return JSON.parse(raw); } catch (e) { return {}; }
  }

  function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function getUserData(username) {
    var data = getData();
    if (!data[username]) {
      data[username] = { weekly: {}, monthly: {} };
    }
    return data[username];
  }

  function getCompletedCount(username, periodType, periodKey) {
    var userData = getUserData(username);
    var periodData = userData[periodType] || {};
    var items = periodData[periodKey] || {};
    return Object.keys(items).length;
  }

  function isActivityCompleted(username, periodType, periodKey, activityId) {
    var userData = getUserData(username);
    var periodData = userData[periodType] || {};
    var items = periodData[periodKey] || {};
    return !!items[activityId];
  }

  function toggleActivity(username, periodType, periodKey, activityId) {
    var data = getData();
    if (!data[username]) data[username] = { weekly: {}, monthly: {} };
    if (!data[username][periodType]) data[username][periodType] = {};
    if (!data[username][periodType][periodKey]) data[username][periodType][periodKey] = {};

    if (data[username][periodType][periodKey][activityId]) {
      delete data[username][periodType][periodKey][activityId];
    } else {
      data[username][periodType][periodKey][activityId] = true;
    }

    saveData(data);
  }

  // ---- Streak calculation ----
  function calculateStreak(username) {
    var streak = 0;
    var weekKey = getCurrentWeekKey();
    var currentWeekCount = getCompletedCount(username, 'weekly', weekKey);

    // If current week has 7+, start counting from current week
    // Otherwise, start from previous week
    if (currentWeekCount >= 7) {
      streak = 1;
      weekKey = getPreviousWeekKey(weekKey);
    } else {
      weekKey = getPreviousWeekKey(weekKey);
    }

    // Go back checking previous weeks
    for (var i = 0; i < 52; i++) {
      var count = getCompletedCount(username, 'weekly', weekKey);
      if (count >= 7) {
        streak++;
        weekKey = getPreviousWeekKey(weekKey);
      } else {
        break;
      }
    }

    return streak;
  }

  // ---- Team average calculation ----
  function getTeamAverage() {
    var users = getUsers();
    if (users.length === 0) return 0;
    var weekKey = getCurrentWeekKey();
    var total = 0;
    users.forEach(function (u) {
      total += getCompletedCount(u.username, 'weekly', weekKey);
    });
    return (total / users.length).toFixed(1);
  }

  // ---- Stat card ----
  function statCard(label, value, color, iconSvg) {
    return '<div class="stat-card" style="background:#fff;border-radius:12px;padding:18px;box-shadow:0 1px 4px rgba(0,0,0,0.06);border:1px solid #E2E8F0;">' +
      '<div style="display:flex;align-items:center;gap:12px;">' +
      '<div class="stat-icon" style="width:42px;height:42px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:' + color + '20;color:' + color + ';">' + iconSvg + '</div>' +
      '<div>' +
      '<div style="font-size:22px;font-weight:700;color:#1E293B;">' + value + '</div>' +
      '<div style="font-size:13px;color:#64748B;">' + escapeHtml(label) + '</div>' +
      '</div></div></div>';
  }

  // ---- Progress bar HTML ----
  function progressBarHtml(completed, total, color) {
    var pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return '<div style="width:100%;background:#E2E8F0;border-radius:99px;height:8px;overflow:hidden;">' +
      '<div style="width:' + pct + '%;background:' + color + ';height:100%;border-radius:99px;transition:width 0.3s;"></div>' +
      '</div>';
  }

  // ---- Render ----
  function render() {
    var session = getSession();
    if (!session) return;
    var username = session.username;
    var isTeamLead = Auth.isPrivileged();

    var weekKey = getCurrentWeekKey();
    var monthKey = getCurrentMonthKey();

    var weeklyCount = getCompletedCount(username, 'weekly', weekKey);
    var monthlyCount = getCompletedCount(username, 'monthly', monthKey);
    var streak = calculateStreak(username);
    var teamAvg = getTeamAverage();

    var html = '';

    // Header
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;">';
    html += '<h2 style="margin:0;font-size:22px;font-weight:700;">Marketing Activities</h2>';
    html += '<div style="font-size:13px;color:#64748B;">Week: ' + escapeHtml(weekKey) + ' &nbsp;|&nbsp; Month: ' + escapeHtml(monthKey) + '</div>';
    html += '</div>';

    // Stat cards
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;margin-bottom:24px;">';
    html += statCard('Weekly Progress', weeklyCount + '/10', '#3484D0', '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/></svg>');
    html += statCard('Monthly Progress', monthlyCount + '/10', '#6B21A8', '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg>');
    html += statCard('Current Streak', streak + (streak === 1 ? ' week' : ' weeks'), '#F59E0B', '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>');
    html += statCard('Team Average', teamAvg + '/10', '#1A7F4B', '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>');
    html += '</div>';

    // Tab toggle
    html += '<div style="display:flex;gap:4px;margin-bottom:20px;background:#F1F5F9;border-radius:10px;padding:4px;width:fit-content;">';
    html += '<button data-action="switch-tab" data-tab="weekly" style="padding:8px 20px;border-radius:8px;border:none;cursor:pointer;font-size:14px;font-weight:600;transition:all 0.2s;' + (currentTab === 'weekly' ? 'background:#fff;color:#1E293B;box-shadow:0 1px 3px rgba(0,0,0,0.1);' : 'background:transparent;color:#64748B;') + '">Weekly</button>';
    html += '<button data-action="switch-tab" data-tab="monthly" style="padding:8px 20px;border-radius:8px;border:none;cursor:pointer;font-size:14px;font-weight:600;transition:all 0.2s;' + (currentTab === 'monthly' ? 'background:#fff;color:#1E293B;box-shadow:0 1px 3px rgba(0,0,0,0.1);' : 'background:transparent;color:#64748B;') + '">Monthly</button>';
    html += '</div>';

    if (currentTab === 'weekly') {
      html += renderChecklist(username, 'weekly', weekKey, WEEKLY_ACTIVITIES);
    } else {
      html += renderChecklist(username, 'monthly', monthKey, MONTHLY_ACTIVITIES);
    }

    // Team Lead: show all agents grid
    if (isTeamLead) {
      html += renderTeamGrid(weekKey);
    }

    pageBody.innerHTML = html;
  }

  function renderChecklist(username, periodType, periodKey, activities) {
    var completed = getCompletedCount(username, periodType, periodKey);
    var total = activities.length;
    var pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    var color = periodType === 'weekly' ? '#3484D0' : '#6B21A8';

    var html = '';
    html += '<div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.06);border:1px solid #E2E8F0;padding:20px;margin-bottom:24px;">';

    // Progress header
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">';
    html += '<div style="font-weight:700;font-size:16px;color:#1E293B;">' + (periodType === 'weekly' ? 'Weekly' : 'Monthly') + ' Checklist</div>';
    html += '<div style="font-size:14px;font-weight:600;color:' + color + ';">' + pct + '% complete (' + completed + '/' + total + ')</div>';
    html += '</div>';

    // Progress bar
    html += '<div style="margin-bottom:20px;">' + progressBarHtml(completed, total, color) + '</div>';

    // Activity rows
    activities.forEach(function (act) {
      var checked = isActivityCompleted(username, periodType, periodKey, act.id);
      html += '<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #F1F5F9;cursor:pointer;" data-action="toggle-activity" data-period="' + periodType + '" data-period-key="' + escapeHtml(periodKey) + '" data-activity-id="' + act.id + '">';

      // Checkbox
      if (checked) {
        html += '<div style="width:22px;height:22px;border-radius:6px;background:#10B981;display:flex;align-items:center;justify-content:center;flex-shrink:0;">';
        html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
        html += '</div>';
      } else {
        html += '<div style="width:22px;height:22px;border-radius:6px;border:2px solid #CBD5E1;flex-shrink:0;"></div>';
      }

      // Label
      html += '<span style="font-size:14px;color:' + (checked ? '#94A3B8' : '#1E293B') + ';' + (checked ? 'text-decoration:line-through;' : '') + '">' + escapeHtml(act.label) + '</span>';
      html += '</div>';
    });

    html += '</div>';
    return html;
  }

  function renderTeamGrid(weekKey) {
    var users = getUsers();
    if (users.length === 0) return '';

    var html = '';
    html += '<div style="margin-top:8px;">';
    html += '<h3 style="font-size:18px;font-weight:700;color:#1E293B;margin-bottom:16px;">Team Overview (This Week)</h3>';
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;">';

    users.forEach(function (u) {
      var completed = getCompletedCount(u.username, 'weekly', weekKey);
      var total = 10;
      var pct = Math.round((completed / total) * 100);

      // Determine bar color based on progress
      var barColor = '#3484D0';
      if (pct >= 70) barColor = '#10B981';
      else if (pct >= 40) barColor = '#F59E0B';
      else barColor = '#EF4444';

      html += '<div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.06);border:1px solid #E2E8F0;padding:16px;">';

      // Agent info
      html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">';
      html += '<div class="agent-avatar agent-' + agentClass(u.displayName) + '" style="width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;background:#3484D0;">' + getInitials(u.displayName) + '</div>';
      html += '<div>';
      html += '<div style="font-weight:600;font-size:14px;color:#1E293B;">' + escapeHtml(u.displayName) + '</div>';
      html += '<div style="font-size:12px;color:#94A3B8;">' + escapeHtml(u.role) + '</div>';
      html += '</div>';
      html += '</div>';

      // Progress
      html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">';
      html += '<span style="font-size:13px;color:#64748B;">Weekly progress</span>';
      html += '<span style="font-size:13px;font-weight:700;color:' + barColor + ';">' + completed + '/10</span>';
      html += '</div>';
      html += progressBarHtml(completed, total, barColor);

      // Streak
      var streak = calculateStreak(u.username);
      if (streak > 0) {
        html += '<div style="margin-top:8px;font-size:12px;color:#F59E0B;font-weight:600;">' + streak + ' week streak</div>';
      }

      html += '</div>';
    });

    html += '</div></div>';
    return html;
  }

  // ---- Event delegation ----
  document.addEventListener('click', function (e) {
    var target = e.target.closest('[data-action]');
    if (!target) return;
    var action = target.getAttribute('data-action');

    if (action === 'switch-tab') {
      currentTab = target.getAttribute('data-tab');
      render();
    } else if (action === 'toggle-activity') {
      var session = getSession();
      if (!session) return;
      var periodType = target.getAttribute('data-period');
      var periodKey = target.getAttribute('data-period-key');
      var activityId = target.getAttribute('data-activity-id');
      toggleActivity(session.username, periodType, periodKey, activityId);
      render();
    }
  });

  // ---- Init ----
  render();

})();
