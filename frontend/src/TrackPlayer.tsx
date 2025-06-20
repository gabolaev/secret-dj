import React, { useEffect, useState } from 'react';

interface TrackPlayerProps {
  url: string;
}

const getYoutubeVideoId = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return match[2];
  }
  return null;
};

const getSpotifyTrackId = (url: string): string | null => {
    if (url.includes('spotify.link')) {
        return 'shortlink'; // Mark as needing resolution
    }
    const match = url.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
}

const getYandexMusicTrackInfo = (url: string): {albumId: string, trackId: string} | null => {
    const match = url.match(/music\.yandex\.ru\/album\/(\d+)\/track\/(\d+)/);
    if (match && match[1] && match[2]) {
        return { albumId: match[1], trackId: match[2] };
    }
    return null;
}

const getAppleMusicInfo = (url: string): string | null => {
    try {
        const urlObject = new URL(url);
        if (urlObject.hostname === 'music.apple.com') {
            return "https://embed.music.apple.com" + urlObject.pathname;
        }
    } catch {
        // invalid url
    }
    return null;
}

const getDeezerInfo = (url: string): { type: string, id: string } | null => {
    if (url.includes('link.deezer.com')) {
        return { type: 'shortlink', id: '' }; // Mark as needing resolution
    }
    const match = url.match(/deezer\.com\/(?:[a-z]{2}\/)?(track|album|playlist)\/(\d+)/);
    if (match && match[1] && match[2]) {
        return { type: match[1], id: match[2] };
    }
    return null;
}

export const TrackPlayer: React.FC<TrackPlayerProps> = ({ url }) => {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(url);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const resolveUrl = async (urlToResolve: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`/resolve-url?url=${encodeURIComponent(urlToResolve)}`);
            if (!response.ok) {
                throw new Error('Failed to resolve URL');
            }
            const data = await response.json();
            setResolvedUrl(data.resolvedUrl);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
            setResolvedUrl(urlToResolve); // Fallback to original URL on error
        } finally {
            setIsLoading(false);
        }
    }

    if (url.includes('link.deezer.com') || url.includes('spotify.link')) {
        resolveUrl(url);
    } else {
        setResolvedUrl(url);
    }
  }, [url]);

  if (isLoading) {
      return <div>Loading track...</div>;
  }
  if (error) {
      return <div>Error: {error}. <a href={url} target="_blank" rel="noopener noreferrer">Try opening the link directly.</a></div>;
  }

  if (!resolvedUrl) {
    return <div>No track is currently playing.</div>;
  }
  const youtubeId = getYoutubeVideoId(resolvedUrl);
  if (youtubeId) {
    return (
      <iframe
        width="560"
        height="315"
        src={`https://www.youtube.com/embed/${youtubeId}`}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{ border: 'none', width: '100%', aspectRatio: '16/9', height: 'auto' }}
      ></iframe>
    );
  }

  const spotifyId = getSpotifyTrackId(resolvedUrl);
  if (spotifyId && spotifyId !== 'shortlink') {
    return (
        <iframe
            src={`https://open.spotify.com/embed/track/${spotifyId}`}
            width="100%"
            height="352"
            frameBorder="0"
            allow="encrypted-media"
            title="Spotify Player"
            style={{ border: 'none', borderRadius: '12px' }}
        ></iframe>
    )
  }

  const yandexInfo = getYandexMusicTrackInfo(resolvedUrl);
  if (yandexInfo) {
      return (
          <iframe
              src={`https://music.yandex.ru/iframe/#track/${yandexInfo.trackId}/${yandexInfo.albumId}`}
              frameBorder="0"
              width="100%"
              height="100"
              title="Yandex Music Player"
              style={{border: 'none', width: '100%', height: '100px'}}
          ></iframe>
      )
  }

  const appleMusicUrl = getAppleMusicInfo(resolvedUrl);
  if (appleMusicUrl) {
      return (
          <iframe
              allow="autoplay *; encrypted-media *; fullscreen *"
              frameBorder="0"
              height="150"
              style={{width: '100%', maxWidth: '660px', overflow: 'hidden', background: 'transparent'}}
              sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
              src={appleMusicUrl}>
          </iframe>
      )
  }

  const deezerInfo = getDeezerInfo(resolvedUrl);
  if (deezerInfo && deezerInfo.type !== 'shortlink') {
      return (
          <iframe
              title="deezer-widget"
              src={`https://widget.deezer.com/widget/auto/${deezerInfo.type}/${deezerInfo.id}`}
              width="100%"
              height="300"
              frameBorder="0"
              allowTransparency={true}
              allow="encrypted-media; clipboard-write">
          </iframe>
      )
  }

  // Fallback for other URLs, including VK Music for now
  return (
    <p>
      Unsupported or unresolved link: <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
    </p>
  );
}; 
