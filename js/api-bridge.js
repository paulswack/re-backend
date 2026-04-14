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
      return { id: l.id, address: l.address, city: l.city || '', state: l.state || '', zip: l.zip || '', status: l.status, price: parseFloat(l.price) || 0, agent: l.agent_name, agentId: l.agent_id, beds: l.beds, baths: l.baths, sqft: l.sqft, description: l.description, source: l.source, listingDate: l.listing_date, propertyType: l.property_type || '', createdAt: l.created_at, updatedAt: l.updated_at || l.created_at };
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

    // UUID format check — used to detect server-synced IDs vs local IDs
    var uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    var loads = [
      API.getUsers().then(function (d) { localStorage.setItem(PREFIX + 'users', JSON.stringify(mapUsers(d))); }).catch(function () {}),
      API.getTransactions().then(function (d) {
        var serverTxns = mapTransactions(d);
        var serverIds = {};
        serverTxns.forEach(function (t) { serverIds[t.id] = true; });
        // Find local-only transactions and push them to the server.
        // Only push records with a local-format ID and no server_id — records that
        // have server_id (or a UUID-format ID) were previously synced and their
        // absence from the server means they were intentionally deleted.
        var existing = JSON.parse(localStorage.getItem(PREFIX + 'transactions') || '[]');
        var localOnly = existing.filter(function (t) {
          return !serverIds[t.id] && !serverIds[t.server_id] && !t.server_id && !uuidRe.test(t.id);
        });
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
        // Find local-only listings and push them to the server.
        // Only push records with a local-format ID and no server_id — records that
        // have server_id (or a UUID-format ID) were previously synced and their
        // absence from the server means they were intentionally deleted.
        var existing = JSON.parse(localStorage.getItem(PREFIX + 'listings') || '[]');
        // Build map: server_id → local_id so we can migrate party data after overwrite
        var serverToLocalId = {};
        existing.forEach(function (l) { if (l.server_id) serverToLocalId[l.server_id] = l.id; });
        var localOnly = existing.filter(function (l) {
          return !serverIds[l.id] && !serverIds[l.server_id] && !l.server_id && !uuidRe.test(l.id);
        });
        var pushPromises = localOnly.map(function (l) {
          return API.createListing({
            address: l.address, city: l.city || '', state: l.state || '', zip: l.zip || '',
            status: l.status || 'active', price: l.price || 0,
            agent_name: l.agent || '',
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
          // freshMapped declared here so it's accessible both inside and after the try block
          var freshMapped = mapListings(fresh);
          // Migrate listing parties from old local IDs to server UUIDs
          try {
            var lstParties = JSON.parse(localStorage.getItem(PREFIX + 'lst_parties') || '{}');
            var migrated = false;
            // Pass 1: migrate by known ID mapping
            Object.keys(serverToLocalId).forEach(function (serverId) {
              var localId = serverToLocalId[serverId];
              if (localId && localId !== serverId && lstParties[localId]) {
                lstParties[serverId] = lstParties[localId];
                delete lstParties[localId];
                migrated = true;
              }
            });
            // Pass 2: heuristic rescue — if exactly 1 orphaned party entry with seller data,
            // assign it to the most recently created listing that has no party data yet
            // (local IDs are base36 timestamps; server IDs are UUIDs with 4+ hyphens)
            var uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            var freshIdSet = {};
            freshMapped.forEach(function (l) { freshIdSet[l.id] = true; });
            var orphanedKeys = Object.keys(lstParties).filter(function (k) {
              return !freshIdSet[k] && lstParties[k] && lstParties[k].sellers &&
                lstParties[k].sellers.some(function (s) { return s.name || s.phone || s.email; });
            });
            if (orphanedKeys.length === 1) {
              // Find listings without any party data, pick most recently created
              var noPartyListings = freshMapped.filter(function (l) { return !lstParties[l.id]; });
              noPartyListings.sort(function (a, b) {
                return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
              });
              if (noPartyListings.length > 0) {
                lstParties[noPartyListings[0].id] = lstParties[orphanedKeys[0]];
                delete lstParties[orphanedKeys[0]];
                migrated = true;
              }
            }
            if (migrated) localStorage.setItem(PREFIX + 'lst_parties', JSON.stringify(lstParties));

            // Pass 3: pull server-side listing_parties into reb_lst_parties
            // This is the source of truth — overwrites local data for any listing
            // that has server-stored parties, ensuring all users see the same info
            fresh.forEach(function (l) {
              if (l.listing_parties && l.listing_parties.length > 0) {
                var seenKeys = {};
                var sellers = l.listing_parties
                  .filter(function (p) { return p.party_type === 'seller'; })
                  .sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); })
                  .map(function (p) {
                    return {
                      name: p.name || '',
                      phone: p.phone || '',
                      email: p.email || '',
                      relationship: (p.metadata && p.metadata.relationship) || 'Primary'
                    };
                  })
                  .filter(function (s) {
                    var k = (s.name + '|' + s.phone + '|' + s.email).toLowerCase();
                    if (seenKeys[k]) return false;
                    seenKeys[k] = true;
                    return true;
                  });
                if (sellers.length > 0) {
                  if (!lstParties[l.id]) lstParties[l.id] = { sellers: [], contacts: {} };
                  lstParties[l.id].sellers = sellers;
                  migrated = true;
                }
              }
            });
            localStorage.setItem(PREFIX + 'lst_parties', JSON.stringify(lstParties));

            // Pass 4: push local party data to server for listings where server has none yet
            // This syncs data entered before server-sync was implemented
            fresh.forEach(function (l) {
              if ((!l.listing_parties || l.listing_parties.length === 0) && lstParties[l.id]) {
                var localSellers = (lstParties[l.id].sellers || []).filter(function (s) { return s.name || s.phone || s.email; });
                if (localSellers.length > 0) {
                  var partiesToPush = localSellers.map(function (s, i) {
                    return { party_type: 'seller', name: s.name || '', phone: s.phone || '', email: s.email || '', sort_order: i, metadata: { relationship: s.relationship || 'Primary' } };
                  });
                  API.updateListing(l.id, { parties: partiesToPush }).catch(function () {});
                }
              }
            });
          } catch (e) {}
          localStorage.setItem(PREFIX + 'listings', JSON.stringify(freshMapped));
          // Re-preserve any localOnly listings that failed to push to server.
          // A failed push means the listing is not in freshMapped — it would be
          // wiped from localStorage above. Add those items back so they survive
          // the refresh and get retried on the next loadAll.
          var pushedLocalIds = {};
          Object.keys(serverToLocalId).forEach(function (sid) { pushedLocalIds[serverToLocalId[sid]] = true; });
          var failedLocal = localOnly.filter(function (l) { return !pushedLocalIds[l.id]; });
          if (failedLocal.length > 0) {
            var currentLst = JSON.parse(localStorage.getItem(PREFIX + 'listings') || '[]');
            failedLocal.forEach(function (l) { currentLst.push(l); });
            localStorage.setItem(PREFIX + 'listings', JSON.stringify(currentLst));
          }
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
      var prevValue = localStorage.getItem(key);
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

      // Tax Entries — stored per-user as { username: [entries] } so agents don't overwrite each other
      if (key === PREFIX + 'tax_entries') {
        var capturedTaxVal = value;
        debounceSync('tax_entries', function () {
          try {
            var sess = JSON.parse(localStorage.getItem(PREFIX + 'session') || '{}');
            var uname = sess.username || (API.getUser() && API.getUser().username);
            if (!uname) return;
            var allEntries = JSON.parse(capturedTaxVal);
            var myEntries = allEntries.filter(function (e) { return e.username === uname || (!e.username && uname === 'admin'); });
            var dict = {};
            try {
              var s = JSON.parse(localStorage.getItem(PREFIX + 'admin_settings') || '{}');
              dict = s._tax_entries || {};
              if (Array.isArray(dict)) dict = {};
            } catch (e) {}
            dict[uname] = myEntries;
            API.updateSettings({ _tax_entries: dict }).catch(function () {});
          } catch (e) {}
        }, 2000);
      }

      // Mileage — stored per-user as { username: [entries] } so agents don't overwrite each other
      if (key === PREFIX + 'mileage') {
        var capturedMileVal = value;
        debounceSync('mileage', function () {
          try {
            var sess = JSON.parse(localStorage.getItem(PREFIX + 'session') || '{}');
            var uname = sess.username || (API.getUser() && API.getUser().username);
            if (!uname) return;
            var allTrips = JSON.parse(capturedMileVal);
            var myTrips = allTrips.filter(function (t) { return t.username === uname || (!t.username && uname === 'admin'); });
            var dict = {};
            try {
              var s = JSON.parse(localStorage.getItem(PREFIX + 'admin_settings') || '{}');
              dict = s._mileage || {};
              if (Array.isArray(dict)) dict = {};
            } catch (e) {}
            dict[uname] = myTrips;
            API.updateSettings({ _mileage: dict }).catch(function () {});
          } catch (e) {}
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

      // Transaction notes
      if (key === PREFIX + 'txn_notes') {
        debounceSync('txn_notes', function () {
          try { API.updateSettings({ _txn_notes: JSON.parse(value) }).catch(function () {}); } catch (e) {}
        }, 1000);
      }

      // Transaction key dates (deadlines)
      if (key === PREFIX + 'txn_key_dates') {
        debounceSync('txn_key_dates', function () {
          try { API.updateSettings({ _txn_key_dates: JSON.parse(value) }).catch(function () {}); } catch (e) {}
        }, 1000);
      }

      // Calendar events
      if (key === PREFIX + 'calendar_events') {
        debounceSync('calendar_events', function () {
          try { API.updateSettings({ _calendar_events: JSON.parse(value) }).catch(function () {}); } catch (e) {}
        }, 2000);
      }

      // Listing notes
      if (key === PREFIX + 'listing_notes') {
        debounceSync('listing_notes', function () {
          try { API.updateSettings({ _listing_notes: JSON.parse(value) }).catch(function () {}); } catch (e) {}
        }, 1000);
      }

      // Notification config (team-wide settings)
      if (key === PREFIX + 'notif_config') {
        debounceSync('notif_config', function () {
          try { API.updateSettings({ _notif_config: JSON.parse(value) }).catch(function () {}); } catch (e) {}
        }, 2000);
      }

      // Notification sent log (prevents duplicate emails across devices)
      if (key === PREFIX + 'notif_sent') {
        debounceSync('notif_sent', function () {
          try { API.updateSettings({ _notif_sent: JSON.parse(value) }).catch(function () {}); } catch (e) {}
        }, 2000);
      }

      // Listings — diff old vs new and push changes to server
      if (key === PREFIX + 'listings') {
        var capturedPrevLst = prevValue;
        var capturedNextLst = value;
        debounceSync('listings', function () {
          try {
            var uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            var prev = []; try { prev = JSON.parse(capturedPrevLst || '[]'); } catch (e) {}
            var next = JSON.parse(capturedNextLst);
            var prevMap = {}, nextMap = {};
            prev.forEach(function (l) { prevMap[l.id] = l; });
            next.forEach(function (l) { nextMap[l.id] = l; });
            // Deletions: UUID in prev, not in next
            Object.keys(prevMap).forEach(function (id) {
              if (uuidRe.test(id) && !nextMap[id]) {
                API.deleteListing(id).catch(function () {});
              }
            });
            // Updates: UUID in next, changed vs prev
            next.forEach(function (l) {
              if (!uuidRe.test(l.id)) return; // local-only IDs handled by loadAll
              var p = prevMap[l.id];
              if (!p || JSON.stringify(p) !== JSON.stringify(l)) {
                API.updateListing(l.id, {
                  status: l.status, price: l.price,
                  address: l.address, city: l.city || '', state: l.state || '', zip: l.zip || '',
                  agent_name: l.agent || '', beds: l.beds || null, baths: l.baths || null,
                  sqft: l.sqft || null, description: l.description || '', source: l.source || '',
                  listing_date: l.listingDate || null, property_type: l.propertyType || ''
                }).catch(function () {});
              }
            });
          } catch (e) {}
        }, 1500);
      }

      // Transactions — diff old vs new and push changes to server
      if (key === PREFIX + 'transactions') {
        var capturedPrevTxn = prevValue;
        var capturedNextTxn = value;
        debounceSync('transactions', function () {
          try {
            var uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            var prev = []; try { prev = JSON.parse(capturedPrevTxn || '[]'); } catch (e) {}
            var next = JSON.parse(capturedNextTxn);
            var prevMap = {}, nextMap = {};
            prev.forEach(function (t) { prevMap[t.id] = t; });
            next.forEach(function (t) { nextMap[t.id] = t; });
            // Deletions: UUID in prev, not in next
            Object.keys(prevMap).forEach(function (id) {
              if (uuidRe.test(id) && !nextMap[id]) {
                API.deleteTransaction(id).catch(function () {});
              }
            });
            // Updates: UUID in next, changed vs prev
            next.forEach(function (t) {
              if (!uuidRe.test(t.id)) return; // local-only IDs handled by loadAll
              var p = prevMap[t.id];
              if (!p || JSON.stringify(p) !== JSON.stringify(t)) {
                API.updateTransaction(t.id, {
                  status: t.status, price: t.price,
                  address: t.address, city: t.city || '', state: t.state || '', zip: t.zip || '',
                  type: t.type || 'Buyer', agent_name: t.agent || '', source: t.source || '',
                  close_date: t.closeDate || null, notes: t.notes || ''
                }).catch(function () {});
              }
            });
          } catch (e) {}
        }, 1500);
      }

      // Tax settings (per-user — stored as { username: settings } on server)
      if (key === PREFIX + 'tax_settings') {
        debounceSync('tax_settings', function () {
          try {
            var sess = JSON.parse(localStorage.getItem(PREFIX + 'session') || '{}');
            var uname = sess.username || (API.getUser() && API.getUser().username);
            if (!uname) return;
            var existing = {};
            try {
              var adminSettings = JSON.parse(localStorage.getItem(PREFIX + 'admin_settings') || '{}');
              existing = adminSettings._tax_settings || {};
            } catch (e) {}
            existing[uname] = JSON.parse(value);
            API.updateSettings({ _tax_settings: existing }).catch(function () {});
          } catch (e) {}
        }, 2000);
      }
    };
  }

  // ---- Load settings-stored data back into localStorage ----
  function loadSettingsData(settings) {
    if (!settings) return;
    // Tax entries — stored per-user dict on server, flatten to array for localStorage
    if (settings._tax_entries !== undefined && settings._tax_entries !== null) {
      try {
        var taxData = settings._tax_entries;
        var flatTax = Array.isArray(taxData) ? taxData : [];
        if (!Array.isArray(taxData)) {
          Object.keys(taxData).forEach(function (u) { (taxData[u] || []).forEach(function (e) { flatTax.push(e); }); });
        }
        localStorage.setItem(PREFIX + 'tax_entries', JSON.stringify(flatTax));
      } catch (e) {}
    }
    // Mileage — stored per-user dict on server, flatten to array for localStorage
    if (settings._mileage !== undefined && settings._mileage !== null) {
      try {
        var mileData = settings._mileage;
        var flatMile = Array.isArray(mileData) ? mileData : [];
        if (!Array.isArray(mileData)) {
          Object.keys(mileData).forEach(function (u) { (mileData[u] || []).forEach(function (e) { flatMile.push(e); }); });
        }
        localStorage.setItem(PREFIX + 'mileage', JSON.stringify(flatMile));
      } catch (e) {}
    }

    var keys = [
      '_marketing:marketing',
      '_bold100:bold100', '_review_requests:review_requests', '_review_scorecard:review_scorecard',
      '_review_links:review_links', '_review_templates:review_templates',
      '_agent_goals:agent_goals', '_checklist_templates:checklist_templates',
      '_deal_checklists:deal_checklists', '_txn_updates:txn_updates', '_lst_updates:lst_updates',
      '_txn_parties:txn_parties', '_lst_parties:lst_parties', '_portal_links:portal_links',
      '_portal_config:portal_config', '_marketing_config:marketing_config',
      '_profiles:profiles', '_notifications:notifications',
      '_txn_notes:txn_notes', '_txn_key_dates:txn_key_dates',
      '_calendar_events:calendar_events', '_listing_notes:listing_notes',
      '_notif_config:notif_config', '_notif_sent:notif_sent'
    ];
    keys.forEach(function (k) {
      var parts = k.split(':');
      var settingsKey = parts[0];
      var localKey = parts[1];
      if (settings[settingsKey] !== undefined && settings[settingsKey] !== null) {
        localStorage.setItem(PREFIX + localKey, JSON.stringify(settings[settingsKey]));
      }
    });
    // Tax settings are per-user — stored as { username: settings } on server
    if (settings._tax_settings) {
      try {
        var sess = JSON.parse(localStorage.getItem(PREFIX + 'session') || '{}');
        var uname = sess.username || (API.getUser() && API.getUser().username);
        if (uname && settings._tax_settings[uname]) {
          localStorage.setItem(PREFIX + 'tax_settings', JSON.stringify(settings._tax_settings[uname]));
        }
      } catch (e) {}
    }
  }

  // ---- Initialize ----
  function init() {
    if (!isServerMode()) return Promise.resolve();
    interceptWrites();
    return loadAll().then(function () {
      // Load settings-stored data under _syncing guard so the writes don't
      // trigger interceptWrites() and immediately push back to the server.
      _syncing = true;
      try {
        var settings = JSON.parse(localStorage.getItem(PREFIX + 'admin_settings') || '{}');
        loadSettingsData(settings);
      } catch (e) {}
      // Merge user-table profile data into reb_profiles — this runs AFTER loadSettingsData
      // so that photos/info saved via API.updateUser are authoritative and visible on all computers.
      try {
        var loadedUsers = JSON.parse(localStorage.getItem(PREFIX + 'users') || '[]');
        var mergedProfiles = JSON.parse(localStorage.getItem(PREFIX + 'profiles') || '{}');
        loadedUsers.forEach(function (u) {
          if (!u.username) return;
          if (!mergedProfiles[u.username]) mergedProfiles[u.username] = {};
          // User-table photo overrides settings blob (it's the authoritative save path)
          if (u.profile && u.profile.photo) mergedProfiles[u.username].photo = u.profile.photo;
          // Fill in other fields only if not already set by settings blob
          if (u.displayName && !mergedProfiles[u.username].displayName) mergedProfiles[u.username].displayName = u.displayName;
          if (u.phone && !mergedProfiles[u.username].phone) mergedProfiles[u.username].phone = u.phone;
          if (u.email && !mergedProfiles[u.username].email) mergedProfiles[u.username].email = u.email;
        });
        localStorage.setItem(PREFIX + 'profiles', JSON.stringify(mergedProfiles));
      } catch (e) {}
      _syncing = false;
    });
  }

  var _refreshActive = false;
  // Lightweight re-fetch of just listings + parties — call when listing list view opens
  function refreshListings() {
    if (!isServerMode() || _refreshActive) return Promise.resolve();
    _refreshActive = true;
    var uuidRe2 = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return API.getListings().then(function (d) {
      try {
        var lstParties = JSON.parse(localStorage.getItem(PREFIX + 'lst_parties') || '{}');
        d.forEach(function (l) {
          if (l.listing_parties && l.listing_parties.length > 0) {
            var seenKeys2 = {};
            var sellers = l.listing_parties
              .filter(function (p) { return p.party_type === 'seller'; })
              .sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); })
              .map(function (p) {
                return { name: p.name || '', phone: p.phone || '', email: p.email || '', relationship: (p.metadata && p.metadata.relationship) || 'Primary' };
              })
              .filter(function (s) {
                var k = (s.name + '|' + s.phone + '|' + s.email).toLowerCase();
                if (seenKeys2[k]) return false;
                seenKeys2[k] = true;
                return true;
              });
            if (sellers.length > 0) {
              if (!lstParties[l.id]) lstParties[l.id] = { sellers: [], contacts: {} };
              lstParties[l.id].sellers = sellers;
            }
          }
        });
        localStorage.setItem(PREFIX + 'lst_parties', JSON.stringify(lstParties));
        // Merge server listings with any local-only listings that haven't synced yet
        var serverMapped = mapListings(d);
        var serverIds = {};
        serverMapped.forEach(function (l) { serverIds[l.id] = true; });
        var existing = JSON.parse(localStorage.getItem(PREFIX + 'listings') || '[]');
        // Build lookup of existing local listings by ID and server_id
        var existingById = {};
        existing.forEach(function (l) {
          existingById[l.id] = l;
          if (l.server_id) existingById[l.server_id] = l;
        });
        // For each server listing, prefer the local version if it was updated more recently
        var mergedServer = serverMapped.map(function (s) {
          var local = existingById[s.id];
          if (local && local.updatedAt && s.updatedAt && new Date(local.updatedAt) > new Date(s.updatedAt)) {
            return local; // local is newer (e.g., user just changed status) — keep it
          }
          return s;
        });
        var localOnly = existing.filter(function (l) {
          return !serverIds[l.id] && !serverIds[l.server_id] && !l.server_id && !uuidRe2.test(l.id);
        });
        var combined = localOnly.length > 0 ? mergedServer.concat(localOnly) : mergedServer;
        // Use _syncing guard so the setItem interceptor doesn't treat this server write
        // as a user change and schedule a sync that would revert the user's edits.
        _syncing = true;
        try { localStorage.setItem(PREFIX + 'listings', JSON.stringify(combined)); } catch (e) {}
        _syncing = false;
      } catch (e) {}
      _refreshActive = false;
    }).catch(function () { _refreshActive = false; });
  }

  return {
    init: init,
    loadAll: loadAll,
    isServerMode: isServerMode,
    refreshListings: refreshListings
  };
})();
