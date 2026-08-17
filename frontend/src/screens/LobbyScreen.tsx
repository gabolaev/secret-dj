import { useState } from 'react';
import { LIMITS, type GameView } from '@secret-dj/common';
import type { SecretDj } from '../hooks/useSecretDj';
import { UrlField } from '../components/UrlField';
import { TrackList } from '../components/TrackList';
import { Window } from '../components/Window';
import { useT } from '../i18n';

interface LobbyScreenProps {
    view: GameView;
    game: SecretDj;
}

export function LobbyScreen({ view, game }: LobbyScreenProps) {
    const t = useT();
    const [url, setUrl] = useState('');
    const [busy, setBusy] = useState(false);

    const { tracksPerPlayer, tracksPlayedPerPlayer, guessingEnabled } = view.settings;
    const mine = view.you.tracks;
    const remaining = Math.max(0, tracksPerPlayer - mine.length);
    const isHost = view.you.isHost;

    const active = view.players.filter(player => player.presence !== 'left');
    const waitingOn = active.filter(player => !player.ready);
    const enoughPlayers = !guessingEnabled || active.length >= 2;
    const canStart = isHost && waitingOn.length === 0 && enoughPlayers;

    const submit = async () => {
        if (!url.trim() || busy) return;
        setBusy(true);
        const result = await game.addTrack(url.trim());
        setBusy(false);
        if (result.ok) setUrl('');
    };

    return (
        <div className="stage">
            <Window title={t.lobby.title}>
                <header className="stage__head">
                    <h2 className="stage__title">{remaining > 0 ? t.lobby.queueMore(remaining) : t.lobby.setReady}</h2>
                    <p className="stage__sub">
                        {remaining > 0
                            ? t.lobby.hintSecret
                            : waitingOn.length > 0
                              ? t.lobby.hintWaiting(waitingOn.map(player => player.name).join(', '))
                              : isHost
                                ? t.lobby.hintHostCanStart
                                : t.lobby.hintWaitingForHost}
                    </p>
                </header>

                {remaining > 0 && (
                    <div className="rack rack--stack">
                        <UrlField value={url} onChange={setUrl} onSubmit={() => void submit()} busy={busy} />
                    </div>
                )}

                <div className="rack rack--stack">
                    <span className="label">
                        {t.roster.yourQueue}
                        <span className="label__count">
                            {mine.length}/{tracksPerPlayer}
                        </span>
                        {remaining === 0 && <span className="label__count">· {t.lobby.willPlay(tracksPlayedPerPlayer)}</span>}
                    </span>
                    <TrackList
                        tracks={mine}
                        onRemove={trackId => void game.removeTrack(trackId)}
                        emptyMessage={t.lobby.emptyQueue}
                    />
                </div>
            </Window>

            {isHost && (
                <Window title={t.lobby.settings}>
                    <div className="setting">
                        <div>
                            <span className="setting__name">{t.lobby.tracksQueued}</span>
                            <span className="setting__hint">{t.lobby.tracksQueuedHint}</span>
                        </div>
                        <Stepper
                            value={tracksPerPlayer}
                            min={LIMITS.tracksPerPlayerMin}
                            max={LIMITS.tracksPerPlayerMax}
                            decreaseLabel={t.lobby.fewer}
                            increaseLabel={t.lobby.more}
                            onChange={next => void game.updateSettings({ tracksPerPlayer: next })}
                        />
                    </div>

                    <div className="setting">
                        <div>
                            <span className="setting__name">{t.lobby.tracksPlayed}</span>
                            <span className="setting__hint">
                                {t.lobby.tracksPlayedHint(active.length * tracksPlayedPerPlayer)}
                            </span>
                        </div>
                        <Stepper
                            value={tracksPlayedPerPlayer}
                            min={1}
                            max={tracksPerPlayer}
                            decreaseLabel={t.lobby.fewer}
                            increaseLabel={t.lobby.more}
                            onChange={next => void game.updateSettings({ tracksPlayedPerPlayer: next })}
                        />
                    </div>

                    <div className="setting">
                        <div>
                            <span className="setting__name">{t.lobby.guessing}</span>
                            <span className="setting__hint">
                                {guessingEnabled ? t.lobby.guessingOn : t.lobby.guessingOff}
                            </span>
                        </div>
                        <button
                            type="button"
                            className={`toggle${guessingEnabled ? ' toggle--on' : ''}`}
                            role="switch"
                            aria-checked={guessingEnabled}
                            aria-label={t.lobby.guessing}
                            onClick={() => void game.updateSettings({ guessingEnabled: !guessingEnabled })}
                        >
                            <span className="toggle__thumb" />
                        </button>
                    </div>
                </Window>
            )}

            {isHost && (
                <div className="cta">
                    <button
                        type="button"
                        className="button button--primary button--lg button--block"
                        onClick={() => void game.startGame()}
                        disabled={!canStart}
                    >
                        {t.lobby.start}
                    </button>
                    {!enoughPlayers && <p className="muted">{t.lobby.needTwo}</p>}
                    {enoughPlayers && waitingOn.length > 0 && (
                        <p className="muted">{t.lobby.stillQueueing(waitingOn.map(player => player.name).join(', '))}</p>
                    )}
                </div>
            )}
        </div>
    );
}

interface StepperProps {
    value: number;
    min: number;
    max: number;
    decreaseLabel: string;
    increaseLabel: string;
    onChange: (next: number) => void;
}

function Stepper({ value, min, max, decreaseLabel, increaseLabel, onChange }: StepperProps) {
    return (
        <div className="stepper">
            <button type="button" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={decreaseLabel}>
                −
            </button>
            <span className="stepper__value">{value}</span>
            <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={increaseLabel}>
                +
            </button>
        </div>
    );
}
