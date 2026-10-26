# Wicked Weaponry AR Build Configurator

A single-page configurator that lets customers build an AR from a basic M4-style carbine, see it update as they pick parts, and send the finished build to the shop as a quote request.

Open `index.html` in a browser — there's no build step and no dependencies.

## What it does

- Side-view drawing that changes with barrel length, handguard, muzzle device, stock, grip, optics, sights and finish colour.
- Fitment checks: parts that can't go together are greyed out with the reason shown (handguard longer than the barrel allows, magnifier without a red dot, more optics than the 7" top rail can hold).
- Required extra parts are added automatically (low-profile gas block for free-float handguards, the right ring size of mount for each optic, rifle buffer kit for a fixed A2 stock).
- Quote request opens the customer's email app with the full build and their contact details; customers can also copy a summary or a link that reopens the exact build.

## Editing

Everything lives in `index.html`, in the `<script>` block:

- `SHOP` — shop name, phone, the email that receives quote requests (`quoteEmail`), and `samplePrices` (set to `false` once prices are real).
- `BASE` — the starting rifle and its price.
- `CATEGORIES` — every part option and what it adds to the price. **All current prices are placeholders.**
- `errors()`, `warnings()` and `autoLines()` — the fitment rules, warnings and automatically added parts.
