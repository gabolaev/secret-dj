import { LOCALES, useI18n } from '../i18n';

interface LocaleToggleProps {
    compact?: boolean;
}

export function LocaleToggle({ compact }: LocaleToggleProps) {
    const { locale, setLocale, t } = useI18n();

    return (
        <div
            className={`locale${compact ? ' locale--compact' : ''}`}
            role="group"
            aria-label={t.locale.label}
        >
            {LOCALES.map(option => (
                <button
                    key={option}
                    type="button"
                    className={`locale__option${locale === option ? ' is-active' : ''}`}
                    aria-pressed={locale === option}
                    lang={option}
                    onClick={() => setLocale(option)}
                >
                    {t.locale[option]}
                </button>
            ))}
        </div>
    );
}
