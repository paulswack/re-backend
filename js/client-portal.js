/* ============================================================
   RE Back Office — Client Portal Logic
   Public-facing, read-only transaction view for clients
   ============================================================ */

(function () {
  'use strict';

  var PREFIX = 'reb_';
  var portalMain = document.getElementById('portalMain');
  var portalFooter = document.getElementById('portalFooter');

  // ---- Helpers ----
  function getPortalLinks() {
    try { return JSON.parse(localStorage.getItem(PREFIX + 'portal_links') || '[]'); } catch (e) { return []; }
  }

  function getParties() {
    try { return JSON.parse(localStorage.getItem(PREFIX + 'txn_parties') || '{}'); } catch (e) { return {}; }
  }

  function getTxnUpdates() {
    try { return JSON.parse(localStorage.getItem(PREFIX + 'txn_updates') || '{}'); } catch (e) { return {}; }
  }

  function getLstUpdates() {
    try { return JSON.parse(localStorage.getItem(PREFIX + 'lst_updates') || '{}'); } catch (e) { return {}; }
  }

  function getUsers() {
    try { return JSON.parse(localStorage.getItem(PREFIX + 'users') || '[]'); } catch (e) { return []; }
  }

  // Track last visit for "New" badges
  function getLastVisit(token) {
    return localStorage.getItem(PREFIX + 'portal_visit_' + token) || null;
  }

  function setLastVisit(token) {
    localStorage.setItem(PREFIX + 'portal_visit_' + token, new Date().toISOString());
  }

  function isNewUpdate(upd, lastVisit) {
    if (!lastVisit) return true;
    return new Date(upd.timestamp) > new Date(lastVisit);
  }

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function daysUntil(dateStr) {
    if (!dateStr) return null;
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    var now = new Date();
    now.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return Math.ceil((d - now) / (1000 * 60 * 60 * 24));
  }

  function relativeTime(isoStr) {
    if (!isoStr) return '';
    var d = new Date(isoStr);
    var now = new Date();
    var diffMs = now - d;
    var diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return diffMin + 'm ago';
    var diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return diffHr + 'h ago';
    var diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return diffDay + 'd ago';
    return Data.formatDate(isoStr);
  }

  function formatDateFull(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  // ---- Milestone Icons (transactions) ----
  var TXN_ICONS = {
    offer_accepted: '🎉', earnest_deposited: '💰',
    inspection_scheduled: '📅', inspection_complete: '✅',
    repairs_requested: '🔧', repairs_agreed: '🤝',
    appraisal_ordered: '📋', appraisal_complete: '📊',
    appraisal_came_in: '✅', appraisal_low: '⚠️',
    loan_approved: '🏦', clear_to_close: '🎯',
    closing_scheduled: '📆', final_walkthrough: '🏠',
    closing_complete: '🔑', keys_delivered: '🗝️',
    status: '📌', custom: '✏️', note: '📝'
  };

  // ---- Milestone Icons (listings) ----
  var LST_ICONS = {
    listing_agreement: '📝', pre_listing_prep: '🏠',
    repairs_started: '🔧', repairs_complete: '✅',
    staging_scheduled: '🛋️', staging_complete: '✨',
    photos_scheduled: '📅', photos_complete: '📸',
    sign_installed: '🪧', mls_live: '🚀',
    open_house_scheduled: '🏡', showing_feedback: '💬',
    offer_received: '📩', multiple_offers: '🔥',
    offer_accepted: '🎉', price_adjustment: '💲',
    under_contract: '📋', sold: '🔑',
    status: '📌', custom: '✏️'
  };

  // ---- Step mapping from updates ----
  var STEP_MAP = {
    offer_accepted: 2, earnest_deposited: 2,
    inspection_scheduled: 3, inspection_complete: 3,
    repairs_requested: 3, repairs_agreed: 3,
    appraisal_ordered: 4, appraisal_complete: 4,
    appraisal_came_in: 4, appraisal_low: 4,
    loan_approved: 5, clear_to_close: 5,
    closing_scheduled: 5, final_walkthrough: 5,
    closing_complete: 6, keys_delivered: 6
  };

  var stepLabels = [
    'Listed / Active',
    'Under Contract',
    'Inspection',
    'Appraisal',
    'Clear to Close',
    'Closed'
  ];

  function getStepFromUpdates(txn, updates) {
    var status = (txn.status || '').toLowerCase();
    if (status === 'closed') return 6;

    // Check updates from newest to oldest for highest step
    var maxStep = 1;
    updates.forEach(function (upd) {
      var step = STEP_MAP[upd.type];
      if (step && step > maxStep) maxStep = step;
    });

    // Also consider status
    if (status === 'pending' && maxStep < 2) maxStep = 2;

    return maxStep;
  }

  // ---- Render Error ----
  function renderError(title, message) {
    portalMain.innerHTML =
      '<div class="portal-error">' +
        '<div class="portal-error-icon">' +
          '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>' +
        '</div>' +
        '<h2>' + escapeHtml(title) + '</h2>' +
        '<p>' + escapeHtml(message) + '</p>' +
      '</div>';
  }

  // ---- Main Init ----
  function init() {
    var params = new URLSearchParams(window.location.search);
    var token = params.get('token');

    if (!token) {
      renderError('No Access Token', 'This page requires a valid portal link. Please contact your real estate agent for access.');
      return;
    }

    var links = getPortalLinks();
    var link = links.find(function (l) { return l.token === token; });

    if (!link) {
      renderError('Invalid or Expired Link', 'This portal link is no longer valid. Please contact your real estate agent for a new link.');
      return;
    }

    if (link.createdAt) {
      var created = new Date(link.createdAt);
      var now = new Date();
      var daysSinceCreation = Math.floor((now - created) / (1000 * 60 * 60 * 24));
      if (daysSinceCreation > 90) {
        renderError('Link Expired', 'This portal link has expired. Please contact your real estate agent for a new link.');
        return;
      }
    }

    // Detect link type: listing or transaction
    var isListing = !!link.lstId;

    if (isListing) {
      renderListingPortal(link);
    } else {
      renderTransactionPortal(link);
    }
  }

  // ============================================================
  //  LISTING PORTAL
  // ============================================================
  function renderListingPortal(link) {
    var listings = Data.getListings();
    var lst = listings.find(function (l) { return l.id === link.lstId; });

    if (!lst) {
      renderError('Listing Not Found', 'The listing associated with this link could not be found.');
      return;
    }

    var allUpdates = getLstUpdates();
    var lstUpdates = (allUpdates[link.lstId] || []).slice().sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });

    var users = getUsers();
    var agentUser = lst.agent ? users.find(function (u) { return (u.displayName || u.username) === lst.agent; }) : null;
    var profiles = {};
    try { profiles = JSON.parse(localStorage.getItem('reb_profiles') || '{}'); } catch(e) {}
    var agentProfile = agentUser ? (profiles[agentUser.username] || {}) : {};

    var clientName = link.clientName || '';

    // Update header
    var brandSub = document.getElementById('portalBrandSub');
    if (brandSub && lst.agent) brandSub.textContent = lst.agent;

    // Listing step labels and calculation
    var lstStepLabels = ['Prep', 'Photos & Staging', 'Live on MLS', 'Showings', 'Under Contract', 'Sold'];
    var LST_STEP_MAP = {
      listing_agreement: 1, pre_listing_prep: 1, repairs_started: 1, repairs_complete: 1,
      staging_scheduled: 2, staging_complete: 2, photos_scheduled: 2, photos_complete: 2,
      sign_installed: 3, mls_live: 3,
      open_house_scheduled: 4, showing_feedback: 4,
      offer_received: 4, multiple_offers: 4, price_adjustment: 4,
      offer_accepted: 5, under_contract: 5,
      sold: 6
    };

    var currentStep = 1;
    var lstStatus = (lst.status || '').toLowerCase();
    if (lstStatus === 'sold') currentStep = 6;
    else if (lstStatus === 'pending') currentStep = 5;
    else {
      lstUpdates.forEach(function (upd) {
        var step = LST_STEP_MAP[upd.type];
        if (step && step > currentStep) currentStep = step;
      });
    }

    var html = '';

    // Hero
    html += '<div class="portal-hero">';
    html += '<div class="portal-hero-greeting">';
    if (clientName) html += '<div class="portal-hero-hello">Welcome, ' + escapeHtml(clientName.split(' ')[0]) + '</div>';
    html += '<div class="portal-hero-address">' + escapeHtml(lst.address) + '</div>';
    html += '<div class="portal-hero-price">' + Data.formatCurrencyFull(lst.price) + '</div>';
    html += '</div>';
    var statusClass = 'portal-status-' + (lst.status || 'active');
    var statusText = (lst.status || 'active').charAt(0).toUpperCase() + (lst.status || 'active').slice(1);
    html += '<span class="portal-status-badge ' + statusClass + '">' + escapeHtml(statusText) + '</span>';
    html += '</div>';

    // Stepper
    html += '<div class="portal-card">';
    html += '<div class="portal-card-header">';
    html += '<div class="portal-card-title">Listing Progress</div>';
    html += '</div>';
    html += '<div class="portal-stepper">';
    html += '<div class="stepper-track">';
    var fillPct = currentStep >= 6 ? 100 : ((currentStep - 1) / 5) * 100;
    html += '<div class="stepper-line"><div class="stepper-line-bg"></div><div class="stepper-line-fill" style="width:' + fillPct + '%"></div></div>';
    for (var i = 0; i < 6; i++) {
      var stepNum = i + 1;
      var stepClass = stepNum < currentStep ? 'completed' : (stepNum === currentStep ? 'active' : '');
      var circleContent = stepNum < currentStep ? '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' : stepNum;
      html += '<div class="stepper-step ' + stepClass + '"><div class="stepper-circle">' + circleContent + '</div><div class="stepper-label">' + lstStepLabels[i] + '</div></div>';
    }
    html += '</div></div></div>';

    // Property details row
    html += '<div class="portal-details-row">';
    var specs = [];
    if (lst.beds) specs.push(lst.beds + ' Beds');
    if (lst.baths) specs.push(lst.baths + ' Baths');
    if (lst.sqft) specs.push(Number(lst.sqft).toLocaleString() + ' Sqft');

    html += '<div class="portal-detail-item">';
    html += '<div class="portal-detail-icon indigo"><svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg></div>';
    html += '<div class="portal-detail-text"><div class="portal-detail-label">Property</div><div class="portal-detail-value">' + (specs.length ? specs.join(' / ') : 'Details pending') + '</div></div></div>';

    html += '<div class="portal-detail-item">';
    html += '<div class="portal-detail-icon emerald"><svg viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg></div>';
    html += '<div class="portal-detail-text"><div class="portal-detail-label">Listed</div><div class="portal-detail-value">' + (lst.listingDate ? formatDateFull(lst.listingDate) : 'Coming Soon') + '</div></div></div>';

    html += '<div class="portal-detail-item">';
    html += '<div class="portal-detail-icon violet"><svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>';
    html += '<div class="portal-detail-text"><div class="portal-detail-label">Your Agent</div><div class="portal-detail-value">' + escapeHtml(lst.agent || 'Your Agent') + '</div></div></div>';
    html += '</div>';

    // Updates timeline
    html += '<div class="portal-card">';
    html += '<div class="portal-card-header"><div class="portal-card-title"><svg viewBox="0 0 24 24" class="portal-title-icon"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>Updates</div>';
    if (lstUpdates.length > 0) html += '<div class="portal-count-badge">' + lstUpdates.length + '</div>';
    html += '</div>';

    if (lstUpdates.length === 0) {
      html += '<div class="portal-empty"><svg viewBox="0 0 24 24"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg><p>No updates yet. Your agent will post updates here as your listing progresses.</p></div>';
    } else {
      var lastVisit = getLastVisit(link.token);
      html += '<div class="portal-timeline">';
      lstUpdates.forEach(function (upd, idx) {
        var icon = LST_ICONS[upd.type] || '📌';
        var isLast = idx === lstUpdates.length - 1;
        var isNew = isNewUpdate(upd, lastVisit);
        html += '<div class="portal-timeline-item"><div class="portal-timeline-track"><div class="portal-timeline-icon' + (isNew ? ' new' : '') + '">' + icon + '</div>';
        if (!isLast) html += '<div class="portal-timeline-line"></div>';
        html += '</div><div class="portal-timeline-body"><div class="portal-timeline-title">' + escapeHtml(upd.title);
        if (isNew) html += ' <span class="portal-new-badge">New</span>';
        html += '</div>';
        if (upd.detail) html += '<div class="portal-timeline-detail">' + escapeHtml(upd.detail) + '</div>';
        html += '<div class="portal-timeline-time">' + relativeTime(upd.timestamp) + '</div></div></div>';
      });
      html += '</div>';
    }
    html += '</div>';

    // Mark this visit
    setLastVisit(link.token);

    // Agent card
    html += renderAgentCard(lst.agent, agentUser, agentProfile);

    // Help card
    html += '<div class="portal-help-card"><div class="portal-help-icon"><svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 12h-2v-2h2v2zm0-4h-2V6h2v4z"/></svg></div><div><div class="portal-help-title">Have questions?</div><div class="portal-help-text">Reach out to your agent directly — they\'re here to help you through every step of the process.</div></div></div>';

    portalMain.innerHTML = html;
    showFooter(lst.agent, agentUser);
  }

  // ============================================================
  //  TRANSACTION PORTAL
  // ============================================================
  function renderTransactionPortal(link) {
    var txns = Data.getTransactions();
    var txn = txns.find(function (t) { return t.id === link.txnId; });

    if (!txn) {
      renderError('Transaction Not Found', 'The transaction associated with this link could not be found.');
      return;
    }

    // Load related data — migrate old buyer/seller format to arrays
    var parties = getParties();
    var txnParties = parties[link.txnId] || {};
    // Inline migration: handle old {buyer:{},seller:{}} and new {buyers:[],sellers:[]} formats
    var buyersArr = txnParties.buyers || [];
    var sellersArr = txnParties.sellers || [];
    if (!buyersArr.length && txnParties.buyer) {
      if (txnParties.buyer.name || txnParties.buyer.phone || txnParties.buyer.email) {
        buyersArr.push({ name: txnParties.buyer.name || '', phone: txnParties.buyer.phone || '', email: txnParties.buyer.email || '' });
      }
      if (txnParties.buyer.spouse && txnParties.buyer.spouse.name) {
        buyersArr.push({ name: txnParties.buyer.spouse.name, phone: txnParties.buyer.spouse.phone || '', email: txnParties.buyer.spouse.email || '' });
      }
    }
    if (!sellersArr.length && txnParties.seller) {
      if (txnParties.seller.name || txnParties.seller.phone || txnParties.seller.email) {
        sellersArr.push({ name: txnParties.seller.name || '', phone: txnParties.seller.phone || '', email: txnParties.seller.email || '' });
      }
      if (txnParties.seller.spouse && txnParties.seller.spouse.name) {
        sellersArr.push({ name: txnParties.seller.spouse.name, phone: txnParties.seller.spouse.phone || '', email: txnParties.seller.spouse.email || '' });
      }
    }
    var firstBuyer = buyersArr[0] || {};
    var firstSeller = sellersArr[0] || {};

    // Determine client name — whoever we're working for
    var clientName = link.clientName || firstBuyer.name || firstSeller.name || '';
    var clientType = firstBuyer.name ? 'Buyer' : (firstSeller.name ? 'Seller' : '');

    var allUpdates = getTxnUpdates();
    var txnUpdates = (allUpdates[link.txnId] || []).slice().sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });

    var users = getUsers();
    var agentUser = null;
    if (txn.agent) {
      agentUser = users.find(function (u) {
        return (u.displayName || u.username) === txn.agent;
      });
    }

    var profiles = {};
    try { profiles = JSON.parse(localStorage.getItem('reb_profiles') || '{}'); } catch(e) {}
    var agentProfile = agentUser ? (profiles[agentUser.username] || {}) : {};

    var dtc = daysUntil(txn.closeDate);
    var currentStep = getStepFromUpdates(txn, txnUpdates);

    // Update header
    var brandName = document.getElementById('portalBrandName');
    var brandSub = document.getElementById('portalBrandSub');
    if (brandSub && txn.agent) {
      brandSub.textContent = txn.agent;
    }

    var html = '';

    // ---- Welcome / Hero ----
    html += '<div class="portal-hero">';
    html += '<div class="portal-hero-greeting">';
    if (clientName) {
      html += '<div class="portal-hero-hello">Welcome, ' + escapeHtml(clientName.split(' ')[0]) + '</div>';
    }
    html += '<div class="portal-hero-address">' + escapeHtml(txn.address) + '</div>';
    html += '<div class="portal-hero-price">' + Data.formatCurrencyFull(txn.price) + '</div>';
    html += '</div>';
    var statusClass = 'portal-status-' + (txn.status || 'active');
    var statusText = (txn.status || 'active').charAt(0).toUpperCase() + (txn.status || 'active').slice(1);
    html += '<span class="portal-status-badge ' + statusClass + '">' + escapeHtml(statusText) + '</span>';
    html += '</div>';

    // ---- Progress Stepper ----
    html += '<div class="portal-card">';
    html += '<div class="portal-card-header">';
    html += '<div class="portal-card-title">Transaction Progress</div>';
    if (txn.closeDate) {
      var dtcText = dtc !== null ? (dtc > 0 ? dtc + ' days to closing' : (dtc === 0 ? 'Closing today!' : 'Closed')) : '';
      html += '<div class="portal-card-meta">' + escapeHtml(dtcText) + '</div>';
    }
    html += '</div>';
    html += '<div class="portal-stepper">';
    html += '<div class="stepper-track">';

    var fillPct = currentStep >= 6 ? 100 : ((currentStep - 1) / 5) * 100;
    html += '<div class="stepper-line">';
    html += '<div class="stepper-line-bg"></div>';
    html += '<div class="stepper-line-fill" style="width:' + fillPct + '%"></div>';
    html += '</div>';

    for (var i = 0; i < 6; i++) {
      var stepNum = i + 1;
      var stepClass = '';
      var circleContent = stepNum;
      if (stepNum < currentStep) {
        stepClass = 'completed';
        circleContent = '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
      } else if (stepNum === currentStep) {
        stepClass = 'active';
      }
      html += '<div class="stepper-step ' + stepClass + '">';
      html += '<div class="stepper-circle">' + circleContent + '</div>';
      html += '<div class="stepper-label">' + stepLabels[i] + '</div>';
      html += '</div>';
    }
    html += '</div>'; // stepper-track
    html += '</div>'; // portal-stepper
    html += '</div>'; // portal-card

    // ---- Key Details ----
    html += '<div class="portal-details-row">';

    // Closing date
    html += '<div class="portal-detail-item">';
    html += '<div class="portal-detail-icon emerald"><svg viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/></svg></div>';
    html += '<div class="portal-detail-text">';
    html += '<div class="portal-detail-label">Closing Date</div>';
    html += '<div class="portal-detail-value">' + (txn.closeDate ? formatDateFull(txn.closeDate) : 'To Be Determined') + '</div>';
    html += '</div></div>';

    // Your agent
    html += '<div class="portal-detail-item">';
    html += '<div class="portal-detail-icon indigo"><svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>';
    html += '<div class="portal-detail-text">';
    html += '<div class="portal-detail-label">Your Agent</div>';
    html += '<div class="portal-detail-value">' + escapeHtml(txn.agent || 'Your Agent') + '</div>';
    html += '</div></div>';

    // Price
    html += '<div class="portal-detail-item">';
    html += '<div class="portal-detail-icon violet"><svg viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg></div>';
    html += '<div class="portal-detail-text">';
    html += '<div class="portal-detail-label">Purchase Price</div>';
    html += '<div class="portal-detail-value">' + Data.formatCurrencyFull(txn.price) + '</div>';
    html += '</div></div>';

    html += '</div>'; // portal-details-row

    // ---- Updates Timeline (the centerpiece) ----
    html += '<div class="portal-card">';
    html += '<div class="portal-card-header">';
    html += '<div class="portal-card-title">';
    html += '<svg viewBox="0 0 24 24" class="portal-title-icon"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>';
    html += 'Updates';
    html += '</div>';
    if (txnUpdates.length > 0) {
      html += '<div class="portal-count-badge">' + txnUpdates.length + '</div>';
    }
    html += '</div>';

    if (txnUpdates.length === 0) {
      html += '<div class="portal-empty">';
      html += '<svg viewBox="0 0 24 24"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>';
      html += '<p>No updates yet. Your agent will post updates here as your transaction progresses.</p>';
      html += '</div>';
    } else {
      var lastVisit = getLastVisit(link.token);
      var newCount = txnUpdates.filter(function (u) { return isNewUpdate(u, lastVisit); }).length;
      html += '<div class="portal-timeline">';
      txnUpdates.forEach(function (upd, idx) {
        var icon = TXN_ICONS[upd.type] || '📌';
        var isLast = idx === txnUpdates.length - 1;
        var isNew = isNewUpdate(upd, lastVisit);
        html += '<div class="portal-timeline-item">';
        html += '<div class="portal-timeline-track">';
        html += '<div class="portal-timeline-icon' + (isNew ? ' new' : '') + '">' + icon + '</div>';
        if (!isLast) html += '<div class="portal-timeline-line"></div>';
        html += '</div>';
        html += '<div class="portal-timeline-body">';
        html += '<div class="portal-timeline-title">' + escapeHtml(upd.title);
        if (isNew) html += ' <span class="portal-new-badge">New</span>';
        html += '</div>';
        if (upd.detail) {
          html += '<div class="portal-timeline-detail">' + escapeHtml(upd.detail) + '</div>';
        }
        html += '<div class="portal-timeline-time">' + relativeTime(upd.timestamp) + '</div>';
        html += '</div>';
        html += '</div>';
      });
      html += '</div>';
    }
    html += '</div>'; // portal-card (updates)

    // Mark this visit
    setLastVisit(link.token);

    // Agent card + help
    html += renderAgentCard(txn.agent, agentUser, agentProfile);
    html += '<div class="portal-help-card"><div class="portal-help-icon"><svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 12h-2v-2h2v2zm0-4h-2V6h2v4z"/></svg></div><div><div class="portal-help-title">Have questions?</div><div class="portal-help-text">Reach out to your agent directly — they\'re here to help you through every step of the process.</div></div></div>';

    portalMain.innerHTML = html;
    showFooter(txn.agent, agentUser);
  }

  // ============================================================
  //  SHARED: Agent Card
  // ============================================================
  function renderAgentCard(agentName, agentUser, agentProfile) {
    var h = '<div class="portal-agent-card"><div class="portal-agent-inner">';
    if (agentProfile && agentProfile.photo) {
      h += '<div class="portal-agent-photo"><img src="' + agentProfile.photo + '" alt=""></div>';
    } else {
      var initials = agentName ? agentName.split(' ').map(function(w) { return w[0]; }).join('').toUpperCase() : '?';
      h += '<div class="portal-agent-photo portal-agent-initials">' + initials + '</div>';
    }
    h += '<div class="portal-agent-info">';
    h += '<div class="portal-agent-name">' + escapeHtml(agentName || 'Your Agent') + '</div>';
    if (agentUser && agentUser.role) h += '<div class="portal-agent-role">' + escapeHtml(agentUser.role) + '</div>';
    h += '</div>';
    h += '<div class="portal-agent-actions">';
    var phone = agentUser && agentUser.phone ? agentUser.phone : '';
    if (phone) h += '<a href="tel:' + escapeHtml(phone) + '" class="portal-agent-btn"><svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>Call</a>';
    h += '</div></div></div>';
    return h;
  }

  // ============================================================
  //  SHARED: Footer
  // ============================================================
  function showFooter(agentName, agentUser) {
    portalFooter.style.display = 'block';
    var footerContact = document.getElementById('portalFooterContact');
    if (agentName) {
      var parts = [escapeHtml(agentName)];
      var phone = agentUser && agentUser.phone ? agentUser.phone : '';
      if (phone) parts.push('<a href="tel:' + escapeHtml(phone) + '">' + escapeHtml(phone) + '</a>');
      footerContact.innerHTML = parts.join(' &middot; ');
    }
  }

  init();

})();
