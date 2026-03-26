/* ============================================================
   RE Back Office — Theme Handler
   ============================================================ */

(function () {
  'use strict';

  // Set document title from the data-title attribute on <html> or <body>
  var titleAttr = document.documentElement.getAttribute('data-title')
    || (document.body && document.body.getAttribute('data-title'));

  if (titleAttr) {
    document.title = titleAttr;
  }
})();
