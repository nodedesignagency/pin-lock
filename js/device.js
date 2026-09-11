/* ==========================================================================
   Pin Lock — the handset around the screen.

   Scales the whole device to whatever is looking at it and runs the clock in
   the drawn status bar. Below the mockup breakpoint the stylesheet takes the
   frame back to full bleed and none of this shows.
   ========================================================================== */

window.PinLock = window.PinLock || {};

(function (NS) {
  'use strict';

  /* Outer size of the handset in iPhone points — screen plus bezel and rail,
     matching the values in device.css. */
  var DEVICE_W = 417;
  var DEVICE_H = 876;
  var MARGIN = 26;

  function start() {
    var viewport = document.querySelector('.viewport');
    var device = document.getElementById('device');
    var clock = document.getElementById('clock');
    if (!viewport || !device) return;

    /* Never scale past 1:1 — a handset blown up bigger than life reads as a
       picture of a phone rather than a phone. */
    function fit() {
      var k = Math.min(
        1,
        (viewport.clientHeight - MARGIN * 2) / DEVICE_H,
        (viewport.clientWidth - MARGIN * 2) / DEVICE_W
      );
      device.style.setProperty('--k', Math.max(0.2, k).toFixed(4));
      /* Scaling an ancestor doesn't change layout sizes, so nothing else
         would hear about it. */
      window.dispatchEvent(new CustomEvent('pinlock:rescale'));
    }

    function tick() {
      if (!clock) return;
      var now = new Date();
      var text = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      clock.textContent = text.replace(/\s*[AaPp]\.?[Mm]\.?$/, '').trim();
    }

    if (window.ResizeObserver) {
      new ResizeObserver(fit).observe(viewport);
    } else {
      window.addEventListener('resize', fit);
      window.addEventListener('orientationchange', fit);
    }

    fit();
    tick();
    setInterval(tick, 15000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})(window.PinLock);
