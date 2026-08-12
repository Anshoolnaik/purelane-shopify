/* ==========================================================================
   PURELANE — PRODUCT ROTATOR
   --------------------------------------------------------------------------
   Cycles the products in the proof panel and updates the caption beneath.

   Same three theme-editor problems as the hero stage, solved the same way:
   per-element state, teardown on shopify:section:unload, and a re-scan on
   shopify:section:load.

   Two differences from the prototype's version:

   - Captions are read from data attributes on each slot rather than from a
     separate array. The prototype kept the caption list and the image list in
     step by index, which silently breaks the moment a merchant reorders or
     removes one.

   - It stops rather than starts when reduced motion is set. The prototype
     skipped the timer but left the first product as the only one ever shown;
     the stylesheet now lays them out as a static row instead.
   ========================================================================== */
(function () {
  'use strict';

  if (window.PurelaneRotator) return;

  var SELECTOR = '[data-pl-rotator]';
  var instances = new WeakMap();
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function Rotator(root) {
    this.root = root;
    this.slots = Array.prototype.slice.call(root.querySelectorAll('[data-pl-rotator-slot]'));
    this.dots = Array.prototype.slice.call(root.querySelectorAll('[data-pl-rotator-dots] i'));

    var caption = root.querySelector('[data-pl-rotator-cap]');
    this.captionName = caption ? caption.querySelector('b') : null;
    this.captionNote = caption ? caption.querySelector('span') : null;

    this.index = 0;
    this.timer = null;
    this.observer = null;

    this.interval = parseInt(root.getAttribute('data-interval'), 10);
    if (!this.interval || this.interval < 800) this.interval = 2900;

    this.paint();
    this.watch();
  }

  Rotator.prototype.paint = function () {
    var self = this;

    this.slots.forEach(function (slot, i) {
      slot.classList.toggle('is-on', i === self.index);
    });

    this.dots.forEach(function (dot, i) {
      dot.classList.toggle('is-on', i === self.index);
    });

    var active = this.slots[this.index];
    if (!active) return;

    if (this.captionName) {
      this.captionName.textContent = active.getAttribute('data-name') || '';
    }

    if (this.captionNote) {
      this.captionNote.textContent = active.getAttribute('data-note') || '';
    }
  };

  Rotator.prototype.step = function () {
    if (!this.slots.length) return;
    this.index = (this.index + 1) % this.slots.length;
    this.paint();
  };

  Rotator.prototype.watch = function () {
    var self = this;

    if (!('IntersectionObserver' in window)) {
      this.play();
      return;
    }

    this.observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            self.play();
          } else {
            self.stop();
          }
        });
      },
      { threshold: 0.25 }
    );

    this.observer.observe(this.root);
  };

  Rotator.prototype.play = function () {
    if (this.timer) return;
    if (reduceMotion.matches) return;
    if (this.slots.length < 2) return;

    var self = this;
    this.timer = window.setInterval(function () {
      self.step();
    }, this.interval);
  };

  Rotator.prototype.stop = function () {
    if (!this.timer) return;
    window.clearInterval(this.timer);
    this.timer = null;
  };

  Rotator.prototype.destroy = function () {
    this.stop();

    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  };

  function init(root) {
    var scope = root || document;
    if (!scope.querySelectorAll) return;

    Array.prototype.forEach.call(scope.querySelectorAll(SELECTOR), function (el) {
      if (instances.has(el)) return;
      instances.set(el, new Rotator(el));
    });
  }

  function destroy(root) {
    if (!root || !root.querySelectorAll) return;

    Array.prototype.forEach.call(root.querySelectorAll(SELECTOR), function (el) {
      var rotator = instances.get(el);
      if (!rotator) return;
      rotator.destroy();
      instances.delete(el);
    });
  }

  window.PurelaneRotator = { init: init, destroy: destroy };

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

  // Selecting a rotator product block in the editor holds it on screen.
  document.addEventListener('shopify:block:select', function (event) {
    var slot = event.target.closest
      ? event.target.closest('[data-pl-rotator-slot]')
      : null;
    if (!slot) return;

    var root = slot.closest(SELECTOR);
    var rotator = root ? instances.get(root) : null;
    if (!rotator) return;

    rotator.stop();
    rotator.index = rotator.slots.indexOf(slot);
    rotator.paint();
  });

  document.addEventListener('shopify:block:deselect', function (event) {
    var slot = event.target.closest
      ? event.target.closest('[data-pl-rotator-slot]')
      : null;
    if (!slot) return;

    var root = slot.closest(SELECTOR);
    var rotator = root ? instances.get(root) : null;
    if (rotator) rotator.play();
  });
})();
