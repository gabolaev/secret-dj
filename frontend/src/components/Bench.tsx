import type { ReactElement } from 'react';
import { Plug, PLUG_REACH } from './Cables';

/**
 * The bench behind the join card: a studio desk seen from above.
 *
 * Two things make a desk read as a *working* desk rather than a product shot,
 * and both were missing from the first attempt. It is **dense** — gear pushed
 * up against gear, not four objects floating in the corners. And it is
 * **tangled** — far more leads than sockets you can trace, crossing each other,
 * of different weights, mostly black with one or two that are not.
 *
 * The cables are generated between real sockets rather than drawn by hand. The
 * hand-drawn version looked wrong for a reason that took a moment to name: the
 * curves passed near the units without ever meeting them, so nothing was
 * plugged into anything.
 *
 * Deliberately low contrast: it is the backdrop to a form somebody has to read
 * and type into. If it competes with the card it has failed, however handsome.
 */

/**
 * `[x, y, out]` in the unit's own coordinates.
 *
 * `out` is the direction the cable leaves the socket, in degrees: 0 right,
 * 180 left, -90 out of the back edge. Seen from above, gear takes its leads out
 * of whichever edge the socket is on, so a left/right-only model was the reason
 * cables set off across panel faces.
 */
type Jack = [number, number, number];

interface Unit {
    id: string;
    x: number;
    y: number;
    rot: number;
    jacks: Jack[];
    render: () => ReactElement;
}

interface End {
    x: number;
    y: number;
    /** Which way the cable leaves, in world space. */
    dx: number;
    dy: number;
}

const radians = (deg: number) => (deg * Math.PI) / 180;

/** Where a socket ends up once its unit is placed and turned. */
function world(unit: Unit, index: number): End {
    const [jx, jy, out] = unit.jacks[index % unit.jacks.length];
    const cos = Math.cos(radians(unit.rot));
    const sin = Math.sin(radians(unit.rot));
    const heading = radians(unit.rot + out);
    return {
        x: unit.x + jx * cos - jy * sin,
        y: unit.y + jx * sin + jy * cos,
        dx: Math.cos(heading),
        dy: Math.sin(heading),
    };
}

/** Where the sheath actually begins: clear of the connector's barrel. */
const tail = (end: End): End => ({
    ...end,
    x: end.x + end.dx * PLUG_REACH,
    y: end.y + end.dy * PLUG_REACH,
});

/** The angle a connector sits at, so it points back down its own cable. */
const facing = (end: End) => (Math.atan2(end.dy, end.dx) * 180) / Math.PI;

/** A keyboard: the one shape that says "music" before you have read anything. */
function keys(count: number, width: number, height: number): ReactElement {
    const w = width / count;
    // Which degrees of the scale carry a black key above them.
    const sharps = new Set([0, 1, 3, 4, 5]);
    return (
        <>
            <rect width={width} height={height} rx="4" className="bench__body" />
            {Array.from({ length: count }, (_, index) => (
                <rect
                    key={`w${index}`}
                    x={index * w + 0.5}
                    y={height * 0.34}
                    width={w - 1}
                    height={height * 0.62}
                    className="bench__whitekey"
                />
            ))}
            {Array.from({ length: count - 1 }, (_, index) =>
                sharps.has(index % 7) ? (
                    <rect
                        key={`b${index}`}
                        x={(index + 1) * w - w * 0.3}
                        y={height * 0.34}
                        width={w * 0.6}
                        height={height * 0.38}
                        className="bench__blackkey"
                    />
                ) : null,
            )}
        </>
    );
}

