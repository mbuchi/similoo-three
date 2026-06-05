/**
 * Vanilla-JS i18n module for similoo.
 *
 * similoo is a Cesium-driven 3D viewer built in vanilla JS (no React), so it
 * cannot consume the shared React `<LocaleSelector>` / `I18nContext.tsx`
 * pattern used by the rest of the SwissNovo suite. This module is the
 * vanilla equivalent — same key prefixes, same fallback chain
 * (locale → en → key), same `{placeholder}` syntax. It mirrors the module
 * shape established in goody (gwr_scraper), which is the first React-free
 * site in the suite.
 *
 * Pattern:
 *   - All static HTML strings are marked with `data-i18n="key"`. The DOM
 *     sweep `applyTranslations(root)` rewrites textContent / innerHTML.
 *   - Attribute strings (title, placeholder, aria-label) use
 *     `data-i18n-attr="placeholder:nav.search_placeholder,title:foo"`.
 *   - JS-rendered fragments call `t('key')` directly, and may subscribe to
 *     `onLocaleChange` if they need to re-render when the language flips.
 *   - The active locale is persisted in localStorage under `similoo:locale`.
 *     On first load it falls back to navigator.language[0:2] (if supported),
 *     else 'en'.
 *
 * Translation keys are organised by prefix:
 *   common.*          - reused widgets / generic labels
 *   nav.*             - navbar (logo subtitle, search, language, theme)
 *   views.*           - the compass / views dropdown
 *   sun.*             - 24h sun-cycle button
 *   settings.*        - the Setup gear popover (Display + Tools)
 *   basemap.*         - basemap selector (Satellite / Hillshade)
 *   screenshot.*      - save-image + My Exports + toasts
 *   gallery.*         - the saved-images modal / preview
 *   dock.*            - floating dock (Export / 360° / Record / Help)
 *   tour.*            - Shepherd guided tour text
 *   auth.*            - sign-in nav, dropdown menu, profile modal
 *   building.*        - building info panel labels (left-hand dark panel)
 *   release_notes.*   - the version-history viewer chrome (NOT the data)
 *   error.*           - error messages surfaced to users
 *   meta.*            - <title>, og:title, og:description, etc.
 */

import {
    registerI18n,
    setLocale as setSharedLocale,
} from '@aireon/shared/cesium-app/i18n/engine.js';

export const SUPPORTED_LOCALES = ['en', 'fr', 'de', 'it'];
const STORAGE_KEY = 'similoo-three:locale';
const subscribers = new Set();

