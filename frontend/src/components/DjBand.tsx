import type { GameView } from '@secret-dj/common';
import { Avatar } from './Avatar';
import { Placeholder, Redacted } from './Redacted';
import { nameOf, trackLabel } from '../lib/format';
import { useT } from '../i18n';

interface DjBandProps {
    view: GameView;
}

/**
 * Who put this on.
 *
 * The identity is the largest thing on the screen at the moment it lands —
 * reversed out of ink, a full-width band rather than a line in a header. It is
 * the one piece of information the whole round was for, and it stays put
 * afterwards so the arithmetic below always has a name at the top of it.
 *
 * The band is rendered in both phases by the same element, which is the point:
 * the cover is lifted off it rather than the band being swapped in. Before the
 * reveal the client genuinely does not have the name — the server withholds it
 * — so the space is held open by geometry, and the bar tells you what it is
 * hiding ("one of the nine of you") and when it will stop ("opens on the last
 * Done").
 */
export function DjBand({ view }: DjBandProps) {
    const t = useT();
    const round = view.round;
    if (!round) return null;

    const reveal = round.reveal;
    const revealed = Boolean(reveal);
    const inTheRoom = view.players.filter(player => player.presence !== 'left').length;
    const correct = reveal ? reveal.votes.filter(vote => vote.correct).length : 0;

    return (
        <Redacted open={revealed} legend={t.round.sealedDj(inTheRoom)} className="band ink">
            <div className="band__row">
                {reveal ? (
                    <Avatar id={reveal.djId} name={nameOf(view.players, reveal.djId)} size="lg" signal />
                ) : (
                    <span className="avatar avatar--lg avatar--signal" aria-hidden="true" />
                )}

                <span className="band__who">
                    <span className="band__name clip">
                        {reveal ? nameOf(view.players, reveal.djId) : <Placeholder width="7ch" size="fig" />}
                    </span>
                    <span className="band__sub num clip">{t.round.putOn(trackLabel(round.track))}</span>
                </span>

                {view.settings.guessingEnabled && (
                    <span className="band__named">
                        <span className="band__eyebrow num">{t.round.namedBy}</span>
                        <span className="band__count num">
                            {revealed ? `${correct} / ${reveal!.votes.length}` : `— / ${round.votesIn}`}
                        </span>
                    </span>
                )}
            </div>
        </Redacted>
    );
}