const UNITS: Unit[] = [
    {
        id: 'keys-top',
        x: 250,
        y: 60,
        rot: -3,
        jacks: [[14, 18, 180], [406, 14, -90], [300, 14, -90]],
        render: () => keys(29, 420, 110),
    },
    {
        id: 'groovebox',
        x: 150,
        y: 210,
        rot: 4,
        jacks: [[8, 30, 180], [312, 30, 0], [312, 82, 0], [160, 112, 90]],
        render: () => (
            <>
                <rect width="320" height="120" rx="6" className="bench__body" />
                <rect x="16" y="14" width="130" height="30" rx="3" className="bench__screen" />
                {Array.from({ length: 8 }, (_, index) => (
                    <rect key={index} x={16 + index * 37} y={58} width="30" height="30" rx="3"
                          className={index === 5 ? 'bench__key bench__key--hot' : 'bench__key'} />
                ))}
                {[0, 1, 2, 3].map(index => (
                    <circle key={index} cx={190 + index * 32} cy={28} r="11" className="bench__knob" />
                ))}
            </>
        ),
    },
    {
        id: 'mixer',
        x: 90,
        y: 420,
        rot: -2,
        jacks: [[6, 200, 180], [6, 222, 180], [232, 200, 0], [232, 222, 0], [120, 232, 90]],
        render: () => (
            <>
                <rect width="240" height="240" rx="6" className="bench__body" />
                {Array.from({ length: 8 }, (_, index) => (
                    <g key={index} transform={`translate(${16 + index * 27} 16)`}>
                        <circle cx="8" cy="12" r="7" className="bench__knob" />
                        <circle cx="8" cy="34" r="7" className="bench__knob" />
                        <rect x="3" y="56" width="10" height="140" rx="5" className="bench__slot" />
                        <rect x="0" y={70 + ((index * 41) % 110)} width="16" height="12" rx="2" className="bench__cap" />
                    </g>
                ))}
            </>
        ),
    },
    {
        id: 'keys-bottom',
        x: 210,
        y: 730,
        rot: 2,
        jacks: [[14, 18, 180], [376, 14, -90], [200, 112, 90]],
        render: () => keys(25, 390, 120),
    },
    {
        id: 'sampler',
        x: 620,
        y: 690,
        rot: -4,
        jacks: [[8, 122, 180], [232, 122, 0], [232, 66, 0], [120, 132, 90]],
        render: () => (
            <>
                <rect width="240" height="140" rx="6" className="bench__body" />
                <rect x="150" y="16" width="76" height="26" rx="3" className="bench__screen" />
                {[0, 1, 2, 3].map(col =>
                    [0, 1].map(row => (
                        <rect key={`${col}-${row}`} x={16 + col * 33} y={16 + row * 33} width="26" height="26" rx="3"
                              className="bench__key" />
                    )),
                )}
                {[0, 1, 2, 3, 4].map(index => (
                    <circle key={index} cx={26 + index * 44} cy={104} r="12" className="bench__knob" />
                ))}
            </>
        ),
    },
    {
        id: 'deck',
        x: 620,
        y: 70,
        rot: -2,
        jacks: [[10, 60, 180], [294, 96, 0], [150, 264, 90]],
        render: () => (
            <>
                <rect width="304" height="272" rx="8" className="bench__body" />
                {/* Platter, record, label, spindle — the one object on the desk
                    that is unmistakable at a glance and at any size. */}
                <circle cx="132" cy="140" r="108" className="bench__platter" />
                <circle cx="132" cy="140" r="98" className="bench__record" />
                {[40, 55, 70, 85].map(r => (
                    <circle key={r} cx="132" cy="140" r={r} className="bench__groove" />
                ))}
                <circle cx="132" cy="140" r="32" className="bench__label" />
                <circle cx="132" cy="140" r="3.5" className="bench__spindle" />

                {/* Tonearm: pivot at the back right, headshell resting on the
                    outer groove, which is where an arm actually sits. */}
                <circle cx="258" cy="58" r="14" className="bench__knob" />
                <path d="M 258 58 L 236 96 L 196 168" className="bench__arm" />
                <rect x="182" y="160" width="26" height="14" rx="2" transform="rotate(28 195 167)"
                      className="bench__headshell" />

                <rect x="16" y="228" width="60" height="26" rx="3" className="bench__key" />
                <rect x="256" y="150" width="16" height="96" rx="4" className="bench__slot" />
                <rect x="252" y="182" width="24" height="12" rx="2" className="bench__cap" />
            </>
        ),
    },
    {
        id: 'rack',
        x: 1120,
        y: 90,
        rot: 3,
        jacks: [[8, 120, 180], [8, 66, 180], [352, 120, 0], [352, 66, 0], [185, 132, 90]],
        render: () => (
            <>
                <rect width="360" height="140" rx="6" className="bench__body" />
                <rect x="20" y="24" width="140" height="38" rx="3" className="bench__screen" />
                {[0, 1, 2, 3, 4, 5].map(index => (
                    <circle key={index} cx={212 + (index % 3) * 50} cy={40 + Math.floor(index / 3) * 52} r="15"
                            className="bench__knob" />
                ))}
                <rect x="20" y="82" width="140" height="28" rx="3" className="bench__key" />
            </>
        ),
    },
    {
        id: 'drum',
        x: 1230,
        y: 300,
        rot: -5,
        jacks: [[8, 128, 180], [8, 70, 180], [272, 128, 0], [140, 132, 90]],
        render: () => (
            <>
                <rect width="280" height="140" rx="6" className="bench__body" />
                <rect x="16" y="14" width="248" height="28" rx="3" className="bench__screen" />
                {[0, 1, 2, 3, 4, 5, 6, 7].map(index => (
                    <rect key={index} x={16 + index * 32} y={58} width="26" height="26" rx="3"
                          className={index === 2 ? 'bench__key bench__key--hot' : 'bench__key'} />
                ))}
                {[0, 1, 2, 3, 4, 5, 6, 7].map(index => (
                    <rect key={`b${index}`} x={16 + index * 32} y={96} width="26" height="26" rx="3" className="bench__key" />
                ))}
            </>
        ),
    },
    {
        id: 'keys-right',
        x: 1210,
        y: 620,
        rot: 6,
        jacks: [[14, 18, 180], [346, 14, -90], [185, 102, 90]],
        render: () => keys(24, 360, 110),
    },
    {
        id: 'brick-a',
        x: 700,
        y: 340,
        rot: 12,
        jacks: [[8, 26, 180], [78, 26, 0]],
        render: () => (
            <>
                <rect width="86" height="52" rx="5" className="bench__brick" />
                <rect x="14" y="14" width="58" height="10" rx="2" className="bench__slot" />
            </>
        ),
    },
    {
        id: 'brick-b',
        x: 900,
        y: 300,
        rot: -14,
        jacks: [[8, 24, 180], [72, 24, 0]],
        render: () => (
            <>
                <rect width="80" height="48" rx="5" className="bench__brick" />
                <rect x="12" y="12" width="56" height="10" rx="2" className="bench__slot" />
            </>
        ),
    },
    {
        id: 'brick-c',
        x: 830,
        y: 560,
        rot: 6,
        jacks: [[8, 22, 180], [62, 22, 0]],
        render: () => (
            <>
                <rect width="70" height="44" rx="5" className="bench__brick" />
                <rect x="10" y="10" width="50" height="10" rx="2" className="bench__slot" />
            </>
        ),
    },
];

