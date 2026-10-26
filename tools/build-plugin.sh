#!/usr/bin/env bash
# Builds dist/ww-ar-configurator.zip, ready to upload at Plugins → Add New → Upload Plugin.
# The plugin's PHP lives in wordpress-plugin/; its front-end files are copied in
# from the repo so the site and the test pages always share the same code.
set -euo pipefail
cd "$(dirname "$0")/.."

src=wordpress-plugin/ww-ar-configurator
out=dist/build/ww-ar-configurator
rm -rf dist/build
mkdir -p "$out" dist
cp -R "$src"/. "$out"/
mkdir -p "$out/assets/css" "$out/assets/js" "$out/assets/vendor" "$out/assets/templates"
cp css/style.css "$out/assets/css/"
cp js/catalog-data.js js/catalog.js js/configurator.js js/draw2d.js js/model3d.js js/boot3d.js "$out/assets/js/"
cp vendor/* "$out/assets/vendor/"
cp index.html 2d.html "$out/assets/templates/"

rm -f dist/ww-ar-configurator.zip
(cd dist/build && zip -qr ../ww-ar-configurator.zip ww-ar-configurator)
rm -rf dist/build
echo "Built dist/ww-ar-configurator.zip"
