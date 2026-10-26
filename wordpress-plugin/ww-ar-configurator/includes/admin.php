<?php
/**
 * WooCommerce → AR Configurator admin page. The page itself is drawn by
 * admin/admin.js, which reads and saves through the REST routes in rest.php.
 */

defined( 'ABSPATH' ) || exit;

add_action( 'admin_menu', function () {
	$hook = add_submenu_page(
		'woocommerce',
		'AR Configurator',
		'AR Configurator',
		'manage_woocommerce',
		'wwac',
		function () {
			echo '<div class="wrap"><h1>AR Configurator</h1><div id="wwac-admin">Loading…</div></div>';
		}
	);

	add_action( 'admin_enqueue_scripts', function ( $current ) use ( $hook ) {
		if ( $current !== $hook ) {
			return;
		}
		wp_enqueue_style( 'wwac-admin', WWAC_URL . 'admin/admin.css', array(), WWAC_VERSION );
		wp_enqueue_script( 'wwac-admin', WWAC_URL . 'admin/admin.js', array(), WWAC_VERSION, true );
		wp_localize_script( 'wwac-admin', 'WWAC_ADMIN', array(
			'rest'       => esc_url_raw( rest_url( 'wwac/v1/' ) ),
			'nonce'      => wp_create_nonce( 'wp_rest' ),
			'adminEmail' => get_option( 'admin_email' ),
			'currency'   => function_exists( 'get_woocommerce_currency_symbol' ) ? html_entity_decode( get_woocommerce_currency_symbol() ) : '$',
			'productUrl' => admin_url( 'post.php?action=edit&post=' ),
		) );
	} );
} );

// "Settings" link on the Plugins screen.
add_filter( 'plugin_action_links_' . plugin_basename( WWAC_FILE ), function ( $links ) {
	array_unshift( $links, '<a href="' . esc_url( admin_url( 'admin.php?page=wwac' ) ) . '">Settings</a>' );
	return $links;
} );
