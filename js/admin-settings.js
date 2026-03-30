/* ============================================================
   RE Back Office — Team Customization / Admin Settings
   ============================================================ */

(function () {
  'use strict';

  // Helper: generate a light tint of a hex color (mix with white at 10% opacity)
  function hexToLight(hex) {
    if (!hex || hex.length < 7) return hex;
    var r = parseInt(hex.substring(1, 3), 16);
    var g = parseInt(hex.substring(3, 5), 16);
    var b = parseInt(hex.substring(5, 7), 16);
    // Mix with white at ~10% opacity of the color
    var mix = function (c) { return Math.round(c * 0.08 + 255 * 0.92); };
    var toHex = function (n) { var h = Math.min(255, n).toString(16); return h.length === 1 ? '0' + h : h; };
    return '#' + toHex(mix(r)) + toHex(mix(g)) + toHex(mix(b));
  }

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
    theme: {
      primary: '#6366F1',
      primaryLight: '#EEF2FF',
      primaryDark: '#4F46E5',
      accent: '#8B5CF6',
      success: '#10B981',
      successLight: '#ECFDF5',
      warning: '#F59E0B',
      warningLight: '#FFFBEB',
      danger: '#F43F5E',
      dangerLight: '#FFF1F2',
      sidebarBg: '#002242',
      sidebarText: 'rgba(255,255,255,0.6)',
      sidebarActiveText: '#3484D0',
      sidebarActiveBg: 'rgba(52,132,208,0.2)',
      sidebarLogoBg: '#3484D0',
      sidebarHover: 'rgba(255,255,255,0.08)',
      topbarBg: '#FFFFFF',
      topbarText: '#2D3444',
      topbarBorder: '#F1F3F7',
      headerGradientStart: '#002242',
      headerGradientEnd: '#1a5494',
      bodyBg: '#F8F9FC',
      cardBg: '#FFFFFF',
      cardBorder: '#E2E6EF',
      textPrimary: '#2D3444',
      textSecondary: '#5A6478',
      textMuted: '#9BA5B7',
      btnPrimaryBg: '#002242',
      btnPrimaryText: '#FFFFFF',
      btnOutlineBorder: '#E2E6EF',
      statIconNavy: '#002242',
      statIconGold: '#3484D0',
      statIconGreen: '#1A7F4B',
      statIconBlue: '#1E5FA8',
      progressStart: '#35BA9C',
      progressEnd: '#3484D0',
      rankGold: '#FFD700',
      rankSilver: '#C0C0C0',
      rankBronze: '#CD7F32',
      filterActiveBg: '#002242',
      filterActiveText: '#FFFFFF',
      filterBorder: '#E2E6EF',
      pageColors: {
        dashboard: '#002242',
        leaderboard: '#002242',
        listings: '#002242',
        escrows: '#1E5FA8',
        closed: '#1A7F4B',
        taxCenter: '#1a5494'
      }
    },
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
    leadSources: [
      'Zillow',
      'Realtor.com',
      'Referral',
      'Sphere of Influence',
      'Open House',
      'Sign Call',
      'Social Media',
      'Google / SEO',
      'Cold Call / Door Knock',
      'Past Client',
      'Builder / Developer',
      'Relocation',
      'FSBO',
      'Expired Listing',
      'Farming / Mailer',
      'Other'
    ],
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

  // ---- Checklist Templates ----
  var DEFAULT_CHECKLIST_TEMPLATES = [
    {
      id: 'tpl-buyer-closing',
      name: 'Buyer Closing Checklist',
      category: 'escrow',
      items: [
        { id: 'i1', label: 'Earnest money deposited' },
        { id: 'i2', label: 'Home inspection scheduled' },
        { id: 'i3', label: 'Home inspection complete' },
        { id: 'i4', label: 'Repair negotiations' },
        { id: 'i5', label: 'Appraisal ordered' },
        { id: 'i6', label: 'Appraisal complete' },
        { id: 'i7', label: 'Loan approved' },
        { id: 'i8', label: 'Clear to close' },
        { id: 'i9', label: 'Final walkthrough' },
        { id: 'i10', label: 'Closing day' }
      ]
    },
    {
      id: 'tpl-seller-closing',
      name: 'Seller Closing Checklist',
      category: 'escrow',
      items: [
        { id: 'i11', label: 'Listing agreement signed' },
        { id: 'i12', label: 'Disclosure documents prepared' },
        { id: 'i13', label: 'Accept offer' },
        { id: 'i14', label: 'Inspection access scheduled' },
        { id: 'i15', label: 'Repair negotiations' },
        { id: 'i16', label: 'Appraisal access' },
        { id: 'i17', label: 'Review closing statement' },
        { id: 'i18', label: 'Closing day' }
      ]
    },
    {
      id: 'tpl-new-listing',
      name: 'New Listing Checklist',
      category: 'listing',
      items: [
        { id: 'i19', label: 'Listing agreement signed' },
        { id: 'i20', label: 'Pre-listing prep complete' },
        { id: 'i21', label: 'Professional photos scheduled' },
        { id: 'i22', label: 'Photos received & approved' },
        { id: 'i23', label: 'Sign installed' },
        { id: 'i24', label: 'MLS listing live' },
        { id: 'i25', label: 'Lockbox placed' },
        { id: 'i26', label: 'Open house scheduled' },
        { id: 'i27', label: 'Marketing materials distributed' }
      ]
    }
  ];

  function loadChecklistTemplates() {
    var stored = localStorage.getItem(PREFIX + 'checklist_templates');
    if (!stored) {
      saveChecklistTemplates(DEFAULT_CHECKLIST_TEMPLATES);
      return DEFAULT_CHECKLIST_TEMPLATES.slice();
    }
    try { return JSON.parse(stored); } catch (e) { return []; }
  }

  function saveChecklistTemplates(templates) {
    localStorage.setItem(PREFIX + 'checklist_templates', JSON.stringify(templates));
  }

  var expandedTemplateId = null;

  function renderChecklists() {
    var templates = loadChecklistTemplates();
    var h = '<div class="as-section">';
    h += '<div class="as-section-header"><h2>Checklist Templates</h2><p>Create reusable checklists for escrows and listings</p></div>';

    h += '<div style="margin-bottom:16px;display:flex;justify-content:flex-end">';
    h += '<button class="btn btn-primary btn-sm" data-action="add-checklist-template"><svg viewBox="0 0 24 24" width="16" height="16" style="fill:currentColor;margin-right:4px"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>Add Template</button>';
    h += '</div>';

    if (templates.length === 0) {
      h += '<div class="as-card"><div class="as-empty">No checklist templates yet.</div></div>';
    } else {
      templates.forEach(function (tpl, tplIdx) {
        var isExpanded = expandedTemplateId === tpl.id;
        var catLabel = tpl.category === 'escrow' ? 'Escrow' : 'Listing';
        var catColor = tpl.category === 'escrow' ? 'var(--indigo)' : 'var(--emerald)';
        var catBg = tpl.category === 'escrow' ? 'var(--indigo-light)' : 'var(--emerald-light)';

        h += '<div class="as-card" style="margin-bottom:12px;overflow:hidden">';

        // Header row (clickable to expand)
        h += '<div style="display:flex;align-items:center;gap:12px;cursor:pointer;padding:2px 0" data-action="toggle-checklist-expand" data-tpl-id="' + tpl.id + '">';
        h += '<svg viewBox="0 0 24 24" width="18" height="18" fill="var(--gray-400)" style="flex-shrink:0;transition:transform .2s;transform:rotate(' + (isExpanded ? '90' : '0') + 'deg)"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>';
        h += '<div style="flex:1;min-width:0">';
        h += '<div style="font-size:.92rem;font-weight:700;color:var(--gray-800)">' + escHtml(tpl.name) + '</div>';
        h += '<div style="font-size:.75rem;color:var(--gray-400);margin-top:2px">' + tpl.items.length + ' item' + (tpl.items.length !== 1 ? 's' : '') + '</div>';
        h += '</div>';
        h += '<span style="font-size:.7rem;font-weight:600;color:' + catColor + ';background:' + catBg + ';padding:3px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:.3px">' + catLabel + '</span>';
        h += '</div>';

        // Expanded content
        if (isExpanded) {
          h += '<div style="border-top:1px solid var(--gray-100);margin-top:12px;padding-top:16px">';

          // Name + Category row
          h += '<div class="form-row" style="grid-template-columns:1fr auto;margin-bottom:16px">';
          h += '<div class="form-group"><label>Template Name</label><input type="text" value="' + escHtml(tpl.name) + '" data-action="update-checklist-name" data-tpl-idx="' + tplIdx + '" style="padding:8px 12px"></div>';
          h += '<div class="form-group"><label>Category</label><select data-action="update-checklist-category" data-tpl-idx="' + tplIdx + '" style="padding:8px 12px">' +
            '<option value="escrow"' + (tpl.category === 'escrow' ? ' selected' : '') + '>Escrow</option>' +
            '<option value="listing"' + (tpl.category === 'listing' ? ' selected' : '') + '>Listing</option>' +
          '</select></div>';
          h += '</div>';

          // Items list
          h += '<div style="margin-bottom:12px">';
          h += '<div style="font-size:.75rem;font-weight:600;color:var(--gray-400);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">Checklist Items</div>';
          tpl.items.forEach(function (item, itemIdx) {
            h += '<div class="as-list-item" style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--gray-50)" draggable="true" data-list="checklist-' + tplIdx + '" data-index="' + itemIdx + '">';
            h += '<div class="as-drag-handle" draggable="false"><svg viewBox="0 0 24 24" width="16" height="16" fill="var(--gray-300)"><path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg></div>';
            h += '<input type="text" value="' + escHtml(item.label) + '" data-action="update-checklist-item-label" data-tpl-idx="' + tplIdx + '" data-item-idx="' + itemIdx + '" style="flex:1;padding:6px 10px;border:1.5px solid var(--gray-200);border-radius:6px;font-size:.85rem">';
            h += '<button class="btn btn-outline btn-sm" data-action="remove-checklist-item" data-tpl-idx="' + tplIdx + '" data-item-idx="' + itemIdx + '" style="color:var(--rose);border-color:var(--gray-200);padding:4px 8px;font-size:.75rem" title="Remove">&times;</button>';
            h += '</div>';
          });
          h += '</div>';

          // Add item button
          h += '<div style="display:flex;gap:8px;align-items:center;margin-bottom:16px">';
          h += '<button class="btn btn-outline btn-sm" data-action="add-checklist-item" data-tpl-idx="' + tplIdx + '" style="color:var(--indigo);border-color:var(--indigo);font-size:.8rem">+ Add Item</button>';
          h += '</div>';

          // Delete template
          h += '<div style="border-top:1px solid var(--gray-100);padding-top:12px">';
          h += '<button class="btn btn-danger btn-sm" data-action="delete-checklist-template" data-tpl-idx="' + tplIdx + '">Delete Template</button>';
          h += '</div>';

          h += '</div>'; // expanded content
        }

        h += '</div>'; // as-card
      });
    }

    h += '</div>';
    return h;
  }

  // ---- Tab definitions ----
  var TABS = [
    { key: 'theme', label: 'Theme & Colors', icon: '<path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>' },
    { key: 'general', label: 'General', icon: '<path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 00-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1112 8.4a3.6 3.6 0 010 7.2z"/>' },
    { key: 'transactions', label: 'Transaction Settings', icon: '<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/>' },
    { key: 'listings', label: 'Listing Settings', icon: '<path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>' },
    { key: 'leadSources', label: 'Lead Sources', icon: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>' },
    { key: 'checklists', label: 'Checklist Templates', icon: '<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/>' },
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
    initDragAndDrop();
    initLiveFormatting();
  }

  function initLiveFormatting() {
    var volInput = document.getElementById('as-defVolume');
    var volPreview = document.getElementById('as-volumePreview');
    if (volInput && volPreview) {
      volInput.addEventListener('input', function () {
        var val = parseInt(this.value) || 0;
        volPreview.textContent = Data.formatCurrency(val);
      });
    }
  }

  // ---- Drag and Drop ----
  var dragState = { list: null, fromIndex: null };

  function initDragAndDrop() {
    var items = document.querySelectorAll('.as-list-item[draggable="true"]');
    items.forEach(function (item) {
      item.addEventListener('dragstart', function (e) {
        dragState.list = this.getAttribute('data-list');
        dragState.fromIndex = parseInt(this.getAttribute('data-index'));
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', '');
      });

      item.addEventListener('dragend', function () {
        this.classList.remove('dragging');
        document.querySelectorAll('.as-list-item.drag-over').forEach(function (el) {
          el.classList.remove('drag-over');
        });
      });

      item.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        var thisList = this.getAttribute('data-list');
        if (thisList === dragState.list) {
          document.querySelectorAll('.as-list-item.drag-over').forEach(function (el) { el.classList.remove('drag-over'); });
          this.classList.add('drag-over');
        }
      });

      item.addEventListener('dragleave', function () {
        this.classList.remove('drag-over');
      });

      item.addEventListener('drop', function (e) {
        e.preventDefault();
        this.classList.remove('drag-over');
        var thisList = this.getAttribute('data-list');
        var toIndex = parseInt(this.getAttribute('data-index'));
        if (thisList !== dragState.list || toIndex === dragState.fromIndex) return;

        // Find the array and move the item
        var arr = getListArray(dragState.list);
        if (!arr) return;
        moveItem(arr, dragState.fromIndex, toIndex);
        setListArray(dragState.list, arr);
        saveSettings(settings);
        showToast('Reordered');
        render();
      });
    });
  }

  function getListArray(listKey) {
    if (listKey && listKey.indexOf('checklist-') === 0) {
      var tplIdx = parseInt(listKey.replace('checklist-', ''));
      var templates = loadChecklistTemplates();
      return templates[tplIdx] ? templates[tplIdx].items : null;
    }
    switch (listKey) {
      case 'txn-statuses': return settings.transactions.statuses;
      case 'lst-statuses': return settings.listings.statuses;
      case 'property-types': return settings.listings.propertyTypes;
      case 'lead-sources': return settings.leadSources;
      case 'expense-cats': return settings.expenseCategories;
      default: return null;
    }
  }

  function setListArray(listKey, arr) {
    if (listKey && listKey.indexOf('checklist-') === 0) {
      var tplIdx = parseInt(listKey.replace('checklist-', ''));
      var templates = loadChecklistTemplates();
      if (templates[tplIdx]) {
        templates[tplIdx].items = arr;
        saveChecklistTemplates(templates);
      }
      return;
    }
    switch (listKey) {
      case 'txn-statuses': settings.transactions.statuses = arr; break;
      case 'lst-statuses': settings.listings.statuses = arr; break;
      case 'property-types': settings.listings.propertyTypes = arr; break;
      case 'lead-sources': settings.leadSources = arr; break;
      case 'expense-cats': settings.expenseCategories = arr; break;
    }
  }

  function renderTabContent(tab) {
    switch (tab) {
      case 'theme': return renderTheme();
      case 'general': return renderGeneral();
      case 'transactions': return renderTransactions();
      case 'listings': return renderListings();
      case 'leadSources': return renderLeadSources();
      case 'expenses': return renderExpenses();
      case 'teamRoles': return renderTeamRoles();
      case 'leaderboard': return renderLeaderboard();
      case 'clientPortal': return renderClientPortal();
      case 'goals': return renderGoals();
      case 'announcements': return renderAnnouncements();
      case 'checklists': return renderChecklists();
      default: return '';
    }
  }

  // ---- General ----
  // ---- Theme & Colors ----
  function renderTheme() {
    var t = settings.theme || DEFAULTS.theme;
    var h = '<div class="as-section">';
    h += '<div class="as-section-header"><h2>Theme & Colors</h2><p>Customize the look and feel of the entire system</p></div>';

    var colorGroups = [
      {
        title: 'Primary Colors',
        subtitle: 'Main brand colors used across the entire system',
        colors: [
          { key: 'primary', label: 'Primary', desc: 'Buttons, links, active states' },
          { key: 'primaryLight', label: 'Primary Light', desc: 'Hover backgrounds, badge fills' },
          { key: 'primaryDark', label: 'Primary Dark', desc: 'Button hover, pressed states' },
          { key: 'accent', label: 'Accent', desc: 'Secondary highlights, gradients, icons' }
        ]
      },
      {
        title: 'Status Colors',
        subtitle: 'Colors for deal statuses, badges, and alerts',
        colors: [
          { key: 'success', label: 'Success / Closed', desc: 'Closed deals, completed items, positive values' },
          { key: 'successLight', label: 'Success Background', desc: 'Light background for success badges' },
          { key: 'warning', label: 'Warning / Pending', desc: 'Pending deals, caution states, due soon' },
          { key: 'warningLight', label: 'Warning Background', desc: 'Light background for warning badges' },
          { key: 'danger', label: 'Danger / Error', desc: 'Delete buttons, overdue, expense totals' },
          { key: 'dangerLight', label: 'Danger Background', desc: 'Light background for danger badges' }
        ]
      },
      {
        title: 'Sidebar',
        subtitle: 'Left navigation panel appearance',
        colors: [
          { key: 'sidebarBg', label: 'Background', desc: 'Sidebar background color' },
          { key: 'sidebarText', label: 'Nav Text', desc: 'Inactive nav item text color' },
          { key: 'sidebarActiveText', label: 'Active Nav Text', desc: 'Currently active page text color' },
          { key: 'sidebarActiveBg', label: 'Active Nav Background', desc: 'Currently active page highlight' },
          { key: 'sidebarLogoBg', label: 'Logo Mark', desc: 'Logo icon background color' },
          { key: 'sidebarHover', label: 'Hover', desc: 'Nav item hover background' }
        ]
      },
      {
        title: 'Topbar',
        subtitle: 'Top header bar on every page',
        colors: [
          { key: 'topbarBg', label: 'Background', desc: 'Topbar background color' },
          { key: 'topbarText', label: 'Title Text', desc: 'Page title color' },
          { key: 'topbarBorder', label: 'Border', desc: 'Bottom border color' }
        ]
      },
      {
        title: 'Dashboard Banner',
        subtitle: 'Welcome banner gradient on the dashboard',
        colors: [
          { key: 'headerGradientStart', label: 'Gradient Start', desc: 'Left side of welcome banner' },
          { key: 'headerGradientEnd', label: 'Gradient End', desc: 'Right side of welcome banner' }
        ]
      },
      {
        title: 'Cards & Surfaces',
        subtitle: 'Card backgrounds, borders, and shadows throughout',
        colors: [
          { key: 'bodyBg', label: 'Page Background', desc: 'Main content area background' },
          { key: 'cardBg', label: 'Card Background', desc: 'Stat cards, widget cards, list cards' },
          { key: 'cardBorder', label: 'Card Border', desc: 'Border around cards and sections' }
        ]
      },
      {
        title: 'Text Colors',
        subtitle: 'Typography colors across the system',
        colors: [
          { key: 'textPrimary', label: 'Primary Text', desc: 'Headings, names, values' },
          { key: 'textSecondary', label: 'Secondary Text', desc: 'Descriptions, labels, meta text' },
          { key: 'textMuted', label: 'Muted Text', desc: 'Timestamps, hints, placeholders' }
        ]
      },
      {
        title: 'Buttons',
        subtitle: 'Primary and outline button colors',
        colors: [
          { key: 'btnPrimaryBg', label: 'Primary Button', desc: 'Main action button background' },
          { key: 'btnPrimaryText', label: 'Primary Button Text', desc: 'Text on primary buttons' },
          { key: 'btnOutlineBorder', label: 'Outline Button Border', desc: 'Border for secondary buttons' }
        ]
      },
      {
        title: 'Stat Card Icons',
        subtitle: 'Icon circle colors on stat cards across pages',
        colors: [
          { key: 'statIconNavy', label: 'Navy Icon', desc: 'Default stat icon background' },
          { key: 'statIconGold', label: 'Gold/Blue Icon', desc: 'Volume and money stat icons' },
          { key: 'statIconGreen', label: 'Green Icon', desc: 'Success and agent stat icons' },
          { key: 'statIconBlue', label: 'Blue Icon', desc: 'Info and active stat icons' }
        ]
      },
      {
        title: 'Leaderboard & Progress',
        subtitle: 'Rankings, progress bars, and performance colors',
        colors: [
          { key: 'progressStart', label: 'Progress Bar Start', desc: 'Left side of progress bars' },
          { key: 'progressEnd', label: 'Progress Bar End', desc: 'Right side of progress bars' },
          { key: 'rankGold', label: 'Gold Rank', desc: '#1 rank badge color' },
          { key: 'rankSilver', label: 'Silver Rank', desc: '#2 rank badge color' },
          { key: 'rankBronze', label: 'Bronze Rank', desc: '#3 rank badge color' }
        ]
      },
      {
        title: 'Filter Buttons',
        subtitle: 'Time filter and category filter buttons',
        colors: [
          { key: 'filterActiveBg', label: 'Active Filter', desc: 'Selected filter button background' },
          { key: 'filterActiveText', label: 'Active Filter Text', desc: 'Selected filter button text' },
          { key: 'filterBorder', label: 'Inactive Border', desc: 'Unselected filter button border' }
        ]
      }
    ];

    colorGroups.forEach(function (group) {
      h += '<div class="as-card">';
      h += '<div class="as-card-title">' + group.title + '</div>';
      h += '<div class="as-card-subtitle">' + group.subtitle + '</div>';
      group.colors.forEach(function (c) {
        var val = t[c.key] || DEFAULTS.theme[c.key];
        h += '<div class="as-list-item" style="padding:10px 0">' +
          '<input type="color" class="as-color-input" value="' + val + '" data-action="update-theme-color" data-key="' + c.key + '">' +
          '<div style="flex:1"><div style="font-size:.85rem;font-weight:600;color:var(--gray-800)">' + c.label + '</div>' +
          '<div style="font-size:.72rem;color:var(--gray-400)">' + c.desc + '</div></div>' +
          '<span style="font-size:.78rem;font-family:monospace;color:var(--gray-500);background:var(--gray-50);padding:3px 8px;border-radius:4px" id="theme-hex-' + c.key + '">' + val + '</span>' +
        '</div>';
      });
      h += '</div>';
    });

    // Preset themes
    h += '<div class="as-card">';
    h += '<div class="as-card-title">Quick Presets</div>';
    h += '<div class="as-card-subtitle">Apply a preset color scheme with one click</div>';
    h += '<div style="display:flex;gap:10px;flex-wrap:wrap">';
    var presets = [
      { name: 'Indigo (Default)', primary: '#6366F1', accent: '#8B5CF6', success: '#10B981', warning: '#F59E0B', danger: '#F43F5E' },
      { name: 'Ocean Blue', primary: '#3B82F6', accent: '#0EA5E9', success: '#10B981', warning: '#F59E0B', danger: '#EF4444' },
      { name: 'Emerald', primary: '#10B981', accent: '#14B8A6', success: '#22C55E', warning: '#F59E0B', danger: '#F43F5E' },
      { name: 'Rose', primary: '#F43F5E', accent: '#EC4899', success: '#10B981', warning: '#F59E0B', danger: '#EF4444' },
      { name: 'Navy Gold', primary: '#1E3A5F', accent: '#D4A843', success: '#10B981', warning: '#F59E0B', danger: '#EF4444' },
      { name: 'Purple', primary: '#7C3AED', accent: '#A855F7', success: '#10B981', warning: '#F59E0B', danger: '#F43F5E' },
      { name: 'Slate', primary: '#475569', accent: '#64748B', success: '#10B981', warning: '#F59E0B', danger: '#EF4444' }
    ];
    presets.forEach(function (p) {
      h += '<button class="btn btn-outline btn-sm" data-action="apply-preset" data-preset=\'' + JSON.stringify(p) + '\' style="display:flex;align-items:center;gap:6px;padding:8px 14px">' +
        '<span style="width:16px;height:16px;border-radius:4px;background:' + p.primary + ';flex-shrink:0"></span>' +
        p.name + '</button>';
    });
    h += '</div></div>';

    // Page Accent Colors
    var pc = (t.pageColors || DEFAULTS.theme.pageColors || {});
    var pageColorItems = [
      { key: 'dashboard', label: 'Dashboard', desc: 'Stat icons, widget accents' },
      { key: 'leaderboard', label: 'Leaderboard', desc: 'Stat icons, ranking accents' },
      { key: 'listings', label: 'Listings', desc: 'Stat icons, list accents' },
      { key: 'escrows', label: 'Current Escrows', desc: 'Stat icons, detail accents' },
      { key: 'closed', label: 'Closed', desc: 'Stat icons, commission accents' },
      { key: 'taxCenter', label: 'Tax Center', desc: 'Tab accents, chart colors' }
    ];

    h += '<div class="as-card">';
    h += '<div class="as-card-title">Page Accent Colors</div>';
    h += '<div class="as-card-subtitle">Set a unique accent color for each page\'s stat cards and highlights</div>';
    pageColorItems.forEach(function (p) {
      var val = pc[p.key] || '#6366F1';
      h += '<div class="as-list-item" style="padding:10px 0">' +
        '<input type="color" class="as-color-input" value="' + val + '" data-action="update-page-color" data-page-key="' + p.key + '">' +
        '<div style="flex:1"><div style="font-size:.85rem;font-weight:600;color:var(--gray-800)">' + p.label + '</div>' +
        '<div style="font-size:.72rem;color:var(--gray-400)">' + p.desc + '</div></div>' +
        '<span style="font-size:.78rem;font-family:monospace;color:var(--gray-500);background:var(--gray-50);padding:3px 8px;border-radius:4px">' + val + '</span>' +
      '</div>';
    });
    h += '</div>';

    // Reset
    h += '<div class="as-card" style="display:flex;align-items:center;justify-content:space-between">';
    h += '<div><div style="font-size:.88rem;font-weight:600;color:var(--gray-700)">Reset to Defaults</div><div style="font-size:.75rem;color:var(--gray-400)">Restore all colors to the original indigo theme</div></div>';
    h += '<button class="btn btn-outline btn-sm" data-action="reset-theme" style="color:var(--rose);border-color:var(--rose)">Reset Colors</button>';
    h += '</div>';

    h += '</div>';
    return h;
  }

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
      h += '<div class="as-list-item" draggable="true" data-list="txn-statuses" data-index="' + i + '">' +
        dragHandle('txn-statuses', i) +
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
      h += '<div class="as-list-item" draggable="true" data-list="lst-statuses" data-index="' + i + '">' +
        dragHandle('lst-statuses', i) +
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
      h += '<div class="as-list-item" draggable="true" data-list="property-types" data-index="' + i + '">' +
        dragHandle('property-types', i) +
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
  // ---- Lead Sources ----
  function renderLeadSources() {
    var sources = settings.leadSources || [];
    var h = '<div class="as-section">';
    h += '<div class="as-section-header"><h2>Lead Sources</h2><p>Where your deals and listings come from. These appear as a dropdown on new escrows and listings.</p></div>';

    h += '<div class="as-card">';
    h += '<div class="as-card-title">Sources (' + sources.length + ')</div>';
    sources.forEach(function (s, i) {
      h += '<div class="as-list-item" draggable="true" data-list="lead-sources" data-index="' + i + '">' +
        dragHandle('lead-sources', i) +
        '<input type="text" class="as-inline-input" value="' + escHtml(s) + '" data-action="update-lead-source" data-index="' + i + '">' +
        '<button class="as-remove-btn" data-action="remove-lead-source" data-index="' + i + '" title="Remove">&times;</button>' +
      '</div>';
    });
    h += '<button class="as-add-btn" data-action="add-lead-source"><svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>Add Source</button>';
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
      h += '<div class="as-list-item" draggable="true" data-list="expense-cats" data-index="' + i + '">' +
        dragHandle('expense-cats', i) +
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
    h += '<div class="form-group"><label>Closings Goal</label><input type="number" id="as-defClosings" value="' + (g.defaultClosingsGoal || 8) + '" min="0" data-action="save-goals" data-field="defaultClosingsGoal"><div style="font-size:.72rem;color:var(--gray-400);margin-top:4px">Number of closings per year</div></div>';
    h += '<div class="form-group"><label>Volume Goal</label><input type="number" id="as-defVolume" value="' + (g.defaultVolumeGoal || 2000000) + '" min="0" step="50000" data-action="save-goals" data-field="defaultVolumeGoal"><div id="as-volumePreview" style="font-size:.85rem;font-weight:700;color:var(--indigo);margin-top:6px">' + Data.formatCurrency(g.defaultVolumeGoal || 2000000) + '</div></div>';
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

  function dragHandle(listKey, index) {
    return '<div class="as-drag-handle" draggable="false"><svg viewBox="0 0 24 24"><path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg></div>';
  }

  function moveItem(arr, fromIndex, toIndex) {
    if (toIndex < 0 || toIndex >= arr.length) return arr;
    var item = arr.splice(fromIndex, 1)[0];
    arr.splice(toIndex, 0, item);
    return arr;
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
    if (action === 'add-lead-source') {
      if (!settings.leadSources) settings.leadSources = [];
      settings.leadSources.push('New Source');
      saveSettings(settings);
      render();
      return;
    }
    if (action === 'remove-lead-source') {
      if (settings.leadSources.length <= 1) { showToast('Must have at least one source', 'error'); return; }
      settings.leadSources.splice(index, 1);
      saveSettings(settings);
      render();
      return;
    }

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

    // ---- Reorder actions ----
    if (action === 'move-txn-status-up' || action === 'move-txn-status-down') {
      var dir = action.indexOf('-up') > -1 ? -1 : 1;
      moveItem(settings.transactions.statuses, index, index + dir);
      saveSettings(settings); render(); return;
    }
    if (action === 'move-lst-status-up' || action === 'move-lst-status-down') {
      var dir = action.indexOf('-up') > -1 ? -1 : 1;
      moveItem(settings.listings.statuses, index, index + dir);
      saveSettings(settings); render(); return;
    }
    if (action === 'move-property-type-up' || action === 'move-property-type-down') {
      var dir = action.indexOf('-up') > -1 ? -1 : 1;
      moveItem(settings.listings.propertyTypes, index, index + dir);
      saveSettings(settings); render(); return;
    }
    if (action === 'move-expense-cat-up' || action === 'move-expense-cat-down') {
      var dir = action.indexOf('-up') > -1 ? -1 : 1;
      moveItem(settings.expenseCategories, index, index + dir);
      saveSettings(settings); render(); return;
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

    // ---- Checklist Templates ----
    if (action === 'toggle-checklist-expand') {
      var tplId = btn.getAttribute('data-tpl-id');
      expandedTemplateId = expandedTemplateId === tplId ? null : tplId;
      render();
      return;
    }
    if (action === 'add-checklist-template') {
      var templates = loadChecklistTemplates();
      var newTpl = {
        id: 'tpl-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 6),
        name: 'New Checklist',
        category: 'escrow',
        items: []
      };
      templates.push(newTpl);
      saveChecklistTemplates(templates);
      expandedTemplateId = newTpl.id;
      render();
      return;
    }
    if (action === 'delete-checklist-template') {
      var tplIdx = parseInt(btn.getAttribute('data-tpl-idx'));
      var templates = loadChecklistTemplates();
      if (!templates[tplIdx]) return;
      if (!confirm('Delete this checklist template?')) return;
      templates.splice(tplIdx, 1);
      saveChecklistTemplates(templates);
      expandedTemplateId = null;
      showToast('Template deleted');
      render();
      return;
    }
    if (action === 'add-checklist-item') {
      var tplIdx = parseInt(btn.getAttribute('data-tpl-idx'));
      var templates = loadChecklistTemplates();
      if (!templates[tplIdx]) return;
      templates[tplIdx].items.push({
        id: 'ci-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 6),
        label: 'New item'
      });
      saveChecklistTemplates(templates);
      render();
      return;
    }
    if (action === 'remove-checklist-item') {
      var tplIdx = parseInt(btn.getAttribute('data-tpl-idx'));
      var itemIdx = parseInt(btn.getAttribute('data-item-idx'));
      var templates = loadChecklistTemplates();
      if (!templates[tplIdx]) return;
      templates[tplIdx].items.splice(itemIdx, 1);
      saveChecklistTemplates(templates);
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

    // Checklist template category
    if (action === 'update-checklist-category') {
      var tplIdx = parseInt(el.getAttribute('data-tpl-idx'));
      var templates = loadChecklistTemplates();
      if (templates[tplIdx]) {
        templates[tplIdx].category = el.value;
        saveChecklistTemplates(templates);
        render();
      }
      return;
    }

    // Theme colors
    if (action === 'update-theme-color') {
      var colorKey = el.getAttribute('data-key');
      if (!settings.theme) settings.theme = JSON.parse(JSON.stringify(DEFAULTS.theme));
      settings.theme[colorKey] = el.value;
      saveSettings(settings);
      // Update hex display
      var hexEl = document.getElementById('theme-hex-' + colorKey);
      if (hexEl) hexEl.textContent = el.value;
      // Live apply
      if (typeof applyTheme === 'function') applyTheme();
      return;
    }

    if (action === 'update-page-color') {
      var pageKey = el.getAttribute('data-page-key');
      if (!settings.theme) settings.theme = JSON.parse(JSON.stringify(DEFAULTS.theme));
      if (!settings.theme.pageColors) settings.theme.pageColors = JSON.parse(JSON.stringify(DEFAULTS.theme.pageColors));
      settings.theme.pageColors[pageKey] = el.value;
      saveSettings(settings);
      showToast('Page color updated');
      return;
    }

    if (action === 'apply-preset') {
      var preset = JSON.parse(el.getAttribute('data-preset'));
      if (!settings.theme) settings.theme = JSON.parse(JSON.stringify(DEFAULTS.theme));
      settings.theme.primary = preset.primary;
      settings.theme.primaryDark = preset.primary;
      settings.theme.accent = preset.accent;
      settings.theme.success = preset.success;
      settings.theme.warning = preset.warning;
      settings.theme.danger = preset.danger;
      // Derive light versions
      settings.theme.primaryLight = hexToLight(preset.primary);
      settings.theme.successLight = hexToLight(preset.success);
      settings.theme.warningLight = hexToLight(preset.warning);
      settings.theme.dangerLight = hexToLight(preset.danger);
      settings.theme.sidebarActiveText = preset.primary;
      settings.theme.sidebarActiveBg = hexToLight(preset.primary);
      settings.theme.headerGradientStart = preset.primary;
      settings.theme.headerGradientEnd = preset.accent;
      saveSettings(settings);
      if (typeof applyTheme === 'function') applyTheme();
      showToast('Theme "' + preset.name + '" applied!');
      render();
      return;
    }

    if (action === 'reset-theme') {
      settings.theme = JSON.parse(JSON.stringify(DEFAULTS.theme));
      saveSettings(settings);
      if (typeof applyTheme === 'function') applyTheme();
      showToast('Colors reset to defaults');
      render();
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

    if (action === 'update-lead-source') {
      var val = el.value.trim();
      if (!val) { showToast('Source name cannot be empty', 'error'); render(); return; }
      settings.leadSources[index] = val;
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

    // Checklist template name on blur
    if (action === 'update-checklist-name') {
      var tplIdx = parseInt(el.getAttribute('data-tpl-idx'));
      var val = el.value.trim();
      if (!val) { showToast('Template name cannot be empty', 'error'); render(); return; }
      var templates = loadChecklistTemplates();
      if (templates[tplIdx]) {
        templates[tplIdx].name = val;
        saveChecklistTemplates(templates);
      }
      return;
    }

    // Checklist item label on blur
    if (action === 'update-checklist-item-label') {
      var tplIdx = parseInt(el.getAttribute('data-tpl-idx'));
      var itemIdx = parseInt(el.getAttribute('data-item-idx'));
      var val = el.value.trim();
      if (!val) { showToast('Item label cannot be empty', 'error'); render(); return; }
      var templates = loadChecklistTemplates();
      if (templates[tplIdx] && templates[tplIdx].items[itemIdx]) {
        templates[tplIdx].items[itemIdx].label = val;
        saveChecklistTemplates(templates);
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
