import { useEffect, useState } from 'react';
import { buildEmbed, needsResolution } from '@secret-dj/common';
import { resolveShareLink } from '../lib/api';
import { serviceBadge } from '../lib/serviceLogos';
import { prettyUrl } from '../lib/format';
import { Spinner } from './Spinner';
import { useT } from '../i18n';

interface TrackEmbedProps {
    url: string;
}

/**
 * The player.
 *
 * Two v1 bugs are fixed here. Short links are only resolved when they actually
 * need it (v1 round-tripped every URL through the server), and the async result
 * is discarded if the track changed while it was in flight — previously a slow
 * response for the previous round could overwrite the current player.
 */
export function TrackEmbed({ url }: TrackEmbedProps) {
    const t = useT();
    const [playable, setPlayable] = useState(() => (needsResolution(url) ? null : url));

    useEffect(() => {
        if (!needsResolution(url)) {
            setPlayable(url);
            return;
        }

        let active = true;
        const controller = new AbortController();
        setPlayable(null);

        resolveShareLink(url, controller.signal)
            .then(resolved => {
                if (active) setPlayable(resolved ?? url);
            })
            .catch(() => {
                // Abort or network failure: fall back to the link we were given.
                if (active) setPlayable(url);
            });

        return () => {
            active = false;
            controller.abort();
        };
    }, [url]);

    if (!playable) {
        return (
            <div className="embed embed--loading">
                <Spinner />
                <span>{t.round.findingTrack}</span>
            </div>
        );
    }

    const embed = buildEmbed(playable);
    if (embed.kind === 'link') {
        const badge = serviceBadge(playable);
        return (
            <div className="embed embed--fallback">
                <p className="embed__reason">{t.embed[embed.issue]}</p>
                <a className="button button--primary" href={playable} target="_blank" rel="noopener noreferrer">
                    {badge ? t.round.openIn(badge.name) : t.round.openLink}
                </a>
                <p className="embed__url">{prettyUrl(playable, 60)}</p>
            </div>
        );
    }

    return (
        <iframe
            // Remounting per URL guarantees the previous track actually stops.
            key={embed.src}
            title={embed.title}
            src={embed.src}
            width="100%"
            height={embed.height}
            loading="lazy"
            allow="encrypted-media *; autoplay *; clipboard-write; fullscreen; picture-in-picture"
            // These players genuinely need scripts and their own origin's
            // storage, so the sandbox keeps those and drops the rest — most
            // importantly `allow-top-navigation`, so a rogue embed cannot
            // redirect the game out from under everyone.
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation"
            referrerPolicy="strict-origin-when-cross-origin"
        />
    );
}
