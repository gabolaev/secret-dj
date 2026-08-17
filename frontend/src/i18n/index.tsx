import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { en, type Messages } from './en';
import { ru } from './ru';

export type Locale = 'en' | 'ru';

export const LOCALES: readonly Locale[] = ['en', 'ru'];

const CATALOGUES: Record<Locale, Messages> = { en, ru };
const STORAGE_KEY = 'secret-dj/locale';

function isLocale(value: unknown): value is Locale {
    return value === 'en' || value === 'ru';
}

/** Stored choice first, then the browser's preference, then English. */
export function detectLocale(): Locale {
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (isLocale(stored)) return stored;
    } catch {
        // Storage unavailable; fall through to the browser hint.
    }
    const languages = typeof navigator === 'undefined' ? [] : [navigator.language, ...(navigator.languages ?? [])];
    return languages.some(language => language?.toLowerCase().startsWith('ru')) ? 'ru' : 'en';
}

interface I18nValue {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: Messages;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>(detectLocale);

    // Keep the document in sync so screen readers, spellcheck and `:lang()`
    // rules all agree with what is on screen.
    useEffect(() => {
        document.documentElement.lang = locale;
    }, [locale]);

    const setLocale = useCallback((next: Locale) => {
        setLocaleState(next);
        try {
            window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // A session without persistence still switches; it just forgets.
        }
    }, []);

    const value = useMemo<I18nValue>(() => ({ locale, setLocale, t: CATALOGUES[locale] }), [locale, setLocale]);

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
    const value = useContext(I18nContext);
    if (!value) throw new Error('useI18n must be used inside <I18nProvider>');
    return value;
}

/** Shorthand for the common case of only needing the catalogue. */
export function useT(): Messages {
    return useI18n().t;
}

export type { Messages };
