/* ==========================================================================
   Pin Lock — procedural textures.

   Everything the case is made of is generated as an inline SVG tile, so the
   project ships with no image assets and every hide can be tuned by number.
   ========================================================================== */

window.PinLock = window.PinLock || {};

(function (NS) {
  'use strict';

  function url(svg) {
    var body = svg.replace(/\s+/g, ' ').trim();
    return 'url("data:image/svg+xml,' + encodeURIComponent(body) + '")';
  }

  function open(w, h) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h +
           '" viewBox="0 0 ' + w + ' ' + h + '">';
  }

  /* Pebbled hide. Turbulence lit from the upper left reads as raised grain
     once it is overlay-blended onto a flat colour. */
  function leather(o) {
    o = o || {};
    var size = o.size || 240;
    var svg = open(size, size) +
      '<filter id="g" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">' +
        '<feTurbulence type="fractalNoise"' +
          ' baseFrequency="' + (o.freq || 0.62) + '"' +
          ' numOctaves="' + (o.octaves || 4) + '"' +
          ' seed="' + (o.seed || 11) + '" stitchTiles="stitch" result="n"/>' +
        '<feDiffuseLighting in="n" lighting-color="#ffffff"' +
          ' surfaceScale="' + (o.relief || 2.4) + '" diffuseConstant="1">' +
          '<feDistantLight azimuth="128" elevation="' + (o.elevation || 56) + '"/>' +
        '</feDiffuseLighting>' +
      '</filter>' +
      '<rect width="100%" height="100%" filter="url(#g)"/>' +
      '</svg>';
    return url(svg);
  }

  /* Brushed metal: noise stretched hard along one axis, flattened to grey. */
  function brushed(o) {
    o = o || {};
    var w = o.width || 200;
    var h = o.height || 60;
    var svg = open(w, h) +
      '<filter id="b" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">' +
        '<feTurbulence type="fractalNoise"' +
          ' baseFrequency="' + (o.freq || '0.012 0.92') + '"' +
          ' numOctaves="' + (o.octaves || 3) + '"' +
          ' seed="' + (o.seed || 4) + '" stitchTiles="stitch" result="n"/>' +
        '<feColorMatrix in="n" type="matrix" values="' +
          '0.333 0.333 0.333 0 0 ' +
          '0.333 0.333 0.333 0 0 ' +
          '0.333 0.333 0.333 0 0 ' +
          '0 0 0 0 1"/>' +
        '<feComponentTransfer>' +
          '<feFuncR type="linear" slope="' + (o.contrast || 1.9) + '" intercept="' + (-0.45 * (o.contrast || 1.9) + 0.5) + '"/>' +
          '<feFuncG type="linear" slope="' + (o.contrast || 1.9) + '" intercept="' + (-0.45 * (o.contrast || 1.9) + 0.5) + '"/>' +
          '<feFuncB type="linear" slope="' + (o.contrast || 1.9) + '" intercept="' + (-0.45 * (o.contrast || 1.9) + 0.5) + '"/>' +
        '</feComponentTransfer>' +
      '</filter>' +
      '<rect width="100%" height="100%" filter="url(#b)"/>' +
      '</svg>';
    return url(svg);
  }

  /* Denim twill. The diagonal steps by `step` px per tile edge so the lines
     meet exactly where the tile repeats — no visible seams. */
  function twill(o) {
    o = o || {};
    var size = o.size || 30;
    var step = o.step || 6;          // must divide `size`
    var lines = '';
    for (var x = -size; x <= size * 2; x += step) {
      lines +=
        '<path d="M' + x + ' -2 L' + (x + size + 4) + ' ' + (size + 2) + '"' +
        ' stroke="#ffffff" stroke-width="1.5" opacity="0.5"/>' +
        '<path d="M' + (x + 2.6) + ' -2 L' + (x + size + 6.6) + ' ' + (size + 2) + '"' +
        ' stroke="#000000" stroke-width="1.1" opacity="0.34"/>';
    }

    var threads = '';
    for (var i = 0; i < size; i += 3) {
      threads +=
        '<path d="M' + i + ' 0 V' + size + '" stroke="#000000" stroke-width="1" opacity="0.1"/>' +
        '<path d="M0 ' + i + ' H' + size + '" stroke="#ffffff" stroke-width="1" opacity="0.09"/>';
    }

    return url(
      open(size, size) +
      '<rect width="100%" height="100%" fill="#808080"/>' +
      threads + lines +
      '</svg>'
    );
  }

  /* Satin lining: a soft cross-hatch that catches the light. */
  function satin(o) {
    o = o || {};
    var size = o.size || 160;
    return url(
      open(size, size) +
      '<rect width="100%" height="100%" fill="#808080"/>' +
      '<filter id="s" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">' +
        '<feTurbulence type="fractalNoise" baseFrequency="0.02 0.9" numOctaves="2"' +
          ' seed="' + (o.seed || 9) + '" stitchTiles="stitch" result="n"/>' +
        '<feColorMatrix in="n" type="matrix" values="' +
          '0.333 0.333 0.333 0 0 ' +
          '0.333 0.333 0.333 0 0 ' +
          '0.333 0.333 0.333 0 0 ' +
          '0 0 0 0 1"/>' +
      '</filter>' +
      '<rect width="100%" height="100%" filter="url(#s)" opacity="0.7"/>' +
      '</svg>'
    );
  }

  NS.textures = {
    leather: leather,
    brushed: brushed,
    twill: twill,
    satin: satin
  };
})(window.PinLock);
