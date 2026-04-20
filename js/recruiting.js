/* ============================================================
   RE Back Office — Agent Recruiting Page
   ============================================================ */

(function () {
  'use strict';

  Auth.requireAuth();
  populateSidebarUser();
  setActiveNav();
  initSidebarToggle();
  applyPageColor('recruiting');

  if (!Auth.isPrivileged()) {
    document.getElementById('pageBody').innerHTML =
      '<div class="empty-state" style="padding:80px 40px;text-align:center">' +
        '<svg viewBox="0 0 24 24" width="48" height="48" fill="var(--gray-200)"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>' +
        '<h3>Access Restricted</h3>' +
        '<p>Only Team Leads can access the Recruiting section.</p>' +
        '<a href="home.html" style="display:inline-block;margin-top:16px;padding:10px 24px;border-radius:8px;background:var(--indigo);color:#fff;font-weight:600;font-size:.85rem;text-decoration:none">Back to Dashboard</a>' +
      '</div>';
    return;
  }

  document.getElementById('logoutBtn').addEventListener('click', function () {
    Auth.logout();
  });

  var STORAGE_KEY = 'reb_recruiting';
  var pageBody = document.getElementById('pageBody');
  var currentView = 'list'; // list, detail, form
  var currentFilter = 'All';
  var viewingId = null;
  var editingId = null;

  // ---- Pipeline Stages with colors ----
  var STAGES = {
    'Prospect':             { bg: '#EEF2FF', text: '#4F46E5' },
    'Contacted':            { bg: '#F5F3FF', text: '#7C3AED' },
    'Interview Scheduled':  { bg: '#FEF3C7', text: '#92400E' },
    'Interviewed':          { bg: '#FFEDD5', text: '#9A3412' },
    'Offer Made':           { bg: '#FEE2E2', text: '#991B1B' },
    'Accepted':             { bg: '#ECFDF5', text: '#065F46' },
    'Declined':             { bg: '#F1F5F9', text: '#475569' }
  };

  var STAGE_KEYS = Object.keys(STAGES);

  var SOURCES = ['Referral', 'Social Media', 'Event', 'Cold Outreach', 'Inbound', 'Other'];

  // ---- Seed data ----
  var SEED_DATA = [
    {
      id: 'rec-001', name: 'Sarah Martinez', phone: '(512) 555-0301', email: 'smartinez@remax.com',
      currentBrokerage: 'Re/Max Elite', currentRole: 'Senior Agent', yearsExperience: 8,
      annualVolume: 12000000, annualClosings: 24, stage: 'Interview Scheduled',
      source: 'Referral', notes: 'Strong producer, looking for better support and marketing. Met at SABOR event.',
      interviewDate: '2026-04-05', followUpDate: '2026-04-02', rating: 4, tags: ['top producer', 'experienced'],
      createdAt: '2026-03-15T10:00:00Z'
    },
    {
      id: 'rec-002', name: 'Ryan O\'Brien', phone: '(512) 555-0302', email: 'robrien@kw.com',
      currentBrokerage: 'Keller Williams', currentRole: 'Agent', yearsExperience: 2,
      annualVolume: 3000000, annualClosings: 8, stage: 'Prospect',
      source: 'Social Media', notes: 'Young agent with hustle. Active on Instagram, good sphere of influence.',
      interviewDate: '', followUpDate: '2026-04-10', rating: 3, tags: ['social media', 'new agent'],
      createdAt: '2026-03-18T10:00:00Z'
    },
    {
      id: 'rec-003', name: 'Derek Chang', phone: '(512) 555-0303', email: 'dchang@exp.com',
      currentBrokerage: 'eXp Realty', currentRole: 'Team Lead', yearsExperience: 5,
      annualVolume: 7000000, annualClosings: 16, stage: 'Offer Made',
      source: 'Event', notes: 'Currently leads a small team of 3. Interested in our tech stack and marketing resources. Very professional.',
      interviewDate: '2026-03-20', followUpDate: '2026-04-01', rating: 5, tags: ['team lead', 'tech savvy'],
      createdAt: '2026-03-10T10:00:00Z'
    },
    {
      id: 'rec-004', name: 'Lisa Petrov', phone: '(512) 555-0304', email: 'lpetrov@c21.com',
      currentBrokerage: 'Century 21', currentRole: 'Broker Associate', yearsExperience: 10,
      annualVolume: 9500000, annualClosings: 20, stage: 'Interviewed',
      source: 'Cold Outreach', notes: 'Veteran agent, highly respected in her market. Wants more flexibility and better splits.',
      interviewDate: '2026-03-25', followUpDate: '2026-04-03', rating: 5, tags: ['veteran', 'high volume'],
      createdAt: '2026-03-08T10:00:00Z'
    }
  ];

  // ---- Helpers ----
  function generateId() {
    return 'rec_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatCurrency(n) {
    n = parseFloat(n) || 0;
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  // ---- Data access ----
  function getRecruits() {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      if (typeof Auth !== 'undefined' && Auth.isDemo && Auth.isDemo()) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DATA));
        return SEED_DATA.slice();
      }
      return [];
    }
    try { return JSON.parse(raw); } catch (e) { return []; }
  }

  function saveRecruits(recruits) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recruits));
  }

  // ---- Badge helpers ----
  function stageBadge(stage) {
    var s = STAGES[stage] || STAGES['Prospect'];
    return '<span style="display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600;background:' + s.bg + ';color:' + s.text + ';">' + escapeHtml(stage) + '</span>';
  }

  function starsHtml(rating) {
    var html = '';
    for (var i = 1; i <= 5; i++) {
      if (i <= rating) {
        html += '<span style="color:#F59E0B;font-size:16px;">&#9733;</span>';
      } else {
        html += '<span style="color:#CBD5E1;font-size:16px;">&#9734;</span>';
      }
    }
    return html;
  }

  function statCard(label, value, color, iconSvg) {
    return '<div class="stat-card" style="background:#fff;border-radius:12px;padding:18px;box-shadow:0 1px 4px rgba(0,0,0,0.06);border:1px solid #E2E8F0;">' +
      '<div style="display:flex;align-items:center;gap:12px;">' +
      '<div class="stat-icon" style="width:42px;height:42px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:' + color + '20;color:' + color + ';">' + iconSvg + '</div>' +
      '<div>' +
      '<div style="font-size:22px;font-weight:700;color:#1E293B;">' + value + '</div>' +
      '<div style="font-size:13px;color:#64748B;">' + escapeHtml(label) + '</div>' +
      '</div></div></div>';
  }

  // ---- Render list view ----
  function renderList() {
    var recruits = getRecruits();

    // Stats
    var total = recruits.length;
    var now = new Date();
    var thisMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    var interviewsThisMonth = recruits.filter(function (r) {
      return r.interviewDate && r.interviewDate.substring(0, 7) === thisMonth;
    }).length;
    var offersPending = recruits.filter(function (r) { return r.stage === 'Offer Made'; }).length;
    var acceptedCount = recruits.filter(function (r) { return r.stage === 'Accepted'; }).length;

    // Filter
    var filtered = recruits;
    if (currentFilter !== 'All') {
      filtered = recruits.filter(function (r) { return r.stage === currentFilter; });
    }

    var html = '';

    // Header
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;">';
    html += '<h2 style="margin:0;font-size:22px;font-weight:700;">Recruiting Pipeline</h2>';
    html += '<button class="btn btn-primary" data-action="add-recruit" style="display:inline-flex;align-items:center;gap:6px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg> Add Recruit</button>';
    html += '</div>';

    // Stat cards
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;margin-bottom:24px;">';
    html += statCard('Total Prospects', total, '#4F46E5', '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>');
    html += statCard('Interviews This Month', interviewsThisMonth, '#92400E', '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/></svg>');
    html += statCard('Offers Pending', offersPending, '#991B1B', '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>');
    html += statCard('Accepted', acceptedCount, '#065F46', '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>');
    html += '</div>';

    // Stage filter tabs
    html += '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px;">';
    html += '<button class="lb-filter-btn' + (currentFilter === 'All' ? ' active' : '') + '" data-action="filter" data-filter="All">All</button>';
    STAGE_KEYS.forEach(function (stage) {
      var count = recruits.filter(function (r) { return r.stage === stage; }).length;
      html += '<button class="lb-filter-btn' + (currentFilter === stage ? ' active' : '') + '" data-action="filter" data-filter="' + escapeHtml(stage) + '">' + escapeHtml(stage) + ' (' + count + ')</button>';
    });
    html += '</div>';

    // List view
    if (filtered.length === 0) {
      html += '<div style="text-align:center;padding:60px 20px;color:var(--gray-400);">';
      html += '<div style="font-size:2rem;margin-bottom:12px">🤝</div>';
      html += '<div style="font-weight:600;margin-bottom:4px">No recruits added yet</div>';
      html += '<div style="font-size:.85rem">Click \'Add Recruit\' to get started.</div>';
      html += '</div>';
    } else {
      // Sort by createdAt desc
      filtered.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });

      html += '<div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);border:1px solid #E2E8F0;overflow:hidden;">';
      // Table header
      html += '<div style="display:grid;grid-template-columns:2fr 1.5fr 1fr 1fr 120px 80px;gap:12px;padding:12px 16px;background:#F8FAFC;border-bottom:1px solid #E2E8F0;font-size:12px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;">';
      html += '<div>Name</div><div>Brokerage</div><div>Stage</div><div>Source</div><div>Rating</div><div>Exp.</div>';
      html += '</div>';

      filtered.forEach(function (r) {
        html += '<div class="list-row" style="display:grid;grid-template-columns:2fr 1.5fr 1fr 1fr 120px 80px;gap:12px;padding:14px 16px;border-bottom:1px solid #F1F5F9;cursor:pointer;transition:background 0.1s;align-items:center;" data-action="view-recruit" data-id="' + r.id + '">';
        // Name
        html += '<div>';
        html += '<div style="font-weight:600;font-size:14px;color:#1E293B;">' + escapeHtml(r.name) + '</div>';
        if (r.email) {
          html += '<div style="font-size:12px;color:#64748B;">' + escapeHtml(r.email) + '</div>';
        }
        html += '</div>';
        // Brokerage
        html += '<div style="font-size:13px;color:#475569;">' + escapeHtml(r.currentBrokerage || '—') + '</div>';
        // Stage
        html += '<div>' + stageBadge(r.stage) + '</div>';
        // Source
        html += '<div style="font-size:13px;color:#64748B;">' + escapeHtml(r.source || '—') + '</div>';
        // Rating
        html += '<div>' + starsHtml(r.rating || 0) + '</div>';
        // Experience
        html += '<div style="font-size:13px;color:#475569;">' + (r.yearsExperience ? r.yearsExperience + ' yr' + (r.yearsExperience !== 1 ? 's' : '') : '—') + '</div>';
        html += '</div>';
      });
      html += '</div>';
    }

    pageBody.innerHTML = html;
  }

  // ---- Render detail view ----
  function renderDetail(id) {
    var recruits = getRecruits();
    var recruit = null;
    for (var i = 0; i < recruits.length; i++) {
      if (recruits[i].id === id) { recruit = recruits[i]; break; }
    }
    if (!recruit) { currentView = 'list'; renderList(); return; }

    var html = '';

    // Back button
    html += '<div style="margin-bottom:20px;">';
    html += '<button class="btn btn-outline btn-sm" data-action="back-to-list" style="display:inline-flex;align-items:center;gap:6px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> Back to Pipeline</button>';
    html += '</div>';

    // Header card
    html += '<div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);border:1px solid #E2E8F0;padding:24px;margin-bottom:20px;">';
    html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;">';
    // Left: name info
    html += '<div>';
    html += '<h2 style="margin:0 0 4px 0;font-size:24px;font-weight:700;color:#1E293B;">' + escapeHtml(recruit.name) + '</h2>';
    html += '<div style="font-size:15px;color:#64748B;margin-bottom:8px;">' + escapeHtml(recruit.currentRole || 'Agent') + ' at ' + escapeHtml(recruit.currentBrokerage || 'Unknown') + '</div>';
    html += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">';
    html += stageBadge(recruit.stage);
    html += '<div style="margin-left:4px;">' + starsHtml(recruit.rating || 0) + '</div>';
    html += '</div>';
    html += '</div>';
    // Right: actions
    html += '<div style="display:flex;gap:8px;">';
    html += '<button class="btn btn-outline btn-sm" data-action="edit-recruit" data-id="' + recruit.id + '">Edit</button>';
    html += '<button class="btn btn-outline btn-sm" style="color:#DC2626;border-color:#FECACA;" data-action="delete-recruit" data-id="' + recruit.id + '">Delete</button>';
    html += '</div>';
    html += '</div>';

    // Contact info
    html += '<div style="display:flex;flex-wrap:wrap;gap:16px;margin-top:16px;">';
    if (recruit.phone) {
      html += '<div style="font-size:13px;"><span style="color:#64748B;">Phone:</span> <a href="tel:' + escapeHtml(recruit.phone) + '" style="color:#3484D0;text-decoration:none;">' + escapeHtml(recruit.phone) + '</a></div>';
    }
    if (recruit.email) {
      html += '<div style="font-size:13px;"><span style="color:#64748B;">Email:</span> <a href="mailto:' + escapeHtml(recruit.email) + '" style="color:#3484D0;text-decoration:none;">' + escapeHtml(recruit.email) + '</a></div>';
    }
    html += '</div>';

    // Stage change dropdown
    html += '<div style="margin-top:16px;padding-top:16px;border-top:1px solid #F1F5F9;display:flex;align-items:center;gap:10px;">';
    html += '<label style="font-size:13px;font-weight:600;color:#475569;">Change Stage:</label>';
    var stageOpts = STAGE_KEYS.map(function (s) {
      return '<option value="' + escapeHtml(s) + '"' + (recruit.stage === s ? ' selected' : '') + '>' + escapeHtml(s) + '</option>';
    }).join('');
    html += '<select class="form-control" style="width:auto;max-width:220px;" data-action="change-stage" data-id="' + recruit.id + '">' + stageOpts + '</select>';
    html += '</div>';

    html += '</div>';

    // Detail blocks
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;margin-bottom:20px;">';

    // Experience
    html += detailBlock('Experience', recruit.yearsExperience ? recruit.yearsExperience + ' years' : '—', '#4F46E5');
    // Annual Volume
    html += detailBlock('Annual Volume', recruit.annualVolume ? formatCurrency(recruit.annualVolume) : '—', '#059669');
    // Annual Closings
    html += detailBlock('Annual Closings', recruit.annualClosings || '—', '#7C3AED');
    // Source
    html += detailBlock('Source', recruit.source || '—', '#0284C7');
    // Interview Date
    html += detailBlock('Interview Date', recruit.interviewDate ? Data.formatDate(recruit.interviewDate) : 'Not scheduled', '#92400E');
    // Follow-up Date
    html += detailBlock('Follow-up Date', recruit.followUpDate ? Data.formatDate(recruit.followUpDate) : 'Not set', '#DC2626');

    html += '</div>';

    // Tags
    if (recruit.tags && recruit.tags.length > 0) {
      html += '<div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);border:1px solid #E2E8F0;padding:16px;margin-bottom:20px;">';
      html += '<div style="font-size:13px;font-weight:600;color:#475569;margin-bottom:8px;">Tags</div>';
      html += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
      recruit.tags.forEach(function (tag) {
        html += '<span style="display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;background:#F1F5F9;color:#64748B;">' + escapeHtml(tag) + '</span>';
      });
      html += '</div></div>';
    }

    // Notes
    html += '<div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);border:1px solid #E2E8F0;padding:16px;margin-bottom:20px;">';
    html += '<div style="font-size:13px;font-weight:600;color:#475569;margin-bottom:8px;">Notes</div>';
    html += '<div style="font-size:14px;color:#334155;line-height:1.6;white-space:pre-wrap;">' + escapeHtml(recruit.notes || 'No notes yet.') + '</div>';
    html += '</div>';

    // Created date
    html += '<div style="font-size:12px;color:#94A3B8;">Added ' + Data.formatDate(recruit.createdAt) + '</div>';

    pageBody.innerHTML = html;
  }

  function detailBlock(label, value, color) {
    return '<div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);border:1px solid #E2E8F0;padding:16px;">' +
      '<div style="font-size:12px;font-weight:600;color:#64748B;margin-bottom:4px;">' + escapeHtml(label) + '</div>' +
      '<div style="font-size:18px;font-weight:700;color:' + color + ';">' + value + '</div>' +
      '</div>';
  }

  // ---- Render form view ----
  function renderForm(id) {
    var recruits = getRecruits();
    var recruit = null;
    if (id) {
      for (var i = 0; i < recruits.length; i++) {
        if (recruits[i].id === id) { recruit = recruits[i]; break; }
      }
    }
    var isEdit = !!recruit;
    var v = recruit || { stage: 'Prospect', source: '', rating: 3, tags: [] };

    var html = '';

    // Back button
    html += '<div style="margin-bottom:20px;">';
    html += '<button class="btn btn-outline btn-sm" data-action="back-to-list" style="display:inline-flex;align-items:center;gap:6px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> Back</button>';
    html += '</div>';

    html += '<div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);border:1px solid #E2E8F0;padding:24px;max-width:720px;">';
    html += '<h2 style="margin:0 0 20px 0;font-size:22px;font-weight:700;color:#1E293B;">' + (isEdit ? 'Edit Recruit' : 'Add Recruit') + '</h2>';

    // Name
    html += '<div class="form-group"><label>Name *</label><input type="text" id="recName" class="form-control" value="' + escapeHtml(v.name || '') + '" placeholder="Full name"></div>';

    // Phone + Email
    html += '<div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">';
    html += '<div class="form-group"><label>Phone</label><input type="text" id="recPhone" class="form-control" value="' + escapeHtml(v.phone || '') + '" placeholder="(555) 555-0100"></div>';
    html += '<div class="form-group"><label>Email</label><input type="email" id="recEmail" class="form-control" value="' + escapeHtml(v.email || '') + '" placeholder="email@example.com"></div>';
    html += '</div>';

    // Brokerage + Role
    html += '<div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">';
    html += '<div class="form-group"><label>Current Brokerage</label><input type="text" id="recBrokerage" class="form-control" value="' + escapeHtml(v.currentBrokerage || '') + '" placeholder="e.g. Keller Williams"></div>';
    html += '<div class="form-group"><label>Current Role</label><input type="text" id="recRole" class="form-control" value="' + escapeHtml(v.currentRole || '') + '" placeholder="e.g. Senior Agent"></div>';
    html += '</div>';

    // Experience + Volume + Closings
    html += '<div class="form-row" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">';
    html += '<div class="form-group"><label>Years Experience</label><input type="number" id="recExperience" class="form-control" value="' + (v.yearsExperience || '') + '" placeholder="e.g. 5"></div>';
    html += '<div class="form-group"><label>Annual Volume ($)</label><input type="number" id="recVolume" class="form-control" value="' + (v.annualVolume || '') + '" placeholder="e.g. 5000000"></div>';
    html += '<div class="form-group"><label>Annual Closings</label><input type="number" id="recClosings" class="form-control" value="' + (v.annualClosings || '') + '" placeholder="e.g. 12"></div>';
    html += '</div>';

    // Stage + Source + Rating
    var stageOpts = STAGE_KEYS.map(function (s) {
      return '<option value="' + escapeHtml(s) + '"' + (v.stage === s ? ' selected' : '') + '>' + escapeHtml(s) + '</option>';
    }).join('');
    var sourceOpts = SOURCES.map(function (s) {
      return '<option value="' + escapeHtml(s) + '"' + (v.source === s ? ' selected' : '') + '>' + escapeHtml(s) + '</option>';
    }).join('');
    var ratingOpts = '';
    for (var i = 1; i <= 5; i++) {
      ratingOpts += '<option value="' + i + '"' + (v.rating === i ? ' selected' : '') + '>' + i + '</option>';
    }

    html += '<div class="form-row" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">';
    html += '<div class="form-group"><label>Stage</label><select id="recStage" class="form-control">' + stageOpts + '</select></div>';
    html += '<div class="form-group"><label>Source</label><select id="recSource" class="form-control"><option value="">Select source</option>' + sourceOpts + '</select></div>';
    html += '<div class="form-group"><label>Rating</label><select id="recRating" class="form-control"><option value="">No rating</option>' + ratingOpts + '</select></div>';
    html += '</div>';

    // Interview Date + Follow-up Date
    html += '<div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">';
    html += '<div class="form-group"><label>Interview Date</label><input type="date" id="recInterview" class="form-control" value="' + escapeHtml(v.interviewDate || '') + '"></div>';
    html += '<div class="form-group"><label>Follow-up Date</label><input type="date" id="recFollowUp" class="form-control" value="' + escapeHtml(v.followUpDate || '') + '"></div>';
    html += '</div>';

    // Tags
    html += '<div class="form-group"><label>Tags (comma-separated)</label><input type="text" id="recTags" class="form-control" value="' + escapeHtml((v.tags || []).join(', ')) + '" placeholder="e.g. top producer, experienced"></div>';

    // Notes
    html += '<div class="form-group"><label>Notes</label><textarea id="recNotes" class="form-control" rows="4" placeholder="Additional notes about this recruit...">' + escapeHtml(v.notes || '') + '</textarea></div>';

    // Save button
    html += '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">';
    html += '<button class="btn btn-outline" data-action="back-to-list">Cancel</button>';
    html += '<button class="btn btn-primary" data-action="save-recruit" data-id="' + (v.id || '') + '">' + (isEdit ? 'Update' : 'Add Recruit') + '</button>';
    html += '</div>';

    html += '</div>';

    pageBody.innerHTML = html;

    // Focus first field
    var nameInput = document.getElementById('recName');
    if (nameInput) nameInput.focus();
  }

  // ---- Save recruit ----
  function saveRecruit(id) {
    var name = document.getElementById('recName').value.trim();
    var phone = document.getElementById('recPhone').value.trim();
    var email = document.getElementById('recEmail').value.trim();
    var brokerage = document.getElementById('recBrokerage').value.trim();
    var role = document.getElementById('recRole').value.trim();
    var experience = document.getElementById('recExperience').value;
    var volume = document.getElementById('recVolume').value;
    var closings = document.getElementById('recClosings').value;
    var stage = document.getElementById('recStage').value;
    var source = document.getElementById('recSource').value;
    var ratingVal = document.getElementById('recRating').value;
    var interviewDate = document.getElementById('recInterview').value;
    var followUpDate = document.getElementById('recFollowUp').value;
    var tagsRaw = document.getElementById('recTags').value.trim();
    var notes = document.getElementById('recNotes').value.trim();

    if (!name) { showToast('Name is required.', 'error'); return; }

    var tags = tagsRaw ? tagsRaw.split(',').map(function (t) { return t.trim(); }).filter(function (t) { return t; }) : [];
    var rating = ratingVal ? parseInt(ratingVal, 10) : 0;

    var recruits = getRecruits();

    if (id) {
      recruits = recruits.map(function (r) {
        if (r.id === id) {
          r.name = name;
          r.phone = phone;
          r.email = email;
          r.currentBrokerage = brokerage;
          r.currentRole = role;
          r.yearsExperience = experience ? parseInt(experience, 10) : null;
          r.annualVolume = volume ? parseFloat(volume) : null;
          r.annualClosings = closings ? parseInt(closings, 10) : null;
          r.stage = stage;
          r.source = source;
          r.rating = rating;
          r.interviewDate = interviewDate;
          r.followUpDate = followUpDate;
          r.tags = tags;
          r.notes = notes;
        }
        return r;
      });
      showToast('Recruit updated successfully.');
    } else {
      recruits.push({
        id: generateId(),
        name: name,
        phone: phone,
        email: email,
        currentBrokerage: brokerage,
        currentRole: role,
        yearsExperience: experience ? parseInt(experience, 10) : null,
        annualVolume: volume ? parseFloat(volume) : null,
        annualClosings: closings ? parseInt(closings, 10) : null,
        stage: stage,
        source: source,
        rating: rating,
        interviewDate: interviewDate,
        followUpDate: followUpDate,
        tags: tags,
        notes: notes,
        createdAt: new Date().toISOString()
      });
      showToast('Recruit added successfully.');
    }

    saveRecruits(recruits);
    currentView = 'list';
    renderList();
  }

  // ---- Delete recruit ----
  function deleteRecruit(id) {
    if (!confirm('Delete this recruit? This cannot be undone.')) return;
    var recruits = getRecruits().filter(function (r) { return r.id !== id; });
    saveRecruits(recruits);
    showToast('Recruit deleted.');
    currentView = 'list';
    renderList();
  }

  // ---- Change stage inline ----
  function changeStage(id, newStage) {
    var recruits = getRecruits();
    recruits = recruits.map(function (r) {
      if (r.id === id) {
        r.stage = newStage;
      }
      return r;
    });
    saveRecruits(recruits);
    showToast('Stage updated to ' + newStage + '.');
    renderDetail(id);
  }

  // ---- Event delegation ----
  document.addEventListener('click', function (e) {
    var target = e.target.closest('[data-action]');
    if (!target) return;
    var action = target.getAttribute('data-action');

    if (action === 'filter') {
      currentFilter = target.getAttribute('data-filter');
      renderList();
    } else if (action === 'view-recruit') {
      viewingId = target.getAttribute('data-id');
      currentView = 'detail';
      renderDetail(viewingId);
    } else if (action === 'back-to-list') {
      currentView = 'list';
      editingId = null;
      viewingId = null;
      renderList();
    } else if (action === 'add-recruit') {
      editingId = null;
      currentView = 'form';
      renderForm(null);
    } else if (action === 'edit-recruit') {
      editingId = target.getAttribute('data-id');
      currentView = 'form';
      renderForm(editingId);
    } else if (action === 'delete-recruit') {
      deleteRecruit(target.getAttribute('data-id'));
    } else if (action === 'save-recruit') {
      saveRecruit(target.getAttribute('data-id'));
    }
  });

  // Handle stage change dropdown
  document.addEventListener('change', function (e) {
    var target = e.target.closest('[data-action="change-stage"]');
    if (!target) return;
    var id = target.getAttribute('data-id');
    var newStage = target.value;
    changeStage(id, newStage);
  });

  // Hover effect on list rows
  document.addEventListener('mouseover', function (e) {
    var row = e.target.closest('.list-row');
    if (row) row.style.background = '#F8FAFC';
  });
  document.addEventListener('mouseout', function (e) {
    var row = e.target.closest('.list-row');
    if (row) row.style.background = '';
  });

  // ---- Init ----
  renderList();

})();
