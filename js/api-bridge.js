/* ============================================================
   RE Back Office — API Bridge
   Full sync layer: loads all data from server into localStorage
   on page load, and intercepts all writes to push to the database.
   ============================================================ */

var ApiBridge = (function () {
  'use strict';

  var PREFIX = 'reb_';
  var _syncing = false;
  var _loaded = false;
  var _rawGoals = [];

  function isServerMode() {
    return window.location.protocol !== 'file:' && typeof API !== 'undefined' && API.isLoggedIn();
  }

  // ---- Map server → localStorage formats ----
  function mapUsers(users) {
    return users.map(function (u) {
      return { id: u.id, username: u.username, password: '***', displayName: u.display_name, role: u.role, phone: u.phone, email: u.email, assignedTo: u.assigned_to, profile: u.profile };
    });
  }
  function mapTransactions(txns) {
    return txns.map(function (t) {
      return { id: t.id, address: t.address, city: t.city, state: t.state, zip: t.zip, type: t.type, status: t.status, price: parseFloat(t.price) || 0, agent: t.agent_name, agentId: t.agent_id, source: t.source, closeDate: t.close_date, notes: t.notes, createdAt: t.created_at };
    });
  }
  function mapListings(lsts) {
    return lsts.map(function (l) {
      return { id: l.id, address: l.address, city: l.city, state: l.state, zip: l.zip, status: l.status, price: parseFloat(l.price) || 0, agent: l.agent_name, agentId: l.agent_id, beds: l.beds, baths: l.baths, sqft: l.sqft, description: l.description, source: l.source, listingDate: l.listing_date, propertyType: l.property_type, createdAt: l.created_at };
    });
  }
  function mapAnnouncements(anns) {
    return anns.map(function (a) {
      return { id: a.id, text: a.text, author: a.author_name, timestamp: a.created_at, pinned: a.pinned };
    });
  }
  function mapTemplates(templates) {
    return templates.map(function (t) {
      return { id: t.id, name: t.name, category: t.category, items: (t.checklist_template_items || []).map(function (item) { return { id: item.id, label: item.label }; }) };
    });
  }

  // ---- Load all data from server ----
  function loadAll() {
    if (!isServerMode()) return Promise.resolve();
    if (_loaded) return Promise.resolve();
    _syncing = true;

    var loads = [
      API.getUsers().then(function (d) { localStorage.setItem(PREFIX + 'users', JSON.stringify(mapUsers(d))); }).catch(function () {}),
      API.getTransactions().then(function (d) {
        var serverTxns = mapTransactions(d);
        var serverIds = {};
        serverTxns.forEach(function (t) { serverIds[t.id] = true; });
        // Find local-only transactions and push them to the server
        var existing = JSON.parse(localStorage.getItem(PREFIX + 'transactions') || '[]');
        var localOnly = existing.filter(function (t) { return !serverIds[t.id] && !serverIds[t.server_id]; });
        var pushPromises = localOnly.map(function (t) {
          return API.createTransaction({
            address: t.address, city: t.city || '', state: t.state || '', zip: t.zip || '',
            type: t.type || 'Buyer', status: t.status || 'pending',
            price: t.price || 0, agent_name: t.agent || '', source: t.source || '',
            close_date: t.closeDate || null, notes: t.notes || ''
          }).then(function (created) {
            if (created && created.id) t.server_id = created.id;
          }).catch(function () {});
        });
        return Promise.all(pushPromises).then(function () {
          // Re-fetch after push so everyone sees the full list
          return localOnly.length > 0 ? API.getTransactions() : Promise.resolve(d);
        }).then(function (fresh) {
          var finalTxns = mapTransactions(fresh);
          localStorage.setItem(PREFIX + 'transactions', JSON.stringify(finalTxns));
        });
      }).catch(function () {}),
      API.getListings().then(function (d) {
        var serverLsts = mapListings(d);
        var serverIds = {};
        serverLsts.forEach(function (l) { serverIds[l.id] = true; });
        // Find local-only listings and push them to the server
        var existing = JSON.parse(localStorage.getItem(PREFIX + 'listings') || '[]');
        // Build map: server_id → local_id so we can migrate party data after overwrite
        var serverToLocalId = {};
        existing.forEach(function (l) { if (l.server_id) serverToLocalId[l.server_id] = l.id; });
        var localOnly = existing.filter(function (l) { return !serverIds[l.id] && !serverIds[l.server_id]; });
        var pushPromises = localOnly.map(function (l) {
          return API.createListing({
            address: l.address, city: l.city || '', state: l.state || '', zip: l.zip || '',
            status: l.status || 'active', price: l.price || 0, agent_name: l.agent || '',
            beds: l.beds || null, baths: l.baths || null, sqft: l.sqft || null,
            source: l.source || '', listing_date: l.listingDate || null,
            property_type: l.propertyType || '', description: l.description || ''
          }).then(function (created) {
            // Track newly pushed listing so we can migrate its parties
            if (created && created.id) serverToLocalId[created.id] = l.id;
          }).catch(function () {});
        });
        return Promise.all(pushPromises).then(function () {
          return localOnly.length > 0 ? API.getListings() : Promise.resolve(d);
        }).then(function (fresh) {
          // Migrate listing parties from old local IDs to server UUIDs
          try {
            var lstParties = JSON.parse(localStorage.getItem(PREFIX + 'lst_parties') || '{}');
            var migrated = false;
            Object.keys(serverToLocalId).forEach(function (serverId) {
              var localId = serverToLocalId[serverId];
              if (localId && localId !== serverId && lstParties[localId]) {
                lstParties[serverId] = lstParties[localId];
                delete lstParties[localId];
                migrated = true;
              }
            });
            if (migrated) localStorage.setItem(PREFIX + 'lst_parties', JSON.stringify(lstParties));
          } catch (e) {}
          localStorage.setItem(PREFIX + 'listings', JSON.stringify(mapListings(fresh)));
        });
      }).catch(function () {}),
      API.getSettings().then(function (d) { if (d) localStorage.setItem(PREFIX + 'admin_settings', JSON.stringify(d)); }).catch(function () {}),
      API.getAnnouncements().then(function (d) { localStorage.setItem(PREFIX + 'announcements', JSON.stringify(mapAnnouncements(d))); }).catch(function () {}),
      API.getChecklistTemplates().then(function (d) { localStorage.setItem(PREFIX + 'checklist_templates', JSON.stringify(mapTemplates(d))); }).catch(function () {}),
      API.getVendors().then(function (d) { if (d && d.length > 0) localStorage.setItem(PREFIX + 'vendors', JSON.stringify(d)); }).catch(function () {}),
      API.getReviewRequests().then(function (d) { localStorage.setItem(PREFIX + 'review_requests', JSON.stringify(d)); }).catch(function () {}),
      API.getReviewScores().then(function (d) { localStorage.setItem(PREFIX + 'review_scorecard', JSON.stringify(d)); }).catch(function () {}),
      API.getReviewLinks().then(function (d) { localStorage.setItem(PREFIX + 'review_links', JSON.stringify(d)); }).catch(function () {}),
      API.getEmailTemplates().then(function (d) { localStorage.setItem(PREFIX + 'review_templates', JSON.stringify(d)); }).catch(function () {}),
      API.getMeetingNotes().then(function (d) { localStorage.setItem(PREFIX + 'meeting_notes', JSON.stringify(d)); }).catch(function () {}),
      API.getAgentGoals().then(function (d) { _rawGoals = d || []; }).catch(function () {}),
      // Knowledge base handled by its own seed logic — don't overwrite
      Promise.resolve(),
      API.getRecruits().then(function (d) { if (d && d.length > 0) localStorage.setItem(PREFIX + 'recruits', JSON.stringify(d)); }).catch(function () {}),
      API.getBold100().then(function (d) { localStorage.setItem(PREFIX + 'bold100', JSON.stringify(d)); }).catch(function () {}),
      API.getNotifications().then(function (d) { localStorage.setItem(PREFIX + 'notifications', JSON.stringify(d)); }).catch(function () {})
    ];

    return Promise.all(loads).then(function () {
      _loaded = true;
      // Transform agent goals array → { username: { closings, volume } } while _syncing is still true
      var loadedUsers = JSON.parse(localStorage.getItem(PREFIX + 'users') || '[]');
      var goalsMap = {};
      _rawGoals.forEach(function (g) {
        var u = loadedUsers.find(function (u) { return u.id === g.user_id; });
        if (u) goalsMap[u.username] = { closings: g.closings_goal || 8, volume: g.volume_goal || 2000000 };
      });
      // Always write (even {} to clear any stale array format from old bridge versions)
      localStorage.setItem(PREFIX + 'agent_goals', JSON.stringify(goalsMap));
      _syncing = false;
      var user = API.getUser();
      if (user) {
        localStorage.setItem(PREFIX + 'session', JSON.stringify({
          username: user.username,
          displayName: user.displayName,
          role: user.role,
          loggedInAt: new Date().toISOString()
        }));
      }
    }).catch(function () { _syncing = false; });
  }

  // ---- Debounce helper ----
  var _debounceTimers = {};
  function debounceSync(key, fn, delay) {
    if (_debounceTimers[key]) clearTimeout(_debounceTimers[key]);
    _debounceTimers[key] = setTimeout(fn, delay || 500);
  }

  // ---- Intercept all localStorage writes and sync to server ----
  function interceptWrites() {
    if (!isServerMode()) return;
    var origSetItem = localStorage.setItem.bind(localStorage);

    localStorage.setItem = function (key, value) {
      origSetItem(key, value);
      if (_syncing) return;

      // Settings
      if (key === PREFIX + 'admin_settings') {
        debounceSync('settings', function () {
          try { API.updateSettings(JSON.parse(value)).catch(function () {}); } catch (e) {}
        }, 1000);
      }

      // Vendors
      if (key === PREFIX + 'vendors') {
        debounceSync('vendors', function () {
          try {
            var items = JSON.parse(value);
            // Full replace — delete all then re-create (simple approach for localStorage-based pages)
            API.getVendors().then(function (existing) {
              var deletes = existing.map(function (v) { return API.deleteVendor(v.id).catch(function () {}); });
              return Promise.all(deletes);
            }).then(function () {
              var creates = items.map(function (v) { return API.createVendor(v).catch(function () {}); });
              return Promise.all(creates);
            }).catch(function () {});
          } catch (e) {}
        }, 2000);
      }

      // Announcements
      if (key === PREFIX + 'announcements') {
        debounceSync('announcements', function () {
          try {
            var items = JSON.parse(value);
            API.getAnnouncements().then(function (existing) {
              return Promise.all(existing.map(function (a) { return API.deleteAnnouncement(a.id).catch(function () {}); }));
            }).then(function () {
              return Promise.all(items.map(function (a) {
                return API.createAnnouncement({ text: a.text, author_name: a.author, pinned: a.pinned }).catch(function () {});
              }));
            }).catch(function () {});
          } catch (e) {}
        }, 2000);
      }

      // Meeting Notes
      if (key === PREFIX + 'meeting_notes') {
        debounceSync('meeting_notes', function () {
          try {
            var items = JSON.parse(value);
            API.getMeetingNotes().then(function (existing) {
              return Promise.all(existing.map(function (n) { return API.deleteMeetingNote(n.id).catch(function () {}); }));
            }).then(function () {
              return Promise.all(items.map(function (n) { return API.createMeetingNote(n).catch(function () {}); }));
            }).catch(function () {});
          } catch (e) {}
        }, 2000);
      }

      // Knowledge Base — synced via settings JSONB instead of individual API calls
      if (key === PREFIX + 'knowledge_base') {
        debounceSync('knowledge', function () {
          try { API.updateSettings({ _knowledge_base: JSON.parse(value) }).catch(function () {}); } catch (e) {}
        }, 2000);
      }

      // Recruits
      if (key === PREFIX + 'recruits') {
        debounceSync('recruits', function () {
          try {
            var items = JSON.parse(value);
            API.getRecruits().then(function (existing) {
              return Promise.all(existing.map(function (r) { return API.deleteRecruit(r.id).catch(function () {}); }));
            }).then(function () {
              return Promise.all(items.map(function (r) { return API.createRecruit(r).catch(function () {}); }));
            }).catch(function () {});
          } catch (e) {}
        }, 2000);
      }

      // Tax Entries
      if (key === PREFIX + 'tax_entries') {
        debounceSync('tax_entries', function () {
          try { API.updateSettings({ _tax_entries: JSON.parse(value) }).catch(function () {}); } catch (e) {}
        }, 2000);
      }

      // Mileage
      if (key === PREFIX + 'mileage') {
        debounceSync('mileage', function () {
          try { API.updateSettings({ _mileage: JSON.parse(value) }).catch(function () {}); } catch (e) {}
        }, 2000);
      }

      // Marketing activities
      if (key === PREFIX + 'marketing') {
        debounceSync('marketing', function () {
          try { API.updateSettings({ _marketing: JSON.parse(value) }).catch(function () {}); } catch (e) {}
        }, 2000);
      }

      // Bold 100
      if (key === PREFIX + 'bold100') {
        debounceSync('bold100', function () {
          try { API.updateSettings({ _bold100: JSON.parse(value) }).catch(function () {}); } catch (e) {}
        }, 2000);
      }

      // Review requests
      if (key === PREFIX + 'review_requests') {
        debounceSync('review_requests', function () {
          try { API.updateSettings({ _review_requests: JSON.parse(value) }).catch(function () {}); } catch (e) {}
        }, 2000);
      }

      // Review scorecard
      if (key === PREFIX + 'review_scorecard') {
        debounceSync('review_scorecard', function () {
          try { API.updateSettings({ _review_scorecard: JSON.parse(value) }).catch(function () {}); } catch (e) {}
        }, 2000);
      }

      // Review links
      if (key === PREFIX + 'review_links') {
        debounceSync('review_links', function () {
          try { API.updateSettings({ _review_links: JSON.parse(value) }).catch(function () {}); } catch (e) {}
        }, 2000);
      }

      // Review templates
      if (key === PREFIX + 'review_templates') {
        debounceSync('review_templates', function () {
          try { API.updateSettings({ _review_templates: JSON.parse(value) }).catch(function () {}); } catch (e) {}
        }, 2000);
      }

      // Agent goals — upsert each user's goal to the agent_goals table
      if (key === PREFIX + 'agent_goals') {
        debounceSync('agent_goals', function () {
          try {
            var goalsMap = JSON.parse(value);
            var savedUsers = JSON.parse(localStorage.getItem(PREFIX + 'users') || '[]');
            var year = new Date().getFullYear();
            Object.keys(goalsMap).forEach(function (username) {
              var g = goalsMap[username];
              var u = savedUsers.find(function (u) { return u.username === username; });
              API.upsertAgentGoal({
                user_id: u ? u.id : undefined,
                year: year,
                closings_goal: g.closings || 0,
                volume_goal: g.volume || 0
              }).catch(function () {});
            });
          } catch (e) {}
        }, 2000);
      }

      // Checklist templates
      if (key === PREFIX + 'checklist_templates') {
        debounceSync('checklist_templates', function () {
          try { API.updateSettings({ _checklist_templates: JSON.parse(value) }).catch(function () {}); } catch (e) {}
        }, 2000);
      }

      // Deal checklists
      if (key === PREFIX + 'deal_checklists') {
        debounceSync('deal_checklists', function () {
          try { API.updateSettings({ _deal_checklists: JSON.parse(value) }).catch(function () {}); } catch (e) {}
        }, 2000);
      }

      // Transaction updates (portal timeline)
      if (key === PREFIX + 'txn_updates') {
        debounceSync('txn_updates', function () {
          try { API.updateSettings({ _txn_updates: JSON.parse(value) }).catch(function () {}); } catch (e) {}
        }, 2000);
      }

      // Listing updates (portal timeline)
      if (key === PREFIX + 'lst_updates') {
        debounceSync('lst_updates', function () {
          try { API.updateSettings({ _lst_updates: JSON.parse(value) }).catch(function () {}); } catch (e) {}
        }, 2000);
      }

      // Transaction parties
      if (key === PREFIX + 'txn_parties') {
        debounceSync('txn_parties', function () {
          try { API.updateSettings({ _txn_parties: JSON.parse(value) }).catch(function () {}); } catch (e) {}
        }, 2000);
      }

      // Listing parties
      if (key === PREFIX + 'lst_parties') {
        debounceSync('lst_parties', function () {
          try { API.updateSettings({ _lst_parties: JSON.parse(value) }).catch(function () {}); } catch (e) {}
        }, 2000);
      }

      // Portal links
      if (key === PREFIX + 'portal_links') {
        debounceSync('portal_links', function () {
          try { API.updateSettings({ _portal_links: JSON.parse(value) }).catch(function () {}); } catch (e) {}
        }, 2000);
      }

      // Portal config
      if (key === PREFIX + 'portal_config') {
        debounceSync('portal_config', function () {
          try { API.updateSettings({ _portal_config: JSON.parse(value) }).catch(function () {}); } catch (e) {}
        }, 2000);
      }

      // Marketing config
      if (key === PREFIX + 'marketing_config') {
        debounceSync('marketing_config', function () {
          try { API.updateSettings({ _marketing_config: JSON.parse(value) }).catch(function () {}); } catch (e) {}
        }, 2000);
      }

      // Profiles
      if (key === PREFIX + 'profiles') {
        debounceSync('profiles', function () {
          try { API.updateSettings({ _profiles: JSON.parse(value) }).catch(function () {}); } catch (e) {}
        }, 2000);
      }

      // Notifications
      if (key === PREFIX + 'notifications') {
        debounceSync('notifications', function () {
          try { API.updateSettings({ _notifications: JSON.parse(value) }).catch(function () {}); } catch (e) {}
        }, 2000);
      }
    };
  }

  // ---- Load settings-stored data back into localStorage ----
  function loadSettingsData(settings) {
    if (!settings) return;
    var keys = [
      '_tax_entries:tax_entries', '_mileage:mileage', '_marketing:marketing',
      '_bold100:bold100', '_review_requests:review_requests', '_review_scorecard:review_scorecard',
      '_review_links:review_links', '_review_templates:review_templates',
      '_agent_goals:agent_goals', '_checklist_templates:checklist_templates',
      '_deal_checklists:deal_checklists', '_txn_updates:txn_updates', '_lst_updates:lst_updates',
      '_txn_parties:txn_parties', '_lst_parties:lst_parties', '_portal_links:portal_links',
      '_portal_config:portal_config', '_marketing_config:marketing_config',
      '_profiles:profiles', '_notifications:notifications'
    ];
    keys.forEach(function (k) {
      var parts = k.split(':');
      var settingsKey = parts[0];
      var localKey = parts[1];
      if (settings[settingsKey] !== undefined && settings[settingsKey] !== null) {
        localStorage.setItem(PREFIX + localKey, JSON.stringify(settings[settingsKey]));
      }
    });
  }

  // ---- Initialize ----
  function init() {
    if (!isServerMode()) return Promise.resolve();
    interceptWrites();
    return loadAll().then(function () {
      // Also load settings-stored data
      try {
        var settings = JSON.parse(localStorage.getItem(PREFIX + 'admin_settings') || '{}');
        loadSettingsData(settings);
      } catch (e) {}
    });
  }

  return {
    init: init,
    loadAll: loadAll,
    isServerMode: isServerMode
  };
})();
