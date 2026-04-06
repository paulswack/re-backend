/* ============================================================
   RE Back Office — Marketing Activity Tracker
   Donut rings, category groups, team cards, custom activities,
   notes, history, category breakdown
   ============================================================ */

(function () {
  'use strict';

  Auth.requireAuth();
  populateSidebarUser();
  setActiveNav();
  initSidebarToggle();
  applyPageColor('marketing');

  document.getElementById('logoutBtn').addEventListener('click', function () { Auth.logout(); });

  var MKT_KEY = 'reb_marketing';
  var MKT_NOTES_KEY = 'reb_marketing_notes';
  var MKT_CUSTOM_KEY = 'reb_marketing_custom';
  var MKT_GOALS_KEY = 'reb_marketing_goals';
  var USERS_KEY = 'reb_users';
  var pageBody = document.getElementById('pageBody');
  var session = Auth.getSession();
  var privileged = Auth.isPrivileged();
  var currentTab = 'weekly';
  var currentView = 'activities'; // activities | history | team
  var historyOffset = 0;

  // ---- Activity Definitions ----
  var WEEKLY = [
    { id: 'w_instagram',    label: 'Post on Instagram (Feed or Reel)',   detail: 'Listing photo, market tip, Reel, carousel, or personal brand content',  cat: 'Social Media',   color: '#E1306C' },
    { id: 'w_instastory',   label: 'Post Instagram Stories (3+)',        detail: 'Behind-the-scenes, polls, Q&A, or day-in-the-life stories',             cat: 'Social Media',   color: '#E1306C' },
    { id: 'w_facebook',     label: 'Post on Facebook',                   detail: 'Page post, story, live video, or share in a community group',           cat: 'Social Media',   color: '#1877F2' },
    { id: 'w_linkedin',     label: 'Post on LinkedIn',                   detail: 'Professional insight, deal close, market update, or article',           cat: 'Social Media',   color: '#0A66C2' },
    { id: 'w_tiktok',       label: 'Post a TikTok or YouTube Short',     detail: 'Quick tip, listing tour, market update, or trending audio content',     cat: 'Social Media',   color: '#010101' },
    { id: 'w_engage',       label: 'Engage sphere on social (20+ people)', detail: 'Like, comment, and DM at least 20 connections across platforms',      cat: 'Social Media',   color: '#3B82F6' },
    { id: 'w_calls',        label: 'Make 10+ prospecting calls',         detail: 'Call leads, past clients, FSBOs, expireds, or sphere of influence',     cat: 'Outreach',       color: '#10B981' },
    { id: 'w_followup',     label: 'Send 5+ follow-up texts or emails',  detail: 'Personalized outreach to active or warm leads',                        cat: 'Outreach',       color: '#10B981' },
    { id: 'w_handwritten',  label: 'Send handwritten notes or cards',    detail: 'Thank-you, congratulations, just-thinking-of-you, or pop-by notes',    cat: 'Outreach',       color: '#10B981' },
    { id: 'w_referral',     label: 'Ask for a referral',                 detail: 'Ask a past client, colleague, or vendor for a referral introduction',   cat: 'Outreach',       color: '#10B981' },
    { id: 'w_crm',          label: 'Update CRM with new contacts',       detail: 'Add new leads, update statuses, tag contacts, and set follow-ups',      cat: 'CRM & Database', color: '#6366F1' },
    { id: 'w_drip',         label: 'Review & update drip campaigns',     detail: 'Check automated emails/texts are running and performing',               cat: 'CRM & Database', color: '#6366F1' },
    { id: 'w_openhouse',    label: 'Host or attend an open house',       detail: 'Your listing or a colleague\'s open house — collect sign-ins',          cat: 'In-Person',      color: '#F59E0B' },
    { id: 'w_doorknock',    label: 'Door knock or geo-farm your area',   detail: 'At least one session in your target neighborhood',                      cat: 'In-Person',      color: '#F59E0B' },
    { id: 'w_coffee',       label: 'Coffee or lunch with a contact',     detail: 'Meet a referral partner, past client, or sphere contact face-to-face',  cat: 'In-Person',      color: '#F59E0B' },
    { id: 'w_marketupdate', label: 'Share a market update',              detail: 'Post, story, or email with local data or buying/selling advice',        cat: 'Content',        color: '#8B5CF6' },
    { id: 'w_blog',         label: 'Write or publish a blog post',       detail: 'Neighborhood guide, market analysis, buyer/seller tips',                cat: 'Content',        color: '#8B5CF6' },
    { id: 'w_video',        label: 'Record a video or go live',          detail: 'Listing walkthrough, market update, tips, or Q&A live stream',          cat: 'Content',        color: '#8B5CF6' }
  ];

  var MONTHLY = [
    { id: 'm_newsletter',   label: 'Send email newsletter',              detail: 'Monthly market update to your full database',                           cat: 'Digital',            color: '#3B82F6' },
    { id: 'm_postcards',    label: 'Mail postcards or flyers',           detail: 'Farm area direct mail campaign — just listed, just sold, or market stats', cat: 'Direct Mail',      color: '#F59E0B' },
    { id: 'm_magnet',       label: 'Drop off fridge magnets or swag',    detail: 'Branded calendars, magnets, pens, or notepads to sphere or farm',       cat: 'Direct Mail',        color: '#F59E0B' },
    { id: 'm_reviews',      label: 'Request reviews from past clients',  detail: 'Ask for Google, Zillow, or Realtor.com reviews — aim for 2+',          cat: 'Digital',            color: '#3B82F6' },
    { id: 'm_paidads',      label: 'Run a paid social media ad',         detail: 'Facebook, Instagram, Google, or YouTube Ads campaign',                  cat: 'Digital',            color: '#3B82F6' },
    { id: 'm_seo',          label: 'Update website or SEO content',      detail: 'Refresh listings, add blog posts, optimize local SEO keywords',        cat: 'Digital',            color: '#3B82F6' },
    { id: 'm_google',       label: 'Update Google Business Profile',     detail: 'Add photos, posts, respond to reviews, update hours',                  cat: 'Digital',            color: '#3B82F6' },
    { id: 'm_event',        label: 'Host or plan a client event',        detail: 'Pop-by, appreciation event, community cleanup, or holiday party',      cat: 'Events & Networking', color: '#EC4899' },
    { id: 'm_networking',   label: 'Attend a networking event',          detail: 'BNI, chamber of commerce, real estate meetup, or charity event',        cat: 'Events & Networking', color: '#EC4899' },
    { id: 'm_sponsor',      label: 'Sponsor or attend a community event', detail: 'Little league, school fundraiser, local 5K, or farmers market',       cat: 'Events & Networking', color: '#EC4899' },
    { id: 'm_video',        label: 'Publish a produced video',           detail: 'Market update, neighborhood spotlight, listing video, or testimonial',  cat: 'Content Creation',   color: '#8B5CF6' },
    { id: 'm_marketreport', label: 'Create and share a market report',   detail: 'Monthly stats for your farm area or niche with branded PDF',            cat: 'Content Creation',   color: '#8B5CF6' },
    { id: 'm_presentation', label: 'Refine listing or buyer presentation', detail: 'Update slides, stats, testimonials, and marketing plan',              cat: 'Content Creation',   color: '#8B5CF6' },
    { id: 'm_reconnect',    label: 'Reconnect with 10+ past clients',    detail: 'Personal call, text, or email just to check in — no selling',          cat: 'Relationship',       color: '#10B981' },
    { id: 'm_birthday',     label: 'Send birthday/anniversary messages', detail: 'Check CRM for milestones — send cards, texts, or small gifts',         cat: 'Relationship',       color: '#10B981' },
    { id: 'm_vendor',       label: 'Strengthen a vendor relationship',   detail: 'Lunch with lender, inspector, or title rep — build referral pipeline',  cat: 'Relationship',       color: '#10B981' }
  ];

  // ---- Inject Styles ----
  var mktCSS = document.createElement('style');
  mktCSS.textContent = [
    /* Banner */
    '.mkt-banner { background:linear-gradient(135deg, #1E3A5F 0%, #2563EB 50%, #7C3AED 100%); border-radius:var(--radius-lg); padding:32px 28px; margin-bottom:24px; color:#fff; position:relative; overflow:hidden; }',
    '.mkt-banner::after { content:""; position:absolute; top:-40%; right:-10%; width:300px; height:300px; border-radius:50%; background:rgba(255,255,255,.06); pointer-events:none; }',
    '.mkt-banner-title { font-size:1.5rem; font-weight:800; margin-bottom:4px; }',
    '.mkt-banner-sub { font-size:.9rem; opacity:.7; margin-bottom:20px; }',
    '.mkt-banner-stats { display:flex; gap:24px; flex-wrap:wrap; }',
    '.mkt-banner-stat { background:rgba(255,255,255,.12); border-radius:12px; padding:12px 20px; backdrop-filter:blur(8px); min-width:120px; }',
    '.mkt-banner-stat-val { font-size:1.4rem; font-weight:800; }',
    '.mkt-banner-stat-label { font-size:.72rem; opacity:.7; text-transform:uppercase; letter-spacing:.05em; font-weight:600; }',

    /* View tabs */
    '.mkt-view-tabs { display:flex; gap:6px; margin-bottom:24px; background:var(--gray-100); border-radius:10px; padding:4px; width:fit-content; }',
    '.mkt-view-tab { padding:8px 20px; border-radius:8px; font-size:.82rem; font-weight:600; color:var(--gray-500); cursor:pointer; border:none; background:none; transition:all .15s; }',
    '.mkt-view-tab.active { background:var(--white); color:var(--gray-900); box-shadow:0 1px 3px rgba(0,0,0,.1); }',
    '.mkt-view-tab:hover:not(.active) { color:var(--gray-700); }',

    /* Rings row */
    '.mkt-rings-row { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:24px; }',
    '@media(max-width:640px){ .mkt-rings-row{grid-template-columns:1fr;} }',
    '.mkt-ring-card { background:var(--white); border-radius:var(--radius-lg); padding:28px 24px; text-align:center; box-shadow:var(--shadow-sm); border:1px solid var(--gray-200); }',
    '.mkt-ring-wrap { position:relative; width:140px; height:140px; margin:0 auto 14px; }',
    '.mkt-ring-svg { width:140px; height:140px; transform:rotate(-90deg); }',
    '.mkt-ring-track { fill:none; stroke:var(--gray-100); stroke-width:10; }',
    '.mkt-ring-fill { fill:none; stroke-width:10; stroke-linecap:round; transition:stroke-dashoffset .8s ease; }',
    '.mkt-ring-pct { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-size:2rem; font-weight:800; color:var(--gray-900); line-height:1; }',
    '.mkt-ring-pct small { font-size:.8rem; font-weight:600; color:var(--gray-400); }',
    '.mkt-ring-title { font-size:1rem; font-weight:700; color:var(--gray-900); margin-bottom:2px; }',
    '.mkt-ring-sub { font-size:.8rem; color:var(--gray-400); }',

    /* Category progress */
    '.mkt-cat-progress { background:var(--white); border-radius:var(--radius-lg); padding:20px; border:1px solid var(--gray-200); box-shadow:var(--shadow-sm); margin-bottom:24px; }',
    '.mkt-cat-progress-title { font-size:.95rem; font-weight:700; color:var(--gray-900); margin-bottom:16px; }',
    '.mkt-cat-row { display:flex; align-items:center; gap:12px; margin-bottom:12px; }',
    '.mkt-cat-row:last-child { margin-bottom:0; }',
    '.mkt-cat-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }',
    '.mkt-cat-name { font-size:.82rem; font-weight:600; color:var(--gray-700); min-width:130px; }',
    '.mkt-cat-bar-wrap { flex:1; height:8px; background:var(--gray-100); border-radius:99px; overflow:hidden; }',
    '.mkt-cat-bar-fill { height:100%; border-radius:99px; transition:width .6s ease; }',
    '.mkt-cat-count { font-size:.75rem; font-weight:600; color:var(--gray-500); min-width:40px; text-align:right; }',

    /* Activity list */
    '.mkt-cat-heading { display:flex; align-items:center; gap:8px; padding:14px 20px 8px; font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:var(--gray-400); }',
    '.mkt-cat-heading::after { content:""; flex:1; height:1px; background:var(--gray-100); }',
    '.mkt-item { display:flex; align-items:flex-start; gap:14px; padding:14px 20px; border-bottom:1px solid var(--gray-50); transition:background .15s; cursor:pointer; }',
    '.mkt-item:hover { background:var(--gray-50); }',
    '.mkt-item:last-child { border-bottom:none; }',
    '.mkt-item-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; margin-top:5px; }',
    '.mkt-item-info { flex:1; min-width:0; }',
    '.mkt-item-label { font-size:.88rem; font-weight:600; color:var(--gray-800); }',
    '.mkt-item-detail { font-size:.75rem; color:var(--gray-400); margin-top:2px; line-height:1.4; }',
    '.mkt-item.checked .mkt-item-label { text-decoration:line-through; color:var(--gray-400); }',
    '.mkt-item.checked .mkt-item-detail { text-decoration:line-through; }',
    '.mkt-item-actions { display:flex; gap:6px; align-items:center; flex-shrink:0; margin-top:2px; }',
    '.mkt-note-btn { width:28px; height:28px; border-radius:6px; border:1px solid var(--gray-200); background:var(--white); cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--gray-400); transition:all .15s; }',
    '.mkt-note-btn:hover { border-color:var(--gray-300); color:var(--gray-600); background:var(--gray-50); }',
    '.mkt-note-btn.has-note { border-color:#3B82F6; color:#3B82F6; background:#EFF6FF; }',
    '.mkt-note-btn svg { width:14px; height:14px; fill:currentColor; }',
    '.mkt-note-text { font-size:.75rem; color:#3B82F6; margin-top:4px; font-style:italic; background:#EFF6FF; padding:4px 8px; border-radius:6px; }',

    /* Note modal */
    '.mkt-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.4); z-index:9999; display:flex; align-items:center; justify-content:center; }',
    '.mkt-modal { background:var(--white); border-radius:16px; padding:28px; width:90%; max-width:440px; box-shadow:0 20px 60px rgba(0,0,0,.2); }',
    '.mkt-modal h3 { font-size:1rem; font-weight:700; color:var(--gray-900); margin-bottom:4px; }',
    '.mkt-modal p { font-size:.82rem; color:var(--gray-400); margin-bottom:16px; }',
    '.mkt-modal textarea { width:100%; height:100px; border:1.5px solid var(--gray-200); border-radius:10px; padding:12px; font-size:.85rem; font-family:inherit; resize:vertical; outline:none; transition:border-color .15s; }',
    '.mkt-modal textarea:focus { border-color:#3B82F6; }',
    '.mkt-modal-btns { display:flex; gap:8px; justify-content:flex-end; margin-top:16px; }',
    '.mkt-modal-btns button { padding:8px 20px; border-radius:8px; font-size:.82rem; font-weight:600; cursor:pointer; border:none; transition:all .15s; }',
    '.mkt-modal-btns .mkt-btn-cancel { background:var(--gray-100); color:var(--gray-600); }',
    '.mkt-modal-btns .mkt-btn-cancel:hover { background:var(--gray-200); }',
    '.mkt-modal-btns .mkt-btn-save { background:#3B82F6; color:#fff; }',
    '.mkt-modal-btns .mkt-btn-save:hover { background:#2563EB; }',

    /* Custom activity form */
    '.mkt-add-form { display:flex; gap:8px; padding:12px 20px; align-items:center; border-top:1px solid var(--gray-100); }',
    '.mkt-add-form input { flex:1; border:1.5px solid var(--gray-200); border-radius:8px; padding:8px 12px; font-size:.85rem; outline:none; font-family:inherit; }',
    '.mkt-add-form input:focus { border-color:#3B82F6; }',
    '.mkt-add-form select { border:1.5px solid var(--gray-200); border-radius:8px; padding:8px 10px; font-size:.82rem; outline:none; font-family:inherit; background:var(--white); }',
    '.mkt-add-btn { padding:8px 16px; border-radius:8px; background:#3B82F6; color:#fff; font-size:.82rem; font-weight:600; border:none; cursor:pointer; white-space:nowrap; }',
    '.mkt-add-btn:hover { background:#2563EB; }',

    /* History */
    '.mkt-history-card { background:var(--white); border-radius:var(--radius-lg); border:1px solid var(--gray-200); box-shadow:var(--shadow-sm); margin-bottom:16px; overflow:hidden; }',
    '.mkt-history-header { padding:16px 20px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--gray-100); }',
    '.mkt-history-period { font-size:.9rem; font-weight:700; color:var(--gray-900); }',
    '.mkt-history-badge { font-size:.75rem; font-weight:700; padding:4px 12px; border-radius:99px; }',
    '.mkt-history-items { padding:8px 0; }',
    '.mkt-history-item { display:flex; align-items:center; gap:10px; padding:6px 20px; font-size:.82rem; }',
    '.mkt-history-item svg { width:16px; height:16px; flex-shrink:0; }',
    '.mkt-history-item.done { color:var(--gray-800); }',
    '.mkt-history-item.done svg { fill:#10B981; }',
    '.mkt-history-item.missed { color:var(--gray-400); text-decoration:line-through; }',
    '.mkt-history-item.missed svg { fill:var(--gray-300); }',
    '.mkt-history-nav { display:flex; gap:10px; align-items:center; margin-bottom:20px; }',
    '.mkt-history-nav button { padding:6px 14px; border-radius:8px; font-size:.82rem; font-weight:600; border:1.5px solid var(--gray-200); background:var(--white); cursor:pointer; color:var(--gray-600); transition:all .15s; }',
    '.mkt-history-nav button:hover { border-color:var(--gray-300); background:var(--gray-50); }',
    '.mkt-history-nav span { font-size:.85rem; font-weight:600; color:var(--gray-700); }',

    /* Team section */
    '.mkt-team-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:16px; margin-top:16px; }',
    '.mkt-agent-card { background:var(--white); border-radius:var(--radius-lg); padding:20px; border:1px solid var(--gray-200); box-shadow:var(--shadow-sm); transition:transform .15s, box-shadow .15s; }',
    '.mkt-agent-card:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,.08); }',
    '.mkt-mini-ring { position:relative; width:56px; height:56px; }',
    '.mkt-mini-ring svg { width:56px; height:56px; transform:rotate(-90deg); }',
    '.mkt-mini-ring .ring-track { fill:none; stroke:var(--gray-100); stroke-width:5; }',
    '.mkt-mini-ring .ring-fill { fill:none; stroke-width:5; stroke-linecap:round; }',
    '.mkt-mini-pct { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-size:.7rem; font-weight:700; color:var(--gray-900); }',
    '.mkt-status-tag { font-size:.68rem; font-weight:700; padding:3px 10px; border-radius:99px; text-transform:uppercase; letter-spacing:.04em; }',
    '.mkt-status-tag.on-fire { background:#ECFDF5; color:#065F46; }',
    '.mkt-status-tag.doing-well { background:#FEF3C7; color:#92400E; }',
    '.mkt-status-tag.needs-attn { background:#FEE2E2; color:#991B1B; }',
    '.mkt-agent-cats { display:flex; flex-wrap:wrap; gap:4px; margin-top:12px; }',
    '.mkt-agent-cat-badge { font-size:.65rem; font-weight:600; padding:2px 8px; border-radius:99px; }',

    /* Custom activity delete */
    '.mkt-del-btn { width:24px; height:24px; border-radius:6px; border:none; background:none; cursor:pointer; color:var(--gray-300); display:flex; align-items:center; justify-content:center; transition:all .15s; }',
    '.mkt-del-btn:hover { color:#EF4444; background:#FEE2E2; }',
    '.mkt-del-btn svg { width:14px; height:14px; fill:currentColor; }',

    /* Responsive */
    '@media(max-width:768px) { .mkt-banner-stats { gap:12px; } .mkt-banner-stat { min-width:auto; flex:1; } .mkt-add-form { flex-wrap:wrap; } .mkt-add-form input { min-width:100%; } }'
  ].join('\n');
  document.head.appendChild(mktCSS);

  // ---- Helpers ----
  function getWeekKey(offset) {
    var d = new Date();
    if (offset) d.setDate(d.getDate() - offset * 7);
    d.setHours(0, 0, 0, 0);
    var jan1 = new Date(d.getFullYear(), 0, 1);
    var days = Math.floor((d - jan1) / 86400000);
    var week = Math.ceil((days + jan1.getDay() + 1) / 7);
    return d.getFullYear() + '-W' + (week < 10 ? '0' : '') + week;
  }

  function getMonthKey(offset) {
    var d = new Date();
    if (offset) d.setMonth(d.getMonth() - offset);
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
  }

  function formatWeekKey(key) {
    var parts = key.split('-W');
    return 'Week ' + parseInt(parts[1]) + ', ' + parts[0];
  }

  function formatMonthKey(key) {
    var parts = key.split('-');
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[parseInt(parts[1]) - 1] + ' ' + parts[0];
  }

  function allData() {
    try { return JSON.parse(localStorage.getItem(MKT_KEY) || '{}'); } catch (e) { return {}; }
  }

  function userData(username) {
    return allData()[username] || { weekly: {}, monthly: {} };
  }

  function saveUser(username, data) {
    var all = allData();
    all[username] = data;
    localStorage.setItem(MKT_KEY, JSON.stringify(all));
  }

  function getChecked(username, type, key) {
    return userData(username)[type][key] || {};
  }

  function countDone(map, list) {
    return list.filter(function (a) { return map[a.id]; }).length;
  }

  function getNotes() {
    try { return JSON.parse(localStorage.getItem(MKT_NOTES_KEY) || '{}'); } catch (e) { return {}; }
  }

  function saveNote(username, period, actId, text) {
    var notes = getNotes();
    var key = username + ':' + period + ':' + actId;
    if (text) {
      notes[key] = text;
    } else {
      delete notes[key];
    }
    localStorage.setItem(MKT_NOTES_KEY, JSON.stringify(notes));
  }

  function getNote(username, period, actId) {
    var notes = getNotes();
    return notes[username + ':' + period + ':' + actId] || '';
  }

  function getCustomActivities(type) {
    try {
      var all = JSON.parse(localStorage.getItem(MKT_CUSTOM_KEY) || '{}');
      return all[type] || [];
    } catch (e) { return []; }
  }

  function saveCustomActivity(type, activity) {
    var all;
    try { all = JSON.parse(localStorage.getItem(MKT_CUSTOM_KEY) || '{}'); } catch (e) { all = {}; }
    if (!all[type]) all[type] = [];
    all[type].push(activity);
    localStorage.setItem(MKT_CUSTOM_KEY, JSON.stringify(all));
  }

  function removeCustomActivity(type, id) {
    var all;
    try { all = JSON.parse(localStorage.getItem(MKT_CUSTOM_KEY) || '{}'); } catch (e) { all = {}; }
    if (!all[type]) return;
    all[type] = all[type].filter(function (a) { return a.id !== id; });
    localStorage.setItem(MKT_CUSTOM_KEY, JSON.stringify(all));
  }

  function getGoals() {
    try { return JSON.parse(localStorage.getItem(MKT_GOALS_KEY) || '{}'); } catch (e) { return {}; }
  }

  function getActivities(type) {
    // Read from admin config if team lead has customized
    try {
      var raw = localStorage.getItem('reb_marketing_config');
      if (raw) {
        var cfg = JSON.parse(raw);
        var adminList = type === 'weekly' ? cfg.weekly : cfg.monthly;
        if (adminList && adminList.length) {
          // Map admin config to activity format (add color from category)
          var catColors = {};
          (cfg.categories || []).forEach(function (c) { catColors[c.key] = c.color; });
          var mapped = adminList.map(function (a) {
            return { id: a.id, label: a.label, detail: a.detail, cat: a.cat, color: catColors[a.cat] || '#6366F1', required: a.required };
          });
          var custom = getCustomActivities(type);
          return mapped.concat(custom);
        }
      }
    } catch (e) {}
    // Fallback to hardcoded defaults
    var base = type === 'weekly' ? WEEKLY : MONTHLY;
    var custom = getCustomActivities(type);
    return base.concat(custom);
  }

  function ringColor(pct) {
    if (pct >= 80) return '#10B981';
    if (pct >= 50) return '#F59E0B';
    return '#EF4444';
  }

  function donutSVG(pct, size, sw, cls) {
    var r = (size - sw) / 2;
    var circ = 2 * Math.PI * r;
    var offset = circ * (1 - pct / 100);
    var color = ringColor(pct);
    return '<svg class="' + (cls || 'mkt-ring-svg') + '" viewBox="0 0 ' + size + ' ' + size + '">' +
      '<circle class="' + (cls ? 'ring-track' : 'mkt-ring-track') + '" cx="' + (size/2) + '" cy="' + (size/2) + '" r="' + r + '"/>' +
      '<circle class="' + (cls ? 'ring-fill' : 'mkt-ring-fill') + '" cx="' + (size/2) + '" cy="' + (size/2) + '" r="' + r + '" stroke="' + color + '" stroke-dasharray="' + circ + '" stroke-dashoffset="' + offset + '"/>' +
    '</svg>';
  }

  function getStreakThreshold() {
    try {
      var raw = localStorage.getItem('reb_marketing_config');
      if (raw) {
        var cfg = JSON.parse(raw);
        if (cfg.streakThreshold) return cfg.streakThreshold / 100;
      }
    } catch (e) {}
    return 0.7;
  }

  function isCustomActivitiesEnabled() {
    try {
      var raw = localStorage.getItem('reb_marketing_config');
      if (raw) {
        var cfg = JSON.parse(raw);
        return cfg.enableCustomActivities !== false;
      }
    } catch (e) {}
    return true;
  }

  function isNotesEnabled() {
    try {
      var raw = localStorage.getItem('reb_marketing_config');
      if (raw) {
        var cfg = JSON.parse(raw);
        return cfg.enableNotes !== false;
      }
    } catch (e) {}
    return true;
  }

  function calcStreak(username) {
    var ud = userData(username);
    var weeks = ud.weekly || {};
    var activities = getActivities('weekly');
    var threshold = getStreakThreshold();
    var streak = 0;
    var d = new Date();
    for (var i = 0; i < 52; i++) {
      var temp = new Date(d);
      temp.setDate(temp.getDate() - i * 7);
      temp.setHours(0,0,0,0);
      var jan1 = new Date(temp.getFullYear(), 0, 1);
      var days = Math.floor((temp - jan1) / 86400000);
      var wk = temp.getFullYear() + '-W' + (function(w){ return (w<10?'0':'')+w; })(Math.ceil((days + jan1.getDay() + 1) / 7));
      var checked = weeks[wk] || {};
      var done = activities.filter(function (a) { return checked[a.id]; }).length;
      if (done >= Math.ceil(activities.length * threshold)) { streak++; }
      else { if (i === 0) continue; break; }
    }
    return streak;
  }

  function getUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); } catch(e) { return []; }
  }

  function teamAvgWeekly() {
    var users = getUsers();
    if (!users.length) return 0;
    var wk = getWeekKey();
    var activities = getActivities('weekly');
    var total = 0;
    users.forEach(function (u) {
      var wd = getChecked(u.username, 'weekly', wk);
      total += countDone(wd, activities);
    });
    return Math.round((total / users.length / activities.length) * 100);
  }

  function catColors() {
    return {
      'Social Media': '#E1306C', 'Outreach': '#10B981', 'In-Person': '#F59E0B',
      'Content': '#8B5CF6', 'CRM & Database': '#6366F1', 'Digital': '#3B82F6',
      'Direct Mail': '#F59E0B', 'Events & Networking': '#EC4899',
      'Content Creation': '#8B5CF6', 'Relationship': '#10B981', 'Custom': '#6366F1'
    };
  }

  function getCategoryBreakdown(activities, checked) {
    var cats = {};
    activities.forEach(function (a) {
      if (!cats[a.cat]) cats[a.cat] = { total: 0, done: 0, color: a.color };
      cats[a.cat].total++;
      if (checked[a.id]) cats[a.cat].done++;
    });
    return cats;
  }

  function escHtml(s) {
    var d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function motivationalMessage(wPct, streak) {
    if (wPct >= 100) return "You crushed it this week! Every single activity done.";
    if (wPct >= 80) return "Almost there! You're on fire this week.";
    if (wPct >= 50) return "Solid progress! Keep pushing to finish strong.";
    if (streak > 2) return "You've got a " + streak + "-week streak going. Don't break it!";
    return "Let's build some momentum this week!";
  }

  // ---- Render: Banner ----
  function renderBanner(wPct, mPct, streak, wDone, wTotal) {
    var h = '<div class="mkt-banner">';
    h += '<div class="mkt-banner-title">Marketing Hub</div>';
    h += '<div class="mkt-banner-sub">' + motivationalMessage(wPct, streak) + '</div>';
    h += '<div class="mkt-banner-stats">';
    h += '<div class="mkt-banner-stat"><div class="mkt-banner-stat-val">' + wDone + '/' + wTotal + '</div><div class="mkt-banner-stat-label">This Week</div></div>';
    h += '<div class="mkt-banner-stat"><div class="mkt-banner-stat-val">' + wPct + '%</div><div class="mkt-banner-stat-label">Weekly Progress</div></div>';
    h += '<div class="mkt-banner-stat"><div class="mkt-banner-stat-val">' + mPct + '%</div><div class="mkt-banner-stat-label">Monthly Progress</div></div>';
    h += '<div class="mkt-banner-stat"><div class="mkt-banner-stat-val">' + streak + (streak > 0 ? ' 🔥' : '') + '</div><div class="mkt-banner-stat-label">Week Streak</div></div>';
    if (privileged) {
      h += '<div class="mkt-banner-stat"><div class="mkt-banner-stat-val">' + teamAvgWeekly() + '%</div><div class="mkt-banner-stat-label">Team Avg</div></div>';
    }
    h += '</div></div>';
    return h;
  }

  // ---- Render: Category Breakdown ----
  function renderCategoryBreakdown(activities, checked) {
    var cats = getCategoryBreakdown(activities, checked);
    var keys = Object.keys(cats).sort(function (a, b) {
      var aPct = cats[a].total ? cats[a].done / cats[a].total : 0;
      var bPct = cats[b].total ? cats[b].done / cats[b].total : 0;
      return bPct - aPct;
    });
    if (!keys.length) return '';
    var h = '<div class="mkt-cat-progress">';
    h += '<div class="mkt-cat-progress-title">Category Breakdown</div>';
    keys.forEach(function (cat) {
      var c = cats[cat];
      var pct = c.total ? Math.round(c.done / c.total * 100) : 0;
      h += '<div class="mkt-cat-row">';
      h += '<div class="mkt-cat-dot" style="background:' + c.color + '"></div>';
      h += '<div class="mkt-cat-name">' + cat + '</div>';
      h += '<div class="mkt-cat-bar-wrap"><div class="mkt-cat-bar-fill" style="width:' + pct + '%;background:' + c.color + '"></div></div>';
      h += '<div class="mkt-cat-count">' + c.done + '/' + c.total + '</div>';
      h += '</div>';
    });
    h += '</div>';
    return h;
  }

  // ---- Render: Activity List ----
  function renderActivityList(activities, checked, periodKey) {
    if (!activities || activities.length === 0) {
      return '<div style="text-align:center;padding:60px 20px;color:var(--gray-400);">' +
        '<div style="font-size:2rem;margin-bottom:12px">📣</div>' +
        '<div style="font-weight:600;margin-bottom:4px">No marketing activity recorded yet</div>' +
        '</div>';
    }

    var h = '<div class="lb-card">';

    // Progress bar header
    var done = countDone(checked, activities);
    var total = activities.length;
    var pct = total ? Math.round(done / total * 100) : 0;
    h += '<div style="padding:16px 20px;border-bottom:1px solid var(--gray-100);display:flex;align-items:center;justify-content:space-between">';
    h += '<div style="font-size:.9rem;font-weight:700;color:var(--gray-800)">' + (currentTab === 'weekly' ? 'This Week' : 'This Month') + '</div>';
    h += '<span style="font-size:.82rem;font-weight:600;color:' + ringColor(pct) + '">' + done + '/' + total + ' complete</span>';
    h += '</div>';
    h += '<div style="height:3px;background:var(--gray-100)"><div style="height:100%;width:' + pct + '%;background:' + ringColor(pct) + ';transition:width .3s"></div></div>';

    // Group by category
    var catOrder = [];
    var catMap = {};
    activities.forEach(function (a) {
      if (!catMap[a.cat]) { catMap[a.cat] = []; catOrder.push(a.cat); }
      catMap[a.cat].push(a);
    });

    catOrder.forEach(function (cat) {
      h += '<div class="mkt-cat-heading">' + cat + '</div>';
      catMap[cat].forEach(function (a) {
        var isDone = !!checked[a.id];
        var note = getNote(session.username, periodKey, a.id);
        var isCustom = a.id.indexOf('custom_') === 0;
        h += '<div class="mkt-item' + (isDone ? ' checked' : '') + '" data-action="toggle-activity" data-id="' + a.id + '" data-type="' + currentTab + '" data-period="' + periodKey + '">';
        h += '<input type="checkbox"' + (isDone ? ' checked' : '') + ' style="width:18px;height:18px;accent-color:var(--emerald);cursor:pointer;flex-shrink:0;margin-top:2px">';
        h += '<div class="mkt-item-dot" style="background:' + a.color + '"></div>';
        h += '<div class="mkt-item-info">';
        h += '<div class="mkt-item-label">' + escHtml(a.label) + '</div>';
        h += '<div class="mkt-item-detail">' + escHtml(a.detail) + '</div>';
        if (note) {
          h += '<div class="mkt-note-text">' + escHtml(note) + '</div>';
        }
        h += '</div>';
        h += '<div class="mkt-item-actions">';
        if (isNotesEnabled()) {
          h += '<button class="mkt-note-btn' + (note ? ' has-note' : '') + '" data-action="open-note" data-id="' + a.id + '" data-period="' + periodKey + '" data-label="' + escHtml(a.label) + '" title="Add note"><svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg></button>';
        }
        if (isCustom) {
          h += '<button class="mkt-del-btn" data-action="delete-custom" data-id="' + a.id + '" data-type="' + currentTab + '" title="Remove custom activity"><svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></button>';
        }
        h += '</div>';
        h += '</div>';
      });
    });

    // Add custom activity form
    if (isCustomActivitiesEnabled()) {
      var cats = catColors();
      // Build category list from admin config or defaults
      var catList;
      try {
        var raw = localStorage.getItem('reb_marketing_config');
        if (raw) {
          var cfg = JSON.parse(raw);
          catList = (cfg.categories || []).map(function (c) { return c.key; });
        }
      } catch (e) {}
      if (!catList || !catList.length) {
        catList = currentTab === 'weekly'
          ? ['Social Media', 'Outreach', 'In-Person', 'Content', 'CRM & Database', 'Custom']
          : ['Digital', 'Direct Mail', 'Events & Networking', 'Content Creation', 'Relationship', 'Custom'];
      }
      h += '<div class="mkt-add-form">';
      h += '<input type="text" id="customActivityName" placeholder="Add a custom activity...">';
      h += '<select id="customActivityCat">';
      catList.forEach(function (c) {
        h += '<option value="' + c + '">' + c + '</option>';
      });
      h += '</select>';
      h += '<button class="mkt-add-btn" data-action="add-custom" data-type="' + currentTab + '">+ Add</button>';
      h += '</div>';
    }

    h += '</div>';
    return h;
  }

  // ---- Render: History ----
  function renderHistory() {
    var h = '';
    h += '<div class="mkt-history-nav">';
    h += '<button data-action="history-nav" data-dir="prev">&larr; Older</button>';
    h += '<span>' + (currentTab === 'weekly' ? 'Weekly' : 'Monthly') + ' History</span>';
    h += '<button data-action="history-nav" data-dir="next"' + (historyOffset <= 0 ? ' disabled style="opacity:.4;cursor:default"' : '') + '>Newer &rarr;</button>';
    h += '</div>';

    var activities = getActivities(currentTab);
    for (var i = 0; i < 5; i++) {
      var idx = historyOffset + i + 1; // +1 to skip current period
      var periodKey = currentTab === 'weekly' ? getWeekKey(idx) : getMonthKey(idx);
      var periodLabel = currentTab === 'weekly' ? formatWeekKey(periodKey) : formatMonthKey(periodKey);
      var checked = getChecked(session.username, currentTab, periodKey);
      var done = countDone(checked, activities);
      var total = activities.length;
      var pct = total ? Math.round(done / total * 100) : 0;

      h += '<div class="mkt-history-card">';
      h += '<div class="mkt-history-header">';
      h += '<div class="mkt-history-period">' + periodLabel + '</div>';
      var badgeColor = pct >= 80 ? '#ECFDF5;color:#065F46' : pct >= 50 ? '#FEF3C7;color:#92400E' : pct > 0 ? '#FEE2E2;color:#991B1B' : 'var(--gray-100);color:var(--gray-400)';
      h += '<div class="mkt-history-badge" style="background:' + badgeColor + '">' + done + '/' + total + ' (' + pct + '%)</div>';
      h += '</div>';

      if (done > 0) {
        h += '<div class="mkt-history-items">';
        activities.forEach(function (a) {
          var checkVal = checked[a.id];
          var isDone = !!checkVal;
          // Format completion timestamp if available
          var completedLabel = '';
          if (isDone) {
            var ts = (typeof checkVal === 'string' && checkVal.length > 4) ? checkVal : null;
            if (ts) {
              var tsDate = new Date(ts);
              if (!isNaN(tsDate.getTime())) {
                completedLabel = tsDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              }
            }
          }
          h += '<div class="mkt-history-item ' + (isDone ? 'done' : 'missed') + '">';
          if (isDone) {
            h += '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
          } else {
            h += '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
          }
          h += '<span>' + escHtml(a.label) + '</span>';
          if (completedLabel) {
            h += '<span style="margin-left:auto;font-size:.72rem;color:var(--gray-400);flex-shrink:0;padding-left:8px">' + completedLabel + '</span>';
          }
          h += '</div>';
        });
        h += '</div>';
      } else {
        h += '<div style="padding:20px;text-align:center;font-size:.82rem;color:var(--gray-400)">No activities completed this period</div>';
      }

      h += '</div>';
    }
    return h;
  }

  // ---- Render: Team ----
  function renderTeam() {
    var wk = getWeekKey();
    var mk = getMonthKey();
    var wActivities = getActivities('weekly');
    var mActivities = getActivities('monthly');
    var users = getUsers().filter(function (u) { return u.role !== 'Team Lead'; });
    if (!users.length) return '<div style="text-align:center;padding:40px;color:var(--gray-400)">No agents on the team yet</div>';

    var h = '';
    h += '<div class="mkt-team-grid">';

    users.forEach(function (u) {
      var uWk = getChecked(u.username, 'weekly', wk);
      var uMk = getChecked(u.username, 'monthly', mk);
      var uWDone = countDone(uWk, wActivities);
      var uMDone = countDone(uMk, mActivities);
      var uWPct = wActivities.length ? Math.round(uWDone / wActivities.length * 100) : 0;
      var uMPct = mActivities.length ? Math.round(uMDone / mActivities.length * 100) : 0;
      var uStreak = calcStreak(u.username);
      var cls = agentClass(u.displayName);
      var statusTag = uWPct >= 80 ? '<span class="mkt-status-tag on-fire">On Fire</span>' :
                      uWPct >= 50 ? '<span class="mkt-status-tag doing-well">Doing Well</span>' :
                                    '<span class="mkt-status-tag needs-attn">Needs Attention</span>';

      h += '<div class="mkt-agent-card">';
      // Header
      h += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">';
      h += '<div class="agent-avatar ' + cls + '" style="width:42px;height:42px;font-size:.78rem">' + getInitials(u.displayName) + '</div>';
      h += '<div style="flex:1"><div style="font-size:.9rem;font-weight:700;color:var(--gray-900)">' + u.displayName + '</div>';
      h += '<div style="font-size:.75rem;color:var(--gray-400)">' + u.role + '</div></div>';
      h += statusTag;
      h += '</div>';

      // Rings
      h += '<div style="display:flex;gap:20px;justify-content:center;margin-bottom:14px">';
      h += '<div style="text-align:center"><div class="mkt-mini-ring">' + donutSVG(uWPct, 56, 5, 'mkt-mini-svg') + '<div class="mkt-mini-pct">' + uWPct + '%</div></div><div style="font-size:.6rem;color:var(--gray-400);font-weight:600;text-transform:uppercase;margin-top:3px">Weekly</div></div>';
      h += '<div style="text-align:center"><div class="mkt-mini-ring">' + donutSVG(uMPct, 56, 5, 'mkt-mini-svg') + '<div class="mkt-mini-pct">' + uMPct + '%</div></div><div style="font-size:.6rem;color:var(--gray-400);font-weight:600;text-transform:uppercase;margin-top:3px">Monthly</div></div>';
      h += '</div>';

      // Category badges
      var wCats = getCategoryBreakdown(wActivities, uWk);
      var catKeys = Object.keys(wCats);
      if (catKeys.length) {
        h += '<div class="mkt-agent-cats">';
        catKeys.forEach(function (cat) {
          var c = wCats[cat];
          var pct = c.total ? Math.round(c.done / c.total * 100) : 0;
          var bg = pct >= 80 ? '#ECFDF5' : pct >= 50 ? '#FEF3C7' : pct > 0 ? '#FEE2E2' : 'var(--gray-100)';
          var fg = pct >= 80 ? '#065F46' : pct >= 50 ? '#92400E' : pct > 0 ? '#991B1B' : 'var(--gray-400)';
          h += '<span class="mkt-agent-cat-badge" style="background:' + bg + ';color:' + fg + '">' + cat + ' ' + c.done + '/' + c.total + '</span>';
        });
        h += '</div>';
      }

      // Footer
      h += '<div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;margin-top:12px;border-top:1px solid var(--gray-100)">';
      h += '<span style="font-size:.78rem;font-weight:700;color:var(--amber)">' + (uStreak > 0 ? '🔥 ' + uStreak + ' week streak' : 'No streak') + '</span>';
      h += '<span style="font-size:.78rem;color:var(--gray-400)">' + uWDone + '/' + wActivities.length + ' this week</span>';
      h += '</div>';
      h += '</div>';
    });

    h += '</div>';
    return h;
  }

  // ---- Main Render ----
  function render() {
    var wk = getWeekKey();
    var mk = getMonthKey();
    var wActivities = getActivities('weekly');
    var mActivities = getActivities('monthly');
    var wChecked = getChecked(session.username, 'weekly', wk);
    var mChecked = getChecked(session.username, 'monthly', mk);
    var wDone = countDone(wChecked, wActivities);
    var mDone = countDone(mChecked, mActivities);
    var wPct = wActivities.length ? Math.round(wDone / wActivities.length * 100) : 0;
    var mPct = mActivities.length ? Math.round(mDone / mActivities.length * 100) : 0;
    var streak = calcStreak(session.username);

    var activities = currentTab === 'weekly' ? wActivities : mActivities;
    var checked = currentTab === 'weekly' ? wChecked : mChecked;
    var periodKey = currentTab === 'weekly' ? wk : mk;

    var html = '';

    // Banner
    html += renderBanner(wPct, mPct, streak, wDone, wActivities.length);

    // View tabs
    html += '<div class="mkt-view-tabs">';
    html += '<button class="mkt-view-tab' + (currentView === 'activities' ? ' active' : '') + '" data-action="switch-view" data-view="activities">My Activities</button>';
    html += '<button class="mkt-view-tab' + (currentView === 'history' ? ' active' : '') + '" data-action="switch-view" data-view="history">History</button>';
    if (privileged) {
      html += '<button class="mkt-view-tab' + (currentView === 'team' ? ' active' : '') + '" data-action="switch-view" data-view="team">Team</button>';
    }
    html += '</div>';

    if (currentView === 'activities') {
      // Donut Rings
      html += '<div class="mkt-rings-row">';
      html += '<div class="mkt-ring-card"><div class="mkt-ring-wrap">' + donutSVG(wPct, 140, 10) + '<div class="mkt-ring-pct">' + wPct + '<small>%</small></div></div>';
      html += '<div class="mkt-ring-title">Weekly Progress</div><div class="mkt-ring-sub">' + wDone + '/' + wActivities.length + ' activities</div></div>';
      html += '<div class="mkt-ring-card"><div class="mkt-ring-wrap">' + donutSVG(mPct, 140, 10) + '<div class="mkt-ring-pct">' + mPct + '<small>%</small></div></div>';
      html += '<div class="mkt-ring-title">Monthly Progress</div><div class="mkt-ring-sub">' + mDone + '/' + mActivities.length + ' activities</div></div>';
      html += '</div>';

      // Category breakdown
      html += renderCategoryBreakdown(activities, checked);

      // Period toggle
      html += '<div style="display:flex;gap:8px;margin-bottom:20px">';
      html += '<button class="lb-filter-btn' + (currentTab === 'weekly' ? ' active' : '') + '" data-action="switch-tab" data-tab="weekly">Weekly</button>';
      html += '<button class="lb-filter-btn' + (currentTab === 'monthly' ? ' active' : '') + '" data-action="switch-tab" data-tab="monthly">Monthly</button>';
      html += '</div>';

      // Activity checklist
      html += renderActivityList(activities, checked, periodKey);

    } else if (currentView === 'history') {
      // Period toggle for history
      html += '<div style="display:flex;gap:8px;margin-bottom:20px">';
      html += '<button class="lb-filter-btn' + (currentTab === 'weekly' ? ' active' : '') + '" data-action="switch-tab" data-tab="weekly">Weekly</button>';
      html += '<button class="lb-filter-btn' + (currentTab === 'monthly' ? ' active' : '') + '" data-action="switch-tab" data-tab="monthly">Monthly</button>';
      html += '</div>';
      html += renderHistory();

    } else if (currentView === 'team') {
      html += renderTeam();
    }

    pageBody.innerHTML = html;
  }

  // ---- Note Modal ----
  function openNoteModal(actId, period, label) {
    var existing = getNote(session.username, period, actId);
    var overlay = document.createElement('div');
    overlay.className = 'mkt-modal-overlay';
    overlay.innerHTML =
      '<div class="mkt-modal">' +
        '<h3>' + escHtml(label) + '</h3>' +
        '<p>Add a note about this activity (optional)</p>' +
        '<textarea id="mktNoteInput" placeholder="What did you do? Any results or metrics?">' + escHtml(existing) + '</textarea>' +
        '<div class="mkt-modal-btns">' +
          (existing ? '<button class="mkt-btn-cancel" data-action="clear-note">Clear Note</button>' : '') +
          '<button class="mkt-btn-cancel" data-action="close-note">Cancel</button>' +
          '<button class="mkt-btn-save" data-action="save-note">Save</button>' +
        '</div>' +
      '</div>';
    overlay.setAttribute('data-note-id', actId);
    overlay.setAttribute('data-note-period', period);
    document.body.appendChild(overlay);

    var textarea = document.getElementById('mktNoteInput');
    if (textarea) textarea.focus();

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
  }

  // ---- Events ----
  document.addEventListener('click', function (e) {
    var target = e.target.closest('[data-action]');
    if (!target) return;
    var action = target.getAttribute('data-action');

    if (action === 'switch-view') {
      currentView = target.getAttribute('data-view');
      historyOffset = 0;
      render();
    }

    if (action === 'switch-tab') {
      currentTab = target.getAttribute('data-tab');
      render();
    }

    if (action === 'toggle-activity') {
      var id = target.getAttribute('data-id');
      var type = target.getAttribute('data-type');
      var period = target.getAttribute('data-period');
      var ud = userData(session.username);
      if (!ud[type]) ud[type] = {};
      if (!ud[type][period]) ud[type][period] = {};
      // Store ISO timestamp when checking; remove when unchecking
      if (ud[type][period][id]) {
        delete ud[type][period][id];
      } else {
        ud[type][period][id] = new Date().toISOString();
      }
      saveUser(session.username, ud);
      render();
    }

    if (action === 'open-note') {
      e.stopPropagation();
      var noteId = target.closest('[data-id]').getAttribute('data-id') || target.getAttribute('data-id');
      var notePeriod = target.getAttribute('data-period');
      var noteLabel = target.getAttribute('data-label');
      openNoteModal(noteId, notePeriod, noteLabel);
    }

    if (action === 'save-note') {
      var overlay = target.closest('.mkt-modal-overlay');
      var textarea = document.getElementById('mktNoteInput');
      var nId = overlay.getAttribute('data-note-id');
      var nPeriod = overlay.getAttribute('data-note-period');
      saveNote(session.username, nPeriod, nId, textarea.value.trim());
      overlay.remove();
      render();
    }

    if (action === 'clear-note') {
      var overlay = target.closest('.mkt-modal-overlay');
      var nId = overlay.getAttribute('data-note-id');
      var nPeriod = overlay.getAttribute('data-note-period');
      saveNote(session.username, nPeriod, nId, '');
      overlay.remove();
      render();
    }

    if (action === 'close-note') {
      target.closest('.mkt-modal-overlay').remove();
    }

    if (action === 'add-custom') {
      var nameInput = document.getElementById('customActivityName');
      var catSelect = document.getElementById('customActivityCat');
      var name = nameInput.value.trim();
      if (!name) { nameInput.focus(); return; }
      var type = target.getAttribute('data-type');
      var cat = catSelect.value;
      var colors = catColors();
      var activity = {
        id: 'custom_' + Date.now().toString(36),
        label: name,
        detail: 'Custom activity',
        cat: cat,
        color: colors[cat] || '#6366F1'
      };
      saveCustomActivity(type, activity);
      render();
    }

    if (action === 'delete-custom') {
      e.stopPropagation();
      var delId = target.getAttribute('data-id');
      var delType = target.getAttribute('data-type');
      removeCustomActivity(delType, delId);
      render();
    }

    if (action === 'history-nav') {
      var dir = target.getAttribute('data-dir');
      if (dir === 'prev') historyOffset += 5;
      if (dir === 'next' && historyOffset > 0) historyOffset = Math.max(0, historyOffset - 5);
      render();
    }
  });

  render();
})();
