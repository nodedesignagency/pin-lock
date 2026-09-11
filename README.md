# Pin Lock

A lock screen you have to actually unlock.

The screen is a leather case with a briefcase combination lock bolted across
the seam. Roll the three drums to the combination, slide the brass catch, and
the hasp springs off its keeper while the lid and body swing open on their
hinges. Inside there's a deck of hides — pick one and the case shuts again in
that leather with the dials scrambled.

It's the same idea as the zip-open lock screen it was modelled on, with the
zipper replaced by hardware from a vintage three-dial case lock.

**The combination is `007`.** Press and hold the knurled button on the left of
the plate to be reminded of it; leave the screen alone for a few seconds and
it offers.

## The handset

On a phone the screen runs edge to edge and the real hardware supplies the
status bar, the island and the home indicator. Anywhere with room to spare —
a desktop, a tablet, a wide browser window — the piece is mounted in a drawn
iPhone instead, the way the Simulator shows an app, and the chrome is drawn
rather than borrowed.

The screen inside is always laid out at a true 393 x 852 points and the whole
handset is scaled to fit, so nothing inside has to know it is in a mockup.
That means everything on the screen measures itself in container units rather
than viewport units, and pointer deltas get divided back through the scale so
a drag still tracks your finger exactly.

## Running it

There's no build step and no dependencies — open `index.html` in a browser and
it works, including straight off the filesystem.

To try it on a phone, serve the folder and hit it from the same network:

```sh
python3 -m http.server 8000     # or: npx serve
```

## One file

`build.mjs` inlines every stylesheet and script into a single portable page:

```sh
node build.mjs              # dist/pin-lock.html — a complete page
node build.mjs --fragment   # dist/pin-lock.fragment.html — no <head>/<body>,
                            # for hosts that supply their own
```

`dist/pin-lock.html` is one self-contained file with no external requests, so
it can be mailed, AirDropped or dropped on any static host as-is.

## Settings

Both are optional and remembered between visits.

| Query string | Effect |
| --- | --- |
| `?code=427` | Sets the combination. Must be three digits. |
| `?material=denim` | Opens on a given hide: `chestnut`, `denim`, `oxblood`, `tan`, `ink`. |

## How it's put together

Nothing is an image. The hides are SVG turbulence lit from the upper left and
overlay-blended onto a colour; the denim adds a twill tile whose diagonal is
stepped so it repeats seamlessly. The brass is layered gradients with a
stretched-noise brush pass. The mechanical noises are synthesised on the fly
out of filtered noise bursts and decaying oscillators.

```
index.html          structure
styles/
  base.css          reset, screen frame, and the geometry every part shares
  device.css        the drawn iPhone: rail, bezel, keys, island, status bar
  case.css          the two panels, the hide, the seam
  lock.css          plate, drums, hasp, catch
  inside.css        the lining, the greeting, the deck
js/
  device.js         scales the handset to fit, runs the status-bar clock
  textures.js       procedural leather, brushed metal, twill, satin
  materials.js      hides, hardware finishes, linings
  sound.js          the clicks, the snap, the thunk
  drum.js           one number drum: drag, momentum, spring detent
  lock.js           arming, the catch, the hasp
  case.js           the open and shut choreography
  app.js            wiring, the deck, the hint
build.mjs           inline everything into one file
```

The geometry lives in one block of custom properties on `.stage` rather than
on the plate, because the hasp hangs off the lid — a different subtree — and
has to line up with the slot it drops into on the body.

### The drums

Ten faces sit around a cylinder at `rotateX(-i × 36°) translateZ(r)`, with
`r = (face height / 2) / tan(π/10)` — the radius at which ten faces meet edge
to edge. Turning the drum to a digit is `rotateX(value × 36°)`, and because
that's periodic the value can run past 9 or below 0 without anything special
happening at the wrap.

Digits ascend downwards, so dragging down counts down the way a picker does.
A fling is projected forward, clamped to a few steps so it stays legible, and
handed to a spring that settles onto the nearest detent; each detent it passes
clicks.

## Accessibility

Each drum is a `spinbutton` — arrow keys step it, `Home`/`End` jump to 0 and 9,
and typing a digit spins straight to it. The catch and the reveal button work
from the keyboard, the deck is a radio group with roving tabindex, and opening
and shutting are announced. With `prefers-reduced-motion` the case still opens,
it just doesn't swing.
