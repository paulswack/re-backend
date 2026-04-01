/* ============================================================
   RE Back Office — Review Request Manager
   Personal agent page for requesting, tracking, and managing
   client reviews. Each agent sees only their own data.
   ============================================================ */

(function () {
  'use strict';

  Auth.requireAuth();
  populateSidebarUser();
  setActiveNav();
  initSidebarToggle();
  applyPageColor('reviews');

  document.getElementById('logoutBtn').addEventListener('click', function () { Auth.logout(); });

  var PREFIX = 'reb_';
  var STORAGE_KEY = PREFIX + 'review_requests';
  var LINKS_KEY = PREFIX + 'review_links';
  var TEMPLATES_KEY = PREFIX + 'review_templates';
  var pageBody = document.getElementById('pageBody');
  var session = Auth.getSession();
  var SCORECARD_KEY = PREFIX + 'review_scorecard';
  var GOALS_KEY = PREFIX + 'review_goals';
  var LAST_CHECK_KEY = PREFIX + 'review_last_check';
  var currentView = 'dashboard'; // dashboard | requests | templates | links | scorecard
  var currentFilter = 'all'; // all | pending | sent | received | overdue

  // ---- Review Sources ----
  var SOURCES = {
    'Google':      { bg: '#E8F5E9', text: '#1B5E20', icon: '🔍' },
    'Zillow':      { bg: '#E3F2FD', text: '#0D47A1', icon: '🏠' },
    'Realtor.com': { bg: '#FBE9E7', text: '#BF360C', icon: '🏡' },
    'Yelp':        { bg: '#FCE4EC', text: '#880E4F', icon: '⭐' },
    'Facebook':    { bg: '#E8EAF6', text: '#283593', icon: '👍' },
    'Other':       { bg: '#F5F5F5', text: '#424242', icon: '📝' }
  };
  var SOURCE_KEYS = Object.keys(SOURCES);

  // ---- Default Email Templates ----
  var DEFAULT_TEMPLATES = [
    {
      id: 'tpl_close',
      name: 'Post-Close Thank You',
      subject: 'Thank you for choosing {{agentName}} — would you share your experience?',
      body: 'Hi {{clientName}},\n\nCongratulations again on your {{transactionType}}! It was such a pleasure working with you through this process.\n\nIf you had a great experience, I would truly appreciate it if you could take a moment to leave a review. It helps me help more families like yours.\n\n{{reviewLink}}\n\nIt only takes a minute and means the world to me. Thank you so much!\n\nWarm regards,\n{{agentName}}',
      timing: 'Send 1-3 days after close of escrow'
    },
    {
      id: 'tpl_followup',
      name: 'Gentle Follow-Up',
      subject: 'Quick favor, {{clientFirstName}}? 🙏',
      body: 'Hi {{clientFirstName}},\n\nI hope you\'re settling into your new home beautifully! I wanted to follow up on my earlier note — if you have a quick moment, I\'d be so grateful for a review.\n\n{{reviewLink}}\n\nYour feedback helps me grow my business and serve more wonderful clients. No pressure at all — I appreciate you either way!\n\nBest,\n{{agentName}}',
      timing: 'Send 7-10 days after first email if no response'
    },
    {
      id: 'tpl_anniversary',
      name: 'Home Anniversary Check-In',
      subject: 'Happy Home Anniversary, {{clientFirstName}}! 🏡🎉',
      body: 'Hi {{clientFirstName}},\n\nCan you believe it\'s been a year since you {{transactionType === "Buyer" ? "moved into" : "sold"}} your home? Time flies!\n\nI wanted to check in and see how everything is going. If you haven\'t already, I\'d love it if you could share your experience working together.\n\n{{reviewLink}}\n\nHope all is well — feel free to reach out anytime if you need anything real estate related!\n\nCheers,\n{{agentName}}',
      timing: 'Send on the 1-year anniversary of close'
    },
    {
      id: 'tpl_specific',
      name: 'Platform-Specific Ask',
      subject: 'Would you leave a quick {{platform}} review?',
      body: 'Hi {{clientName}},\n\nI hope this finds you well! I\'m working on building up my {{platform}} reviews and would be so grateful if you could share a few words about your experience.\n\n{{reviewLink}}\n\nEven just a sentence or two makes a huge difference. Thank you for your time and for trusting me with your real estate needs!\n\nBest regards,\n{{agentName}}',
      timing: 'Use when targeting a specific platform'
    }
  ];

  // ---- Helpers ----
  function generateId() { return 'rr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6); }
  function escHtml(s) { if (!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function getRequests() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch (e) { return []; }
  }
  function saveRequests(arr) { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); }

  function getMyRequests() {
    return getRequests().filter(function (r) { return r.agent === session.username; });
  }

  function getLinks() {
    try { return JSON.parse(localStorage.getItem(LINKS_KEY) || '{}'); } catch (e) { return {}; }
  }
  function saveLinks(obj) { localStorage.setItem(LINKS_KEY, JSON.stringify(obj)); }

  function getMyLinks() {
    var all = getLinks();
    return all[session.username] || {};
  }
  function saveMyLinks(links) {
    var all = getLinks();
    all[session.username] = links;
    saveLinks(all);
  }

  function getTemplates() {
    try {
      var raw = localStorage.getItem(TEMPLATES_KEY);
      if (raw) {
        var t = JSON.parse(raw);
        if (t[session.username]) return t[session.username];
      }
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT_TEMPLATES));
  }
  function saveTemplates(arr) {
    var all;
    try { all = JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '{}'); } catch (e) { all = {}; }
    all[session.username] = arr;
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(all));
  }

  function getClosedTxns() {
    var txns = Data.getTransactions().filter(function (t) {
      return t.status === 'closed' && t.agent === session.displayName;
    });
    return txns;
  }

  // ---- Scorecard data (manually logged review counts per platform) ----
  function getScorecard() {
    try {
      var all = JSON.parse(localStorage.getItem(SCORECARD_KEY) || '{}');
      return all[session.username] || {};
    } catch (e) { return {}; }
  }
  function saveScorecard(data) {
    var all;
    try { all = JSON.parse(localStorage.getItem(SCORECARD_KEY) || '{}'); } catch (e) { all = {}; }
    all[session.username] = data;
    localStorage.setItem(SCORECARD_KEY, JSON.stringify(all));
  }

  function getGoals() {
    try {
      var all = JSON.parse(localStorage.getItem(GOALS_KEY) || '{}');
      return all[session.username] || {};
    } catch (e) { return {}; }
  }
  function saveGoals(data) {
    var all;
    try { all = JSON.parse(localStorage.getItem(GOALS_KEY) || '{}'); } catch (e) { all = {}; }
    all[session.username] = data;
    localStorage.setItem(GOALS_KEY, JSON.stringify(all));
  }

  function getLastCheck() {
    try {
      var all = JSON.parse(localStorage.getItem(LAST_CHECK_KEY) || '{}');
      return all[session.username] || null;
    } catch (e) { return null; }
  }
  function saveLastCheck() {
    var all;
    try { all = JSON.parse(localStorage.getItem(LAST_CHECK_KEY) || '{}'); } catch (e) { all = {}; }
    all[session.username] = new Date().toISOString();
    localStorage.setItem(LAST_CHECK_KEY, JSON.stringify(all));
  }

  function getAllPlatforms() {
    var links = getMyLinks();
    var platforms = SOURCE_KEYS.slice();
    Object.keys(links).forEach(function (k) {
      if (k !== '_default' && platforms.indexOf(k) === -1 && links[k]) platforms.push(k);
    });
    return platforms;
  }

  function sourceBadge(source) {
    var c = SOURCES[source] || SOURCES['Other'];
    return '<span style="display:inline-block;padding:2px 10px;border-radius:99px;font-size:.72rem;font-weight:600;background:' + c.bg + ';color:' + c.text + '">' + escHtml(source) + '</span>';
  }

  function statusBadge(status) {
    var colors = {
      pending: { bg: '#FEF3C7', text: '#92400E' },
      sent: { bg: '#DBEAFE', text: '#1D4ED8' },
      received: { bg: '#ECFDF5', text: '#065F46' },
      overdue: { bg: '#FEE2E2', text: '#991B1B' }
    };
    var c = colors[status] || colors.pending;
    return '<span style="display:inline-block;padding:2px 10px;border-radius:99px;font-size:.72rem;font-weight:600;background:' + c.bg + ';color:' + c.text + ';text-transform:capitalize">' + escHtml(status) + '</span>';
  }

  function starsHtml(rating, size) {
    var s = size || '16px';
    var h = '';
    for (var i = 1; i <= 5; i++) {
      h += '<span style="color:' + (i <= rating ? '#F59E0B' : '#CBD5E1') + ';font-size:' + s + '">&#9733;</span>';
    }
    return h;
  }

  function daysSince(dateStr) {
    if (!dateStr) return null;
    var d = new Date(dateStr);
    var now = new Date(); now.setHours(0,0,0,0); d.setHours(0,0,0,0);
    return Math.floor((now - d) / 86400000);
  }

  function formatDate(d) {
    if (!d) return '';
    var dt = new Date(d);
    if (isNaN(dt.getTime())) return '';
    var m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return m[dt.getMonth()] + ' ' + dt.getDate() + ', ' + dt.getFullYear();
  }

  // Merge template variables
  function mergeTemplate(text, vars) {
    return text.replace(/\{\{(\w+)\}\}/g, function (match, key) {
      return vars[key] !== undefined ? vars[key] : match;
    });
  }

  // ---- Render: Dashboard ----
  function renderDashboard() {
    var requests = getMyRequests();
    var links = getMyLinks();
    var pending = requests.filter(function (r) { return r.status === 'pending'; });
    var sent = requests.filter(function (r) { return r.status === 'sent'; });
    var received = requests.filter(function (r) { return r.status === 'received'; });
    var overdue = sent.filter(function (r) { return daysSince(r.sentDate) > 14; });

    // Stats by source
    var sourceStats = {};
    received.forEach(function (r) {
      var src = r.source || 'Other';
      sourceStats[src] = (sourceStats[src] || 0) + 1;
    });

    var avgRating = 0;
    if (received.length) {
      var sum = 0;
      received.forEach(function (r) { sum += (r.rating || 0); });
      avgRating = (sum / received.length).toFixed(1);
    }

    var hasLinks = Object.keys(links).some(function (k) { return links[k]; });

    var h = '';

    // Banner
    h += '<div style="background:linear-gradient(135deg,#1E3A5F 0%,#3B82F6 50%,#6366F1 100%);border-radius:var(--radius-lg);padding:28px;margin-bottom:24px;color:#fff;position:relative;overflow:hidden">';
    h += '<div style="position:absolute;top:-30%;right:-10%;width:250px;height:250px;border-radius:50%;background:rgba(255,255,255,.06);pointer-events:none"></div>';
    h += '<div style="font-size:1.4rem;font-weight:800;margin-bottom:4px">Review Manager</div>';
    h += '<div style="font-size:.85rem;opacity:.75;margin-bottom:16px">Stay on top of your reviews — request, track, and grow your online reputation</div>';
    h += '<div style="display:flex;gap:16px;flex-wrap:wrap">';
    h += '<div style="background:rgba(255,255,255,.12);border-radius:10px;padding:10px 18px;backdrop-filter:blur(8px)"><div style="font-size:1.3rem;font-weight:800">' + received.length + '</div><div style="font-size:.7rem;opacity:.7">Reviews Received</div></div>';
    h += '<div style="background:rgba(255,255,255,.12);border-radius:10px;padding:10px 18px;backdrop-filter:blur(8px)"><div style="font-size:1.3rem;font-weight:800">' + avgRating + ' ⭐</div><div style="font-size:.7rem;opacity:.7">Avg Rating</div></div>';
    h += '<div style="background:rgba(255,255,255,.12);border-radius:10px;padding:10px 18px;backdrop-filter:blur(8px)"><div style="font-size:1.3rem;font-weight:800">' + pending.length + '</div><div style="font-size:.7rem;opacity:.7">Pending</div></div>';
    h += '<div style="background:rgba(255,255,255,.12);border-radius:10px;padding:10px 18px;backdrop-filter:blur(8px)"><div style="font-size:1.3rem;font-weight:800">' + sent.length + '</div><div style="font-size:.7rem;opacity:.7">Awaiting Response</div></div>';
    if (overdue.length) {
      h += '<div style="background:rgba(239,68,68,.3);border-radius:10px;padding:10px 18px"><div style="font-size:1.3rem;font-weight:800">' + overdue.length + '</div><div style="font-size:.7rem;opacity:.7">Need Follow-Up</div></div>';
    }
    h += '</div></div>';

    // Setup alert if no links
    if (!hasLinks) {
      h += '<div class="lb-card" style="border-left:4px solid #F59E0B;margin-bottom:20px">';
      h += '<div style="padding:20px;display:flex;align-items:center;gap:14px">';
      h += '<div style="font-size:1.5rem">⚠️</div>';
      h += '<div style="flex:1"><div style="font-size:.9rem;font-weight:700;color:var(--gray-900)">Set Up Your Review Links</div>';
      h += '<div style="font-size:.8rem;color:var(--gray-500)">Add your Google, Zillow, and other review profile links so they can be included in your emails.</div></div>';
      h += '<button class="btn btn-primary btn-sm" data-action="switch-view" data-view="links">Set Up Links</button>';
      h += '</div></div>';
    }

    // Action buttons
    h += '<div style="display:flex;gap:10px;margin-bottom:24px;flex-wrap:wrap">';
    h += '<button class="btn btn-primary btn-sm" data-action="new-request"><svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:#fff;margin-right:4px"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>New Review Request</button>';
    h += '<button class="btn btn-outline btn-sm" data-action="auto-detect">Auto-Detect from Closed Deals</button>';
    h += '</div>';

    // All requests with actions right on the dashboard
    h += '<div class="lb-card">';
    h += '<div class="lb-card-header"><div><div class="lb-card-title">Review Requests</div><div class="lb-card-sub">Create, send, and track — all from here</div></div></div>';

    // Filter tabs inline
    h += '<div style="display:flex;gap:6px;padding:12px 20px 0;flex-wrap:wrap">';
    ['all', 'pending', 'sent', 'received', 'overdue'].forEach(function (f) {
      h += '<button class="lb-filter-btn' + (currentFilter === f ? ' active' : '') + '" data-action="filter-requests" data-filter="' + f + '" style="font-size:.7rem;padding:3px 10px">' + f.charAt(0).toUpperCase() + f.slice(1) + '</button>';
    });
    h += '</div>';

    var filtered = requests.slice();
    if (currentFilter !== 'all') {
      if (currentFilter === 'overdue') {
        filtered = requests.filter(function (r) { return r.status === 'sent' && daysSince(r.sentDate) > 14; });
      } else {
        filtered = requests.filter(function (r) { return r.status === currentFilter; });
      }
    }
    filtered.sort(function (a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); });

    if (!filtered.length) {
      h += '<div style="padding:40px;text-align:center;color:var(--gray-400);font-size:.85rem">No requests' + (currentFilter !== 'all' ? ' matching this filter' : ' yet') + '. Click "New Review Request" to get started.</div>';
    } else {
      filtered.forEach(function (r) {
        var isOverdue = r.status === 'sent' && daysSince(r.sentDate) > 14;
        h += '<div class="lb-row" style="flex-wrap:wrap;gap:8px">';
        h += '<div style="flex:1;min-width:180px"><div class="lb-row-name">' + escHtml(r.clientName) + '</div>';
        h += '<div class="lb-row-sub">' + escHtml(r.clientEmail || 'No email') + (r.source ? ' · ' + escHtml(r.source) : '') + '</div></div>';
        h += '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">';
        if (r.status === 'received' && r.rating) h += '<span>' + starsHtml(r.rating, '14px') + '</span>';
        h += statusBadge(isOverdue ? 'overdue' : r.status);
        if (r.status === 'pending') {
          h += '<button class="btn btn-primary btn-sm" style="font-size:.68rem;padding:3px 10px" data-action="compose-email" data-id="' + r.id + '">Send Email</button>';
        }
        if (r.status === 'sent') {
          h += '<button class="btn btn-outline btn-sm" style="font-size:.68rem;padding:3px 10px" data-action="compose-email" data-id="' + r.id + '">Follow Up</button>';
          h += '<button class="btn btn-outline btn-sm" style="font-size:.68rem;padding:3px 10px;color:var(--emerald);border-color:var(--emerald)" data-action="mark-received" data-id="' + r.id + '">Got It!</button>';
        }
        h += '<button class="btn btn-outline btn-sm" style="font-size:.68rem;padding:3px 6px;color:var(--rose);border-color:var(--rose)" data-action="delete-request" data-id="' + r.id + '">&times;</button>';
        h += '</div></div>';
      });
    }
    h += '</div>';

    // Reviews by platform
    if (Object.keys(sourceStats).length) {
      h += '<div class="lb-card" style="margin-top:20px">';
      h += '<div class="lb-card-header"><div><div class="lb-card-title">Reviews by Platform (from requests)</div></div></div>';
      Object.keys(sourceStats).forEach(function (src) {
        var count = sourceStats[src];
        h += '<div class="lb-row">' + sourceBadge(src);
        h += '<div style="flex:1"></div>';
        h += '<div style="font-size:.9rem;font-weight:700;color:var(--gray-800)">' + count + ' review' + (count !== 1 ? 's' : '') + '</div></div>';
      });
      h += '</div>';
    }

    // Scorecard snapshot
    var scorecard = getScorecard();
    var goals = getGoals();
    var platforms = getAllPlatforms();
    var hasScorecard = platforms.some(function (src) { return scorecard[src] > 0; });
    var lastCheck = getLastCheck();
    var needsCheck = !lastCheck || daysSince(lastCheck) >= 7;

    if (needsCheck) {
      h += '<div class="lb-card" style="margin-top:20px;border-left:4px solid #3B82F6">';
      h += '<div style="padding:16px 20px;display:flex;align-items:center;gap:12px">';
      h += '<div style="font-size:1.2rem">🔔</div>';
      h += '<div style="flex:1;font-size:.85rem;color:var(--gray-700)"><strong>Weekly review check:</strong> Visit your profiles to see if you have new reviews and update your scorecard.</div>';
      h += '<button class="btn btn-outline btn-sm" data-action="switch-view" data-view="scorecard" style="font-size:.72rem">Go to Scorecard</button>';
      h += '</div></div>';
    }

    if (hasScorecard) {
      h += '<div class="lb-card" style="margin-top:20px">';
      h += '<div class="lb-card-header"><div><div class="lb-card-title">Review Scorecard</div><div class="lb-card-sub">Your total reviews across platforms</div></div>';
      h += '<button class="btn btn-outline btn-sm" data-action="switch-view" data-view="scorecard" style="font-size:.7rem;padding:3px 8px">Full Scorecard</button></div>';
      h += '<div style="display:flex;flex-wrap:wrap;gap:12px;padding:16px 20px">';
      platforms.forEach(function (src) {
        if (!scorecard[src]) return;
        var c = SOURCES[src] || { bg: '#F5F5F5', text: '#424242', icon: '🔗' };
        var count = scorecard[src];
        var goal = goals[src] || 0;
        h += '<div style="background:' + c.bg + ';border-radius:10px;padding:10px 16px;display:flex;align-items:center;gap:8px">';
        h += '<span style="font-size:1rem">' + c.icon + '</span>';
        h += '<div><div style="font-size:1rem;font-weight:800;color:' + c.text + '">' + count + (goal ? '/' + goal : '') + '</div>';
        h += '<div style="font-size:.65rem;font-weight:600;color:' + c.text + ';opacity:.7">' + escHtml(src) + '</div></div>';
        h += '</div>';
      });
      h += '</div></div>';
    }

    return h;
  }

  // ---- Render: All Requests ----
  function renderRequests() {
    var requests = getMyRequests();
    var filtered = requests;
    if (currentFilter !== 'all') {
      if (currentFilter === 'overdue') {
        filtered = requests.filter(function (r) { return r.status === 'sent' && daysSince(r.sentDate) > 14; });
      } else {
        filtered = requests.filter(function (r) { return r.status === currentFilter; });
      }
    }
    filtered.sort(function (a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); });

    var h = '';
    h += '<div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap">';
    h += '<button class="btn btn-primary btn-sm" data-action="new-request"><svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:#fff;margin-right:4px"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>New Request</button>';
    h += '</div>';

    // Filters
    h += '<div style="display:flex;gap:6px;margin-bottom:20px;flex-wrap:wrap">';
    ['all', 'pending', 'sent', 'received', 'overdue'].forEach(function (f) {
      h += '<button class="lb-filter-btn' + (currentFilter === f ? ' active' : '') + '" data-action="filter-requests" data-filter="' + f + '">' + f.charAt(0).toUpperCase() + f.slice(1) + '</button>';
    });
    h += '</div>';

    if (!filtered.length) {
      h += '<div style="text-align:center;padding:60px;color:var(--gray-400)">No requests match this filter.</div>';
    } else {
      h += '<div class="lb-card">';
      filtered.forEach(function (r) {
        var isOverdue = r.status === 'sent' && daysSince(r.sentDate) > 14;
        h += '<div class="lb-row" style="flex-wrap:wrap;gap:8px">';
        h += '<div style="flex:1;min-width:200px"><div class="lb-row-name">' + escHtml(r.clientName) + '</div>';
        h += '<div class="lb-row-sub">' + escHtml(r.clientEmail || '') + (r.address ? ' · ' + escHtml(r.address) : '') + '</div></div>';
        h += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">';
        if (r.source) h += sourceBadge(r.source);
        if (r.status === 'received' && r.rating) h += '<span>' + starsHtml(r.rating, '14px') + '</span>';
        h += statusBadge(isOverdue ? 'overdue' : r.status);
        h += '<div style="display:flex;gap:4px">';
        if (r.status === 'pending') {
          h += '<button class="btn btn-primary btn-sm" style="font-size:.7rem;padding:3px 10px" data-action="compose-email" data-id="' + r.id + '">Send Email</button>';
        }
        if (r.status === 'sent') {
          h += '<button class="btn btn-outline btn-sm" style="font-size:.7rem;padding:3px 10px" data-action="compose-email" data-id="' + r.id + '">Follow Up</button>';
          h += '<button class="btn btn-outline btn-sm" style="font-size:.7rem;padding:3px 10px;color:var(--emerald);border-color:var(--emerald)" data-action="mark-received" data-id="' + r.id + '">Got It!</button>';
        }
        h += '<button class="btn btn-outline btn-sm" style="font-size:.7rem;padding:3px 8px;color:var(--rose);border-color:var(--rose)" data-action="delete-request" data-id="' + r.id + '">&times;</button>';
        h += '</div></div></div>';
      });
      h += '</div>';
    }
    return h;
  }

  // ---- Render: Email Templates ----
  function renderTemplates() {
    var templates = getTemplates();
    var h = '';

    h += '<div style="display:flex;gap:10px;margin-bottom:20px">';
    h += '<button class="btn btn-primary btn-sm" data-action="add-template"><svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:#fff;margin-right:4px"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>New Template</button>';
    h += '<button class="btn btn-outline btn-sm" data-action="reset-templates">Reset to Defaults</button>';
    h += '</div>';

    if (!templates.length) {
      h += '<div style="text-align:center;padding:60px;color:var(--gray-400)">No templates. Click "New Template" or "Reset to Defaults" to get started.</div>';
    } else {
      templates.forEach(function (t, i) {
        h += '<div class="lb-card" style="margin-bottom:16px">';
        h += '<div style="padding:20px">';
        h += '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">';
        h += '<div><div style="font-size:1rem;font-weight:700;color:var(--gray-900)">' + escHtml(t.name) + '</div>';
        if (t.timing) h += '<div style="font-size:.75rem;color:var(--gray-400);margin-top:2px">📅 ' + escHtml(t.timing) + '</div>';
        h += '</div>';
        h += '<div style="display:flex;gap:6px">';
        h += '<button class="btn btn-outline btn-sm" style="font-size:.72rem;padding:3px 10px" data-action="edit-template" data-index="' + i + '">Edit</button>';
        h += '<button class="btn btn-outline btn-sm" style="font-size:.72rem;padding:3px 10px;color:var(--rose);border-color:var(--rose)" data-action="delete-template" data-index="' + i + '">Delete</button>';
        h += '</div></div>';
        h += '<div style="font-size:.82rem;font-weight:600;color:var(--gray-700);margin-bottom:6px">Subject: ' + escHtml(t.subject) + '</div>';
        h += '<div style="font-size:.78rem;color:var(--gray-500);white-space:pre-wrap;line-height:1.5;background:var(--gray-50);padding:12px;border-radius:8px;max-height:160px;overflow-y:auto">' + escHtml(t.body) + '</div>';
        h += '<div style="margin-top:10px;font-size:.7rem;color:var(--gray-400)">Variables: {{clientName}}, {{clientFirstName}}, {{agentName}}, {{reviewLink}}, {{platform}}, {{transactionType}}, {{address}}</div>';
        h += '</div></div>';
      });
    }
    return h;
  }

  // ---- Render: Review Links ----
  function renderLinks() {
    var links = getMyLinks();
    var h = '';

    h += '<div class="lb-card">';
    h += '<div style="padding:20px">';
    h += '<div style="font-size:1rem;font-weight:700;color:var(--gray-900);margin-bottom:4px">Your Review Profile Links</div>';
    h += '<div style="font-size:.8rem;color:var(--gray-500);margin-bottom:20px">Add your review profile URLs. These will be inserted into email templates using the {{reviewLink}} variable.</div>';

    SOURCE_KEYS.forEach(function (src) {
      var c = SOURCES[src];
      h += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">';
      h += '<div style="width:100px;font-size:.85rem;font-weight:600;color:' + c.text + '">' + c.icon + ' ' + escHtml(src) + '</div>';
      h += '<input type="text" value="' + escHtml(links[src] || '') + '" placeholder="https://..." style="flex:1;border:1.5px solid var(--gray-200);border-radius:8px;padding:8px 12px;font-size:.82rem;outline:none" data-action="save-link" data-source="' + escHtml(src) + '">';
      h += '</div>';
    });

    // Custom links added by agent
    var customLinks = [];
    Object.keys(links).forEach(function (k) {
      if (k !== '_default' && SOURCE_KEYS.indexOf(k) === -1 && links[k]) {
        customLinks.push(k);
      }
    });
    customLinks.forEach(function (name) {
      h += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">';
      h += '<div style="width:100px;font-size:.85rem;font-weight:600;color:var(--gray-600)">🔗 ' + escHtml(name) + '</div>';
      h += '<input type="text" value="' + escHtml(links[name] || '') + '" placeholder="https://..." style="flex:1;border:1.5px solid var(--gray-200);border-radius:8px;padding:8px 12px;font-size:.82rem;outline:none" data-action="save-link" data-source="' + escHtml(name) + '">';
      h += '<button class="btn btn-outline btn-sm" style="color:var(--rose);border-color:var(--rose);padding:4px 10px;font-size:.72rem" data-action="remove-custom-link" data-name="' + escHtml(name) + '">Remove</button>';
      h += '</div>';
    });

    // Add custom platform
    h += '<div style="display:flex;align-items:center;gap:8px;margin-top:16px;padding-top:16px;border-top:1px solid var(--gray-100)">';
    h += '<input type="text" id="customLinkName" placeholder="Platform name (e.g. Homes.com)" style="width:180px;border:1.5px solid var(--gray-200);border-radius:8px;padding:8px 12px;font-size:.82rem;outline:none">';
    h += '<input type="text" id="customLinkUrl" placeholder="https://..." style="flex:1;border:1.5px solid var(--gray-200);border-radius:8px;padding:8px 12px;font-size:.82rem;outline:none">';
    h += '<button class="btn btn-primary btn-sm" data-action="add-custom-link" style="white-space:nowrap">+ Add Platform</button>';
    h += '</div>';

    h += '<div style="margin-top:16px;font-size:.75rem;color:var(--gray-400)">Tip: For Google, go to your Google Business Profile → "Ask for reviews" → copy the link. For Zillow, navigate to your profile page and copy the URL.</div>';
    h += '</div></div>';

    // Default platform selection
    h += '<div class="lb-card" style="margin-top:16px">';
    h += '<div style="padding:20px">';
    h += '<div style="font-size:.9rem;font-weight:700;color:var(--gray-900);margin-bottom:8px">Default Review Platform</div>';
    h += '<div style="font-size:.78rem;color:var(--gray-500);margin-bottom:12px">This platform\'s link will be used by default in email templates</div>';
    h += '<select style="border:1.5px solid var(--gray-200);border-radius:8px;padding:8px 12px;font-size:.85rem;width:200px" data-action="save-default-platform">';
    var allPlatforms = SOURCE_KEYS.slice();
    customLinks.forEach(function (name) { allPlatforms.push(name); });
    allPlatforms.forEach(function (src) {
      h += '<option value="' + escHtml(src) + '"' + (links._default === src ? ' selected' : '') + '>' + escHtml(src) + '</option>';
    });
    h += '</select>';
    h += '</div></div>';

    return h;
  }

  // ---- Render: Scorecard ----
  function renderScorecard() {
    var scorecard = getScorecard();
    var goals = getGoals();
    var links = getMyLinks();
    var platforms = getAllPlatforms();
    var lastCheck = getLastCheck();
    var daysSinceCheck = lastCheck ? daysSince(lastCheck) : null;
    var needsCheck = daysSinceCheck === null || daysSinceCheck >= 7;

    var h = '';

    // Weekly check reminder
    if (needsCheck) {
      h += '<div class="lb-card" style="border-left:4px solid #3B82F6;margin-bottom:20px">';
      h += '<div style="padding:20px;display:flex;align-items:center;gap:14px">';
      h += '<div style="font-size:1.5rem">🔔</div>';
      h += '<div style="flex:1"><div style="font-size:.9rem;font-weight:700;color:var(--gray-900)">Time for a Review Check!</div>';
      h += '<div style="font-size:.8rem;color:var(--gray-500)">' + (daysSinceCheck === null ? 'You haven\'t checked your reviews yet.' : 'It\'s been ' + daysSinceCheck + ' days since your last check.') + ' Visit each platform below to see if you have new reviews, then update your counts.</div></div>';
      h += '<button class="btn btn-primary btn-sm" data-action="mark-checked">I\'ve Checked</button>';
      h += '</div></div>';
    } else {
      h += '<div style="margin-bottom:20px;font-size:.82rem;color:var(--gray-400)">✅ Last checked ' + daysSinceCheck + ' day' + (daysSinceCheck !== 1 ? 's' : '') + ' ago — <button style="background:none;border:none;color:var(--indigo);cursor:pointer;font-size:.82rem;font-weight:600;text-decoration:underline" data-action="mark-checked">Check again now</button></div>';
    }

    // Platform scorecard grid
    h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-bottom:24px">';
    platforms.forEach(function (src) {
      var c = SOURCES[src] || { bg: '#F5F5F5', text: '#424242', icon: '🔗' };
      var count = scorecard[src] || 0;
      var goal = goals[src] || 0;
      var avgRating = scorecard[src + '_rating'] || 0;
      var link = links[src] || '';
      var pct = goal > 0 ? Math.min(Math.round(count / goal * 100), 100) : 0;

      h += '<div class="lb-card" style="margin-bottom:0">';
      h += '<div style="height:4px;background:' + c.text + '"></div>';
      h += '<div style="padding:20px">';

      // Header
      h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">';
      h += '<div style="display:flex;align-items:center;gap:8px"><span style="font-size:1.2rem">' + c.icon + '</span><span style="font-size:1rem;font-weight:800;color:var(--gray-900)">' + escHtml(src) + '</span></div>';
      if (link) h += '<a href="' + escHtml(link) + '" target="_blank" rel="noopener" class="btn btn-outline btn-sm" style="font-size:.68rem;padding:3px 10px">Check Reviews ↗</a>';
      h += '</div>';

      // Count + rating
      h += '<div style="display:flex;gap:20px;margin-bottom:14px">';
      h += '<div><div style="font-size:2rem;font-weight:900;color:var(--gray-900);line-height:1">' + count + '</div><div style="font-size:.7rem;color:var(--gray-400);font-weight:600">REVIEWS</div></div>';
      if (avgRating > 0) {
        h += '<div><div style="font-size:2rem;font-weight:900;color:#F59E0B;line-height:1">' + avgRating.toFixed(1) + '</div><div style="font-size:.7rem;color:var(--gray-400);font-weight:600">AVG RATING</div></div>';
      }
      h += '</div>';

      // Goal progress
      if (goal > 0) {
        h += '<div style="margin-bottom:12px">';
        h += '<div style="display:flex;justify-content:space-between;font-size:.72rem;color:var(--gray-500);margin-bottom:4px"><span>Goal: ' + goal + ' reviews</span><span>' + pct + '%</span></div>';
        h += '<div style="height:6px;background:var(--gray-100);border-radius:99px;overflow:hidden"><div style="height:100%;width:' + pct + '%;background:' + c.text + ';border-radius:99px;transition:width .3s"></div></div>';
        h += '</div>';
      }

      // Quick update buttons
      h += '<div style="display:flex;gap:6px;flex-wrap:wrap">';
      h += '<button class="btn btn-outline btn-sm" style="font-size:.72rem;padding:4px 10px" data-action="update-count" data-src="' + escHtml(src) + '">Update Count</button>';
      h += '<button class="btn btn-outline btn-sm" style="font-size:.72rem;padding:4px 10px" data-action="quick-log" data-src="' + escHtml(src) + '">+ Quick Log Review</button>';
      h += '<button class="btn btn-outline btn-sm" style="font-size:.72rem;padding:4px 10px" data-action="set-goal" data-src="' + escHtml(src) + '">Set Goal</button>';
      h += '</div>';

      h += '</div></div>';
    });
    h += '</div>';

    // Total summary
    var totalReviews = 0;
    var totalGoal = 0;
    platforms.forEach(function (src) { totalReviews += (scorecard[src] || 0); totalGoal += (goals[src] || 0); });
    h += '<div class="lb-card">';
    h += '<div style="padding:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px">';
    h += '<div><div style="font-size:1rem;font-weight:700;color:var(--gray-900)">Total Across All Platforms</div>';
    h += '<div style="font-size:.8rem;color:var(--gray-400)">Combined review count from all your profiles</div></div>';
    h += '<div style="display:flex;gap:24px;align-items:center">';
    h += '<div style="text-align:center"><div style="font-size:2rem;font-weight:900;color:var(--gray-900)">' + totalReviews + '</div><div style="font-size:.7rem;color:var(--gray-400)">Total Reviews</div></div>';
    if (totalGoal > 0) {
      var totalPct = Math.min(Math.round(totalReviews / totalGoal * 100), 100);
      h += '<div style="text-align:center"><div style="font-size:2rem;font-weight:900;color:var(--indigo)">' + totalPct + '%</div><div style="font-size:.7rem;color:var(--gray-400)">of Goal (' + totalGoal + ')</div></div>';
    }
    h += '</div></div></div>';

    // Review log (history of quick-logged reviews)
    var loggedReviews = (scorecard._log || []).slice().reverse().slice(0, 15);
    if (loggedReviews.length) {
      h += '<div class="lb-card" style="margin-top:20px">';
      h += '<div class="lb-card-header"><div><div class="lb-card-title">Recent Review Log</div><div class="lb-card-sub">Reviews you\'ve manually logged</div></div></div>';
      loggedReviews.forEach(function (entry) {
        h += '<div class="lb-row">';
        h += '<div style="flex:1;min-width:0"><div class="lb-row-name">' + escHtml(entry.clientName || 'Anonymous') + '</div>';
        h += '<div class="lb-row-sub">' + escHtml(entry.platform) + ' · ' + formatDate(entry.date) + '</div></div>';
        h += '<div style="display:flex;align-items:center;gap:8px">' + starsHtml(entry.rating || 5, '14px') + sourceBadge(entry.platform) + '</div>';
        h += '</div>';
      });
      h += '</div>';
    }

    return h;
  }

  // ---- Main Render ----
  function render() {
    var h = '';

    // View tabs
    h += '<div style="display:flex;gap:6px;margin-bottom:24px;background:var(--gray-100);border-radius:10px;padding:4px;width:fit-content">';
    [{ key: 'dashboard', label: 'Dashboard' }, { key: 'scorecard', label: 'Scorecard' }, { key: 'requests', label: 'All Requests' }, { key: 'templates', label: 'Email Templates' }, { key: 'links', label: 'Review Links' }].forEach(function (tab) {
      h += '<button style="padding:8px 20px;border-radius:8px;font-size:.82rem;font-weight:600;cursor:pointer;border:none;transition:all .15s;' +
        (currentView === tab.key ? 'background:var(--white);color:var(--gray-900);box-shadow:0 1px 3px rgba(0,0,0,.1)' : 'background:none;color:var(--gray-500)') +
        '" data-action="switch-view" data-view="' + tab.key + '">' + tab.label + '</button>';
    });
    h += '</div>';

    switch (currentView) {
      case 'dashboard': h += renderDashboard(); break;
      case 'scorecard': h += renderScorecard(); break;
      case 'requests': h += renderRequests(); break;
      case 'templates': h += renderTemplates(); break;
      case 'links': h += renderLinks(); break;
    }

    pageBody.innerHTML = h;
  }

  // ---- New Request Modal ----
  function openRequestModal(existing) {
    var r = existing || {};
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.id = 'reviewModalOverlay';

    var sourceOpts = '<option value="">Select platform...</option>';
    var myLinks = getMyLinks();
    var allSources = SOURCE_KEYS.slice();
    Object.keys(myLinks).forEach(function (k) { if (k !== '_default' && allSources.indexOf(k) === -1 && myLinks[k]) allSources.push(k); });
    allSources.forEach(function (src) {
      sourceOpts += '<option value="' + escHtml(src) + '"' + (r.source === src ? ' selected' : '') + '>' + escHtml(src) + '</option>';
    });

    overlay.innerHTML =
      '<div class="modal" style="max-width:500px">' +
        '<div class="modal-header"><h3>' + (existing ? 'Edit Request' : 'New Review Request') + '</h3><button class="modal-close" data-action="close-modal">&times;</button></div>' +
        '<div class="modal-body">' +
          '<div class="form-group"><label>Client Name *</label><input type="text" id="rrName" class="form-control" value="' + escHtml(r.clientName || '') + '" placeholder="John & Lisa Thompson"></div>' +
          '<div class="form-group"><label>Client Email *</label><input type="email" id="rrEmail" class="form-control" value="' + escHtml(r.clientEmail || '') + '" placeholder="client@email.com"></div>' +
          '<div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
            '<div class="form-group"><label>Platform</label><select id="rrSource" class="form-control">' + sourceOpts + '</select></div>' +
            '<div class="form-group"><label>Property Address</label><input type="text" id="rrAddress" class="form-control" value="' + escHtml(r.address || '') + '" placeholder="123 Main St"></div>' +
          '</div>' +
          '<input type="hidden" id="rrId" value="' + escHtml(r.id || '') + '">' +
          '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px">' +
            '<button class="btn btn-outline" data-action="close-modal">Cancel</button>' +
            '<button class="btn btn-primary" data-action="save-request">Save</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
    document.getElementById('rrName').focus();
  }

  // ---- Compose Email Modal ----
  function openComposeModal(requestId) {
    var requests = getMyRequests();
    var r = requests.find(function (req) { return req.id === requestId; });
    if (!r) return;

    var templates = getTemplates();
    var links = getMyLinks();
    var defaultPlatform = links._default || 'Google';
    var reviewLink = links[r.source || defaultPlatform] || links[defaultPlatform] || '[Your review link — set up in Review Links tab]';

    var vars = {
      clientName: r.clientName || '',
      clientFirstName: (r.clientName || '').split(' ')[0] || '',
      agentName: session.displayName || '',
      reviewLink: reviewLink,
      platform: r.source || defaultPlatform,
      transactionType: 'purchase',
      address: r.address || ''
    };

    var tplOpts = '<option value="">Select a template...</option>';
    templates.forEach(function (t, i) {
      tplOpts += '<option value="' + i + '">' + escHtml(t.name) + '</option>';
    });

    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.id = 'composeModalOverlay';

    overlay.innerHTML =
      '<div class="modal" style="max-width:600px">' +
        '<div class="modal-header"><h3>Compose Review Email</h3><button class="modal-close" data-action="close-compose">&times;</button></div>' +
        '<div class="modal-body">' +
          '<div style="margin-bottom:12px;font-size:.82rem;color:var(--gray-500)">To: <strong>' + escHtml(r.clientName) + '</strong> &lt;' + escHtml(r.clientEmail) + '&gt;</div>' +
          '<div class="form-group"><label>Template</label><select id="ceTemplate" class="form-control">' + tplOpts + '</select></div>' +
          '<div class="form-group"><label>Subject</label><input type="text" id="ceSubject" class="form-control" value="" placeholder="Email subject line"></div>' +
          '<div class="form-group"><label>Body</label><textarea id="ceBody" class="form-control" rows="10" style="font-size:.82rem;line-height:1.6" placeholder="Email body..."></textarea></div>' +
          '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px">' +
            '<button class="btn btn-outline" data-action="close-compose">Cancel</button>' +
            '<button class="btn btn-outline" data-action="copy-email">Copy to Clipboard</button>' +
            '<button class="btn btn-primary" data-action="open-review-gmail" data-id="' + r.id + '">Open in Gmail</button>' +
            '<button class="btn btn-outline" data-action="open-review-outlook" data-id="' + r.id + '">Outlook</button>' +
            '<button class="btn btn-outline" data-action="open-mailto" data-id="' + r.id + '">Other</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });

    // Template selection handler
    var tplSelect = document.getElementById('ceTemplate');
    var subjectInput = document.getElementById('ceSubject');
    var bodyInput = document.getElementById('ceBody');

    tplSelect.addEventListener('change', function () {
      var idx = parseInt(this.value);
      if (isNaN(idx)) return;
      var t = templates[idx];
      if (t) {
        subjectInput.value = mergeTemplate(t.subject, vars);
        bodyInput.value = mergeTemplate(t.body, vars);
      }
    });

    // Auto-select first template
    if (templates.length) {
      tplSelect.value = '0';
      tplSelect.dispatchEvent(new Event('change'));
    }
  }

  // ---- Mark as Received Modal ----
  function openReceivedModal(requestId) {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.id = 'receivedModalOverlay';

    overlay.innerHTML =
      '<div class="modal" style="max-width:400px">' +
        '<div class="modal-header"><h3>Review Received!</h3><button class="modal-close" data-action="close-received">&times;</button></div>' +
        '<div class="modal-body">' +
          '<div class="form-group"><label>Rating</label><div id="rcStarPicker" style="display:flex;gap:4px;cursor:pointer">';
    for (var i = 1; i <= 5; i++) {
      overlay.innerHTML; // Force string build
    }
    var starHtml = '';
    for (var s = 1; s <= 5; s++) {
      starHtml += '<span data-star="' + s + '" style="font-size:28px;color:#CBD5E1;transition:color .15s">&#9733;</span>';
    }
    overlay.innerHTML =
      '<div class="modal" style="max-width:400px">' +
        '<div class="modal-header"><h3>Review Received! 🎉</h3><button class="modal-close" data-action="close-received">&times;</button></div>' +
        '<div class="modal-body">' +
          '<div class="form-group"><label>What rating did they give?</label><div id="rcStarPicker" style="display:flex;gap:4px;cursor:pointer">' + starHtml + '</div><input type="hidden" id="rcRating" value="5"></div>' +
          '<div class="form-group"><label>Review text (optional)</label><textarea id="rcText" class="form-control" rows="3" placeholder="Paste their review text..."></textarea></div>' +
          '<input type="hidden" id="rcId" value="' + requestId + '">' +
          '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px">' +
            '<button class="btn btn-outline" data-action="close-received">Cancel</button>' +
            '<button class="btn btn-primary" data-action="confirm-received">Save</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });

    // Star picker
    var picker = document.getElementById('rcStarPicker');
    var ratingInput = document.getElementById('rcRating');
    if (picker) {
      picker.addEventListener('click', function (e) {
        var star = e.target.closest('[data-star]');
        if (!star) return;
        var val = parseInt(star.getAttribute('data-star'));
        ratingInput.value = val;
        picker.querySelectorAll('[data-star]').forEach(function (s) {
          s.style.color = parseInt(s.getAttribute('data-star')) <= val ? '#F59E0B' : '#CBD5E1';
        });
      });
    }
  }

  // ---- Template Edit Modal ----
  // ---- Quick Log Modal ----
  function openQuickLogModal(platform) {
    var starHtml = '';
    for (var s = 1; s <= 5; s++) {
      starHtml += '<span data-star="' + s + '" style="font-size:28px;color:' + (s <= 5 ? '#F59E0B' : '#CBD5E1') + ';cursor:pointer;transition:color .15s">&#9733;</span>';
    }

    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.id = 'quickLogOverlay';
    overlay.innerHTML =
      '<div class="modal" style="max-width:440px">' +
        '<div class="modal-header"><h3>Quick Log Review</h3><button class="modal-close" data-action="close-quicklog">&times;</button></div>' +
        '<div class="modal-body">' +
          '<div style="margin-bottom:12px;font-size:.82rem;color:var(--gray-500)">Log a new review you received on <strong>' + escHtml(platform) + '</strong></div>' +
          '<input type="hidden" id="qlPlatform" value="' + escHtml(platform) + '">' +
          '<div class="form-group"><label>Client Name (optional)</label><input type="text" id="qlName" class="form-control" placeholder="Who left the review?"></div>' +
          '<div class="form-group"><label>Rating</label><div id="qlStarPicker" style="display:flex;gap:4px">' + starHtml + '</div><input type="hidden" id="qlRating" value="5"></div>' +
          '<div class="form-group"><label>Review snippet (optional)</label><textarea id="qlText" class="form-control" rows="3" placeholder="Paste a snippet of the review..."></textarea></div>' +
          '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px">' +
            '<button class="btn btn-outline" data-action="close-quicklog">Cancel</button>' +
            '<button class="btn btn-primary" data-action="save-quick-log">Log Review</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });

    // Star picker
    var picker = document.getElementById('qlStarPicker');
    var ratingInput = document.getElementById('qlRating');
    if (picker) {
      picker.addEventListener('click', function (e) {
        var star = e.target.closest('[data-star]');
        if (!star) return;
        var val = parseInt(star.getAttribute('data-star'));
        ratingInput.value = val;
        picker.querySelectorAll('[data-star]').forEach(function (s) {
          s.style.color = parseInt(s.getAttribute('data-star')) <= val ? '#F59E0B' : '#CBD5E1';
        });
      });
    }
    document.getElementById('qlName').focus();
  }

  function openTemplateModal(existing, index) {
    var t = existing || { name: '', subject: '', body: '', timing: '' };
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.id = 'templateModalOverlay';

    overlay.innerHTML =
      '<div class="modal" style="max-width:600px">' +
        '<div class="modal-header"><h3>' + (existing ? 'Edit Template' : 'New Template') + '</h3><button class="modal-close" data-action="close-tpl">&times;</button></div>' +
        '<div class="modal-body">' +
          '<div class="form-group"><label>Template Name</label><input type="text" id="tplName" class="form-control" value="' + escHtml(t.name) + '" placeholder="e.g. Post-Close Thank You"></div>' +
          '<div class="form-group"><label>When to Send</label><input type="text" id="tplTiming" class="form-control" value="' + escHtml(t.timing || '') + '" placeholder="e.g. Send 1-3 days after close"></div>' +
          '<div class="form-group"><label>Subject Line</label><input type="text" id="tplSubject" class="form-control" value="' + escHtml(t.subject) + '" placeholder="Thank you, {{clientName}}!"></div>' +
          '<div class="form-group"><label>Email Body</label><textarea id="tplBody" class="form-control" rows="8" style="font-size:.82rem;line-height:1.6">' + escHtml(t.body) + '</textarea></div>' +
          '<div style="font-size:.72rem;color:var(--gray-400);margin-bottom:12px">Available variables: {{clientName}}, {{clientFirstName}}, {{agentName}}, {{reviewLink}}, {{platform}}, {{transactionType}}, {{address}}</div>' +
          '<input type="hidden" id="tplIndex" value="' + (index !== undefined ? index : -1) + '">' +
          '<div style="display:flex;gap:10px;justify-content:flex-end">' +
            '<button class="btn btn-outline" data-action="close-tpl">Cancel</button>' +
            '<button class="btn btn-primary" data-action="save-template">Save Template</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
    document.getElementById('tplName').focus();
  }

  // ---- Events ----
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-action]');
    if (!t) return;
    var action = t.getAttribute('data-action');

    if (action === 'switch-view') {
      currentView = t.getAttribute('data-view');
      render();
    }
    if (action === 'filter-requests') {
      currentFilter = t.getAttribute('data-filter');
      render();
    }
    if (action === 'new-request') openRequestModal();
    if (action === 'close-modal') { var m = document.getElementById('reviewModalOverlay'); if (m) m.remove(); }
    if (action === 'close-compose') { var m = document.getElementById('composeModalOverlay'); if (m) m.remove(); }
    if (action === 'close-received') { var m = document.getElementById('receivedModalOverlay'); if (m) m.remove(); }
    if (action === 'close-tpl') { var m = document.getElementById('templateModalOverlay'); if (m) m.remove(); }

    if (action === 'save-request') {
      var id = document.getElementById('rrId').value;
      var name = document.getElementById('rrName').value.trim();
      var email = document.getElementById('rrEmail').value.trim();
      var source = document.getElementById('rrSource').value;
      var address = document.getElementById('rrAddress').value.trim();
      if (!name) { showToast('Client name is required', 'error'); return; }
      if (!email) { showToast('Client email is required', 'error'); return; }
      var all = getRequests();
      if (id) {
        all = all.map(function (r) {
          if (r.id === id) { r.clientName = name; r.clientEmail = email; r.source = source; r.address = address; }
          return r;
        });
      } else {
        all.push({ id: generateId(), agent: session.username, clientName: name, clientEmail: email, source: source, address: address, status: 'pending', createdAt: new Date().toISOString() });
      }
      saveRequests(all);
      var m = document.getElementById('reviewModalOverlay'); if (m) m.remove();
      showToast(id ? 'Request updated' : 'Request created');
      render();
    }

    if (action === 'delete-request') {
      if (!confirm('Delete this request?')) return;
      var id = t.getAttribute('data-id');
      saveRequests(getRequests().filter(function (r) { return r.id !== id; }));
      showToast('Request deleted');
      render();
    }

    if (action === 'compose-email') {
      openComposeModal(t.getAttribute('data-id'));
    }

    if (action === 'copy-email') {
      var subject = document.getElementById('ceSubject').value;
      var body = document.getElementById('ceBody').value;
      var text = 'Subject: ' + subject + '\n\n' + body;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function () { showToast('Copied to clipboard!'); });
      }
    }

    function markReviewSent(reqId) {
      var all = getRequests();
      all = all.map(function (req) {
        if (req.id === reqId && req.status === 'pending') { req.status = 'sent'; req.sentDate = new Date().toISOString(); }
        return req;
      });
      saveRequests(all);
      var m = document.getElementById('composeModalOverlay'); if (m) m.remove();
      showToast('Email opened — request marked as sent');
      render();
    }

    if (action === 'open-review-gmail' || action === 'open-review-outlook' || action === 'open-mailto') {
      var reqId = t.getAttribute('data-id');
      var requests = getMyRequests();
      var r = requests.find(function (req) { return req.id === reqId; });
      if (!r) return;
      var subject = document.getElementById('ceSubject').value;
      var body = document.getElementById('ceBody').value;

      if (action === 'open-review-gmail') {
        var gmailUrl = 'https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=' + encodeURIComponent(r.clientEmail) + '&su=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
        window.open(gmailUrl, 'gmail_compose', 'width=700,height=600,scrollbars=yes');
      } else if (action === 'open-review-outlook') {
        var a = document.createElement('a'); a.href = 'https://outlook.live.com/mail/0/deeplink/compose?to=' + encodeURIComponent(r.clientEmail) + '&subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body); a.target = '_blank'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
      } else {
        window.location.href = 'mailto:' + encodeURIComponent(r.clientEmail) + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      }
      markReviewSent(reqId);
    }

    if (action === 'mark-received') {
      openReceivedModal(t.getAttribute('data-id'));
    }

    if (action === 'confirm-received') {
      var id = document.getElementById('rcId').value;
      var rating = parseInt(document.getElementById('rcRating').value) || 5;
      var text = document.getElementById('rcText').value.trim();
      var all = getRequests();
      all = all.map(function (r) {
        if (r.id === id) { r.status = 'received'; r.rating = rating; r.reviewText = text; r.receivedDate = new Date().toISOString(); }
        return r;
      });
      saveRequests(all);
      var m = document.getElementById('receivedModalOverlay'); if (m) m.remove();
      showToast('Review marked as received! 🎉');
      render();
    }

    if (action === 'auto-detect') {
      var closed = getClosedTxns();
      var existing = getMyRequests();
      var existingAddresses = {};
      existing.forEach(function (r) { if (r.address) existingAddresses[r.address.toLowerCase()] = true; });
      var added = 0;
      var all = getRequests();
      closed.forEach(function (txn) {
        if (txn.address && !existingAddresses[txn.address.toLowerCase()]) {
          // Try to get client info from parties
          var parties = {};
          try { parties = JSON.parse(localStorage.getItem(PREFIX + 'txn_parties') || '{}'); } catch (e) {}
          var p = parties[txn.id] || {};
          var buyers = p.buyers || [];
          if (!buyers.length && p.buyer && p.buyer.name) buyers = [p.buyer];
          var client = buyers[0] || {};
          all.push({
            id: generateId(),
            agent: session.username,
            clientName: client.name || 'Client',
            clientEmail: client.email || '',
            source: '',
            address: txn.address,
            status: 'pending',
            createdAt: new Date().toISOString()
          });
          added++;
        }
      });
      if (added > 0) {
        saveRequests(all);
        showToast(added + ' review request' + (added > 1 ? 's' : '') + ' created from closed deals');
      } else {
        showToast('No new closed deals to create requests for');
      }
      render();
    }

    if (action === 'add-template') openTemplateModal();
    if (action === 'edit-template') {
      var idx = parseInt(t.getAttribute('data-index'));
      var templates = getTemplates();
      if (templates[idx]) openTemplateModal(templates[idx], idx);
    }
    if (action === 'delete-template') {
      var idx = parseInt(t.getAttribute('data-index'));
      var templates = getTemplates();
      templates.splice(idx, 1);
      saveTemplates(templates);
      showToast('Template deleted');
      render();
    }
    if (action === 'reset-templates') {
      saveTemplates(JSON.parse(JSON.stringify(DEFAULT_TEMPLATES)));
      showToast('Templates reset to defaults');
      render();
    }
    if (action === 'save-template') {
      var name = document.getElementById('tplName').value.trim();
      var subject = document.getElementById('tplSubject').value.trim();
      var body = document.getElementById('tplBody').value.trim();
      var timing = document.getElementById('tplTiming').value.trim();
      var idx = parseInt(document.getElementById('tplIndex').value);
      if (!name || !subject || !body) { showToast('Name, subject, and body are required', 'error'); return; }
      var templates = getTemplates();
      if (idx >= 0 && templates[idx]) {
        templates[idx].name = name;
        templates[idx].subject = subject;
        templates[idx].body = body;
        templates[idx].timing = timing;
      } else {
        templates.push({ id: 'tpl_' + Date.now().toString(36), name: name, subject: subject, body: body, timing: timing });
      }
      saveTemplates(templates);
      var m = document.getElementById('templateModalOverlay'); if (m) m.remove();
      showToast('Template saved');
      render();
    }

    if (action === 'add-custom-link') {
      var nameEl = document.getElementById('customLinkName');
      var urlEl = document.getElementById('customLinkUrl');
      var name = nameEl ? nameEl.value.trim() : '';
      var url = urlEl ? urlEl.value.trim() : '';
      if (!name) { showToast('Enter a platform name', 'error'); if (nameEl) nameEl.focus(); return; }
      var links = getMyLinks();
      links[name] = url;
      saveMyLinks(links);
      showToast(name + ' added');
      render();
    }

    if (action === 'remove-custom-link') {
      var name = t.getAttribute('data-name');
      var links = getMyLinks();
      delete links[name];
      saveMyLinks(links);
      showToast(name + ' removed');
      render();
    }

    if (action === 'mark-checked') {
      saveLastCheck();
      showToast('Review check logged!');
      render();
    }

    if (action === 'update-count') {
      var src = t.getAttribute('data-src');
      var scorecard = getScorecard();
      var current = scorecard[src] || 0;
      var val = prompt('How many total ' + src + ' reviews do you have now?', current);
      if (val !== null) {
        scorecard[src] = parseInt(val) || 0;
        saveScorecard(scorecard);
        showToast(src + ' count updated to ' + scorecard[src]);
        render();
      }
    }

    if (action === 'set-goal') {
      var src = t.getAttribute('data-src');
      var goals = getGoals();
      var current = goals[src] || 0;
      var val = prompt('Set your ' + src + ' review goal:', current || 25);
      if (val !== null) {
        goals[src] = parseInt(val) || 0;
        saveGoals(goals);
        showToast(src + ' goal set to ' + goals[src]);
        render();
      }
    }

    if (action === 'quick-log') {
      var src = t.getAttribute('data-src');
      openQuickLogModal(src);
    }

    if (action === 'save-quick-log') {
      var platform = document.getElementById('qlPlatform').value;
      var name = document.getElementById('qlName').value.trim();
      var rating = parseInt(document.getElementById('qlRating').value) || 5;
      var text = document.getElementById('qlText').value.trim();

      // Save to log
      var scorecard = getScorecard();
      if (!scorecard._log) scorecard._log = [];
      scorecard._log.push({
        platform: platform,
        clientName: name || 'Anonymous',
        rating: rating,
        text: text,
        date: new Date().toISOString()
      });
      // Auto-increment count
      scorecard[platform] = (scorecard[platform] || 0) + 1;
      // Update average rating
      var logForPlatform = scorecard._log.filter(function (e) { return e.platform === platform && e.rating; });
      if (logForPlatform.length) {
        var rSum = 0;
        logForPlatform.forEach(function (e) { rSum += e.rating; });
        scorecard[platform + '_rating'] = parseFloat((rSum / logForPlatform.length).toFixed(1));
      }
      saveScorecard(scorecard);

      // Also mark as received in requests if there's a matching pending/sent request
      var allReqs = getRequests();
      var matched = false;
      allReqs = allReqs.map(function (r) {
        if (!matched && r.agent === session.username && r.source === platform && (r.status === 'sent' || r.status === 'pending')) {
          r.status = 'received';
          r.rating = rating;
          r.reviewText = text;
          r.receivedDate = new Date().toISOString();
          matched = true;
        }
        return r;
      });
      if (matched) saveRequests(allReqs);

      var m = document.getElementById('quickLogOverlay'); if (m) m.remove();
      showToast('Review logged on ' + platform + '! 🎉');
      render();
    }

    if (action === 'close-quicklog') {
      var m = document.getElementById('quickLogOverlay'); if (m) m.remove();
    }
  });

  // Link saving on blur
  document.addEventListener('change', function (e) {
    if (e.target.getAttribute('data-action') === 'save-link') {
      var src = e.target.getAttribute('data-source');
      var links = getMyLinks();
      links[src] = e.target.value.trim();
      saveMyLinks(links);
      showToast(src + ' link saved');
    }
    if (e.target.getAttribute('data-action') === 'save-default-platform') {
      var links = getMyLinks();
      links._default = e.target.value;
      saveMyLinks(links);
      showToast('Default platform saved');
    }
  });

  render();
})();
