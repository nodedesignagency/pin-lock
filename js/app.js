/* ==========================================================================
   Pin Lock — wiring.

   Reads the settings, dresses the case, builds the deck of hides and keeps
   the hint on the hide in step with what the person is doing.
   ========================================================================== */

(function (NS) {
  'use strict';

  var materials = NS.materials;
  var sound = NS.sound;

  var DEFAULT_CODE = [0, 0, 7];
  var DEFAULT_MATERIAL = 'chestnut';
  var IDLE_MS = 6000;
  var REVEAL_MS = 2600;
  var REJECTS_BEFORE_HELP = 2;

  var STORE_MATERIAL = 'pinlock.material';
  var STORE_SOUND = 'pinlock.sound';

  /* localStorage throws in private windows and with site data blocked. */
  function read(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function write(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) { /* fine */ }
  }

  function settings() {
    var params = new URLSearchParams(window.location.search);

    var code = DEFAULT_CODE;
    var raw = (params.get('code') || '').replace(/\D/g, '');
    if (raw.length === DEFAULT_CODE.length) {
      code = raw.split('').map(Number);
    }

    var wanted = params.get('material') || read(STORE_MATERIAL) || DEFAULT_MATERIAL;
    var material = materials.byId(wanted) || materials.byId(DEFAULT_MATERIAL);

    return { code: code, material: material };
  }

  function start() {
    var config = settings();

    var stage = document.getElementById('stage');
    var hintEl = document.getElementById('hint');
    var subEl = document.getElementById('insideSub');
    var deckEl = document.getElementById('deck');
    var relockEl = document.getElementById('relock');
    var soundEl = document.getElementById('soundToggle');
    var announceEl = document.getElementById('announce');

    var current = config.material;
    var idleTimer = 0;
    var hintTimer = 0;

    var theCase = new NS.Case();

    var lock = new NS.Lock({
      code: config.code,
      onOpen: openCase,
      onReject: function (count) {
        if (count >= REJECTS_BEFORE_HELP) revealCode();
      },
      onReveal: revealCode
    });
    lock.onIdleBreak = resetIdle;

    /* --- dressing the case ---------------------------------------------- */

    var themeMeta = document.querySelector('meta[name="theme-color"]');

    function dress(material) {
      current = material;
      materials.apply(stage, material);
      subEl.textContent = material.name + ' · ' + materials.finishName(material);
      /* Absent when the page is embedded rather than served on its own. */
      if (themeMeta) themeMeta.setAttribute('content', material.lining.color);
      write(STORE_MATERIAL, material.id);
    }

    /* --- the hint pressed into the hide ---------------------------------- */

    function showHint(text, isCode) {
      clearTimeout(hintTimer);
      hintEl.textContent = text;
      hintEl.classList.toggle('hint--code', !!isCode);
      hintEl.setAttribute('data-show', '1');
    }

    function hideHint() {
      clearTimeout(hintTimer);
      hintEl.removeAttribute('data-show');
    }

    function revealCode() {
      if (theCase.isOpen()) return;
      clearTimeout(idleTimer);
      showHint(lock.code.join(' '), true);
      hintTimer = setTimeout(hideHint, REVEAL_MS);
    }

    function resetIdle() {
      clearTimeout(idleTimer);
      if (!hintEl.classList.contains('hint--code')) hideHint();
      if (theCase.isOpen()) return;
      idleTimer = setTimeout(function () {
        showHint('Hold ● for the combination', false);
      }, IDLE_MS);
    }

    /* --- opening and shutting -------------------------------------------- */

    function openCase() {
      clearTimeout(idleTimer);
      hideHint();
      theCase.open().then(function () {
        announceEl.textContent = 'Case open. ' + current.name + ' hide, ' +
          materials.finishName(current).toLowerCase() + ' hardware.';
        focusChecked();
      });
    }

    function closeCase(material) {
      theCase.close(function () {
        if (material) dress(material);
        lock.relatch();
        lock.scramble();
      }).then(function () {
        announceEl.textContent = 'Case locked.';
        resetIdle();
      });
    }

    /* --- the deck of hides ----------------------------------------------- */

    var cards = [];
    var mid = (materials.list.length - 1) / 2;

    materials.list.forEach(function (material, i) {
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'swatch';
      card.setAttribute('role', 'radio');
      card.setAttribute('aria-label',
        material.name + ' hide, ' + materials.finishName(material).toLowerCase() + ' hardware');
      card.style.setProperty('--i', String(i - mid));
      /* Leftmost card on top, each one tucked behind the last, so the part
         of every card that stays uncovered is a predictable target. */
      card.style.zIndex = String(materials.list.length - i);

      var skin = document.createElement('span');
      skin.className = 'swatch__skin';
      var stud = document.createElement('span');
      stud.className = 'swatch__stud';
      card.appendChild(skin);
      card.appendChild(stud);

      materials.applySwatch(card, material);

      card.addEventListener('click', function () { choose(i); });
      card.addEventListener('keydown', function (e) { deckKeys(e, i); });

      deckEl.appendChild(card);
      cards.push({ el: card, material: material });
    });

    function markChecked(index) {
      cards.forEach(function (card, i) {
        var on = i === index;
        card.el.setAttribute('aria-checked', on ? 'true' : 'false');
        card.el.tabIndex = on ? 0 : -1;
        /* The chosen card lifts clear of the fan, so it belongs on top. */
        card.el.style.zIndex = String(on ? cards.length + 1 : cards.length - i);
      });
    }

    function checkedIndex() {
      for (var i = 0; i < cards.length; i++) {
        if (cards[i].material.id === current.id) return i;
      }
      return 0;
    }

    function focusChecked() {
      var card = cards[checkedIndex()];
      if (card) card.el.tabIndex = 0;
    }

    function choose(index) {
      markChecked(index);
      var material = cards[index].material;
      if (material.id === current.id) {
        closeCase(null);
      } else {
        closeCase(material);
      }
    }

    /* Arrow keys walk the deck, the way a radio group should. */
    function deckKeys(e, index) {
      var step = 0;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') step = 1;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') step = -1;
      else return;

      e.preventDefault();
      var next = (index + step + cards.length) % cards.length;
      markChecked(next);
      cards[next].el.focus();
    }

    /* --- inside controls -------------------------------------------------- */

    relockEl.addEventListener('click', function () { closeCase(null); });

    var soundOn = read(STORE_SOUND) !== '0';
    function applySound() {
      sound.setEnabled(soundOn);
      soundEl.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
      soundEl.setAttribute('aria-label', soundOn ? 'Mute sound' : 'Unmute sound');
    }
    soundEl.addEventListener('click', function () {
      soundOn = !soundOn;
      write(STORE_SOUND, soundOn ? '1' : '0');
      applySound();
      if (soundOn) sound.tick();
    });

    /* --- layout ----------------------------------------------------------- */

    /* The hide is one continuous texture painted across two panels, so both
       need to know how tall the whole stage is and where the seam falls. */
    function measure() {
      var height = stage.clientHeight;
      var seam = parseFloat(getComputedStyle(stage).getPropertyValue('--seam')) / 100;
      stage.style.setProperty('--stage-h', height + 'px');
      stage.style.setProperty('--seam-px', (height * seam).toFixed(2) + 'px');
      lock.layout();
    }

    if (window.ResizeObserver) {
      new ResizeObserver(measure).observe(stage);
    } else {
      window.addEventListener('resize', measure);
      window.addEventListener('orientationchange', measure);
    }

    /* Long-pressing the hardware shouldn't offer to copy it. */
    stage.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    /* --- go --------------------------------------------------------------- */

    dress(current);
    applySound();
    markChecked(checkedIndex());
    measure();
    lock.scramble();
    resetIdle();

    document.body.setAttribute('data-ready', '1');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})(window.PinLock);
