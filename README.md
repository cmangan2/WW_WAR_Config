# Wicked Weaponry AR Build Configurator

A single-page configurator that lets customers build an AR from a basic M4-style carbine, see it update as they pick parts, and send the finished build to the shop as a quote request.

Two views share the same parts list, fitment rules and quote form:

- `index.html` — the default page: a 3D model you can rotate and zoom, built from simple shapes with [three.js](https://threejs.org) (vendored in `vendor/`, MIT licence). Browsers only load it from a web server, not from a file on disk: use GitHub Pages, or run `python3 -m http.server` in this folder and open http://localhost:8000.
- `2d.html` — 2D side-view drawing. Opens straight from disk.

There's no build step. Each page links to the other and carries the current build across.

## What it does

- Side-view drawing that changes with barrel length, handguard, muzzle device, stock, grip, optics, sights and finish colour.
- Fitment checks: parts that can't go together are greyed out with the reason shown (handguard longer than the barrel allows, magnifier without a red dot, more optics than the 7" top rail can hold).
- Required extra parts are added automatically (low-profile gas block for free-float handguards, the right ring size of mount for each optic, rifle buffer kit for a fixed A2 stock).
- Quote request opens the customer's email app with the full build and their contact details; customers can also copy a summary or a link that reopens the exact build.

## Editing

Shop settings, parts and rules are in `js/catalog.js`:

- `SHOP` — shop name, the email that receives quote requests (`quoteEmail`), and `samplePrices` (set to `false` once prices are real).
- `BASE` — the starting rifle and its price.
- `CATEGORIES` — every part option and what it adds to the price. **All current prices are placeholders.**
- `errors()`, `warnings()` and `autoLines()` — the fitment rules, warnings and automatically added parts.

Other files:

- `js/configurator.js` — options panel, price summary, shareable links and the quote form.
- `js/draw2d.js` — the 2D drawing.
- `js/model3d.js` — the 3D model (each part is built in `buildRifle()`, in inches) and the camera/lighting.
- `css/style.css` — the configurator's styles, matched to wickedweaponryusa.com (navy `#020c28`, red `#b20d0f`, Oswald headings, Roboto Condensed text). Every rule is scoped to `.ww-config`, so it won't clash with the WordPress theme.
- `css/site-standin.css` — a stand-in for the site's header, page title and footer, only so the test pages look like the live site.

## Dropping it into the WordPress site

In each page, everything between the `Configurator` and `end configurator` comments (the `.ww-config` block) is what goes into the site page, together with `css/style.css`, the scripts and `vendor/`. The stand-in header, title and footer are left behind, since the theme already provides them, along with the Oswald and Roboto Condensed fonts.