const translations = {
  en: {
    // ---------- common ----------
    'common.loading': 'Loading…',
    'common.close': 'Close',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.dash': '—',
    'common.unknown': 'Unknown',
    'common.on': 'On',
    'common.off': 'Off',
    'common.dismiss': 'Dismiss',
    'common.refresh': 'Refresh',
    'common.try_again': 'Try again',
    'common.delete': 'Delete',
    'common.open': 'Open',

    // ---------- meta ----------
    'meta.title': 'similoo-three - 3D Comparable Buildings',
    'meta.description':
      'Type an address, get a live 3D Three.js view of the building and its 100 m surroundings, plus comparable buildings across Switzerland.',
    'meta.og_title': 'similoo-three — address-first 3D comparable buildings',
    'meta.og_description':
      'Type an address, get a live 3D Three.js view of the building and its 100 m surroundings, plus comparable buildings across Switzerland.',
    'meta.og_image_alt': 'similoo-three — address-first 3D comparable buildings',
    'meta.twitter_title': 'similoo-three — address-first 3D comparable buildings',
    'meta.twitter_description':
      '3D Three.js viewer of a Swiss address with its 100 m surroundings.',
    'meta.twitter_image_alt': 'similoo-three — address-first 3D comparable buildings',

    // ---------- nav ----------
    'nav.logo_subtitle': 'Address-first 3D',
    'nav.search_placeholder': 'Search a Swiss address…',
    'nav.search_aria': 'Search address',
    'nav.select_language': 'Select language',
    'nav.theme_to_dark': 'Switch to dark mode',
    'nav.theme_to_light': 'Switch to light mode',
    'nav.theme_toggle': 'Toggle dark mode',
    'nav.skip_to_content': 'Skip to content',

    // ---------- landing ----------
    'landing.title': 'Type a Swiss address.',
    'landing.subtitle':
      'We render the building and a 100 m slice around it in live 3D, with comparable buildings from across Switzerland.',
    'landing.search_placeholder': 'e.g. Bahnhofstrasse 10, Zürich',
    'landing.search_aria': 'Search a Swiss address',
    'landing.hint': 'Pick a result to load the 3D scene.',

    // ---------- scene ----------
    'scene.back': 'Search again',
    'scene.loading': 'Loading 3D scene…',
    'scene.compass_n': 'N',
    'scene.compass_e': 'E',
    'scene.compass_s': 'S',
    'scene.compass_w': 'W',
    'scene.compass_aria': 'Snap view to north',
    'scene_info.eyebrow': 'Building',
    'scene_info.close': 'Close',
    'scene_info.unknown': 'Unknown building',
    'scene_info.empty': 'No metadata available for this building.',
    'scene_info.address': 'Address',
    'scene_info.gwr_id': 'GWR ID',
    'scene_info.res_id': 'RES ID',
    'scene_info.const_year': 'Built',
    'scene_info.floors': 'Floors',
    'scene_info.height': 'Height',
    'scene_info.height_p95': 'Height (P95)',
    'scene_info.volume': 'Volume',
    'scene_info.footprint': 'Footprint',
    'scene_info.distance': 'Distance to centre',
    'scene.layers_aria': 'Scene layers',
    'scene.layer_vegetation': 'Vegetation',
    'scene.sun_aria': 'Sun position control',
    'scene.sun_now': 'Now',
    'scene.sun_now_aria': 'Reset to current time',
    'scene.sun_date_aria': 'Date',
    'scene.sun_time_aria': 'Time of day',
    'scene.sun_below_horizon': 'Below horizon',
    'scene.retry': 'Retry',
    'scene.error_load': 'Could not load 3D scene.',
    'scene.canvas_aria': '3D viewer of the selected Swiss address: terrain, building, and nearby buildings rendered with shadows',
    'save_parcel.idle': 'Track parcel',
    'save_parcel.saving': 'Saving…',
    'save_parcel.saved': 'Tracked',
    'save_parcel.sign_in': 'Sign in to save',
    'save_parcel.error': 'Try again',

    // ---------- views dropdown ----------
    'views.button': 'Views',
    'views.from_north': 'View from North',
    'views.from_east': 'View from East',
    'views.from_south': 'View from South',
    'views.from_west': 'View from West',

    // ---------- sun cycle ----------
    'sun.button': '24-hour sun cycle',
    'sun.stop': 'Stop',
    'sun.label_24hrs': '24hrs',

    // ---------- settings ----------
    'settings.button': 'Setup',
    'settings.display_section': 'Display',
    'settings.set_date': 'Set date:',
    'settings.hdr_mode': 'HDR Mode',
    'settings.show_shadows': 'Show shadows',
    'settings.swiss_layers': '3D buildings swisstopo official + terrain',
    'settings.osm_layers': '3D OSM + Cesium terrain',
    'settings.google_layers': 'Google Photorealistic 3D',
    'settings.buildings_min_zoom': '3D buildings from zoom',
    'settings.tools_section': 'Tools',
    'settings.autosave_tours': 'Autosave tours',
    'settings.camera_info': 'Show camera info',
    'settings.allow_gps': 'Allow GPS',
    'settings.osm_token_missing': 'VITE_CESIUM_ION_TOKEN is not configured',
    'settings.osm_token_hint': 'Set VITE_CESIUM_ION_TOKEN to enable',
    'settings.osm_load_failed':
      'OSM Buildings tileset failed to load (check Cesium Ion quota / network)',
    'settings.osm_load_failed_hint': 'Cesium Ion request failed',
    'settings.google_key_missing': 'VITE_GOOGLE_MAPS_API_KEY is not configured',
    'settings.google_key_hint': 'Set VITE_GOOGLE_MAPS_API_KEY to enable',

    // ---------- basemap selector ----------
    'basemap.choose': 'Choose basemap',
    'basemap.satellite': 'Satellite',
    'basemap.hillshade': 'Hillshade',

    // ---------- floating dock ----------
    'dock.toolbar_label': 'Map actions',
    'dock.export': 'Export view',
    'dock.around': '360° orbit',
    'dock.around_stop': 'Stop',
    'dock.record': 'Record',
    'dock.record_stop': 'Stop',
    'dock.tour': 'Help tour',

    // ---------- screenshot ----------
    'screenshot.save': 'Save Image',
    'screenshot.my_exports': 'My Exports',
    'screenshot.creating': 'Creating image.',
    'screenshot.saved': 'Image saved',
    'screenshot.view_image': 'View image',
    'screenshot.failed': 'Failed to save image',

    // ---------- gallery (My Exports modal) ----------
    'gallery.title': 'My Exports',
    'gallery.refresh': 'Refresh',
    'gallery.close': 'Close',
    'gallery.empty_title': 'No images saved yet',
    'gallery.empty_hint':
      'Use the camera button in the navbar to capture and save the current view.',
    'gallery.see_in_showroom': 'See all publications in Showroom',
    'gallery.footer_cta':
      'Showing latest {visible} of {total}. {hidden} more available in Showroom.',
    'gallery.open': 'Open',
    'gallery.delete': 'Delete',
    'gallery.delete_confirm': 'Delete this saved image? This cannot be undone.',
    'gallery.delete_failed': 'Failed to delete image',
    'gallery.load_failed': 'Failed to load images',
    'gallery.preview_close': 'Close preview',
    'gallery.dismiss': 'Dismiss',
    'gallery.col_app': 'App',
    'gallery.col_saved': 'Saved',
    'gallery.col_dimensions': 'Dimensions',
    'gallery.col_size': 'Size',
    'gallery.col_address': 'Address',
    'gallery.col_center': 'Center',
    'gallery.col_parcel_id': 'Parcel ID',
    'gallery.col_tilt': 'Tilt',
    'gallery.col_bearing': 'Bearing',
    'gallery.col_zoom': 'Zoom',
    'gallery.col_basemap': 'Basemap',
    'gallery.col_3d_mode': '3D mode',
    'gallery.tilt_value': 'Tilt {value}',
    'gallery.additional_metadata': 'Additional metadata',

    // ---------- tour (Shepherd) ----------
    'tour.skip': 'Skip',
    'tour.next': 'Next',
    'tour.back': 'Back',
    'tour.welcome_title': 'Welcome to similoo',
    'tour.welcome_text':
      'Let us show you the essential features of this 3D neighborhood viewer.',
    'tour.search_title': 'Address Search',
    'tour.search_text':
      'Search any Swiss address to see its 3D view. Try street names, cities, or landmarks.',
    'tour.views_title': 'Viewing Angles',
    'tour.views_text':
      'Switch between North, East, South, and West views to analyze different aspects of the location.',
    'tour.export_title': 'Export Views',
    'tour.export_text':
      'Save your current view as a high-quality image for documentation or sharing.',
    'tour.around_title': 'Around View',
    'tour.around_text':
      'Create a smooth 360° rotation around your point of interest. Use zoom controls to adjust the view distance.',
    'tour.settings_title': 'Advanced Settings',
    'tour.settings_text':
      'Customize your experience with HDR mode, video recording, camera info, and shadow settings.',
    'tour.navigation_title': 'Mouse Navigation',
    'tour.navigation_text':
      'Use left click to pan, right click to rotate, and the mouse wheel to zoom. On-screen controls are also available.',

    // ---------- auth ----------
    'auth.sign_in': 'Sign in',
    'auth.sign_out': 'Sign out',
    'auth.account': 'Account',
    'auth.signed_in': 'Signed in',
    'auth.view_profile': 'View profile',
    'auth.status_active': 'Active',
    'auth.avatar_alt': 'Avatar',
    'auth.profile_avatar_alt': 'Profile avatar',
    'auth.profile_pick_avatar': 'Pick a new avatar',
    'auth.profile_field_gender': 'Gender',
    'auth.profile_gender_unspecified': 'Prefer not to say',
    'auth.profile_gender_female': 'Female',
    'auth.profile_gender_male': 'Male',
    'auth.profile_gender_other': 'Other',
    'auth.profile_field_age': 'Age',
    'auth.profile_field_bio': 'About you',
    'auth.profile_bio_placeholder': 'Anything you\'d like to share',
    'auth.profile_cancel': 'Cancel',
    'auth.profile_save': 'Save',
    'auth.profile_loading': 'Loading...',
    'auth.profile_saving': 'Saving...',
    'auth.profile_saved': 'Profile saved.',
    'auth.profile_save_failed': 'Could not save profile. Try again.',
    'auth.profile_load_failed':
      'Could not load saved profile. You can still set one.',

    // ---------- building info panel ----------
    'building.dialog_label': 'Building details',
    'building.close_panel': 'Close panel',
    'building.fallback_name': 'Building',
    'building.id_prefix': 'ID {id}',
    'building.source_swisstlm': 'SwissTLM3D',
    'building.source_osm': 'OSM Buildings',
    'building.source_generic': 'Building',
    'building.tile_volume': 'Volume',
    'building.tile_height': 'Height',
    'building.tile_footprint': 'Footprint',
    'building.tile_estimated': '~est.',
    'building.unit_m3': 'm³',
    'building.unit_m': 'm',
    'building.unit_m2': 'm²',
    'building.profile_title': '3D Profile',
    'building.bar_volume': 'Volume',
    'building.bar_height': 'Height',
    'building.bar_footprint': 'Footprint',
    'building.roof_label': 'Roof shape:',
    'building.bucket_small': 'Small',
    'building.bucket_medium': 'Medium',
    'building.bucket_large': 'Large',
    'building.bucket_xlarge': 'Xlarge',
    'building.bucket_low_rise': 'Low-rise',
    'building.bucket_mid_rise': 'Mid-rise',
    'building.bucket_high_rise': 'High-rise',
    'building.bucket_tower': 'Tower',
    'building.roof_flat': 'Flat',
    'building.roof_pitched': 'Pitched',
    'building.roof_unknown': 'Unknown',
    'building.solar_title': 'Solar exposure',
    'building.solar_summary':
      '{hours} h sunlit · {percent}% of daylight',
    'building.props_toggle': 'Properties ({count})',
    'building.label_residential': 'Residential',
    'building.label_mixed_use': 'Mixed-use',
    'building.label_industrial': 'Industrial',
    'building.label_office': 'Office',
    'building.label_public': 'Public',
    'building.label_religious': 'Religious',
    'building.label_apartments': 'Apartments',
    'building.label_commercial': 'Commercial',
    'building.label_retail': 'Retail',
    'building.label_school': 'School',

    // ---------- comparison sidebar ----------
    'comparison.eyebrow': 'Target parcel',
    'comparison.title': 'Comparable buildings',
    'comparison.close': 'Close comparison',
    'comparison.target_empty': 'Select a building on the map to load comparables.',
    'comparison.metric_municipality': 'Municipality',
    'comparison.metric_zoning': 'Zoning',
    'comparison.metric_egrid': 'EGRID',
    'comparison.metric_parcel_size': 'Parcel size',
    'comparison.metric_parcel_size_short': 'Parcel',
    'comparison.metric_volume': 'Volume',
    'comparison.metric_volume_short': 'Volume',
    'comparison.metric_footprint': 'Footprint',
    'comparison.metric_height': 'Height',
    'comparison.metric_floors': 'Floors',
    'comparison.metric_year': 'Built',
    'comparison.metric_ratiov': 'ratioV',
    'comparison.metric_similarity_short': 'Match',
    'comparison.filters_title': 'Filters',
    'comparison.years_window': 'Years window',
    'comparison.years_suffix': 'yrs',
    'comparison.parcel_size_range': 'Parcel size range (m²)',
    'comparison.parcel_size_from': 'From',
    'comparison.parcel_size_to': 'To',
    'comparison.list_title': 'Comparables',
    'comparison.sort_by': 'Sort',
    'comparison.sort_similarity': 'By similarity',
    'comparison.sort_ratioV': 'By ratioV (desc)',
    'comparison.sort_size': 'By parcel size',
    'comparison.sort_year': 'By year (newest)',
    'comparison.status_loading': 'Loading comparables…',
    'comparison.status_empty': 'No comparable buildings yet for this parcel. Try widening the year window.',
    'comparison.status_error': 'Could not load comparables. Try again later.',
    'comparison.card_aria': 'Comparable parcel {egrid}',
    'comparison.meta_mock': 'Demo data',
    'comparison.meta_live': 'Live',
    'comparison.meta_gwr_month': 'GWR {month}',
    'comparison.unit_m2': 'm²',
    'comparison.unit_m3': 'm³',
    'comparison.unit_m': 'm',

    // ---------- release notes panel ----------
    'release_notes.aria_label': 'Release notes',
    'release_notes.title': 'What\'s new in',
    'release_notes.subtitle':
      'Every shipped change, grouped by version. Latest release {version} · {codename} · {date}.',
    'release_notes.live': 'live',
    'release_notes.releases_count': '{count} releases',
    'release_notes.changes_count': '{count} changes',
    'release_notes.view_all_prs': 'View all PRs',
    'release_notes.search_placeholder':
      'Search changes, versions, or PR numbers… ( / to focus)',
    'release_notes.filter_all': 'All',
    'release_notes.kind_new': 'New',
    'release_notes.kind_improved': 'Improved',
    'release_notes.kind_fixed': 'Fixed',
    'release_notes.kind_docs': 'Docs',
    'release_notes.empty': 'No changes match that filter.',
    'release_notes.latest_badge': 'Latest',
    'release_notes.change_one': 'change',
    'release_notes.change_many': 'changes',
    'release_notes.footer':
      'Versions follow SemVer. History is reconstructed from merged pull requests.',
    'release_notes.close_label': 'Close',
    'release_notes.whats_new_aria': 'What\'s new — v{version}',
    'release_notes.pr_title': 'Pull request #{n}',

    // ---------- errors ----------
    'error.cesium_missing':
      'Cesium is not loaded. Please check your network connection.',
    'error.viewer_load': 'Error loading 3D view: {message}',
    'error.geocode_failed': 'Geocoding failed',

    // ---------- camera monitor (debug HUD) ----------
    'camera.address': 'Address',
    'camera.position': 'Position',
    'camera.longitude': 'Longitude',
    'camera.latitude': 'Latitude',
    'camera.height_above_terrain': 'Height above terrain',
    'camera.terrain_height': 'Terrain height',
    'camera.orientation': 'Orientation',
    'camera.heading': 'Heading',
    'camera.pitch': 'Pitch',
    'camera.roll': 'Roll',
  },

  fr: {
    // ---------- common ----------
    'common.loading': 'Chargement…',
    'common.close': 'Fermer',
    'common.cancel': 'Annuler',
    'common.save': 'Enregistrer',
    'common.dash': '—',
    'common.unknown': 'Inconnu',
    'common.on': 'Activé',
    'common.off': 'Désactivé',
    'common.dismiss': 'Fermer',
    'common.refresh': 'Actualiser',
    'common.try_again': 'Réessayer',
    'common.delete': 'Supprimer',
    'common.open': 'Ouvrir',

    // ---------- meta ----------
    'meta.title':
      'similoo-three - 3D Bâtiments comparables',
    'meta.description':
      'Tapez une adresse, obtenez une vue 3D Three.js du bâtiment et de ses 100 m d\'environnement, plus des bâtiments comparables à travers la Suisse.',
    'meta.og_title': 'similoo-three — 3D dès l\'adresse',
    'meta.og_description':
      'Tapez une adresse, obtenez une vue 3D Three.js du bâtiment et de ses 100 m d\'environnement, plus des bâtiments comparables à travers la Suisse.',
    'meta.og_image_alt': 'similoo-three — 3D dès l\'adresse',
    'meta.twitter_title': 'similoo-three — 3D dès l\'adresse',
    'meta.twitter_description':
      'Visualiseur Three.js 3D d\'une adresse suisse avec ses 100 m d\'environnement.',
    'meta.twitter_image_alt': 'similoo-three — 3D dès l\'adresse',

    // ---------- landing ----------
    'landing.title': 'Tapez une adresse suisse.',
    'landing.subtitle':
      'Nous rendons le bâtiment et 100 m alentour en 3D en direct, avec des bâtiments comparables à travers la Suisse.',
    'landing.search_placeholder': 'p. ex. Bahnhofstrasse 10, Zürich',
    'landing.search_aria': 'Rechercher une adresse suisse',
    'landing.hint': 'Sélectionnez un résultat pour charger la scène 3D.',

    // ---------- scene ----------
    'scene.back': 'Nouvelle recherche',
    'scene.loading': 'Chargement de la scène 3D…',
    'scene.compass_n': 'N',
    'scene.compass_e': 'E',
    'scene.compass_s': 'S',
    'scene.compass_w': 'O',
    'scene.compass_aria': 'Aligner la vue vers le nord',
    'scene_info.eyebrow': 'Bâtiment',
    'scene_info.close': 'Fermer',
    'scene_info.unknown': 'Bâtiment inconnu',
    'scene_info.empty': 'Aucune métadonnée disponible pour ce bâtiment.',
    'scene_info.address': 'Adresse',
    'scene_info.gwr_id': 'ID RegBL',
    'scene_info.res_id': 'ID RES',
    'scene_info.const_year': 'Construit en',
    'scene_info.floors': 'Étages',
    'scene_info.height': 'Hauteur',
    'scene_info.height_p95': 'Hauteur (P95)',
    'scene_info.volume': 'Volume',
    'scene_info.footprint': 'Emprise',
    'scene_info.distance': 'Distance au centre',
    'scene.layers_aria': 'Couches de la scène',
    'scene.layer_vegetation': 'Végétation',
    'scene.sun_aria': 'Position du soleil',
    'scene.sun_now': 'Maintenant',
    'scene.sun_now_aria': 'Revenir à l\'heure actuelle',
    'scene.sun_date_aria': 'Date',
    'scene.sun_time_aria': 'Heure de la journée',
    'scene.sun_below_horizon': 'Sous l\'horizon',
    'scene.retry': 'Réessayer',
    'scene.error_load': 'Impossible de charger la scène 3D.',
    'scene.canvas_aria': 'Visualiseur 3D de l\'adresse suisse sélectionnée : terrain, bâtiment et bâtiments environnants avec ombres rendues.',
    'save_parcel.idle': 'Suivre la parcelle',
    'save_parcel.saving': 'Enregistrement…',
    'save_parcel.saved': 'Suivie',
    'save_parcel.sign_in': 'Se connecter pour enregistrer',
    'save_parcel.error': 'Réessayer',

    // ---------- nav ----------
    'nav.logo_subtitle': '3D dès l\'adresse',
    'nav.search_placeholder': 'Rechercher une adresse suisse…',
    'nav.search_aria': 'Rechercher une adresse',
    'nav.select_language': 'Choisir la langue',
    'nav.theme_to_dark': 'Passer en mode sombre',
    'nav.theme_to_light': 'Passer en mode clair',
    'nav.theme_toggle': 'Basculer le mode sombre',
    'nav.skip_to_content': 'Aller au contenu',

    // ---------- views dropdown ----------
    'views.button': 'Vues',
    'views.from_north': 'Vue depuis le nord',
    'views.from_east': 'Vue depuis l\'est',
    'views.from_south': 'Vue depuis le sud',
    'views.from_west': 'Vue depuis l\'ouest',

    // ---------- sun cycle ----------
    'sun.button': 'Cycle solaire 24 h',
    'sun.stop': 'Arrêter',
    'sun.label_24hrs': '24 h',

    // ---------- settings ----------
    'settings.button': 'Réglages',
    'settings.display_section': 'Affichage',
    'settings.set_date': 'Définir la date :',
    'settings.hdr_mode': 'Mode HDR',
    'settings.show_shadows': 'Afficher les ombres',
    'settings.swiss_layers': 'Bâtiments 3D swisstopo officiel + terrain',
    'settings.osm_layers': 'OSM 3D + terrain Cesium',
    'settings.google_layers': 'Google 3D photoréaliste',
    'settings.buildings_min_zoom': 'Bâtiments 3D à partir du zoom',
    'settings.tools_section': 'Outils',
    'settings.autosave_tours': 'Enregistrement auto des tours',
    'settings.camera_info': 'Afficher les infos caméra',
    'settings.allow_gps': 'Autoriser le GPS',
    'settings.osm_token_missing':
      'VITE_CESIUM_ION_TOKEN n\'est pas configuré',
    'settings.osm_token_hint': 'Définir VITE_CESIUM_ION_TOKEN pour activer',
    'settings.osm_load_failed':
      'Le tileset OSM Buildings n\'a pas pu être chargé (quota Cesium Ion / réseau)',
    'settings.osm_load_failed_hint': 'Échec de la requête Cesium Ion',
    'settings.google_key_missing':
      'VITE_GOOGLE_MAPS_API_KEY n\'est pas configuré',
    'settings.google_key_hint':
      'Définir VITE_GOOGLE_MAPS_API_KEY pour activer',

    // ---------- basemap selector ----------
    'basemap.choose': 'Choisir le fond de carte',
    'basemap.satellite': 'Satellite',
    'basemap.hillshade': 'Ombrage du relief',

    // ---------- floating dock ----------
    'dock.toolbar_label': 'Actions sur la carte',
    'dock.export': 'Exporter la vue',
    'dock.around': 'Orbite à 360°',
    'dock.around_stop': 'Arrêter',
    'dock.record': 'Enregistrer',
    'dock.record_stop': 'Arrêter',
    'dock.tour': 'Visite guidée',

    // ---------- screenshot ----------
    'screenshot.save': 'Enregistrer l\'image',
    'screenshot.my_exports': 'Mes exports',
    'screenshot.creating': 'Création de l\'image.',
    'screenshot.saved': 'Image enregistrée',
    'screenshot.view_image': 'Voir l\'image',
    'screenshot.failed': 'Échec de l\'enregistrement',

    // ---------- gallery ----------
    'gallery.title': 'Mes exports',
    'gallery.refresh': 'Actualiser',
    'gallery.close': 'Fermer',
    'gallery.empty_title': 'Aucune image enregistrée',
    'gallery.empty_hint':
      'Utilisez le bouton appareil photo dans la barre de navigation pour capturer et enregistrer la vue actuelle.',
    'gallery.see_in_showroom': 'Voir toutes les publications dans Showroom',
    'gallery.footer_cta':
      'Affichage des {visible} dernières sur {total}. {hidden} de plus disponibles dans Showroom.',
    'gallery.open': 'Ouvrir',
    'gallery.delete': 'Supprimer',
    'gallery.delete_confirm':
      'Supprimer cette image enregistrée ? Cette action est irréversible.',
    'gallery.delete_failed': 'Échec de la suppression',
    'gallery.load_failed': 'Échec du chargement des images',
    'gallery.preview_close': 'Fermer l\'aperçu',
    'gallery.dismiss': 'Fermer',
    'gallery.col_app': 'App',
    'gallery.col_saved': 'Enregistré',
    'gallery.col_dimensions': 'Dimensions',
    'gallery.col_size': 'Taille',
    'gallery.col_address': 'Adresse',
    'gallery.col_center': 'Centre',
    'gallery.col_parcel_id': 'ID parcelle',
    'gallery.col_tilt': 'Inclinaison',
    'gallery.col_bearing': 'Cap',
    'gallery.col_zoom': 'Zoom',
    'gallery.col_basemap': 'Fond de carte',
    'gallery.col_3d_mode': 'Mode 3D',
    'gallery.tilt_value': 'Incl. {value}',
    'gallery.additional_metadata': 'Métadonnées supplémentaires',

    // ---------- tour ----------
    'tour.skip': 'Passer',
    'tour.next': 'Suivant',
    'tour.back': 'Précédent',
    'tour.welcome_title': 'Bienvenue dans similoo',
    'tour.welcome_text':
      'Découvrez les fonctionnalités essentielles de ce visualiseur 3D de quartier.',
    'tour.search_title': 'Recherche d\'adresse',
    'tour.search_text':
      'Recherchez n\'importe quelle adresse suisse pour voir sa vue 3D. Essayez des rues, des villes ou des points de repère.',
    'tour.views_title': 'Angles de vue',
    'tour.views_text':
      'Basculez entre les vues nord, est, sud et ouest pour analyser différents aspects du lieu.',
    'tour.export_title': 'Exporter les vues',
    'tour.export_text':
      'Enregistrez la vue actuelle en image haute qualité pour documentation ou partage.',
    'tour.around_title': 'Vue panoramique',
    'tour.around_text':
      'Créez une rotation fluide à 360° autour de votre point d\'intérêt. Utilisez les commandes de zoom pour ajuster la distance.',
    'tour.settings_title': 'Réglages avancés',
    'tour.settings_text':
      'Personnalisez votre expérience avec le mode HDR, l\'enregistrement vidéo, les infos caméra et les ombres.',
    'tour.navigation_title': 'Navigation à la souris',
    'tour.navigation_text':
      'Clic gauche pour déplacer, clic droit pour pivoter, molette pour zoomer. Des contrôles à l\'écran sont aussi disponibles.',

    // ---------- auth ----------
    'auth.sign_in': 'Se connecter',
    'auth.sign_out': 'Se déconnecter',
    'auth.account': 'Compte',
    'auth.signed_in': 'Connecté',
    'auth.view_profile': 'Voir le profil',
    'auth.status_active': 'Actif',
    'auth.avatar_alt': 'Avatar',
    'auth.profile_avatar_alt': 'Avatar du profil',
    'auth.profile_pick_avatar': 'Choisir un nouvel avatar',
    'auth.profile_field_gender': 'Genre',
    'auth.profile_gender_unspecified': 'Préfère ne pas le dire',
    'auth.profile_gender_female': 'Femme',
    'auth.profile_gender_male': 'Homme',
    'auth.profile_gender_other': 'Autre',
    'auth.profile_field_age': 'Âge',
    'auth.profile_field_bio': 'À propos de vous',
    'auth.profile_bio_placeholder': 'Ce que vous souhaitez partager',
    'auth.profile_cancel': 'Annuler',
    'auth.profile_save': 'Enregistrer',
    'auth.profile_loading': 'Chargement…',
    'auth.profile_saving': 'Enregistrement…',
    'auth.profile_saved': 'Profil enregistré.',
    'auth.profile_save_failed':
      'Échec de l\'enregistrement du profil. Réessayez.',
    'auth.profile_load_failed':
      'Profil non chargé. Vous pouvez en créer un.',

    // ---------- building info panel ----------
    'building.dialog_label': 'Détails du bâtiment',
    'building.close_panel': 'Fermer le panneau',
    'building.fallback_name': 'Bâtiment',
    'building.id_prefix': 'ID {id}',
    'building.source_swisstlm': 'SwissTLM3D',
    'building.source_osm': 'OSM Buildings',
    'building.source_generic': 'Bâtiment',
    'building.tile_volume': 'Volume',
    'building.tile_height': 'Hauteur',
    'building.tile_footprint': 'Emprise',
    'building.tile_estimated': '~est.',
    'building.unit_m3': 'm³',
    'building.unit_m': 'm',
    'building.unit_m2': 'm²',
    'building.profile_title': 'Profil 3D',
    'building.bar_volume': 'Volume',
    'building.bar_height': 'Hauteur',
    'building.bar_footprint': 'Emprise',
    'building.roof_label': 'Forme du toit :',
    'building.bucket_small': 'Petit',
    'building.bucket_medium': 'Moyen',
    'building.bucket_large': 'Grand',
    'building.bucket_xlarge': 'Très grand',
    'building.bucket_low_rise': 'Bas',
    'building.bucket_mid_rise': 'Moyen',
    'building.bucket_high_rise': 'Haut',
    'building.bucket_tower': 'Tour',
    'building.roof_flat': 'Plat',
    'building.roof_pitched': 'En pente',
    'building.roof_unknown': 'Inconnu',
    'building.solar_title': 'Ensoleillement',
    'building.solar_summary':
      '{hours} h au soleil · {percent} % de la journée',
    'building.props_toggle': 'Propriétés ({count})',
    'building.label_residential': 'Résidentiel',
    'building.label_mixed_use': 'Mixte',
    'building.label_industrial': 'Industriel',
    'building.label_office': 'Bureau',
    'building.label_public': 'Public',
    'building.label_religious': 'Religieux',
    'building.label_apartments': 'Appartements',
    'building.label_commercial': 'Commercial',
    'building.label_retail': 'Commerce',
    'building.label_school': 'École',

    // ---------- comparison sidebar ----------
    'comparison.eyebrow': 'Parcelle cible',
    'comparison.title': 'Bâtiments comparables',
    'comparison.close': 'Fermer la comparaison',
    'comparison.target_empty': 'Sélectionnez un bâtiment sur la carte pour charger les comparables.',
    'comparison.metric_municipality': 'Commune',
    'comparison.metric_zoning': 'Zonage',
    'comparison.metric_egrid': 'EGRID',
    'comparison.metric_parcel_size': 'Surface parcelle',
    'comparison.metric_parcel_size_short': 'Parcelle',
    'comparison.metric_volume': 'Volume',
    'comparison.metric_volume_short': 'Volume',
    'comparison.metric_footprint': 'Emprise',
    'comparison.metric_height': 'Hauteur',
    'comparison.metric_floors': 'Étages',
    'comparison.metric_year': 'Construit',
    'comparison.metric_ratiov': 'ratioV',
    'comparison.metric_similarity_short': 'Sim.',
    'comparison.filters_title': 'Filtres',
    'comparison.years_window': 'Fenêtre d\'années',
    'comparison.years_suffix': 'ans',
    'comparison.parcel_size_range': 'Plage de surface parcelle (m²)',
    'comparison.parcel_size_from': 'De',
    'comparison.parcel_size_to': 'À',
    'comparison.list_title': 'Comparables',
    'comparison.sort_by': 'Trier',
    'comparison.sort_similarity': 'Par similarité',
    'comparison.sort_ratioV': 'Par ratioV (déc.)',
    'comparison.sort_size': 'Par surface parcelle',
    'comparison.sort_year': 'Par année (récents)',
    'comparison.status_loading': 'Chargement des comparables…',
    'comparison.status_empty': 'Aucun bâtiment comparable pour cette parcelle. Essayez d\'élargir la fenêtre d\'années.',
    'comparison.status_error': 'Impossible de charger les comparables. Réessayez plus tard.',
    'comparison.card_aria': 'Parcelle comparable {egrid}',
    'comparison.meta_mock': 'Données démo',
    'comparison.meta_live': 'En direct',
    'comparison.meta_gwr_month': 'GWR {month}',
    'comparison.unit_m2': 'm²',
    'comparison.unit_m3': 'm³',
    'comparison.unit_m': 'm',

    // ---------- release notes panel ----------
    'release_notes.aria_label': 'Notes de version',
    'release_notes.title': 'Quoi de neuf dans',
    'release_notes.subtitle':
      'Chaque changement publié, groupé par version. Dernière version {version} · {codename} · {date}.',
    'release_notes.live': 'en ligne',
    'release_notes.releases_count': '{count} versions',
    'release_notes.changes_count': '{count} changements',
    'release_notes.view_all_prs': 'Voir toutes les PR',
    'release_notes.search_placeholder':
      'Rechercher des changements, versions ou numéros de PR… ( / pour focus)',
    'release_notes.filter_all': 'Tous',
    'release_notes.kind_new': 'Nouveau',
    'release_notes.kind_improved': 'Amélioré',
    'release_notes.kind_fixed': 'Corrigé',
    'release_notes.kind_docs': 'Docs',
    'release_notes.empty': 'Aucun changement ne correspond à ce filtre.',
    'release_notes.latest_badge': 'Dernier',
    'release_notes.change_one': 'changement',
    'release_notes.change_many': 'changements',
    'release_notes.footer':
      'Les versions suivent SemVer. L\'historique est reconstruit depuis les pull requests fusionnées.',
    'release_notes.close_label': 'Fermer',
    'release_notes.whats_new_aria': 'Quoi de neuf — v{version}',
    'release_notes.pr_title': 'Pull request n°{n}',

    // ---------- errors ----------
    'error.cesium_missing':
      'Cesium n\'est pas chargé. Veuillez vérifier votre connexion réseau.',
    'error.viewer_load': 'Erreur de chargement de la vue 3D : {message}',
    'error.geocode_failed': 'Échec du géocodage',

    // ---------- camera monitor ----------
    'camera.address': 'Adresse',
    'camera.position': 'Position',
    'camera.longitude': 'Longitude',
    'camera.latitude': 'Latitude',
    'camera.height_above_terrain': 'Hauteur au-dessus du terrain',
    'camera.terrain_height': 'Altitude du terrain',
    'camera.orientation': 'Orientation',
    'camera.heading': 'Cap',
    'camera.pitch': 'Inclinaison',
    'camera.roll': 'Roulis',
  },

  de: {
    // ---------- common ----------
    'common.loading': 'Wird geladen…',
    'common.close': 'Schliessen',
    'common.cancel': 'Abbrechen',
    'common.save': 'Speichern',
    'common.dash': '—',
    'common.unknown': 'Unbekannt',
    'common.on': 'Ein',
    'common.off': 'Aus',
    'common.dismiss': 'Schliessen',
    'common.refresh': 'Aktualisieren',
    'common.try_again': 'Erneut versuchen',
    'common.delete': 'Löschen',
    'common.open': 'Öffnen',

    // ---------- meta ----------
    'meta.title': 'similoo-three - 3D Vergleichbare Gebäude',
    'meta.description':
      'Adresse eingeben und das Gebäude samt 100 m Umgebung in 3D mit Three.js sehen, plus vergleichbare Gebäude aus der ganzen Schweiz.',
    'meta.og_title': 'similoo-three — 3D ab Adresse',
    'meta.og_description':
      'Adresse eingeben und das Gebäude samt 100 m Umgebung in 3D mit Three.js sehen, plus vergleichbare Gebäude aus der ganzen Schweiz.',
    'meta.og_image_alt': 'similoo-three — 3D ab Adresse',
    'meta.twitter_title': 'similoo-three — 3D ab Adresse',
    'meta.twitter_description':
      'Three.js-3D-Viewer einer Schweizer Adresse samt 100 m Umgebung.',
    'meta.twitter_image_alt': 'similoo-three — 3D ab Adresse',

    // ---------- landing ----------
    'landing.title': 'Geben Sie eine Schweizer Adresse ein.',
    'landing.subtitle':
      'Wir rendern das Gebäude und 100 m drumherum live in 3D, plus vergleichbare Gebäude aus der ganzen Schweiz.',
    'landing.search_placeholder': 'z. B. Bahnhofstrasse 10, Zürich',
    'landing.search_aria': 'Schweizer Adresse suchen',
    'landing.hint': 'Wählen Sie einen Treffer, um die 3D-Szene zu laden.',

    // ---------- scene ----------
    'scene.back': 'Neu suchen',
    'scene.loading': '3D-Szene wird geladen…',
    'scene.compass_n': 'N',
    'scene.compass_e': 'O',
    'scene.compass_s': 'S',
    'scene.compass_w': 'W',
    'scene.compass_aria': 'Ansicht nach Norden ausrichten',
    'scene_info.eyebrow': 'Gebäude',
    'scene_info.close': 'Schliessen',
    'scene_info.unknown': 'Unbekanntes Gebäude',
    'scene_info.empty': 'Keine Metadaten für dieses Gebäude verfügbar.',
    'scene_info.address': 'Adresse',
    'scene_info.gwr_id': 'GWR-ID',
    'scene_info.res_id': 'RES-ID',
    'scene_info.const_year': 'Baujahr',
    'scene_info.floors': 'Geschosse',
    'scene_info.height': 'Höhe',
    'scene_info.height_p95': 'Höhe (P95)',
    'scene_info.volume': 'Volumen',
    'scene_info.footprint': 'Grundfläche',
    'scene_info.distance': 'Abstand zur Mitte',
    'scene.layers_aria': 'Ebenen der Szene',
    'scene.layer_vegetation': 'Vegetation',
    'scene.sun_aria': 'Sonnenstand',
    'scene.sun_now': 'Jetzt',
    'scene.sun_now_aria': 'Auf aktuelle Zeit zurücksetzen',
    'scene.sun_date_aria': 'Datum',
    'scene.sun_time_aria': 'Tageszeit',
    'scene.sun_below_horizon': 'Unter Horizont',
    'scene.retry': 'Erneut versuchen',
    'scene.error_load': '3D-Szene konnte nicht geladen werden.',
    'scene.canvas_aria': '3D-Ansicht der gewählten Schweizer Adresse: Gelände, Gebäude und Nachbargebäude mit Schatten gerendert.',
    'save_parcel.idle': 'Parzelle verfolgen',
    'save_parcel.saving': 'Speichern…',
    'save_parcel.saved': 'Verfolgt',
    'save_parcel.sign_in': 'Zum Speichern anmelden',
    'save_parcel.error': 'Erneut versuchen',

    // ---------- nav ----------
    'nav.logo_subtitle': '3D ab Adresse',
    'nav.search_placeholder': 'Schweizer Adresse suchen…',
    'nav.search_aria': 'Adresse suchen',
    'nav.select_language': 'Sprache wählen',
    'nav.theme_to_dark': 'Zum dunklen Modus wechseln',
    'nav.theme_to_light': 'Zum hellen Modus wechseln',
    'nav.theme_toggle': 'Dunkelmodus umschalten',
    'nav.skip_to_content': 'Zum Inhalt springen',

    // ---------- views dropdown ----------
    'views.button': 'Ansichten',
    'views.from_north': 'Ansicht von Norden',
    'views.from_east': 'Ansicht von Osten',
    'views.from_south': 'Ansicht von Süden',
    'views.from_west': 'Ansicht von Westen',

    // ---------- sun cycle ----------
    'sun.button': '24-Stunden-Sonnenzyklus',
    'sun.stop': 'Stopp',
    'sun.label_24hrs': '24 Std',

    // ---------- settings ----------
    'settings.button': 'Einstellungen',
    'settings.display_section': 'Anzeige',
    'settings.set_date': 'Datum festlegen:',
    'settings.hdr_mode': 'HDR-Modus',
    'settings.show_shadows': 'Schatten anzeigen',
    'settings.swiss_layers': '3D-Gebäude swisstopo offiziell + Gelände',
    'settings.osm_layers': '3D OSM + Cesium-Gelände',
    'settings.google_layers': 'Google fotorealistisches 3D',
    'settings.buildings_min_zoom': '3D-Gebäude ab Zoom',
    'settings.tools_section': 'Werkzeuge',
    'settings.autosave_tours': 'Touren automatisch speichern',
    'settings.camera_info': 'Kamerainfo anzeigen',
    'settings.allow_gps': 'GPS erlauben',
    'settings.osm_token_missing': 'VITE_CESIUM_ION_TOKEN ist nicht konfiguriert',
    'settings.osm_token_hint':
      'VITE_CESIUM_ION_TOKEN setzen, um zu aktivieren',
    'settings.osm_load_failed':
      'OSM-Buildings-Tileset konnte nicht geladen werden (Cesium-Ion-Kontingent / Netzwerk)',
    'settings.osm_load_failed_hint': 'Cesium-Ion-Anfrage fehlgeschlagen',
    'settings.google_key_missing':
      'VITE_GOOGLE_MAPS_API_KEY ist nicht konfiguriert',
    'settings.google_key_hint':
      'VITE_GOOGLE_MAPS_API_KEY setzen, um zu aktivieren',

    // ---------- basemap selector ----------
    'basemap.choose': 'Basiskarte wählen',
    'basemap.satellite': 'Satellit',
    'basemap.hillshade': 'Reliefschattierung',

    // ---------- floating dock ----------
    'dock.toolbar_label': 'Kartenaktionen',
    'dock.export': 'Ansicht exportieren',
    'dock.around': '360°-Orbit',
    'dock.around_stop': 'Stopp',
    'dock.record': 'Aufnehmen',
    'dock.record_stop': 'Stopp',
    'dock.tour': 'Geführte Tour',

    // ---------- screenshot ----------
    'screenshot.save': 'Bild speichern',
    'screenshot.my_exports': 'Meine Exporte',
    'screenshot.creating': 'Bild wird erstellt.',
    'screenshot.saved': 'Bild gespeichert',
    'screenshot.view_image': 'Bild ansehen',
    'screenshot.failed': 'Bild konnte nicht gespeichert werden',

    // ---------- gallery ----------
    'gallery.title': 'Meine Exporte',
    'gallery.refresh': 'Aktualisieren',
    'gallery.close': 'Schliessen',
    'gallery.empty_title': 'Noch keine Bilder gespeichert',
    'gallery.empty_hint':
      'Mit dem Kamera-Knopf in der Navigationsleiste die aktuelle Ansicht erfassen und speichern.',
    'gallery.see_in_showroom':
      'Alle Veröffentlichungen im Showroom ansehen',
    'gallery.footer_cta':
      'Letzte {visible} von {total} angezeigt. {hidden} weitere im Showroom verfügbar.',
    'gallery.open': 'Öffnen',
    'gallery.delete': 'Löschen',
    'gallery.delete_confirm':
      'Dieses gespeicherte Bild löschen? Das kann nicht rückgängig gemacht werden.',
    'gallery.delete_failed': 'Bild konnte nicht gelöscht werden',
    'gallery.load_failed': 'Bilder konnten nicht geladen werden',
    'gallery.preview_close': 'Vorschau schliessen',
    'gallery.dismiss': 'Schliessen',
    'gallery.col_app': 'App',
    'gallery.col_saved': 'Gespeichert',
    'gallery.col_dimensions': 'Abmessungen',
    'gallery.col_size': 'Grösse',
    'gallery.col_address': 'Adresse',
    'gallery.col_center': 'Mitte',
    'gallery.col_parcel_id': 'Parzellen-ID',
    'gallery.col_tilt': 'Neigung',
    'gallery.col_bearing': 'Richtung',
    'gallery.col_zoom': 'Zoom',
    'gallery.col_basemap': 'Basiskarte',
    'gallery.col_3d_mode': '3D-Modus',
    'gallery.tilt_value': 'Neigung {value}',
    'gallery.additional_metadata': 'Zusätzliche Metadaten',

    // ---------- tour ----------
    'tour.skip': 'Überspringen',
    'tour.next': 'Weiter',
    'tour.back': 'Zurück',
    'tour.welcome_title': 'Willkommen bei similoo',
    'tour.welcome_text':
      'Wir zeigen Ihnen die wichtigsten Funktionen dieses 3D-Quartiersbetrachters.',
    'tour.search_title': 'Adresssuche',
    'tour.search_text':
      'Suchen Sie eine beliebige Schweizer Adresse, um ihre 3D-Ansicht zu sehen. Probieren Sie Strassennamen, Städte oder Wahrzeichen.',
    'tour.views_title': 'Blickwinkel',
    'tour.views_text':
      'Wechseln Sie zwischen Nord-, Ost-, Süd- und Westansicht, um verschiedene Aspekte des Ortes zu analysieren.',
    'tour.export_title': 'Ansichten exportieren',
    'tour.export_text':
      'Speichern Sie die aktuelle Ansicht als hochauflösendes Bild zur Dokumentation oder zum Teilen.',
    'tour.around_title': 'Rundumblick',
    'tour.around_text':
      'Erzeugen Sie eine sanfte 360°-Drehung um Ihren Interessenspunkt. Mit den Zoom-Steuerungen passen Sie den Abstand an.',
    'tour.settings_title': 'Erweiterte Einstellungen',
    'tour.settings_text':
      'Passen Sie HDR-Modus, Videoaufnahme, Kamerainfo und Schatten an.',
    'tour.navigation_title': 'Mausnavigation',
    'tour.navigation_text':
      'Linksklick zum Schwenken, Rechtsklick zum Drehen, Mausrad zum Zoomen. Steuerungen am Bildschirm sind ebenfalls verfügbar.',

    // ---------- auth ----------
    'auth.sign_in': 'Anmelden',
    'auth.sign_out': 'Abmelden',
    'auth.account': 'Konto',
    'auth.signed_in': 'Angemeldet',
    'auth.view_profile': 'Profil anzeigen',
    'auth.status_active': 'Aktiv',
    'auth.avatar_alt': 'Avatar',
    'auth.profile_avatar_alt': 'Profilavatar',
    'auth.profile_pick_avatar': 'Neuen Avatar wählen',
    'auth.profile_field_gender': 'Geschlecht',
    'auth.profile_gender_unspecified': 'Keine Angabe',
    'auth.profile_gender_female': 'Weiblich',
    'auth.profile_gender_male': 'Männlich',
    'auth.profile_gender_other': 'Andere',
    'auth.profile_field_age': 'Alter',
    'auth.profile_field_bio': 'Über Sie',
    'auth.profile_bio_placeholder': 'Was Sie teilen möchten',
    'auth.profile_cancel': 'Abbrechen',
    'auth.profile_save': 'Speichern',
    'auth.profile_loading': 'Wird geladen…',
    'auth.profile_saving': 'Wird gespeichert…',
    'auth.profile_saved': 'Profil gespeichert.',
    'auth.profile_save_failed':
      'Profil konnte nicht gespeichert werden. Erneut versuchen.',
    'auth.profile_load_failed':
      'Profil konnte nicht geladen werden. Sie können trotzdem eines anlegen.',

    // ---------- building info panel ----------
    'building.dialog_label': 'Gebäudedetails',
    'building.close_panel': 'Panel schliessen',
    'building.fallback_name': 'Gebäude',
    'building.id_prefix': 'ID {id}',
    'building.source_swisstlm': 'SwissTLM3D',
    'building.source_osm': 'OSM Buildings',
    'building.source_generic': 'Gebäude',
    'building.tile_volume': 'Volumen',
    'building.tile_height': 'Höhe',
    'building.tile_footprint': 'Grundfläche',
    'building.tile_estimated': '~gesch.',
    'building.unit_m3': 'm³',
    'building.unit_m': 'm',
    'building.unit_m2': 'm²',
    'building.profile_title': '3D-Profil',
    'building.bar_volume': 'Volumen',
    'building.bar_height': 'Höhe',
    'building.bar_footprint': 'Grundfläche',
    'building.roof_label': 'Dachform:',
    'building.bucket_small': 'Klein',
    'building.bucket_medium': 'Mittel',
    'building.bucket_large': 'Gross',
    'building.bucket_xlarge': 'Sehr gross',
    'building.bucket_low_rise': 'Niedrig',
    'building.bucket_mid_rise': 'Mittelhoch',
    'building.bucket_high_rise': 'Hoch',
    'building.bucket_tower': 'Turm',
    'building.roof_flat': 'Flach',
    'building.roof_pitched': 'Geneigt',
    'building.roof_unknown': 'Unbekannt',
    'building.solar_title': 'Sonneneinstrahlung',
    'building.solar_summary':
      '{hours} h besonnt · {percent} % des Tageslichts',
    'building.props_toggle': 'Eigenschaften ({count})',
    'building.label_residential': 'Wohngebäude',
    'building.label_mixed_use': 'Gemischt',
    'building.label_industrial': 'Industrie',
    'building.label_office': 'Büro',
    'building.label_public': 'Öffentlich',
    'building.label_religious': 'Religiös',
    'building.label_apartments': 'Mehrfamilienhaus',
    'building.label_commercial': 'Gewerbe',
    'building.label_retail': 'Detailhandel',
    'building.label_school': 'Schule',

    // ---------- comparison sidebar ----------
    'comparison.eyebrow': 'Zielparzelle',
    'comparison.title': 'Vergleichbare Gebäude',
    'comparison.close': 'Vergleich schliessen',
    'comparison.target_empty': 'Wählen Sie ein Gebäude auf der Karte, um Vergleichbare zu laden.',
    'comparison.metric_municipality': 'Gemeinde',
    'comparison.metric_zoning': 'Zonierung',
    'comparison.metric_egrid': 'EGRID',
    'comparison.metric_parcel_size': 'Parzellenfläche',
    'comparison.metric_parcel_size_short': 'Parzelle',
    'comparison.metric_volume': 'Volumen',
    'comparison.metric_volume_short': 'Volumen',
    'comparison.metric_footprint': 'Grundfläche',
    'comparison.metric_height': 'Höhe',
    'comparison.metric_floors': 'Geschosse',
    'comparison.metric_year': 'Baujahr',
    'comparison.metric_ratiov': 'ratioV',
    'comparison.metric_similarity_short': 'Sim.',
    'comparison.filters_title': 'Filter',
    'comparison.years_window': 'Jahresfenster',
    'comparison.years_suffix': 'Jahre',
    'comparison.parcel_size_range': 'Parzellengrösse (m²)',
    'comparison.parcel_size_from': 'Von',
    'comparison.parcel_size_to': 'Bis',
    'comparison.list_title': 'Vergleichbare',
    'comparison.sort_by': 'Sortieren',
    'comparison.sort_similarity': 'Nach Ähnlichkeit',
    'comparison.sort_ratioV': 'Nach ratioV (abs.)',
    'comparison.sort_size': 'Nach Parzellengrösse',
    'comparison.sort_year': 'Nach Jahr (neu)',
    'comparison.status_loading': 'Vergleichbare werden geladen…',
    'comparison.status_empty': 'Noch keine vergleichbaren Gebäude für diese Parzelle. Jahresfenster erweitern.',
    'comparison.status_error': 'Vergleichbare konnten nicht geladen werden. Bitte später erneut versuchen.',
    'comparison.card_aria': 'Vergleichsparzelle {egrid}',
    'comparison.meta_mock': 'Demo-Daten',
    'comparison.meta_live': 'Live',
    'comparison.meta_gwr_month': 'GWR {month}',
    'comparison.unit_m2': 'm²',
    'comparison.unit_m3': 'm³',
    'comparison.unit_m': 'm',

    // ---------- release notes panel ----------
    'release_notes.aria_label': 'Versionshinweise',
    'release_notes.title': 'Neu in',
    'release_notes.subtitle':
      'Jede ausgelieferte Änderung, nach Version gruppiert. Aktuelle Version {version} · {codename} · {date}.',
    'release_notes.live': 'live',
    'release_notes.releases_count': '{count} Versionen',
    'release_notes.changes_count': '{count} Änderungen',
    'release_notes.view_all_prs': 'Alle PRs ansehen',
    'release_notes.search_placeholder':
      'Änderungen, Versionen oder PR-Nummern suchen… ( / zum Fokussieren)',
    'release_notes.filter_all': 'Alle',
    'release_notes.kind_new': 'Neu',
    'release_notes.kind_improved': 'Verbessert',
    'release_notes.kind_fixed': 'Behoben',
    'release_notes.kind_docs': 'Docs',
    'release_notes.empty': 'Keine Änderungen passen zu diesem Filter.',
    'release_notes.latest_badge': 'Aktuell',
    'release_notes.change_one': 'Änderung',
    'release_notes.change_many': 'Änderungen',
    'release_notes.footer':
      'Versionen folgen SemVer. Die Historie wird aus den fusionierten Pull Requests rekonstruiert.',
    'release_notes.close_label': 'Schliessen',
    'release_notes.whats_new_aria': 'Neu — v{version}',
    'release_notes.pr_title': 'Pull Request #{n}',

    // ---------- errors ----------
    'error.cesium_missing':
      'Cesium ist nicht geladen. Bitte Netzwerkverbindung prüfen.',
    'error.viewer_load': 'Fehler beim Laden der 3D-Ansicht: {message}',
    'error.geocode_failed': 'Geocoding fehlgeschlagen',

    // ---------- camera monitor ----------
    'camera.address': 'Adresse',
    'camera.position': 'Position',
    'camera.longitude': 'Längengrad',
    'camera.latitude': 'Breitengrad',
    'camera.height_above_terrain': 'Höhe über Gelände',
    'camera.terrain_height': 'Geländehöhe',
    'camera.orientation': 'Ausrichtung',
    'camera.heading': 'Kurs',
    'camera.pitch': 'Neigung',
    'camera.roll': 'Rollwinkel',
  },

  it: {
    // ---------- common ----------
    'common.loading': 'Caricamento…',
    'common.close': 'Chiudi',
    'common.cancel': 'Annulla',
    'common.save': 'Salva',
    'common.dash': '—',
    'common.unknown': 'Sconosciuto',
    'common.on': 'Attivo',
    'common.off': 'Disattivo',
    'common.dismiss': 'Chiudi',
    'common.refresh': 'Aggiorna',
    'common.try_again': 'Riprova',
    'common.delete': 'Elimina',
    'common.open': 'Apri',

    // ---------- meta ----------
    'meta.title':
      'similoo-three - 3D Edifici comparabili',
    'meta.description':
      'Digita un indirizzo, ottieni una vista 3D Three.js live dell\'edificio e dei suoi 100 m intorno, più edifici comparabili da tutta la Svizzera.',
    'meta.og_title': 'similoo-three — 3D dall\'indirizzo',
    'meta.og_description':
      'Digita un indirizzo, ottieni una vista 3D Three.js live dell\'edificio e dei suoi 100 m intorno, più edifici comparabili da tutta la Svizzera.',
    'meta.og_image_alt': 'similoo-three — 3D dall\'indirizzo',
    'meta.twitter_title': 'similoo-three — 3D dall\'indirizzo',
    'meta.twitter_description':
      'Visualizzatore Three.js 3D di un indirizzo svizzero con i suoi 100 m circostanti.',
    'meta.twitter_image_alt': 'similoo-three — 3D dall\'indirizzo',

    // ---------- landing ----------
    'landing.title': 'Digita un indirizzo svizzero.',
    'landing.subtitle':
      'Renderizziamo l\'edificio e 100 m intorno in 3D live, con edifici comparabili da tutta la Svizzera.',
    'landing.search_placeholder': 'es. Bahnhofstrasse 10, Zürich',
    'landing.search_aria': 'Cerca un indirizzo svizzero',
    'landing.hint': 'Seleziona un risultato per caricare la scena 3D.',

    // ---------- scene ----------
    'scene.back': 'Cerca di nuovo',
    'scene.loading': 'Caricamento scena 3D…',
    'scene.compass_n': 'N',
    'scene.compass_e': 'E',
    'scene.compass_s': 'S',
    'scene.compass_w': 'O',
    'scene.compass_aria': 'Allinea la vista verso nord',
    'scene_info.eyebrow': 'Edificio',
    'scene_info.close': 'Chiudi',
    'scene_info.unknown': 'Edificio sconosciuto',
    'scene_info.empty': 'Nessun metadato disponibile per questo edificio.',
    'scene_info.address': 'Indirizzo',
    'scene_info.gwr_id': 'ID RegEd',
    'scene_info.res_id': 'ID RES',
    'scene_info.const_year': 'Anno di costruzione',
    'scene_info.floors': 'Piani',
    'scene_info.height': 'Altezza',
    'scene_info.height_p95': 'Altezza (P95)',
    'scene_info.volume': 'Volume',
    'scene_info.footprint': 'Impronta',
    'scene_info.distance': 'Distanza dal centro',
    'scene.layers_aria': 'Livelli della scena',
    'scene.layer_vegetation': 'Vegetazione',
    'scene.sun_aria': 'Posizione del sole',
    'scene.sun_now': 'Adesso',
    'scene.sun_now_aria': 'Reimposta all\'ora attuale',
    'scene.sun_date_aria': 'Data',
    'scene.sun_time_aria': 'Ora del giorno',
    'scene.sun_below_horizon': 'Sotto l\'orizzonte',
    'scene.retry': 'Riprova',
    'scene.error_load': 'Impossibile caricare la scena 3D.',
    'scene.canvas_aria': 'Visualizzatore 3D dell\'indirizzo svizzero selezionato: terreno, edificio e edifici circostanti con ombre.',
    'save_parcel.idle': 'Segui la particella',
    'save_parcel.saving': 'Salvataggio…',
    'save_parcel.saved': 'Seguita',
    'save_parcel.sign_in': 'Accedi per salvare',
    'save_parcel.error': 'Riprova',

    // ---------- nav ----------
    'nav.logo_subtitle': '3D dall\'indirizzo',
    'nav.search_placeholder': 'Cerca un indirizzo svizzero…',
    'nav.search_aria': 'Cerca indirizzo',
    'nav.select_language': 'Seleziona la lingua',
    'nav.theme_to_dark': 'Passa al tema scuro',
    'nav.theme_to_light': 'Passa al tema chiaro',
    'nav.theme_toggle': 'Attiva/disattiva tema scuro',
    'nav.skip_to_content': 'Vai al contenuto',

    // ---------- views dropdown ----------
    'views.button': 'Viste',
    'views.from_north': 'Vista da nord',
    'views.from_east': 'Vista da est',
    'views.from_south': 'Vista da sud',
    'views.from_west': 'Vista da ovest',

    // ---------- sun cycle ----------
    'sun.button': 'Ciclo solare 24 ore',
    'sun.stop': 'Ferma',
    'sun.label_24hrs': '24 h',

    // ---------- settings ----------
    'settings.button': 'Impostazioni',
    'settings.display_section': 'Visualizzazione',
    'settings.set_date': 'Imposta data:',
    'settings.hdr_mode': 'Modalità HDR',
    'settings.show_shadows': 'Mostra ombre',
    'settings.swiss_layers': 'Edifici 3D swisstopo ufficiale + terreno',
    'settings.osm_layers': '3D OSM + terreno Cesium',
    'settings.google_layers': 'Google 3D fotorealistico',
    'settings.buildings_min_zoom': 'Edifici 3D da zoom',
    'settings.tools_section': 'Strumenti',
    'settings.autosave_tours': 'Salvataggio automatico dei tour',
    'settings.camera_info': 'Mostra informazioni camera',
    'settings.allow_gps': 'Consenti GPS',
    'settings.osm_token_missing': 'VITE_CESIUM_ION_TOKEN non configurato',
    'settings.osm_token_hint': 'Impostare VITE_CESIUM_ION_TOKEN per attivare',
    'settings.osm_load_failed':
      'Tileset OSM Buildings non caricato (quota Cesium Ion / rete)',
    'settings.osm_load_failed_hint': 'Richiesta Cesium Ion non riuscita',
    'settings.google_key_missing':
      'VITE_GOOGLE_MAPS_API_KEY non configurato',
    'settings.google_key_hint':
      'Impostare VITE_GOOGLE_MAPS_API_KEY per attivare',

    // ---------- basemap selector ----------
    'basemap.choose': 'Scegli mappa di base',
    'basemap.satellite': 'Satellite',
    'basemap.hillshade': 'Ombreggiatura',

    // ---------- floating dock ----------
    'dock.toolbar_label': 'Azioni mappa',
    'dock.export': 'Esporta vista',
    'dock.around': 'Orbita a 360°',
    'dock.around_stop': 'Ferma',
    'dock.record': 'Registra',
    'dock.record_stop': 'Ferma',
    'dock.tour': 'Visita guidata',

    // ---------- screenshot ----------
    'screenshot.save': 'Salva immagine',
    'screenshot.my_exports': 'I miei export',
    'screenshot.creating': 'Creazione immagine.',
    'screenshot.saved': 'Immagine salvata',
    'screenshot.view_image': 'Vedi immagine',
    'screenshot.failed': 'Salvataggio non riuscito',

    // ---------- gallery ----------
    'gallery.title': 'I miei export',
    'gallery.refresh': 'Aggiorna',
    'gallery.close': 'Chiudi',
    'gallery.empty_title': 'Nessuna immagine salvata',
    'gallery.empty_hint':
      'Usa il pulsante della fotocamera nella barra di navigazione per catturare e salvare la vista attuale.',
    'gallery.see_in_showroom': 'Vedi tutte le pubblicazioni in Showroom',
    'gallery.footer_cta':
      'Ultime {visible} di {total} mostrate. {hidden} altre disponibili in Showroom.',
    'gallery.open': 'Apri',
    'gallery.delete': 'Elimina',
    'gallery.delete_confirm':
      'Eliminare questa immagine salvata? Operazione irreversibile.',
    'gallery.delete_failed': 'Eliminazione non riuscita',
    'gallery.load_failed': 'Caricamento immagini non riuscito',
    'gallery.preview_close': 'Chiudi anteprima',
    'gallery.dismiss': 'Chiudi',
    'gallery.col_app': 'App',
    'gallery.col_saved': 'Salvato',
    'gallery.col_dimensions': 'Dimensioni',
    'gallery.col_size': 'Dimensione',
    'gallery.col_address': 'Indirizzo',
    'gallery.col_center': 'Centro',
    'gallery.col_parcel_id': 'ID parcella',
    'gallery.col_tilt': 'Inclinazione',
    'gallery.col_bearing': 'Direzione',
    'gallery.col_zoom': 'Zoom',
    'gallery.col_basemap': 'Mappa di base',
    'gallery.col_3d_mode': 'Modalità 3D',
    'gallery.tilt_value': 'Incl. {value}',
    'gallery.additional_metadata': 'Metadati aggiuntivi',

    // ---------- tour ----------
    'tour.skip': 'Salta',
    'tour.next': 'Avanti',
    'tour.back': 'Indietro',
    'tour.welcome_title': 'Benvenuto in similoo',
    'tour.welcome_text':
      'Ti mostriamo le funzioni essenziali di questo visualizzatore 3D di quartiere.',
    'tour.search_title': 'Ricerca indirizzo',
    'tour.search_text':
      'Cerca qualsiasi indirizzo svizzero per vederne la vista 3D. Prova nomi di strade, città o punti di riferimento.',
    'tour.views_title': 'Angoli di vista',
    'tour.views_text':
      'Passa fra vista nord, est, sud e ovest per analizzare diversi aspetti del luogo.',
    'tour.export_title': 'Esporta viste',
    'tour.export_text':
      'Salva la vista attuale come immagine di alta qualità per documentare o condividere.',
    'tour.around_title': 'Vista panoramica',
    'tour.around_text':
      'Crea una rotazione fluida di 360° attorno al punto di interesse. Usa i comandi di zoom per regolare la distanza.',
    'tour.settings_title': 'Impostazioni avanzate',
    'tour.settings_text':
      'Personalizza con modalità HDR, registrazione video, info camera e ombre.',
    'tour.navigation_title': 'Navigazione col mouse',
    'tour.navigation_text':
      'Clic sinistro per spostare, clic destro per ruotare, rotella per zoomare. Sono disponibili anche comandi a schermo.',

    // ---------- auth ----------
    'auth.sign_in': 'Accedi',
    'auth.sign_out': 'Esci',
    'auth.account': 'Account',
    'auth.signed_in': 'Connesso',
    'auth.view_profile': 'Vedi profilo',
    'auth.status_active': 'Attivo',
    'auth.avatar_alt': 'Avatar',
    'auth.profile_avatar_alt': 'Avatar del profilo',
    'auth.profile_pick_avatar': 'Scegli un nuovo avatar',
    'auth.profile_field_gender': 'Genere',
    'auth.profile_gender_unspecified': 'Preferisco non dirlo',
    'auth.profile_gender_female': 'Donna',
    'auth.profile_gender_male': 'Uomo',
    'auth.profile_gender_other': 'Altro',
    'auth.profile_field_age': 'Età',
    'auth.profile_field_bio': 'Su di te',
    'auth.profile_bio_placeholder': 'Cosa vuoi condividere',
    'auth.profile_cancel': 'Annulla',
    'auth.profile_save': 'Salva',
    'auth.profile_loading': 'Caricamento…',
    'auth.profile_saving': 'Salvataggio…',
    'auth.profile_saved': 'Profilo salvato.',
    'auth.profile_save_failed':
      'Impossibile salvare il profilo. Riprova.',
    'auth.profile_load_failed':
      'Impossibile caricare il profilo. Puoi comunque crearne uno.',

    // ---------- building info panel ----------
    'building.dialog_label': 'Dettagli edificio',
    'building.close_panel': 'Chiudi pannello',
    'building.fallback_name': 'Edificio',
    'building.id_prefix': 'ID {id}',
    'building.source_swisstlm': 'SwissTLM3D',
    'building.source_osm': 'OSM Buildings',
    'building.source_generic': 'Edificio',
    'building.tile_volume': 'Volume',
    'building.tile_height': 'Altezza',
    'building.tile_footprint': 'Impronta',
    'building.tile_estimated': '~stim.',
    'building.unit_m3': 'm³',
    'building.unit_m': 'm',
    'building.unit_m2': 'm²',
    'building.profile_title': 'Profilo 3D',
    'building.bar_volume': 'Volume',
    'building.bar_height': 'Altezza',
    'building.bar_footprint': 'Impronta',
    'building.roof_label': 'Forma del tetto:',
    'building.bucket_small': 'Piccolo',
    'building.bucket_medium': 'Medio',
    'building.bucket_large': 'Grande',
    'building.bucket_xlarge': 'Molto grande',
    'building.bucket_low_rise': 'Basso',
    'building.bucket_mid_rise': 'Medio',
    'building.bucket_high_rise': 'Alto',
    'building.bucket_tower': 'Torre',
    'building.roof_flat': 'Piatto',
    'building.roof_pitched': 'Inclinato',
    'building.roof_unknown': 'Sconosciuto',
    'building.solar_title': 'Esposizione solare',
    'building.solar_summary':
      '{hours} h al sole · {percent} % della luce diurna',
    'building.props_toggle': 'Proprietà ({count})',
    'building.label_residential': 'Residenziale',
    'building.label_mixed_use': 'Uso misto',
    'building.label_industrial': 'Industriale',
    'building.label_office': 'Ufficio',
    'building.label_public': 'Pubblico',
    'building.label_religious': 'Religioso',
    'building.label_apartments': 'Appartamenti',
    'building.label_commercial': 'Commerciale',
    'building.label_retail': 'Vendita al dettaglio',
    'building.label_school': 'Scuola',

    // ---------- comparison sidebar ----------
    'comparison.eyebrow': 'Particella di riferimento',
    'comparison.title': 'Edifici comparabili',
    'comparison.close': 'Chiudi confronto',
    'comparison.target_empty': 'Seleziona un edificio sulla mappa per caricare i comparabili.',
    'comparison.metric_municipality': 'Comune',
    'comparison.metric_zoning': 'Zonizzazione',
    'comparison.metric_egrid': 'EGRID',
    'comparison.metric_parcel_size': 'Superficie particella',
    'comparison.metric_parcel_size_short': 'Particella',
    'comparison.metric_volume': 'Volume',
    'comparison.metric_volume_short': 'Volume',
    'comparison.metric_footprint': 'Impronta',
    'comparison.metric_height': 'Altezza',
    'comparison.metric_floors': 'Piani',
    'comparison.metric_year': 'Anno',
    'comparison.metric_ratiov': 'ratioV',
    'comparison.metric_similarity_short': 'Sim.',
    'comparison.filters_title': 'Filtri',
    'comparison.years_window': 'Finestra di anni',
    'comparison.years_suffix': 'anni',
    'comparison.parcel_size_range': 'Intervallo superficie (m²)',
    'comparison.parcel_size_from': 'Da',
    'comparison.parcel_size_to': 'A',
    'comparison.list_title': 'Comparabili',
    'comparison.sort_by': 'Ordina',
    'comparison.sort_similarity': 'Per similarità',
    'comparison.sort_ratioV': 'Per ratioV (desc.)',
    'comparison.sort_size': 'Per superficie',
    'comparison.sort_year': 'Per anno (nuovi)',
    'comparison.status_loading': 'Caricamento comparabili…',
    'comparison.status_empty': 'Nessun edificio comparabile per questa particella. Allargare la finestra di anni.',
    'comparison.status_error': 'Impossibile caricare i comparabili. Riprova più tardi.',
    'comparison.card_aria': 'Particella comparabile {egrid}',
    'comparison.meta_mock': 'Dati demo',
    'comparison.meta_live': 'Live',
    'comparison.meta_gwr_month': 'GWR {month}',
    'comparison.unit_m2': 'm²',
    'comparison.unit_m3': 'm³',
    'comparison.unit_m': 'm',

    // ---------- release notes panel ----------
    'release_notes.aria_label': 'Note di rilascio',
    'release_notes.title': 'Novità in',
    'release_notes.subtitle':
      'Ogni cambiamento rilasciato, raggruppato per versione. Ultima versione {version} · {codename} · {date}.',
    'release_notes.live': 'live',
    'release_notes.releases_count': '{count} versioni',
    'release_notes.changes_count': '{count} modifiche',
    'release_notes.view_all_prs': 'Vedi tutte le PR',
    'release_notes.search_placeholder':
      'Cerca modifiche, versioni o numeri di PR… ( / per focus)',
    'release_notes.filter_all': 'Tutte',
    'release_notes.kind_new': 'Nuovo',
    'release_notes.kind_improved': 'Migliorato',
    'release_notes.kind_fixed': 'Corretto',
    'release_notes.kind_docs': 'Docs',
    'release_notes.empty': 'Nessuna modifica corrisponde a questo filtro.',
    'release_notes.latest_badge': 'Ultima',
    'release_notes.change_one': 'modifica',
    'release_notes.change_many': 'modifiche',
    'release_notes.footer':
      'Le versioni seguono SemVer. La cronologia è ricostruita dalle pull request fuse.',
    'release_notes.close_label': 'Chiudi',
    'release_notes.whats_new_aria': 'Novità — v{version}',
    'release_notes.pr_title': 'Pull request n. {n}',

    // ---------- errors ----------
    'error.cesium_missing':
      'Cesium non è caricato. Verifica la connessione di rete.',
    'error.viewer_load': 'Errore nel caricamento della vista 3D: {message}',
    'error.geocode_failed': 'Geocoding non riuscito',

    // ---------- camera monitor ----------
    'camera.address': 'Indirizzo',
    'camera.position': 'Posizione',
    'camera.longitude': 'Longitudine',
    'camera.latitude': 'Latitudine',
    'camera.height_above_terrain': 'Altezza sopra il terreno',
    'camera.terrain_height': 'Altitudine del terreno',
    'camera.orientation': 'Orientamento',
    'camera.heading': 'Direzione',
    'camera.pitch': 'Inclinazione',
    'camera.roll': 'Rollio',
  },
};

