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

  function getNotes() {
    try { return JSON.parse(localStorage.getItem(PREFIX + 'txn_notes') || '{}'); } catch (e) { return {}; }
  }

  function getCalendarEvents() {
    try { return JSON.parse(localStorage.getItem(PREFIX + 'calendar_events') || '[]'); } catch (e) { return []; }
  }

  function getUsers() {
    try { return JSON.parse(localStorage.getItem(PREFIX + 'users') || '[]'); } catch (e) { return []; }
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

  function formatTime(timeStr) {
    if (!timeStr) return '';
    var parts = timeStr.split(':');
    var h = parseInt(parts[0], 10);
    var m = parts[1] || '00';
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + m + ' ' + ampm;
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

  function getMonthAbbr(dateStr) {
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var d = new Date(dateStr);
    return months[d.getMonth()];
  }

  function getDayNum(dateStr) {
    var d = new Date(dateStr);
    return d.getDate();
  }

  // ---- Transaction Status to Step Index ----
  // Steps: 1=Active, 2=Under Contract, 3=Inspection, 4=Appraisal, 5=Clear to Close, 6=Closed
  function getStepIndex(txn, notes) {
    var status = (txn.status || '').toLowerCase();

    // Closed is always step 6
    if (status === 'closed') return 6;

    // Check notes for keyword hints
    var allText = ((txn.notes || '') + ' ' + notesText(notes)).toLowerCase();

    if (allText.indexOf('clear to close') > -1 || allText.indexOf('ctc') > -1) return 5;
    if (allText.indexOf('appraisal') > -1) return 4;
    if (allText.indexOf('inspection') > -1) return 3;

    // Pending maps to Under Contract
    if (status === 'pending') return 4;

    // Under contract keywords
    if (allText.indexOf('under contract') > -1 || allText.indexOf('contract') > -1) return 2;

    // Active is step 1
    return 1;
  }

  function notesText(notesArr) {
    if (!notesArr || !notesArr.length) return '';
    return notesArr.map(function (n) { return n.text || ''; }).join(' ');
  }

  // ---- Stepper Labels ----
  var stepLabels = [
    'Active',
    'Under Contract',
    'Inspection',
    'Appraisal',
    'Clear to Close',
    'Closed'
  ];

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
    // Get token from URL
    var params = new URLSearchParams(window.location.search);
    var token = params.get('token');

    if (!token) {
      renderError('No Access Token', 'This page requires a valid portal link. Please contact your real estate agent for access.');
      return;
    }

    // Look up token
    var links = getPortalLinks();
    var link = links.find(function (l) { return l.token === token; });

    if (!link) {
      renderError('Invalid or Expired Link', 'This portal link is no longer valid. Please contact your real estate agent for a new link.');
      return;
    }

    // Check expiration (if set, expire after 90 days)
    if (link.createdAt) {
      var created = new Date(link.createdAt);
      var now = new Date();
      var daysSinceCreation = Math.floor((now - created) / (1000 * 60 * 60 * 24));
      if (daysSinceCreation > 90) {
        renderError('Link Expired', 'This portal link has expired. Please contact your real estate agent for a new link.');
        return;
      }
    }

    // Load transaction
    var txns = Data.getTransactions();
    var txn = txns.find(function (t) { return t.id === link.txnId; });

    if (!txn) {
      renderError('Transaction Not Found', 'The transaction associated with this link could not be found. It may have been deleted.');
      return;
    }

    // Load related data
    var parties = getParties();
    var txnParties = parties[link.txnId] || { buyer: {}, seller: {} };
    var buyer = txnParties.buyer || {};
    var seller = txnParties.seller || {};

    var allNotes = getNotes();
    var txnNotes = allNotes[link.txnId] || [];
    txnNotes.sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });

    var tasks = Data.getTasks().filter(function (task) {
      return task.linkedId === link.txnId && task.linkedType === 'transaction';
    });
    var pendingTasks = tasks.filter(function (task) { return task.status !== 'done'; });
    var doneTasks = tasks.filter(function (task) { return task.status === 'done'; });

    var calEvents = getCalendarEvents().filter(function (ev) {
      return ev.linkedId === link.txnId && ev.linkedType === 'transaction';
    });
    var now = new Date();
    now.setHours(0, 0, 0, 0);
    var upcomingAppts = calEvents.filter(function (ev) {
      var evDate = new Date(ev.date);
      evDate.setHours(0, 0, 0, 0);
      return evDate >= now;
    }).sort(function (a, b) { return new Date(a.date) - new Date(b.date); });

    // Find agent info
    var users = getUsers();
    var agentUser = null;
    if (txn.agent) {
      agentUser = users.find(function (u) {
        return (u.displayName || u.username) === txn.agent;
      });
    }

    var dtc = daysUntil(txn.closeDate);
    var dtcLabel = dtc !== null ? (dtc >= 0 ? dtc + ' days' : 'Closed ' + Math.abs(dtc) + ' days ago') : 'TBD';
    var currentStep = getStepIndex(txn, txnNotes);

    // Update header brand with agent name
    var brandName = document.getElementById('portalBrandName');
    var brandSub = document.getElementById('portalBrandSub');
    if (txn.agent && brandSub) {
      brandSub.textContent = txn.agent;
    }

    // Build HTML
    var html = '';

    // ---- Hero Card ----
    var statusClass = 'portal-status-' + (txn.status || 'active');
    var statusText = (txn.status || 'active').charAt(0).toUpperCase() + (txn.status || 'active').slice(1);
    html += '<div class="portal-hero">';
    html += '<div class="portal-hero-top">';
    html += '<div>';
    html += '<div class="portal-hero-address">' + escapeHtml(txn.address) + '</div>';
    html += '<div class="portal-hero-price">' + Data.formatCurrencyFull(txn.price) + '</div>';
    html += '</div>';
    html += '<span class="portal-status-badge ' + statusClass + '">' + escapeHtml(statusText) + '</span>';
    html += '</div>';
    html += '</div>';

    // ---- Progress Stepper ----
    html += '<div class="portal-stepper">';
    html += '<div class="portal-stepper-title">Transaction Progress</div>';
    html += '<div class="stepper-track">';

    // Connector line
    var fillPct = currentStep >= 6 ? 100 : ((currentStep - 1) / 5) * 100;
    html += '<div class="stepper-line">';
    html += '<div class="stepper-line-bg" style="left:8.33%;right:8.33%;"></div>';
    html += '<div class="stepper-line-fill" style="left:8.33%;width:' + (fillPct * 0.8333) + '%;"></div>';
    html += '</div>';

    for (var i = 0; i < 6; i++) {
      var stepNum = i + 1;
      var stepClass = '';
      var circleContent = stepNum;
      if (stepNum < currentStep) {
        stepClass = 'completed';
        circleContent = '<svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:#fff;"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
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

    // ---- Key Info Grid ----
    html += '<div class="portal-info-grid">';

    // Agent
    html += '<div class="portal-info-card">';
    html += '<div class="portal-info-icon indigo"><svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>';
    html += '<div>';
    html += '<div class="portal-info-label">Your Agent</div>';
    html += '<div class="portal-info-value">' + escapeHtml(txn.agent || 'Unassigned') + '</div>';
    html += '</div>';
    html += '</div>';

    // Close Date
    html += '<div class="portal-info-card">';
    html += '<div class="portal-info-icon emerald"><svg viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/></svg></div>';
    html += '<div>';
    html += '<div class="portal-info-label">Closing Date</div>';
    html += '<div class="portal-info-value">' + Data.formatDate(txn.closeDate) + '</div>';
    html += '</div>';
    html += '</div>';

    // Days to Closing
    html += '<div class="portal-info-card">';
    html += '<div class="portal-info-icon amber"><svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg></div>';
    html += '<div>';
    html += '<div class="portal-info-label">Days to Closing</div>';
    html += '<div class="portal-info-value">' + escapeHtml(dtcLabel) + '</div>';
    html += '</div>';
    html += '</div>';

    // Agent Phone
    var agentPhone = agentUser && agentUser.phone ? agentUser.phone : '';
    html += '<div class="portal-info-card">';
    html += '<div class="portal-info-icon violet"><svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg></div>';
    html += '<div>';
    html += '<div class="portal-info-label">Agent Phone</div>';
    html += '<div class="portal-info-value">' + (agentPhone ? escapeHtml(agentPhone) : 'Contact via email') + '</div>';
    html += '</div>';
    html += '</div>';

    html += '</div>'; // portal-info-grid

    // ---- Buyer / Seller Cards ----
    html += '<div class="portal-parties">';

    // Buyer
    html += '<div class="portal-party-card">';
    html += '<div class="portal-party-header">';
    html += '<div class="portal-party-icon buyer"><svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>';
    html += '<div class="portal-party-title">Buyer</div>';
    html += '</div>';
    if (buyer.name || buyer.phone || buyer.email) {
      if (buyer.name) html += '<div class="portal-party-name">' + escapeHtml(buyer.name) + '</div>';
      if (buyer.phone) {
        html += '<div class="portal-party-detail"><svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>' + escapeHtml(buyer.phone) + '</div>';
      }
      if (buyer.email) {
        html += '<div class="portal-party-detail"><svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>' + escapeHtml(buyer.email) + '</div>';
      }
    } else {
      html += '<div class="portal-party-empty">Buyer information not yet available.</div>';
    }
    html += '</div>';

    // Seller
    html += '<div class="portal-party-card">';
    html += '<div class="portal-party-header">';
    html += '<div class="portal-party-icon seller"><svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>';
    html += '<div class="portal-party-title">Seller</div>';
    html += '</div>';
    if (seller.name || seller.phone || seller.email) {
      if (seller.name) html += '<div class="portal-party-name">' + escapeHtml(seller.name) + '</div>';
      if (seller.phone) {
        html += '<div class="portal-party-detail"><svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>' + escapeHtml(seller.phone) + '</div>';
      }
      if (seller.email) {
        html += '<div class="portal-party-detail"><svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>' + escapeHtml(seller.email) + '</div>';
      }
    } else {
      html += '<div class="portal-party-empty">Seller information not yet available.</div>';
    }
    html += '</div>';

    html += '</div>'; // portal-parties

    // ---- Timeline / Notes ----
    html += '<div class="portal-section">';
    html += '<div class="portal-section-header">';
    html += '<svg viewBox="0 0 24 24"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>';
    html += '<h3>Updates &amp; Timeline</h3>';
    if (txnNotes.length > 0) {
      html += '<span class="portal-section-count">' + txnNotes.length + '</span>';
    }
    html += '</div>';
    html += '<div class="portal-section-body">';
    if (txnNotes.length === 0) {
      html += '<div class="portal-empty">No updates yet. Your agent will post updates here as your transaction progresses.</div>';
    } else {
      txnNotes.forEach(function (note) {
        html += '<div class="portal-timeline-item">';
        html += '<div class="portal-timeline-dot"></div>';
        html += '<div class="portal-timeline-content">';
        html += '<div class="portal-timeline-meta">';
        html += '<span class="portal-timeline-author">' + escapeHtml(note.author) + '</span>';
        html += '<span class="portal-timeline-time">' + relativeTime(note.timestamp) + '</span>';
        html += '</div>';
        html += '<div class="portal-timeline-text">' + escapeHtml(note.text) + '</div>';
        html += '</div>';
        html += '</div>';
      });
    }
    html += '</div>';
    html += '</div>'; // portal-section (notes)

    // ---- Next Steps / Tasks ----
    html += '<div class="portal-section">';
    html += '<div class="portal-section-header">';
    html += '<svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/></svg>';
    html += '<h3>Next Steps</h3>';
    var totalTasks = pendingTasks.length + doneTasks.length;
    if (totalTasks > 0) {
      html += '<span class="portal-section-count">' + doneTasks.length + '/' + totalTasks + '</span>';
    }
    html += '</div>';
    html += '<div class="portal-section-body">';
    if (pendingTasks.length === 0 && doneTasks.length === 0) {
      html += '<div class="portal-empty">No tasks have been added to this transaction yet.</div>';
    } else {
      // Pending first
      pendingTasks.forEach(function (task) {
        html += '<div class="portal-task-item">';
        html += '<div class="portal-task-check"></div>';
        html += '<div class="portal-task-title">' + escapeHtml(task.title) + '</div>';
        if (task.priority && task.priority !== 'medium') {
          html += '<span class="portal-task-priority ' + task.priority + '">' + escapeHtml(task.priority) + '</span>';
        }
        if (task.dueDate) {
          html += '<span class="portal-task-due">' + Data.formatDate(task.dueDate) + '</span>';
        }
        html += '</div>';
      });
      // Done
      doneTasks.forEach(function (task) {
        html += '<div class="portal-task-item done">';
        html += '<div class="portal-task-check done"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div>';
        html += '<div class="portal-task-title">' + escapeHtml(task.title) + '</div>';
        html += '</div>';
      });
    }
    html += '</div>';
    html += '</div>'; // portal-section (tasks)

    // ---- Upcoming Appointments ----
    html += '<div class="portal-section">';
    html += '<div class="portal-section-header">';
    html += '<svg viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/></svg>';
    html += '<h3>Upcoming Appointments</h3>';
    if (upcomingAppts.length > 0) {
      html += '<span class="portal-section-count">' + upcomingAppts.length + '</span>';
    }
    html += '</div>';
    html += '<div class="portal-section-body">';
    if (upcomingAppts.length === 0) {
      html += '<div class="portal-empty">No upcoming appointments scheduled.</div>';
    } else {
      upcomingAppts.forEach(function (ev) {
        var catClass = 'portal-appt-cat-' + (ev.category || 'other');
        html += '<div class="portal-appt-item">';
        html += '<div class="portal-appt-date-box">';
        html += '<div class="portal-appt-date-month">' + getMonthAbbr(ev.date) + '</div>';
        html += '<div class="portal-appt-date-day">' + getDayNum(ev.date) + '</div>';
        html += '</div>';
        html += '<div class="portal-appt-info">';
        html += '<div class="portal-appt-title">' + escapeHtml(ev.title) + '</div>';
        html += '<div class="portal-appt-meta">';
        if (ev.startTime) html += formatTime(ev.startTime);
        if (ev.location) html += (ev.startTime ? ' &middot; ' : '') + escapeHtml(ev.location);
        html += '</div>';
        html += '</div>';
        if (ev.category) {
          html += '<span class="portal-appt-category ' + catClass + '">' + escapeHtml(ev.category) + '</span>';
        }
        html += '</div>';
      });
    }
    html += '</div>';
    html += '</div>'; // portal-section (appointments)

    // ---- Documents Placeholder ----
    html += '<div class="portal-section">';
    html += '<div class="portal-section-header">';
    html += '<svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>';
    html += '<h3>Documents</h3>';
    html += '</div>';
    html += '<div class="portal-section-body">';
    html += '<div class="portal-docs-placeholder">';
    html += '<svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>';
    html += '<p>Documents will appear here as they are added by your agent.</p>';
    html += '</div>';
    html += '</div>';
    html += '</div>'; // portal-section (docs)

    portalMain.innerHTML = html;

    // ---- Show Footer ----
    portalFooter.style.display = 'block';
    var footerContact = document.getElementById('portalFooterContact');
    if (txn.agent) {
      var contactParts = [];
      contactParts.push(escapeHtml(txn.agent));
      if (agentPhone) contactParts.push('<a href="tel:' + escapeHtml(agentPhone) + '">' + escapeHtml(agentPhone) + '</a>');
      footerContact.innerHTML = contactParts.join(' &middot; ');
    }
  }

  // ---- Run ----
  init();

})();
