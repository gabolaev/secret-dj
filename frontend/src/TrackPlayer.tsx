import React, { useEffect, useState } from 'react';

interface TrackPlayerProps {
  url: string;
}

// Function to resolve redirecting URLs, e.g. from link.deezer.com
async function resolveUrl(url: string): Promise<string> {
    // In a real app, this might be an API call to a backend to avoid CORS issues
    // For this component, we'll assume a simple fetch can resolve it if needed.
    // This is a simplified placeholder.
    if (url.includes('link.deezer.com') || url.includes('spotify.link')) {
        try {
            // This will likely fail in the browser due to CORS.
            // A backend endpoint is the proper solution.
            const response = await fetch(`/resolve-url?url=${encodeURIComponent(url)}`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            return data.resolvedUrl;
        } catch (error) {
            console.error("Could not resolve URL:", error);
            // Fallback to original URL if resolution fails
            return url;
        }
    }
    return url;
}

export const TrackPlayer: React.FC<TrackPlayerProps> = ({ url }) => {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generateEmbedUrl = async (trackUrl: string) => {
      try {
        const resolvedUrl = await resolveUrl(trackUrl);
        let finalEmbedUrl: string | null = null;

        if (resolvedUrl.includes('youtube.com') || resolvedUrl.includes('youtu.be')) {
          const videoId = new URL(resolvedUrl).searchParams.get('v') || resolvedUrl.split('/').pop();
          finalEmbedUrl = `https://www.youtube.com/embed/${videoId}`;
        } else if (resolvedUrl.includes('spotify.com')) {
          const spotifyUri = new URL(resolvedUrl).pathname.split('/').pop();
          finalEmbedUrl = `https://open.spotify.com/embed/track/${spotifyUri}`;
        } else if (resolvedUrl.includes('deezer.com')) {
          const deezerId = new URL(resolvedUrl).pathname.split('/').pop();
          finalEmbedUrl = `https://widget.deezer.com/widget/dark/track/${deezerId}`;
        } else if (resolvedUrl.includes('apple.com')) {
          // Apple Music links are often complex. This is a simplified pattern.
          // e.g. https://music.apple.com/us/album/bohemian-rhapsody/1440841428?i=1440841433
          const urlObject = new URL(resolvedUrl);
          const pathParts = urlObject.pathname.split('/');
          const country = pathParts[1];
          const i = urlObject.searchParams.get('i');
          if (country && i) {
            finalEmbedUrl = `https://embed.music.apple.com/${country}/album/a/0?i=${i}`;
          }
        } else if (resolvedUrl.includes('music.yandex.ru')) {
          const pathParts = resolvedUrl.split('/');
          const albumId = pathParts[pathParts.indexOf('album') + 1];
          const trackId = pathParts[pathParts.indexOf('track') + 1];
          finalEmbedUrl = `https://music.yandex.ru/iframe/#track/${trackId}/${albumId}/`;
        }

        if (finalEmbedUrl) {
          setEmbedUrl(finalEmbedUrl);
          setError(null);
        } else {
          setError('Unsupported music service or invalid URL.');
          setEmbedUrl(null);
        }
      } catch {
        setError('Could not parse or load the provided URL.');
        setEmbedUrl(null);
      }
    };

    generateEmbedUrl(url);
  }, [url]);

  if (error) {
    return <div style={{ color: 'red' }}>Error: {error}</div>;
  }

  if (!embedUrl) {
    return <div>Loading player...</div>;
  }

  return (
    <iframe
      title="Track Player"
      src={embedUrl}
      width="100%"
      height="380"
      frameBorder="0"
      allow="encrypted-media; clipboard-write; fullscreen; picture-in-picture"
      allowFullScreen
      style={{ minHeight: '120px' }}
    ></iframe>
  );
}; 
