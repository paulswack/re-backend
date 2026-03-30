/* ============================================================
   RE Back Office — Reviews Page
   ============================================================ */

(function () {
  'use strict';

  Auth.requireAuth();
  populateSidebarUser();
  setActiveNav();
  initSidebarToggle();
  applyPageColor('reviews');

  document.getElementById('logoutBtn').addEventListener('click', function () {
    Auth.logout();
  });

  var STORAGE_KEY = 'reb_reviews';
  var pageBody = document.getElementById('pageBody');
  var currentSourceFilter = 'All';
  var currentAgentFilter = 'All';
  var currentRatingFilter = 'All';

  // ---- Sources with colors ----
  var SOURCES = {
    'Google':      { bg: '#E8F5E9', text: '#1B5E20' },
    'Zillow':      { bg: '#E3F2FD', text: '#0D47A1' },
    'Realtor.com': { bg: '#FBE9E7', text: '#BF360C' },
    'Yelp':        { bg: '#FCE4EC', text: '#880E4F' },
    'Direct':      { bg: '#F3E5F5', text: '#4A148C' },
    'Other':       { bg: '#F5F5F5', text: '#424242' }
  };

  var SOURCE_KEYS = Object.keys(SOURCES);

  // ---- Seed data ----
  var SEED_DATA = [
    {
      clientName: 'David & Maria Thompson',
      clientEmail: 'david.t@email.com',
      agent: 'Sarah Chen',
      rating: 5,
      text: 'Sarah was absolutely incredible throughout our entire home buying journey. She was patient, knowledgeable, and always available when we had questions. We could not have asked for a better agent!',
      source: 'Google',
      date: '2026-03-10',
      featured: true
    },
    {
      clientName: 'Jason Park',
      clientEmail: 'jpark@email.com',
      agent: 'Marcus Rivera',
      rating: 4,
      text: 'Marcus helped us find the perfect investment property. His market knowledge in East Austin is unmatched. Great communication and negotiation skills.',
      source: 'Zillow',
      date: '2026-02-22',
      featured: false
    },
    {
      clientName: 'Robert & Kim Nguyen',
      clientEmail: 'knguyen@email.com',
      agent: 'Jennifer Walsh',
      rating: 5,
      text: 'Jennifer made selling our home stress-free. Professional photography, amazing marketing, and we got multiple offers in the first weekend. Highly recommend the entire team!',
      source: 'Realtor.com',
      date: '2026-03-20',
      featured: true
    },
    {
      clientName: 'Amanda Torres',
      clientEmail: 'atorres@email.com',
      agent: 'Marcus Rivera',
      rating: 3,
      text: 'Good experience overall. Marcus was helpful with the search process, though communication could have been a bit more timely during the closing phase.',
      source: 'Yelp',
      date: '2026-01-15',
      featured: false
    }
  ];

  // ---- Helpers ----
  function generateId() {
    return 'rv_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ---- Data access ----
  function getReviews() {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      var seeded = SEED_DATA.map(function (r) {
        r.id = generateId();
        r.createdAt = new Date().toISOString();
        return r;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    try { return JSON.parse(raw); } catch (e) { return []; }
  }

  function saveReviews(reviews) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
  }

  // ---- Get users for agent dropdown ----
  function getUsers() {
    try { return JSON.parse(localStorage.getItem('reb_users') || '[]'); } catch (e) { return []; }
  }

  // ---- Star rating HTML ----
  function starsHtml(rating) {
    var html = '';
    for (var i = 1; i <= 5; i++) {
      if (i <= rating) {
        html += '<span style="color:#F59E0B;font-size:16px;">&#9733;</span>';
      } else {
        html += '<span style="color:#CBD5E1;font-size:16px;">&#9734;</span>';
      }
    }
    return html;
  }

  // ---- Source badge HTML ----
  function sourceBadge(source) {
    var c = SOURCES[source] || SOURCES['Other'];
    return '<span style="display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600;background:' + c.bg + ';color:' + c.text + ';">' + escapeHtml(source) + '</span>';
  }

  // ---- Stat card ----
  function statCard(label, value, color, iconSvg) {
    return '<div class="stat-card" style="background:#fff;border-radius:12px;padding:18px;box-shadow:0 1px 4px rgba(0,0,0,0.06);border:1px solid #E2E8F0;">' +
      '<div style="display:flex;align-items:center;gap:12px;">' +
      '<div class="stat-icon" style="width:42px;height:42px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:' + color + '20;color:' + color + ';">' + iconSvg + '</div>' +
      '<div>' +
      '<div style="font-size:22px;font-weight:700;color:#1E293B;">' + value + '</div>' +
      '<div style="font-size:13px;color:#64748B;">' + escapeHtml(label) + '</div>' +
      '</div></div></div>';
  }

  // ---- Render ----
  function render() {
    var reviews = getReviews();

    // Stats
    var total = reviews.length;
    var ratingSum = 0;
    var ratingCount = 0;
    var fiveStarCount = 0;
    var featuredCount = 0;
    reviews.forEach(function (r) {
      if (r.rating) {
        ratingSum += r.rating;
        ratingCount++;
        if (r.rating === 5) fiveStarCount++;
      }
      if (r.featured) featuredCount++;
    });
    var avgRating = ratingCount ? (ratingSum / ratingCount).toFixed(1) : '0.0';

    // Build unique agent list
    var agentSet = {};
    reviews.forEach(function (r) { if (r.agent) agentSet[r.agent] = true; });
    var agents = Object.keys(agentSet).sort();

    // Filter
    var filtered = reviews;
    if (currentSourceFilter !== 'All') {
      filtered = filtered.filter(function (r) { return r.source === currentSourceFilter; });
    }
    if (currentAgentFilter !== 'All') {
      filtered = filtered.filter(function (r) { return r.agent === currentAgentFilter; });
    }
    if (currentRatingFilter !== 'All') {
      var ratingNum = parseInt(currentRatingFilter, 10);
      filtered = filtered.filter(function (r) { return r.rating === ratingNum; });
    }

    // Sort by date descending
    filtered.sort(function (a, b) {
      return (b.date || b.createdAt || '').localeCompare(a.date || a.createdAt || '');
    });

    var html = '';

    // Header
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;">';
    html += '<h2 style="margin:0;font-size:22px;font-weight:700;">Reviews</h2>';
    html += '<button class="btn btn-primary" data-action="add-review" style="display:inline-flex;align-items:center;gap:6px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg> Add Review</button>';
    html += '</div>';

    // Stat cards
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;margin-bottom:24px;">';
    html += statCard('Total Reviews', total, '#3484D0', '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>');
    html += statCard('Avg Rating ' + starsHtml(Math.round(parseFloat(avgRating))), avgRating, '#F59E0B', '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>');
    html += statCard('5-Star Count', fiveStarCount, '#1A7F4B', '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>');
    html += statCard('Featured', featuredCount, '#6B21A8', '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>');
    html += '</div>';

    // Filters
    html += '<div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:20px;align-items:center;">';

    // Source filter
    html += '<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">';
    html += '<span style="font-size:13px;font-weight:600;color:#64748B;">Source:</span>';
    html += '<button class="lb-filter-btn' + (currentSourceFilter === 'All' ? ' active' : '') + '" data-action="filter-source" data-filter="All">All</button>';
    SOURCE_KEYS.forEach(function (src) {
      html += '<button class="lb-filter-btn' + (currentSourceFilter === src ? ' active' : '') + '" data-action="filter-source" data-filter="' + escapeHtml(src) + '">' + escapeHtml(src) + '</button>';
    });
    html += '</div>';

    // Agent filter
    html += '<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">';
    html += '<span style="font-size:13px;font-weight:600;color:#64748B;">Agent:</span>';
    html += '<button class="lb-filter-btn' + (currentAgentFilter === 'All' ? ' active' : '') + '" data-action="filter-agent" data-filter="All">All</button>';
    agents.forEach(function (a) {
      html += '<button class="lb-filter-btn' + (currentAgentFilter === a ? ' active' : '') + '" data-action="filter-agent" data-filter="' + escapeHtml(a) + '">' + escapeHtml(a) + '</button>';
    });
    html += '</div>';

    // Rating filter
    html += '<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">';
    html += '<span style="font-size:13px;font-weight:600;color:#64748B;">Rating:</span>';
    html += '<button class="lb-filter-btn' + (currentRatingFilter === 'All' ? ' active' : '') + '" data-action="filter-rating" data-filter="All">All</button>';
    for (var r = 5; r >= 1; r--) {
      html += '<button class="lb-filter-btn' + (currentRatingFilter === String(r) ? ' active' : '') + '" data-action="filter-rating" data-filter="' + r + '">' + r + ' &#9733;</button>';
    }
    html += '</div>';

    html += '</div>';

    // Review grid
    if (filtered.length === 0) {
      html += '<div style="text-align:center;padding:60px 20px;color:#94A3B8;">';
      html += '<svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor" style="opacity:0.3;margin-bottom:12px;"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>';
      html += '<p style="font-size:16px;margin:0;">No reviews found. Click "Add Review" to get started.</p>';
      html += '</div>';
    } else {
      html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;">';
      filtered.forEach(function (rv) {
        var sc = SOURCES[rv.source] || SOURCES['Other'];
        html += '<div class="vendor-card" style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);overflow:hidden;border:1px solid #E2E8F0;transition:box-shadow 0.2s;">';
        // Color bar
        html += '<div style="height:4px;background:' + sc.text + ';"></div>';
        // Body
        html += '<div style="padding:16px;">';
        // Top row: source badge + featured star
        html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px;">';
        html += '<div>';
        html += sourceBadge(rv.source || 'Other');
        html += '</div>';
        html += '<button data-action="toggle-featured" data-id="' + rv.id + '" title="' + (rv.featured ? 'Remove from featured' : 'Mark as featured') + '" style="background:none;border:none;cursor:pointer;font-size:20px;padding:0;line-height:1;color:' + (rv.featured ? '#F59E0B' : '#CBD5E1') + ';">&#9733;</button>';
        html += '</div>';
        // Client name
        html += '<div style="font-weight:700;font-size:16px;color:#1E293B;margin-bottom:4px;">' + escapeHtml(rv.clientName) + '</div>';
        // Stars
        html += '<div style="margin-bottom:10px;">' + starsHtml(rv.rating || 0) + '</div>';
        // Review text
        if (rv.text) {
          html += '<div style="font-size:13px;color:#475569;line-height:1.5;margin-bottom:10px;">"' + escapeHtml(rv.text) + '"</div>';
        }
        // Agent + date
        html += '<div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#94A3B8;margin-bottom:10px;">';
        if (rv.agent) {
          html += '<span>Agent: <strong style="color:#64748B;">' + escapeHtml(rv.agent) + '</strong></span>';
        } else {
          html += '<span></span>';
        }
        if (rv.date) {
          html += '<span>' + escapeHtml(rv.date) + '</span>';
        }
        html += '</div>';
        // Actions
        html += '<div style="display:flex;gap:8px;padding-top:12px;border-top:1px solid #F1F5F9;">';
        html += '<button class="btn btn-outline" style="font-size:12px;padding:4px 12px;" data-action="edit-review" data-id="' + rv.id + '">Edit</button>';
        html += '<button class="btn btn-outline" style="font-size:12px;padding:4px 12px;color:#DC2626;border-color:#FECACA;" data-action="delete-review" data-id="' + rv.id + '">Delete</button>';
        html += '<button class="btn btn-outline" style="font-size:12px;padding:4px 12px;margin-left:auto;" data-action="copy-social" data-id="' + rv.id + '" title="Copy for social media">Copy for Social</button>';
        html += '</div>';
        html += '</div></div>';
      });
      html += '</div>';
    }

    pageBody.innerHTML = html;
  }

  // ---- Modal ----
  function openModal(review) {
    var isEdit = !!review;
    var rv = review || {};

    var users = getUsers();

    // Agent options
    var agentOptions = '<option value="">Select agent</option>';
    users.forEach(function (u) {
      var sel = rv.agent === u.displayName ? ' selected' : '';
      agentOptions += '<option value="' + escapeHtml(u.displayName) + '"' + sel + '>' + escapeHtml(u.displayName) + '</option>';
    });

    // Source options
    var sourceOptions = '<option value="">Select source</option>';
    SOURCE_KEYS.forEach(function (src) {
      var sel = rv.source === src ? ' selected' : '';
      sourceOptions += '<option value="' + escapeHtml(src) + '"' + sel + '>' + escapeHtml(src) + '</option>';
    });

    var html = '<div class="modal-overlay open" id="reviewModalOverlay">';
    html += '<div class="modal" style="max-width:540px;">';
    html += '<div class="modal-header">';
    html += '<h3 style="margin:0;">' + (isEdit ? 'Edit Review' : 'Add Review') + '</h3>';
    html += '<button class="modal-close" data-action="close-modal">&times;</button>';
    html += '</div>';
    html += '<div class="modal-body">';

    html += '<div class="form-group"><label>Client Name *</label><input type="text" id="rvClientName" class="form-control" value="' + escapeHtml(rv.clientName || '') + '" placeholder="Client name"></div>';

    // Rating - clickable stars
    html += '<div class="form-group"><label>Rating *</label>';
    html += '<div id="rvStarPicker" style="display:flex;gap:4px;cursor:pointer;">';
    for (var i = 1; i <= 5; i++) {
      var filled = rv.rating && i <= rv.rating;
      html += '<span data-star="' + i + '" style="font-size:28px;color:' + (filled ? '#F59E0B' : '#CBD5E1') + ';transition:color 0.15s;">&#9733;</span>';
    }
    html += '</div>';
    html += '<input type="hidden" id="rvRating" value="' + (rv.rating || '') + '">';
    html += '</div>';

    html += '<div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">';
    html += '<div class="form-group"><label>Agent</label><select id="rvAgent" class="form-control">' + agentOptions + '</select></div>';
    html += '<div class="form-group"><label>Source</label><select id="rvSource" class="form-control">' + sourceOptions + '</select></div>';
    html += '</div>';

    html += '<div class="form-group"><label>Review Text *</label><textarea id="rvText" class="form-control" rows="4" placeholder="What did the client say?">' + escapeHtml(rv.text || '') + '</textarea></div>';

    html += '<div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">';
    html += '<div class="form-group"><label>Date</label><input type="date" id="rvDate" class="form-control" value="' + escapeHtml(rv.date || '') + '"></div>';
    html += '<div class="form-group"><label>Client Email</label><input type="email" id="rvClientEmail" class="form-control" value="' + escapeHtml(rv.clientEmail || '') + '" placeholder="email@example.com"></div>';
    html += '</div>';

    html += '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;">';
    html += '<button class="btn btn-outline" data-action="close-modal">Cancel</button>';
    html += '<button class="btn btn-primary" data-action="save-review" data-id="' + (rv.id || '') + '">' + (isEdit ? 'Update' : 'Add Review') + '</button>';
    html += '</div>';

    html += '</div></div></div>';

    var container = document.createElement('div');
    container.id = 'reviewModal';
    container.innerHTML = html;
    document.body.appendChild(container);

    // Star picker interaction
    var starPicker = document.getElementById('rvStarPicker');
    var ratingInput = document.getElementById('rvRating');
    if (starPicker) {
      starPicker.addEventListener('click', function (e) {
        var star = e.target.closest('[data-star]');
        if (!star) return;
        var val = parseInt(star.getAttribute('data-star'), 10);
        ratingInput.value = val;
        var stars = starPicker.querySelectorAll('[data-star]');
        for (var s = 0; s < stars.length; s++) {
          var sv = parseInt(stars[s].getAttribute('data-star'), 10);
          stars[s].style.color = sv <= val ? '#F59E0B' : '#CBD5E1';
        }
      });
    }

    // Focus first field
    var nameInput = document.getElementById('rvClientName');
    if (nameInput) nameInput.focus();
  }

  function closeModal() {
    var modal = document.getElementById('reviewModal');
    if (modal) modal.parentNode.removeChild(modal);
  }

  function saveReview(id) {
    var clientName = document.getElementById('rvClientName').value.trim();
    var rating = parseInt(document.getElementById('rvRating').value, 10);
    var agent = document.getElementById('rvAgent').value;
    var source = document.getElementById('rvSource').value;
    var text = document.getElementById('rvText').value.trim();
    var date = document.getElementById('rvDate').value;
    var clientEmail = document.getElementById('rvClientEmail').value.trim();

    if (!clientName) { showToast('Client name is required.', 'error'); return; }
    if (!rating || rating < 1 || rating > 5) { showToast('Please select a rating.', 'error'); return; }
    if (!text) { showToast('Review text is required.', 'error'); return; }

    var reviews = getReviews();

    if (id) {
      reviews = reviews.map(function (rv) {
        if (rv.id === id) {
          rv.clientName = clientName;
          rv.clientEmail = clientEmail;
          rv.agent = agent;
          rv.rating = rating;
          rv.text = text;
          rv.source = source || 'Other';
          rv.date = date;
        }
        return rv;
      });
      showToast('Review updated successfully.');
    } else {
      reviews.push({
        id: generateId(),
        clientName: clientName,
        clientEmail: clientEmail,
        agent: agent,
        rating: rating,
        text: text,
        source: source || 'Other',
        date: date,
        featured: false,
        createdAt: new Date().toISOString()
      });
      showToast('Review added successfully.');
    }

    saveReviews(reviews);
    closeModal();
    render();
  }

  function deleteReview(id) {
    if (!confirm('Delete this review?')) return;
    var reviews = getReviews().filter(function (rv) { return rv.id !== id; });
    saveReviews(reviews);
    showToast('Review deleted.');
    render();
  }

  function toggleFeatured(id) {
    var reviews = getReviews();
    reviews = reviews.map(function (rv) {
      if (rv.id === id) {
        rv.featured = !rv.featured;
      }
      return rv;
    });
    saveReviews(reviews);
    render();
  }

  function copyForSocial(id) {
    var reviews = getReviews();
    var rv = null;
    for (var i = 0; i < reviews.length; i++) {
      if (reviews[i].id === id) { rv = reviews[i]; break; }
    }
    if (!rv) return;

    var stars = '';
    for (var s = 0; s < rv.rating; s++) stars += '\u2B50';

    var socialText = stars + '\n\n';
    socialText += '"' + rv.text + '"\n\n';
    socialText += '- ' + rv.clientName;
    if (rv.source && rv.source !== 'Other') {
      socialText += ' (' + rv.source + ' Review)';
    }
    socialText += '\n\nThank you for trusting us with your real estate journey!';

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(socialText).then(function () {
        showToast('Copied to clipboard! Ready to paste on social media.');
      }).catch(function () {
        fallbackCopy(socialText);
      });
    } else {
      fallbackCopy(socialText);
    }
  }

  function fallbackCopy(text) {
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showToast('Copied to clipboard!');
    } catch (e) {
      showToast('Failed to copy. Please copy manually.', 'error');
    }
    document.body.removeChild(textarea);
  }

  // ---- Event delegation ----
  document.addEventListener('click', function (e) {
    var target = e.target.closest('[data-action]');
    if (!target) return;
    var action = target.getAttribute('data-action');

    if (action === 'add-review') {
      openModal(null);
    } else if (action === 'edit-review') {
      var id = target.getAttribute('data-id');
      var reviews = getReviews();
      var review = null;
      for (var i = 0; i < reviews.length; i++) {
        if (reviews[i].id === id) { review = reviews[i]; break; }
      }
      if (review) openModal(review);
    } else if (action === 'delete-review') {
      deleteReview(target.getAttribute('data-id'));
    } else if (action === 'save-review') {
      saveReview(target.getAttribute('data-id'));
    } else if (action === 'close-modal') {
      closeModal();
    } else if (action === 'toggle-featured') {
      toggleFeatured(target.getAttribute('data-id'));
    } else if (action === 'copy-social') {
      copyForSocial(target.getAttribute('data-id'));
    } else if (action === 'filter-source') {
      currentSourceFilter = target.getAttribute('data-filter');
      render();
    } else if (action === 'filter-agent') {
      currentAgentFilter = target.getAttribute('data-filter');
      render();
    } else if (action === 'filter-rating') {
      currentRatingFilter = target.getAttribute('data-filter');
      render();
    }
  });

  // Close modal on overlay click
  document.addEventListener('click', function (e) {
    var overlay = document.getElementById('reviewModalOverlay');
    if (overlay && e.target === overlay) closeModal();
  });

  // ---- Init ----
  render();

})();