// ---------- runtime --------------------------------------------------

function detectInitialLocale() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LOCALES.includes(stored)) return stored;
  } catch {
    /* localStorage may be disabled — fall through */
  }
  try {
    const nav = (navigator.language || '').slice(0, 2).toLowerCase();
    if (SUPPORTED_LOCALES.includes(nav)) return nav;
  } catch {
    /* SSR / non-browser — fall through */
  }
  return 'en';
}

let currentLocale = detectInitialLocale();

// Also register our catalog with the suite-shared i18n engine so
// shared vanilla modules (e.g. the auth nav from
// @aireon/shared/cesium-app/auth) resolve to our translations
// instead of falling back to keys-as-strings.
try {
    registerI18n({
        catalog: translations,
        storageKey: STORAGE_KEY,
        supportedLocales: SUPPORTED_LOCALES,
    });
} catch (err) {
    console.warn('shared i18n registration failed', err);
}

export function getLocale() {
  return currentLocale;
}

function interpolate(str, params) {
  if (!params || typeof str !== 'string') return str;
  return str.replace(/\{(\w+)\}/g, (m, key) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : m
  );
}

/**
 * Look up a key in the active locale, falling back to en, then to the key
 * itself. Optional `{placeholder}` interpolation via the second argument.
 */
export function t(key, params) {
  const table = translations[currentLocale] || translations.en;
  const raw =
    table[key] != null
      ? table[key]
      : translations.en[key] != null
        ? translations.en[key]
        : key;
  return interpolate(raw, params);
}

