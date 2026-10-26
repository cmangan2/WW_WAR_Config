<?php
/**
 * Storing, cleaning and resolving the configurator's parts list.
 *
 * The list is kept in one option (wwac_catalog) in the same shape as
 * assets/js/catalog-data.js, which also supplies the defaults. Options linked to
 * a WooCommerce product can take their price and stock status from it, so
 * whatever keeps the store's products up to date (POS sync or a CSV import)
 * keeps the configurator up to date too.
 */

defined( 'ABSPATH' ) || exit;

const WWAC_OPTION = 'wwac_catalog';

/** Default catalog, read from the same data file the front end uses. */
function wwac_default_catalog() {
	static $defaults = null;
	if ( null === $defaults ) {
		$js       = file_get_contents( WWAC_DIR . 'assets/js/catalog-data.js' );
		$start    = strpos( $js, '{', strpos( $js, 'WWAC_DEFAULT_DATA' ) );
		$end      = strrpos( $js, '}' );
		$defaults = json_decode( substr( $js, $start, $end - $start + 1 ), true );
	}
	return $defaults;
}

/** The saved catalog, or the defaults if nothing has been saved yet. */
function wwac_get_catalog() {
	$saved = get_option( WWAC_OPTION );
	return is_array( $saved ) ? $saved : wwac_sanitize_catalog( wwac_default_catalog() );
}

function wwac_save_catalog( $raw ) {
	$clean = wwac_sanitize_catalog( $raw );
	update_option( WWAC_OPTION, $clean, false );
	return $clean;
}

function wwac_num( $v, $fallback = 0 ) {
	return is_numeric( $v ) ? 0 + $v : $fallback;
}

function wwac_product_id( $v ) {
	$id = absint( $v );
	return $id > 0 ? $id : null;
}

/**
 * Keep only known settings and coerce their types. Categories are fixed (the
 * fitment rules and the 3D model depend on them); their options are not.
 */
function wwac_sanitize_catalog( $raw ) {
	$defaults = wwac_default_catalog();
	$raw      = is_array( $raw ) ? $raw : array();
	$shop     = isset( $raw['shop'] ) && is_array( $raw['shop'] ) ? $raw['shop'] : array();
	$base     = isset( $raw['base'] ) && is_array( $raw['base'] ) ? $raw['base'] : array();

	$out = array(
		'shop'      => array(
			'name'         => sanitize_text_field( $shop['name'] ?? $defaults['shop']['name'] ),
			'quoteEmail'   => sanitize_email( $shop['quoteEmail'] ?? '' ),
			'samplePrices' => ! empty( $shop['samplePrices'] ),
		),
		'base'      => array(
			'name'      => sanitize_text_field( $base['name'] ?? $defaults['base']['name'] ),
			'price'     => wwac_num( $base['price'] ?? null, $defaults['base']['price'] ),
			'includes'  => sanitize_textarea_field( $base['includes'] ?? '' ),
			'productId' => wwac_product_id( $base['productId'] ?? null ),
			'priceFrom' => ( $base['priceFrom'] ?? '' ) === 'product' ? 'product' : 'manual',
		),
		'upperRail' => wwac_num( $raw['upperRail'] ?? null, $defaults['upperRail'] ),
		'autoParts' => array(),
		'categories' => array(),
	);

	foreach ( $defaults['autoParts'] as $key => $part ) {
		$in                       = $raw['autoParts'][ $key ] ?? array();
		$out['autoParts'][ $key ] = array(
			'name'  => sanitize_text_field( $in['name'] ?? $part['name'] ),
			'price' => wwac_num( $in['price'] ?? null, $part['price'] ),
		);
	}

	$raw_cats = array();
	foreach ( (array) ( $raw['categories'] ?? array() ) as $c ) {
		if ( is_array( $c ) && isset( $c['id'] ) ) {
			$raw_cats[ $c['id'] ] = $c;
		}
	}

	foreach ( $defaults['categories'] as $def ) {
		$in  = $raw_cats[ $def['id'] ] ?? $def;
		$cat = $def; // keeps id, multi, requiresFreeFloat and the field list
		$cat['label']       = sanitize_text_field( $in['label'] ?? $def['label'] );
		$cat['allowCustom'] = empty( $def['multi'] ) && ! empty( $in['allowCustom'] );
		$cat['customHint']  = sanitize_text_field( $in['customHint'] ?? '' );
		$cat['options']     = array();

		$seen = array( 'custom' => true ); // "custom" is reserved for custom requests
		foreach ( (array) ( $in['options'] ?? array() ) as $o ) {
			if ( ! is_array( $o ) || '' === trim( (string) ( $o['name'] ?? '' ) ) ) {
				continue;
			}
			$id = sanitize_key( $o['id'] ?? '' );
			if ( '' === $id || isset( $seen[ $id ] ) ) {
				$id = 'opt' . substr( md5( wp_json_encode( $o ) . count( $seen ) ), 0, 8 );
			}
			$seen[ $id ] = true;

			$opt = array(
				'id'        => $id,
				'name'      => sanitize_text_field( $o['name'] ),
				'sub'       => sanitize_text_field( $o['sub'] ?? '' ),
				'price'     => wwac_num( $o['price'] ?? 0 ),
				'enabled'   => ! isset( $o['enabled'] ) || ! empty( $o['enabled'] ),
				'productId' => wwac_product_id( $o['productId'] ?? null ),
				'priceFrom' => ( $o['priceFrom'] ?? '' ) === 'product' ? 'product' : 'manual',
			);
			foreach ( $def['fields'] as $f ) {
				$v = $o[ $f['key'] ] ?? null;
				switch ( $f['type'] ) {
					case 'number':
						$opt[ $f['key'] ] = wwac_num( $v );
						break;
					case 'bool':
						$opt[ $f['key'] ] = ! empty( $v );
						break;
					case 'select':
						$opt[ $f['key'] ] = array_key_exists( (string) $v, $f['choices'] ) ? (string) $v : (string) array_key_first( $f['choices'] );
						break;
					case 'color':
						$opt[ $f['key'] ] = sanitize_hex_color( $v ) ?: '#2b2c2f';
						break;
					default:
						$opt[ $f['key'] ] = sanitize_text_field( (string) $v );
				}
			}
			$cat['options'][] = $opt;
		}

		if ( ! $cat['options'] ) {
			$cat['options'] = $def['options']; // a category can't be left empty
		}
		$ids            = wp_list_pluck( $cat['options'], 'id' );
		$cat['default'] = in_array( $in['default'] ?? '', $ids, true ) ? $in['default'] : ( in_array( $def['default'] ?? '', $ids, true ) ? $def['default'] : $ids[0] );
		$out['categories'][] = $cat;
	}

	return $out;
}

