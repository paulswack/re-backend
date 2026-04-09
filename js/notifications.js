/* ============================================================
   RE Back Office — Deadline Email Notifications
   Sends via /api/email/deadline-reminder (Resend on server)
   ============================================================ */
(function() {
  'use strict';

  var PREFIX = 'reb_';

  function getSentLog() {
    try { return JSON.parse(localStorage.getItem(PREFIX + 'notif_sent') || '{}'); } catch(e) { return {}; }
  }

  function saveSentLog(log) {
    localStorage.setItem(PREFIX + 'notif_sent', JSON.stringify(log));
  }

  function getKeyDatesAll() {
    try { return JSON.parse(localStorage.getItem(PREFIX + 'txn_key_dates') || '{}'); } catch(e) { return {}; }
  }

  function getUsers() {
    try { return JSON.parse(localStorage.getItem(PREFIX + 'users') || '[]'); } catch(e) { return []; }
  }

  function getUserEmail(agentName) {
    var users = getUsers();
    var u = users.find(function(u) { return (u.displayName === agentName) || (u.username === agentName); });
    return u ? (u.email || '') : '';
  }

  function getToken() {
    return localStorage.getItem(PREFIX + 'jwt') || '';
  }

  function getNotifConfig() {
    try { return JSON.parse(localStorage.getItem(PREFIX + 'notif_config') || '{}'); } catch(e) { return {}; }
  }

  function sendDeadlineEmail(toEmail, agentName, deadlines) {
    var token = getToken();
    fetch('/api/email/deadline-reminder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ to: toEmail, agentName: agentName, deadlines: deadlines })
    }).catch(function() {}); // silent fail
  }

  window.checkDeadlineNotifications = function() {
    var cfg = getNotifConfig();
    if (!cfg.enabled) return;

    var leadDays = cfg.leadDays || [1, 3, 7];
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var todayStr = today.toISOString().split('T')[0];

    var txns = [];
    try { txns = JSON.parse(localStorage.getItem(PREFIX + 'transactions') || '[]'); } catch(e) {}
    var activeTxns = txns.filter(function(t) { return t.status === 'active' || t.status === 'pending'; });

    var allKd = getKeyDatesAll();
    var sentLog = getSentLog();
    var agentDeadlines = {};

    activeTxns.forEach(function(t) {
      var kds = allKd[t.id] || [];
      var allDates = [];

      // Closing date always notifies
      if (t.closeDate) {
        allDates.push({ label: 'Closing Date', date: t.closeDate, notify: true });
      }

      // Key dates that have notify toggled on
      kds.forEach(function(kd) {
        if (kd.status === 'complete' || kd.status === 'waived') return;
        if (!kd.date || !kd.notify) return;
        allDates.push({ label: kd.label, date: kd.date });
      });

      allDates.forEach(function(item) {
        var d = new Date(item.date + 'T00:00:00');
        var diff = Math.round((d - today) / 86400000);

        if (leadDays.indexOf(diff) === -1) return;

        var logKey = t.id + '_' + item.date + '_' + diff + '_' + todayStr;
        if (sentLog[logKey]) return;

        var agentEmail = getUserEmail(t.agent);
        if (!agentEmail) return;

        if (!agentDeadlines[t.agent]) {
          agentDeadlines[t.agent] = { email: agentEmail, items: [] };
        }
        agentDeadlines[t.agent].items.push({
          address: t.address,
          label: item.label,
          date: item.date,
          diff: diff,
          logKey: logKey
        });
      });
    });

    // Send one email per agent, mark sent
    Object.keys(agentDeadlines).forEach(function(agentName) {
      var info = agentDeadlines[agentName];
      if (!info.items.length) return;
      sendDeadlineEmail(info.email, agentName, info.items);
      info.items.forEach(function(item) { sentLog[item.logKey] = true; });
    });

    saveSentLog(sentLog);
  };

})();