/**
 * Sweep the DOM under `root` and rewrite every element bearing
 *   [data-i18n="key"]                 — sets textContent (or innerHTML
 *                                       if [data-i18n-html] is present).
 *   [data-i18n-attr="attr:key,..."]   — sets each named attribute.
 *
 * Also keeps <html lang> aligned with the active locale.
 */
export function applyTranslations(root = document) {
  const els = root.querySelectorAll('[data-i18n]');
  els.forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (!key) return;
    const value = t(key);
    if (el.hasAttribute('data-i18n-html')) {
      el.innerHTML = value;
    } else {
      el.textContent = value;
    }
  });

  const attrEls = root.querySelectorAll('[data-i18n-attr]');
  attrEls.forEach((el) => {
    const spec = el.getAttribute('data-i18n-attr');
    if (!spec) return;
    spec.split(',').forEach((pair) => {
      const [attr, key] = pair.split(':').map((s) => s && s.trim());
      if (!attr || !key) return;
      el.setAttribute(attr, t(key));
    });
  });

  if (root === document || root === document.documentElement) {
    document.documentElement.lang = currentLocale;
  }
}

/**
 * Set the active locale. Persists to localStorage, sweeps the DOM, and
 * notifies subscribers. No-op if the locale is unsupported or unchanged.
 */
