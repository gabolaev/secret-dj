import { useEffect, useState } from 'react';
import {
    answerValue,
    obviousnessDrag,
    roomVerdict,
    type GameView,
    type PointReason,
} from '@secret-dj/common';
import { Block } from './Block';
import { Redacted } from './Redacted';
import { nameOf } from '../lib/format';
import { useI18n, useT } from '../i18n';

interface RevealPanelProps {
    view: GameView;
}

/** Sum, average and scale, popularity, claim. The order is the story. */
const LEDGER_STEPS = 4;

/** One wipe, so each row is fully open before the next one starts. */
const STEP_MS = 420;

/**
 * Trims trailing zeroes so a flat multiplier reads "×1", not "×1.00", and uses
 * the reader's decimal separator — the Russian copy writes ×1,5 everywhere else.
 */
function multiplier(value: number, locale: string): string {
    return value.toLocaleString(locale, { maximumFractionDigits: 2 });
}

/**
 * The receipt.
 *
 * A bare `×0.5` never said half of *what*, so the ledger never prints a
 * multiplier on its own: every step carries the figure that came in, the figure
 * that went out, and one plain sentence naming the thing that did it. Five
 * steps, always in this order — sum, average over answerers, scale to the
 * table, popularity tax, claim — because the order the arithmetic happens in
 * is the story of the round.
 *
 * It **runs down** rather than appearing. The rows uncover themselves one after
 * another, a wipe apart, because the order the arithmetic happens in is the
 * story of the round and a block that lands all at once gets read as a total.
 * Nobody has to drive it. Under reduced motion the whole receipt is there from
 * the first frame — a cascade of cuts is still four things arriving in
 * sequence, which is the thing that preference is asking us not to do.
 *
 * ♥ and ★ are kept apart at the bottom, always. ♥ is what the room gave — likes,
 * novelty, emotion, before the tax and before the gamble — and it is the number
 * the finale ranks tracks by. ★ is what the DJ banked; it ranks nothing, and it
 * is set quieter to say so.
 *
 * Every figure here is derived from the same exported functions that banked the
 * points, so the explanation cannot drift from the arithmetic.
 */
export function RevealPanel({ view }: RevealPanelProps) {
    const t = useT();
    const { locale } = useI18n();
    const reveal = view.round?.reveal;

    // How many ledger rows have had their cover lifted. Resets per track, so a
    // new round always starts the working from the top and runs itself down.
    const [shown, setShown] = useState(0);
    const trackId = view.round?.track.id;

    // Somebody who has asked for less movement gets the finished receipt, not a
    // sequence of cuts: a cascade under reduced motion is still four things
    // arriving one after another.
    const atOnce =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

    useEffect(() => setShown(atOnce ? LEDGER_STEPS : 0), [trackId, atOnce]);

    useEffect(() => {
        if (shown >= LEDGER_STEPS) return;
        const timer = window.setTimeout(() => setShown(value => value + 1), STEP_MS);
        return () => window.clearTimeout(timer);
    }, [shown]);

    if (!reveal) return null;

    const djName = nameOf(view.players, reveal.djId);
    const djPoints = new Map(
        reveal.points.filter(delta => delta.playerId === reveal.djId).map(delta => [delta.reason, delta.points]),
    );
    const pointsFor = (reason: PointReason) => djPoints.get(reason);

    const contributions = reveal.answers.map(answerValue);
    const total = contributions.reduce((sum, value) => sum + value, 0);
    const verdict = Math.round(roomVerdict(reveal));
    const drag = obviousnessDrag(reveal.answers);
    const popular = reveal.answers.filter(answer => answer.popular).length;

    // The deltas telescope, so each step can show the number it started from
    // and the number it left behind instead of a multiplier on its own.
    const afterTax = verdict + (pointsFor('obviousness') ?? 0);
    const afterClaim = afterTax + (pointsFor('claim-landed') ?? 0);
    const banked = reveal.points
        .filter(delta => delta.playerId === reveal.djId)
        .reduce((sum, delta) => sum + delta.points, 0);

    const rows = [
        {
            label: t.reveal.sumLabel,
            detail:
                (contributions.length > 0 ? contributions.join(' + ') : t.reveal.nobodyAnswered) +
                (reveal.listenerCount > reveal.answers.length
                    ? ` · ${t.reveal.silent(reveal.listenerCount - reveal.answers.length)}`
                    : ''),
            change: `${total}`,
        },
        {
            label: t.reveal.scaleLabel,
            detail:
                reveal.answers.length > 0
                    ? t.reveal.scaleWorking(total, reveal.answers.length, reveal.listenerCount)
                    : t.reveal.nothingToScale,
            change: `${total} → ${verdict}`,
        },
        {
            label: t.reveal.obviousLabel,
            detail: popular === 0 ? t.reveal.noDrag : t.reveal.dragWorking(popular, reveal.answers.length),
            change: popular === 0 ? t.reveal.unchanged : `${verdict} → ${afterTax}`,
            title: popular > 0 ? t.reveal.timesWorking(multiplier(drag, locale)) : undefined,
        },
        {
            label: t.reveal.claimLabel,
            // What the claim was and whether it landed is already on the claim
            // card above, in the claim's own terms. This row only owes the
            // number it moved.
            detail: afterTax === afterClaim ? t.reveal.noClaim : '',
            change: afterTax === afterClaim ? t.reveal.unchanged : `${afterTax} → ${afterClaim}`,
            title:
                afterTax !== afterClaim
                    ? t.reveal.timesWorking(multiplier(reveal.claimMultiplier, locale))
                    : undefined,
        },
    ];

    const allShown = shown >= rows.length;

    return (
        <>
            <Block label={t.reveal.theWorking}>
                <div className="ledger list list--strong">
                    {rows.map((row, index) => (
                        <Redacted key={row.label} open={index < shown} className="ledger__row">
                            <span className="ledger__n num">{String(index + 1).padStart(2, '0')}</span>
                            <span className="ledger__body">
                                <span className="ledger__label">{row.label}</span>
                                <span className="ledger__detail num">{row.detail}</span>
                            </span>
                            <span className="ledger__change num" title={row.title}>
                                {row.change}
                            </span>
                        </Redacted>
                    ))}
                    <p className="ledger__total ink">
                        <span className="ledger__label">{t.reveal.totalLabel(djName)}</span>
                        <span className="ledger__banked num">{allShown ? banked : '—'}</span>
                    </p>
                </div>
            </Block>

            {/* Two numbers, two weights. ♥ is set solid because it decides the
                order at the finale; ★ is quiet because it is one person's
                gamble and has no business moving a chart of what the room
                liked. They never share a column. */}
            <div className="tallies">
                <div className="tally">
                    <span className="tally__label num">{t.reveal.roomGave}</span>
                    <span className="tally__value num">{verdict}</span>
                </div>
                <div className="tally tally--quiet">
                    <span className="tally__label num">{t.reveal.djBanked}</span>
                    <span className="tally__value num">{banked}</span>
                </div>
            </div>
        </>
    );
}
