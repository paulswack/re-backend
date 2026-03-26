/* ============================================================
   RE Back Office — Listings Page
   ============================================================ */

(function () {
  'use strict';

  Auth.requireAuth();
  populateSidebarUser();
  setActiveNav();
  initSidebarToggle();

  document.getElementById('logoutBtn').addEventListener('click', function () {
    Auth.logout();
  });

  // ---- DOM refs ----
  var grid        = document.getElementById('listingsGrid');
  var emptyState  = document.getElementById('listingsEmpty');
  var searchInput = document.getElementById('searchInput');
  var statusFilter = document.getElementById('statusFilter');
  var addBtn      = document.getElementById('addListingBtn');
  var modal       = document.getElementById('listingModal');
  var modalTitle  = document.getElementById('modalTitle');
  var modalClose  = document.getElementById('modalClose');
  var modalCancel = document.getElementById('modalCancel');
  var modalSave   = document.getElementById('modalSave');
  var form        = document.getElementById('listingForm');

  var detailPanel   = document.getElementById('detailPanel');
  var detailOverlay = document.getElementById('detailOverlay');
  var detailClose   = document.getElementById('detailClose');
  var detailBody    = document.getElementById('detailBody');
  var detailActions = document.getElementById('detailActions');

  var editingId = null;

  // ---- Render Grid ----
  function render() {
    var listings = Data.getListings();
    var query = searchInput.value.toLowerCase();
    var status = statusFilter.value;

    var filtered = listings.filter(function (l) {
      var matchSearch = !query ||
        (l.address && l.address.toLowerCase().indexOf(query) > -1) ||
        (l.agent && l.agent.toLowerCase().indexOf(query) > -1);
      var matchStatus = !status || l.status === status;
      return matchSearch && matchStatus;
    });

    filtered.sort(function (a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    if (filtered.length === 0) {
      grid.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';
    grid.innerHTML = filtered.map(function (l) {
      var cls = agentClass(l.agent);
      return '<div class="listing-card" data-id="' + l.id + '">' +
        '<div class="listing-card-img">' +
          '<svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>' +
          '<div class="listing-card-status">' + Data.statusBadge(l.status) + '</div>' +
        '</div>' +
        '<div class="listing-card-body">' +
          '<div class="listing-card-price">' + Data.formatCurrencyFull(l.price) + '</div>' +
          '<div class="listing-card-address">' + l.address + '</div>' +
          '<div class="listing-card-details">' +
            (l.beds ? '<span><strong>' + l.beds + '</strong> beds</span>' : '') +
            (l.baths ? '<span><strong>' + l.baths + '</strong> baths</span>' : '') +
            (l.sqft ? '<span><strong>' + Number(l.sqft).toLocaleString() + '</strong> sqft</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="listing-card-footer">' +
          '<div class="listing-card-agent">' +
            '<div class="agent-avatar ' + cls + '" style="width:24px;height:24px;font-size:.6rem;">' + getInitials(l.agent) + '</div>' +
            l.agent +
          '</div>' +
          '<span style="font-size:.75rem;color:var(--gray-400);">' + Data.formatDate(l.listingDate) + '</span>' +
        '</div>' +
      '</div>';
    }).join('');

    // Card click -> detail
    var cards = grid.querySelectorAll('.listing-card');
    cards.forEach(function (card) {
      card.addEventListener('click', function () {
        openDetail(card.getAttribute('data-id'));
      });
    });
  }

  // ---- Modal ----
  function openModal() {
    modal.classList.add('open');
  }

  function closeModal() {
    modal.classList.remove('open');
    form.reset();
    editingId = null;
    modalTitle.textContent = 'Add Listing';
  }

  addBtn.addEventListener('click', function () {
    editingId = null;
    modalTitle.textContent = 'Add Listing';
    form.reset();
    openModal();
  });

  modalClose.addEventListener('click', closeModal);
  modalCancel.addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeModal();
  });

  function openEditModal(id) {
    var listings = Data.getListings();
    var l = listings.find(function (x) { return x.id === id; });
    if (!l) return;

    editingId = id;
    modalTitle.textContent = 'Edit Listing';

    document.getElementById('lstAddress').value = l.address || '';
    document.getElementById('lstPrice').value = l.price || '';
    document.getElementById('lstAgent').value = l.agent || '';
    document.getElementById('lstBeds').value = l.beds || '';
    document.getElementById('lstBaths').value = l.baths || '';
    document.getElementById('lstSqft').value = l.sqft || '';
    document.getElementById('lstStatus').value = l.status || 'active';
    document.getElementById('lstDate').value = l.listingDate || '';
    document.getElementById('lstDescription').value = l.description || '';

    openModal();
  }

  modalSave.addEventListener('click', function () {
    var address = document.getElementById('lstAddress').value.trim();
    var price = document.getElementById('lstPrice').value;
    var agent = document.getElementById('lstAgent').value.trim();
    var beds = document.getElementById('lstBeds').value;
    var baths = document.getElementById('lstBaths').value;
    var sqft = document.getElementById('lstSqft').value;
    var status = document.getElementById('lstStatus').value;
    var listingDate = document.getElementById('lstDate').value;
    var description = document.getElementById('lstDescription').value.trim();

    if (!address || !price || !agent) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    var data = {
      address: address,
      price: parseFloat(price),
      agent: agent,
      beds: beds ? parseInt(beds) : null,
      baths: baths ? parseFloat(baths) : null,
      sqft: sqft ? parseInt(sqft) : null,
      status: status,
      listingDate: listingDate,
      description: description
    };

    if (editingId) {
      Data.updateListing(editingId, data);
      showToast('Listing updated successfully.');
    } else {
      Data.addListing(data);
      showToast('Listing added successfully.');
    }

    closeModal();
    render();
  });

  // ---- Detail Panel ----
  function openDetail(id) {
    var listings = Data.getListings();
    var l = listings.find(function (x) { return x.id === id; });
    if (!l) return;

    var tasks = Data.getTasks().filter(function (task) {
      return task.linkedId === id && task.linkedType === 'listing';
    });

    detailBody.innerHTML =
      '<div style="height:180px;background:linear-gradient(135deg,var(--indigo-light),#F5F3FF);border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:20px;">' +
        '<svg viewBox="0 0 24 24" style="width:48px;height:48px;fill:var(--gray-300);"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>' +
      '</div>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">' +
        '<div class="listing-card-price" style="font-size:1.4rem;">' + Data.formatCurrencyFull(l.price) + '</div>' +
        Data.statusBadge(l.status) +
      '</div>' +
      '<div style="font-size:.95rem;font-weight:600;color:var(--gray-800);margin-bottom:16px;">' + l.address + '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px;">' +
        '<div style="text-align:center;padding:12px;background:var(--gray-50);border-radius:10px;">' +
          '<div style="font-size:1.15rem;font-weight:800;color:var(--gray-900);">' + (l.beds || '—') + '</div>' +
          '<div style="font-size:.72rem;color:var(--gray-400);font-weight:600;">BEDS</div>' +
        '</div>' +
        '<div style="text-align:center;padding:12px;background:var(--gray-50);border-radius:10px;">' +
          '<div style="font-size:1.15rem;font-weight:800;color:var(--gray-900);">' + (l.baths || '—') + '</div>' +
          '<div style="font-size:.72rem;color:var(--gray-400);font-weight:600;">BATHS</div>' +
        '</div>' +
        '<div style="text-align:center;padding:12px;background:var(--gray-50);border-radius:10px;">' +
          '<div style="font-size:1.15rem;font-weight:800;color:var(--gray-900);">' + (l.sqft ? Number(l.sqft).toLocaleString() : '—') + '</div>' +
          '<div style="font-size:.72rem;color:var(--gray-400);font-weight:600;">SQFT</div>' +
        '</div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">' +
        '<div class="detail-field"><div class="detail-field-label">Agent</div><div class="detail-field-value">' +
          '<div style="display:flex;align-items:center;gap:8px;">' +
            '<div class="agent-avatar ' + agentClass(l.agent) + '" style="width:24px;height:24px;font-size:.6rem;">' + getInitials(l.agent) + '</div>' +
            l.agent +
          '</div>' +
        '</div></div>' +
        '<div class="detail-field"><div class="detail-field-label">Listing Date</div><div class="detail-field-value">' + Data.formatDate(l.listingDate) + '</div></div>' +
      '</div>' +
      (l.description ? '<div style="margin-top:12px;padding:16px;background:var(--gray-50);border-radius:10px;">' +
        '<div style="font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--gray-400);margin-bottom:6px;">Description</div>' +
        '<p style="font-size:.88rem;color:var(--gray-600);line-height:1.6;">' + l.description + '</p>' +
      '</div>' : '') +
      (tasks.length > 0 ? '<div style="margin-top:20px;">' +
        '<div style="font-size:.82rem;font-weight:700;color:var(--gray-700);margin-bottom:8px;">Linked Tasks (' + tasks.length + ')</div>' +
        tasks.map(function (task) {
          var done = task.status === 'done';
          return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:.85rem;color:' + (done ? 'var(--gray-400)' : 'var(--gray-700)') + ';' + (done ? 'text-decoration:line-through;' : '') + '">' +
            Data.priorityBadge(task.priority) + ' ' + task.title +
          '</div>';
        }).join('') +
      '</div>' : '');

    detailActions.innerHTML =
      '<button class="btn btn-outline btn-sm" id="detailEditBtn">Edit</button>' +
      '<button class="btn btn-danger btn-sm" id="detailDeleteBtn">Delete</button>';

    document.getElementById('detailEditBtn').addEventListener('click', function () {
      closeDetail();
      openEditModal(id);
    });

    document.getElementById('detailDeleteBtn').addEventListener('click', function () {
      if (confirm('Delete this listing? This cannot be undone.')) {
        Data.deleteListing(id);
        showToast('Listing deleted.');
        closeDetail();
        render();
      }
    });

    detailPanel.classList.add('open');
    detailOverlay.classList.add('open');
  }

  function closeDetail() {
    detailPanel.classList.remove('open');
    detailOverlay.classList.remove('open');
  }

  detailClose.addEventListener('click', closeDetail);
  detailOverlay.addEventListener('click', closeDetail);

  // ---- Filters ----
  searchInput.addEventListener('input', render);
  statusFilter.addEventListener('change', render);

  // ---- Init ----
  render();

})();
