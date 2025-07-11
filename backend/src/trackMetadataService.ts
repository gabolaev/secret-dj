import fetch from 'node-fetch';
import { getMusicService } from '../../common/dist/musicServices.js';

export interface TrackMetadata {
    title: string;
    artist?: string;
    duration?: number;
    thumbnail?: string;
    service: string;
}

export class TrackMetadataService {
    private static instance: TrackMetadataService;
    private cache: Map<string, TrackMetadata> = new Map();

    static getInstance(): TrackMetadataService {
        if (!TrackMetadataService.instance) {
            TrackMetadataService.instance = new TrackMetadataService();
        }
        return TrackMetadataService.instance;
    }

    async getTrackMetadata(url: string): Promise<TrackMetadata | null> {
        // Check cache first
        if (this.cache.has(url)) {
            return this.cache.get(url)!;
        }

        const service = getMusicService(url);
        if (!service) {
            return null;
        }

        try {
            let metadata: TrackMetadata | null = null;

            switch (service.name) {
                case 'YouTube':
                    metadata = await this.getYouTubeMetadata(url);
                    break;
                case 'Spotify':
                    metadata = await this.getSpotifyMetadata(url);
                    break;
                case 'SoundCloud':
                    metadata = await this.getSoundCloudMetadata(url);
                    break;
                case 'Deezer':
                    metadata = await this.getDeezerMetadata(url);
                    break;
                default:
                    // For other services, try to extract basic info from the URL
                    metadata = this.extractBasicMetadata(url, service.name);
            }

            if (metadata) {
                this.cache.set(url, metadata);
            }

            return metadata;
        } catch (error) {
            console.error(`Error fetching metadata for ${url}:`, error);
            return null;
        }
    }

    private async getYouTubeMetadata(url: string): Promise<TrackMetadata | null> {
        try {
            // Extract video ID from YouTube URL
            const videoId = this.extractYouTubeVideoId(url);
            if (!videoId) return null;

            // Use YouTube Data API v3 (requires API key in production)
            // For now, we'll use a simple oEmbed approach
            const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;

            const response = await fetch(oembedUrl);
            if (!response.ok) return null;

            const data = await response.json() as any;

            return {
                title: data.title || 'Unknown Title',
                thumbnail: data.thumbnail_url,
                service: 'YouTube'
            };
        } catch (error) {
            console.error('YouTube metadata fetch error:', error);
            return null;
        }
    }

    private async getSpotifyMetadata(url: string): Promise<TrackMetadata | null> {
        try {
            // For Spotify, we can use their oEmbed API
            const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;

            const response = await fetch(oembedUrl);
            if (!response.ok) {
                // Fallback to basic metadata if oEmbed fails
                console.warn(`Spotify oEmbed request failed for ${url}. Status: ${response.status}`);
                return this.extractBasicMetadata(url, 'Spotify');
            }

            const data = await response.json() as any;

            // Spotify oEmbed usually has a title, but artist might not be a separate field.
            // It's often in the title itself.
            return {
                title: data.title || 'Unknown Title',
                artist: data.author_name, // This field might not exist but good to have
                thumbnail: data.thumbnail_url,
                service: 'Spotify'
            };
        } catch (error) {
            console.error('Spotify metadata fetch error:', error);
            // Fallback to basic extraction on error
            return this.extractBasicMetadata(url, 'Spotify');
        }
    }

    private async getSoundCloudMetadata(url: string): Promise<TrackMetadata | null> {
        try {
            // SoundCloud oEmbed API
            const oembedUrl = `https://soundcloud.com/oembed?url=${encodeURIComponent(url)}&format=json`;

            const response = await fetch(oembedUrl);
            if (!response.ok) return null;

            const data = await response.json() as any;

            return {
                title: data.title || 'Unknown Title',
                thumbnail: data.thumbnail_url,
                service: 'SoundCloud'
            };
        } catch (error) {
            console.error('SoundCloud metadata fetch error:', error);
            return null;
        }
    }

    private async getDeezerMetadata(url: string): Promise<TrackMetadata | null> {
        try {
            // Extract track ID from Deezer URL
            const trackId = this.extractDeezerTrackId(url);
            if (!trackId) {
                console.warn(`Could not extract track ID from Deezer URL: ${url}`);
                return this.extractBasicMetadata(url, 'Deezer');
            }

            // Deezer doesn't have a public oEmbed API, so we'll use their public API
            // Note: This is a simplified approach. In production, you might want to use
            // Deezer's official API with proper authentication
            const apiUrl = `https://api.deezer.com/track/${trackId}`;
            
            const response = await fetch(apiUrl);
            if (!response.ok) {
                console.warn(`Deezer API request failed for ${url}. Status: ${response.status}`);
                return this.extractBasicMetadata(url, 'Deezer');
            }

            const data = await response.json() as any;

            // Check if the API returned an error
            if (data.error) {
                console.warn(`Deezer API error for track ${trackId}:`, data.error);
                return this.extractBasicMetadata(url, 'Deezer');
            }

            return {
                title: data.title || 'Unknown Title',
                artist: data.artist?.name,
                thumbnail: data.album?.cover_medium,
                duration: data.duration,
                service: 'Deezer'
            };
        } catch (error) {
            console.error('Deezer metadata fetch error:', error);
            // Fallback to basic extraction on error
            return this.extractBasicMetadata(url, 'Deezer');
        }
    }

    private extractBasicMetadata(url: string, serviceName: string): TrackMetadata {
        // Extract basic info from URL for services we can't easily fetch metadata from
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);

        let title = 'Unknown Track';
        if (pathParts.length > 0) {
            // Try to extract a meaningful title from the URL path
            const lastPart = pathParts[pathParts.length - 1];
            if (lastPart && lastPart !== 'track' && lastPart !== 'album') {
                title = decodeURIComponent(lastPart)
                    .replace(/[-_]/g, ' ')
                    .replace(/\b\w/g, l => l.toUpperCase());
            }
        }

        return {
            title,
            service: serviceName
        };
    }

    private extractYouTubeVideoId(url: string): string | null {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /youtube\.com\/v\/([^&\n?#]+)/,
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return match[1];
            }
        }

        return null;
    }

    private extractDeezerTrackId(url: string): string | null {
        // Deezer URL patterns:
        // https://www.deezer.com/us/track/123456789
        // https://deezer.com/track/123456789
        // https://www.deezer.com/track/123456789
        const patterns = [
            /deezer\.com\/[a-z]{2}\/track\/(\d+)/,
            /deezer\.com\/track\/(\d+)/,
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return match[1];
            }
        }

        return null;
    }

    // Clear cache (useful for testing or memory management)
    clearCache(): void {
        this.cache.clear();
    }

    // Get cache size (useful for monitoring)
    getCacheSize(): number {
        return this.cache.size;
    }
} 
