/* ============================================================
   RE Back Office — Deadline Email Notifications
   Uses EmailJS (emailjs.com) — configure in Admin Settings
   ============================================================ */
(function() {
  'use strict';

  var PREFIX = 'reb_';

  function getEmailJSConfig() {
    try {
      var cfg = JSON.parse(localStorage.getItem(PREFIX + 'emailjs_config') || '{}');
      return cfg;
    } catch(e) { return {}; }
  }

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
    var u = users.find(function(u) { return u.displayName === agentName || u.username === agentName; });
    return u ? (u.email || '') : '';
  }

  // Check if EmailJS is loaded and configured
  function isConfigured(cfg) {
    return cfg && cfg.publicKey && cfg.serviceId && cfg.templateId && cfg.enabled;
  }

  function sendEmail(cfg, toEmail, toName, subject, deadlinesList, escrowAddress) {
    if (typeof emailjs === 'undefined') return;
    emailjs.send(cfg.serviceId, cfg.templateId, {
      to_email: toEmail,
      to_name: toName,
      subject: subject,
      escrow_address: escrowAddress,
      deadlines_list: deadlinesList,
      app_url: window.location.origin
    });
  }

  window.checkDeadlineNotifications = function() {
    var cfg = getEmailJSConfig();
    if (!isConfigured(cfg)) return;

    // Init EmailJS
    if (typeof emailjs !== 'undefined') {
      emailjs.init({ publicKey: cfg.publicKey });
    } else {
      return;
    }

    var leadDays = cfg.leadDays || [1, 3, 7];
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var txns = [];
    try { txns = JSON.parse(localStorage.getItem(PREFIX + 'transactions') || '[]'); } catch(e) {}
    var activeTxns = txns.filter(function(t) { return t.status === 'active' || t.status === 'pending'; });
    var allKd = getKeyDatesAll();
    var sentLog = getSentLog();
    var todayStr = today.toISOString().split('T')[0];

    // Group deadlines by agent
    var agentDeadlines = {};

    activeTxns.forEach(function(t) {
      var kds = allKd[t.id] || [];
      var allDates = [];

      // Add close date
      if (t.closeDate) {
        allDates.push({ label: 'Closing Date', date: t.closeDate, notify: true });
      }

      // Add key dates with notify enabled
      kds.forEach(function(kd) {
        if (kd.status === 'complete' || kd.status === 'waived') return;
        if (!kd.date || !kd.notify) return;
        allDates.push({ label: kd.label, date: kd.date, notify: true });
      });

      allDates.forEach(function(item) {
        var d = new Date(item.date + 'T00:00:00');
        var diff = Math.round((d - today) / 86400000);

        // Check if this is a day we should notify
        var shouldNotify = leadDays.indexOf(diff) !== -1;
        if (!shouldNotify) return;

        // Check if already sent today
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

    // Send one email per agent with all their upcoming deadlines
    Object.keys(agentDeadlines).forEach(function(agentName) {
      var info = agentDeadlines[agentName];
      if (info.items.length === 0) return;

      var lines = info.items.map(function(item) {
        var dueStr = item.diff === 0 ? 'TODAY' : item.diff === 1 ? 'Tomorrow' : 'In ' + item.diff + ' days (' + item.date + ')';
        return item.label + ' — ' + item.address + ' — ' + dueStr;
      }).join('\n');

      var subject = info.items.length === 1
        ? 'Deadline Reminder: ' + info.items[0].label + ' — ' + info.items[0].address
        : info.items.length + ' Upcoming Deadlines — RE Back Office';

      sendEmail(cfg, info.email, agentName, subject, lines, info.items[0].address);

      // Mark all as sent
      info.items.forEach(function(item) {
        sentLog[item.logKey] = true;
      });
    });

    saveSentLog(sentLog);
  };

})();
