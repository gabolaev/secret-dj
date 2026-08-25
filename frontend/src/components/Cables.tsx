import { useEffect, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';

/** Where the cables leave the machine, in viewport pixels. */
export interface CableOrigin {
    x: number;
    y: number;
}

/**
 * Tracks the left edge of an element in viewport coordinates.
 *
 * The panel is sticky and the page scrolls, so the point the cables come out of
 * moves. Recomputed on a frame after scroll and resize rather than on every
 * event, because this is decoration and must never be what makes scrolling
 * expensive.
 */
export function useCableOrigin(ref: RefObject<HTMLElement | null>, active: boolean): CableOrigin | null {
    const [origin, setOrigin] = useState<CableOrigin | null>(null);

    useEffect(() => {
        if (!active) {
            setOrigin(null);
            return;
        }

        let frame = 0;
        const measure = () => {
            frame = 0;
            const box = ref.current?.getBoundingClientRect();
            // The *right* edge: the leads plug into the back of the machine and
            // come round, rather than lying across its face.
            if (box) setOrigin({ x: box.right, y: box.top + box.height / 2 });
        };
        const schedule = () => {
            if (!frame) frame = window.requestAnimationFrame(measure);
        };

        measure();
        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule);
        return () => {
            if (frame) window.cancelAnimationFrame(frame);
            window.removeEventListener('scroll', schedule);
            window.removeEventListener('resize', schedule);
        };
    }, [ref, active]);

    return origin;
}

/**
 * Patch cables, running out of the machine and off across the page.
 *
 * Pure decoration, and it behaves like it: fixed *behind* the content, no
 * pointer events, `aria-hidden`, and it never changes the size of anything. A
 * desk with a machine on it has cables draped over it, and the page is the desk.
 *
 * Drawn as beziers with real slack rather than smooth arcs — a cable hangs under
 * its own weight, and an arc that does not droop reads as a ribbon.
 */
const LEADS: Array<{ stroke: string; width: number; plug: 'trs' | 'xlr'; exit: number; land: number }> = [
    // `exit` is where it leaves the socket strip, `land` where it ends up on the
    // far side of the page — spread over the whole height so the desk looks
    // wired rather than bundled.
    { stroke: '#3c3c42', width: 9, plug: 'xlr', exit: -34, land: 0.08 },
    { stroke: '#e6e6e2', width: 8, plug: 'trs', exit: -14, land: 0.34 },
    // The one orange lead, the way exactly one cable on a desk always is.
    { stroke: 'var(--accent)', width: 7, plug: 'trs', exit: 6, land: 0.58 },
    { stroke: '#5a5a60', width: 8, plug: 'trs', exit: 26, land: 0.82 },
    { stroke: '#c9c9c5', width: 7, plug: 'trs', exit: 46, land: 1.02 },
];

export function Cables({ from }: { from: CableOrigin }) {
    const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));

    useEffect(() => {
        const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const svg = (
        <svg
            className="cables"
            viewBox={`0 0 ${size.w} ${size.h}`}
            width={size.w}
            height={size.h}
            aria-hidden="true"
            focusable="false"
        >
            {LEADS.map((lead, index) => {
                const y0 = from.y + lead.exit;
                const x0 = from.x + PLUG_REACH;
                // Out to the right of the machine, round, then all the way
                // across and off the left edge.
                const bulge = from.x + 70 + index * 12;
                const endY = size.h * lead.land;
                const d =
                    `M ${x0} ${y0} ` +
                    `C ${bulge} ${y0}, ${bulge + 20} ${y0 + 90}, ${from.x - 40} ${y0 + 150} ` +
                    `C ${size.w * 0.45} ${y0 + 240}, ${size.w * 0.4} ${endY - 120}, ${size.w * 0.2} ${endY} ` +
                    `S ${-60} ${endY + 40}, ${-120} ${endY - 30}`;

                return (
                    <g key={index}>
                        {/* The shadow it casts on the desk, offset and soft. */}
                        <path
                            d={d}
                            stroke="rgb(0 0 0 / 14%)"
                            strokeWidth={lead.width + 3}
                            strokeLinecap="round"
                            fill="none"
                            transform="translate(2 6)"
                        />
                        <path d={d} stroke={lead.stroke} strokeWidth={lead.width} strokeLinecap="round" fill="none" />
                        {/* A highlight along the top of the sheath. */}
                        <path
                            d={d}
                            stroke="rgb(255 255 255 / 20%)"
                            strokeWidth={Math.max(1, lead.width / 4)}
                            strokeLinecap="round"
                            fill="none"
                            transform="translate(0 -1.5)"
                        />
                        <Plug x={from.x} y={y0} kind={lead.plug} />
                    </g>
                );
            })}
        </svg>
    );

    // Portalled to the body on purpose. Inside the layout it sat in the sidebar
    // column, and a *positioned* element paints above static block content no
    // matter what the DOM order is — which is exactly how it ended up lying over
    // the settings panel. Out here it is simply the layer under the app.
    return createPortal(svg, document.body);
}

/**
 * How far the connector sticks out of the socket.
 *
 * The cable has to start at the *tail* of the barrel, not at the socket:
 * starting it at the socket runs the sheath out through the middle of its own
 * connector, which is what made these read as cables lying near the gear rather
 * than plugged into it.
 */
export const PLUG_REACH = 20;

interface PlugProps {
    x: number;
    y: number;
    kind: 'trs' | 'xlr';
    /** Degrees. The connector points back down its own cable. */
    angle?: number;
    className?: string;
}

/**
 * The connector on the end, pointing back into the socket.
 *
 * Shared with the bench on the join screen, because a plug drawn twice is a
 * plug drawn two slightly different ways.
 */
export function Plug({ x, y, kind, angle = 0, className }: PlugProps) {
    const at = `translate(${x} ${y}) rotate(${angle})`;
    if (kind === 'xlr') {
        return (
            <g className={className} transform={at}>
                <rect x="-4" y="-9" width="26" height="18" rx="3" fill="#2b2b30" />
                <rect x="18" y="-7" width="5" height="14" rx="2" fill="#55555c" />
            </g>
        );
    }
    return (
        <g className={className} transform={at}>
            {/* Shaft disappearing into the socket, then the barrel. */}
            <rect x="-14" y="-2.6" width="16" height="5.2" rx="2.6" fill="#b9b9bd" />
            <rect x="-9" y="-2.6" width="2" height="5.2" fill="#2b2b30" />
            <rect x="0" y="-6" width="20" height="12" rx="3" fill="#2b2b30" />
        </g>
    );
}
