import { useState } from 'react';
import { LIMITS, type GameView } from '@secret-dj/common';
import type { SecretDj } from '../hooks/useSecretDj';
import { ClaimPicker, spentClaims } from '../components/ClaimPicker';
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
    const [openClaim, setOpenClaim] = useState<string | null>(null);

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

    // Only says something once there is something to say. While you are still
    // queueing, the title and the counter have already said it.
    const status =
        remaining > 0
            ? null
            : waitingOn.length > 0
              ? t.lobby.hintWaiting(waitingOn.map(player => player.name).join(', '))
              : isHost
                ? t.lobby.hintHostCanStart
                : t.lobby.hintWaitingForHost;

    return (
        <div className="stage">
            <Window title={t.lobby.title}>
                <header className="stage__head">
                    {/* Title and count on one line: "add three more" and
                        "0 of 3" were saying the same thing in two places, with
                        an empty-state sentence underneath saying it a third. */}
                    <h2 className="stage__title">
                        {remaining > 0 ? t.lobby.queueMore(remaining) : t.lobby.setReady}
                        <span className="stage__count">
                            {mine.length}/{tracksPerPlayer}
                        </span>
                    </h2>
                    {status && <p className="stage__sub">{status}</p>}
                </header>

                {remaining > 0 && (
                    <div className="rack rack--stack">
                        <UrlField value={url} onChange={setUrl} onSubmit={() => void submit()} busy={busy} />
                    </div>
                )}

                {mine.length > 0 && (
                <div className="rack rack--stack">
                    <TrackList
                        tracks={mine}
                        onRemove={trackId => void game.removeTrack(trackId)}
                        slot={track => (
                            <ClaimPicker
                                track={track}
                                view={view}
                                spent={spentClaims(mine, track.id)}
                                open={openClaim === track.id}
                                onToggle={() => setOpenClaim(openClaim === track.id ? null : track.id)}
                                onPick={claim => {
                                    void game.setClaim(track.id, claim);
                                    setOpenClaim(null);
                                }}
                            />
                        )}
                    />
                </div>
                )}
            </Window>

            {isHost && (
                <Window
                    title={t.lobby.settings}
                    actions={<span className="win__note">{t.lobby.setlistLength(active.length * tracksPlayedPerPlayer)}</span>}
                >
                    <div className="setting">
                        <span className="setting__name">{t.lobby.tracksQueued}</span>
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
                        <span className="setting__name">{t.lobby.tracksPlayed}</span>
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
                        <span className="setting__name">{t.lobby.guessing}</span>
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
