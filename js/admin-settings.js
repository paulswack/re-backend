/* ============================================================
   RE Back Office — Team Customization / Admin Settings
   ============================================================ */

(function () {
  'use strict';

  Auth.requireAuth();
  populateSidebarUser();
  setActiveNav();
  initSidebarToggle();

  document.getElementById('logoutBtn').addEventListener('click', function () {
    Auth.logout();
  });

  // ---- Access Control: Team Lead only ----
  if (!Auth.isPrivileged()) {
    document.querySelector('.page-body').innerHTML =
      '<div class="as-access-denied">' +
        '<svg viewBox="0 0 24 24" width="48" height="48" fill="var(--gray-200)"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>' +
        '<h3>Access Restricted</h3>' +
        '<p>Only Team Leads can access Team Customization settings.</p>' +
        '<a href="dashboard.html" class="btn btn-outline btn-sm">Back to Dashboard</a>' +
      '</div>';
    return;
  }

  var PREFIX = 'reb_';
  var SETTINGS_KEY = PREFIX + 'admin_settings';

  // ---- Default Settings ----
  var DEFAULTS = {
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
      ],
      defaultCloseTimeline: 30,
      requiredFields: {
        address: true,
        price: true,
        agent: true,
        status: true,
        closeDate: false,
        notes: false
      }
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
      ],
      defaultFields: {
        beds: true,
        baths: true,
        sqft: true,
        description: true,
        listingDate: true
      }
    },
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
    ],
    teamRoles: {
      roles: [
        { key: 'Team Lead', canSeeTaxCenter: true, canDeleteTransactions: true, canSharePortal: true },
        { key: 'Senior Agent', canSeeTaxCenter: true, canDeleteTransactions: false, canSharePortal: true },
        { key: "Buyer's Agent", canSeeTaxCenter: true, canDeleteTransactions: false, canSharePortal: true },
        { key: 'Assistant', canSeeTaxCenter: false, canDeleteTransactions: false, canSharePortal: false }
      ]
    },
    leaderboard: {
      showClosings: true,
      showVolume: true,
      showListings: true,
      defaultPeriod: 'ytd',
      visibleToAll: true
    },
    clientPortal: {
      portalTeamName: '',
      portalAccentColor: '#6366F1',
      showProgressStepper: true,
      showBuyerSellerInfo: true,
      showNotes: true,
      showAppointments: true,
      showDocuments: true,
      autoExpireDays: 90
    },
    goals: {
      defaultClosingsGoal: 8,
      defaultVolumeGoal: 2000000,
      goalsVisibleToAll: false
    },
    announcements: []
  };

  // ---- Load / Save ----
  function loadSettings() {
    var raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return JSON.parse(JSON.stringify(DEFAULTS));
    try {
      var saved = JSON.parse(raw);
      // Merge with defaults for any missing keys
      var merged = JSON.parse(JSON.stringify(DEFAULTS));
      Object.keys(saved).forEach(function (k) {
        if (typeof saved[k] === 'object' && !Array.isArray(saved[k]) && saved[k] !== null && merged[k] && typeof merged[k] === 'object' && !Array.isArray(merged[k])) {
          Object.assign(merged[k], saved[k]);
        } else {
          merged[k] = saved[k];
        }
      });
      return merged;
    } catch (e) {
      return JSON.parse(JSON.stringify(DEFAULTS));
    }
  }

  function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    showToast('Settings saved');
  }

  var settings = loadSettings();

  // Load announcements from their own store
  function loadAnnouncements() {
    return JSON.parse(localStorage.getItem(PREFIX + 'announcements') || '[]');
  }

  function saveAnnouncements(anns) {
    localStorage.setItem(PREFIX + 'announcements', JSON.stringify(anns));
  }

  // ---- Tab definitions ----
  var TABS = [
    { key: 'general', label: 'General', icon: '<path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 00-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1112 8.4a3.6 3.6 0 010 7.2z"/>' },
    { key: 'transactions', label: 'Transaction Settings', icon: '<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/>' },
    { key: 'listings', label: 'Listing Settings', icon: '<path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>' },
    { key: 'expenses', label: 'Expense Categories', icon: '<path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>' },
    { key: 'teamRoles', label: 'Team & Roles', icon: '<path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>' },
    { key: 'leaderboard', label: 'Leaderboard Settings', icon: '<path d="M7.5 21H2V9h5.5v12zm7.25-18h-5.5v18h5.5V3zM22 11h-5.5v10H22V11z"/>' },
    { key: 'clientPortal', label: 'Client Portal', icon: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>' },
    { key: 'goals', label: 'Goals', icon: '<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>' },
    { key: 'announcements', label: 'Announcements', icon: '<path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>' }
  ];

  var activeTab = 'general';

  // ---- Render ----
  function render() {
    var body = document.querySelector('.page-body');
    var h = '<div class="as-layout">';

    // LEFT: Tabs
    h += '<div class="as-tabs">';
    h += '<div class="as-tabs-header">Settings</div>';
    TABS.forEach(function (tab) {
      h += '<button class="as-tab' + (activeTab === tab.key ? ' active' : '') + '" data-action="switch-tab" data-tab="' + tab.key + '">' +
        '<svg viewBox="0 0 24 24">' + tab.icon + '</svg>' +
        '<span>' + tab.label + '</span>' +
      '</button>';
    });
    h += '</div>';

    // RIGHT: Content
    h += '<div class="as-content">';
    h += renderTabContent(activeTab);
    h += '</div>';

    h += '</div>';
    body.innerHTML = h;
  }

  function renderTabContent(tab) {
    switch (tab) {
      case 'general': return renderGeneral();
      case 'transactions': return renderTransactions();
      case 'listings': return renderListings();
      case 'expenses': return renderExpenses();
      case 'teamRoles': return renderTeamRoles();
      case 'leaderboard': return renderLeaderboard();
      case 'clientPortal': return renderClientPortal();
      case 'goals': return renderGoals();
      case 'announcements': return renderAnnouncements();
      default: return '';
    }
  }

  // ---- General ----
  function renderGeneral() {
    var g = settings.general;
    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var h = '<div class="as-section">';
    h += '<div class="as-section-header"><h2>General Settings</h2><p>Core team and financial configuration</p></div>';

    h += '<div class="as-card">';
    h += '<div class="as-card-title">Team Information</div>';
    h += '<div class="form-group"><label>Team / Brokerage Name</label><input type="text" id="as-teamName" value="' + escHtml(g.teamName || '') + '" data-action="save-general" data-field="teamName"></div>';
    h += '</div>';

    h += '<div class="as-card">';
    h += '<div class="as-card-title">Financial Defaults</div>';
    h += '<div class="form-row">';
    h += '<div class="form-group"><label>Default Commission Rate (%)</label><input type="number" id="as-commRate" value="' + (g.defaultCommissionRate * 100) + '" min="0" max="100" step="0.1" data-action="save-general" data-field="defaultCommissionRate"></div>';
    h += '<div class="form-group"><label>Default Agent Split (%)</label><input type="number" id="as-agentSplit" value="' + (g.defaultAgentSplit * 100) + '" min="0" max="100" step="1" data-action="save-general" data-field="defaultAgentSplit"></div>';
    h += '</div>';
    h += '<div class="form-row">';
    h += '<div class="form-group"><label>Estimated Tax Rate (%)</label><input type="number" id="as-taxRate" value="' + (g.estimatedTaxRate * 100) + '" min="0" max="100" step="1" data-action="save-general" data-field="estimatedTaxRate"></div>';
    h += '<div class="form-group"><label>Fiscal Year Start Month</label><select id="as-fiscalMonth" data-action="save-general" data-field="fiscalYearStartMonth">';
    months.forEach(function (m, i) {
      h += '<option value="' + (i + 1) + '"' + (g.fiscalYearStartMonth === (i + 1) ? ' selected' : '') + '>' + m + '</option>';
    });
    h += '</select></div>';
    h += '</div>';
    h += '</div>';

    h += '</div>';
    return h;
  }

  // ---- Transaction Settings ----
  function renderTransactions() {
    var t = settings.transactions;
    var h = '<div class="as-section">';
    h += '<div class="as-section-header"><h2>Transaction Settings</h2><p>Configure transaction statuses and required fields</p></div>';

    h += '<div class="as-card">';
    h += '<div class="as-card-title">Transaction Statuses</div>';
    h += '<div class="as-card-subtitle">Manage available status options for transactions</div>';
    t.statuses.forEach(function (s, i) {
      h += '<div class="as-list-item">' +
        '<input type="color" class="as-color-input" value="' + s.color + '" data-action="update-txn-status-color" data-index="' + i + '">' +
        '<input type="text" class="as-inline-input" value="' + escHtml(s.label) + '" data-action="update-txn-status-label" data-index="' + i + '">' +
        '<button class="as-remove-btn" data-action="remove-txn-status" data-index="' + i + '" title="Remove">&times;</button>' +
      '</div>';
    });
    h += '<button class="as-add-btn" data-action="add-txn-status"><svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>Add Status</button>';
    h += '</div>';

    h += '<div class="as-card">';
    h += '<div class="as-card-title">Default Close Timeline</div>';
    h += '<div class="form-group"><label>Days from contract to close</label><input type="number" id="as-closeTimeline" value="' + (t.defaultCloseTimeline || 30) + '" min="1" max="365" data-action="save-txn-timeline"></div>';
    h += '</div>';

    h += '<div class="as-card">';
    h += '<div class="as-card-title">Required Fields</div>';
    h += '<div class="as-card-subtitle">Toggle which fields are mandatory when creating a transaction</div>';
    var reqFields = [
      { key: 'address', label: 'Address' },
      { key: 'price', label: 'Price' },
      { key: 'agent', label: 'Agent' },
      { key: 'status', label: 'Status' },
      { key: 'closeDate', label: 'Close Date' },
      { key: 'notes', label: 'Notes' }
    ];
    reqFields.forEach(function (f) {
      var checked = t.requiredFields[f.key] !== false;
      h += toggleRow(f.label, checked, 'toggle-txn-field', f.key);
    });
    h += '</div>';

    h += '</div>';
    return h;
  }

  // ---- Listing Settings ----
  function renderListings() {
    var l = settings.listings;
    var h = '<div class="as-section">';
    h += '<div class="as-section-header"><h2>Listing Settings</h2><p>Configure listing statuses, property types, and fields</p></div>';

    h += '<div class="as-card">';
    h += '<div class="as-card-title">Listing Statuses</div>';
    l.statuses.forEach(function (s, i) {
      h += '<div class="as-list-item">' +
        '<input type="color" class="as-color-input" value="' + s.color + '" data-action="update-lst-status-color" data-index="' + i + '">' +
        '<input type="text" class="as-inline-input" value="' + escHtml(s.label) + '" data-action="update-lst-status-label" data-index="' + i + '">' +
        '<button class="as-remove-btn" data-action="remove-lst-status" data-index="' + i + '" title="Remove">&times;</button>' +
      '</div>';
    });
    h += '<button class="as-add-btn" data-action="add-lst-status"><svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>Add Status</button>';
    h += '</div>';

    h += '<div class="as-card">';
    h += '<div class="as-card-title">Property Types</div>';
    l.propertyTypes.forEach(function (pt, i) {
      h += '<div class="as-list-item">' +
        '<input type="text" class="as-inline-input" value="' + escHtml(pt) + '" data-action="update-property-type" data-index="' + i + '">' +
        '<button class="as-remove-btn" data-action="remove-property-type" data-index="' + i + '" title="Remove">&times;</button>' +
      '</div>';
    });
    h += '<button class="as-add-btn" data-action="add-property-type"><svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>Add Property Type</button>';
    h += '</div>';

    h += '<div class="as-card">';
    h += '<div class="as-card-title">Default Listing Fields</div>';
    h += '<div class="as-card-subtitle">Toggle which fields appear by default on listing forms</div>';
    var lstFields = [
      { key: 'beds', label: 'Bedrooms' },
      { key: 'baths', label: 'Bathrooms' },
      { key: 'sqft', label: 'Square Footage' },
      { key: 'description', label: 'Description' },
      { key: 'listingDate', label: 'Listing Date' }
    ];
    lstFields.forEach(function (f) {
      var checked = l.defaultFields[f.key] !== false;
      h += toggleRow(f.label, checked, 'toggle-lst-field', f.key);
    });
    h += '</div>';

    h += '</div>';
    return h;
  }

  // ---- Expense Categories ----
  function renderExpenses() {
    var cats = settings.expenseCategories;
    var h = '<div class="as-section">';
    h += '<div class="as-section-header"><h2>Expense Categories</h2><p>Manage tax expense categories used in the Tax Center</p></div>';

    h += '<div class="as-card">';
    h += '<div class="as-card-title">Categories (' + cats.length + ')</div>';
    cats.forEach(function (c, i) {
      h += '<div class="as-list-item">' +
        '<input type="color" class="as-color-input" value="' + c.color + '" data-action="update-expense-color" data-index="' + i + '">' +
        '<input type="text" class="as-inline-input" value="' + escHtml(c.key) + '" data-action="update-expense-name" data-index="' + i + '">' +
        '<button class="as-remove-btn" data-action="remove-expense-cat" data-index="' + i + '" title="Remove">&times;</button>' +
      '</div>';
    });
    h += '<button class="as-add-btn" data-action="add-expense-cat"><svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>Add Category</button>';
    h += '</div>';

    h += '</div>';
    return h;
  }

  // ---- Team & Roles ----
  function renderTeamRoles() {
    var roles = settings.teamRoles.roles;
    var h = '<div class="as-section">';
    h += '<div class="as-section-header"><h2>Team & Roles</h2><p>Configure role permissions across the platform</p></div>';

    roles.forEach(function (r, i) {
      h += '<div class="as-card">';
      h += '<div class="as-card-title-row"><span class="as-card-title">' + escHtml(r.key) + '</span>' +
        (r.key !== 'Team Lead' ? '<button class="as-remove-btn" data-action="remove-role" data-index="' + i + '" title="Remove role">&times;</button>' : '') +
      '</div>';
      h += toggleRow('Can see Tax Center', r.canSeeTaxCenter, 'toggle-role-perm', i + ':canSeeTaxCenter');
      h += toggleRow('Can delete transactions', r.canDeleteTransactions, 'toggle-role-perm', i + ':canDeleteTransactions');
      h += toggleRow('Can share client portal', r.canSharePortal, 'toggle-role-perm', i + ':canSharePortal');
      h += '</div>';
    });

    h += '<button class="as-add-btn" data-action="add-role" style="margin-top:8px"><svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>Add Role</button>';

    h += '</div>';
    return h;
  }

  // ---- Leaderboard Settings ----
  function renderLeaderboard() {
    var lb = settings.leaderboard;
    var h = '<div class="as-section">';
    h += '<div class="as-section-header"><h2>Leaderboard Settings</h2><p>Control leaderboard visibility and metrics</p></div>';

    h += '<div class="as-card">';
    h += '<div class="as-card-title">Metrics to Display</div>';
    h += toggleRow('Show Closings', lb.showClosings, 'toggle-lb', 'showClosings');
    h += toggleRow('Show Volume', lb.showVolume, 'toggle-lb', 'showVolume');
    h += toggleRow('Show Listings', lb.showListings, 'toggle-lb', 'showListings');
    h += '</div>';

    h += '<div class="as-card">';
    h += '<div class="as-card-title">Default Time Period</div>';
    h += '<div class="form-group"><select id="as-lbPeriod" data-action="save-lb-period">';
    var periods = [
      { val: 'mtd', label: 'Month to Date' },
      { val: 'qtd', label: 'Quarter to Date' },
      { val: 'ytd', label: 'Year to Date' },
      { val: 'all', label: 'All Time' }
    ];
    periods.forEach(function (p) {
      h += '<option value="' + p.val + '"' + (lb.defaultPeriod === p.val ? ' selected' : '') + '>' + p.label + '</option>';
    });
    h += '</select></div>';
    h += '</div>';

    h += '<div class="as-card">';
    h += '<div class="as-card-title">Visibility</div>';
    h += toggleRow('Show leaderboard to all agents', lb.visibleToAll, 'toggle-lb', 'visibleToAll');
    h += '</div>';

    h += '</div>';
    return h;
  }

  // ---- Client Portal ----
  function renderClientPortal() {
    var cp = settings.clientPortal;
    var h = '<div class="as-section">';
    h += '<div class="as-section-header"><h2>Client Portal</h2><p>Customize the client-facing portal experience</p></div>';

    h += '<div class="as-card">';
    h += '<div class="as-card-title">Branding</div>';
    h += '<div class="form-row">';
    h += '<div class="form-group"><label>Portal Team Name</label><input type="text" id="as-portalName" value="' + escHtml(cp.portalTeamName || '') + '" placeholder="Leave blank to use team name" data-action="save-portal" data-field="portalTeamName"></div>';
    h += '<div class="form-group"><label>Accent Color</label><div class="as-color-row"><input type="color" id="as-portalColor" value="' + (cp.portalAccentColor || '#6366F1') + '" data-action="save-portal" data-field="portalAccentColor"><span class="as-color-hex">' + (cp.portalAccentColor || '#6366F1') + '</span></div></div>';
    h += '</div>';
    h += '</div>';

    h += '<div class="as-card">';
    h += '<div class="as-card-title">Portal Sections</div>';
    h += '<div class="as-card-subtitle">Toggle which sections are visible on the client portal</div>';
    h += toggleRow('Progress Stepper', cp.showProgressStepper, 'toggle-portal', 'showProgressStepper');
    h += toggleRow('Buyer / Seller Info', cp.showBuyerSellerInfo, 'toggle-portal', 'showBuyerSellerInfo');
    h += toggleRow('Notes', cp.showNotes, 'toggle-portal', 'showNotes');
    h += toggleRow('Appointments', cp.showAppointments, 'toggle-portal', 'showAppointments');
    h += toggleRow('Documents', cp.showDocuments, 'toggle-portal', 'showDocuments');
    h += '</div>';

    h += '<div class="as-card">';
    h += '<div class="as-card-title">Link Expiration</div>';
    h += '<div class="form-group"><label>Auto-expire portal links after (days)</label><input type="number" id="as-portalExpire" value="' + (cp.autoExpireDays || 90) + '" min="1" max="365" data-action="save-portal" data-field="autoExpireDays"></div>';
    h += '</div>';

    h += '</div>';
    return h;
  }

  // ---- Goals ----
  function renderGoals() {
    var g = settings.goals;
    var h = '<div class="as-section">';
    h += '<div class="as-section-header"><h2>Goals</h2><p>Set default goal values for new agents</p></div>';

    h += '<div class="as-card">';
    h += '<div class="as-card-title">Default Goals for New Agents</div>';
    h += '<div class="form-row">';
    h += '<div class="form-group"><label>Closings Goal</label><input type="number" id="as-defClosings" value="' + (g.defaultClosingsGoal || 8) + '" min="0" data-action="save-goals" data-field="defaultClosingsGoal"></div>';
    h += '<div class="form-group"><label>Volume Goal ($)</label><input type="number" id="as-defVolume" value="' + (g.defaultVolumeGoal || 2000000) + '" min="0" step="100000" data-action="save-goals" data-field="defaultVolumeGoal"></div>';
    h += '</div>';
    h += '</div>';

    h += '<div class="as-card">';
    h += '<div class="as-card-title">Visibility</div>';
    h += toggleRow('Goals visible to all agents (not just their own)', g.goalsVisibleToAll, 'toggle-goals-visible', 'goalsVisibleToAll');
    h += '</div>';

    h += '</div>';
    return h;
  }

  // ---- Announcements ----
  function renderAnnouncements() {
    var anns = loadAnnouncements();
    var h = '<div class="as-section">';
    h += '<div class="as-section-header"><h2>Announcements</h2><p>Manage team announcements displayed on the dashboard</p></div>';

    h += '<div class="as-card">';
    h += '<div class="as-card-title">All Announcements (' + anns.length + ')</div>';
    if (anns.length === 0) {
      h += '<div class="as-empty">No announcements yet.</div>';
    } else {
      anns.forEach(function (a, i) {
        h += '<div class="as-announcement-item">' +
          '<div class="as-announcement-meta">' +
            '<span class="as-announcement-author">' + escHtml(a.author || 'System') + '</span>' +
            '<span class="as-announcement-time">' + timeAgo(a.timestamp) + '</span>' +
            (a.pinned ? '<span class="badge" style="background:var(--amber-light);color:#92400E;font-size:.65rem">Pinned</span>' : '') +
          '</div>' +
          '<div class="as-announcement-text">' + escHtml(a.text) + '</div>' +
          '<div class="as-announcement-actions">' +
            '<button class="btn btn-outline btn-sm" data-action="' + (a.pinned ? 'unpin-announcement' : 'pin-announcement') + '" data-index="' + i + '">' + (a.pinned ? 'Unpin' : 'Pin') + '</button>' +
            '<button class="btn btn-outline btn-sm" data-action="edit-announcement" data-index="' + i + '">Edit</button>' +
            '<button class="btn btn-danger btn-sm" data-action="delete-announcement" data-index="' + i + '">Delete</button>' +
          '</div>' +
        '</div>';
      });
    }
    h += '</div>';

    h += '</div>';
    return h;
  }

  // ---- Helpers ----
  function toggleRow(label, checked, action, dataKey) {
    var id = 'toggle-' + dataKey.replace(/[^a-zA-Z0-9]/g, '-');
    return '<div class="as-toggle-row">' +
      '<span class="as-toggle-label">' + label + '</span>' +
      '<label class="as-switch">' +
        '<input type="checkbox" id="' + id + '"' + (checked ? ' checked' : '') + ' data-action="' + action + '" data-key="' + dataKey + '">' +
        '<span class="as-switch-slider"></span>' +
      '</label>' +
    '</div>';
  }

  function escHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function timeAgo(ts) {
    if (!ts) return '';
    var d = Math.round((Date.now() - new Date(ts).getTime()) / 86400000);
    if (d === 0) return 'Today';
    if (d === 1) return 'Yesterday';
    if (d < 7) return d + 'd ago';
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function generateKey(label) {
    return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  }

  // ---- Initial render ----
  render();

  // ---- Event Delegation ----
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');
    var index = parseInt(btn.getAttribute('data-index'));

    // Switch tab
    if (action === 'switch-tab') {
      activeTab = btn.getAttribute('data-tab');
      render();
      return;
    }

    // ---- Transaction statuses ----
    if (action === 'add-txn-status') {
      settings.transactions.statuses.push({ key: 'new_status', label: 'New Status', color: '#6366F1' });
      saveSettings(settings);
      render();
      return;
    }
    if (action === 'remove-txn-status') {
      if (settings.transactions.statuses.length <= 1) { showToast('Must have at least one status', 'error'); return; }
      settings.transactions.statuses.splice(index, 1);
      saveSettings(settings);
      render();
      return;
    }

    // ---- Listing statuses ----
    if (action === 'add-lst-status') {
      settings.listings.statuses.push({ key: 'new_status', label: 'New Status', color: '#6366F1' });
      saveSettings(settings);
      render();
      return;
    }
    if (action === 'remove-lst-status') {
      if (settings.listings.statuses.length <= 1) { showToast('Must have at least one status', 'error'); return; }
      settings.listings.statuses.splice(index, 1);
      saveSettings(settings);
      render();
      return;
    }

    // ---- Property types ----
    if (action === 'add-property-type') {
      settings.listings.propertyTypes.push('New Type');
      saveSettings(settings);
      render();
      return;
    }
    if (action === 'remove-property-type') {
      if (settings.listings.propertyTypes.length <= 1) { showToast('Must have at least one property type', 'error'); return; }
      settings.listings.propertyTypes.splice(index, 1);
      saveSettings(settings);
      render();
      return;
    }

    // ---- Expense categories ----
    if (action === 'add-expense-cat') {
      settings.expenseCategories.push({ key: 'New Category', color: '#94A3B8' });
      saveSettings(settings);
      render();
      return;
    }
    if (action === 'remove-expense-cat') {
      if (settings.expenseCategories.length <= 1) { showToast('Must have at least one category', 'error'); return; }
      settings.expenseCategories.splice(index, 1);
      saveSettings(settings);
      render();
      return;
    }

    // ---- Roles ----
    if (action === 'add-role') {
      var roleName = prompt('Enter role name:');
      if (!roleName || !roleName.trim()) return;
      settings.teamRoles.roles.push({
        key: roleName.trim(),
        canSeeTaxCenter: true,
        canDeleteTransactions: false,
        canSharePortal: true
      });
      saveSettings(settings);
      render();
      return;
    }
    if (action === 'remove-role') {
      var role = settings.teamRoles.roles[index];
      if (role && role.key === 'Team Lead') { showToast('Cannot remove Team Lead role', 'error'); return; }
      settings.teamRoles.roles.splice(index, 1);
      saveSettings(settings);
      render();
      return;
    }

    // ---- Announcements ----
    if (action === 'pin-announcement' || action === 'unpin-announcement') {
      var anns = loadAnnouncements();
      if (anns[index]) {
        anns[index].pinned = action === 'pin-announcement';
        saveAnnouncements(anns);
        showToast(action === 'pin-announcement' ? 'Pinned' : 'Unpinned');
        render();
      }
      return;
    }
    if (action === 'edit-announcement') {
      var anns = loadAnnouncements();
      if (!anns[index]) return;
      var newText = prompt('Edit announcement:', anns[index].text);
      if (newText === null) return;
      anns[index].text = newText.trim();
      saveAnnouncements(anns);
      showToast('Announcement updated');
      render();
      return;
    }
    if (action === 'delete-announcement') {
      var anns = loadAnnouncements();
      if (!anns[index]) return;
      if (!confirm('Delete this announcement?')) return;
      anns.splice(index, 1);
      saveAnnouncements(anns);
      showToast('Announcement deleted');
      render();
      return;
    }
  });

  // ---- Change event delegation (inputs, selects, checkboxes, color pickers) ----
  document.addEventListener('change', function (e) {
    var el = e.target;
    var action = el.getAttribute('data-action');
    if (!action) return;

    var index = parseInt(el.getAttribute('data-index'));
    var field = el.getAttribute('data-field');
    var key = el.getAttribute('data-key');

    // General fields
    if (action === 'save-general') {
      var val = el.value;
      if (field === 'defaultCommissionRate' || field === 'defaultAgentSplit' || field === 'estimatedTaxRate') {
        val = parseFloat(val) / 100;
      } else if (field === 'fiscalYearStartMonth') {
        val = parseInt(val);
      }
      settings.general[field] = val;
      saveSettings(settings);
      return;
    }

    // Transaction status color
    if (action === 'update-txn-status-color') {
      settings.transactions.statuses[index].color = el.value;
      saveSettings(settings);
      return;
    }

    // Listing status color
    if (action === 'update-lst-status-color') {
      settings.listings.statuses[index].color = el.value;
      saveSettings(settings);
      return;
    }

    // Expense category color
    if (action === 'update-expense-color') {
      settings.expenseCategories[index].color = el.value;
      saveSettings(settings);
      return;
    }

    // Transaction required fields
    if (action === 'toggle-txn-field') {
      settings.transactions.requiredFields[key] = el.checked;
      saveSettings(settings);
      return;
    }

    // Listing default fields
    if (action === 'toggle-lst-field') {
      settings.listings.defaultFields[key] = el.checked;
      saveSettings(settings);
      return;
    }

    // Transaction timeline
    if (action === 'save-txn-timeline') {
      settings.transactions.defaultCloseTimeline = parseInt(el.value) || 30;
      saveSettings(settings);
      return;
    }

    // Role permissions
    if (action === 'toggle-role-perm') {
      var parts = key.split(':');
      var roleIdx = parseInt(parts[0]);
      var permKey = parts[1];
      if (settings.teamRoles.roles[roleIdx]) {
        settings.teamRoles.roles[roleIdx][permKey] = el.checked;
        saveSettings(settings);
      }
      return;
    }

    // Leaderboard toggles
    if (action === 'toggle-lb') {
      settings.leaderboard[key] = el.checked;
      saveSettings(settings);
      return;
    }

    // Leaderboard period
    if (action === 'save-lb-period') {
      settings.leaderboard.defaultPeriod = el.value;
      saveSettings(settings);
      return;
    }

    // Client portal
    if (action === 'save-portal') {
      var val = el.value;
      if (field === 'autoExpireDays') val = parseInt(val) || 90;
      settings.clientPortal[field] = val;
      saveSettings(settings);
      if (field === 'portalAccentColor') {
        var hexSpan = el.parentNode.querySelector('.as-color-hex');
        if (hexSpan) hexSpan.textContent = val;
      }
      return;
    }

    // Portal section toggles
    if (action === 'toggle-portal') {
      settings.clientPortal[key] = el.checked;
      saveSettings(settings);
      return;
    }

    // Goals
    if (action === 'save-goals') {
      var val = field === 'defaultClosingsGoal' ? parseInt(el.value) || 8 : parseInt(el.value) || 2000000;
      settings.goals[field] = val;
      saveSettings(settings);
      return;
    }

    // Goals visibility
    if (action === 'toggle-goals-visible') {
      settings.goals.goalsVisibleToAll = el.checked;
      saveSettings(settings);
      return;
    }
  });

  // ---- Input event delegation (inline text edits — save on blur) ----
  document.addEventListener('blur', function (e) {
    var el = e.target;
    var action = el.getAttribute('data-action');
    if (!action) return;
    var index = parseInt(el.getAttribute('data-index'));

    if (action === 'update-txn-status-label') {
      var val = el.value.trim();
      if (!val) { showToast('Status name cannot be empty', 'error'); render(); return; }
      settings.transactions.statuses[index].label = val;
      settings.transactions.statuses[index].key = generateKey(val);
      saveSettings(settings);
      return;
    }

    if (action === 'update-lst-status-label') {
      var val = el.value.trim();
      if (!val) { showToast('Status name cannot be empty', 'error'); render(); return; }
      settings.listings.statuses[index].label = val;
      settings.listings.statuses[index].key = generateKey(val);
      saveSettings(settings);
      return;
    }

    if (action === 'update-property-type') {
      var val = el.value.trim();
      if (!val) { showToast('Type name cannot be empty', 'error'); render(); return; }
      settings.listings.propertyTypes[index] = val;
      saveSettings(settings);
      return;
    }

    if (action === 'update-expense-name') {
      var val = el.value.trim();
      if (!val) { showToast('Category name cannot be empty', 'error'); render(); return; }
      settings.expenseCategories[index].key = val;
      saveSettings(settings);
      return;
    }

    // General text fields on blur
    if (action === 'save-general') {
      var field = el.getAttribute('data-field');
      var val = el.value;
      if (field === 'teamName') {
        settings.general.teamName = val;
        saveSettings(settings);
      }
      return;
    }

    // Portal text fields on blur
    if (action === 'save-portal') {
      var field = el.getAttribute('data-field');
      if (field === 'portalTeamName') {
        settings.clientPortal.portalTeamName = el.value;
        saveSettings(settings);
      }
      return;
    }
  }, true);

})();
