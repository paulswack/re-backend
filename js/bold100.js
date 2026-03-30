/* ============================================================
   RE Back Office — Bold 100 Contact Sprint
   Gamified daily challenge: 100 contacts in one day
   ============================================================ */

(function () {
  'use strict';

  Auth.requireAuth();
  populateSidebarUser();
  setActiveNav();
  initSidebarToggle();
  applyPageColor('bold100');

  document.getElementById('logoutBtn').addEventListener('click', function () { Auth.logout(); });

  var BOLD_KEY = 'reb_bold100';
  var USERS_KEY = 'reb_users';
  var pageBody = document.getElementById('pageBody');
  var session = Auth.getSession();
  var privileged = Auth.isPrivileged();
  var selectedDate = getTodayKey();
  var showAddForm = false;
  var selectedType = 'call';

  // ---- Helpers ----
  function generateId() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function getTodayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function pad(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  function formatTime(ts) {
    var d = new Date(ts);
    var h = d.getHours();
    var m = d.getMinutes();
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + pad(m) + ' ' + ampm;
  }

  function formatDateLabel(dateKey) {
    var parts = dateKey.split('-');
    var d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    return days[d.getDay()] + ', ' + months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  // ---- Data Access ----
  function getAllData() {
    try { return JSON.parse(localStorage.getItem(BOLD_KEY) || '{}'); } catch (e) { return {}; }
  }

  function saveAllData(data) {
    localStorage.setItem(BOLD_KEY, JSON.stringify(data));
  }

  function getDayData(dateKey) {
    var all = getAllData();
    return all[dateKey] || {};
  }

  function getUserDayData(dateKey, username) {
    var day = getDayData(dateKey);
    return day[username] || { contacts: [], goal: 100 };
  }

  function saveContact(dateKey, username, contact) {
    var all = getAllData();
    if (!all[dateKey]) all[dateKey] = {};
    if (!all[dateKey][username]) all[dateKey][username] = { contacts: [], goal: 100 };
    contact.id = generateId();
    contact.timestamp = new Date().toISOString();
    all[dateKey][username].contacts.unshift(contact);
    saveAllData(all);
    return contact;
  }

  function toggleAppointment(dateKey, username, contactId) {
    var all = getAllData();
    if (!all[dateKey] || !all[dateKey][username]) return;
    var contacts = all[dateKey][username].contacts;
    for (var i = 0; i < contacts.length; i++) {
      if (contacts[i].id === contactId) {
        contacts[i].madeAppointment = !contacts[i].madeAppointment;
        break;
      }
    }
    saveAllData(all);
  }

  function deleteContact(dateKey, username, contactId) {
    var all = getAllData();
    if (!all[dateKey] || !all[dateKey][username]) return;
    all[dateKey][username].contacts = all[dateKey][username].contacts.filter(function (c) {
      return c.id !== contactId;
    });
    saveAllData(all);
  }

  function getUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); } catch (e) { return []; }
  }

  // ---- Contact Type Definitions ----
  var CONTACT_TYPES = {
    call:  { label: 'Phone Call',     icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>', color: '#3B82F6' },
    text:  { label: 'Text Message',   icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>', color: '#10B981' },
    email: { label: 'Email Response',  icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>', color: '#F59E0B' }
  };

  // ---- Inject Styles ----
  var css = document.createElement('style');
  css.textContent = [
    /* Team Scoreboard */
    '.b100-scoreboard { background:linear-gradient(135deg,#002242 0%,#003366 50%,#00284d 100%); border-radius:var(--radius-lg); padding:32px 28px 24px; margin-bottom:24px; color:#fff; position:relative; overflow:hidden; }',
    '.b100-scoreboard::before { content:""; position:absolute; top:-40px; right:-40px; width:200px; height:200px; background:rgba(255,255,255,.04); border-radius:50%; }',
    '.b100-scoreboard::after { content:"100"; position:absolute; top:10px; right:20px; font-size:120px; font-weight:900; color:rgba(255,255,255,.04); line-height:1; pointer-events:none; }',
    '.b100-team-total { text-align:center; margin-bottom:20px; }',
    '.b100-team-number { font-size:4.5rem; font-weight:900; line-height:1; letter-spacing:-2px; background:linear-gradient(135deg,#35BA9C,#3484D0); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }',
    '.b100-team-label { font-size:.75rem; font-weight:700; text-transform:uppercase; letter-spacing:.15em; color:rgba(255,255,255,.5); margin-top:4px; }',
    '.b100-agents-row { display:flex; gap:12px; overflow-x:auto; padding:4px 0; }',
    '.b100-agent-card { background:rgba(255,255,255,.08); border-radius:12px; padding:14px 16px; min-width:140px; flex-shrink:0; text-align:center; border:1px solid rgba(255,255,255,.1); transition:background .15s; }',
    '.b100-agent-card:hover { background:rgba(255,255,255,.12); }',
    '.b100-agent-name { font-size:.78rem; font-weight:600; color:rgba(255,255,255,.85); margin-bottom:6px; white-space:nowrap; }',
    '.b100-agent-count { font-size:1.8rem; font-weight:800; color:#fff; line-height:1; }',
    '.b100-agent-bar { width:100%; height:6px; background:rgba(255,255,255,.15); border-radius:99px; margin-top:8px; overflow:hidden; }',
    '.b100-agent-bar-fill { height:100%; border-radius:99px; transition:width .6s ease; }',

    /* Date Picker Row */
    '.b100-date-row { display:flex; align-items:center; gap:12px; margin-bottom:20px; flex-wrap:wrap; }',
    '.b100-date-input { padding:8px 14px; border:1.5px solid var(--gray-200); border-radius:var(--radius-md); font-size:.88rem; font-family:inherit; background:var(--white); color:var(--gray-800); }',
    '.b100-date-label { font-size:.82rem; color:var(--gray-500); font-weight:600; }',
    '.b100-today-btn { font-size:.75rem; font-weight:700; padding:6px 14px; border-radius:var(--radius-md); border:1.5px solid var(--indigo); color:var(--indigo); background:transparent; cursor:pointer; transition:all .15s; }',
    '.b100-today-btn:hover { background:var(--indigo); color:#fff; }',

    /* My Progress Section */
    '.b100-progress-grid { display:grid; grid-template-columns:auto 1fr; gap:24px; align-items:start; margin-bottom:28px; }',
    '@media(max-width:700px){ .b100-progress-grid { grid-template-columns:1fr; justify-items:center; } }',
    '.b100-ring-wrap { position:relative; width:180px; height:180px; }',
    '.b100-ring-svg { width:180px; height:180px; transform:rotate(-90deg); }',
    '.b100-ring-track { fill:none; stroke:var(--gray-100); stroke-width:12; }',
    '.b100-ring-fill { fill:none; stroke-width:12; stroke-linecap:round; transition:stroke-dashoffset .8s ease; }',
    '.b100-ring-center { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center; }',
    '.b100-ring-count { font-size:2.8rem; font-weight:900; color:var(--gray-900); line-height:1; }',
    '.b100-ring-of { font-size:.75rem; font-weight:600; color:var(--gray-400); margin-top:2px; }',
    '.b100-stats-col { display:flex; flex-direction:column; gap:10px; padding-top:10px; }',
    '.b100-stat-row { display:flex; align-items:center; gap:10px; padding:10px 16px; background:var(--white); border-radius:var(--radius-md); border:1px solid var(--gray-200); box-shadow:var(--shadow-sm); }',
    '.b100-stat-icon { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }',
    '.b100-stat-icon svg { width:18px; height:18px; }',
    '.b100-stat-info { flex:1; }',
    '.b100-stat-num { font-size:1.3rem; font-weight:800; color:var(--gray-900); line-height:1; }',
    '.b100-stat-label { font-size:.7rem; font-weight:600; color:var(--gray-400); text-transform:uppercase; letter-spacing:.06em; margin-top:2px; }',
    '.b100-stat-appt .b100-stat-icon { background:linear-gradient(135deg,#F59E0B,#F97316); color:#fff; }',
    '.b100-stat-appt .b100-stat-num { color:#F97316; }',

    /* Celebration */
    '.b100-celebration { background:linear-gradient(135deg,#35BA9C,#10B981); border-radius:var(--radius-lg); padding:20px 24px; text-align:center; color:#fff; margin-bottom:20px; animation:b100pop .5s ease; }',
    '.b100-celebration-title { font-size:1.5rem; font-weight:900; margin-bottom:4px; }',
    '.b100-celebration-sub { font-size:.88rem; opacity:.85; }',
    '@keyframes b100pop { 0%{transform:scale(.9);opacity:0} 50%{transform:scale(1.03)} 100%{transform:scale(1);opacity:1} }',

    /* Add Contact Form */
    '.b100-add-btn { display:inline-flex; align-items:center; gap:8px; padding:12px 28px; background:linear-gradient(135deg,#F97316,#F59E0B); color:#fff; border:none; border-radius:var(--radius-md); font-size:.95rem; font-weight:700; cursor:pointer; transition:all .2s; box-shadow:0 4px 14px rgba(249,115,22,.3); }',
    '.b100-add-btn:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(249,115,22,.4); }',
    '.b100-add-btn svg { width:20px; height:20px; fill:currentColor; }',
    '.b100-form-card { background:var(--white); border-radius:var(--radius-lg); padding:24px; border:2px solid var(--gray-200); margin-bottom:24px; box-shadow:var(--shadow-sm); }',
    '.b100-form-title { font-size:1rem; font-weight:700; color:var(--gray-800); margin-bottom:16px; }',
    '.b100-type-btns { display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap; }',
    '.b100-type-btn { flex:1; min-width:100px; padding:14px 12px; border:2px solid var(--gray-200); border-radius:var(--radius-md); background:var(--white); cursor:pointer; text-align:center; transition:all .15s; display:flex; flex-direction:column; align-items:center; gap:6px; }',
    '.b100-type-btn:hover { border-color:var(--gray-300); background:var(--gray-50); }',
    '.b100-type-btn.active { border-color:var(--indigo); background:var(--indigo-light); }',
    '.b100-type-btn svg { width:28px; height:28px; }',
    '.b100-type-btn-label { font-size:.78rem; font-weight:700; color:var(--gray-700); }',
    '.b100-form-row { margin-bottom:12px; }',
    '.b100-form-row label { display:block; font-size:.75rem; font-weight:700; color:var(--gray-500); text-transform:uppercase; letter-spacing:.06em; margin-bottom:4px; }',
    '.b100-form-row input, .b100-form-row textarea { width:100%; padding:10px 14px; border:1.5px solid var(--gray-200); border-radius:var(--radius-md); font-size:.88rem; font-family:inherit; background:var(--white); color:var(--gray-800); box-sizing:border-box; }',
    '.b100-form-row textarea { resize:vertical; min-height:60px; }',
    '.b100-form-row input:focus, .b100-form-row textarea:focus { outline:none; border-color:var(--indigo); box-shadow:0 0 0 3px rgba(99,102,241,.1); }',
    '.b100-checkbox-row { display:flex; align-items:center; gap:8px; margin-bottom:16px; cursor:pointer; }',
    '.b100-checkbox-row input { width:18px; height:18px; accent-color:#F97316; }',
    '.b100-checkbox-row span { font-size:.88rem; font-weight:600; color:var(--gray-700); }',
    '.b100-form-actions { display:flex; gap:10px; }',
    '.b100-log-btn { padding:10px 24px; background:var(--indigo); color:#fff; border:none; border-radius:var(--radius-md); font-size:.88rem; font-weight:700; cursor:pointer; transition:all .15s; }',
    '.b100-log-btn:hover { background:var(--indigo-dark,#4338CA); }',
    '.b100-cancel-btn { padding:10px 18px; background:var(--gray-100); color:var(--gray-600); border:none; border-radius:var(--radius-md); font-size:.88rem; font-weight:600; cursor:pointer; transition:all .15s; }',
    '.b100-cancel-btn:hover { background:var(--gray-200); }',

    /* Contact Log */
    '.b100-log-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }',
    '.b100-log-title { font-size:1rem; font-weight:700; color:var(--gray-800); }',
    '.b100-log-count { font-size:.78rem; font-weight:600; color:var(--gray-400); }',
    '.b100-log-list { background:var(--white); border-radius:var(--radius-lg); border:1px solid var(--gray-200); box-shadow:var(--shadow-sm); overflow:hidden; max-height:500px; overflow-y:auto; }',
    '.b100-log-item { display:flex; align-items:center; gap:12px; padding:12px 16px; border-bottom:1px solid var(--gray-50); transition:background .1s; }',
    '.b100-log-item:last-child { border-bottom:none; }',
    '.b100-log-item:hover { background:var(--gray-50); }',
    '.b100-log-icon { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; color:#fff; }',
    '.b100-log-body { flex:1; min-width:0; }',
    '.b100-log-name { font-size:.88rem; font-weight:600; color:var(--gray-800); display:flex; align-items:center; gap:6px; }',
    '.b100-log-notes { font-size:.75rem; color:var(--gray-400); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:1px; }',
    '.b100-log-time { font-size:.7rem; color:var(--gray-300); flex-shrink:0; text-align:right; }',
    '.b100-log-appt-badge { display:inline-flex; align-items:center; gap:3px; font-size:.65rem; font-weight:700; color:#F97316; background:#FFF7ED; padding:2px 7px; border-radius:99px; }',
    '.b100-log-actions { display:flex; gap:4px; flex-shrink:0; }',
    '.b100-log-action-btn { width:28px; height:28px; border:none; border-radius:6px; background:transparent; cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--gray-400); transition:all .15s; }',
    '.b100-log-action-btn:hover { background:var(--gray-100); color:var(--gray-700); }',
    '.b100-log-action-btn.appt-on { color:#F97316; }',
    '.b100-log-empty { padding:40px 20px; text-align:center; color:var(--gray-400); font-size:.88rem; }',
    '.b100-log-empty-icon { font-size:2.5rem; margin-bottom:8px; opacity:.5; }',

    /* Responsive */
    '@media(max-width:500px) { .b100-type-btns { flex-direction:column; } .b100-scoreboard { padding:20px 16px; } .b100-team-number { font-size:3rem; } }'
  ].join('\n');
  document.head.appendChild(css);

  // ---- Seed Data ----
  function seedData() {
    var all = getAllData();
    var today = getTodayKey();
    if (all[today] && all[today]['agent1'] && all[today]['agent1'].contacts.length > 0) return;

    var names = [
      'John Martinez', 'Lisa Thompson', 'David Park', 'Michelle Wong',
      'Carlos Gutierrez', 'Karen O\'Brien', 'James Wilson', 'Amanda Foster',
      'Robert Kim', 'Stephanie Davis', 'Brian Nguyen', 'Jennifer Lopez',
      'Tyler Henderson', 'Rachel Green', 'Mark Sullivan'
    ];

    var callNotes = [
      'Discussed listing on Elm Street, interested in touring this weekend',
      'Follow-up from open house last Sunday, wants to schedule a showing',
      'Checking in on home search, updated price range to 450K',
      'Left voicemail about new listing in their target area',
      'Great conversation, they know someone looking to sell',
      'Talked about market conditions, sending CMA tonight',
      'Sphere call — just catching up, mentioned referral opportunity',
      'Called about price reduction on Maple Ave listing'
    ];

    var textNotes = [
      'Sent listing alert, they replied interested',
      'Quick check-in, they said still looking',
      'Responded to their Zillow inquiry',
      'Texted open house invite for Saturday'
    ];

    var emailNotes = [
      'Sent market report, they had questions about inventory',
      'Replied to buyer inquiry from website',
      'Follow-up email with comparable sales data'
    ];

    var contacts = [];
    var baseTime = new Date(today + 'T08:30:00');

    // 9 calls
    for (var i = 0; i < 9; i++) {
      var t = new Date(baseTime.getTime() + i * 12 * 60000);
      contacts.push({
        id: generateId(),
        type: 'call',
        name: names[i],
        notes: callNotes[i % callNotes.length],
        madeAppointment: i === 1 || i === 6,
        timestamp: t.toISOString()
      });
    }
    // 4 texts
    for (var j = 0; j < 4; j++) {
      var t2 = new Date(baseTime.getTime() + (9 + j) * 10 * 60000);
      contacts.push({
        id: generateId(),
        type: 'text',
        name: names[9 + j],
        notes: textNotes[j],
        madeAppointment: false,
        timestamp: t2.toISOString()
      });
    }
    // 2 emails
    for (var k = 0; k < 2; k++) {
      var t3 = new Date(baseTime.getTime() + (13 + k) * 8 * 60000);
      contacts.push({
        id: generateId(),
        type: 'email',
        name: names[13 + k],
        notes: emailNotes[k],
        madeAppointment: false,
        timestamp: t3.toISOString()
      });
    }

    contacts.reverse(); // newest first

    if (!all[today]) all[today] = {};
    all[today]['agent1'] = { contacts: contacts, goal: 100 };

    // Add some data for agent2 as well for team scoreboard
    all[today]['agent2'] = {
      contacts: [
        { id: generateId(), type: 'call', name: 'Tom Bradley', notes: 'Prospecting call', madeAppointment: false, timestamp: new Date(today + 'T09:00:00').toISOString() },
        { id: generateId(), type: 'call', name: 'Nina Patel', notes: 'Follow up from website lead', madeAppointment: true, timestamp: new Date(today + 'T09:15:00').toISOString() },
        { id: generateId(), type: 'text', name: 'Sam Richards', notes: 'Sent listing info', madeAppointment: false, timestamp: new Date(today + 'T09:30:00').toISOString() },
        { id: generateId(), type: 'email', name: 'Diane Foster', notes: 'CMA follow up', madeAppointment: false, timestamp: new Date(today + 'T09:45:00').toISOString() },
        { id: generateId(), type: 'call', name: 'Greg Liu', notes: 'Sphere check-in', madeAppointment: false, timestamp: new Date(today + 'T10:00:00').toISOString() },
        { id: generateId(), type: 'call', name: 'Megan Torres', notes: 'Discussed pre-approval', madeAppointment: false, timestamp: new Date(today + 'T10:15:00').toISOString() },
        { id: generateId(), type: 'text', name: 'Andy Campbell', notes: 'Open house reminder', madeAppointment: false, timestamp: new Date(today + 'T10:30:00').toISOString() },
        { id: generateId(), type: 'call', name: 'Laura Bennett', notes: 'Past client check-in', madeAppointment: false, timestamp: new Date(today + 'T10:45:00').toISOString() }
      ],
      goal: 100
    };

    saveAllData(all);
  }

  seedData();

  // ---- Render ----
  function render() {
    var dayData = getDayData(selectedDate);
    var myData = getUserDayData(selectedDate, session.username);
    var users = getUsers();
    var isToday = selectedDate === getTodayKey();

    // Calculate team totals
    var teamTotal = 0;
    var agentStats = [];
    var agentUsernames = Object.keys(dayData);

    // Include all known users even if they have no data
    var allUsernames = {};
    for (var u = 0; u < users.length; u++) {
      if (users[u].role !== 'Team Lead') {
        allUsernames[users[u].username] = users[u].displayName;
      }
    }
    for (var dk in dayData) {
      if (dayData.hasOwnProperty(dk)) {
        allUsernames[dk] = null; // will resolve display name
      }
    }

    for (var uname in allUsernames) {
      if (!allUsernames.hasOwnProperty(uname)) continue;
      var ud = dayData[uname] || { contacts: [], goal: 100 };
      var count = ud.contacts.length;
      teamTotal += count;
      var dname = allUsernames[uname];
      if (!dname) {
        var found = users.find(function (x) { return x.username === uname; });
        dname = found ? found.displayName : uname;
      }
      var aCalls = 0, aTexts = 0, aEmails = 0, aAppts = 0;
      ud.contacts.forEach(function (c) {
        if (c.type === 'call') aCalls++;
        else if (c.type === 'text') aTexts++;
        else if (c.type === 'email') aEmails++;
        if (c.madeAppointment) aAppts++;
      });
      agentStats.push({ username: uname, displayName: dname, count: count, calls: aCalls, texts: aTexts, emails: aEmails, appts: aAppts, goal: ud.goal || 100 });
    }

    // Sort agents by count descending (ranking)
    agentStats.sort(function (a, b) { return b.count - a.count; });

    // My stats
    var myCount = myData.contacts.length;
    var myCalls = 0, myTexts = 0, myEmails = 0, myAppts = 0;
    for (var c = 0; c < myData.contacts.length; c++) {
      var ct = myData.contacts[c];
      if (ct.type === 'call') myCalls++;
      else if (ct.type === 'text') myTexts++;
      else if (ct.type === 'email') myEmails++;
      if (ct.madeAppointment) myAppts++;
    }

    var html = '';

    // ---- Date Picker ----
    html += '<div class="b100-date-row">';
    html += '<label class="b100-date-label">Sprint Date:</label>';
    html += '<input type="date" class="b100-date-input" id="b100DatePicker" value="' + selectedDate + '" data-action="change-date">';
    if (!isToday) {
      html += '<button class="b100-today-btn" data-action="go-today">Go to Today</button>';
    }
    html += '<span class="b100-date-label" style="margin-left:auto;">' + formatDateLabel(selectedDate) + '</span>';
    html += '</div>';

    // ---- Team Scoreboard ----
    html += '<div class="b100-scoreboard" style="padding:16px 24px 14px">';
    html += '<div style="display:flex;align-items:center;gap:16px;margin-bottom:12px">';
    html += '<div style="flex-shrink:0"><div class="b100-team-number" style="font-size:2.2rem">' + teamTotal + '</div><div class="b100-team-label" style="font-size:.65rem">TEAM TOTAL</div></div>';
    html += '<div style="flex:1;height:3px;background:rgba(255,255,255,.1);border-radius:3px"><div style="height:100%;width:' + Math.min(teamTotal / (agentStats.length * 100) * 100, 100) + '%;background:rgba(255,255,255,.4);border-radius:3px"></div></div>';
    html += '</div>';

    if (agentStats.length > 0) {
      var cols = 3;
      html += '<div style="display:grid;grid-template-columns:repeat(' + cols + ',1fr);gap:12px">';
      for (var a = 0; a < agentStats.length; a++) {
        var ag = agentStats[a];
        var rank = a + 1;
        var pct = Math.min(ag.count / ag.goal * 100, 100);
        var barColor = pct >= 100 ? '#10B981' : pct >= 50 ? '#3484D0' : '#F59E0B';
        html += '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(255,255,255,.04);border-radius:8px">';
        // Rank
        html += '<div style="width:22px;height:22px;border-radius:50%;background:' + (rank === 1 ? 'rgba(255,215,0,.3)' : 'rgba(255,255,255,.1)') + ';display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:800;color:' + (rank === 1 ? '#FFD700' : 'rgba(255,255,255,.5)') + ';flex-shrink:0">' + rank + '</div>';
        // Name + count
        html += '<div style="flex:1;min-width:0">';
        html += '<div style="display:flex;align-items:center;justify-content:space-between">';
        html += '<span style="font-size:.85rem;font-weight:600;color:#fff">' + escapeHtml(ag.displayName) + '</span>';
        html += '<span style="font-size:1rem;font-weight:800;color:#fff">' + ag.count + '</span>';
        html += '</div>';
        // Type breakdown
        html += '<div style="display:flex;gap:10px;margin-top:3px">';
        html += '<span style="font-size:.68rem;color:rgba(255,255,255,.5)">📞 ' + ag.calls + '</span>';
        html += '<span style="font-size:.68rem;color:rgba(255,255,255,.5)">💬 ' + ag.texts + '</span>';
        html += '<span style="font-size:.68rem;color:rgba(255,255,255,.5)">📧 ' + ag.emails + '</span>';
        if (ag.appts > 0) html += '<span style="font-size:.68rem;color:#E97B2A;font-weight:600">⭐ ' + ag.appts + ' appt' + (ag.appts !== 1 ? 's' : '') + '</span>';
        html += '</div>';
        // Progress bar
        html += '<div style="height:3px;background:rgba(255,255,255,.1);border-radius:3px;margin-top:4px"><div style="height:100%;width:' + pct + '%;background:' + barColor + ';border-radius:3px;transition:width .3s"></div></div>';
        html += '</div>';
        html += '</div>';
      }
      html += '</div>'; // grid
    }
    html += '</div>';

    // ---- Celebration ----
    if (myCount >= 100) {
      html += '<div class="b100-celebration">';
      html += '<div class="b100-celebration-title">YOU DID IT! 100 CONTACTS!</div>';
      html += '<div class="b100-celebration-sub">Incredible work today. Keep the momentum going!</div>';
      html += '</div>';
    }

    // ---- Count + Type Summary Row ----
    html += '<div class="lb-card" style="margin-bottom:20px">';
    html += '<div style="padding:16px 24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">';
    html += '<div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap">';
    html += '<div style="font-size:1.5rem;font-weight:800;color:var(--gray-900)">' + myCount + '<span style="font-size:.85rem;font-weight:600;color:var(--gray-400)"> / 100</span></div>';
    html += '<div style="display:flex;gap:14px">';
    html += '<span style="font-size:.82rem;color:#3B82F6;font-weight:600">📞 ' + myCalls + '</span>';
    html += '<span style="font-size:.82rem;color:#10B981;font-weight:600">💬 ' + myTexts + '</span>';
    html += '<span style="font-size:.82rem;color:#F59E0B;font-weight:600">📧 ' + myEmails + '</span>';
    html += '<span style="font-size:.82rem;color:#E97B2A;font-weight:600">⭐ ' + myAppts + ' appts</span>';
    html += '</div></div>';
    if (isToday) {
      html += '<button class="btn btn-primary btn-sm" data-action="show-form" style="white-space:nowrap"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="margin-right:4px"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>Add Contact</button>';
    }
    html += '</div></div>';

    // ---- Add Contact Form (above checkboxes) ----
    if (showAddForm && isToday) {
      html += '<div class="b100-form-card">';
      html += '<div class="b100-form-title">Log a Contact</div>';
      html += '<div class="b100-type-btns">';
      var types = ['call', 'text', 'email'];
      for (var ti = 0; ti < types.length; ti++) {
        var tp = types[ti];
        var info = CONTACT_TYPES[tp];
        html += '<button class="b100-type-btn' + (selectedType === tp ? ' active' : '') + '" data-action="select-type" data-type="' + tp + '">';
        html += '<span style="color:' + info.color + ';">' + info.icon.replace('width="20" height="20"', 'width="28" height="28"') + '</span>';
        html += '<span class="b100-type-btn-label">' + escapeHtml(info.label) + '</span>';
        html += '</button>';
      }
      html += '</div>';
      html += '<div class="b100-form-row"><label>Contact Name</label><input type="text" id="b100Name" placeholder="Who did you contact?"></div>';
      html += '<label class="b100-checkbox-row"><input type="checkbox" id="b100Appt"><span>Made an appointment</span></label>';
      html += '<div class="b100-form-actions">';
      html += '<button class="b100-log-btn" data-action="log-contact">Log Contact</button>';
      html += '<button class="b100-cancel-btn" data-action="hide-form">Cancel</button>';
      html += '</div>';
      html += '</div>';
    }

    // ---- 100 Checkbox Grid ----
    html += '<div class="lb-card" style="margin-bottom:20px;padding:16px 20px">';
    html += '<div style="display:grid;grid-template-columns:repeat(15,1fr);gap:5px">';

    var sortedContacts = myData.contacts.slice().sort(function (a, b) { return (a.timestamp || '').localeCompare(b.timestamp || ''); });

    for (var box = 0; box < 100; box++) {
      var contact = sortedContacts[box] || null;
      if (contact) {
        var typeColors = { call: '#3B82F6', text: '#10B981', email: '#F59E0B' };
        var typeIcons = { call: '📞', text: '💬', email: '📧' };
        var bgColor = typeColors[contact.type] || '#3B82F6';
        var tooltipText = escapeHtml((contact.name || 'Contact') + ' (' + (contact.type || '') + ')');
        if (contact.madeAppointment) {
          html += '<div style="width:100%;aspect-ratio:1;border-radius:4px;background:#E97B2A;display:flex;align-items:center;justify-content:center;cursor:default" title="' + tooltipText + ' ⭐ APPOINTMENT">';
          html += '<span style="font-size:1rem">⭐</span>';
          html += '</div>';
        } else {
          html += '<div style="width:100%;aspect-ratio:1;border-radius:4px;background:' + bgColor + ';display:flex;align-items:center;justify-content:center;cursor:default" title="' + tooltipText + '">';
          html += '<span style="font-size:.75rem">' + typeIcons[contact.type] + '</span>';
          html += '</div>';
        }
      } else {
        html += '<div style="width:100%;aspect-ratio:1;border-radius:4px;background:var(--gray-100);border:1px dashed var(--gray-200);display:flex;align-items:center;justify-content:center">';
        html += '<span style="font-size:.55rem;color:var(--gray-300)">' + (box + 1) + '</span>';
        html += '</div>';
      }
    }

    html += '</div>';
    html += '<div style="display:flex;gap:14px;margin-top:10px;justify-content:center;font-size:.68rem;color:var(--gray-400)">';
    html += '<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#3B82F6;vertical-align:middle;margin-right:3px"></span>Call</span>';
    html += '<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#10B981;vertical-align:middle;margin-right:3px"></span>Text</span>';
    html += '<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#F59E0B;vertical-align:middle;margin-right:3px"></span>Email</span>';
    html += '<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#E97B2A;vertical-align:middle;margin-right:3px"></span>⭐ Appointment</span>';
    html += '</div>';
    html += '</div>';

    // ---- Contact Log ----
    var logContacts = myData.contacts.slice();
    // Sort newest first by timestamp
    logContacts.sort(function (a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    html += '<div class="b100-log-header">';
    html += '<div class="b100-log-title">Contact Log</div>';
    html += '<div class="b100-log-count">' + logContacts.length + ' contact' + (logContacts.length !== 1 ? 's' : '') + ' logged</div>';
    html += '</div>';

    html += '<div style="padding:0 20px 12px"><input type="text" id="b100Search" placeholder="Search contacts..." style="width:100%;padding:9px 14px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:.85rem;color:var(--gray-700)"></div>';

    html += '<div class="b100-log-list" id="b100LogList">';
    if (logContacts.length === 0) {
      html += '<div class="b100-log-empty">';
      html += '<div class="b100-log-empty-icon"><svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor" style="opacity:.3;"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg></div>';
      html += '<div>No contacts logged yet' + (isToday ? ' — start your sprint!' : '') + '</div>';
      html += '</div>';
    } else {
      for (var li = 0; li < logContacts.length; li++) {
        var lc = logContacts[li];
        var typeInfo = CONTACT_TYPES[lc.type] || CONTACT_TYPES.call;

        html += '<div class="b100-log-item">';
        html += '<div class="b100-log-icon" style="background:' + typeInfo.color + ';">' + typeInfo.icon.replace('width="20" height="20"', 'width="18" height="18"').replace('fill="currentColor"', 'fill="#fff"') + '</div>';

        html += '<div class="b100-log-body">';
        html += '<div class="b100-log-name">' + escapeHtml(lc.name || 'Unknown');
        if (lc.madeAppointment) {
          html += ' <span class="b100-log-appt-badge"><svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg> Appt</span>';
        }
        html += '</div>';
        if (lc.notes) {
          html += '<div class="b100-log-notes">' + escapeHtml(lc.notes) + '</div>';
        }
        html += '</div>';

        html += '<div class="b100-log-time">' + formatTime(lc.timestamp) + '</div>';

        if (isToday && lc.id) {
          html += '<div class="b100-log-actions">';
          html += '<button class="b100-log-action-btn' + (lc.madeAppointment ? ' appt-on' : '') + '" data-action="toggle-appt" data-id="' + lc.id + '" title="Toggle appointment"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg></button>';
          html += '<button class="b100-log-action-btn" data-action="delete-contact" data-id="' + lc.id + '" title="Remove"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></button>';
          html += '</div>';
        }

        html += '</div>'; // log-item
      }
    }
    html += '</div>'; // log-list

    pageBody.innerHTML = html;

    // Wire up contact search
    var searchEl = document.getElementById('b100Search');
    if (searchEl) {
      searchEl.addEventListener('input', function () {
        var q = this.value.toLowerCase();
        var items = document.querySelectorAll('#b100LogList .b100-log-item');
        items.forEach(function (item) {
          item.style.display = item.textContent.toLowerCase().indexOf(q) > -1 ? '' : 'none';
        });
      });
    }
  }

  // ---- Event Delegation ----
  pageBody.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');

    if (action === 'show-form') {
      showAddForm = true;
      render();
      var nameInput = document.getElementById('b100Name');
      if (nameInput) nameInput.focus();
    }

    if (action === 'hide-form') {
      showAddForm = false;
      render();
    }

    if (action === 'select-type') {
      selectedType = btn.getAttribute('data-type');
      render();
      var nameInput2 = document.getElementById('b100Name');
      if (nameInput2) nameInput2.focus();
    }

    if (action === 'log-contact') {
      var nameEl = document.getElementById('b100Name');
      var notesEl = document.getElementById('b100Notes');
      var apptEl = document.getElementById('b100Appt');
      var name = nameEl ? nameEl.value.trim() : '';

      if (!name) {
        showToast('Please enter a contact name', 'error');
        if (nameEl) nameEl.focus();
        return;
      }

      var contact = {
        type: selectedType,
        name: name,
        notes: notesEl ? notesEl.value.trim() : '',
        madeAppointment: apptEl ? apptEl.checked : false
      };

      saveContact(selectedDate, session.username, contact);

      var newCount = getUserDayData(selectedDate, session.username).contacts.length;
      if (newCount === 100) {
        showToast('100 CONTACTS! You crushed it!', 'success');
      } else if (newCount === 50) {
        showToast('Halfway there! 50 contacts!', 'success');
      } else if (newCount === 75) {
        showToast('75 contacts! Almost there!', 'success');
      } else {
        showToast('Contact logged! (' + newCount + '/100)', 'success');
      }

      // Keep form open for rapid entry, just clear fields
      selectedType = 'call';
      render();
      showAddForm = true;
      render();
      var nameInput3 = document.getElementById('b100Name');
      if (nameInput3) nameInput3.focus();
    }

    if (action === 'toggle-appt') {
      var cId = btn.getAttribute('data-id');
      toggleAppointment(selectedDate, session.username, cId);
      render();
    }

    if (action === 'delete-contact') {
      var dId = btn.getAttribute('data-id');
      deleteContact(selectedDate, session.username, dId);
      showToast('Contact removed');
      render();
    }

    if (action === 'go-today') {
      selectedDate = getTodayKey();
      render();
    }
  });

  pageBody.addEventListener('change', function (e) {
    if (e.target.id === 'b100DatePicker') {
      selectedDate = e.target.value;
      showAddForm = false;
      render();
    }
  });

  // ---- Initial Render ----
  render();

})();
