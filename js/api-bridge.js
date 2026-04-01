/* ============================================================
   RE Back Office — API Bridge
   Bridges the existing localStorage-based frontend with the
   new server API. Loads data from API into localStorage on
   page load so existing code works unchanged, then syncs
   writes back to the server.
   ============================================================ */

var ApiBridge = (function () {
  'use strict';

  var PREFIX = 'reb_';
  var _syncing = false;
  var _loaded = false;

  // Check if we're running with the server (not file:// protocol)
  function isServerMode() {
    return window.location.protocol !== 'file:' && API && API.isLoggedIn();
  }

  // Load all data from server into localStorage
  function loadAll() {
    if (!isServerMode()) return Promise.resolve();
    if (_loaded) return Promise.resolve();

    _syncing = true;

    return Promise.all([
      API.getUsers().then(function (users) {
        // Map server format to localStorage format
        var mapped = users.map(function (u) {
          return {
            id: u.id,
            username: u.username,
            password: '***', // Don't store real passwords client-side
            displayName: u.display_name,
            role: u.role,
            phone: u.phone,
            email: u.email,
            assignedTo: u.assigned_to
          };
        });
        localStorage.setItem(PREFIX + 'users', JSON.stringify(mapped));
      }).catch(function () {}),

      API.getTransactions().then(function (txns) {
        var mapped = txns.map(function (t) {
          return {
            id: t.id,
            address: t.address,
            city: t.city,
            state: t.state,
            zip: t.zip,
            type: t.type,
            status: t.status,
            price: parseFloat(t.price) || 0,
            agent: t.agent_name,
            agentId: t.agent_id,
            source: t.source,
            closeDate: t.close_date,
            notes: t.notes,
            createdAt: t.created_at
          };
        });
        localStorage.setItem(PREFIX + 'transactions', JSON.stringify(mapped));
      }).catch(function () {}),

      API.getListings().then(function (lsts) {
        var mapped = lsts.map(function (l) {
          return {
            id: l.id,
            address: l.address,
            city: l.city,
            state: l.state,
            zip: l.zip,
            status: l.status,
            price: parseFloat(l.price) || 0,
            agent: l.agent_name,
            agentId: l.agent_id,
            beds: l.beds,
            baths: l.baths,
            sqft: l.sqft,
            description: l.description,
            source: l.source,
            listingDate: l.listing_date,
            propertyType: l.property_type,
            createdAt: l.created_at
          };
        });
        localStorage.setItem(PREFIX + 'listings', JSON.stringify(mapped));
      }).catch(function () {}),

      API.getSettings().then(function (settings) {
        if (settings) localStorage.setItem(PREFIX + 'admin_settings', JSON.stringify(settings));
      }).catch(function () {}),

      API.getAnnouncements().then(function (anns) {
        var mapped = anns.map(function (a) {
          return { id: a.id, text: a.text, author: a.author_name, timestamp: a.created_at, pinned: a.pinned };
        });
        localStorage.setItem(PREFIX + 'announcements', JSON.stringify(mapped));
      }).catch(function () {}),

      API.getChecklistTemplates().then(function (templates) {
        var mapped = templates.map(function (t) {
          return {
            id: t.id,
            name: t.name,
            category: t.category,
            items: (t.checklist_template_items || []).map(function (item) {
              return { id: item.id, label: item.label };
            })
          };
        });
        localStorage.setItem(PREFIX + 'checklist_templates', JSON.stringify(mapped));
      }).catch(function () {})

    ]).then(function () {
      _loaded = true;
      _syncing = false;
      // Update session from API user cache
      var user = API.getUser();
      if (user) {
        localStorage.setItem(PREFIX + 'session', JSON.stringify({
          username: user.username,
          displayName: user.displayName,
          role: user.role,
          loggedInAt: new Date().toISOString()
        }));
      }
    }).catch(function () {
      _syncing = false;
    });
  }

  // Intercept localStorage.setItem to sync writes to server
  function interceptWrites() {
    if (!isServerMode()) return;

    var origSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function (key, value) {
      // Always write to localStorage first
      origSetItem(key, value);

      // Don't sync during initial load
      if (_syncing) return;

      // Sync specific keys back to server
      if (key === PREFIX + 'admin_settings') {
        try {
          var settings = JSON.parse(value);
          API.updateSettings(settings).catch(function () {});
        } catch (e) {}
      }
    };
  }

  // Initialize — call on page load
  function init() {
    if (!isServerMode()) return Promise.resolve();
    interceptWrites();
    return loadAll();
  }

  return {
    init: init,
    loadAll: loadAll,
    isServerMode: isServerMode
  };
})();