/** Current price and stock status of a linked WooCommerce product. */
function wwac_product_info( $product_id ) {
	if ( ! $product_id || ! function_exists( 'wc_get_product' ) ) {
		return null;
	}
	$p = wc_get_product( $product_id );
	if ( ! $p ) {
		return null;
	}
	return array(
		'id'      => $p->get_id(),
		'name'    => wp_strip_all_tags( $p->get_formatted_name() ), // includes the SKU, for telling products apart
		'title'   => $p->get_name(),
		'sku'     => $p->get_sku(),
		'price'   => (float) $p->get_price(),
		'inStock' => $p->is_in_stock(),
		'stock'   => $p->managing_stock() ? $p->get_stock_quantity() : null,
		'status'  => $p->get_status(),
	);
}

/**
 * The catalog as the configurator should see it: linked prices and stock filled
 * in, hidden options dropped. $public strips settings visitors don't need.
 */
function wwac_resolved_catalog( $public = true ) {
	$cat = wwac_get_catalog();

	$apply = function ( &$item ) {
		$info = wwac_product_info( $item['productId'] ?? null );
		if ( ! $info ) {
			return;
		}
		if ( 'product' === ( $item['priceFrom'] ?? '' ) ) {
			$item['price'] = $info['price'];
		}
		$item['inStock'] = $info['inStock'];
	};

	$apply( $cat['base'] );
	foreach ( $cat['categories'] as &$c ) {
		foreach ( $c['options'] as &$o ) {
			$apply( $o );
		}
		unset( $o );
		if ( $public ) {
			$enabled = array_values( array_filter( $c['options'], function ( $o ) {
				return ! empty( $o['enabled'] );
			} ) );
			// Every category needs at least one part, so fall back to its default if all are hidden.
			$c['options'] = $enabled ? $enabled : array_values( wp_list_filter( $c['options'], array( 'id' => $c['default'] ?? '' ) ) );
			unset( $c['fields'] );
		}
	}
	unset( $c );

	if ( $public ) {
		unset( $cat['shop']['quoteEmail'] ); // quotes go through the REST endpoint instead
		$cat['quoteEndpoint'] = rest_url( 'wwac/v1/quote' );
	}
	return $cat;
}
