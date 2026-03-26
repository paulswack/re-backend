/* ============================================================
   RE Back Office — Transactions Page
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
  var tableBody   = document.getElementById('txnTableBody');
  var emptyState  = document.getElementById('txnEmpty');
  var searchInput = document.getElementById('searchInput');
  var statusFilter = document.getElementById('statusFilter');
  var addBtn      = document.getElementById('addTxnBtn');
  var modal       = document.getElementById('txnModal');
  var modalTitle  = document.getElementById('modalTitle');
  var modalClose  = document.getElementById('modalClose');
  var modalCancel = document.getElementById('modalCancel');
  var modalSave   = document.getElementById('modalSave');
  var form        = document.getElementById('txnForm');

  var detailPanel   = document.getElementById('detailPanel');
  var detailOverlay = document.getElementById('detailOverlay');
  var detailClose   = document.getElementById('detailClose');
  var detailBody    = document.getElementById('detailBody');
  var detailActions = document.getElementById('detailActions');

  var editingId = null;

  // ---- Render Table ----
  function render() {
    var txns = Data.getTransactions();
    var query = searchInput.value.toLowerCase();
    var status = statusFilter.value;

    var filtered = txns.filter(function (t) {
      var matchSearch = !query ||
        (t.address && t.address.toLowerCase().indexOf(query) > -1) ||
        (t.agent && t.agent.toLowerCase().indexOf(query) > -1);
      var matchStatus = !status || t.status === status;
      return matchSearch && matchStatus;
    });

    // Sort by createdAt desc
    filtered.sort(function (a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    if (filtered.length === 0) {
      tableBody.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';
    tableBody.innerHTML = filtered.map(function (t) {
      var cls = agentClass(t.agent);
      return '<tr data-id="' + t.id + '" style="cursor:pointer;">' +
        '<td>' +
          '<div style="display:flex;align-items:center;gap:10px;">' +
            '<div class="agent-avatar ' + cls + '" style="width:32px;height:32px;font-size:.68rem;">' + getInitials(t.agent) + '</div>' +
            '<div style="font-weight:600;color:var(--gray-800);max-width:260px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + t.address + '</div>' +
          '</div>' +
        '</td>' +
        '<td>' + (t.agent || '—') + '</td>' +
        '<td style="font-weight:600;">' + Data.formatCurrencyFull(t.price) + '</td>' +
        '<td>' + Data.statusBadge(t.status) + '</td>' +
        '<td>' + Data.formatDate(t.closeDate) + '</td>' +
        '<td>' +
          '<button class="btn btn-outline btn-sm edit-btn" data-id="' + t.id + '" title="Edit">Edit</button>' +
        '</td>' +
      '</tr>';
    }).join('');

    // Row click -> detail
    var rows = tableBody.querySelectorAll('tr');
    rows.forEach(function (row) {
      row.addEventListener('click', function (e) {
        if (e.target.closest('.edit-btn')) return;
        openDetail(row.getAttribute('data-id'));
      });
    });

    // Edit buttons
    var editBtns = tableBody.querySelectorAll('.edit-btn');
    editBtns.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        openEditModal(btn.getAttribute('data-id'));
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
    modalTitle.textContent = 'Add Transaction';
  }

  addBtn.addEventListener('click', function () {
    editingId = null;
    modalTitle.textContent = 'Add Transaction';
    form.reset();
    openModal();
  });

  modalClose.addEventListener('click', closeModal);
  modalCancel.addEventListener('click', closeModal);

  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeModal();
  });

  function openEditModal(id) {
    var txns = Data.getTransactions();
    var t = txns.find(function (x) { return x.id === id; });
    if (!t) return;

    editingId = id;
    modalTitle.textContent = 'Edit Transaction';

    document.getElementById('txnAddress').value = t.address || '';
    document.getElementById('txnPrice').value = t.price || '';
    document.getElementById('txnAgent').value = t.agent || '';
    document.getElementById('txnStatus').value = t.status || 'active';
    document.getElementById('txnCloseDate').value = t.closeDate || '';
    document.getElementById('txnNotes').value = t.notes || '';

    openModal();
  }

  modalSave.addEventListener('click', function () {
    var address = document.getElementById('txnAddress').value.trim();
    var price = document.getElementById('txnPrice').value;
    var agent = document.getElementById('txnAgent').value.trim();
    var status = document.getElementById('txnStatus').value;
    var closeDate = document.getElementById('txnCloseDate').value;
    var notes = document.getElementById('txnNotes').value.trim();

    if (!address || !price || !agent) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    var data = {
      address: address,
      price: parseFloat(price),
      agent: agent,
      status: status,
      closeDate: closeDate,
      notes: notes
    };

    if (editingId) {
      Data.updateTransaction(editingId, data);
      showToast('Transaction updated successfully.');
    } else {
      Data.addTransaction(data);
      showToast('Transaction added successfully.');
    }

    closeModal();
    render();
  });

  // ---- Detail Panel ----
  function openDetail(id) {
    var txns = Data.getTransactions();
    var t = txns.find(function (x) { return x.id === id; });
    if (!t) return;

    var tasks = Data.getTasks().filter(function (task) {
      return task.linkedId === id && task.linkedType === 'transaction';
    });

    detailBody.innerHTML =
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">' +
        '<div class="agent-avatar ' + agentClass(t.agent) + '">' + getInitials(t.agent) + '</div>' +
        '<div>' +
          '<div style="font-size:1rem;font-weight:700;color:var(--gray-900);">' + t.address + '</div>' +
          '<div style="font-size:.82rem;color:var(--gray-400);">' + t.agent + '</div>' +
        '</div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">' +
        '<div class="detail-field"><div class="detail-field-label">Price</div><div class="detail-field-value" style="font-size:1.1rem;font-weight:700;">' + Data.formatCurrencyFull(t.price) + '</div></div>' +
        '<div class="detail-field"><div class="detail-field-label">Status</div><div class="detail-field-value">' + Data.statusBadge(t.status) + '</div></div>' +
        '<div class="detail-field"><div class="detail-field-label">Close Date</div><div class="detail-field-value">' + Data.formatDate(t.closeDate) + '</div></div>' +
        '<div class="detail-field"><div class="detail-field-label">Days Since Created</div><div class="detail-field-value">' + Data.daysSince(t.createdAt) + ' days</div></div>' +
      '</div>' +
      (t.notes ? '<div class="detail-notes"><h4>Notes</h4><p>' + t.notes + '</p></div>' : '') +
      '<div class="detail-tasks">' +
        '<h4>Linked Tasks (' + tasks.length + ')</h4>' +
        (tasks.length === 0 ? '<p style="font-size:.82rem;color:var(--gray-400);">No tasks linked to this transaction.</p>' :
          tasks.map(function (task) {
            var done = task.status === 'done';
            return '<div class="detail-task-item">' +
              '<input type="checkbox" ' + (done ? 'checked' : '') + ' data-task-id="' + task.id + '">' +
              '<span class="' + (done ? 'detail-task-done' : '') + '">' + task.title + '</span>' +
              Data.priorityBadge(task.priority) +
            '</div>';
          }).join('')) +
      '</div>';

    // Task checkbox toggles
    var checkboxes = detailBody.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(function (cb) {
      cb.addEventListener('change', function () {
        var taskId = cb.getAttribute('data-task-id');
        if (cb.checked) {
          Data.updateTask(taskId, { status: 'done', completedAt: new Date().toISOString() });
        } else {
          Data.updateTask(taskId, { status: 'todo', completedAt: null });
        }
        openDetail(id);
      });
    });

    detailActions.innerHTML =
      '<button class="btn btn-outline btn-sm" id="detailEditBtn">Edit</button>' +
      '<button class="btn btn-danger btn-sm" id="detailDeleteBtn">Delete</button>';

    document.getElementById('detailEditBtn').addEventListener('click', function () {
      closeDetail();
      openEditModal(id);
    });

    document.getElementById('detailDeleteBtn').addEventListener('click', function () {
      if (confirm('Delete this transaction? This cannot be undone.')) {
        Data.deleteTransaction(id);
        showToast('Transaction deleted.');
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
