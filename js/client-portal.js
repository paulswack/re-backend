/* ============================================================
   RE Back Office — Client Portal Logic
   Public-facing, read-only transaction view for clients
   Enhanced with countdown, key dates, contacts, next steps,
   FAQ, closing cost estimator, celebration state
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
    var now = new Date(); now.setHours(0,0,0,0); d.setHours(0,0,0,0);
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
    return formatDateFull(isoStr);
  }
  function formatDateFull(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }
  function formatCurrency(n) {
    if (!n) return '$0';
    return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  // ---- Milestone Icons ----
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

  // ---- Milestone labels (human-readable) ----
  var TXN_LABELS = {
    offer_accepted: 'Offer Accepted', earnest_deposited: 'Earnest Money Deposited',
    inspection_scheduled: 'Inspection Scheduled', inspection_complete: 'Inspection Complete',
    repairs_requested: 'Repairs Requested', repairs_agreed: 'Repairs Agreed',
    appraisal_ordered: 'Appraisal Ordered', appraisal_complete: 'Appraisal Complete',
    appraisal_came_in: 'Appraisal Came In', appraisal_low: 'Appraisal Low',
    loan_approved: 'Loan Approved', clear_to_close: 'Clear to Close',
    closing_scheduled: 'Closing Scheduled', final_walkthrough: 'Final Walkthrough',
    closing_complete: 'Closing Complete', keys_delivered: 'Keys Delivered',
    status: 'Status Update', custom: 'Update', note: 'Note'
  };

  // ---- Step mapping ----
  var STEP_MAP = {
    offer_accepted: 1, earnest_deposited: 2,
    inspection_scheduled: 4, inspection_complete: 4,
    repairs_requested: 5, repairs_agreed: 5,
    appraisal_ordered: 6, appraisal_complete: 6,
    appraisal_came_in: 6, appraisal_low: 6,
    loan_approved: 7, clear_to_close: 7,
    closing_scheduled: 8, final_walkthrough: 8,
    closing_complete: 9, keys_delivered: 9
  };
  // Each entry: [acronym, full name]
  var stepLabels = [
    ['In Escrow', 'In Escrow'],
    ['EMD', 'Earnest Money Deposit'],
    ['Disclosures', 'Disclosures'],
    ['Inspections', 'Inspections'],
    ['RR', 'Request for Repairs'],
    ['Appraisal', 'Appraisal'],
    ['CR', 'Contingency Removal'],
    ['VP', 'Verification of Property'],
    ['COE', 'Close of Escrow']
  ];

  // ---- Seller Listing Prep Steps ----
  var sellerStepLabels = [
    ['LA Signed', 'Listing Agreement Signed'],
    ['Inspections', 'Inspections'],
    ['Prelim NHD', 'Preliminary & NHD'],
    ['Disclosures', 'Disclosures'],
    ['AVID', 'Agent Visual Inspection'],
    ['Stage', 'If Necessary'],
    ['Pictures', 'Pictures'],
    ['Live', 'Listed on MLS']
  ];

  var SELLER_STEP_MAP = {
    listing_agreement: 1,
    inspection_scheduled: 2, inspection_complete: 2,
    pre_listing_prep: 3, repairs_started: 3, repairs_complete: 3,
    staging_scheduled: 6, staging_complete: 6,
    photos_scheduled: 7, photos_complete: 7,
    sign_installed: 8, mls_live: 8
  };

  function getSellerStepFromUpdates(updates) {
    var maxStep = 0;
    updates.forEach(function (upd) {
      var step = SELLER_STEP_MAP[upd.type];
      if (step && step > maxStep) maxStep = step;
    });
    return maxStep;
  }

  function getStepFromUpdates(txn, updates) {
    var status = (txn.status || '').toLowerCase();
    if (status === 'closed') return 9;
    var maxStep = 1;
    updates.forEach(function (upd) {
      var step = STEP_MAP[upd.type];
      if (step && step > maxStep) maxStep = step;
    });
    if (status === 'pending' && maxStep < 1) maxStep = 1;
    return maxStep;
  }

  // ---- Render Error ----
  function renderError(title, message) {
    portalMain.innerHTML =
      '<div class="portal-error">' +
        '<div class="portal-error-icon"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg></div>' +
        '<h2>' + escapeHtml(title) + '</h2>' +
        '<p>' + escapeHtml(message) + '</p>' +
      '</div>';
  }

  // ============================================================
  //  SHARED COMPONENTS
  // ============================================================

  // ---- Countdown / Celebration Banner ----
  function renderCountdownBanner(dtc, closeDate, isClosed) {
    if (isClosed) {
      return '<div class="portal-celebration">' +
        '<div class="portal-celebration-emoji">🎉🏡🔑</div>' +
        '<div class="portal-celebration-title">Congratulations!</div>' +
        '<div class="portal-celebration-sub">Your transaction is complete. Welcome home!</div>' +
      '</div>';
    }
    if (dtc === null || dtc < 0) return '';
    if (dtc === 0) {
      return '<div class="portal-countdown" style="background:linear-gradient(135deg,#065F46 0%,#10B981 100%)">' +
        '<div class="portal-countdown-num">Today!</div>' +
        '<div class="portal-countdown-label">Closing Day</div>' +
        '<div class="portal-countdown-sub">' + formatDateFull(closeDate) + '</div>' +
      '</div>';
    }
    return '<div class="portal-countdown">' +
      '<div class="portal-countdown-num">' + dtc + '</div>' +
      '<div class="portal-countdown-label">Days Until Closing</div>' +
      '<div class="portal-countdown-sub">' + formatDateFull(closeDate) + '</div>' +
    '</div>';
  }

  // ---- Hero Card ----
  function renderHero(clientName, address, price, status) {
    var statusClass = 'portal-status-' + (status || 'active');
    var statusText = (status || 'active').charAt(0).toUpperCase() + (status || 'active').slice(1);
    var h = '<div class="portal-hero"><div class="portal-hero-greeting">';
    if (clientName) h += '<div class="portal-hero-hello">Welcome, ' + escapeHtml(clientName.split(' ')[0]) + '</div>';
    h += '<div class="portal-hero-address">' + escapeHtml(address) + '</div>';
    h += '<div class="portal-hero-price">' + formatCurrency(price) + '</div>';
    h += '</div><span class="portal-status-badge ' + statusClass + '">' + escapeHtml(statusText) + '</span></div>';
    return h;
  }

  // ---- Progress Stepper ----
  function renderStepper(title, labels, currentStep, metaText) {
    var total = labels.length;
    var h = '<div class="portal-card"><div class="portal-card-header"><div class="portal-card-title">' + escapeHtml(title) + '</div>';
    if (metaText) h += '<div class="portal-card-meta">' + escapeHtml(metaText) + '</div>';
    h += '</div><div class="portal-stepper"><div class="stepper-track">';
    var fillPct = currentStep >= total ? 100 : ((currentStep - 1) / (total - 1)) * 100;
    h += '<div class="stepper-line"><div class="stepper-line-bg"></div><div class="stepper-line-fill" style="width:' + fillPct + '%"></div></div>';
    for (var i = 0; i < total; i++) {
      var stepNum = i + 1;
      var cls = stepNum < currentStep ? 'completed' : (stepNum === currentStep ? 'active' : '');
      var circle = stepNum < currentStep ? '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' : stepNum;
      // Support [acronym, fullName] or plain string labels
      var acronym, fullName;
      if (Array.isArray(labels[i])) {
        acronym = labels[i][0];
        fullName = labels[i][1];
      } else {
        acronym = labels[i];
        fullName = '';
      }
      h += '<div class="stepper-step ' + cls + '"><div class="stepper-circle">' + circle + '</div>';
      h += '<div class="stepper-label">' + acronym + '</div>';
      if (fullName && fullName !== acronym) h += '<div class="stepper-sublabel">' + fullName + '</div>';
      h += '</div>';
    }
    h += '</div></div></div>';
    return h;
  }

  // ---- Key Dates Card ----
  function renderKeyDates(dates) {
    if (!dates.length) return '';
    var h = '<div class="portal-card">';
    h += '<div class="portal-card-header"><div class="portal-card-title"><svg viewBox="0 0 24 24" class="portal-title-icon"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg>Key Dates</div></div>';
    h += '<div class="portal-dates">';
    dates.forEach(function (d) {
      var dtc = daysUntil(d.date);
      var cls = 'upcoming';
      var badge = '';
      if (d.done) { cls = 'done'; badge = '<span class="portal-date-badge done">Complete</span>'; }
      else if (dtc === 0) { cls = 'today'; badge = '<span class="portal-date-badge today">Today</span>'; }
      else if (dtc !== null && dtc > 0) { badge = '<span class="portal-date-badge upcoming">In ' + dtc + ' day' + (dtc !== 1 ? 's' : '') + '</span>'; }
      else if (dtc !== null && dtc < 0) { cls = 'done'; badge = '<span class="portal-date-badge done">Passed</span>'; }
      h += '<div class="portal-date-row"><div class="portal-date-icon ' + cls + '">' + (d.icon || '📅') + '</div>';
      h += '<div class="portal-date-info"><div class="portal-date-name">' + escapeHtml(d.label) + '</div>';
      h += '<div class="portal-date-val">' + formatDateFull(d.date) + '</div></div>';
      h += badge + '</div>';
    });
    h += '</div></div>';
    return h;
  }

  // ---- Important Contacts (unified with agent) ----
  function renderContacts(contacts, agentName, agentUser, agentProfile) {
    var colors = ['#6366F1', '#10B981', '#F59E0B', '#EC4899', '#3B82F6', '#8B5CF6', '#14B8A6', '#F97316'];
    var h = '<div class="portal-card">';
    h += '<div class="portal-card-header"><div class="portal-card-title"><svg viewBox="0 0 24 24" class="portal-title-icon"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>Everyone In Your Transaction</div></div>';

    // Featured agent card at top
    if (agentName) {
      var phone = (agentProfile && agentProfile.phone) || (agentUser && agentUser.phone) || '';
      var email = (agentProfile && agentProfile.email) || '';
      var lic = (agentProfile && agentProfile.license) || '';
      var brokerage = (agentProfile && agentProfile.brokerage) || '';
      h += '<div style="padding:20px 28px;border-bottom:1px solid var(--p-100);display:flex;align-items:center;gap:16px;flex-wrap:wrap">';
      if (agentProfile && agentProfile.photo) {
        h += '<div class="portal-agent-photo" style="width:60px;height:60px;border-radius:16px"><img src="' + agentProfile.photo + '" alt=""></div>';
      } else {
        var agInitials = agentName.split(' ').map(function(w){return w[0];}).join('').toUpperCase();
        h += '<div class="portal-agent-photo portal-agent-initials" style="width:60px;height:60px;border-radius:16px;font-size:1rem">' + agInitials + '</div>';
      }
      h += '<div style="flex:1;min-width:180px">';
      h += '<div style="font-size:1rem;font-weight:800;color:var(--p-900)">' + escapeHtml(agentName) + '</div>';
      h += '<div style="font-size:.78rem;color:var(--p-indigo);font-weight:600">Your Agent' + (agentUser && agentUser.role ? ' — ' + escapeHtml(agentUser.role) : '') + '</div>';
      if (brokerage) h += '<div style="font-size:.72rem;color:var(--p-500);margin-top:2px">' + escapeHtml(brokerage) + '</div>';
      if (lic) h += '<div style="font-size:.68rem;color:var(--p-400);margin-top:1px">License #' + escapeHtml(lic) + '</div>';
      if (phone || email) {
        h += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">';
        if (phone) {
          h += '<a href="tel:' + escapeHtml(phone) + '" class="portal-agent-btn" style="padding:6px 14px;font-size:.75rem"><svg viewBox="0 0 24 24" style="width:14px;height:14px"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>' + escapeHtml(phone) + '</a>';
          h += '<a href="sms:' + escapeHtml(phone) + '" class="portal-agent-btn outline" style="padding:6px 14px;font-size:.75rem"><svg viewBox="0 0 24 24" style="width:14px;height:14px"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>Text</a>';
        }
        if (email) {
          h += '<a href="mailto:' + escapeHtml(email) + '" class="portal-agent-btn outline" style="padding:6px 14px;font-size:.75rem"><svg viewBox="0 0 24 24" style="width:14px;height:14px"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>' + escapeHtml(email) + '</a>';
        }
        h += '</div>';
      }
      h += '</div></div>';
    }

    // All other parties
    if (contacts.length) {
      h += '<div class="portal-contacts">';
      contacts.forEach(function (c, i) {
        var initials = c.name ? c.name.split(' ').map(function(w){return w[0]||'';}).join('').toUpperCase().substring(0,2) : '?';
        var bg = colors[i % colors.length];
        h += '<div class="portal-contact-row">';
        h += '<div class="portal-contact-avatar" style="background:' + bg + '">' + initials + '</div>';
        h += '<div class="portal-contact-info">';
        h += '<div class="portal-contact-name">' + escapeHtml(c.name) + '</div>';
        h += '<div class="portal-contact-role">' + escapeHtml(c.role) + '</div>';
        var details = [];
        if (c.phone) details.push('<a href="tel:' + escapeHtml(c.phone) + '">' + escapeHtml(c.phone) + '</a>');
        if (c.email) details.push('<a href="mailto:' + escapeHtml(c.email) + '">' + escapeHtml(c.email) + '</a>');
        if (c.company) details.push(escapeHtml(c.company));
        if (details.length) {
          h += '<div class="portal-contact-details">' + details.join(' &middot; ') + '</div>';
        }
        h += '</div></div>';
      });
      h += '</div>';
    }

    h += '</div>';
    return h;
  }

  // ---- Next Steps ----
  function renderNextSteps(steps) {
    if (!steps.length) return '';
    var h = '<div class="portal-card">';
    h += '<div class="portal-card-header"><div class="portal-card-title"><svg viewBox="0 0 24 24" class="portal-title-icon"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/></svg>What to Expect Next</div></div>';
    h += '<div class="portal-steps-list">';
    steps.forEach(function (s, i) {
      h += '<div class="portal-step-item"><div class="portal-step-num">' + (i + 1) + '</div>';
      h += '<div class="portal-step-text"><div class="portal-step-title">' + escapeHtml(s.title) + '</div>';
      h += '<div class="portal-step-desc">' + escapeHtml(s.desc) + '</div></div></div>';
    });
    h += '</div></div>';
    return h;
  }

  // ---- FAQ ----
  function renderFAQ(faqs) {
    if (!faqs.length) return '';
    var h = '<div class="portal-card">';
    h += '<div class="portal-card-header"><div class="portal-card-title"><svg viewBox="0 0 24 24" class="portal-title-icon"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>Frequently Asked Questions</div></div>';
    h += '<div class="portal-faq-list">';
    faqs.forEach(function (f, i) {
      h += '<div class="portal-faq-item" data-faq="' + i + '">';
      h += '<div class="portal-faq-q" onclick="this.parentElement.classList.toggle(\'open\')">' + escapeHtml(f.q) + '<svg class="portal-faq-arrow" viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg></div>';
      h += '<div class="portal-faq-a">' + escapeHtml(f.a) + '</div>';
      h += '</div>';
    });
    h += '</div></div>';
    return h;
  }

  // ---- Closing Cost Estimator ----
  function renderCostEstimate(price, type) {
    if (!price) return '';
    var p = parseFloat(price) || 0;
    var isBuyer = type === 'Buyer';
    var h = '<div class="portal-card">';
    h += '<div class="portal-card-header"><div class="portal-card-title"><svg viewBox="0 0 24 24" class="portal-title-icon"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>Estimated Closing Costs</div></div>';
    h += '<div class="portal-costs">';

    if (isBuyer) {
      var titleInsurance = Math.round(p * 0.005);
      var escrowFee = Math.round(p * 0.01);
      var lenderFees = Math.round(p * 0.01);
      var prepaid = Math.round(p * 0.015);
      var inspection = 450;
      var appraisal = 550;
      var total = titleInsurance + escrowFee + lenderFees + prepaid + inspection + appraisal;
      h += costRow('Title Insurance', titleInsurance);
      h += costRow('Escrow / Closing Fee', escrowFee);
      h += costRow('Lender Fees (est.)', lenderFees);
      h += costRow('Prepaid Taxes & Insurance', prepaid);
      h += costRow('Home Inspection', inspection);
      h += costRow('Appraisal', appraisal);
      h += '<div class="portal-cost-total">' + costInner('Estimated Total', total) + '</div>';
    } else {
      var commission = Math.round(p * 0.06);
      var titleInsurance = Math.round(p * 0.005);
      var escrowFee = Math.round(p * 0.01);
      var repairCredits = Math.round(p * 0.005);
      var total = commission + titleInsurance + escrowFee + repairCredits;
      h += costRow('Commission (est. 6%)', commission);
      h += costRow('Title Insurance', titleInsurance);
      h += costRow('Escrow / Closing Fee', escrowFee);
      h += costRow('Repair Credits (est.)', repairCredits);
      h += '<div class="portal-cost-total">' + costInner('Estimated Total', total) + '</div>';
    }
    h += '<div class="portal-cost-note">These are estimates only. Actual closing costs may vary. Your agent will provide a detailed breakdown closer to closing.</div>';
    h += '</div></div>';
    return h;
  }

  function costRow(label, amount) {
    return '<div class="portal-cost-row"><span class="portal-cost-label">' + label + '</span><span class="portal-cost-val">' + formatCurrency(amount) + '</span></div>';
  }
  function costInner(label, amount) {
    return '<span class="portal-cost-label">' + label + '</span><span class="portal-cost-val">' + formatCurrency(amount) + '</span>';
  }

  // ---- Timeline ----
  function renderTimeline(updates, icons, lastVisit) {
    if (!updates.length) {
      return '<div class="portal-empty"><svg viewBox="0 0 24 24"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg><p>No updates yet. Your agent will post updates here as things progress.</p></div>';
    }
    var h = '<div class="portal-timeline">';
    updates.forEach(function (upd, idx) {
      var icon = icons[upd.type] || '📌';
      var isLast = idx === updates.length - 1;
      var isNew = isNewUpdate(upd, lastVisit);
      h += '<div class="portal-timeline-item"><div class="portal-timeline-track">';
      h += '<div class="portal-timeline-icon' + (isNew ? ' new' : '') + '">' + icon + '</div>';
      if (!isLast) h += '<div class="portal-timeline-line"></div>';
      h += '</div><div class="portal-timeline-body">';
      h += '<div class="portal-timeline-title">' + escapeHtml(upd.title || TXN_LABELS[upd.type] || 'Update');
      if (isNew) h += ' <span class="portal-new-badge">New</span>';
      h += '</div>';
      if (upd.detail) h += '<div class="portal-timeline-detail">' + escapeHtml(upd.detail) + '</div>';
      if (upd.note) h += '<div class="portal-timeline-detail">' + escapeHtml(upd.note) + '</div>';
      h += '<div class="portal-timeline-time">' + relativeTime(upd.timestamp) + '</div>';
      h += '</div></div>';
    });
    h += '</div>';
    return h;
  }

  // ---- Agent Card ----
  function renderAgentCard(agentName, agentUser, agentProfile) {
    var h = '<div class="portal-agent-card"><div class="portal-agent-inner">';
    if (agentProfile && agentProfile.photo) {
      h += '<div class="portal-agent-photo"><img src="' + agentProfile.photo + '" alt=""></div>';
    } else {
      var initials = agentName ? agentName.split(' ').map(function(w){return w[0];}).join('').toUpperCase() : '?';
      h += '<div class="portal-agent-photo portal-agent-initials">' + initials + '</div>';
    }
    h += '<div class="portal-agent-info">';
    h += '<div class="portal-agent-name">' + escapeHtml(agentName || 'Your Agent') + '</div>';
    if (agentUser && agentUser.role) h += '<div class="portal-agent-role">' + escapeHtml(agentUser.role) + '</div>';
    h += '</div><div class="portal-agent-actions">';
    var phone = agentProfile.phone || (agentUser && agentUser.phone) || '';
    var email = agentProfile.email || '';
    if (phone) {
      h += '<a href="tel:' + escapeHtml(phone) + '" class="portal-agent-btn"><svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>Call</a>';
      h += '<a href="sms:' + escapeHtml(phone) + '" class="portal-agent-btn outline"><svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>Text</a>';
    }
    if (email) {
      h += '<a href="mailto:' + escapeHtml(email) + '" class="portal-agent-btn outline"><svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>Email</a>';
    }
    h += '</div></div></div>';
    return h;
  }

  // ---- Help Card ----
  function renderHelpCard() {
    return '<div class="portal-help-card"><div class="portal-help-icon"><svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 12h-2v-2h2v2zm0-4h-2V6h2v4z"/></svg></div><div><div class="portal-help-title">Have questions about your transaction?</div><div class="portal-help-text">Your agent is here to help you through every step. Don\'t hesitate to reach out with any questions or concerns — no question is too small!</div></div></div>';
  }

  // ---- Next Steps by stage ----
  function getNextStepsForStage(step, isBuyer) {
    // Check admin config first
    try {
      var raw = localStorage.getItem('reb_portal_config');
      if (raw) {
        var cfg = JSON.parse(raw);
        if (cfg.nextSteps && cfg.nextSteps[step] && cfg.nextSteps[step].length) {
          return cfg.nextSteps[step];
        }
      }
    } catch (e) {}
    // Fallback to defaults
    var steps = {
      1: [
        { title: 'Your offer has been accepted', desc: 'Escrow is now open. Your agent and escrow officer will guide you through each step from here.' },
        { title: 'Deposit earnest money', desc: 'Submit your earnest money deposit (EMD) to the escrow/title company within the timeline in your contract.' },
        { title: 'Gather important documents', desc: 'Have your ID, proof of funds, and any financial documents ready for your lender.' }
      ],
      2: [
        { title: 'Earnest money has been deposited', desc: 'Your good-faith deposit is being held in escrow. This shows the seller you\'re serious.' },
        { title: 'Review and sign disclosures', desc: 'Your agent will provide seller disclosures and other required documents for your review.' },
        { title: 'Start the loan process', desc: 'Provide all required documents to your lender to begin underwriting.' }
      ],
      3: [
        { title: 'Review all disclosures carefully', desc: 'Go through every disclosure with your agent. Ask questions about anything you don\'t understand.' },
        { title: 'Schedule inspections', desc: 'Your agent will coordinate a professional home inspection within the inspection period.' },
        { title: 'Keep finances steady', desc: 'Avoid major purchases, new credit, or job changes until after closing.' }
      ],
      4: [
        { title: 'Review inspection results', desc: 'Go through the inspection report with your agent and discuss any items of concern.' },
        { title: 'Decide on repair requests', desc: 'Based on the findings, your agent will help you prepare a Request for Repairs if needed.' },
        { title: 'Continue with loan processing', desc: 'Respond promptly to any requests from your lender to keep things on track.' }
      ],
      5: [
        { title: 'Repair negotiations in progress', desc: 'Your agent is working with the seller to reach agreement on inspection items.' },
        { title: 'Await appraisal scheduling', desc: 'Your lender will order an appraisal to confirm the home\'s value.' },
        { title: 'Keep finances steady', desc: 'Continue to avoid major purchases or credit changes until closing.' }
      ],
      6: [
        { title: 'Appraisal in progress', desc: 'The lender has ordered an appraisal to confirm the home\'s value meets the purchase price.' },
        { title: 'Review appraisal results', desc: 'Your agent will share the results and discuss next steps if any adjustments are needed.' },
        { title: 'Begin planning your move', desc: 'Start coordinating moving logistics, utilities, and address changes.' }
      ],
      7: [
        { title: 'Remove contingencies', desc: 'With inspections and appraisal complete, it\'s time to remove your remaining contingencies.' },
        { title: 'Final loan approval', desc: 'Your lender is finalizing your loan. Respond quickly to any last requests.' },
        { title: 'Review closing disclosure', desc: 'You\'ll receive a Closing Disclosure — review all figures carefully.' }
      ],
      8: [
        { title: 'Verification of property', desc: 'A final check to confirm the property condition matches what was agreed upon.' },
        { title: 'Schedule final walkthrough', desc: 'Walk through the property one last time to confirm condition and any agreed repairs.' },
        { title: 'Prepare closing funds', desc: 'Arrange a wire transfer or cashier\'s check for your closing costs and down payment.' }
      ],
      9: [
        { title: 'Save your closing documents', desc: 'Keep all closing paperwork in a safe place for tax and insurance purposes.' },
        { title: 'Set up your new home', desc: 'Transfer utilities, update your address, and change your locks for security.' },
        { title: 'Leave a review for your agent', desc: 'If you had a great experience, a review on Google or Zillow goes a long way!' }
      ]
    };
    return steps[step] || steps[1];
  }

  // ---- FAQ by stage ----
  function getFAQsForStage(step, isBuyer) {
    var allFaqs = [
      { q: 'What happens if the inspection finds problems?', a: 'Your agent will review the report with you and negotiate repairs or credits with the seller. Minor issues are common and usually resolved quickly. You can also choose to accept the property as-is.' },
      { q: 'What if the appraisal comes in low?', a: 'If the appraisal is below the purchase price, you have options: negotiate a lower price with the seller, pay the difference out of pocket, or in some cases, contest the appraisal. Your agent will guide you through the best approach.' },
      { q: 'How long does closing usually take?', a: 'The typical closing process takes 30-45 days from accepted offer. Your agent and lender will keep you updated on the timeline. Delays can happen but are usually manageable.' },
      { q: 'What should I bring to closing?', a: 'Bring a valid photo ID (driver\'s license or passport), any cashier\'s checks or wire transfer confirmations, and proof of homeowner\'s insurance. Your agent or title company will provide a specific list.' },
      { q: 'Can I visit the property before closing?', a: 'Yes! You\'ll have a final walkthrough scheduled close to closing day. If you need to visit before that, your agent can coordinate access with the seller\'s agent.' },
      { q: 'What are earnest money and how much is typical?', a: 'Earnest money is a good-faith deposit showing you\'re serious about the purchase. It\'s typically 1-3% of the purchase price and is held in escrow. It gets applied to your closing costs at the end.' },
      { q: 'What happens to my earnest money if the deal falls through?', a: 'If the deal falls through during a valid contingency period (inspection, financing, appraisal), your earnest money is typically refunded. Outside of contingency periods, the terms of your contract will determine what happens.' },
      { q: 'When do I get the keys?', a: 'Typically, you\'ll receive the keys on closing day after all documents are signed and funds are disbursed. In some cases, it may be the next business day depending on when closing occurs.' }
    ];
    // Show different FAQs based on stage
    if (step <= 2) return allFaqs.slice(0, 4);
    if (step <= 4) return [allFaqs[0], allFaqs[1], allFaqs[2], allFaqs[6]];
    if (step <= 5) return [allFaqs[2], allFaqs[3], allFaqs[4], allFaqs[7]];
    return [allFaqs[3], allFaqs[7], allFaqs[4]];
  }

  // ---- Extract key dates from updates ----
  function extractKeyDates(updates, closeDate) {
    var dates = [];
    var dateTypes = {
      inspection_scheduled: 'Home Inspection',
      inspection_complete: 'Inspection Complete',
      appraisal_ordered: 'Appraisal Ordered',
      appraisal_complete: 'Appraisal Complete',
      closing_scheduled: 'Closing Scheduled',
      final_walkthrough: 'Final Walkthrough',
      closing_complete: 'Closing Complete'
    };
    var seen = {};
    updates.forEach(function (upd) {
      if (dateTypes[upd.type] && !seen[upd.type]) {
        seen[upd.type] = true;
        var isDone = upd.type.indexOf('complete') > -1 || upd.type === 'closing_complete';
        dates.push({
          label: dateTypes[upd.type],
          date: upd.timestamp,
          icon: TXN_ICONS[upd.type] || '📅',
          done: isDone
        });
      }
    });
    if (closeDate && !seen.closing_complete) {
      dates.push({ label: 'Closing Day', date: closeDate, icon: '🔑', done: false });
    }
    // Sort by date
    dates.sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
    return dates;
  }

  // ---- Extract contacts from parties ----
  function extractContacts(txnParties, agentName, txnType) {
    var contacts = [];
    // Buyers
    var buyers = txnParties.buyers || [];
    if (!buyers.length && txnParties.buyer && txnParties.buyer.name) {
      buyers = [txnParties.buyer];
    }
    buyers.forEach(function (b) {
      if (b.name) contacts.push({ name: b.name, role: 'Buyer', phone: b.phone || '', email: b.email || '', company: '' });
    });
    // Sellers
    var sellers = txnParties.sellers || [];
    if (!sellers.length && txnParties.seller && txnParties.seller.name) {
      sellers = [txnParties.seller];
    }
    sellers.forEach(function (s) {
      if (s.name) contacts.push({ name: s.name, role: 'Seller', phone: s.phone || '', email: s.email || '', company: '' });
    });
    // Lender — could be "Name — Company" format
    if (txnParties.lender) {
      var lParts = txnParties.lender.split('—').map(function(s){return s.trim();});
      contacts.push({ name: lParts[0], role: 'Lender / Loan Officer', phone: txnParties.lenderPhone || '', email: txnParties.lenderEmail || '', company: lParts[1] || '' });
    }
    // Title / Escrow
    if (txnParties.titleCompany) {
      var tParts = txnParties.titleCompany.split('—').map(function(s){return s.trim();});
      contacts.push({ name: tParts[0], role: 'Title / Escrow Officer', phone: txnParties.titlePhone || '', email: txnParties.titleEmail || '', company: tParts[1] || '' });
    }
    // Escrow officer (separate field)
    if (txnParties.escrowOfficer) {
      contacts.push({ name: txnParties.escrowOfficer, role: 'Escrow Officer', phone: txnParties.escrowPhone || '', email: txnParties.escrowEmail || '', company: '' });
    }
    // Home Inspector
    if (txnParties.inspector) {
      contacts.push({ name: txnParties.inspector, role: 'Home Inspector', phone: txnParties.inspectorPhone || '', email: txnParties.inspectorEmail || '', company: '' });
    }
    // Buyer's Agent (other side)
    if (txnParties.buyersAgent) {
      contacts.push({ name: txnParties.buyersAgent, role: "Buyer's Agent", phone: txnParties.buyersAgentPhone || '', email: txnParties.buyersAgentEmail || '', company: '' });
    }
    // Seller's Agent (other side)
    if (txnParties.sellersAgent) {
      contacts.push({ name: txnParties.sellersAgent, role: "Seller's Agent", phone: txnParties.sellersAgentPhone || '', email: txnParties.sellersAgentEmail || '', company: '' });
    }
    // Attorney
    if (txnParties.attorney) {
      contacts.push({ name: txnParties.attorney, role: 'Attorney', phone: txnParties.attorneyPhone || '', email: txnParties.attorneyEmail || '', company: '' });
    }
    // Insurance
    if (txnParties.insurance) {
      contacts.push({ name: txnParties.insurance, role: 'Insurance Agent', phone: txnParties.insurancePhone || '', email: txnParties.insuranceEmail || '', company: '' });
    }
    // HOA
    if (txnParties.hoa) {
      contacts.push({ name: txnParties.hoa, role: 'HOA Contact', phone: txnParties.hoaPhone || '', email: txnParties.hoaEmail || '', company: '' });
    }
    return contacts;
  }

  // ---- Footer ----
  function showFooter(agentName, agentUser, agentProfile) {
    portalFooter.style.display = 'block';
    var footerContact = document.getElementById('portalFooterContact');
    if (agentName) {
      var parts = [escapeHtml(agentName)];
      var phone = (agentProfile && agentProfile.phone) || (agentUser && agentUser.phone) || '';
      if (phone) parts.push('<a href="tel:' + escapeHtml(phone) + '">' + escapeHtml(phone) + '</a>');
      var email = (agentProfile && agentProfile.email) || '';
      if (email) parts.push('<a href="mailto:' + escapeHtml(email) + '">' + escapeHtml(email) + '</a>');
      footerContact.innerHTML = parts.join(' &middot; ');
    }
  }


  // ============================================================
  //  TRANSACTION PORTAL
  // ============================================================
  function renderTransactionPortal(link) {
    var txns = Data.getTransactions();
    var txn = txns.find(function (t) { return t.id === link.txnId; });
    if (!txn) { renderError('Transaction Not Found', 'The transaction associated with this link could not be found.'); return; }

    var parties = getParties();
    var txnParties = parties[link.txnId] || {};

    // Migrate old format
    var buyersArr = txnParties.buyers || [];
    var sellersArr = txnParties.sellers || [];
    if (!buyersArr.length && txnParties.buyer) {
      if (txnParties.buyer.name) buyersArr.push(txnParties.buyer);
    }
    if (!sellersArr.length && txnParties.seller) {
      if (txnParties.seller.name) sellersArr.push(txnParties.seller);
    }

    var clientName = link.clientName || (buyersArr[0] || {}).name || (sellersArr[0] || {}).name || '';
    var clientType = buyersArr.length ? 'Buyer' : 'Seller';

    var allUpdates = getTxnUpdates();
    var txnUpdates = (allUpdates[link.txnId] || []).slice().sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });

    var users = getUsers();
    var agentUser = txn.agent ? users.find(function (u) { return (u.displayName || u.username) === txn.agent; }) : null;
    var profiles = {};
    try { profiles = JSON.parse(localStorage.getItem('reb_profiles') || '{}'); } catch(e) {}
    var agentProfile = agentUser ? (profiles[agentUser.username] || {}) : {};

    var dtc = daysUntil(txn.closeDate);
    var currentStep = getStepFromUpdates(txn, txnUpdates);
    var isClosed = (txn.status || '').toLowerCase() === 'closed';

    // Update header
    var brandSub = document.getElementById('portalBrandSub');
    if (brandSub && txn.agent) brandSub.textContent = txn.agent;

    var lastVisit = getLastVisit(link.token);
    var html = '';

    // 1. Countdown or Celebration
    html += renderCountdownBanner(dtc, txn.closeDate, isClosed);

    // 2. Hero
    html += renderHero(clientName, txn.address, txn.price, txn.status);

    // 3. Seller Listing Prep Stepper (for Seller transactions)
    var isSeller = (txn.type || '').toLowerCase() === 'seller' || (txn.type || '').toLowerCase() === 'listing';
    if (isSeller) {
      var sellerStep = getSellerStepFromUpdates(txnUpdates);
      html += renderStepper('Listing Prep Progress', sellerStepLabels, sellerStep, '');
    }

    // 4. Escrow Stepper
    var stepMeta = '';
    if (txn.closeDate && !isClosed) {
      stepMeta = dtc !== null ? (dtc > 0 ? dtc + ' days to closing' : (dtc === 0 ? 'Closing today!' : 'Closed')) : '';
    }
    html += renderStepper('Escrow Progress', stepLabels, currentStep, stepMeta);

    // 4. Key Details (4 columns)
    html += '<div class="portal-details-row-4">';
    html += '<div class="portal-detail-item"><div class="portal-detail-icon emerald"><svg viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg></div>';
    html += '<div class="portal-detail-text"><div class="portal-detail-label">Closing Date</div><div class="portal-detail-value">' + (txn.closeDate ? formatDateFull(txn.closeDate) : 'TBD') + '</div></div></div>';

    html += '<div class="portal-detail-item"><div class="portal-detail-icon indigo"><svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>';
    html += '<div class="portal-detail-text"><div class="portal-detail-label">Your Agent</div><div class="portal-detail-value">' + escapeHtml(txn.agent || 'Your Agent') + '</div></div></div>';

    html += '<div class="portal-detail-item"><div class="portal-detail-icon violet"><svg viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg></div>';
    html += '<div class="portal-detail-text"><div class="portal-detail-label">Purchase Price</div><div class="portal-detail-value">' + formatCurrency(txn.price) + '</div></div></div>';

    html += '<div class="portal-detail-item"><div class="portal-detail-icon" style="background:#FEF3C7;color:#F59E0B"><svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg></div>';
    html += '<div class="portal-detail-text"><div class="portal-detail-label">Transaction Type</div><div class="portal-detail-value">' + escapeHtml(txn.type || clientType || 'Purchase') + '</div></div></div>';
    html += '</div>';

    // 5. Key Dates
    var keyDates = extractKeyDates(txnUpdates.slice().reverse(), txn.closeDate);
    html += renderKeyDates(keyDates);

    // 6. Updates Timeline
    html += '<div class="portal-card"><div class="portal-card-header"><div class="portal-card-title"><svg viewBox="0 0 24 24" class="portal-title-icon"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>Updates</div>';
    if (txnUpdates.length > 0) html += '<div class="portal-count-badge">' + txnUpdates.length + '</div>';
    html += '</div>';
    html += renderTimeline(txnUpdates, TXN_ICONS, lastVisit);
    html += '</div>';

    // 7. Everyone in Your Transaction (agent featured + all contacts)
    var contacts = extractContacts(txnParties, txn.agent, clientType);
    html += renderContacts(contacts, txn.agent, agentUser, agentProfile);

    // 8. What to Expect Next
    html += renderNextSteps(getNextStepsForStage(currentStep, clientType === 'Buyer'));

    // 9. Help
    html += renderHelpCard();

    // Mark visit
    setLastVisit(link.token);

    portalMain.innerHTML = html;
    showFooter(txn.agent, agentUser, agentProfile);
  }


  // ============================================================
  //  LISTING PORTAL
  // ============================================================
  function renderListingPortal(link) {
    var listings = Data.getListings();
    var lst = listings.find(function (l) { return l.id === link.lstId; });
    if (!lst) { renderError('Listing Not Found', 'The listing associated with this link could not be found.'); return; }

    var allUpdates = getLstUpdates();
    var lstUpdates = (allUpdates[link.lstId] || []).slice().sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });

    var users = getUsers();
    var agentUser = lst.agent ? users.find(function (u) { return (u.displayName || u.username) === lst.agent; }) : null;
    var profiles = {};
    try { profiles = JSON.parse(localStorage.getItem('reb_profiles') || '{}'); } catch(e) {}
    var agentProfile = agentUser ? (profiles[agentUser.username] || {}) : {};

    var clientName = link.clientName || '';
    var brandSub = document.getElementById('portalBrandSub');
    if (brandSub && lst.agent) brandSub.textContent = lst.agent;

    // Listing market progress steps
    var lstMarketLabels = [
      ['Live on MLS', 'Live on MLS'],
      ['Showings', 'Showings'],
      ['Under Contract', 'Under Contract'],
      ['Sold', 'Sold']
    ];
    var LST_MARKET_MAP = {
      sign_installed: 1, mls_live: 1,
      open_house_scheduled: 2, showing_feedback: 2,
      offer_received: 2, multiple_offers: 2, price_adjustment: 2,
      offer_accepted: 3, under_contract: 3,
      sold: 4
    };

    // Calculate listing prep step
    var sellerPrepStep = getSellerStepFromUpdates(lstUpdates);

    // Calculate market step
    var marketStep = 0;
    var lstStatus = (lst.status || '').toLowerCase();
    if (lstStatus === 'sold') marketStep = 4;
    else if (lstStatus === 'pending') marketStep = 3;
    else {
      lstUpdates.forEach(function (upd) {
        var step = LST_MARKET_MAP[upd.type];
        if (step && step > marketStep) marketStep = step;
      });
    }

    var isSold = lstStatus === 'sold';
    var lastVisit = getLastVisit(link.token);
    var html = '';

    // Celebration for sold
    if (isSold) {
      html += '<div class="portal-celebration">' +
        '<div class="portal-celebration-emoji">🎉🏠💰</div>' +
        '<div class="portal-celebration-title">Your Home Has Sold!</div>' +
        '<div class="portal-celebration-sub">Congratulations on a successful sale!</div>' +
      '</div>';
    }

    // Hero
    html += renderHero(clientName, lst.address, lst.price, lst.status);

    // Listing Prep Stepper
    html += renderStepper('Listing Prep Progress', sellerStepLabels, sellerPrepStep, '');

    // Escrow Stepper (same as buyer transactions)
    // Calculate escrow step from listing updates using the transaction step map
    var lstEscrowStep = 0;
    if (lstStatus === 'sold') lstEscrowStep = 9;
    else {
      lstUpdates.forEach(function (upd) {
        var step = STEP_MAP[upd.type];
        if (step && step > lstEscrowStep) lstEscrowStep = step;
      });
      if (lstStatus === 'pending' && lstEscrowStep < 1) lstEscrowStep = 1;
    }
    html += renderStepper('Escrow Progress', stepLabels, lstEscrowStep, '');

    // Details
    var specs = [];
    if (lst.beds) specs.push(lst.beds + ' Beds');
    if (lst.baths) specs.push(lst.baths + ' Baths');
    if (lst.sqft) specs.push(Number(lst.sqft).toLocaleString() + ' Sqft');

    html += '<div class="portal-details-row">';
    html += '<div class="portal-detail-item"><div class="portal-detail-icon indigo"><svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg></div>';
    html += '<div class="portal-detail-text"><div class="portal-detail-label">Property</div><div class="portal-detail-value">' + (specs.length ? specs.join(' / ') : 'Details pending') + '</div></div></div>';

    html += '<div class="portal-detail-item"><div class="portal-detail-icon emerald"><svg viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg></div>';
    html += '<div class="portal-detail-text"><div class="portal-detail-label">Listed</div><div class="portal-detail-value">' + (lst.listingDate ? formatDateFull(lst.listingDate) : 'Coming Soon') + '</div></div></div>';

    html += '<div class="portal-detail-item"><div class="portal-detail-icon violet"><svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>';
    html += '<div class="portal-detail-text"><div class="portal-detail-label">Your Agent</div><div class="portal-detail-value">' + escapeHtml(lst.agent || 'Your Agent') + '</div></div></div>';
    html += '</div>';

    // Updates
    html += '<div class="portal-card"><div class="portal-card-header"><div class="portal-card-title"><svg viewBox="0 0 24 24" class="portal-title-icon"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>Updates</div>';
    if (lstUpdates.length > 0) html += '<div class="portal-count-badge">' + lstUpdates.length + '</div>';
    html += '</div>';
    html += renderTimeline(lstUpdates, LST_ICONS, lastVisit);
    html += '</div>';

    // Listing-specific next steps
    var lstNextSteps = {
      1: [
        { title: 'Prepare your home for photos', desc: 'Declutter, deep clean, and complete any minor repairs before the photography session.' },
        { title: 'Review your listing details', desc: 'Make sure the property description, features, and pricing are accurate.' },
        { title: 'Plan your showing schedule', desc: 'Discuss with your agent when the home will be available for showings and open houses.' }
      ],
      2: [
        { title: 'Review photos and marketing', desc: 'Your agent will share the professional photos and marketing materials for your approval.' },
        { title: 'Prepare for MLS launch', desc: 'Once photos are ready, your listing will go live. Make sure the home is show-ready.' }
      ],
      3: [
        { title: 'Keep your home show-ready', desc: 'Showings can happen quickly. Keep the home clean and have a plan for last-minute requests.' },
        { title: 'Review showing feedback', desc: 'Your agent will share feedback from potential buyers after each showing.' }
      ],
      4: [
        { title: 'Review any offers received', desc: 'Your agent will present offers and help you evaluate each one including terms, contingencies, and timing.' },
        { title: 'Negotiate the best deal', desc: 'Work with your agent to counter or accept the strongest offer.' }
      ],
      5: [
        { title: 'Cooperate with inspections', desc: 'The buyer will likely schedule a home inspection. Be prepared to negotiate any findings.' },
        { title: 'Prepare for closing', desc: 'Begin gathering documents needed for closing and plan your move-out timeline.' }
      ],
      6: [
        { title: 'Save your closing documents', desc: 'Keep all paperwork for tax purposes.' },
        { title: 'Leave a review', desc: 'If you had a great experience, a review helps your agent help others!' }
      ]
    };
    var lstActiveStep = marketStep > 0 ? (marketStep + 2) : (sellerPrepStep > 0 ? sellerPrepStep : 1);
    html += renderNextSteps(lstNextSteps[lstActiveStep] || lstNextSteps[1]);

    // Listing FAQ
    var lstFaqs = [
      { q: 'How long will it take to sell my home?', a: 'Market conditions vary, but your agent will provide a realistic timeline based on comparable sales in your area. On average, homes sell within 30-90 days depending on price and market conditions.' },
      { q: 'What happens after I accept an offer?', a: 'The buyer will typically schedule an inspection, secure financing, and get an appraisal. Your agent guides you through each step including repair negotiations and closing preparation.' },
      { q: 'Do I need to be present for showings?', a: 'It\'s actually better if you\'re not home during showings — buyers feel more comfortable exploring the property. Your agent will handle all coordination and security.' },
      { q: 'What closing costs will I pay as a seller?', a: 'Common seller costs include real estate commissions, title insurance, transfer taxes, and any agreed repair credits. Your agent can provide a detailed net sheet estimate.' }
    ];

    // Agent + Help
    html += renderContacts([], lst.agent, agentUser, agentProfile);
    html += renderHelpCard();

    setLastVisit(link.token);
    portalMain.innerHTML = html;
    showFooter(lst.agent, agentUser, agentProfile);
  }


  // ============================================================
  //  INIT
  // ============================================================
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

    if (link.lstId) {
      renderListingPortal(link);
    } else {
      renderTransactionPortal(link);
    }
  }

  init();
})();