const byId = Object.fromEntries(UNITS.map(unit => [unit.id, unit]));

/** `[from, socket, to, socket]`. Colour comes from the index, mostly black. */
const PATCHES: Array<[string, number, string, number]> = [
    ['keys-top', 0, 'groovebox', 0],
    ['keys-top', 1, 'rack', 0],
    ['keys-top', 2, 'rack', 1],
    ['groovebox', 1, 'brick-a', 0],
    ['groovebox', 2, 'mixer', 2],
    ['groovebox', 3, 'mixer', 0],
    ['mixer', 1, 'keys-bottom', 0],
    ['mixer', 3, 'sampler', 0],
    ['mixer', 4, 'keys-bottom', 2],
    ['keys-bottom', 1, 'sampler', 0],
    ['sampler', 1, 'brick-c', 0],
    ['sampler', 2, 'keys-right', 0],
    ['sampler', 3, 'brick-c', 1],
    ['deck', 0, 'brick-a', 0],
    ['deck', 1, 'rack', 0],
    ['deck', 2, 'mixer', 2],
    ['deck', 2, 'brick-b', 0],
    ['rack', 2, 'drum', 2],
    ['rack', 3, 'brick-b', 1],
    ['rack', 4, 'brick-b', 0],
    ['drum', 0, 'brick-a', 1],
    ['drum', 1, 'keys-right', 0],
    ['drum', 3, 'keys-right', 2],
    ['keys-right', 1, 'brick-c', 1],
    ['brick-a', 1, 'brick-b', 0],
    ['brick-b', 1, 'brick-c', 0],
];

