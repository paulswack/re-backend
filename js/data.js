/* ============================================================
   RE Back Office — Data Layer (localStorage)
   ============================================================ */

(function () {
  'use strict';

  var PREFIX = 'reb_';

  // ---- Generic helpers ----
  function getCollection(key) {
    return JSON.parse(localStorage.getItem(PREFIX + key) || '[]');
  }

  function saveCollection(key, arr) {
    localStorage.setItem(PREFIX + key, JSON.stringify(arr));
  }

  function generateId() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
  }

  // ---- CRUD factory ----
  function makeAccessors(collectionKey) {
    return {
      getAll: function () {
        return getCollection(collectionKey);
      },
      add: function (item) {
        var items = getCollection(collectionKey);
        item.id = item.id || generateId();
        item.createdAt = item.createdAt || new Date().toISOString();
        items.push(item);
        saveCollection(collectionKey, items);
        return item;
      },
      update: function (id, updates) {
        var items = getCollection(collectionKey);
        var idx = items.findIndex(function (i) { return i.id === id; });
        if (idx === -1) return null;
        Object.assign(items[idx], updates, { updatedAt: new Date().toISOString() });
        saveCollection(collectionKey, items);
        return items[idx];
      },
      remove: function (id) {
        var items = getCollection(collectionKey);
        var filtered = items.filter(function (i) { return i.id !== id; });
        saveCollection(collectionKey, filtered);
        return filtered.length < items.length;
      }
    };
  }

  var txns     = makeAccessors('transactions');
  var listings = makeAccessors('listings');
  var tasks    = makeAccessors('tasks');

  // ---- Stats ----
  function getStats() {
    var t = txns.getAll();
    var l = listings.getAll();

    var closedTxns  = t.filter(function (x) { return x.status === 'closed'; });
    var activeTxns  = t.filter(function (x) { return x.status === 'active'; });
    var pendingTxns = t.filter(function (x) { return x.status === 'pending'; });

    var totalVolume = closedTxns.reduce(function (sum, x) { return sum + (parseFloat(x.price) || 0); }, 0);
    var avgDeal = closedTxns.length ? totalVolume / closedTxns.length : 0;

    var activeListings = l.filter(function (x) { return x.status === 'active'; });

    return {
      totalTxns:      t.length,
      closedTxns:     closedTxns.length,
      activeTxns:     activeTxns.length,
      pendingTxns:    pendingTxns.length,
      totalVolume:    totalVolume,
      avgDeal:        avgDeal,
      totalListings:  l.length,
      activeListings: activeListings.length
    };
  }

  // ---- Formatting helpers ----
  function formatCurrency(n) {
    n = parseFloat(n) || 0;
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function formatCurrencyFull(n) {
    n = parseFloat(n) || 0;
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  function statusBadge(status) {
    if (!status) return '';
    var s = status.toLowerCase();
    return '<span class="badge badge-' + s + '">' +
      s.charAt(0).toUpperCase() + s.slice(1) + '</span>';
  }

  function priorityBadge(priority) {
    if (!priority) return '';
    var p = priority.toLowerCase();
    var colors = {
      low:    'background:#DBEAFE;color:#1D4ED8',
      medium: 'background:#FEF3C7;color:#92400E',
      high:   'background:#FEE2E2;color:#991B1B',
      urgent: 'background:#FDE8E8;color:#7F1D1D'
    };
    var style = colors[p] || colors.medium;
    return '<span class="badge" style="' + style + '">' +
      p.charAt(0).toUpperCase() + p.slice(1) + '</span>';
  }

  function daysSince(dateStr) {
    if (!dateStr) return 0;
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return 0;
    var now = new Date();
    return Math.floor((now - d) / (1000 * 60 * 60 * 24));
  }

  // ---- Seed sample data on first load ----
  function seedData() {
    // Transactions
    if (!localStorage.getItem(PREFIX + 'transactions')) {
      var sampleTxns = [
        {
          id: 'txn-001', address: '4512 Balcones Dr, Austin, TX 78731',
          price: 785000, agent: 'Jennifer Walsh', status: 'closed',
          closeDate: '2026-01-22', notes: 'Smooth closing, cash buyer.', source: 'Referral',
          createdAt: '2025-11-10T10:00:00Z'
        },
        {
          id: 'txn-002', address: '2807 S Lamar Blvd #104, Austin, TX 78704',
          price: 425000, agent: 'Marcus Rivera', status: 'closed',
          closeDate: '2026-02-14', notes: 'FHA loan, minor appraisal issue resolved.', source: 'Zillow',
          createdAt: '2025-12-01T10:00:00Z'
        },
        {
          id: 'txn-003', address: '901 W 9th St, Austin, TX 78703',
          price: 650000, agent: 'Sarah Chen', status: 'active',
          closeDate: '2026-04-15', notes: 'Under contract, inspection completed.', source: 'Open House',
          createdAt: '2026-01-20T10:00:00Z'
        },
        {
          id: 'txn-004', address: '1214 E 7th St, Austin, TX 78702',
          price: 510000, agent: 'Marcus Rivera', status: 'pending',
          closeDate: '2026-04-30', notes: 'Waiting on lender approval.', source: 'Realtor.com',
          createdAt: '2026-02-05T10:00:00Z'
        },
        {
          id: 'txn-005', address: '6300 Manchaca Rd, Austin, TX 78745',
          price: 295000, agent: 'Sarah Chen', status: 'closed',
          closeDate: '2026-03-01', notes: 'First-time buyer, down payment assistance.', source: 'Sphere of Influence',
          createdAt: '2026-01-05T10:00:00Z'
        },
        {
          id: 'txn-006', address: '3401 Red River St, Austin, TX 78705',
          price: 372000, agent: 'Jennifer Walsh', status: 'active',
          closeDate: '2026-05-10', notes: 'Investor purchase, all cash.', source: 'Referral',
          createdAt: '2026-02-28T10:00:00Z'
        },
        {
          id: 'txn-007', address: '8110 Tahoe Parke Cir, Austin, TX 78726',
          price: 540000, agent: 'Marcus Rivera', status: 'pending',
          closeDate: '2026-04-20', notes: 'Conventional loan, awaiting clear to close.', source: 'Social Media',
          createdAt: '2026-03-01T10:00:00Z'
        },
        {
          id: 'txn-008', address: '502 E Riverside Dr #212, Austin, TX 78704',
          price: 268000, agent: 'Sarah Chen', status: 'closed',
          closeDate: '2026-03-18', notes: 'Condo sale, HOA docs delivered.', source: 'Zillow',
          createdAt: '2026-01-25T10:00:00Z'
        }
      ];
      saveCollection('transactions', sampleTxns);
    }

    // Listings
    if (!localStorage.getItem(PREFIX + 'listings')) {
      var sampleListings = [
        {
          id: 'lst-001', address: '1605 W 30th St, Austin, TX 78703',
          price: 725000, beds: 4, baths: 3, sqft: 2450,
          agent: 'Jennifer Walsh', status: 'active', source: 'Past Client',
          listingDate: '2026-03-05',
          description: 'Charming Bryker Woods home with modern updates, open floor plan, and shaded backyard.',
          createdAt: '2026-03-05T10:00:00Z'
        },
        {
          id: 'lst-002', address: '4200 Duval St, Austin, TX 78751',
          price: 485000, beds: 3, baths: 2, sqft: 1680,
          agent: 'Marcus Rivera', status: 'active', source: 'Sphere of Influence',
          listingDate: '2026-02-20',
          description: 'Move-in ready Hyde Park bungalow, original hardwoods, updated kitchen.',
          createdAt: '2026-02-20T10:00:00Z'
        },
        {
          id: 'lst-003', address: '10204 Wommack Rd, Austin, TX 78748',
          price: 365000, beds: 3, baths: 2.5, sqft: 1920,
          agent: 'Sarah Chen', status: 'active', source: 'Sign Call',
          listingDate: '2026-03-12',
          description: 'South Austin gem near trails, two-story with large primary suite.',
          createdAt: '2026-03-12T10:00:00Z'
        },
        {
          id: 'lst-004', address: '305 E Huntland Dr #408, Austin, TX 78752',
          price: 250000, beds: 2, baths: 2, sqft: 1100,
          agent: 'Marcus Rivera', status: 'pending', source: 'Farming / Mailer',
          listingDate: '2026-01-30',
          description: 'Updated condo with pool access, close to the Domain.',
          createdAt: '2026-01-30T10:00:00Z'
        },
        {
          id: 'lst-005', address: '7801 Shoal Creek Blvd, Austin, TX 78757',
          price: 599000, beds: 4, baths: 2.5, sqft: 2200,
          agent: 'Jennifer Walsh', status: 'active', source: 'Referral',
          listingDate: '2026-03-18',
          description: 'Recently renovated with chef kitchen, quartz counters, and covered patio.',
          createdAt: '2026-03-18T10:00:00Z'
        },
        {
          id: 'lst-006', address: '1901 Thornton Rd #A, Austin, TX 78704',
          price: 415000, beds: 2, baths: 1, sqft: 950,
          agent: 'Sarah Chen', status: 'active', source: 'Expired Listing',
          listingDate: '2026-03-22',
          description: 'South Lamar area cottage, walkable to restaurants and parks.',
          createdAt: '2026-03-22T10:00:00Z'
        }
      ];
      saveCollection('listings', sampleListings);
    }

    // Tasks
    if (!localStorage.getItem(PREFIX + 'tasks')) {
      var sampleTasks = [
        {
          id: 'tsk-001', title: 'Schedule inspection for 901 W 9th St',
          assignedTo: 'Sarah Chen', dueDate: '2026-03-28', priority: 'high',
          status: 'todo', linkedId: 'txn-003', linkedType: 'transaction',
          createdAt: '2026-03-20T10:00:00Z'
        },
        {
          id: 'tsk-002', title: 'Follow up with lender on 1214 E 7th St',
          assignedTo: 'Marcus Rivera', dueDate: '2026-03-27', priority: 'urgent',
          status: 'in_progress', linkedId: 'txn-004', linkedType: 'transaction',
          createdAt: '2026-03-22T10:00:00Z'
        },
        {
          id: 'tsk-003', title: 'Upload listing photos for 7801 Shoal Creek',
          assignedTo: 'Jennifer Walsh', dueDate: '2026-03-30', priority: 'medium',
          status: 'todo', linkedId: 'lst-005', linkedType: 'listing',
          createdAt: '2026-03-23T10:00:00Z'
        },
        {
          id: 'tsk-004', title: 'Send closing gift to 502 E Riverside buyer',
          assignedTo: 'Sarah Chen', dueDate: '2026-03-25', priority: 'low',
          status: 'done', completedAt: '2026-03-24T14:00:00Z',
          linkedId: 'txn-008', linkedType: 'transaction',
          createdAt: '2026-03-19T10:00:00Z'
        }
      ];
      saveCollection('tasks', sampleTasks);
    }

    // Transaction Updates (client portal timeline)
    if (!localStorage.getItem(PREFIX + 'txn_updates')) {
      var sampleUpdates = {
        'txn-003': [
          { id: 'upd-001', type: 'offer_accepted', title: 'Offer Accepted', detail: 'Your offer has been accepted by the seller. Congratulations!', auto: false, author: 'Sarah Chen', timestamp: '2026-01-22T14:00:00Z' },
          { id: 'upd-002', type: 'earnest_deposited', title: 'Earnest Money Deposited', detail: 'Earnest money has been received and deposited into escrow.', auto: true, author: 'Sarah Chen', timestamp: '2026-01-25T10:00:00Z' },
          { id: 'upd-003', type: 'inspection_scheduled', title: 'Inspection Scheduled', detail: 'Home inspection is scheduled for February 5th at 10:00 AM.', auto: false, author: 'Sarah Chen', timestamp: '2026-01-28T09:00:00Z' },
          { id: 'upd-004', type: 'inspection_complete', title: 'Inspection Complete', detail: 'Inspection completed. Overall the home is in great condition. Minor items noted — I will send you the full report.', auto: false, author: 'Sarah Chen', timestamp: '2026-02-05T15:00:00Z' },
          { id: 'upd-005', type: 'appraisal_ordered', title: 'Appraisal Ordered', detail: 'The lender has ordered the appraisal. We should have results within 7-10 days.', auto: false, author: 'Sarah Chen', timestamp: '2026-02-10T11:00:00Z' },
          { id: 'upd-006', type: 'appraisal_came_in', title: 'Appraisal Came In at Value', detail: 'Great news — the appraisal came in at the purchase price. We are clear to move forward!', auto: false, author: 'Sarah Chen', timestamp: '2026-02-20T14:00:00Z' }
        ],
        'txn-004': [
          { id: 'upd-010', type: 'offer_accepted', title: 'Offer Accepted', detail: 'Seller accepted your offer. Next steps are earnest money and inspection scheduling.', auto: false, author: 'Marcus Rivera', timestamp: '2026-02-08T10:00:00Z' },
          { id: 'upd-011', type: 'inspection_complete', title: 'Inspection Complete', detail: 'Inspection went well. A few repair requests have been submitted to the seller.', auto: false, author: 'Marcus Rivera', timestamp: '2026-02-18T16:00:00Z' },
          { id: 'upd-012', type: 'appraisal_ordered', title: 'Appraisal Ordered', detail: 'Lender has ordered the appraisal. Waiting on results.', auto: true, author: 'Marcus Rivera', timestamp: '2026-02-25T09:00:00Z' }
        ]
      };
      localStorage.setItem(PREFIX + 'txn_updates', JSON.stringify(sampleUpdates));
    }

    // Listing Updates (client portal timeline)
    if (!localStorage.getItem(PREFIX + 'lst_updates')) {
      var sampleLstUpdates = {
        'lst-005': [
          { id: 'lupd-001', type: 'listing_agreement', title: 'Listing Agreement Signed', detail: 'We\'re officially on board! Let\'s get your home ready for market.', auto: false, author: 'Jennifer Walsh', timestamp: '2026-03-18T10:00:00Z' },
          { id: 'lupd-002', type: 'pre_listing_prep', title: 'Pre-Listing Prep Started', detail: 'We\'ve created a prep checklist — minor touch-ups and decluttering to maximize your home\'s appeal.', auto: false, author: 'Jennifer Walsh', timestamp: '2026-03-19T14:00:00Z' },
          { id: 'lupd-003', type: 'photos_scheduled', title: 'Photography Scheduled', detail: 'Professional photography and drone shots are scheduled for March 24th at 2:00 PM.', auto: false, author: 'Jennifer Walsh', timestamp: '2026-03-21T09:00:00Z' },
          { id: 'lupd-004', type: 'photos_complete', title: 'Photos & Video Complete', detail: 'Photos look amazing! 45 professional images and a walkthrough video are ready for the listing.', auto: false, author: 'Jennifer Walsh', timestamp: '2026-03-24T17:00:00Z' },
          { id: 'lupd-005', type: 'sign_installed', title: 'Sign Installed', detail: 'For Sale sign is up in the yard.', auto: true, author: 'Jennifer Walsh', timestamp: '2026-03-25T11:00:00Z' },
          { id: 'lupd-006', type: 'mls_live', title: 'Listed on MLS — Live!', detail: 'Your property is now live on the MLS and all major real estate websites. Let the showings begin!', auto: false, author: 'Jennifer Walsh', timestamp: '2026-03-26T08:00:00Z' }
        ]
      };
      localStorage.setItem(PREFIX + 'lst_updates', JSON.stringify(sampleLstUpdates));
    }

    // Sample portal links for testing
    if (!localStorage.getItem(PREFIX + 'portal_links')) {
      var sampleLinks = [
        { token: 'demo-portal-txn003', txnId: 'txn-003', clientName: 'David & Maria Thompson', createdAt: '2026-03-01T10:00:00Z', createdBy: 'Sarah Chen' },
        { token: 'demo-portal-txn004', txnId: 'txn-004', clientName: 'Jason Park', createdAt: '2026-03-05T10:00:00Z', createdBy: 'Marcus Rivera' },
        { token: 'demo-portal-lst005', lstId: 'lst-005', type: 'listing', clientName: 'Robert & Kim Nguyen', createdAt: '2026-03-18T10:00:00Z', createdBy: 'Jennifer Walsh' }
      ];
      localStorage.setItem(PREFIX + 'portal_links', JSON.stringify(sampleLinks));
    }

    // Sample parties for portal testing
    if (!localStorage.getItem(PREFIX + 'txn_parties')) {
      var sampleParties = {
        'txn-003': {
          buyer: { name: 'David Thompson', phone: '(512) 555-0142', email: 'david.t@email.com', spouse: { name: 'Maria Thompson', phone: '', email: 'maria.t@email.com', relationship: 'Spouse' } },
          seller: { name: 'Robert & Lynn Adams' },
          contacts: { escrow: { company: 'Heritage Title', contact: 'Amy Torres' }, title: { company: 'Heritage Title', contact: 'Amy Torres' }, lender: { company: 'Guild Mortgage', contact: 'Ben Harris' }, otherAgent: { name: 'Tom Fletcher', contact: '(512) 555-0199' } }
        },
        'txn-004': {
          buyer: { name: 'Jason Park', phone: '(512) 555-0188', email: 'jpark@email.com' },
          seller: { name: 'Michelle Warren' },
          contacts: { escrow: { company: 'Stewart Title', contact: 'Carla Reyes' }, lender: { company: 'First National Bank', contact: 'Diana Liu' } }
        }
      };
      localStorage.setItem(PREFIX + 'txn_parties', JSON.stringify(sampleParties));
    }
  }
  if (typeof Auth !== 'undefined' && Auth.isDemo && Auth.isDemo()) { seedData(); }

  // ---- Public Data API ----
  window.Data = {
    // Transactions
    getTransactions:    txns.getAll,
    addTransaction:     txns.add,
    updateTransaction:  txns.update,
    deleteTransaction:  txns.remove,

    // Listings
    getListings:    listings.getAll,
    addListing:     listings.add,
    updateListing:  listings.update,
    deleteListing:  listings.remove,

    // Tasks
    getTasks:    tasks.getAll,
    addTask:     tasks.add,
    updateTask:  tasks.update,
    deleteTask:  tasks.remove,

    // Stats
    getStats: getStats,

    // Formatting
    formatCurrency:     formatCurrency,
    formatCurrencyFull: formatCurrencyFull,
    formatDate:         formatDate,
    statusBadge:        statusBadge,
    priorityBadge:      priorityBadge,
    daysSince:          daysSince
  };

})();
