import { useState } from 'react';
import { LIMITS, type GameView } from '@secret-dj/common';
import type { SecretDj } from '../hooks/useSecretDj';
import { Block } from '../components/Block';
import { ClaimPicker, spentClaims } from '../components/ClaimPicker';
import { UrlField } from '../components/UrlField';
import { TrackList } from '../components/TrackList';
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

    // One line about the room, said once. While you are still queueing the heading says it.
    const status =
        remaining > 0
            ? null
            : !enoughPlayers
              ? t.lobby.needTwo
              : waitingOn.length > 0
                ? t.lobby.hintWaiting(waitingOn.map(player => player.name).join(', '))
                : isHost
                  ? null
                  : t.lobby.hintWaitingForHost;

    return (
        <div className="stage">
            <Block
                className="card"
                label={remaining > 0 ? t.lobby.queueMore(remaining) : t.lobby.setReady}
                count={`${mine.length}/${tracksPerPlayer}`}
            >
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

                {remaining > 0 && (
                    <UrlField value={url} onChange={setUrl} onSubmit={() => void submit()} busy={busy} />
                )}
            </Block>

            {isHost && (
                <Block
                    className="card"
                    label={t.lobby.settings}
                    count={t.lobby.setlistLength(active.length * tracksPlayedPerPlayer)}
                >
                    <div className="settings">
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
                                className={`switch${guessingEnabled ? ' is-on' : ''}`}
                                role="switch"
                                aria-checked={guessingEnabled}
                                aria-label={t.lobby.guessing}
                                onClick={() => void game.updateSettings({ guessingEnabled: !guessingEnabled })}
                            >
                                <span className="switch__knob" />
                            </button>
                        </div>
                    </div>
                </Block>
            )}

            <div className="cta">
                {isHost && (
                    <button
                        type="button"
                        className="button button--primary button--lg button--block"
                        onClick={() => void game.startGame()}
                        disabled={!canStart}
                    >
                        {t.lobby.start}
                    </button>
                )}
                {status && <p className="muted">{status}</p>}
            </div>
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
            <span className="stepper__value num">{value}</span>
            <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={increaseLabel}>
                +
            </button>
        </div>
    );
}
