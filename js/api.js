/* ============================================================
   RE Back Office — API Client
   Replaces localStorage with server API calls.
   All data flows through this module.
   ============================================================ */

var API = (function () {
  'use strict';

  var BASE = '/api';
  var _token = localStorage.getItem('reb_jwt') || null;
  var _user = null;

  try {
    var cached = localStorage.getItem('reb_user_cache');
    if (cached) _user = JSON.parse(cached);
  } catch (e) {}

  // ---- HTTP helpers ----
  function headers(extra) {
    var h = { 'Content-Type': 'application/json' };
    if (_token) h['Authorization'] = 'Bearer ' + _token;
    if (extra) Object.keys(extra).forEach(function (k) { h[k] = extra[k]; });
    return h;
  }

  function request(method, path, body) {
    var opts = { method: method, headers: headers() };
    if (body !== undefined) opts.body = JSON.stringify(body);
    return fetch(BASE + path, opts).then(function (res) {
      if (res.status === 401) {
        localStorage.removeItem('reb_jwt');
        localStorage.removeItem('reb_user_cache');
        window.location.href = 'login.html';
        return Promise.reject(new Error('Unauthorized'));
      }
      if (res.status === 402) {
        showTrialExpired();
        return Promise.reject(new Error('Trial expired'));
      }
      return res.json().then(function (data) {
        if (!res.ok) return Promise.reject(data);
        return data;
      });
    }).catch(function (err) {
      // Network errors (offline, server down, CORS)
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        if (typeof showToast === 'function') {
          showToast('Network error — check your connection', 'error');
        }
      }
      return Promise.reject(err);
    });
  }

  function get(path) { return request('GET', path); }
  function post(path, body) { return request('POST', path, body); }
  function put(path, body) { return request('PUT', path, body); }
  function del(path) { return request('DELETE', path); }

  // ---- Auth ----
  function setSession(token, user) {
    _token = token;
    _user = user;
    localStorage.setItem('reb_jwt', token);
    localStorage.setItem('reb_user_cache', JSON.stringify(user));
  }

  function clearSession() {
    _token = null;
    _user = null;
    localStorage.removeItem('reb_jwt');
    localStorage.removeItem('reb_user_cache');
  }

  function getToken() { return _token; }
  function getUser() { return _user; }
  function isLoggedIn() { return !!_token && !!_user; }
  function isPrivileged() { return _user && _user.role === 'Team Lead'; }

  function register(data) {
    return post('/auth/register', data).then(function (res) {
      setSession(res.token, res.user);
      return res;
    });
  }

  function login(username, password, accessCode) {
    return post('/auth/login', { username: username, password: password, accessCode: accessCode }).then(function (res) {
      setSession(res.token, res.user);
      return res;
    });
  }

  function logout() {
    clearSession();
    window.location.href = 'index.html';
  }

  function me() {
    return get('/auth/me').then(function (user) {
      _user = user;
      localStorage.setItem('reb_user_cache', JSON.stringify(user));
      return user;
    });
  }

  // ---- Transactions ----
  function getTransactions(params) {
    var qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return get('/transactions' + qs);
  }
  function getTransaction(id) { return get('/transactions/' + id); }
  function createTransaction(data) { return post('/transactions', data); }
  function updateTransaction(id, data) { return put('/transactions/' + id, data); }
  function deleteTransaction(id) { return del('/transactions/' + id); }

  // ---- Listings ----
  function getListings(params) {
    var qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return get('/listings' + qs);
  }
  function getListing(id) { return get('/listings/' + id); }
  function createListing(data) { return post('/listings', data); }
  function updateListing(id, data) { return put('/listings/' + id, data); }
  function deleteListing(id) { return del('/listings/' + id); }

  // ---- Users (team members) ----
  function getUsers() { return get('/users'); }
  function getUserById(id) { return get('/users/' + id); }
  function createUser(data) { return post('/users', data); }
  function updateUser(id, data) { return put('/users/' + id, data); }
  function deleteUser(id) { return del('/users/' + id); }

  // ---- Settings ----
  function getSettings() { return get('/settings'); }
  function updateSettings(data) { return put('/settings', data); }

  // ---- Team ----
  function getTeam() { return get('/teams'); }
  function updateTeam(data) { return put('/teams', data); }

  // ---- Updates (timeline) ----
  function getUpdates(entityType, entityId) { return get('/updates/' + entityType + '/' + entityId); }
  function createUpdate(data) { return post('/updates', data); }

  // ---- Checklists ----
  function getChecklistTemplates() { return get('/checklists/templates'); }
  function createChecklistTemplate(data) { return post('/checklists/templates', data); }
  function updateChecklistTemplate(id, data) { return put('/checklists/templates/' + id, data); }
  function deleteChecklistTemplate(id) { return del('/checklists/templates/' + id); }
  function getDealChecklist(entityType, entityId) { return get('/checklists/deal/' + entityType + '/' + entityId); }
  function attachChecklist(data) { return post('/checklists/deal', data); }
  function toggleChecklistItem(itemId) { return put('/checklists/items/' + itemId + '/toggle'); }
  function addChecklistItem(checklistId, data) { return post('/checklists/' + checklistId + '/items', data); }
  function deleteChecklistItem(itemId) { return del('/checklists/items/' + itemId); }

  // ---- Portal Links ----
  function getPortalByToken(token) { return get('/portal/' + token); }
  function createPortalLink(data) { return post('/portal', data); }
  function getPortalLinks(entityType, entityId) { return get('/portal/links/' + entityType + '/' + entityId); }

  // ---- Marketing ----
  function getMarketing(params) {
    var qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return get('/marketing' + qs);
  }
  function toggleMarketing(data) { return post('/marketing/toggle', data); }
  function updateMarketingNote(id, note) { return put('/marketing/' + id + '/note', { note: note }); }

  // ---- Reviews ----
  function getReviewRequests(params) {
    var qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return get('/reviews/requests' + qs);
  }
  function createReviewRequest(data) { return post('/reviews/requests', data); }
  function updateReviewRequest(id, data) { return put('/reviews/requests/' + id, data); }
  function deleteReviewRequest(id) { return del('/reviews/requests/' + id); }

  function getReviewScores() { return get('/reviews/scores'); }
  function upsertReviewScore(data) { return post('/reviews/scores', data); }

  function getReviewLinks() { return get('/reviews/links'); }
  function upsertReviewLink(data) { return post('/reviews/links', data); }
  function deleteReviewLink(id) { return del('/reviews/links/' + id); }

  function getEmailTemplates() { return get('/reviews/email-templates'); }
  function createEmailTemplate(data) { return post('/reviews/email-templates', data); }
  function updateEmailTemplate(id, data) { return put('/reviews/email-templates/' + id, data); }
  function deleteEmailTemplate(id) { return del('/reviews/email-templates/' + id); }

  // ---- Misc ----
  function getAnnouncements() { return get('/misc/announcements'); }
  function createAnnouncement(data) { return post('/misc/announcements', data); }
  function updateAnnouncement(id, data) { return put('/misc/announcements/' + id, data); }
  function deleteAnnouncement(id) { return del('/misc/announcements/' + id); }

  function getVendors(params) {
    var qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return get('/misc/vendors' + qs);
  }
  function createVendor(data) { return post('/misc/vendors', data); }
  function updateVendor(id, data) { return put('/misc/vendors/' + id, data); }
  function deleteVendor(id) { return del('/misc/vendors/' + id); }

  function getMeetingNotes(params) {
    var qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return get('/misc/meeting-notes' + qs);
  }
  function createMeetingNote(data) { return post('/misc/meeting-notes', data); }
  function updateMeetingNote(id, data) { return put('/misc/meeting-notes/' + id, data); }
  function deleteMeetingNote(id) { return del('/misc/meeting-notes/' + id); }

  function getAgentGoals(params) {
    var qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return get('/misc/agent-goals' + qs);
  }
  function upsertAgentGoal(data) { return post('/misc/agent-goals', data); }

  function getBold100(params) {
    var qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return get('/misc/bold100' + qs);
  }
  function createBold100(data) { return post('/misc/bold100', data); }
  function deleteBold100(id) { return del('/misc/bold100/' + id); }

  function getKnowledge() { return get('/misc/knowledge'); }
  function createKnowledge(data) { return post('/misc/knowledge', data); }
  function updateKnowledge(id, data) { return put('/misc/knowledge/' + id, data); }
  function deleteKnowledge(id) { return del('/misc/knowledge/' + id); }

  function getRecruits() { return get('/misc/recruits'); }
  function createRecruit(data) { return post('/misc/recruits', data); }
  function updateRecruit(id, data) { return put('/misc/recruits/' + id, data); }
  function deleteRecruit(id) { return del('/misc/recruits/' + id); }

  function getNotifications(params) {
    var qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return get('/misc/notifications' + qs);
  }
  function markNotificationRead(id) { return put('/misc/notifications/' + id + '/read'); }
  function markAllNotificationsRead() { return put('/misc/notifications/read-all'); }

  // ---- Trial Expired Lock Screen ----
  var _expiredShown = false;
  function showTrialExpired() {
    if (_expiredShown) return;
    _expiredShown = true;

    var overlay = document.createElement('div');
    overlay.id = 'trialExpiredOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)';
    overlay.innerHTML =
      '<div style="background:#fff;border-radius:20px;padding:40px;max-width:480px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.2)">' +
        '<div style="font-size:3rem;margin-bottom:12px">⏰</div>' +
        '<h2 style="font-size:1.4rem;font-weight:800;color:#1E293B;margin-bottom:8px">Your Free Trial Has Ended</h2>' +
        '<p style="font-size:.9rem;color:#64748B;margin-bottom:24px;line-height:1.6">Your 1-day free trial of RE Back Office has expired. Upgrade now to keep managing your team, tracking deals, and growing your business.</p>' +
        '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:20px">' +
          '<div style="background:#F8FAFC;border:2px solid #E2E8F0;border-radius:12px;padding:16px 24px;flex:1;min-width:160px">' +
            '<div style="font-size:1.5rem;font-weight:900;color:#1E293B">$49<span style="font-size:.8rem;font-weight:500;color:#94A3B8">/mo</span></div>' +
            '<div style="font-size:.78rem;font-weight:600;color:#64748B;margin-top:2px">Solo Agent</div>' +
          '</div>' +
          '<div style="background:#EEF2FF;border:2px solid #6366F1;border-radius:12px;padding:16px 24px;flex:1;min-width:160px">' +
            '<div style="font-size:1.5rem;font-weight:900;color:#1E293B">$79<span style="font-size:.8rem;font-weight:500;color:#94A3B8">/mo</span></div>' +
            '<div style="font-size:.78rem;font-weight:600;color:#6366F1;margin-top:2px">Team Plan</div>' +
          '</div>' +
        '</div>' +
        '<button id="upgradeBtn" onclick="if(typeof API!==\'undefined\'&&API.createCheckout){API.createCheckout(\'solo\',\'monthly\').then(function(r){window.location.href=r.url}).catch(function(){window.location.href=\'mailto:support@eliteregbackoffice.com?subject=Upgrade%20Request\'})}else{window.location.href=\'mailto:support@eliteregbackoffice.com?subject=Upgrade%20Request\'}" style="background:#6366F1;color:#fff;border:none;padding:14px 36px;border-radius:10px;font-size:.95rem;font-weight:700;cursor:pointer;width:100%;transition:background .15s">Upgrade Now</button>' +
        '<div style="margin-top:12px">' +
          '<button onclick="API.logout()" style="background:none;border:none;color:#94A3B8;font-size:.82rem;cursor:pointer;text-decoration:underline">Sign Out</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
  }

  // Password
  function changePassword(currentPassword, newPassword) {
    return post('/auth/change-password', { currentPassword: currentPassword, newPassword: newPassword });
  }

  // Billing
  function getBillingStatus() { return get('/billing/status'); }
  function createCheckout(plan, interval) { return post('/billing/create-checkout', { plan: plan, interval: interval }); }
  function openBillingPortal() { return post('/billing/portal'); }

  // Check subscription status on load
  function checkSubscription() {
    if (!isLoggedIn()) return;
    var user = getUser();
    if (user && user.subscriptionStatus === 'expired') {
      showTrialExpired();
    }
  }

  // Auto-check after a short delay to allow page to render
  if (typeof window !== 'undefined') {
    setTimeout(function () { checkSubscription(); }, 500);
  }

  // ---- Public API ----
  return {
    // Auth
    register: register, login: login, logout: logout, me: me,
    getToken: getToken, getUser: getUser, isLoggedIn: isLoggedIn, isPrivileged: isPrivileged,
    setSession: setSession, clearSession: clearSession,

    // Transactions
    getTransactions: getTransactions, getTransaction: getTransaction,
    createTransaction: createTransaction, updateTransaction: updateTransaction, deleteTransaction: deleteTransaction,

    // Listings
    getListings: getListings, getListing: getListing,
    createListing: createListing, updateListing: updateListing, deleteListing: deleteListing,

    // Users
    getUsers: getUsers, getUserById: getUserById,
    createUser: createUser, updateUser: updateUser, deleteUser: deleteUser,

    // Settings
    getSettings: getSettings, updateSettings: updateSettings,

    // Team
    getTeam: getTeam, updateTeam: updateTeam,

    // Updates
    getUpdates: getUpdates, createUpdate: createUpdate,

    // Checklists
    getChecklistTemplates: getChecklistTemplates, createChecklistTemplate: createChecklistTemplate,
    updateChecklistTemplate: updateChecklistTemplate, deleteChecklistTemplate: deleteChecklistTemplate,
    getDealChecklist: getDealChecklist, attachChecklist: attachChecklist,
    toggleChecklistItem: toggleChecklistItem, addChecklistItem: addChecklistItem, deleteChecklistItem: deleteChecklistItem,

    // Portal
    getPortalByToken: getPortalByToken, createPortalLink: createPortalLink, getPortalLinks: getPortalLinks,

    // Marketing
    getMarketing: getMarketing, toggleMarketing: toggleMarketing, updateMarketingNote: updateMarketingNote,

    // Reviews
    getReviewRequests: getReviewRequests, createReviewRequest: createReviewRequest,
    updateReviewRequest: updateReviewRequest, deleteReviewRequest: deleteReviewRequest,
    getReviewScores: getReviewScores, upsertReviewScore: upsertReviewScore,
    getReviewLinks: getReviewLinks, upsertReviewLink: upsertReviewLink, deleteReviewLink: deleteReviewLink,
    getEmailTemplates: getEmailTemplates, createEmailTemplate: createEmailTemplate,
    updateEmailTemplate: updateEmailTemplate, deleteEmailTemplate: deleteEmailTemplate,

    // Misc
    getAnnouncements: getAnnouncements, createAnnouncement: createAnnouncement,
    updateAnnouncement: updateAnnouncement, deleteAnnouncement: deleteAnnouncement,
    getVendors: getVendors, createVendor: createVendor, updateVendor: updateVendor, deleteVendor: deleteVendor,
    getMeetingNotes: getMeetingNotes, createMeetingNote: createMeetingNote,
    updateMeetingNote: updateMeetingNote, deleteMeetingNote: deleteMeetingNote,
    getAgentGoals: getAgentGoals, upsertAgentGoal: upsertAgentGoal,
    getBold100: getBold100, createBold100: createBold100, deleteBold100: deleteBold100,
    getKnowledge: getKnowledge, createKnowledge: createKnowledge,
    updateKnowledge: updateKnowledge, deleteKnowledge: deleteKnowledge,
    getRecruits: getRecruits, createRecruit: createRecruit,
    updateRecruit: updateRecruit, deleteRecruit: deleteRecruit,
    getNotifications: getNotifications, markNotificationRead: markNotificationRead,
    markAllNotificationsRead: markAllNotificationsRead,

    // Password & Billing
    changePassword: changePassword,
    getBillingStatus: getBillingStatus, createCheckout: createCheckout, openBillingPortal: openBillingPortal
  };
})();
