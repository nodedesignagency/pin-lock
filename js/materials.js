/* ==========================================================================
   Pin Lock — hides, hardware finishes and linings.

   A material is a hide plus the metal it is fitted with plus the cloth it is
   lined in. Everything downstream reads from these definitions.
   ========================================================================== */

(function (NS) {
  'use strict';

  var T = NS.textures;

  /* --- hardware ---------------------------------------------------------- */

  var FINISHES = {
    brass: {
      name: 'Brass',
      metal: { hi: '#f7e6b4', mid: '#c9a051', lo: '#96702c', deep: '#5e4318' },
      drum:  { hi: '#ead6a3', mid: '#cfae68', lo: '#96742f', ink: '#241703' },
      brush: T.brushed({ seed: 4, contrast: 1.9 })
    },
    nickel: {
      name: 'Nickel',
      metal: { hi: '#fbfcfd', mid: '#c4cbd2', lo: '#8d959d', deep: '#5a6169' },
      drum:  { hi: '#f2f4f6', mid: '#d5dadf', lo: '#a2a9b0', ink: '#14181c' },
      brush: T.brushed({ seed: 12, contrast: 2.2 })
    },
    gunmetal: {
      name: 'Gunmetal',
      metal: { hi: '#b7bdc4', mid: '#6b7279', lo: '#444a50', deep: '#23272b' },
      drum:  { hi: '#c8cdd2', mid: '#979da3', lo: '#666c72', ink: '#0e1113' },
      brush: T.brushed({ seed: 21, contrast: 2.4 })
    }
  };

  /* --- hides ------------------------------------------------------------- */

  function hide(mid, hi, lo, deep) {
    return {
      mid: mid,
      base:
        'linear-gradient(168deg, ' + hi + ' 0%, ' + mid + ' 36%, ' +
        lo + ' 74%, ' + deep + ' 100%)',
      sheen:
        'radial-gradient(120% 58% at 24% 10%, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 58%),' +
        'radial-gradient(150% 104% at 50% 46%, rgba(0,0,0,0) 38%, rgba(0,0,0,0.46) 100%)'
    };
  }

  var MATERIALS = [
    {
      id: 'chestnut',
      name: 'Chestnut',
      finish: 'brass',
      skin: hide('#6b3a21', '#8d5330', '#4a2415', '#291209'),
      grain: { texture: T.leather({ seed: 11, freq: 1.7, relief: 1.5 }), size: '150px', opacity: 0.44 },
      weave: null,
      lining: { color: '#0e6b52', deep: '#06301f' }
    },
    {
      id: 'denim',
      name: 'Denim',
      finish: 'nickel',
      skin: hide('#3f5b86', '#5878a5', '#2c4064', '#1a2743'),
      grain: { texture: T.leather({ seed: 5, freq: 2.6, relief: 0.9 }), size: '120px', opacity: 0.26 },
      weave: { texture: T.twill({ size: 30, step: 6 }), size: '26px', opacity: 0.8 },
      lining: { color: '#0a84ff', deep: '#06305e' }
    },
    {
      id: 'oxblood',
      name: 'Oxblood',
      finish: 'brass',
      skin: hide('#65202a', '#853039', '#43121a', '#23090d'),
      grain: { texture: T.leather({ seed: 27, freq: 1.45, relief: 1.9 }), size: '140px', opacity: 0.48 },
      weave: null,
      lining: { color: '#1d3f74', deep: '#0a1930' }
    },
    {
      id: 'tan',
      name: 'Saddle Tan',
      finish: 'brass',
      skin: hide('#a97542', '#c9944f', '#7f5225', '#523115'),
      grain: { texture: T.leather({ seed: 33, freq: 1.25, relief: 2.1 }), size: '175px', opacity: 0.46 },
      weave: null,
      lining: { color: '#0d6a78', deep: '#052c33' }
    },
    {
      id: 'ink',
      name: 'Ink',
      finish: 'gunmetal',
      skin: hide('#26262b', '#3a3a41', '#161619', '#0a0a0c'),
      grain: { texture: T.leather({ seed: 44, freq: 1.85, relief: 1.4 }), size: '145px', opacity: 0.4 },
      weave: null,
      lining: { color: '#b3122c', deep: '#4a0512' }
    }
  ];

  var LINING_WEAVE = T.satin({ size: 160 });

  /* --- applying ---------------------------------------------------------- */

  function vars(material, prefix) {
    var f = FINISHES[material.finish];
    var out = {};

    out[prefix + 'mid'] = material.skin.mid;
    out[prefix + 'base'] = material.skin.base;
    out[prefix + 'grain'] = material.grain.texture;
    out[prefix + 'grain-size'] = material.grain.size;
    out[prefix + 'grain-op'] = String(material.grain.opacity);
    out[prefix + 'weave'] = material.weave ? material.weave.texture : 'none';
    out[prefix + 'weave-size'] = material.weave ? material.weave.size : 'auto';
    out[prefix + 'weave-op'] = material.weave ? String(material.weave.opacity) : '0';

    return { vars: out, finish: f };
  }

  /* Dresses the whole stage: hide, hardware and lining. */
  function apply(el, material) {
    var v = vars(material, '--skin-');
    var f = v.finish;
    var s = el.style;
    var key;

    for (key in v.vars) {
      if (Object.prototype.hasOwnProperty.call(v.vars, key)) s.setProperty(key, v.vars[key]);
    }

    s.setProperty('--skin-sheen', material.skin.sheen);

    s.setProperty('--metal-hi', f.metal.hi);
    s.setProperty('--metal-mid', f.metal.mid);
    s.setProperty('--metal-lo', f.metal.lo);
    s.setProperty('--metal-deep', f.metal.deep);
    s.setProperty('--metal-brush', f.brush);

    s.setProperty('--drum-hi', f.drum.hi);
    s.setProperty('--drum-mid', f.drum.mid);
    s.setProperty('--drum-lo', f.drum.lo);
    s.setProperty('--digit-ink', f.drum.ink);

    s.setProperty('--lining', material.lining.color);
    s.setProperty('--lining-deep', material.lining.deep);
    s.setProperty('--lining-weave', LINING_WEAVE);
  }

  /* Dresses one card in the deck. */
  function applySwatch(el, material) {
    var v = vars(material, '--sw-');
    var f = v.finish;
    var s = el.style;
    var key;

    for (key in v.vars) {
      if (Object.prototype.hasOwnProperty.call(v.vars, key)) s.setProperty(key, v.vars[key]);
    }

    s.setProperty('--sw-metal-hi', f.metal.hi);
    s.setProperty('--sw-metal-mid', f.metal.mid);
    s.setProperty('--sw-metal-lo', f.metal.lo);
  }

  function byId(id) {
    for (var i = 0; i < MATERIALS.length; i++) {
      if (MATERIALS[i].id === id) return MATERIALS[i];
    }
    return null;
  }

  function finishName(material) {
    return FINISHES[material.finish].name;
  }

  NS.materials = {
    list: MATERIALS,
    byId: byId,
    apply: apply,
    applySwatch: applySwatch,
    finishName: finishName
  };
})(window.PinLock);
