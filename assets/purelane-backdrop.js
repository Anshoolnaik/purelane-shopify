/* ==========================================================================
   PURELANE — BACKDROP CONTROLLER
   --------------------------------------------------------------------------
   Two jobs: pick which scene gradient is showing based on scroll position,
   and drift the water layers for parallax.

   Changes from the prototype:

   1. The section list is re-read on shopify:section:load and :unload. The
      prototype captured `[data-scene]` once at startup, so a section added in
      the theme editor never affected the backdrop and a removed one left a
      stale node in the list.

   2. Section offsets come from getBoundingClientRect() rather than walking
      the offsetTop/offsetParent chain. That walk gives a wrong answer as soon
      as an ancestor is positioned or transformed — which is true of most Dawn
      section wrappers — and the sum was being recomputed on every frame.
      Offsets are now measured once per resize and cached.

   3. Parallax is skipped entirely under prefers-reduced-motion and on
      pointer-coarse devices, where it costs compositing work for an effect
      nobody can trigger.
   ========================================================================== */
(function () {
  'use strict';

  if (window.PurelaneBackdrop) return;

  var LAYER_DEPTH = [0.05, 0.09, 0.03, 0.02];

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)');

  var backdrop = null;
  var layers = [];
  var scenes = [];
  var zones = [];
  var offsets = [];
  var current = 0;
  var frame = null;
  var mouseX = 0;
  var mouseY = 0;
  var parallaxOn = false;

  function collect() {
    backdrop = document.querySelector('[data-pl-backdrop]');
    if (!backdrop) return false;

    layers = Array.prototype.slice.call(backdrop.querySelectorAll('.pl-wl'));
    scenes = Array.prototype.slice.call(backdrop.querySelectorAll('.pl-scene'));
    zones = Array.prototype.slice.call(document.querySelectorAll('[data-pl-scene]'));

    parallaxOn =
      backdrop.getAttribute('data-parallax') !== 'false' &&
      !reduceMotion.matches &&
      finePointer.matches;

    measure();
    return true;
  }

  /**
   * Cache each zone's absolute document offset. Measured here rather than per
   * frame; the prototype recomputed an offsetParent walk on every scroll tick.
   */
  function measure() {
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;

    offsets = zones.map(function (zone) {
      return {
        top: zone.getBoundingClientRect().top + scrollTop,
        scene: parseInt(zone.getAttribute('data-pl-scene'), 10) || 1
      };
    });
  }

  function setScene(n) {
    if (n === current) return;
    current = n;

    scenes.forEach(function (scene, i) {
      scene.classList.toggle('is-on', i + 1 === n);
    });

    backdrop.setAttribute('data-depth', String(n));
  }

  function pickScene() {
    if (!offsets.length) return;

    var focus = (window.pageYOffset || 0) + window.innerHeight * 0.5;
    var next = offsets[0].scene;

    for (var i = 0; i < offsets.length; i++) {
      if (offsets[i].top <= focus) next = offsets[i].scene;
    }

    setScene(next);
  }

  function applyParallax() {
    if (!parallaxOn) return;

    var y = window.pageYOffset || 0;

    for (var i = 0; i < layers.length; i++) {
      var depth = LAYER_DEPTH[i] || 0.05;
      layers[i].style.setProperty('--pl-px', (mouseX * depth * 130).toFixed(1) + 'px');
      layers[i].style.setProperty('--pl-py', (-y * depth + mouseY * depth * 90).toFixed(1) + 'px');
    }
  }

  function render() {
    frame = null;
    pickScene();
    applyParallax();
  }

  function schedule() {
    if (frame) return;
    frame = window.requestAnimationFrame(render);
  }

  function onResize() {
    measure();
    schedule();
  }

  function onMouseMove(event) {
    mouseX = (event.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (event.clientY / window.innerHeight - 0.5) * 2;
    schedule();
  }

  function start() {
    if (!collect()) return;

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', onResize);

    if (parallaxOn) {
      window.addEventListener('mousemove', onMouseMove, { passive: true });
    }

    render();
  }

  /** Re-read the page after the editor adds or removes a section. */
  function refresh() {
    if (!collect()) return;
    // A removed section may have been the one holding the current scene, so
    // force a re-evaluation rather than trusting the cached value.
    current = 0;
    schedule();
  }

  window.PurelaneBackdrop = { refresh: refresh };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  document.addEventListener('shopify:section:load', refresh);
  document.addEventListener('shopify:section:unload', refresh);

  // Images and fonts landing after first paint move every offset below them.
  window.addEventListener('load', onResize);

  if (typeof reduceMotion.addEventListener === 'function') {
    reduceMotion.addEventListener('change', refresh);
  }
})();
