<img src="assets/favicon.png" width="72" height="72" alt="Zirui Zhao’s layered lettermark" />

# Zirui Zhao

**A design engineering portfolio you can throw things around in.**

My portfolio brings together graphic design, code, and a slightly unreasonable amount of attention to how things move. Letterforms fall into the homepage, colors travel between pages, artwork lives in an infinite field, and six photos become a cube you can turn in your hands.

The visual language is simple: black type, white space, thin borders, and loud, layered shapes. The interaction is where it gets weird.

## The fun stuff

### Typography with weight

The five SVG letter sculptures on the homepage are physical objects. They spawn in midair over a one-second stagger, fall under gravity, collide, and respond to dragging and throwing. Matter.js gives them mass, friction, and low restitution so they feel heavy when they land.

Three of those shapes are also navigation:

- **Z → Work**
- **R → Playground**
- **Cursive I → About**

Hovering pulls the inner layers inward until the outside color fills the silhouette. Other shapes recede, a destination label appears, and a matching gradient spreads down from beneath the navigation bar. Clicking carries that exact color into the next page’s cursor, highlights, and transition.

### A tiny tunnel of color

The intro starts with a layered circle growing from the center of the screen. Its rings have uneven thicknesses, and its acceleration is deliberately extreme: almost still at first, then suddenly rushing past you.

A custom GSAP easing curve, dominated by a twelfth-power term, creates that last-second surge. The innermost layer is always white; it expands far enough to cover the viewport’s corners before the navigation, typography, and falling shapes make their entrance.

### Color that keeps changing

Each refresh generates new shape palettes from curated color families: electric blues, violets, coral, mint, pale yellow, and deep tinted inks. Neighboring layers are chosen for luminance separation as well as color, keeping the silhouettes readable.

The circles are interactive too. Click one and fresh colors expand from its core, replacing the old palette. Every layer stays opaque and inside the original circle, so the animation reads as a solid object changing from within.

Regular page transitions generate a new accent hue at a fixed OKLCH lightness. Shape-led transitions inherit the shape’s outside color instead.

### A playground with no edge

The Playground scatters 24 illustrations, posters, sketches, and product concepts across a field of layered circles. Scroll, drag, or use the arrow keys to explore in any direction. Images open in a lightbox when clicked.

The canvas wraps around its artwork bounds. Its camera and target positions are normalized together, keeping navigation continuous even after long pans. Artwork and the dotted background share the same eased cursor offset, so the parallax moves the whole scene together.

### A photo cube you can actually steer

About has six photos mapped onto a cube built from CSS 3D planes. Dragging rotates it around screen-space axes using quaternions, so the direction stays intuitive even when the cube is upside down or facing backward.

Release it for a short inertial glide. Leave it alone for two seconds and it starts rotating gently. Arrow keys turn it, Home resets its orientation, and holding Space pauses it.

### Small details that connect it all

Project previews cycle until you reach the Work index. Link text glides and draws an underline on hover. Navigation fills retract toward the top of each button. The custom cursor follows the current accent and compresses on click. Homepage typography responds subtly to the pointer while physical shapes pass through it without distortion.

## Built to stay responsive

The runtime uses **vanilla JavaScript, GSAP, and Matter.js**, with **Vite** for development and production builds. SVG, CSS transforms, and CSS perspective handle the visuals.

- Physics advances in fixed 120 Hz steps and skips simulation when bodies are settled.
- A containment pass keeps fast throws inside the floor, walls, and ceiling.
- Unchanged artwork transforms avoid repeated DOM writes.
- Text proximity calculations run after pointer changes.
- Playground thumbnails load near the viewport; larger lightbox images load on demand.
- Work previews reuse cached artwork, and project galleries lazy-load their images.
- Cube animation stops offscreen, outside About, and when the document is hidden.

Reduced-motion preferences skip the intro and automatic cube rotation. Keyboard navigation, visible link focus states, Escape-to-close dialogs, and lightbox focus return are part of the experience too.

## UW CS webring

The existing lion and arrow icons in the top-right navigation implement the [UW CS webring widget](https://github.com/JusGu/uwatering#widget-template). The lion opens the directory; the arrows request the previous or next member relative to `https://www.zirui.ca/`. Their artwork, dimensions, and hover behavior stay the same.

The widget is ready on this site. Directory membership is managed separately through a pull request to the webring repository; the domain must be listed there for neighboring-site navigation to resolve.

## Run locally

```sh
npm install
npm run dev
```

```sh
npm run build    # Generate the production site in dist/
npm run preview  # Preview the production build
npm test         # Run the physics, color, wrapping, and rotation tests
```

Both `/` and `/testi-physics.html` serve the portfolio. Keep their HTML markup synchronized when editing. Serve the site over HTTP rather than opening the HTML directly.

## Inside the code

| File | What it handles |
| --- | --- |
| `src/main.js` | Navigation, intro choreography, typography, and project previews |
| `src/physics.js` + `src/enclosure.js` | Physical sculptures, boundaries, dragging, and circle animations |
| `src/palette.js` | Curated random palettes with contrast between layers |
| `src/looping-canvas.js` | Two-axis panning, wrapping, and artwork placement |
| `src/playground-gallery.js` | Image lightbox and gallery navigation |
| `src/about-cube.js` + `src/cube-math.js` | Photo cube, quaternion rotation, inertia, and idle motion |
| `src/projects.js` | Project descriptions, metadata, and galleries |
| `src/style.css` | Layout, Marr typography, responsive styles, and interaction states |

The tests exercise real Matter.js collisions and extreme throws at mobile and desktop dimensions, along with palette contrast, canvas wrapping, and rotation invariants. The cube tests specifically check that dragging moves the facing surface in the same direction on both the front and back, and that thousands of rotations do not introduce scale drift.
