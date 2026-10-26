<?php
/**
 * Plugin Name:       WW AR Build Configurator
 * Description:       3D/2D AR build configurator with an admin page for its parts, linked to WooCommerce products. Add it to a page with [ar_configurator].
 * Version:           0.1.0
 * Requires at least: 6.5
 * Requires PHP:      7.4
 * Requires Plugins:  woocommerce
 * Author:            Wicked Weaponry
 * License:           GPL-2.0-or-later
 * Text Domain:       wwac
 */

defined( 'ABSPATH' ) || exit;

define( 'WWAC_VERSION', '0.1.0' );
define( 'WWAC_FILE', __FILE__ );
define( 'WWAC_DIR', plugin_dir_path( __FILE__ ) );
define( 'WWAC_URL', plugin_dir_url( __FILE__ ) );

require_once WWAC_DIR . 'includes/catalog.php';
require_once WWAC_DIR . 'includes/rest.php';
require_once WWAC_DIR . 'includes/admin.php';
require_once WWAC_DIR . 'includes/shortcode.php';
