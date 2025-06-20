import React, { useEffect, useState } from 'react';

interface TrackPlayerProps {
  url: string;
}

// This function is a placeholder. In a real-world scenario, to avoid CORS issues
// and reliably resolve redirecting URLs (like link.deezer.com or spotify.link),
// you would implement a backend endpoint that handles the URL fetching.
async function resolveUrl(url: string): Promise<string> {
    console.log(`Resolving URL: ${url}`);
    // For now, we'll just return the original URL, as client-side fetching is unreliable.
    return url;
}

export const TrackPlayer: React.FC<TrackPlayerProps> = ({ url }) => {
  const [embedConfig, setEmbedConfig] = useState<{ src: string; height: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generateEmbed = async (trackUrl: string) => {
      try {
        const resolvedUrl = await resolveUrl(trackUrl);
        let config: { src: string; height: string } | null = null;

        const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/]{11})/;
        const youtubeMatch = resolvedUrl.match(youtubeRegex);

        if (youtubeMatch && youtubeMatch[1]) {
          const videoId = youtubeMatch[1];
          config = {
            src: `https://www.youtube-nocookie.com/embed/${videoId}`,
            height: '315'
          };
        } else if (resolvedUrl.includes('spotify.com')) {
          const spotifyUri = new URL(resolvedUrl).pathname.split('/').pop();
          config = {
            src: `https://open.spotify.com/embed/track/${spotifyUri}`,
            height: '152'
          };
        } else if (resolvedUrl.includes('deezer.com')) {
          const deezerId = new URL(resolvedUrl).pathname.split('/').pop();
          config = {
            src: `https://widget.deezer.com/widget/dark/track/${deezerId}`,
            height: '152'
          };
        } else if (resolvedUrl.includes('soundcloud.com')) {
          config = {
            src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(resolvedUrl)}&color=%23e8b4a0&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=true`,
            height: '166'
          };
        } else if (resolvedUrl.includes('apple.com')) {
          const urlObject = new URL(resolvedUrl);
          const country = urlObject.pathname.split('/')[1] || 'us';
          const i = urlObject.searchParams.get('i');
          if (i) {
            // Simplified embed URL for Apple Music
            config = {
              src: `https://embed.music.apple.com/${country}/album/_?i=${i}`,
              height: '170'
            };
          }
        } else if (resolvedUrl.includes('music.yandex.ru')) {
          const pathParts = resolvedUrl.split('/');
          const albumId = pathParts[pathParts.indexOf('album') + 1];
          const trackId = pathParts[pathParts.indexOf('track') + 1];
          config = {
            src: `https://music.yandex.ru/iframe/#track/${trackId}/${albumId}/`,
            height: '152'
          };
        }

        if (config) {
          setEmbedConfig(config);
          setError(null);
        } else {
          setError('Unsupported music service or invalid URL.');
          setEmbedConfig(null);
        }
      } catch (e) {
        console.error("Error parsing URL: ", e);
        setError('Could not parse or load the provided URL.');
        setEmbedConfig(null);
      }
    };

    generateEmbed(url);
  }, [url]);

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!embedConfig) {
    return (
        <div className="loading">
            <div className="loading-spinner"></div>
            Loading player...
        </div>
    );
  }

  return (
    <iframe
      title="Track Player"
      src={embedConfig.src}
      width="100%"
      height={embedConfig.height}
      frameBorder="0"
      allow="encrypted-media; clipboard-write; fullscreen; picture-in-picture"
      sandbox="allow-scripts allow-same-origin allow-presentation"
      allowFullScreen
      style={{ 
        minHeight: '150px', 
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)'
      }}
    ></iframe>
  );
}; 
