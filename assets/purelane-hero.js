/* ==========================================================================
   PURELANE — HERO PRODUCT STAGE
   --------------------------------------------------------------------------
   Cycles the hero's one / two / three bottle compositions.

   The prototype drove this from module scope with `getElementById('hstage')`
   and a bare `setInterval`. That breaks in three ways inside a theme:

   1. IDs are unique per document, so a second hero instance — or the same
      section re-rendered by the editor — would silently drive the first one.
      State is per-element here, held on a WeakMap.

   2. Sections are destroyed and recreated on every editor change. The
      interval was never cleared, so each edit left another timer running
      against a detached node. Teardown runs on shopify:section:unload.

   3. Selecting a slide block in the editor did nothing, leaving a merchant
      editing composition 3 while looking at composition 1. Block select now
      jumps to that slide and holds it.

   Also adds what the prototype omitted: aria-current on the controls,
   aria-hidden on inactive slides, a live-region announcement, and pausing on
   keyboard focus rather than hover alone.
   ========================================================================== */
(function () {
  'use strict';

  if (window.PurelaneHero) return;

  var SELECTOR = '[data-pl-hero-stage]';
  var instances = new WeakMap();
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function Stage(root) {
    this.root = root;
    this.slides = Array.prototype.slice.call(root.querySelectorAll('[data-pl-hero-slide]'));
    this.dots = Array.prototype.slice.call(root.querySelectorAll('[data-pl-hero-dot]'));
    this.status = root.querySelector('[data-pl-hero-status]');
    this.index = 0;
    this.timer = null;
    this.visible = true;
    this.held = false; // held open by hover, focus or the editor
    this.observer = null;

    this.interval = parseInt(root.getAttribute('data-interval'), 10);
    if (!this.interval || this.interval < 1000) this.interval = 3800;

    this.autoplayAllowed = root.getAttribute('data-autoplay') !== 'false';

    this.onDotClick = this.onDotClick.bind(this);
    this.onEnter = this.onEnter.bind(this);
    this.onLeave = this.onLeave.bind(this);
    this.onMotionChange = this.onMotionChange.bind(this);

    this.bind();

    // Normalise the starting state. Liquid renders aria-hidden on the inactive
    // slides but cannot apply `inert`, and the status region must not announce
    // on first paint — only on an actual change.
    this.go(0, true);
    this.maybePlay();
  }

  Stage.prototype.bind = function () {
    var self = this;

    this.dots.forEach(function (dot) {
      dot.addEventListener('click', self.onDotClick);
    });

    this.root.addEventListener('mouseenter', this.onEnter);
    this.root.addEventListener('mouseleave', this.onLeave);
    this.root.addEventListener('focusin', this.onEnter);
    this.root.addEventListener('focusout', this.onLeave);

    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            self.visible = entry.isIntersecting;
            self.maybePlay();
          });
        },
        { threshold: 0.2 }
      );
      this.observer.observe(this.root);
    }

    if (typeof reduceMotion.addEventListener === 'function') {
      reduceMotion.addEventListener('change', this.onMotionChange);
    } else if (typeof reduceMotion.addListener === 'function') {
      reduceMotion.addListener(this.onMotionChange);
    }
  };

  Stage.prototype.onDotClick = function (event) {
    var index = parseInt(event.currentTarget.getAttribute('data-index'), 10) || 0;
    this.stop();
    this.go(index);
    this.maybePlay();
  };

  Stage.prototype.onEnter = function () {
    this.held = true;
    this.stop();
  };

  Stage.prototype.onLeave = function () {
    this.held = false;
    this.maybePlay();
  };

  Stage.prototype.onMotionChange = function () {
    if (reduceMotion.matches) {
      this.stop();
    } else {
      this.maybePlay();
    }
  };

  Stage.prototype.go = function (next, silent) {
    if (!this.slides.length) return;

    var total = this.slides.length;
    this.index = ((next % total) + total) % total;

    var self = this;

    this.slides.forEach(function (slide, i) {
      var active = i === self.index;
      slide.classList.toggle('is-active', active);

      // Inactive slides are stacked on top of one another at opacity 0. Without
      // this they stay in the accessibility tree and the tab order.
      if (active) {
        slide.removeAttribute('aria-hidden');
        slide.removeAttribute('inert');
      } else {
        slide.setAttribute('aria-hidden', 'true');
        slide.setAttribute('inert', '');
      }
    });

    this.dots.forEach(function (dot, i) {
      dot.setAttribute('aria-current', i === self.index ? 'true' : 'false');
    });

    if (this.status && !silent) {
      var label = this.dots[this.index] ? this.dots[this.index].textContent.trim() : '';
      this.status.textContent =
        label + ' — ' + (this.index + 1) + ' of ' + total;
    }
  };

  Stage.prototype.maybePlay = function () {
    if (this.timer) return;
    if (!this.autoplayAllowed) return;
    if (reduceMotion.matches) return;
    if (this.held || !this.visible) return;
    if (this.slides.length < 2) return;

    var self = this;
    this.timer = window.setInterval(function () {
      self.go(self.index + 1);
    }, this.interval);
  };

  Stage.prototype.stop = function () {
    if (!this.timer) return;
    window.clearInterval(this.timer);
    this.timer = null;
  };

  Stage.prototype.destroy = function () {
    var self = this;

    this.stop();

    this.dots.forEach(function (dot) {
      dot.removeEventListener('click', self.onDotClick);
    });

    this.root.removeEventListener('mouseenter', this.onEnter);
    this.root.removeEventListener('mouseleave', this.onLeave);
    this.root.removeEventListener('focusin', this.onEnter);
    this.root.removeEventListener('focusout', this.onLeave);

    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (typeof reduceMotion.removeEventListener === 'function') {
      reduceMotion.removeEventListener('change', this.onMotionChange);
    } else if (typeof reduceMotion.removeListener === 'function') {
      reduceMotion.removeListener(this.onMotionChange);
    }
  };

  function init(root) {
    var scope = root || document;
    var stages = scope.querySelectorAll ? scope.querySelectorAll(SELECTOR) : [];

    Array.prototype.forEach.call(stages, function (el) {
      if (instances.has(el)) return;
      instances.set(el, new Stage(el));
    });

    // The section wrapper itself may be the stage when queried from an event.
    if (scope.matches && scope.matches(SELECTOR) && !instances.has(scope)) {
      instances.set(scope, new Stage(scope));
    }
  }

  function destroy(root) {
    if (!root || !root.querySelectorAll) return;

    Array.prototype.forEach.call(root.querySelectorAll(SELECTOR), function (el) {
      var stage = instances.get(el);
      if (!stage) return;
      stage.destroy();
      instances.delete(el);
    });
  }

  window.PurelaneHero = { init: init, destroy: destroy };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      init(document);
    });
  } else {
    init(document);
  }

  document.addEventListener('shopify:section:load', function (event) {
    init(event.target);
  });

  document.addEventListener('shopify:section:unload', function (event) {
    destroy(event.target);
  });

  // Editor: selecting a composition block shows it and holds it there.
  document.addEventListener('shopify:block:select', function (event) {
    var slide = event.target.closest
      ? event.target.closest('[data-pl-hero-slide]')
      : null;
    if (!slide) return;

    var root = slide.closest(SELECTOR);
    var stage = root ? instances.get(root) : null;
    if (!stage) return;

    stage.held = true;
    stage.stop();
    stage.go(parseInt(slide.getAttribute('data-index'), 10) || 0);
  });

  document.addEventListener('shopify:block:deselect', function (event) {
    var slide = event.target.closest
      ? event.target.closest('[data-pl-hero-slide]')
      : null;
    if (!slide) return;

    var root = slide.closest(SELECTOR);
    var stage = root ? instances.get(root) : null;
    if (!stage) return;

    stage.held = false;
    stage.maybePlay();
  });
})();
