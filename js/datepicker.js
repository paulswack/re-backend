/* ============================================================
   RE Back Office — Global Date Picker (Flatpickr)
   Auto-applies to all input[type="date"] including dynamic ones
   ============================================================ */
(function() {
  'use strict';

  function initPicker(input) {
    if (!input || input._flatpickr) return; // already initialized
    if (typeof flatpickr === 'undefined') return;
    flatpickr(input, {
      dateFormat: 'Y-m-d',        // keeps the same value format the app expects
      altInput: true,             // shows friendly format to the user
      altFormat: 'M j, Y',       // e.g. "Apr 15, 2025"
      allowInput: false,          // force calendar only, no typing
      disableMobile: false,       // use native picker on mobile (best UX)
      monthSelectorType: 'static',
      animate: true,
      onReady: function(_, __, fp) {
        // Add close button for better UX
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = 'Done';
        btn.style.cssText = 'display:block;width:calc(100% - 24px);margin:8px 12px 4px;padding:8px;background:var(--indigo,#6366F1);color:#fff;border:none;border-radius:8px;font-size:.85rem;font-weight:700;cursor:pointer;font-family:inherit';
        btn.addEventListener('click', function() { fp.close(); });
        fp.calendarContainer.appendChild(btn);
      }
    });
  }

  function initAll() {
    document.querySelectorAll('input[type="date"]').forEach(initPicker);
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  // Watch for dynamically added date inputs (JS-rendered views)
  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.nodeType !== 1) return;
        if (node.matches && node.matches('input[type="date"]')) {
          initPicker(node);
        }
        if (node.querySelectorAll) {
          node.querySelectorAll('input[type="date"]').forEach(initPicker);
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });

})();
