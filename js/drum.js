/* ==========================================================================
   Pin Lock — one number drum.

   Ten faces arranged around a cylinder, dragged with a finger, thrown with
   momentum and settled onto a detent by a spring. Digits ascend downwards,
   so dragging down counts down the way a picker does.
   ========================================================================== */

(function (NS) {
  'use strict';

  var FACES = 10;
  var STEP_DEG = 360 / FACES;
  /* Half a face height over tan(pi/10): the radius at which ten faces sit
     edge to edge around the drum. */
  var RADIUS_RATIO = 0.5 / Math.tan(Math.PI / FACES);

  var STIFFNESS = 190;
  var DAMPING = 22;
  var THROW_SECONDS = 0.11;   // how far a fling is projected
  var MAX_THROW = 3.4;        // steps, so a hard fling stays legible
  var TAP_SLOP = 6;
  var TAP_MS = 320;
  var TICK_GAP_MS = 22;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function Drum(index, total, options) {
    var opts = options || {};
    var self = this;

    this.index = index;
    this.onChange = opts.onChange || function () {};
    this.onTick = opts.onTick || function () {};
    this.onGrab = opts.onGrab || function () {};

    this.value = 0;
    this.radius = 0;
    this.stepPx = 40;
    this._digit = 0;
    this._raf = 0;
    this._lastTick = 0;
    this._pointer = null;

    var el = document.createElement('div');
    el.className = 'dial';
    el.tabIndex = 0;
    el.setAttribute('role', 'spinbutton');
    el.setAttribute('aria-label', 'Dial ' + (index + 1) + ' of ' + total);
    el.setAttribute('aria-valuemin', '0');
    el.setAttribute('aria-valuemax', '9');
    el.setAttribute('aria-valuenow', '0');

    var drum = document.createElement('div');
    drum.className = 'dial__drum';

    this.faces = [];
    for (var i = 0; i < FACES; i++) {
      var face = document.createElement('div');
      face.className = 'dial__digit';
      face.textContent = String(i);
      face.setAttribute('aria-hidden', 'true');
      drum.appendChild(face);
      this.faces.push(face);
    }

    el.appendChild(drum);
    this.el = el;
    this.drum = drum;

    el.addEventListener('pointerdown', function (e) { self._down(e); });
    el.addEventListener('pointermove', function (e) { self._move(e); });
    el.addEventListener('pointerup', function (e) { self._up(e); });
    el.addEventListener('pointercancel', function (e) { self._up(e); });
    el.addEventListener('keydown', function (e) { self._key(e); });

    this.layout();
  }

  Drum.prototype.layout = function () {
    var h = this.el.clientHeight || 40;
    this.stepPx = h;
    this.radius = h * RADIUS_RATIO;
    for (var i = 0; i < FACES; i++) {
      this.faces[i].style.transform =
        'rotateX(' + (-i * STEP_DEG) + 'deg) translateZ(' + this.radius.toFixed(2) + 'px)';
    }
    this._render();
  };

  Drum.prototype._render = function () {
    this.drum.style.transform = 'rotateX(' + (this.value * STEP_DEG).toFixed(3) + 'deg)';
  };

  Drum.prototype.digit = function () {
    return ((Math.round(this.value) % FACES) + FACES) % FACES;
  };

  /* Moves the drum and reports any detent it passed on the way. */
  Drum.prototype._set = function (value, quiet) {
    this.value = value;
    this._render();

    var digit = this.digit();
    if (digit === this._digit) return;

    this._digit = digit;
    this.el.setAttribute('aria-valuenow', String(digit));

    if (!quiet) {
      var now = performance.now();
      if (now - this._lastTick > TICK_GAP_MS) {
        this._lastTick = now;
        this.onTick(this);
      }
    }
    this.onChange(this);
  };

  /* Jumps straight to a digit, no animation, no noise. */
  Drum.prototype.setDigit = function (digit) {
    this._stop();
    this.value = ((digit % FACES) + FACES) % FACES;
    this._digit = this.digit();
    this.el.setAttribute('aria-valuenow', String(this._digit));
    this._render();
  };

  /* Springs to a digit, taking the shorter way round the drum. */
  Drum.prototype.spinTo = function (digit) {
    var current = this.value;
    var target = Math.round(current) + ((digit - this.digit() + FACES) % FACES);
    if (target - current > FACES / 2) target -= FACES;
    this._springTo(target);
  };

  Drum.prototype._stop = function () {
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = 0;
    }
    this._velocity = 0;
  };

  Drum.prototype._springTo = function (target) {
    var self = this;
    this._stop();

    var velocity = this._throwVelocity || 0;
    this._throwVelocity = 0;
    var last = performance.now();

    function frame(now) {
      var dt = Math.min(0.032, (now - last) / 1000);
      last = now;

      var accel = STIFFNESS * (target - self.value) - DAMPING * velocity;
      velocity += accel * dt;
      self._set(self.value + velocity * dt);

      if (Math.abs(target - self.value) < 0.0015 && Math.abs(velocity) < 0.02) {
        self._raf = 0;
        /* Keep the stored value small; rotateX is periodic so nothing moves. */
        self._set(((target % FACES) + FACES) % FACES, true);
        return;
      }
      self._raf = requestAnimationFrame(frame);
    }

    this._raf = requestAnimationFrame(frame);
  };

  /* --- pointer ----------------------------------------------------------- */

  Drum.prototype._down = function (e) {
    if (this._pointer !== null) return;
    this._pointer = e.pointerId;
    this._stop();
    this.el.setPointerCapture(e.pointerId);
    this.el.setAttribute('data-drag', '1');

    this._startY = e.clientY;
    this._startValue = this.value;
    this._lastY = e.clientY;
    this._lastT = performance.now();
    this._velocity = 0;
    this._moved = 0;
    this._downT = this._lastT;

    this.onGrab(this);
    e.preventDefault();
  };

  Drum.prototype._move = function (e) {
    if (this._pointer !== e.pointerId) return;

    var dy = e.clientY - this._startY;
    this._moved = Math.max(this._moved, Math.abs(dy));

    var next = this._startValue - dy / this.stepPx;

    var now = performance.now();
    var dt = (now - this._lastT) / 1000;
    if (dt > 0.001) {
      var step = -(e.clientY - this._lastY) / this.stepPx;
      this._velocity = step / dt;
      this._lastY = e.clientY;
      this._lastT = now;
    }

    this._set(next);
    e.preventDefault();
  };

  Drum.prototype._up = function (e) {
    if (this._pointer !== e.pointerId) return;
    this._pointer = null;
    this.el.removeAttribute('data-drag');

    /* A tap on the top or bottom half nudges the drum one detent. */
    if (this._moved < TAP_SLOP && performance.now() - this._downT < TAP_MS) {
      var rect = this.el.getBoundingClientRect();
      var dir = e.clientY < rect.top + rect.height / 2 ? -1 : 1;
      this._throwVelocity = 0;
      this._springTo(Math.round(this.value) + dir);
      return;
    }

    /* Stale velocity from a finger that stopped before lifting reads as a
       fling it never was. */
    if (performance.now() - this._lastT > 90) this._velocity = 0;

    var projected = this.value + this._velocity * THROW_SECONDS;
    var target = Math.round(clamp(projected, this.value - MAX_THROW, this.value + MAX_THROW));

    this._throwVelocity = this._velocity;
    this._springTo(target);
  };

  Drum.prototype._key = function (e) {
    var key = e.key;
    var step = 0;

    if (key === 'ArrowUp' || key === 'ArrowRight') step = 1;
    else if (key === 'ArrowDown' || key === 'ArrowLeft') step = -1;
    else if (key === 'Home') { this.spinTo(0); e.preventDefault(); return; }
    else if (key === 'End') { this.spinTo(9); e.preventDefault(); return; }
    else if (/^[0-9]$/.test(key)) { this.spinTo(Number(key)); e.preventDefault(); return; }
    else return;

    this._throwVelocity = 0;
    this._springTo(Math.round(this.value) + step);
    e.preventDefault();
  };

  NS.Drum = Drum;
})(window.PinLock);
