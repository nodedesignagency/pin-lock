/* ==========================================================================
   Pin Lock — synthesised hardware noises.

   All of it is Web Audio: short noise bursts through filters, plus a couple
   of decaying oscillators for the metallic ring. No audio files.
   ========================================================================== */

(function (NS) {
  'use strict';

  var ctx = null;
  var master = null;
  var noiseBuffer = null;
  var enabled = true;

  function makeNoise(c) {
    var len = Math.floor(c.sampleRate * 0.5);
    var buf = c.createBuffer(1, len, c.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  function ensure() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch (e) {
      return null;
    }
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
    noiseBuffer = makeNoise(ctx);
    return ctx;
  }

  /* Browsers only let audio start from a gesture, so the first touch on a
     dial is what actually wakes this up. */
  function unlock() {
    var c = ensure();
    if (c && c.state === 'suspended') c.resume();
  }

  function ready() {
    if (!enabled) return null;
    var c = ensure();
    if (!c) return null;
    if (c.state === 'suspended') c.resume();
    return c;
  }

  function burst(c, opts) {
    var src = c.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;

    var filter = c.createBiquadFilter();
    filter.type = opts.type || 'bandpass';
    filter.frequency.value = opts.freq;
    filter.Q.value = opts.q || 1;

    var gain = c.createGain();
    var t = c.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(opts.peak, t + (opts.attack || 0.001));
    gain.gain.exponentialRampToValueAtTime(0.0001, t + opts.decay);

    if (opts.sweepTo) {
      filter.frequency.setValueAtTime(opts.freq, t);
      filter.frequency.exponentialRampToValueAtTime(opts.sweepTo, t + opts.decay);
    }

    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t);
    src.stop(t + opts.decay + 0.05);
  }

  function tone(c, opts) {
    var osc = c.createOscillator();
    osc.type = opts.type || 'triangle';
    osc.frequency.value = opts.freq;

    var gain = c.createGain();
    var t = c.currentTime + (opts.delay || 0);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(opts.peak, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + opts.decay);

    if (opts.glideTo) {
      osc.frequency.setValueAtTime(opts.freq, t);
      osc.frequency.exponentialRampToValueAtTime(opts.glideTo, t + opts.decay);
    }

    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + opts.decay + 0.05);
  }

  /* --- the noises -------------------------------------------------------- */

  var sound = {
    /* A drum clicking past a detent. */
    tick: function () {
      var c = ready();
      if (!c) return;
      burst(c, { freq: 2500, q: 3.5, peak: 0.16, decay: 0.028 });
      burst(c, { type: 'lowpass', freq: 480, peak: 0.1, decay: 0.035 });
    },

    /* The spring easing off once the combination lines up. */
    give: function () {
      var c = ready();
      if (!c) return;
      burst(c, { freq: 1500, q: 2, peak: 0.09, decay: 0.09 });
      tone(c, { type: 'sine', freq: 520, glideTo: 380, peak: 0.05, decay: 0.12 });
    },

    /* The catch letting go and the hasp flying up. */
    snap: function () {
      var c = ready();
      if (!c) return;
      burst(c, { type: 'highpass', freq: 1900, peak: 0.34, decay: 0.02 });
      tone(c, { freq: 1760, peak: 0.13, decay: 0.26 });
      tone(c, { freq: 2620, peak: 0.08, decay: 0.2 });
      tone(c, { type: 'sine', freq: 120, glideTo: 70, peak: 0.22, decay: 0.16 });
    },

    /* Leather-and-hinge air as the case swings. */
    sweep: function () {
      var c = ready();
      if (!c) return;
      burst(c, { freq: 380, sweepTo: 1500, q: 0.7, peak: 0.07, decay: 0.42, attack: 0.08 });
    },

    /* A dead push against a locked catch. */
    thunk: function () {
      var c = ready();
      if (!c) return;
      burst(c, { type: 'lowpass', freq: 300, peak: 0.2, decay: 0.075 });
      tone(c, { type: 'sine', freq: 96, glideTo: 62, peak: 0.24, decay: 0.11 });
    },

    /* The lid coming back down and latching. */
    clack: function () {
      var c = ready();
      if (!c) return;
      burst(c, { type: 'lowpass', freq: 700, peak: 0.24, decay: 0.09 });
      tone(c, { type: 'sine', freq: 150, glideTo: 84, peak: 0.26, decay: 0.15 });
      burst(c, { freq: 2100, q: 3, peak: 0.13, decay: 0.05 });
    },

    unlock: unlock,

    setEnabled: function (v) {
      enabled = !!v;
      if (enabled) unlock();
    },

    isEnabled: function () { return enabled; }
  };

  NS.sound = sound;
})(window.PinLock);
