/* ==========================================================================
   PURELANE — REVEAL ON SCROLL
   --------------------------------------------------------------------------
   Fades `.pl-rv` elements in as they enter the viewport.

   Differences from the prototype, all forced by the theme editor:

   1. The prototype ran `document.querySelectorAll('.pl-rv')` once on load.
      In the editor, sections are injected after load, so anything added
      later would never be observed — and, because the prototype's CSS hid
      `.rv` unconditionally, a newly added section rendered invisible. This
      runs as a singleton that re-scans on `shopify:section:load`.

   2. Elements are only hidden once this script has marked them
      `is-observed`. If the script fails to run at all, content stays
      visible instead of being stranded at opacity 0.

   3. Under `prefers-reduced-motion` nothing is hidden or observed.
   ========================================================================== */
(function () {
  'use strict';

  if (window.PurelaneReveal) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var observer = null;

  function supported() {
    return 'IntersectionObserver' in window && !reduceMotion.matches;
  }

  function getObserver() {
    if (observer) return observer;

    observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.12 }
    );

    return observer;
  }

  /**
   * Observe every unobserved `.pl-rv` inside `root`.
   * Safe to call repeatedly on the same subtree.
   */
  function scan(root) {
    var scope = root || document;
    var targets = scope.querySelectorAll('.pl-rv:not(.is-observed)');

    if (!targets.length) return;

    if (!supported()) {
      // No observer: leave everything visible. Nothing to do.
      return;
    }

    var io = getObserver();

    Array.prototype.forEach.call(targets, function (el) {
      el.classList.add('is-observed');
      io.observe(el);
    });
  }

  /**
   * Stop tracking a subtree that is being removed, so the observer does not
   * retain detached nodes across repeated add/remove cycles in the editor.
   */
  function release(root) {
    if (!observer || !root) return;

    Array.prototype.forEach.call(root.querySelectorAll('.pl-rv.is-observed'), function (el) {
      observer.unobserve(el);
    });
  }

  window.PurelaneReveal = { scan: scan, release: release };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      scan(document);
    });
  } else {
    scan(document);
  }

  document.addEventListener('shopify:section:load', function (event) {
    scan(event.target);
  });

  document.addEventListener('shopify:section:unload', function (event) {
    release(event.target);
  });

  // If the visitor turns reduced motion on mid-session, drop the hidden state
  // rather than leaving elements mid-transition.
  var onPreferenceChange = function () {
    if (!reduceMotion.matches) return;

    Array.prototype.forEach.call(document.querySelectorAll('.pl-rv.is-observed'), function (el) {
      el.classList.add('is-in');
    });
  };

  if (typeof reduceMotion.addEventListener === 'function') {
    reduceMotion.addEventListener('change', onPreferenceChange);
  } else if (typeof reduceMotion.addListener === 'function') {
    reduceMotion.addListener(onPreferenceChange);
  }
})();
