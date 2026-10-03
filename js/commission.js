/* ============================================================
   RE Back Office — Commission resolution

   One source of truth for "what did this deal actually pay?".
   Used by the Wins page (closed.js) and the Tax Center
   (tax-center.js) so the two can never drift apart.

   Agents don't all earn the same slice: each has their own
   commission rate and their own broker split. A deal is valued
   by the best source available, in order:

     1. the exact take-home the agent typed on that deal
     2. that agent's own rate x split from their Tax Center
     3. the team default from Admin Settings
     4. a legacy flat rate

   Anything below step 1 is an estimate and is labelled as one —
   a projection must never be mistaken for real pay.
   ============================================================ */

var Commission = (function () {
  'use strict';

  var PREFIX = 'reb_';
  var LEGACY_RATE = 0.0225; // what the Wins page assumed for everyone before

  // ---- Storage helpers ----
  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function usersList() { return readJSON(PREFIX + 'users', []) || []; }

  // Tax settings are keyed by username; deals record the agent's display name.
  function usernameFor(displayName) {
    if (!displayName) return null;
    var match = usersList().filter(function (u) {
      return (u.displayName || u.username) === displayName;
    })[0];
    return match ? match.username : null;
  }

  function displayNameFor(username) {
    if (!username) return null;
    var match = usersList().filter(function (u) { return u.username === username; })[0];
    return match ? (match.displayName || match.username) : null;
  }

  function currentUsername() {
    var sess = readJSON(PREFIX + 'session', {}) || {};
    if (sess.username) return sess.username;
    try {
      if (typeof API !== 'undefined' && API.isLoggedIn()) {
        var u = API.getUser();
        if (u && u.username) return u.username;
      }
    } catch (e) {}
    return null;
  }

  // Admin Settings lives in auth.js; fall back gracefully if it isn't loaded.
  function adminSetting(key, fallback) {
    try {
      if (typeof getAdminSetting === 'function') return getAdminSetting(key, fallback);
    } catch (e) {}
    return fallback;
  }

  // ---- Rate + split for one agent ----
  function taxSettingsForAgent(displayName) {
    var all = readJSON(PREFIX + 'tax_settings_all', {}) || {};
    var uname = usernameFor(displayName);
    if (uname && all[uname]) return all[uname];
    // The signed-in user's own slot lives in its own key and stays freshest.
    if (uname && uname === currentUsername()) {
      var mine = readJSON(PREFIX + 'tax_settings', null);
      if (mine) return mine;
    }
    return null;
  }

  // Returns { rate, split, source } where source is
  // 'tax' | 'team' | 'legacy'.
  function rateSplitFor(displayName) {
    var t = taxSettingsForAgent(displayName);
    if (t && t.commissionRate > 0 && t.agentSplit > 0) {
      return { rate: t.commissionRate, split: t.agentSplit, source: 'tax' };
    }
    var teamRate = parseFloat(adminSetting('general.defaultCommissionRate', 0)) || 0;
    var teamSplit = parseFloat(adminSetting('general.defaultAgentSplit', 0)) || 0;
    if (teamRate > 0 && teamSplit > 0) {
      return { rate: teamRate, split: teamSplit, source: 'team' };
    }
    return { rate: LEGACY_RATE, split: 1, source: 'legacy' };
  }

  // ---- Per-deal resolution ----
  // An empty box means "not entered" and is deliberately distinct from a
  // typed 0, which is a real answer ("I took home nothing on this one").
  function hasTyped(t) {
    return !!t && t.commission !== null && t.commission !== undefined && t.commission !== '';
  }

  function sourceOf(t) {
    if (hasTyped(t)) return 'actual';
    return rateSplitFor(t && t.agent).source;
  }

  function forDeal(t) {
    if (!t) return 0;
    if (hasTyped(t)) {
      var typed = parseFloat(t.commission);
      if (!isNaN(typed)) return typed;
    }
    var rs = rateSplitFor(t.agent);
    return (parseFloat(t.price) || 0) * rs.rate * rs.split;
  }

  function sum(list) {
    return (list || []).reduce(function (s, t) { return s + forDeal(t); }, 0);
  }

  function countTyped(list) {
    return (list || []).filter(hasTyped).length;
  }

  // "9 of 12 actual" / "all 12 actual" / "all estimated"
  function accuracyNote(list) {
    var total = (list || []).length;
    if (!total) return '';
    var typed = countTyped(list);
    if (typed === 0) return 'all estimated';
    if (typed === total) return 'all ' + total + ' actual';
    return typed + ' of ' + total + ' actual';
  }

  // Parse "$18,750" -> 18750; empty -> null (clears the override).
  function parseInput(v) {
    var raw = String(v == null ? '' : v).replace(/[^0-9.]/g, '');
    if (raw === '') return null;
    var n = parseFloat(raw);
    return isNaN(n) ? null : n;
  }

  // ---- Closed deals as income ----
  // `username` filters to one agent; pass null/'all' for the whole team.
  // `year` optionally restricts to one calendar year.
  function closedDeals(username, year) {
    var txns = [];
    try { txns = (typeof Data !== 'undefined' ? Data.getTransactions() : []) || []; } catch (e) {}
    var wantName = (username && username !== 'all') ? displayNameFor(username) : null;

    return txns.filter(function (t) {
      if (t.status !== 'closed' || !t.closeDate) return false;
      if (wantName && t.agent !== wantName) return false;
      if (year && String(t.closeDate).slice(0, 4) !== String(year)) return false;
      return true;
    });
  }

  // Closed deals shaped like Tax Center income rows. These are derived, never
  // stored: editing a deal updates them, and nothing here can be hand-edited
  // out of sync with the deal it came from.
  function incomeRows(username, year) {
    return closedDeals(username, year)
      .map(function (t) {
        return {
          id: t.id,
          date: t.closeDate,
          amount: forDeal(t),
          address: t.address || 'Closed deal',
          agent: t.agent || '',
          price: parseFloat(t.price) || 0,
          estimated: !hasTyped(t),
          source: sourceOf(t)
        };
      })
      .sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
  }

  function incomeTotal(username, year) {
    return incomeRows(username, year).reduce(function (s, r) { return s + r.amount; }, 0);
  }

  return {
    LEGACY_RATE: LEGACY_RATE,
    rateSplitFor: rateSplitFor,
    hasTyped: hasTyped,
    source: sourceOf,
    forDeal: forDeal,
    sum: sum,
    countTyped: countTyped,
    accuracyNote: accuracyNote,
    parseInput: parseInput,
    usernameFor: usernameFor,
    displayNameFor: displayNameFor,
    closedDeals: closedDeals,
    incomeRows: incomeRows,
    incomeTotal: incomeTotal
  };
})();
