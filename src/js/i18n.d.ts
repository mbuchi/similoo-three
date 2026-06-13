// Type boundary for the preserved vanilla i18n engine (i18n.js), used by the
// React shell (Navbar.tsx). Keeps the shell strictly typed without converting
// the 1.6k-line engine.

export type Locale = 'en' | 'fr' | 'de' | 'it';

export const SUPPORTED_LOCALES: Locale[];
export function getLocale(): Locale;
export function setLocale(locale: Locale): void;
export function t(key: string, params?: Record<string, unknown>): string;
export function applyTranslations(root?: Document | Element): void;
export function onLocaleChange(callback: (locale: Locale) => void): () => void;
export function bindLocaleSelect(elementOrId: string | HTMLSelectElement): void;
