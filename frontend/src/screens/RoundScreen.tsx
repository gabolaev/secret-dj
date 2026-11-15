import type { GameView } from '@secret-dj/common';
import type { SecretDj } from '../hooks/useSecretDj';
import { AnswerBar } from '../components/AnswerBar';
import { ChipPicker } from '../components/ChipPicker';
import { RevealPanel } from '../components/RevealPanel';
import { TrackEmbed } from '../components/TrackEmbed';
import { serviceBadgeByName } from '../lib/serviceLogos';
import { trackLabel } from '../lib/format';
import { useT } from '../i18n';

interface RoundScreenProps {
    view: GameView;
    game: SecretDj;
}

/**
 * The track, then your answer. Who the DJ was, their claim and everyone's
 * answers only appear at the reveal — the server withholds them until then.
 */
export function RoundScreen({ view, game }: RoundScreenProps) {
    const t = useT();
    const round = view.round;

    if (!round) return <p className="muted">{t.round.waitingForNext}</p>;

    const revealed = view.phase === 'reveal';
    const badge = serviceBadgeByName(round.track.service);
    const isFinalRound = round.number >= round.total;
    const others = view.players.filter(player => player.presence !== 'left' && player.id !== view.you.id);
    const failed = round.track.metadata === 'failed';
    const progress = t.round.doneCount(round.doneIn, round.doneExpected);

    return (
        <div className="stage">
            <figure className="now">
                <div className="now__player">
                    {/* Keyed on the track so the reveal never restarts the music. */}
                    <TrackEmbed url={round.track.url} key={round.track.id} />
                </div>
                <figcaption className="now__caption">
                    {badge?.logo && <img className="now__service" src={badge.logo} alt={badge.name} />}
                    <span className={`now__title clip${failed ? ' now__title--raw' : ''}`} title={trackLabel(round.track)}>
                        {trackLabel(round.track)}
                    </span>
                    <a className="now__open" href={round.track.url} target="_blank" rel="noopener noreferrer">
                        {t.common.open}
                    </a>
                </figcaption>
                {failed && <p className="now__failed">{t.round.lookupFailed}</p>}
            </figure>

            {!revealed && round.isMine && (
                <section className="card yours">
                    <h2 className="yours__title">{t.round.yoursTitle}</h2>
                    {round.track.claim && (
                        <p className="yours__claim">
                            <span className="muted">{t.round.yourClaim}</span> {t.claims[round.track.claim.id].title}
                        </p>
                    )}
                    <p className="muted num">{progress}</p>
                </section>
            )}

            {!revealed && round.canAnswer && (
                <section className="card answer-card">
                    <AnswerBar answer={round.myAnswer} onAnswer={patch => void game.answer(patch)} />

                    {round.canVote && (
                        <ChipPicker
                            label={t.guess.title}
                            options={others}
                            value={round.myGuess}
                            onSelect={playerId => void game.vote(playerId)}
                        />
                    )}

                    <div className="answer-card__foot">
                        <button
                            type="button"
                            className={`button button--lg button--block${round.myDone ? '' : ' button--primary'}`}
                            aria-pressed={round.myDone}
                            onClick={() => void game.markDone(!round.myDone)}
                        >
                            {round.myDone ? t.round.undone : t.round.done}
                        </button>
                        <p className="muted num">{progress}</p>
                    </div>
                </section>
            )}

            {revealed && <RevealPanel view={view} />}

            <div className="cta">
                {view.you.isHost ? (
                    revealed ? (
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
                                disabled={!round.isReady}
                                onClick={() => void game.reveal()}
                            >
                                {t.round.hostReveal}
                            </button>
                            {!round.isReady && <p className="muted">{t.round.hostWaiting}</p>}
                        </>
                    )
                ) : (
                    <p className="muted">
                        {revealed ? t.round.waitingForNext : view.phase === 'tallying' ? t.round.waitingForReveal : ''}
                    </p>
                )}
            </div>
        </div>
    );
}
