/* ============================================================
   RE Back Office — Agent Profile
   ============================================================ */

(function () {
  'use strict';

  Auth.requireAuth();

  var PREFIX = 'reb_';
  var session = Auth.getSession();
  // Also check API user cache
  if (!session && typeof API !== 'undefined' && API.isLoggedIn()) {
    var apiUser = API.getUser();
    session = { username: apiUser.username, displayName: apiUser.displayName, role: apiUser.role };
  }
  if (!session) return;
  // Ensure displayName exists
  if (!session.displayName && typeof API !== 'undefined') {
    var u = API.getUser();
    if (u) session.displayName = u.displayName;
  }

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

  // ---- Photo upload with zoom/crop ----
  var photoInput = document.createElement('input');
  photoInput.type = 'file';
  photoInput.accept = 'image/*';
  photoInput.style.display = 'none';
  document.body.appendChild(photoInput);

  photoInput.addEventListener('change', function () {
    var file = this.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('Photo too large. Max 5MB.', 'error'); this.value = ''; return; }
    var reader = new FileReader();
    reader.onload = function (e) {
      showCropModal(e.target.result);
    };
    reader.readAsDataURL(file);
    this.value = '';
  });

  function showCropModal(imgSrc) {
    var old = document.getElementById('cropModal');
    if (old) old.remove();

    var zoom = 1;
    var offsetX = 0, offsetY = 0;
    var dragging = false, dragStartX = 0, dragStartY = 0, startOffX = 0, startOffY = 0;

    var overlay = document.createElement('div');
    overlay.id = 'cropModal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px)';

    var modal = document.createElement('div');
    modal.style.cssText = 'background:#fff;border-radius:16px;padding:28px;max-width:400px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.2)';
    modal.innerHTML =
      '<h3 style="font-size:1rem;font-weight:700;color:var(--gray-900);margin-bottom:4px">Adjust Photo</h3>' +
      '<p style="font-size:.8rem;color:var(--gray-400);margin-bottom:16px">Drag to position, scroll or use slider to zoom</p>' +
      '<div id="cropArea" style="width:200px;height:200px;border-radius:50%;overflow:hidden;margin:0 auto;border:3px solid var(--gray-200);cursor:grab;position:relative;background:#000">' +
        '<img id="cropImg" src="' + imgSrc + '" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) scale(1);max-width:none;max-height:none;pointer-events:none;user-select:none" draggable="false">' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:10px;margin:16px auto;max-width:240px">' +
        '<span style="font-size:.75rem;color:var(--gray-400)">-</span>' +
        '<input type="range" id="cropZoom" min="50" max="300" value="100" style="flex:1;accent-color:var(--indigo,#002242)">' +
        '<span style="font-size:.75rem;color:var(--gray-400)">+</span>' +
      '</div>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end">' +
        '<button id="cropCancel" style="padding:9px 20px;border-radius:8px;border:1.5px solid var(--gray-200);background:#fff;font-size:.85rem;font-weight:600;cursor:pointer;font-family:inherit;color:var(--gray-600)">Cancel</button>' +
        '<button id="cropSave" style="padding:9px 20px;border-radius:8px;border:none;background:var(--indigo,#002242);color:#fff;font-size:.85rem;font-weight:700;cursor:pointer;font-family:inherit">Save Photo</button>' +
      '</div>';
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.parentNode.removeChild(overlay);
    });

    var cropArea = document.getElementById('cropArea');
    var cropImg = document.getElementById('cropImg');
    var cropZoom = document.getElementById('cropZoom');

    // Wait for image to load to set initial zoom
    var img = new Image();
    img.onload = function () {
      var minDim = Math.min(img.width, img.height);
      var initialScale = 200 / minDim;
      zoom = Math.max(initialScale, 1);
      cropZoom.value = Math.round(zoom * 100);
      cropZoom.min = Math.round(initialScale * 100);
      updateTransform();
    };
    img.src = imgSrc;

    function updateTransform() {
      cropImg.style.transform = 'translate(calc(-50% + ' + offsetX + 'px), calc(-50% + ' + offsetY + 'px)) scale(' + zoom + ')';
    }

    cropZoom.addEventListener('input', function () {
      zoom = parseInt(this.value) / 100;
      updateTransform();
    });

    cropArea.addEventListener('mousedown', function (e) {
      dragging = true; dragStartX = e.clientX; dragStartY = e.clientY;
      startOffX = offsetX; startOffY = offsetY;
      cropArea.style.cursor = 'grabbing';
      e.preventDefault();
    });
    document.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      offsetX = startOffX + (e.clientX - dragStartX);
      offsetY = startOffY + (e.clientY - dragStartY);
      updateTransform();
    });
    document.addEventListener('mouseup', function () {
      dragging = false;
      if (cropArea) cropArea.style.cursor = 'grab';
    });

    // Touch support
    cropArea.addEventListener('touchstart', function (e) {
      if (e.touches.length === 1) {
        dragging = true; dragStartX = e.touches[0].clientX; dragStartY = e.touches[0].clientY;
        startOffX = offsetX; startOffY = offsetY;
        e.preventDefault();
      }
    }, { passive: false });
    document.addEventListener('touchmove', function (e) {
      if (!dragging || e.touches.length !== 1) return;
      offsetX = startOffX + (e.touches[0].clientX - dragStartX);
      offsetY = startOffY + (e.touches[0].clientY - dragStartY);
      updateTransform();
    });
    document.addEventListener('touchend', function () { dragging = false; });

    // Scroll to zoom
    cropArea.addEventListener('wheel', function (e) {
      e.preventDefault();
      var delta = e.deltaY > 0 ? -5 : 5;
      var newVal = parseInt(cropZoom.value) + delta;
      newVal = Math.max(parseInt(cropZoom.min), Math.min(300, newVal));
      cropZoom.value = newVal;
      zoom = newVal / 100;
      updateTransform();
    }, { passive: false });

    document.getElementById('cropCancel').addEventListener('click', function () { overlay.remove(); });

    document.getElementById('cropSave').addEventListener('click', function () {
      // Render cropped image to canvas
      var canvas = document.createElement('canvas');
      canvas.width = 400; canvas.height = 400;
      var ctx = canvas.getContext('2d');
      var s = zoom;
      var dx = (canvas.width / 2) + offsetX * 2 - (img.width * s / 2) * (canvas.width / 200);
      var dy = (canvas.height / 2) + offsetY * 2 - (img.height * s / 2) * (canvas.height / 200);
      var dw = img.width * s * (canvas.width / 200);
      var dh = img.height * s * (canvas.height / 200);
      ctx.beginPath();
      ctx.arc(200, 200, 200, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, dx, dy, dw, dh);
      var croppedData = canvas.toDataURL('image/jpeg', 0.85);

      // Save locally
      var profiles = getProfiles();
      if (!profiles[session.username]) profiles[session.username] = {};
      profiles[session.username].photo = croppedData;
      saveProfiles(profiles);

      // Save to server
      if (typeof API !== 'undefined' && API.isLoggedIn()) {
        var user = API.getUser();
        API.updateUser(user.id, { photo_url: croppedData }).then(function () {
          showToast('Photo saved!');
        }).catch(function () { showToast('Photo saved locally', 'error'); });
      } else {
        showToast('Photo saved!');
      }

      renderHeader();
      populateSidebarUser();
      overlay.remove();
    });
  }

  // ---- Populate header card ----
  function renderHeader() {
    var profile = getProfile();
    var displayName = profile.displayName || session.displayName;
    var avatarEl = document.getElementById('profileAvatar');

    avatarEl.className = 'agent-avatar ' + agentClass(displayName);
    avatarEl.style.cssText = 'width:100px;height:100px;border-radius:50%;font-size:2rem;font-weight:800;display:flex;align-items:center;justify-content:center;color:#fff;cursor:pointer;position:relative;overflow:hidden;margin:0 auto 16px;';
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
  }

  // ---- Save ----
  document.getElementById('saveProfileBtn').addEventListener('click', function () {
    var displayName = document.getElementById('pDisplayName').value.trim() || session.displayName || 'Agent';
    document.getElementById('pDisplayName').value = displayName;

    var profiles = getProfiles();
    var existing = profiles[session.username] || {};
    profiles[session.username] = {
      displayName: displayName,
      phone: document.getElementById('pPhone').value.trim(),
      email: document.getElementById('pEmail').value.trim(),
      license: document.getElementById('pLicense').value.trim(),
      photo: existing.photo || null
    };

    // Always save to localStorage first so it shows immediately
    saveProfiles(profiles);

    // Also save to API if available
    if (typeof API !== 'undefined' && API.isLoggedIn()) {
      var user = API.getUser();
      if (user && user.id) {
        var profileData = profiles[session.username];
        API.updateUser(user.id, {
          display_name: displayName,
          phone: profileData.phone,
          email: profileData.email,
          license_number: profileData.license,
          profile: {
            photo: profileData.photo
          }
        }).then(function () {
          showToast('Profile saved!');
        }).catch(function (err) {
          console.error('Profile save error:', err);
          showToast('Saved locally — server sync pending');
        });
      } else {
        showToast('Profile saved!');
      }
    } else {
      showToast('Profile saved!');
    }

    // If display name changed, update session
    if (displayName !== session.displayName) {
      var users = JSON.parse(localStorage.getItem(PREFIX + 'users') || '[]');
      var idx = users.findIndex(function (u) { return u.username === session.username; });
      if (idx !== -1) {
        users[idx].displayName = displayName;
        try { localStorage.setItem(PREFIX + 'users', JSON.stringify(users)); } catch(e) {}
      }
      session.displayName = displayName;
      try { localStorage.setItem(PREFIX + 'session', JSON.stringify(session)); } catch(e) {}
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

  // ---- Change Password ----
  var changePwBtn = document.getElementById('changePwBtn');
  if (changePwBtn) {
    changePwBtn.addEventListener('click', function () {
      var current = document.getElementById('pCurrentPw').value;
      var newPw = document.getElementById('pNewPw').value;
      var confirm = document.getElementById('pConfirmPw').value;

      if (!current || !newPw || !confirm) {
        showToast('Please fill in all password fields', 'error');
        return;
      }
      if (newPw.length < 6) {
        showToast('New password must be at least 6 characters', 'error');
        return;
      }
      if (newPw !== confirm) {
        showToast('New passwords do not match', 'error');
        return;
      }

      changePwBtn.disabled = true;
      changePwBtn.textContent = 'Changing...';

      API.changePassword(current, newPw).then(function () {
        showToast('Password changed successfully!');
        document.getElementById('pCurrentPw').value = '';
        document.getElementById('pNewPw').value = '';
        document.getElementById('pConfirmPw').value = '';
        changePwBtn.disabled = false;
        changePwBtn.textContent = 'Change Password';
      }).catch(function (err) {
        showToast(err.error || 'Failed to change password', 'error');
        changePwBtn.disabled = false;
        changePwBtn.textContent = 'Change Password';
      });
    });
  }

  // ---- Init ----
  populateSidebarUser();
  setActiveNav();
  initSidebarToggle();
  renderHeader();
  populateForm();

})();
