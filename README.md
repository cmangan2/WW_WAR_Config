# Wicked Weaponry AR Build Configurator

A configurator that lets customers build an AR from a basic M4-style carbine, see it update as they pick parts, and send the finished build to the shop as a quote request. On the live site it runs as a WordPress plugin with an admin page for the parts list; the HTML pages in this repo are test pages that run on their own.

## What it does

- 3D model you can rotate and zoom (or a 2D side-view drawing) that changes with barrel length, handguard, muzzle device, stock, grip, optics, sights and finish colour.
- Fitment checks: parts that can't go together are greyed out with the reason shown (handguard longer than the barrel allows, magnifier without a red dot, more optics than the top rail can hold).
- Required extra parts are added automatically (low-profile gas block for free-float handguards, the mount each optic needs, rifle buffer kit for a fixed stock).
- A **Custom request** choice in each category, so customers can ask for a part the shop doesn't list. They describe it, it's priced "Quote", and the shop confirms fitment.
- Quote request: on the WordPress site it's emailed straight to the shop; on the test pages it opens the customer's email app. Customers can also copy a summary or a link that reopens the exact build.

## WordPress plugin

The plugin is in `wordpress-plugin/ww-ar-configurator/`. A ready-to-install zip is at `dist/ww-ar-configurator.zip`.

**Install:** in WordPress go to Plugins → Add New → Upload Plugin, upload the zip and activate it (needs WordPress 6.5+ and WooCommerce). Then add the shortcode `[ar_configurator]` to a page (`[ar_configurator view="2d"]` for the 2D drawing).

**Admin page:** WooCommerce → AR Configurator.

- *Shop & base rifle*: the email that receives quote requests (defaults to the site admin email), the "sample pricing" notice, the base rifle and its price, and the parts that get added automatically.
- *One tab per category*: rename the category, choose the default part, turn the custom request choice on or off, and add, hide, reorder or delete options. Each option has a name, description, price and the settings the fitment checks and 3D model need (length, tube size, rail space, colour, what it looks like).
- *Linking to WooCommerce*: any option (and the base rifle) can be linked to a WooCommerce product. It can then use the product's price, and shows "Special order" to customers when the product is out of stock. If the POS keeps WooCommerce products up to date, the configurator follows along with no extra work.
- *Import CSV*: add options to a category from a CSV export (from the POS or WooCommerce). Columns are matched by heading (`name`, `price`, `sku`, `description`, plus category settings such as `len`, `look`, `color`). Rows whose SKU matches a WooCommerce product are linked to it. Imported options start hidden so they can be checked first.

Categories themselves are fixed, because the fitment rules and the 3D model are built around them.

**For developers:** the parts list is stored in the `wwac_catalog` option and served from `/wp-json/wwac/v1/` (see `includes/rest.php`). Every quote request fires the `wwac_quote_submitted` action, so quotes can also be sent to a CRM or the POS without editing the plugin.

**Rebuilding the zip:** run `tools/build-plugin.sh` after changing anything. It copies the front-end files from this repo into the plugin, so the site and the test pages always share the same code.

## Test pages

- `index.html` — the 3D view. Browsers only load it from a web server, not from a file on disk: use GitHub Pages, or run `python3 -m http.server` in this folder and open http://localhost:8000.
- `2d.html` — the 2D view. Opens straight from disk.

They use the default parts list in `js/catalog-data.js` and a stand-in for the site's header and footer (`css/site-standin.css`).

## Code

- `js/catalog-data.js` — the default parts list. The plugin seeds its admin page from it. **All prices are placeholders.**
- `js/catalog.js` — fitment rules (`errors()`), warnings, automatically added parts and pricing.
- `js/configurator.js` — options panel, price summary, custom requests, shareable links and the quote form.
- `js/draw2d.js` — the 2D drawing. `js/model3d.js` — the 3D model (each part is built in `buildRifle()`, in inches) with camera and lighting; `js/boot3d.js` starts it.
- `css/style.css` — styles matched to wickedweaponryusa.com (navy `#020c28`, red `#b20d0f`, Oswald headings, Roboto Condensed text). Every rule is scoped to `.ww-config`, and the layout follows the width of the column it's placed in, so it fits any theme.
- `vendor/` — [three.js](https://threejs.org) (MIT licence).