export function setLocale(locale) {
  if (!SUPPORTED_LOCALES.includes(locale)) return;
  if (locale === currentLocale) return;
  currentLocale = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* private mode — choice is just session-scoped */
  }
  document.documentElement.lang = locale;
  applyTranslations(document);
  // Mirror the change into the suite-shared engine so shared modules
  // (auth nav, profile modal) re-render in the new language.
  try { setSharedLocale(locale); } catch {}
  subscribers.forEach((cb) => {
    try {
      cb(locale);
    } catch (err) {
      console.error('Locale subscriber error:', err);
    }
  });
}

/**
 * Subscribe to locale changes — used by JS-rendered fragments that need to
 * re-render their own DOM when the language switches (the static DOM sweep
 * cannot reach into innerHTML written after the sweep happened).
 *
 * Returns an unsubscribe function.
 */
export function onLocaleChange(callback) {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

/**
 * Wire up a <select> element to act as the locale switcher.
 * Sets its initial value, adds the change listener. Idempotent-safe.
 */
export function bindLocaleSelect(elementOrId) {
  const sel =
    typeof elementOrId === 'string'
      ? document.getElementById(elementOrId)
      : elementOrId;
  if (!sel) return;
  sel.value = currentLocale;
  sel.addEventListener('change', (e) => setLocale(e.target.value));
  onLocaleChange((locale) => {
    if (sel.value !== locale) sel.value = locale;
  });
}
