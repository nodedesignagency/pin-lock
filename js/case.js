/* ==========================================================================
   Pin Lock — the case opening and shutting.

   The lid hinges on its top edge and the body on its bottom, so both halves
   fall away from the viewer and the lining is left facing out.
   ========================================================================== */

(function (NS) {
  'use strict';

  var sound = NS.sound;

  var OPEN_DEG = 102;
  var OPEN_EASE = 'cubic-bezier(0.32, 0.72, 0.2, 1)';
  var SHUT_EASE = 'cubic-bezier(0.5, 0, 0.2, 1)';
  var OPEN_MS = 720;
  var SHUT_MS = 560;

  function reduced() {
    return window.matchMedia &&
           window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* WAAPI with a promise, and a graceful path for browsers without it. */
  function play(el, frames, options) {
    var final = frames[frames.length - 1];

    function settle() {
      for (var prop in final) {
        if (prop !== 'offset' && prop !== 'easing' &&
            Object.prototype.hasOwnProperty.call(final, prop)) {
          el.style[prop] = final[prop];
        }
      }
    }

    if (!el.animate || options.duration === 0) {
      settle();
      return Promise.resolve();
    }

    var anim = el.animate(frames, options);
    var done = anim.finished
      ? anim.finished.catch(function () {})
      : new Promise(function (resolve) { anim.onfinish = resolve; });

    return done.then(function () {
      settle();
      anim.cancel();
    });
  }

  function Case() {
    this.stage = document.getElementById('stage');
    this.caseEl = document.getElementById('case');
    this.lid = document.getElementById('panelLid');
    this.body = document.getElementById('panelBody');
    this.inside = document.getElementById('inside');
    this.shades = [
      this.lid.querySelector('.panel__shade'),
      this.body.querySelector('.panel__shade')
    ];
    this.state = 'closed';
    this._setInsideReachable(false);
  }

  Case.prototype._setInsideReachable = function (on) {
    this.inside.setAttribute('aria-hidden', on ? 'false' : 'true');
    this.inside.toggleAttribute('inert', !on);
  };

  Case.prototype.isOpen = function () { return this.state === 'open'; };

  Case.prototype.open = function () {
    var self = this;
    if (this.state !== 'closed') return Promise.resolve();
    this.state = 'opening';
    this.stage.setAttribute('data-state', 'opening');

    var ms = reduced() ? 0 : OPEN_MS;
    if (ms) sound.sweep();

    this._setInsideReachable(true);

    var jobs = [
      play(this.inside,
        [
          { opacity: 0, transform: 'scale(0.94)' },
          { opacity: 1, transform: 'scale(1)' }
        ],
        { duration: ms ? ms * 0.8 : 0, easing: OPEN_EASE, fill: 'both' }),

      play(this.lid,
        [
          { transform: 'rotateX(0deg)', opacity: 1 },
          { transform: 'rotateX(' + (OPEN_DEG * 0.78) + 'deg)', opacity: 1, offset: 0.74 },
          { transform: 'rotateX(' + OPEN_DEG + 'deg)', opacity: 0 }
        ],
        { duration: ms, easing: OPEN_EASE, fill: 'both' }),

      play(this.body,
        [
          { transform: 'rotateX(0deg)', opacity: 1 },
          { transform: 'rotateX(' + (-OPEN_DEG * 0.78) + 'deg)', opacity: 1, offset: 0.74 },
          { transform: 'rotateX(' + (-OPEN_DEG) + 'deg)', opacity: 0 }
        ],
        { duration: ms ? ms + 60 : 0, easing: OPEN_EASE, fill: 'both' })
    ];

    this.shades.forEach(function (shade) {
      jobs.push(play(shade,
        [{ opacity: 0 }, { opacity: 0.78 }],
        { duration: ms, easing: OPEN_EASE, fill: 'both' }));
    });

    return Promise.all(jobs).then(function () {
      self.state = 'open';
      self.stage.setAttribute('data-state', 'open');
    });
  };

  /* `prepare` runs while both halves are still out of sight, so the dials can
     be re-scrambled and the hide swapped without anyone watching. */
  Case.prototype.close = function (prepare) {
    var self = this;
    if (this.state !== 'open') return Promise.resolve();
    this.state = 'closing';
    this.stage.setAttribute('data-state', 'closing');

    if (typeof prepare === 'function') prepare();
    this._setInsideReachable(false);

    var ms = reduced() ? 0 : SHUT_MS;
    if (ms) sound.sweep();

    var jobs = [
      play(this.inside,
        [
          { opacity: 1, transform: 'scale(1)' },
          { opacity: 0, transform: 'scale(0.96)' }
        ],
        { duration: ms, easing: SHUT_EASE, fill: 'both' }),

      play(this.lid,
        [
          { transform: 'rotateX(' + OPEN_DEG + 'deg)', opacity: 0 },
          { transform: 'rotateX(' + (OPEN_DEG * 0.7) + 'deg)', opacity: 1, offset: 0.3 },
          { transform: 'rotateX(0deg)', opacity: 1 }
        ],
        { duration: ms, easing: SHUT_EASE, fill: 'both' }),

      play(this.body,
        [
          { transform: 'rotateX(' + (-OPEN_DEG) + 'deg)', opacity: 0 },
          { transform: 'rotateX(' + (-OPEN_DEG * 0.7) + 'deg)', opacity: 1, offset: 0.3 },
          { transform: 'rotateX(0deg)', opacity: 1 }
        ],
        { duration: ms, easing: SHUT_EASE, fill: 'both' })
    ];

    this.shades.forEach(function (shade) {
      jobs.push(play(shade,
        [{ opacity: 0.78 }, { opacity: 0 }],
        { duration: ms, easing: SHUT_EASE, fill: 'both' }));
    });

    return Promise.all(jobs).then(function () {
      self.state = 'closed';
      self.stage.setAttribute('data-state', 'closed');
      if (ms) sound.clack();
      if (navigator.vibrate) navigator.vibrate(16);
    });
  };

  NS.Case = Case;
})(window.PinLock);
