/* ============================================================
   RE Back Office — Agent Profile
   ============================================================ */

(function () {
  'use strict';

  Auth.requireAuth();

  var PREFIX = 'reb_';
  var session = Auth.getSession();
  if (!session) return;

  // ---- Profile data helpers ----
  function getProfiles() {
    return JSON.parse(localStorage.getItem(PREFIX + 'profiles') || '{}');
  }

  function saveProfiles(profiles) {
    localStorage.setItem(PREFIX + 'profiles', JSON.stringify(profiles));
  }

  function getProfile() {
    var profiles = getProfiles();
    return profiles[session.username] || {};
  }

  // ---- Photo upload ----
  // Add hidden file input to page
  var photoInput = document.createElement('input');
  photoInput.type = 'file';
  photoInput.accept = 'image/*';
  photoInput.style.display = 'none';
  document.body.appendChild(photoInput);

  photoInput.addEventListener('change', function () {
    var file = this.files[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { showToast('Photo too large. Max 3MB.', 'error'); this.value = ''; return; }
    var reader = new FileReader();
    reader.onload = function (e) {
      var profiles = getProfiles();
      if (!profiles[session.username]) profiles[session.username] = {};
      profiles[session.username].photo = e.target.result;
      saveProfiles(profiles);
      renderHeader();
      populateSidebarUser();
      showToast('Photo updated');
    };
    reader.readAsDataURL(file);
    this.value = '';
  });

  // ---- Populate header card ----
  function renderHeader() {
    var profile = getProfile();
    var displayName = profile.displayName || session.displayName;
    var avatarEl = document.getElementById('profileAvatar');

    avatarEl.className = 'agent-avatar ' + agentClass(displayName);
    avatarEl.style.cssText = 'width:80px;height:80px;border-radius:16px;font-size:1.5rem;font-weight:800;display:flex;align-items:center;justify-content:center;color:#fff;cursor:pointer;position:relative;overflow:hidden;';
    avatarEl.title = 'Click to change photo';

    if (profile.photo) {
      avatarEl.innerHTML = '<img src="' + profile.photo + '" style="width:100%;height:100%;object-fit:cover">' +
        '<div style="position:absolute;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s"><svg viewBox="0 0 24 24" width="24" height="24" fill="#fff"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>';
      avatarEl.onmouseenter = function () { this.querySelector('div').style.opacity = '1'; };
      avatarEl.onmouseleave = function () { this.querySelector('div').style.opacity = '0'; };
    } else {
      avatarEl.innerHTML = getInitials(displayName) +
        '<div style="position:absolute;inset:0;background:rgba(0,0,0,.3);display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0;transition:opacity .15s"><svg viewBox="0 0 24 24" width="20" height="20" fill="#fff"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg><span style="font-size:.6rem;color:#fff;margin-top:2px">Add Photo</span></div>';
      avatarEl.onmouseenter = function () { this.querySelector('div').style.opacity = '1'; };
      avatarEl.onmouseleave = function () { this.querySelector('div').style.opacity = '0'; };
    }

    avatarEl.onclick = function () { photoInput.click(); };

    document.getElementById('profileName').textContent = displayName;
    document.getElementById('profileRole').textContent = session.role;
    document.getElementById('profileUsername').textContent = '@' + session.username;
  }

  // ---- Populate form ----
  function populateForm() {
    var profile = getProfile();
    document.getElementById('pDisplayName').value = profile.displayName || session.displayName;
    document.getElementById('pPhone').value = profile.phone || '';
    document.getElementById('pEmail').value = profile.email || '';
    document.getElementById('pLicense').value = profile.license || '';
    document.getElementById('pYears').value = profile.yearsExperience || '';
    document.getElementById('pSpecialties').value = (profile.specialties || []).join(', ');
    document.getElementById('pBio').value = profile.bio || '';
  }

  // ---- Save ----
  document.getElementById('saveProfileBtn').addEventListener('click', function () {
    var displayName = document.getElementById('pDisplayName').value.trim();
    if (!displayName) {
      showToast('Display name is required', 'error');
      return;
    }

    var profiles = getProfiles();
    var specialtiesRaw = document.getElementById('pSpecialties').value;
    var specialties = specialtiesRaw ? specialtiesRaw.split(',').map(function (s) { return s.trim(); }).filter(Boolean) : [];

    var existing = profiles[session.username] || {};
    profiles[session.username] = {
      displayName: displayName,
      phone: document.getElementById('pPhone').value.trim(),
      email: document.getElementById('pEmail').value.trim(),
      license: document.getElementById('pLicense').value.trim(),
      yearsExperience: document.getElementById('pYears').value ? parseInt(document.getElementById('pYears').value, 10) : null,
      specialties: specialties,
      bio: document.getElementById('pBio').value.trim(),
      photo: existing.photo || null
    };

    saveProfiles(profiles);

    // If display name changed, update reb_users and session
    if (displayName !== session.displayName) {
      // Update users array
      var users = JSON.parse(localStorage.getItem(PREFIX + 'users') || '[]');
      var idx = users.findIndex(function (u) { return u.username === session.username; });
      if (idx !== -1) {
        users[idx].displayName = displayName;
        localStorage.setItem(PREFIX + 'users', JSON.stringify(users));
      }

      // Update session
      session.displayName = displayName;
      localStorage.setItem(PREFIX + 'session', JSON.stringify(session));

      // Refresh sidebar
      populateSidebarUser();
    }

    renderHeader();
    showToast('Profile saved');
  });

  // Logout button
  var logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () { Auth.logout(); });
  }

  // ---- Init ----
  populateSidebarUser();
  setActiveNav();
  initSidebarToggle();
  renderHeader();
  populateForm();

})();
