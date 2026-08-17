import type { GameView } from '@secret-dj/common';
import type { SecretDj } from '../hooks/useSecretDj';
import { TrackEmbed } from '../components/TrackEmbed';
import { ChipPicker } from '../components/ChipPicker';
import { RevealPanel } from '../components/RevealPanel';
import { ReactionBar } from '../components/ReactionBar';
import { Window } from '../components/Window';
import { serviceBadgeByName } from '../lib/serviceLogos';
import { useT } from '../i18n';

interface RoundScreenProps {
    view: GameView;
    game: SecretDj;
}

/**
 * The round: one card, the player at the top of it.
 *
 * The live counts live in the card's header rather than in a display panel of
 * their own. A header is where this UI already puts context, so the counters
 * follow the structure instead of importing a second visual language for
 * themselves.
 */
export function RoundScreen({ view, game }: RoundScreenProps) {
    const t = useT();
    const round = view.round;

    if (!round) return <p className="muted">{t.round.waitingForNext}</p>;

    const revealed = view.phase === 'reveal';
    const badge = serviceBadgeByName(round.track.service);
    const isFinalRound = round.number >= round.total;
    const others = view.players.filter(player => player.presence !== 'left' && player.id !== view.you.id);

    const stats = (
        <span className="stats">
            {round.isMine && <span className="stat stat--mine">{t.round.titleMine}</span>}
            <span className="stat stat--heart" title={t.round.hearts(round.heartCount)}>
                <i aria-hidden="true">♥</i>
                {round.heartCount}
            </span>
            <span className="stat stat--anthem" title={t.round.anthems(round.anthemCount)}>
                <i aria-hidden="true">★</i>
                {round.anthemCount}
            </span>
            {view.settings.guessingEnabled && !revealed && (
                <span className="stat" title={t.round.voted(round.votesIn, round.votersExpected)}>
                    {round.votesIn}/{round.votersExpected}
                </span>
            )}
        </span>
    );

    return (
        <>
            {/* Keyed on the track: revealing the DJ must not remount the player
                and restart the music underneath everyone. */}
            <Window title={t.round.position(round.number, round.total)} actions={stats} key={round.track.id}>
                <div className="screen">
                    <TrackEmbed url={round.track.url} />
                </div>

                <div className="deck__meta">
                    {badge?.logo && <img src={badge.logo} alt="" aria-hidden="true" />}
                    {badge?.name}
                    <a href={round.track.url} target="_blank" rel="noopener noreferrer">
                        {t.common.open}
                    </a>
                </div>

                {!revealed && round.canReact && (
                    <div className="rack">
                        <ReactionBar
                            reaction={round.myReaction}
                            wallet={view.you.wallet}
                            onReact={reaction => void game.react(reaction)}
                        />
                    </div>
                )}

                {!revealed && round.canVote && (
                    <div className="rack">
                        <ChipPicker
                            label={t.guess.title}
                            options={others}
                            value={round.myGuess}
                            onSelect={playerId => void game.vote(playerId)}
                        />
                    </div>
                )}

                {!revealed && round.isMine && view.settings.guessingEnabled && (
                    <div className="rack">
                        <ChipPicker
                            tone="decoy"
                            label={t.decoy.title}
                            options={others}
                            value={round.myDecoy}
                            noneLabel={t.decoy.none}
                            onSelectNone={() => void game.setDecoy(null)}
                            onSelect={playerId => void game.setDecoy(playerId)}
                        />
                    </div>
                )}

                {revealed && <RevealPanel view={view} />}
            </Window>

            {view.you.isHost ? (
                <div className="cta">
                    {revealed ? (
                        <button
                            type="button"
                            className="button button--primary button--lg button--block"
                            onClick={() => void game.nextRound()}
                        >
                            {isFinalRound ? t.round.hostFinish : t.round.hostNext}
                        </button>
                    ) : (
                        <>
                            <button
                                type="button"
                                className="button button--primary button--lg button--block"
                                onClick={() => void game.reveal()}
                            >
                                {t.round.hostReveal}
                            </button>
                            {view.phase === 'listening' && round.votersExpected > round.votesIn && (
                                <p className="muted">{t.round.hostWaitingVotes(round.votersExpected - round.votesIn)}</p>
                            )}
                        </>
                    )}
                </div>
            ) : (
                <p className="muted cta">
                    {revealed ? t.round.waitingForNext : view.phase === 'tallying' ? t.round.waitingForReveal : ''}
                </p>
            )}
        </>
    );
}
