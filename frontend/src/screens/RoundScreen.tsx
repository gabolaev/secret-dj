import type { GameView } from '@secret-dj/common';
import type { SecretDj } from '../hooks/useSecretDj';
import { AnswerBar } from '../components/AnswerBar';
import { AnswerTable } from '../components/AnswerTable';
import { Block } from '../components/Block';
import { ChipPicker } from '../components/ChipPicker';
import { ClaimCard } from '../components/ClaimCard';
import { DjBand } from '../components/DjBand';
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
 * The round, and the reveal — deliberately the same page with fewer covers.
 *
 * Every withheld thing on this screen is rendered by the element that will
 * eventually hold it: the DJ band, the claim, the answers. The reveal does not
 * swap one layout for another, it lifts the covers off this one. That is why
 * the band, the claim card and the answer table live here across both phases
 * rather than inside a reveal-only panel — a component that unmounts cannot be
 * wiped, it can only be replaced, and a replacement reflows.
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

    return (
        <>
            {/* Quarantined, not integrated: an ink passe-partout with a printed
                caption strip above it. Framing a foreign object admits that it
                is foreign — trying to blend it is how you get a design that
                only works for one provider. */}
            <figure className="embed-frame">
                <figcaption className="embed-frame__strip num">
                    <span>{t.round.nowPlaying}</span>
                    <span className="embed-frame__service">
                        {badge?.name ? t.round.embedOf(badge.name) : t.round.embedGeneric}
                    </span>
                </figcaption>
                <div className="embed-frame__mat">
                    {/* Keyed on the track: revealing the DJ must not remount the
                        player and restart the music underneath everyone. */}
                    <TrackEmbed url={round.track.url} key={round.track.id} />
                </div>
                <div className="embed-frame__title">
                    {/* A failed lookup is a designed state, not an apology: the
                        raw URL *is* the content, and we never invent a title. */}
                    <span className={`embed-frame__name clip${failed ? ' embed-frame__name--raw' : ''}`}>
                        {trackLabel(round.track)}
                    </span>
                    <a className="num" href={round.track.url} target="_blank" rel="noopener noreferrer">
                        {t.common.open}
                    </a>
                </div>
                {failed && <p className="embed-frame__failed num">{t.round.lookupFailed}</p>}
            </figure>

            {round.isMine && !revealed && (
                <Block className="yours">
                    <span className="yours__eyebrow num">{t.round.yoursEyebrow}</span>
                    <p className="yours__lead">{t.round.yoursLead}</p>
                </Block>
            )}

            <Block label={t.round.whoPutThisOn}>
                <DjBand view={view} />
            </Block>

            <ClaimCard view={view} />

            <AnswerTable view={view} />

            {!revealed && round.canAnswer && (
                <Block label={t.round.yourAnswer}>
                    <div className="card answer-card">
                        <AnswerBar answer={round.myAnswer} onAnswer={patch => void game.answer(patch)} />

                        {round.canVote && (
                            <>
                                <span className="divider" />
                                <ChipPicker
                                    label={t.guess.title}
                                    options={others}
                                    value={round.myGuess}
                                    onSelect={playerId => void game.vote(playerId)}
                                />
                            </>
                        )}

                        {/* The normal way a round ends. The host's own button is
                            the fallback for a room where somebody never gets
                            round to pressing this. Nobody is ever cut off. */}
                        <div className="answer-card__foot">
                            <button
                                type="button"
                                className={`button button--lg button--block${round.myDone ? '' : ' button--primary'}`}
                                aria-pressed={round.myDone}
                                onClick={() => void game.markDone(!round.myDone)}
                            >
                                {round.myDone ? t.round.undone : t.round.done}
                            </button>
                            <p className="muted">{t.round.doneCount(round.doneIn, round.doneExpected)}</p>
                        </div>
                    </div>
                </Block>
            )}

            {revealed && <RevealPanel view={view} />}

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
                                disabled={!round.isReady}
                                onClick={() => void game.reveal()}
                            >
                                {t.round.hostReveal}
                            </button>
                            {!round.isReady && <p className="muted">{t.round.hostWaiting}</p>}
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
