import { useEffect, useState, type FormEvent } from 'react';
import { LIMITS } from '@secret-dj/common';
import { gameCodeFromLocation, loadRememberedName } from '../lib/session';
import { Spinner } from '../components/Spinner';
import { LocaleToggle } from '../components/LocaleToggle';
import { Window } from '../components/Window';
import { Logo } from '../components/Logo';
import { useT } from '../i18n';

interface JoinScreenProps {
    connection: 'connecting' | 'online' | 'offline';
    onCreate: (name: string) => Promise<{ ok: boolean; message?: string }>;
    onJoin: (gameId: string, name: string) => Promise<{ ok: boolean; message?: string }>;
    onShowRules: () => void;
}

export function JoinScreen({ connection, onCreate, onJoin, onShowRules }: JoinScreenProps) {
    const t = useT();
    const [name, setName] = useState(loadRememberedName);
    const [code, setCode] = useState(gameCodeFromLocation);
    const [busy, setBusy] = useState<'create' | 'join' | null>(null);
    const [error, setError] = useState<string | null>(null);

    // A shared link can land while the tab is already open.
    useEffect(() => {
        const onHashChange = () => setCode(gameCodeFromLocation());
        window.addEventListener('hashchange', onHashChange);
        return () => window.removeEventListener('hashchange', onHashChange);
    }, []);

    const trimmedName = name.trim();
    const nameOk = trimmedName.length >= LIMITS.nameMin && trimmedName.length <= LIMITS.nameMax;
    const offline = connection !== 'online';

    const run = async (intent: 'create' | 'join') => {
        if (!nameOk || busy || offline) return;
        setBusy(intent);
        setError(null);
        const result = intent === 'create' ? await onCreate(trimmedName) : await onJoin(code.trim(), trimmedName);
        // On success this screen unmounts; only failures need to be shown.
        if (!result.ok) {
            setError(result.message ?? t.join.genericError);
            setBusy(null);
        }
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        void run(code.trim() ? 'join' : 'create');
    };

    return (
        <div className="join">
            <Window title={`${t.brand.name}${t.brand.accent}`} className="join__win">
                <div className="join__hero">
                    <h1 className="join__logo">
                        <Logo size={54} />
                        <span className="visually-hidden">
                            {t.brand.name}
                            {t.brand.accent}
                        </span>
                    </h1>
                    <p className="join__tagline">{t.join.tagline}</p>
                </div>

                <form className="join__form" onSubmit={submit}>
                    <label className="field">
                        <span className="field__label">{t.join.nameLabel}</span>
                        <input
                            className="input"
                            value={name}
                            onChange={event => setName(event.target.value)}
                            placeholder={t.join.namePlaceholder}
                            maxLength={LIMITS.nameMax}
                            autoComplete="nickname"
                            autoFocus
                        />
                    </label>

                    <label className="field">
                        <span className="field__label">
                            {t.join.codeLabel} <span className="field__optional">{t.join.codeOptional}</span>
                        </span>
                        <input
                            className="input input--code"
                            value={code}
                            onChange={event => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                            placeholder={t.join.codePlaceholder}
                            maxLength={8}
                            autoComplete="off"
                            spellCheck={false}
                        />
                    </label>

                    <div className="join__actions">
                        <button
                            type="button"
                            className="button button--primary button--lg button--block"
                            onClick={() => void run('create')}
                            disabled={!nameOk || busy !== null || offline}
                        >
                            {busy === 'create' ? <Spinner /> : t.join.create}
                        </button>
                        <button
                            type="button"
                            className="button button--lg button--block"
                            onClick={() => void run('join')}
                            disabled={!nameOk || !code.trim() || busy !== null || offline}
                        >
                            {busy === 'join' ? <Spinner /> : t.join.join}
                        </button>
                    </div>
                </form>

                {error && <p className="join__error">{error}</p>}
                {offline && (
                    <p className="join__status">
                        <Spinner label={connection === 'connecting' ? t.join.connecting : t.join.reconnecting} />
                    </p>
                )}

                <div className="join__foot">
                    <button type="button" className="button button--ghost" onClick={onShowRules}>
                        {t.join.howItWorks}
                    </button>
                    <LocaleToggle />
                </div>
            </Window>

            <p className="join__services">{t.join.services}</p>
        </div>
    );
}
