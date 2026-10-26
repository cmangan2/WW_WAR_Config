<?php
/**
 * REST routes under /wp-json/wwac/v1/.
 *
 *   GET  catalog          public  the parts list as the configurator sees it
 *   GET  admin/catalog    admin   the saved parts list with every setting
 *   POST admin/catalog    admin   save the parts list
 *   POST admin/reset      admin   go back to the built-in defaults
 *   GET  admin/products   admin   search WooCommerce products (?search= or ?sku=)
 *   POST quote            public  email a quote request to the shop
 */

defined( 'ABSPATH' ) || exit;

add_action( 'rest_api_init', function () {
	$admin = function () {
		return current_user_can( 'manage_woocommerce' );
	};

	register_rest_route( 'wwac/v1', '/catalog', array(
		'methods'             => 'GET',
		'permission_callback' => '__return_true',
		'callback'            => function () {
			return rest_ensure_response( wwac_resolved_catalog( true ) );
		},
	) );

	register_rest_route( 'wwac/v1', '/admin/catalog', array(
		array(
			'methods'             => 'GET',
			'permission_callback' => $admin,
			'callback'            => 'wwac_rest_admin_catalog',
		),
		array(
			'methods'             => 'POST',
			'permission_callback' => $admin,
			'callback'            => function ( WP_REST_Request $req ) {
				wwac_save_catalog( $req->get_json_params() );
				return wwac_rest_admin_catalog();
			},
		),
	) );

	register_rest_route( 'wwac/v1', '/admin/reset', array(
		'methods'             => 'POST',
		'permission_callback' => $admin,
		'callback'            => function () {
			delete_option( WWAC_OPTION );
			return wwac_rest_admin_catalog();
		},
	) );

	register_rest_route( 'wwac/v1', '/admin/products', array(
		'methods'             => 'GET',
		'permission_callback' => $admin,
		'callback'            => 'wwac_rest_products',
	) );

	register_rest_route( 'wwac/v1', '/quote', array(
		'methods'             => 'POST',
		'permission_callback' => '__return_true',
		'callback'            => 'wwac_rest_quote',
	) );
} );

/** Saved catalog plus the current state of every linked product, for the admin page. */
function wwac_rest_admin_catalog() {
	$catalog  = wwac_get_catalog();
	$products = array();
	$ids      = array( $catalog['base']['productId'] ?? null );
	foreach ( $catalog['categories'] as $c ) {
		foreach ( $c['options'] as $o ) {
			$ids[] = $o['productId'] ?? null;
		}
	}
	foreach ( array_unique( array_filter( $ids ) ) as $id ) {
		$products[ $id ] = wwac_product_info( $id ); // null when the product was deleted
	}
	return rest_ensure_response( array(
		'catalog'  => $catalog,
		'products' => (object) $products,
		'defaults' => wwac_default_catalog(),
	) );
}

function wwac_rest_products( WP_REST_Request $req ) {
	$sku    = trim( (string) $req->get_param( 'sku' ) );
	$search = trim( (string) $req->get_param( 'search' ) );
	$ids    = array();

	if ( '' !== $sku ) {
		$id = wc_get_product_id_by_sku( $sku );
		if ( $id ) {
			$ids[] = $id;
		}
	} elseif ( '' !== $search ) {
		// Same search the WooCommerce admin uses: name, SKU and variations.
		$store = WC_Data_Store::load( 'product' );
		$ids   = $store->search_products( wc_clean( $search ), '', true, false, 25 );
	} else {
		$ids = wc_get_products( array( 'limit' => 25, 'orderby' => 'date', 'order' => 'DESC', 'return' => 'ids', 'status' => array( 'publish', 'private' ) ) );
	}

	$out = array();
	foreach ( array_filter( array_map( 'absint', $ids ) ) as $id ) {
		$info = wwac_product_info( $id );
		if ( $info && 'trash' !== $info['status'] ) {
			$out[] = $info;
		}
	}
	return rest_ensure_response( $out );
}

function wwac_rest_quote( WP_REST_Request $req ) {
	$p = $req->get_json_params();
	if ( ! is_array( $p ) ) {
		return new WP_Error( 'wwac_bad_request', 'Invalid request.', array( 'status' => 400 ) );
	}
	if ( ! empty( $p['website'] ) ) {
		return rest_ensure_response( array( 'ok' => true ) ); // spam trap: pretend it worked
	}

	$name  = sanitize_text_field( $p['name'] ?? '' );
	$email = sanitize_email( $p['email'] ?? '' );
	$phone = sanitize_text_field( $p['phone'] ?? '' );
	if ( '' === $name || ( '' === $email && '' === $phone ) ) {
		return new WP_Error( 'wwac_missing', 'Please add your name and a phone number or email.', array( 'status' => 400 ) );
	}

	// At most 5 requests per visitor every 10 minutes.
	$key   = 'wwac_q_' . md5( $_SERVER['REMOTE_ADDR'] ?? '' );
	$count = (int) get_transient( $key );
	if ( $count >= 5 ) {
		return new WP_Error( 'wwac_slow_down', 'Too many requests — please try again in a few minutes.', array( 'status' => 429 ) );
	}
	set_transient( $key, $count + 1, 10 * MINUTE_IN_SECONDS );

	$catalog = wwac_get_catalog();
	$to      = $catalog['shop']['quoteEmail'] ?: get_option( 'admin_email' );
	$summary = sanitize_textarea_field( mb_substr( (string) ( $p['summary'] ?? '' ), 0, 8000 ) );
	$link    = esc_url_raw( $p['link'] ?? '' );

	$body  = $summary;
	$body .= "\n\n---\nName: {$name}\nPhone: {$phone}\nEmail: {$email}\nPrefers: " . sanitize_text_field( $p['contact'] ?? '' );
	if ( $link && ! str_contains( $summary, $link ) ) {
		$body .= "\nBuild link: {$link}";
	}

	$headers = array();
	if ( $email ) {
		$headers[] = 'Reply-To: ' . $name . ' <' . $email . '>';
	}
	$sent = wp_mail( $to, 'AR build quote request — ' . $name, $body, $headers );

	/** Lets the shop also push quotes elsewhere (CRM, POS, Slack) without editing the plugin. */
	do_action( 'wwac_quote_submitted', array( 'name' => $name, 'email' => $email, 'phone' => $phone, 'summary' => $summary, 'link' => $link, 'build' => $p['build'] ?? null ), $sent );

	if ( ! $sent ) {
		return new WP_Error( 'wwac_mail_failed', 'The shop\'s email couldn\'t be reached', array( 'status' => 500 ) );
	}
	return rest_ensure_response( array( 'ok' => true ) );
}
