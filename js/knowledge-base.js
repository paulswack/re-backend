/* ============================================================
   RE Back Office — Knowledge Base & Training Page
   ============================================================ */

(function () {
  'use strict';

  Auth.requireAuth();
  populateSidebarUser();
  setActiveNav();
  initSidebarToggle();
  applyPageColor('knowledge-base');

  document.getElementById('logoutBtn').addEventListener('click', function () {
    Auth.logout();
  });

  var STORAGE_KEY = 'reb_knowledge_base';
  var PROGRESS_KEY = 'reb_training_progress';
  var pageBody = document.getElementById('pageBody');
  var currentView = 'list'; // list, detail, form
  var currentFilter = 'All';
  var searchQuery = '';
  var viewingId = null;
  var editingId = null;

  // ---- Categories with colors ----
  var CATEGORIES = {
    'Scripts & Dialogues':   { bg: '#EEF2FF', text: '#4F46E5' },
    'Objection Handlers':    { bg: '#FEF3C7', text: '#92400E' },
    'SOPs & Processes':      { bg: '#ECFDF5', text: '#065F46' },
    'Training Materials':    { bg: '#F5F3FF', text: '#7C3AED' },
    'Checklists':            { bg: '#DBEAFE', text: '#1E40AF' },
    'Templates & Forms':     { bg: '#FFF1F2', text: '#BE123C' },
    'Market Knowledge':      { bg: '#E0F2FE', text: '#075985' },
    'Team Policies':         { bg: '#F1F5F9', text: '#334155' }
  };

  var CATEGORY_KEYS = Object.keys(CATEGORIES);

  var STEP_TYPES = ['Read', 'Watch', 'Do', 'Quiz', 'Video'];
  var STEP_ICONS = {
    'Read':  '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/></svg>',
    'Watch': '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
    'Do':    '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>',
    'Quiz':  '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"/></svg>',
    'Video': '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>'
  };

  var DIFFICULTY_COLORS = {
    'beginner':     { bg: '#DCFCE7', text: '#166534' },
    'intermediate': { bg: '#FEF3C7', text: '#92400E' },
    'advanced':     { bg: '#FEE2E2', text: '#991B1B' }
  };

  // ---- Seed data ----
  var SEED_DATA = [
    {
      id: 'kb-001', title: 'Buyer Consultation Script', category: 'Scripts & Dialogues', type: 'article',
      content: 'Opening:\n"Thank you for meeting with me today! I\'m excited to help you find your perfect home. Before we dive in, I\'d love to learn more about what you\'re looking for."\n\nNeeds Assessment:\n1. "What\'s motivating your move right now?"\n2. "Tell me about your ideal neighborhood — what\'s most important to you?"\n3. "Have you been pre-approved for a mortgage yet?"\n4. "What\'s your timeline for moving?"\n5. "Are there any absolute must-haves or deal-breakers?"\n\nSetting Expectations:\n"Here\'s how I work — I\'ll set up a custom search based on your criteria, and you\'ll get instant notifications when new homes hit the market. I\'ll preview properties for you when possible, and when we find the right one, I\'ll guide you through every step from offer to closing."\n\nClosing:\n"Do you have any questions for me? Great — let\'s get your search set up right now."',
      tags: ['buyer', 'consultation', 'scripts'], pinned: true, difficulty: null, estimatedMinutes: null, steps: [],
      createdBy: 'Jennifer Walsh', createdAt: '2026-03-01T10:00:00Z'
    },
    {
      id: 'kb-002', title: 'Top 10 Buyer Objections', category: 'Objection Handlers', type: 'article',
      content: '1. "We want to wait for prices to drop."\nResponse: "I understand the concern. Let me show you the local market data — in our area, prices have historically appreciated X% per year. Waiting could actually cost more in the long run. Plus, interest rates play a huge role in your monthly payment."\n\n2. "We found a home on Zillow — can we just go see it?"\nResponse: "Absolutely! I\'d love to show it to you. I can also pull up similar homes that might be an even better fit — sometimes the best deals aren\'t the most visible online."\n\n3. "Do we really need a buyer\'s agent?"\nResponse: "Great question. A buyer\'s agent is your advocate in the transaction — I negotiate on your behalf, handle inspections, coordinate with lenders, and protect your interests. My commission is typically paid by the seller, so my services come at no direct cost to you."\n\n4. "The home inspection found issues."\nResponse: "Every home has some findings. Let\'s review together — I\'ll help you distinguish between minor maintenance items and genuine concerns. We can negotiate repairs or credits with the seller."\n\n5. "We\'re not sure about this neighborhood."\nResponse: "Let me pull some data — crime stats, school ratings, walkability scores, and recent development plans. I can also connect you with residents in the area."',
      tags: ['buyer', 'objections', 'scripts'], pinned: true, difficulty: null, estimatedMinutes: null, steps: [],
      createdBy: 'Jennifer Walsh', createdAt: '2026-03-02T10:00:00Z'
    },
    {
      id: 'kb-003', title: 'New Listing SOP', category: 'SOPs & Processes', type: 'article',
      content: 'Step-by-Step New Listing Process:\n\n1. LISTING APPOINTMENT\n   - Run CMA and prepare listing presentation\n   - Review seller\'s disclosure\n   - Sign listing agreement\n   - Collect keys and access codes\n\n2. PRE-LISTING PREP (Days 1-3)\n   - Schedule professional photography\n   - Order sign installation\n   - Create property flyer\n   - Write MLS description\n   - Verify all property details (sqft, beds, baths, lot size)\n\n3. LAUNCH DAY\n   - Enter listing in MLS\n   - Publish to team website\n   - Share on social media\n   - Send to buyer leads database\n   - Email office announcement\n\n4. ACTIVE MARKETING (Ongoing)\n   - Weekly seller updates\n   - Track showings and feedback\n   - Adjust price strategy if needed\n   - Open house schedule (first 2 weekends minimum)\n\n5. UNDER CONTRACT\n   - Update MLS status\n   - Coordinate inspection, appraisal, surveys\n   - Monitor contingency deadlines\n   - Weekly buyer/seller updates\n\n6. CLOSING\n   - Final walkthrough\n   - Attend closing\n   - Deliver keys\n   - Request review/testimonial\n   - Add to past client drip campaign',
      tags: ['listing', 'SOP', 'process'], pinned: true, difficulty: null, estimatedMinutes: null, steps: [],
      createdBy: 'Jennifer Walsh', createdAt: '2026-03-03T10:00:00Z'
    },
    {
      id: 'kb-004', title: 'Welcome to the Team', category: 'Training Materials', type: 'training',
      difficulty: 'beginner', estimatedMinutes: 30,
      content: 'Welcome aboard! This training module will walk you through everything you need to know to get started with our team. Complete each step below to finish your onboarding.',
      tags: ['onboarding', 'new agent', 'training'], pinned: false,
      steps: [
        { title: 'Read the Team Handbook', type: 'Read', description: 'Review our team policies, commission structure, and expectations document.' },
        { title: 'Watch Office Tour Video', type: 'Watch', description: 'Watch the 10-minute video tour of our office, key contacts, and resources.' },
        { title: 'Set Up Your Profile', type: 'Do', description: 'Complete your agent profile in the system with your photo, bio, and contact info.' },
        { title: 'Review CRM Training', type: 'Read', description: 'Read through the CRM overview guide to understand how we track leads and clients.' },
        { title: 'Complete Onboarding Quiz', type: 'Quiz', description: 'Take the short quiz to confirm you understand our team processes and tools.' }
      ],
      createdBy: 'Jennifer Walsh', createdAt: '2026-03-04T10:00:00Z'
    },
    {
      id: 'kb-005', title: 'System Training', category: 'Training Materials', type: 'training',
      difficulty: 'beginner', estimatedMinutes: 60,
      content: 'Learn how to use every feature of the RE Back Office platform. This training covers the dashboard, pipeline, contacts, transactions, and marketing tools.',
      tags: ['system', 'training', 'platform'], pinned: false,
      steps: [
        { title: 'Dashboard Overview', type: 'Read', description: 'Learn how to read your dashboard stats, charts, and quick actions.' },
        { title: 'Pipeline Management', type: 'Watch', description: 'Watch the pipeline walkthrough video showing how to move deals through stages.' },
        { title: 'Add Your First Contact', type: 'Do', description: 'Practice adding a contact to the CRM with tags, notes, and lead source.' },
        { title: 'Create a Transaction', type: 'Do', description: 'Create a sample transaction and learn how to update status and add documents.' },
        { title: 'Marketing Tools Tour', type: 'Read', description: 'Review the drip campaigns, social planner, and email template features.' },
        { title: 'System Training Quiz', type: 'Quiz', description: 'Complete the system knowledge quiz to test your understanding.' }
      ],
      createdBy: 'Jennifer Walsh', createdAt: '2026-03-05T10:00:00Z'
    },
    {
      id: 'kb-006', title: 'Lead Generation Mastery', category: 'Training Materials', type: 'training',
      difficulty: 'intermediate', estimatedMinutes: 75,
      content: 'Master the art and science of lead generation. This advanced training covers prospecting strategies, follow-up systems, and conversion techniques used by top producers.',
      tags: ['leads', 'prospecting', 'advanced', 'training'], pinned: false,
      steps: [
        { title: 'The Lead Generation Mindset', type: 'Read', description: 'Read about the daily habits and mindset shifts that separate top producers from average agents.' },
        { title: 'Prospecting Methods Deep Dive', type: 'Watch', description: 'Watch the recorded training on sphere of influence, expired listings, FSBOs, and geographic farming.' },
        { title: 'Build Your Prospecting Schedule', type: 'Do', description: 'Create your personalized weekly prospecting schedule with time blocks for each lead source.' },
        { title: 'Script Practice Sessions', type: 'Do', description: 'Practice cold call and door knock scripts with a partner. Record yourself for review.' },
        { title: 'Lead Gen Mastery Assessment', type: 'Quiz', description: 'Complete the assessment covering lead sources, follow-up cadences, and conversion strategies.' }
      ],
      createdBy: 'Jennifer Walsh', createdAt: '2026-03-06T10:00:00Z'
    }
  ];

  // ---- Helpers ----
  function generateId() {
    return 'kb_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ---- Video embed helper ----
  function getVideoEmbed(url, width, height) {
    if (!url) return '';
    width = width || '100%';
    height = height || '400';
    var embedUrl = '';

    // YouTube
    var ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
    if (ytMatch) embedUrl = 'https://www.youtube.com/embed/' + ytMatch[1];

    // Vimeo
    var vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) embedUrl = 'https://player.vimeo.com/video/' + vimeoMatch[1];

    // Loom
    var loomMatch = url.match(/loom\.com\/share\/([\w-]+)/);
    if (loomMatch) embedUrl = 'https://www.loom.com/embed/' + loomMatch[1];

    // Google Drive video
    var driveMatch = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
    if (driveMatch) embedUrl = 'https://drive.google.com/file/d/' + driveMatch[1] + '/preview';

    if (embedUrl) {
      return '<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:10px;margin:12px 0;background:#000">' +
        '<iframe src="' + embedUrl + '" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none" allowfullscreen></iframe></div>';
    }

    // Fallback: just show as a link
    return '<div style="margin:12px 0"><a href="' + escapeHtml(url) + '" target="_blank" rel="noopener" style="color:var(--indigo);font-weight:600;text-decoration:none;display:inline-flex;align-items:center;gap:6px"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> Watch Video</a></div>';
  }

  // ---- Rich content renderer (simple markdown-like) ----
  function renderContent(text) {
    if (!text) return '';
    var html = escapeHtml(text);

    // Headers: lines starting with # ## ###
    html = html.replace(/^### (.+)$/gm, '<h4 style="font-size:1rem;font-weight:700;color:#1E293B;margin:16px 0 8px">$1</h4>');
    html = html.replace(/^## (.+)$/gm, '<h3 style="font-size:1.1rem;font-weight:700;color:#1E293B;margin:20px 0 8px">$1</h3>');
    html = html.replace(/^# (.+)$/gm, '<h2 style="font-size:1.25rem;font-weight:800;color:#1E293B;margin:24px 0 10px">$1</h2>');

    // Bold: **text**
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Italic: *text*
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Links: [text](url)
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:var(--indigo);text-decoration:underline">$1</a>');

    // Bullet lists: lines starting with - or *
    html = html.replace(/^[-*] (.+)$/gm, '<div style="display:flex;gap:8px;padding:2px 0"><span style="color:#94A3B8;flex-shrink:0">•</span><span>$1</span></div>');

    // Numbered lists: lines starting with 1. 2. etc
    html = html.replace(/^(\d+)\. (.+)$/gm, '<div style="display:flex;gap:8px;padding:2px 0"><span style="color:#94A3B8;flex-shrink:0;font-weight:600;min-width:20px">$1.</span><span>$2</span></div>');

    // Horizontal rule: ---
    html = html.replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #E2E8F0;margin:16px 0">');

    // Callout blocks: > text
    html = html.replace(/^&gt; (.+)$/gm, '<div style="border-left:3px solid var(--indigo);padding:8px 14px;background:#F8FAFC;border-radius:0 6px 6px 0;margin:8px 0;font-style:italic;color:#475569">$1</div>');

    // Video embeds: [video](url)
    html = html.replace(/\[video\]\((.+?)\)/g, function (m, url) { return getVideoEmbed(url); });

    // Preserve line breaks
    html = html.replace(/\n/g, '<br>');

    return html;
  }

  // ---- Data access ----
  function getItems() {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      if (typeof Auth !== 'undefined' && Auth.isDemo && Auth.isDemo()) {
        var seeded = SEED_DATA.map(function (item) { return item; });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
        return seeded;
      }
      return [];
    }
    try { return JSON.parse(raw); } catch (e) { return []; }
  }

  function saveItems(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function getProgress() {
    var session = Auth.getSession();
    if (!session) return {};
    var raw = localStorage.getItem(PROGRESS_KEY);
    var all = {};
    try { all = JSON.parse(raw) || {}; } catch (e) { all = {}; }
    return all[session.username] || {};
  }

  function saveProgress(progress) {
    var session = Auth.getSession();
    if (!session) return;
    var raw = localStorage.getItem(PROGRESS_KEY);
    var all = {};
    try { all = JSON.parse(raw) || {}; } catch (e) { all = {}; }
    all[session.username] = progress;
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
  }

  // ---- Badge helpers ----
  function categoryBadge(cat) {
    var c = CATEGORIES[cat] || { bg: '#F1F5F9', text: '#475569' };
    return '<span style="display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600;background:' + c.bg + ';color:' + c.text + ';">' + escapeHtml(cat) + '</span>';
  }

  function typeBadge(type) {
    if (type === 'training') {
      return '<span style="display:inline-block;padding:2px 10px;border-radius:999px;font-size:11px;font-weight:600;background:#DBEAFE;color:#1E40AF;">Training</span>';
    }
    return '<span style="display:inline-block;padding:2px 10px;border-radius:999px;font-size:11px;font-weight:600;background:#F1F5F9;color:#475569;">Article</span>';
  }

  function difficultyBadge(diff) {
    if (!diff) return '';
    var d = DIFFICULTY_COLORS[diff] || DIFFICULTY_COLORS['beginner'];
    return '<span style="display:inline-block;padding:2px 10px;border-radius:999px;font-size:11px;font-weight:600;background:' + d.bg + ';color:' + d.text + ';">' + diff.charAt(0).toUpperCase() + diff.slice(1) + '</span>';
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

  // ---- Completion rate calculation ----
  function getCompletionRate() {
    var items = getItems();
    var trainings = items.filter(function (i) { return i.type === 'training' && i.steps && i.steps.length > 0; });
    if (trainings.length === 0) return 0;
    var progress = getProgress();
    var totalSteps = 0;
    var completedSteps = 0;
    trainings.forEach(function (t) {
      totalSteps += t.steps.length;
      var p = progress[t.id] || [];
      completedSteps += p.length;
    });
    return totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  }

  // ---- Render list view ----
  function renderList() {
    var items = getItems();

    // Stats
    var total = items.length;
    var trainingCount = items.filter(function (i) { return i.type === 'training'; }).length;
    var pinnedCount = items.filter(function (i) { return i.pinned; }).length;
    var completionRate = getCompletionRate();

    // Filter by category
    var filtered = items;
    if (currentFilter !== 'All') {
      filtered = items.filter(function (i) { return i.category === currentFilter; });
    }

    // Filter by search
    if (searchQuery) {
      var q = searchQuery.toLowerCase();
      filtered = filtered.filter(function (i) {
        return (i.title && i.title.toLowerCase().indexOf(q) !== -1) ||
               (i.category && i.category.toLowerCase().indexOf(q) !== -1) ||
               (i.tags && i.tags.join(' ').toLowerCase().indexOf(q) !== -1) ||
               (i.content && i.content.toLowerCase().indexOf(q) !== -1);
      });
    }

    // Get active categories
    var activeCats = {};
    items.forEach(function (i) { if (i.category) activeCats[i.category] = true; });
    var activeCatKeys = Object.keys(activeCats).sort();

    var html = '';

    // Header
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;">';
    html += '<h2 style="margin:0;font-size:22px;font-weight:700;">Knowledge Base</h2>';
    if (Auth.isPrivileged()) {
      html += '<button class="btn btn-primary" data-action="add-resource" style="display:inline-flex;align-items:center;gap:6px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg> Add Resource</button>';
    }
    html += '</div>';

    // Stat cards
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;margin-bottom:24px;">';
    html += statCard('Total Resources', total, '#3484D0', '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/></svg>');
    html += statCard('Training Modules', trainingCount, '#7C3AED', '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>');
    html += statCard('Pinned', pinnedCount, '#F59E0B', '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M17 4v7l2 3v2h-6v5l-1 1-1-1v-5H5v-2l2-3V4c0-1.1.9-2 2-2h6c1.1 0 2 .9 2 2z"/></svg>');
    html += statCard('Completion Rate', completionRate + '%', '#10B981', '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>');
    html += '</div>';

    // Search bar
    html += '<div style="margin-bottom:16px;">';
    html += '<input type="text" id="kbSearch" class="form-control" placeholder="Search resources by title, category, or tags..." value="' + escapeHtml(searchQuery) + '" style="max-width:400px;">';
    html += '</div>';

    // Filter tabs
    html += '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px;">';
    html += '<button class="lb-filter-btn' + (currentFilter === 'All' ? ' active' : '') + '" data-action="filter" data-filter="All">All</button>';
    activeCatKeys.forEach(function (cat) {
      html += '<button class="lb-filter-btn' + (currentFilter === cat ? ' active' : '') + '" data-action="filter" data-filter="' + escapeHtml(cat) + '">' + escapeHtml(cat) + '</button>';
    });
    html += '</div>';

    // Card grid
    if (filtered.length === 0) {
      html += '<div style="text-align:center;padding:60px 20px;color:#94A3B8;">';
      html += '<svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor" style="opacity:0.3;margin-bottom:12px;"><path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/></svg>';
      html += '<p style="font-size:16px;margin:0;">No resources found.</p>';
      html += '</div>';
    } else {
      // Sort: pinned first, then by createdAt desc
      filtered.sort(function (a, b) {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;">';
      var progress = getProgress();
      filtered.forEach(function (item) {
        var c = CATEGORIES[item.category] || { bg: '#F1F5F9', text: '#475569' };
        html += '<div class="lb-card" style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);overflow:hidden;border:1px solid #E2E8F0;cursor:pointer;transition:box-shadow 0.2s;" data-action="view-item" data-id="' + item.id + '">';
        // Color bar
        html += '<div style="height:4px;background:' + c.text + ';"></div>';
        html += '<div style="padding:16px;">';
        // Top row: category badge + pin icon
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">';
        html += categoryBadge(item.category);
        if (item.pinned) {
          html += '<svg width="16" height="16" viewBox="0 0 24 24" fill="#F59E0B"><path d="M17 4v7l2 3v2h-6v5l-1 1-1-1v-5H5v-2l2-3V4c0-1.1.9-2 2-2h6c1.1 0 2 .9 2 2z"/></svg>';
        }
        html += '</div>';
        // Title
        html += '<div style="font-weight:700;font-size:16px;color:#1E293B;margin-bottom:8px;">' + escapeHtml(item.title) + '</div>';
        // Badges row
        html += '<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:10px;">';
        html += typeBadge(item.type);
        if (item.type === 'training' && item.difficulty) {
          html += difficultyBadge(item.difficulty);
        }
        if (item.estimatedMinutes) {
          html += '<span style="font-size:12px;color:#64748B;">' + item.estimatedMinutes + ' min</span>';
        }
        html += '</div>';
        // Training progress bar
        if (item.type === 'training' && item.steps && item.steps.length > 0) {
          var p = progress[item.id] || [];
          var pct = Math.round((p.length / item.steps.length) * 100);
          html += '<div style="margin-bottom:8px;">';
          html += '<div style="display:flex;justify-content:space-between;font-size:11px;color:#64748B;margin-bottom:4px;"><span>' + p.length + ' / ' + item.steps.length + ' steps</span><span>' + pct + '%</span></div>';
          html += '<div style="background:#E2E8F0;border-radius:999px;height:6px;overflow:hidden;"><div style="background:#10B981;height:100%;border-radius:999px;width:' + pct + '%;transition:width 0.3s;"></div></div>';
          html += '</div>';
        }
        // Tags
        if (item.tags && item.tags.length > 0) {
          html += '<div style="display:flex;flex-wrap:wrap;gap:4px;">';
          item.tags.forEach(function (tag) {
            html += '<span style="display:inline-block;padding:1px 8px;border-radius:999px;font-size:11px;background:#F1F5F9;color:#64748B;">' + escapeHtml(tag) + '</span>';
          });
          html += '</div>';
        }
        html += '</div></div>';
      });
      html += '</div>';
    }

    pageBody.innerHTML = html;

    // Search listener
    var searchInput = document.getElementById('kbSearch');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        searchQuery = this.value;
        renderList();
      });
    }
  }

  // ---- Render detail view ----
  function renderDetail(id) {
    var items = getItems();
    var item = null;
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) { item = items[i]; break; }
    }
    if (!item) { currentView = 'list'; renderList(); return; }

    var progress = getProgress();
    var completedSteps = progress[item.id] || [];

    var html = '';

    // Back button
    html += '<div style="margin-bottom:20px;">';
    html += '<button class="btn btn-outline btn-sm" data-action="back-to-list" style="display:inline-flex;align-items:center;gap:6px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> Back to Knowledge Base</button>';
    html += '</div>';

    // Header card
    html += '<div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);border:1px solid #E2E8F0;padding:24px;margin-bottom:20px;">';
    html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:16px;">';
    html += '<div>';
    html += '<h2 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:#1E293B;">' + escapeHtml(item.title) + '</h2>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">';
    html += categoryBadge(item.category);
    html += typeBadge(item.type);
    if (item.type === 'training' && item.difficulty) {
      html += difficultyBadge(item.difficulty);
    }
    if (item.estimatedMinutes) {
      html += '<span style="font-size:13px;color:#64748B;">' + item.estimatedMinutes + ' min</span>';
    }
    html += '</div>';
    html += '</div>';
    // Actions
    if (Auth.isPrivileged()) {
      html += '<div style="display:flex;gap:8px;">';
      html += '<button class="btn btn-outline btn-sm" data-action="edit-resource" data-id="' + item.id + '">Edit</button>';
      html += '<button class="btn btn-outline btn-sm" style="color:#DC2626;border-color:#FECACA;" data-action="delete-resource" data-id="' + item.id + '">Delete</button>';
      html += '</div>';
    }
    html += '</div>';

    // Tags
    if (item.tags && item.tags.length > 0) {
      html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;">';
      item.tags.forEach(function (tag) {
        html += '<span style="display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;background:#F1F5F9;color:#64748B;">' + escapeHtml(tag) + '</span>';
      });
      html += '</div>';
    }

    // Video embed (if item has a video URL)
    if (item.videoUrl) {
      html += getVideoEmbed(item.videoUrl);
    }

    // Content with rich rendering
    html += '<div style="line-height:1.7;color:#334155;font-size:14px;">' + renderContent(item.content) + '</div>';
    html += '</div>';

    // Training steps
    if (item.type === 'training' && item.steps && item.steps.length > 0) {
      var pct = item.steps.length > 0 ? Math.round((completedSteps.length / item.steps.length) * 100) : 0;

      html += '<div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);border:1px solid #E2E8F0;padding:24px;">';
      html += '<h3 style="margin:0 0 16px 0;font-size:18px;font-weight:700;color:#1E293B;">Training Steps</h3>';

      // Progress bar
      html += '<div style="margin-bottom:20px;">';
      html += '<div style="display:flex;justify-content:space-between;font-size:13px;color:#64748B;margin-bottom:6px;"><span>' + completedSteps.length + ' of ' + item.steps.length + ' completed</span><span>' + pct + '%</span></div>';
      html += '<div style="background:#E2E8F0;border-radius:999px;height:8px;overflow:hidden;"><div style="background:#10B981;height:100%;border-radius:999px;width:' + pct + '%;transition:width 0.3s;"></div></div>';
      html += '</div>';

      // Steps list
      item.steps.forEach(function (step, idx) {
        var isCompleted = completedSteps.indexOf(idx) !== -1;
        var stepIcon = STEP_ICONS[step.type] || STEP_ICONS['Read'];
        var stepTypeColor = step.type === 'Quiz' ? '#7C3AED' : step.type === 'Watch' ? '#2563EB' : step.type === 'Do' ? '#059669' : '#475569';

        html += '<div style="display:flex;align-items:flex-start;gap:12px;padding:14px;border-radius:10px;border:1px solid ' + (isCompleted ? '#BBF7D0' : '#E2E8F0') + ';background:' + (isCompleted ? '#F0FDF4' : '#fff') + ';margin-bottom:10px;">';
        // Checkbox
        html += '<label style="display:flex;align-items:center;cursor:pointer;flex-shrink:0;margin-top:2px;">';
        html += '<input type="checkbox" ' + (isCompleted ? 'checked' : '') + ' data-action="toggle-step" data-item-id="' + item.id + '" data-step-idx="' + idx + '" style="width:18px;height:18px;cursor:pointer;accent-color:#10B981;">';
        html += '</label>';
        // Step content
        html += '<div style="flex:1;min-width:0;">';
        html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">';
        html += '<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;background:' + stepTypeColor + '15;color:' + stepTypeColor + ';">' + stepIcon + ' ' + escapeHtml(step.type) + '</span>';
        html += '<span style="font-weight:600;font-size:14px;color:' + (isCompleted ? '#64748B' : '#1E293B') + ';' + (isCompleted ? 'text-decoration:line-through;' : '') + '">' + escapeHtml(step.title) + '</span>';
        html += '</div>';
        if (step.description) {
          html += '<div style="font-size:13px;color:#64748B;line-height:1.5;">' + renderContent(step.description) + '</div>';
        }
        if (step.videoUrl) {
          html += getVideoEmbed(step.videoUrl, '100%', '280');
        }
        html += '</div></div>';
      });

      html += '</div>';
    }

    // Created by / date
    html += '<div style="margin-top:16px;font-size:12px;color:#94A3B8;">Created by ' + escapeHtml(item.createdBy || 'Unknown') + ' on ' + Data.formatDate(item.createdAt) + '</div>';

    pageBody.innerHTML = html;
  }

  // ---- Render form view ----
  function renderForm(id) {
    var items = getItems();
    var item = null;
    if (id) {
      for (var i = 0; i < items.length; i++) {
        if (items[i].id === id) { item = items[i]; break; }
      }
    }
    var isEdit = !!item;
    var v = item || { type: 'article', category: '', difficulty: 'beginner', tags: [], steps: [], pinned: false };

    var html = '';

    // Back button
    html += '<div style="margin-bottom:20px;">';
    html += '<button class="btn btn-outline btn-sm" data-action="back-to-list" style="display:inline-flex;align-items:center;gap:6px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> Back</button>';
    html += '</div>';

    html += '<div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);border:1px solid #E2E8F0;padding:24px;max-width:720px;">';
    html += '<h2 style="margin:0 0 20px 0;font-size:22px;font-weight:700;color:#1E293B;">' + (isEdit ? 'Edit Resource' : 'Add Resource') + '</h2>';

    // Title
    html += '<div class="form-group"><label>Title *</label><input type="text" id="kbTitle" class="form-control" value="' + escapeHtml(v.title || '') + '" placeholder="Resource title"></div>';

    // Row: Category + Type
    html += '<div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">';
    var catOpts = CATEGORY_KEYS.map(function (cat) {
      var sel = v.category === cat ? ' selected' : '';
      return '<option value="' + escapeHtml(cat) + '"' + sel + '>' + escapeHtml(cat) + '</option>';
    }).join('');
    html += '<div class="form-group"><label>Category *</label><select id="kbCategory" class="form-control"><option value="">Select category</option>' + catOpts + '</select></div>';
    html += '<div class="form-group"><label>Type *</label><select id="kbType" class="form-control"><option value="article"' + (v.type === 'article' ? ' selected' : '') + '>Article</option><option value="training"' + (v.type === 'training' ? ' selected' : '') + '>Training</option></select></div>';
    html += '</div>';

    // Row: Difficulty + Estimated Time (shown for training)
    html += '<div id="trainingFields" style="' + (v.type === 'training' ? '' : 'display:none;') + '">';
    html += '<div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">';
    html += '<div class="form-group"><label>Difficulty</label><select id="kbDifficulty" class="form-control"><option value="beginner"' + (v.difficulty === 'beginner' ? ' selected' : '') + '>Beginner</option><option value="intermediate"' + (v.difficulty === 'intermediate' ? ' selected' : '') + '>Intermediate</option><option value="advanced"' + (v.difficulty === 'advanced' ? ' selected' : '') + '>Advanced</option></select></div>';
    html += '<div class="form-group"><label>Estimated Minutes</label><input type="number" id="kbMinutes" class="form-control" value="' + (v.estimatedMinutes || '') + '" placeholder="e.g. 30"></div>';
    html += '</div>';
    html += '</div>';

    // Video URL
    html += '<div class="form-group"><label>Video URL (optional)</label><input type="text" id="kbVideoUrl" class="form-control" value="' + escapeHtml(v.videoUrl || '') + '" placeholder="YouTube, Vimeo, or Loom URL"></div>';
    html += '<div style="font-size:.72rem;color:#94A3B8;margin:-8px 0 12px">Supports YouTube, Vimeo, Loom, and Google Drive video links. Video will display at the top of the article.</div>';

    // Content
    html += '<div class="form-group"><label>Content *</label><textarea id="kbContent" class="form-control" rows="12" placeholder="Write your content here...\n\nFormatting tips:\n# Heading 1\n## Heading 2\n### Heading 3\n**bold text**\n*italic text*\n- bullet point\n1. numbered list\n> callout block\n[link text](url)\n[video](youtube-url)\n--- horizontal line">' + escapeHtml(v.content || '') + '</textarea></div>';
    html += '<div style="font-size:.72rem;color:#94A3B8;margin:-8px 0 12px">Use # for headers, **bold**, *italic*, - for bullets, > for callouts, [video](url) to embed videos inline</div>';

    // Tags
    html += '<div class="form-group"><label>Tags (comma-separated)</label><input type="text" id="kbTags" class="form-control" value="' + escapeHtml((v.tags || []).join(', ')) + '" placeholder="e.g. buyer, scripts, onboarding"></div>';

    // Pinned toggle
    html += '<div class="form-group" style="display:flex;align-items:center;gap:10px;">';
    html += '<label style="margin:0;cursor:pointer;display:flex;align-items:center;gap:8px;"><input type="checkbox" id="kbPinned" ' + (v.pinned ? 'checked' : '') + ' style="width:18px;height:18px;cursor:pointer;"> Pin this resource</label>';
    html += '</div>';

    // Training steps section
    html += '<div id="stepsSection" style="' + (v.type === 'training' ? '' : 'display:none;') + 'margin-top:20px;padding-top:20px;border-top:1px solid #E2E8F0;">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">';
    html += '<h3 style="margin:0;font-size:16px;font-weight:700;">Training Steps</h3>';
    html += '<button class="btn btn-outline btn-sm" data-action="add-step" type="button">+ Add Step</button>';
    html += '</div>';
    html += '<div id="stepsList">';
    if (v.steps && v.steps.length > 0) {
      v.steps.forEach(function (step, idx) {
        html += stepRowHtml(idx, step);
      });
    }
    html += '</div>';
    html += '</div>';

    // Save button
    html += '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">';
    html += '<button class="btn btn-outline" data-action="back-to-list">Cancel</button>';
    html += '<button class="btn btn-primary" data-action="save-resource" data-id="' + (v.id || '') + '">' + (isEdit ? 'Update' : 'Add Resource') + '</button>';
    html += '</div>';

    html += '</div>';

    pageBody.innerHTML = html;

    // Toggle training fields on type change
    var typeSelect = document.getElementById('kbType');
    if (typeSelect) {
      typeSelect.addEventListener('change', function () {
        var isTraining = this.value === 'training';
        document.getElementById('trainingFields').style.display = isTraining ? '' : 'none';
        document.getElementById('stepsSection').style.display = isTraining ? '' : 'none';
      });
    }
  }

  function stepRowHtml(idx, step) {
    step = step || { title: '', type: 'Read', description: '' };
    var typeOpts = STEP_TYPES.map(function (t) {
      return '<option value="' + t + '"' + (step.type === t ? ' selected' : '') + '>' + t + '</option>';
    }).join('');

    var html = '<div class="step-row" data-step-idx="' + idx + '" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:12px;margin-bottom:10px;">';
    html += '<div class="form-row" style="display:grid;grid-template-columns:1fr 120px auto;gap:10px;align-items:start;">';
    html += '<div class="form-group" style="margin:0;"><input type="text" class="form-control step-title" value="' + escapeHtml(step.title) + '" placeholder="Step title"></div>';
    html += '<div class="form-group" style="margin:0;"><select class="form-control step-type">' + typeOpts + '</select></div>';
    html += '<button class="btn btn-outline btn-sm" data-action="remove-step" data-step-idx="' + idx + '" style="color:#DC2626;border-color:#FECACA;padding:6px 10px;" type="button">&times;</button>';
    html += '</div>';
    html += '<div class="form-group" style="margin:8px 0 0 0;"><textarea class="form-control step-desc" rows="2" placeholder="Step description (supports formatting)...">' + escapeHtml(step.description || '') + '</textarea></div>';
    html += '<div class="form-group" style="margin:6px 0 0 0;"><input type="text" class="form-control step-video" value="' + escapeHtml(step.videoUrl || '') + '" placeholder="Video URL for this step (optional)"></div>';
    html += '</div>';
    return html;
  }

  var stepCounter = 0;

  function addStepRow() {
    var stepsList = document.getElementById('stepsList');
    if (!stepsList) return;
    var idx = stepsList.children.length;
    var div = document.createElement('div');
    div.innerHTML = stepRowHtml(idx, null);
    stepsList.appendChild(div.firstChild);
  }

  function removeStepRow(idx) {
    var stepsList = document.getElementById('stepsList');
    if (!stepsList) return;
    var rows = stepsList.querySelectorAll('.step-row');
    if (rows[idx]) {
      stepsList.removeChild(rows[idx]);
    }
    // Re-index
    var remaining = stepsList.querySelectorAll('.step-row');
    for (var i = 0; i < remaining.length; i++) {
      remaining[i].setAttribute('data-step-idx', i);
      var removeBtn = remaining[i].querySelector('[data-action="remove-step"]');
      if (removeBtn) removeBtn.setAttribute('data-step-idx', i);
    }
  }

  function collectSteps() {
    var stepsList = document.getElementById('stepsList');
    if (!stepsList) return [];
    var rows = stepsList.querySelectorAll('.step-row');
    var steps = [];
    for (var i = 0; i < rows.length; i++) {
      var titleInput = rows[i].querySelector('.step-title');
      var typeSelect = rows[i].querySelector('.step-type');
      var descInput = rows[i].querySelector('.step-desc');
      var videoInput = rows[i].querySelector('.step-video');
      if (titleInput && titleInput.value.trim()) {
        steps.push({
          title: titleInput.value.trim(),
          type: typeSelect ? typeSelect.value : 'Read',
          description: descInput ? descInput.value.trim() : '',
          videoUrl: videoInput ? videoInput.value.trim() : ''
        });
      }
    }
    return steps;
  }

  // ---- Save resource ----
  function saveResource(id) {
    var title = document.getElementById('kbTitle').value.trim();
    var category = document.getElementById('kbCategory').value;
    var type = document.getElementById('kbType').value;
    var content = document.getElementById('kbContent').value.trim();
    var tagsRaw = document.getElementById('kbTags').value.trim();
    var pinned = document.getElementById('kbPinned').checked;

    if (!title) { showToast('Title is required.', 'error'); return; }
    if (!category) { showToast('Please select a category.', 'error'); return; }
    if (!content) { showToast('Content is required.', 'error'); return; }

    var tags = tagsRaw ? tagsRaw.split(',').map(function (t) { return t.trim(); }).filter(function (t) { return t; }) : [];
    var videoUrl = document.getElementById('kbVideoUrl').value.trim();

    var difficulty = null;
    var estimatedMinutes = null;
    var steps = [];
    if (type === 'training') {
      difficulty = document.getElementById('kbDifficulty').value;
      var minVal = document.getElementById('kbMinutes').value;
      estimatedMinutes = minVal ? parseInt(minVal, 10) : null;
      steps = collectSteps();
    }

    var session = Auth.getSession();
    var items = getItems();

    if (id) {
      items = items.map(function (item) {
        if (item.id === id) {
          item.title = title;
          item.category = category;
          item.type = type;
          item.content = content;
          item.tags = tags;
          item.pinned = pinned;
          item.videoUrl = videoUrl;
          item.difficulty = difficulty;
          item.estimatedMinutes = estimatedMinutes;
          item.steps = steps;
        }
        return item;
      });
      showToast('Resource updated successfully.');
    } else {
      items.push({
        id: generateId(),
        title: title,
        category: category,
        type: type,
        content: content,
        tags: tags,
        pinned: pinned,
        videoUrl: videoUrl,
        difficulty: difficulty,
        estimatedMinutes: estimatedMinutes,
        steps: steps,
        createdBy: session ? session.displayName : 'Unknown',
        createdAt: new Date().toISOString()
      });
      showToast('Resource added successfully.');
    }

    saveItems(items);
    currentView = 'list';
    renderList();
  }

  // ---- Delete resource ----
  function deleteResource(id) {
    if (!confirm('Delete this resource?')) return;
    var items = getItems().filter(function (i) { return i.id !== id; });
    saveItems(items);
    showToast('Resource deleted.');
    currentView = 'list';
    renderList();
  }

  // ---- Toggle training step ----
  function toggleStep(itemId, stepIdx) {
    var progress = getProgress();
    var completed = progress[itemId] || [];
    stepIdx = parseInt(stepIdx, 10);

    var pos = completed.indexOf(stepIdx);
    if (pos === -1) {
      completed.push(stepIdx);
    } else {
      completed.splice(pos, 1);
    }

    progress[itemId] = completed;
    saveProgress(progress);

    // Check if all steps completed
    var items = getItems();
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === itemId && items[i].steps) {
        if (completed.length === items[i].steps.length) {
          showToast('Training completed! Great job!');
        }
        break;
      }
    }

    renderDetail(itemId);
  }

  // ---- Event delegation ----
  document.addEventListener('click', function (e) {
    var target = e.target.closest('[data-action]');
    if (!target) return;
    var action = target.getAttribute('data-action');

    if (action === 'filter') {
      currentFilter = target.getAttribute('data-filter');
      renderList();
    } else if (action === 'view-item') {
      viewingId = target.getAttribute('data-id');
      currentView = 'detail';
      renderDetail(viewingId);
    } else if (action === 'back-to-list') {
      currentView = 'list';
      editingId = null;
      viewingId = null;
      renderList();
    } else if (action === 'add-resource') {
      editingId = null;
      currentView = 'form';
      renderForm(null);
    } else if (action === 'edit-resource') {
      editingId = target.getAttribute('data-id');
      currentView = 'form';
      renderForm(editingId);
    } else if (action === 'delete-resource') {
      deleteResource(target.getAttribute('data-id'));
    } else if (action === 'save-resource') {
      saveResource(target.getAttribute('data-id'));
    } else if (action === 'add-step') {
      addStepRow();
    } else if (action === 'remove-step') {
      removeStepRow(parseInt(target.getAttribute('data-step-idx'), 10));
    }
  });

  // Handle checkbox changes for training steps
  document.addEventListener('change', function (e) {
    var target = e.target.closest('[data-action="toggle-step"]');
    if (!target) return;
    var itemId = target.getAttribute('data-item-id');
    var stepIdx = target.getAttribute('data-step-idx');
    toggleStep(itemId, stepIdx);
  });

  // ---- Init ----
  renderList();

})();
