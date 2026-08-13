/* ==========================================================================
   PURELANE — CHROME
   --------------------------------------------------------------------------
   Three small behaviours that share one scroll listener:
     - the header pill tightening to the top once you scroll
     - the progress rail marking the section you are in
     - the mobile menu disclosure

   They are together in one file because splitting them would mean three
   scroll listeners doing the same rAF dance. Each part no-ops if its markup
   is not on the page, so a merchant can use any one section without the
   others.
   ========================================================================== */
(function () {
  'use strict';

  if (window.PurelaneChrome) return;

  var header = null;
  var rail = null;
  var railLinks = [];
  var railTargets = [];
  var frame = null;

  /* ---------------------------------------------------------------------- */
  /* Collection                                                             */
  /* ---------------------------------------------------------------------- */

  function collect() {
    header = document.querySelector('[data-pl-header]');
    rail = document.querySelector('[data-pl-rail]');

    railLinks = rail ? Array.prototype.slice.call(rail.querySelectorAll('a')) : [];

    railTargets = railLinks.map(function (link) {
      var href = link.getAttribute('href') || '';
      if (href.charAt(0) !== '#' || href.length < 2) return null;
      try {
        return document.querySelector(href);
      } catch (error) {
        // A merchant-entered anchor may not be a valid selector.
        return null;
      }
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Scroll behaviours                                                      */
  /* ---------------------------------------------------------------------- */

  function syncHeader(y) {
    if (!header) return;
    header.classList.toggle('is-up', y > 90);
  }

  function syncRail(y) {
    if (!railLinks.length) return;

    var mid = y + window.innerHeight * 0.42;
    var active = 0;

    railTargets.forEach(function (target, i) {
      if (!target) return;
      // getBoundingClientRect + scroll is correct under transformed ancestors,
      // unlike the offsetTop walk the prototype used.
      if (target.getBoundingClientRect().top + y <= mid) active = i;
    });

    railLinks.forEach(function (link, i) {
      var on = i === active;
      link.classList.toggle('is-on', on);
      if (on) {
        link.setAttribute('aria-current', 'true');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  function render() {
    frame = null;
    var y = window.pageYOffset || 0;
    syncHeader(y);
    syncRail(y);
  }

  function schedule() {
    if (frame) return;
    frame = window.requestAnimationFrame(render);
  }

  /* ---------------------------------------------------------------------- */
  /* Mobile menu                                                            */
  /* ---------------------------------------------------------------------- */

  function closeMenu(toggle, panel, returnFocus) {
    toggle.setAttribute('aria-expanded', 'false');
    panel.hidden = true;
    if (returnFocus) toggle.focus();
  }

  function bindMenu() {
    var toggle = document.querySelector('[data-pl-menu-toggle]');
    var panel = document.querySelector('[data-pl-menu]');
    if (!toggle || !panel || toggle.dataset.plBound === 'true') return;

    toggle.dataset.plBound = 'true';

    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';

      if (open) {
        closeMenu(toggle, panel, false);
        return;
      }

      toggle.setAttribute('aria-expanded', 'true');
      panel.hidden = false;

      var first = panel.querySelector('a');
      if (first) first.focus();
    });

    // Escape closes and hands focus back to the button that opened it.
    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      if (toggle.getAttribute('aria-expanded') !== 'true') return;
      closeMenu(toggle, panel, true);
    });

    // A click outside dismisses it, matching how every other menu behaves.
    document.addEventListener('click', function (event) {
      if (toggle.getAttribute('aria-expanded') !== 'true') return;
      if (panel.contains(event.target) || toggle.contains(event.target)) return;
      closeMenu(toggle, panel, false);
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Lifecycle                                                              */
  /* ---------------------------------------------------------------------- */

  function refresh() {
    collect();
    bindMenu();
    schedule();
  }

  function start() {
    refresh();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('load', schedule);
  }

  window.PurelaneChrome = { refresh: refresh };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  // Rail targets are other sections, so any section change can invalidate them.
  document.addEventListener('shopify:section:load', refresh);
  document.addEventListener('shopify:section:unload', refresh);
})();
