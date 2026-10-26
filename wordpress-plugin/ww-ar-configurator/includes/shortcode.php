<?php
/**
 * [ar_configurator] — puts the configurator on a page.
 *
 *   [ar_configurator]           3D view (default)
 *   [ar_configurator view="2d"] 2D drawing
 *
 * The markup is taken from the same test pages that live in the repo
 * (assets/templates/index.html and 2d.html), between their "Configurator" and
 * "end configurator" comments, so the site and the test pages can't drift apart.
 */

defined( 'ABSPATH' ) || exit;

add_shortcode( 'ar_configurator', 'wwac_shortcode' );

function wwac_template_markup( $view ) {
	$file = WWAC_DIR . 'assets/templates/' . ( '2d' === $view ? '2d.html' : 'index.html' );
	$html = (string) file_get_contents( $file );
	$from = strpos( $html, '<div class="ww-config">' );
	$to   = strpos( $html, '<!-- ===== end configurator' );
	if ( false === $from || false === $to ) {
		return '';
	}
	return substr( $html, $from, $to - $from );
}

function wwac_shortcode( $atts ) {
	static $done = false;
	if ( $done ) {
		return ''; // one configurator per page
	}
	$done = true;

	$atts = shortcode_atts( array( 'view' => '3d' ), $atts, 'ar_configurator' );
	$view = isset( $_GET['wwac_view'] ) ? sanitize_key( wp_unslash( $_GET['wwac_view'] ) ) : $atts['view'];
	$view = '2d' === $view ? '2d' : '3d';

	$assets = WWAC_URL . 'assets/';
	$ver    = WWAC_VERSION;

	wp_enqueue_style( 'wwac', $assets . 'css/style.css', array(), $ver );
	wp_enqueue_script( 'wwac-catalog-data', $assets . 'js/catalog-data.js', array(), $ver, true );
	wp_enqueue_script( 'wwac-catalog', $assets . 'js/catalog.js', array( 'wwac-catalog-data' ), $ver, true );
	wp_add_inline_script( 'wwac-catalog', 'window.WWAC_CATALOG = ' . wp_json_encode( wwac_resolved_catalog( true ) ) . ';', 'before' );
	$deps = array( 'wwac-catalog' );
	if ( '2d' === $view ) {
		wp_enqueue_script( 'wwac-draw2d', $assets . 'js/draw2d.js', $deps, $ver, true );
		$deps = array( 'wwac-draw2d' );
	}
	wp_enqueue_script( 'wwac-configurator', $assets . 'js/configurator.js', $deps, $ver, true );
	if ( '2d' === $view ) {
		wp_add_inline_script( 'wwac-configurator', 'startConfigurator(function(b){ document.getElementById("rifle").innerHTML = drawRifle(b); });' );
	} else {
		// Module scripts run after the page's classic scripts, so the configurator is ready by then.
		wp_enqueue_script_module( 'wwac-boot3d', $assets . 'js/boot3d.js', array(), $ver );
	}

	// The 2D/3D link switches the view on this same page.
	$markup = wwac_template_markup( $view );
	$other  = '2d' === $view ? '3d' : '2d';
	$markup = preg_replace( '/data-page="[^"]*" href="[^"]*"/', 'data-page="' . esc_attr( '?wwac_view=' . $other ) . '" href="' . esc_attr( '?wwac_view=' . $other ) . '"', $markup, 1 );
	return $markup;
}
