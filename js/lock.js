/* ==========================================================================
   Pin Lock — the mechanism.

   Owns the three drums, decides when the combination is right, and runs the
   catch and the hasp. It knows nothing about the case it is bolted to; it
   just reports that it has let go.
   ========================================================================== */

(function (NS) {
  'use strict';

  var sound = NS.sound;

  var HOLD_MS = 320;          // press-and-hold before the code shows
  var RESIST_PX = 3;          // how far a locked catch will give
  var TRIGGER = 0.62;         // fraction of the throw that frees the hasp
  var HASP_ARMED_DEG = -3;
  var HASP_OPEN_DEG = -64;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function Lock(options) {
    var self = this;
    var opts = options || {};

    this.code = opts.code.slice();
    this.onOpen = opts.onOpen || function () {};
    this.onReject = opts.onReject || function () {};
    this.onReveal = opts.onReveal || function () {};

    this.plate = document.getElementById('plate');
    this.dialsEl = document.getElementById('dials');
    this.catchEl = document.getElementById('catch');
    this.revealEl = document.getElementById('reveal');
    this.haspSwing = document.getElementById('haspSwing');

    this.armed = false;
    this.released = false;
    this.rejects = 0;

    this.drums = [];
    for (var i = 0; i < this.code.length; i++) {
      var drum = new NS.Drum(i, this.code.length, {
        onChange: function () { self._check(); },
        onTick: function () { sound.tick(); },
        onGrab: function () { sound.unlock(); self._nudgeIdle(); }
      });
      this.dialsEl.appendChild(drum.el);
      this.drums.push(drum);
    }

    this._bindCatch();
    this._bindReveal();
    this.layout();
  }

  Lock.prototype.layout = function () {
    for (var i = 0; i < this.drums.length; i++) this.drums[i].layout();
    this._throw = Math.max(12, this.catchEl.offsetWidth * 0.42);
  };

  Lock.prototype.digits = function () {
    return this.drums.map(function (d) { return d.digit(); });
  };

  Lock.prototype._nudgeIdle = function () {
    if (this.onIdleBreak) this.onIdleBreak();
  };

  /* --- arming ------------------------------------------------------------ */

  Lock.prototype._check = function () {
    if (this.released) return;

    var ok = true;
    for (var i = 0; i < this.code.length; i++) {
      if (this.drums[i].digit() !== this.code[i]) { ok = false; break; }
    }
    if (ok === this.armed) return;

    this.armed = ok;
    this.plate.setAttribute('data-armed', ok ? '1' : '0');
    this._setHasp(ok ? HASP_ARMED_DEG : 0);
    if (ok) sound.give();
  };

  Lock.prototype._setHasp = function (deg) {
    if (this._haspAnim) { this._haspAnim.cancel(); this._haspAnim = null; }
    this.haspSwing.style.setProperty('--hasp-angle', deg + 'deg');
  };

  /* --- the catch --------------------------------------------------------- */

  Lock.prototype._bindCatch = function () {
    var self = this;
    var el = this.catchEl;
    var pointer = null;
    var startX = 0;
    var moved = 0;

    function slide(px) {
      el.style.setProperty('--catch-slide', px.toFixed(1) + 'px');
    }

    el.addEventListener('pointerdown', function (e) {
      if (pointer !== null || self.released) return;
      pointer = e.pointerId;
      startX = e.clientX;
      moved = 0;
      el.setPointerCapture(e.pointerId);
      el.setAttribute('data-drag', '1');
      sound.unlock();
      self._nudgeIdle();
      e.preventDefault();
    });

    el.addEventListener('pointermove', function (e) {
      if (pointer !== e.pointerId) return;
      var dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));

      var limit = self.armed ? self._throw : RESIST_PX;
      slide(clamp(dx, 0, limit));

      if (self.armed && dx >= self._throw * TRIGGER) {
        el.releasePointerCapture(e.pointerId);
        pointer = null;
        el.removeAttribute('data-drag');
        self.release();
      }
      e.preventDefault();
    });

    function end(e) {
      if (pointer !== e.pointerId) return;
      pointer = null;
      el.removeAttribute('data-drag');
      if (self.released) return;

      /* A press rather than a slide still counts as trying the catch. */
      if (moved < 5) {
        self.attempt();
        return;
      }
      slide(0);
      if (!self.armed) self.reject();
    }

    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);

    /* Keyboard activation arrives as a click with no pointer behind it. */
    el.addEventListener('click', function (e) {
      if (e.detail === 0) self.attempt();
    });
  };

  Lock.prototype.attempt = function () {
    if (this.released) return;
    if (this.armed) this.release();
    else this.reject();
  };

  Lock.prototype.reject = function () {
    var self = this;
    this.rejects++;

    sound.thunk();
    this.catchEl.style.setProperty('--catch-slide', RESIST_PX + 'px');
    setTimeout(function () {
      self.catchEl.style.setProperty('--catch-slide', '0px');
    }, 110);

    this.plate.setAttribute('data-reject', '1');
    setTimeout(function () { self.plate.removeAttribute('data-reject'); }, 440);

    if (navigator.vibrate) navigator.vibrate([18, 40, 18]);
    this.onReject(this.rejects);
  };

  Lock.prototype.release = function () {
    var self = this;
    if (this.released) return;
    this.released = true;

    sound.snap();
    if (navigator.vibrate) navigator.vibrate(24);

    this.plate.removeAttribute('data-armed');
    this.catchEl.style.setProperty('--catch-slide', this._throw.toFixed(1) + 'px');

    if (this.haspSwing.animate) {
      if (this._haspAnim) this._haspAnim.cancel();
      this._haspAnim = this.haspSwing.animate(
        [
          { transform: 'rotateX(' + HASP_ARMED_DEG + 'deg)' },
          { transform: 'rotateX(' + (HASP_OPEN_DEG - 12) + 'deg)', offset: 0.66 },
          { transform: 'rotateX(' + HASP_OPEN_DEG + 'deg)' }
        ],
        { duration: 400, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }
      );
    } else {
      this.haspSwing.style.setProperty('--hasp-angle', HASP_OPEN_DEG + 'deg');
    }

    setTimeout(function () { self.onOpen(); }, 190);
  };

  /* --- reveal button ----------------------------------------------------- */

  Lock.prototype._bindReveal = function () {
    var self = this;
    var el = this.revealEl;
    var timer = 0;
    var pointer = null;

    function start(e) {
      if (pointer !== null) return;
      pointer = e.pointerId;
      el.setPointerCapture(e.pointerId);
      el.setAttribute('data-held', '1');
      sound.unlock();
      timer = setTimeout(function () {
        timer = 0;
        sound.tick();
        self.onReveal();
      }, HOLD_MS);
      e.preventDefault();
    }

    function end(e) {
      if (pointer !== e.pointerId) return;
      pointer = null;
      el.removeAttribute('data-held');
      if (timer) { clearTimeout(timer); timer = 0; }
    }

    el.addEventListener('pointerdown', start);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);

    el.addEventListener('click', function (e) {
      if (e.detail === 0) self.onReveal();
    });
  };

  /* --- resetting --------------------------------------------------------- */

  /* Rolls the drums onto something that is definitely not the combination. */
  Lock.prototype.scramble = function () {
    var digits;
    var tries = 0;
    do {
      digits = [];
      for (var i = 0; i < this.code.length; i++) {
        digits.push(Math.floor(Math.random() * 10));
      }
      tries++;
    } while (tries < 12 && digits.every(function (d, i) { return d === this.code[i]; }, this));

    for (var j = 0; j < this.drums.length; j++) this.drums[j].setDigit(digits[j]);
  };

  /* Puts the hasp back down and re-latches. */
  Lock.prototype.relatch = function () {
    this.released = false;
    this.armed = false;
    this.rejects = 0;
    this.plate.removeAttribute('data-armed');
    this.catchEl.style.setProperty('--catch-slide', '0px');
    this._setHasp(0);
  };

  NS.Lock = Lock;
})(window.PinLock);