/** Leads that go off to something not on this desk. */
const LOOSE: Array<[string, number, number, number]> = [
    ['mixer', 0, -180, 940],
    ['keys-right', 1, 1780, 900],
    ['rack', 2, 1780, 120],
    ['keys-top', 2, 260, -120],
];

/**
 * The same sheath colours as the leads on the drum machine, and for the same
 * reason: a desk of cables is mostly pale grey and off-white with a couple of
 * dark ones, and exactly one that is orange. An all-black bundle reads as
 * scribble rather than as cable.
 */
const STROKES = ['#3c3c42', '#e6e6e2', '#5a5a60', '#c9c9c5', '#d13c00', '#e6e6e2', '#45454c', '#c9c9c5'];

/**
 * A lead between two sockets.
 *
 * The control points come straight out of each socket along its own face, so
 * the cable leaves the panel square and then sweeps — which is what makes a
 * long lazy curve rather than the short symmetrical droop these had before.
 * `reach` varies per cable so parallel runs fan out instead of stacking.
 */
function lead(a: End, b: End, reach: number, sag: number): string {
    const c1x = a.x + a.dx * reach;
    const c1y = a.y + a.dy * reach + sag;
    const c2x = b.x + b.dx * reach;
    const c2y = b.y + b.dy * reach + sag;
    return `M ${a.x} ${a.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${b.x} ${b.y}`;
}

export function Bench() {
    const patches = PATCHES.map(([fromId, fromJack, toId, toJack], index) => {
        const a = world(byId[fromId], fromJack);
        const b = world(byId[toId], toJack);
        const span = Math.hypot(b.x - a.x, b.y - a.y);
        return {
            d: lead(tail(a), tail(b), 110 + ((index * 37) % 130), Math.min(90, span * 0.16)),
            stroke: STROKES[index % STROKES.length],
            width: 7 + ((index * 3) % 3),
            ends: [a, b],
        };
    });

    const loose = LOOSE.map(([fromId, fromJack, x, y], index) => {
        const a = world(byId[fromId], fromJack);
        // Nothing on the far end, so it points back the way it came.
        const b: End = { x, y, dx: -a.dx, dy: 0 };
        return {
            d: lead(tail(a), b, 200, 60),
            stroke: STROKES[(index * 2 + 1) % STROKES.length],
            width: 8,
            ends: [a],
        };
    });

    const cables = [...patches, ...loose];

    return (
        <svg
            className="bench"
            viewBox="0 0 1600 1000"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
            focusable="false"
        >
            {/* Order matters and was wrong: SVG paints in document order, so
                units-then-cables laid every lead across the panel faces. Cables
                go down first and pass *behind* the cases; the connectors go on
                last so they always sit on top of the socket they are in. */}
            <g className="bench__cables" fill="none" strokeLinecap="round">
                {cables.map((cable, index) => (
                    <g key={`${cable.d}-${index}`}>
                        {/* The shadow it casts on the desk, offset and soft. */}
                        <path d={cable.d} stroke="rgb(0 0 0 / 14%)" strokeWidth={cable.width + 3} transform="translate(2 6)" />
                        <path d={cable.d} stroke={cable.stroke} strokeWidth={cable.width} />
                        {/* A highlight along the top of the sheath. */}
                        <path
                            d={cable.d}
                            stroke="rgb(255 255 255 / 20%)"
                            strokeWidth={Math.max(1, cable.width / 4)}
                            transform="translate(0 -1.5)"
                        />
                    </g>
                ))}
            </g>

            {UNITS.map(unit => (
                <g key={unit.id} className="bench__unit" transform={`translate(${unit.x} ${unit.y}) rotate(${unit.rot})`}>
                    {unit.render()}
                    {unit.jacks.map(([jx, jy], index) => (
                        <circle key={index} cx={jx} cy={jy} r="6" className="bench__jack" />
                    ))}
                </g>
            ))}

            <g className="bench__plugs">
                {cables.flatMap((cable, index) =>
                    cable.ends.map((end, side) => (
                        <Plug
                            key={`${index}-${side}`}
                            x={end.x}
                            y={end.y}
                            kind={cable.width > 8 ? 'xlr' : 'trs'}
                            angle={facing(end)}
                            className="bench__plug"
                        />
                    )),
                )}
            </g>
        </svg>
    );
}
