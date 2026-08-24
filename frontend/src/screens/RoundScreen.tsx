import type { GameView } from '@secret-dj/common';
import type { SecretDj } from '../hooks/useSecretDj';
import { TrackEmbed } from '../components/TrackEmbed';
import { ChipPicker } from '../components/ChipPicker';
import { RevealPanel } from '../components/RevealPanel';
import { AnswerBar } from '../components/AnswerBar';
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
    // Absent for everyone but the DJ until the reveal, and the banner simply
    // does not exist while it is.
    const claim = round.track.claim;

    const stats = (
        <span className="stats">
            {round.isMine && <span className="stat stat--mine">{t.round.titleMine}</span>}
            <span className="stat stat--rated" title={t.round.answered(round.answersIn)}>
                <i aria-hidden="true">✓</i>
                {round.answersIn}
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

                {claim && (
                    <p className={`banner banner--${claim.id}`}>
                        <strong>{t.claims[claim.id].title}</strong>
                        <span className="banner__blurb">
                            {revealed ? t.claims[claim.id].blurb : t.claims.yoursOnly}
                        </span>
                    </p>
                )}

                <div className="deck__meta">
                    {badge?.logo && <img src={badge.logo} alt="" aria-hidden="true" />}
                    {badge?.name}
                    <a href={round.track.url} target="_blank" rel="noopener noreferrer">
                        {t.common.open}
                    </a>
                </div>

                {!revealed && round.canAnswer && (
                    <div className="rack">
                        <AnswerBar answer={round.myAnswer} onAnswer={patch => void game.answer(patch)} />
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
