import spotifyLogo from '../assets/spotify.svg'
import youtubeLogo from '../assets/youtube.svg'
import deezerLogo from '../assets/deezer.svg'
import appleLogo from '../assets/apple.svg'
import soundcloudLogo from '../assets/soundcloud.svg'
import yandexLogo from '../assets/yandex.svg'
import youtubeMusicLogo from '../assets/youtube_music.svg'

export interface MusicService {
    name: string
    logo: string
    pattern: RegExp
    color: string
}

export const musicServices: MusicService[] = [
    {
        name: 'Spotify',
        logo: spotifyLogo,
        pattern: /spotify\.com/,
        color: '#1DB954'
    },
    {
        name: 'YouTube',
        logo: youtubeLogo,
        pattern: /youtube\.com|youtu\.be/,
        color: '#FF0000'
    },
    {
        name: 'Deezer',
        logo: deezerLogo,
        pattern: /deezer\.com/,
        color: '#00C7F2'
    },
    {
        name: 'Apple Music',
        logo: appleLogo,
        pattern: /music\.apple\.com/,
        color: '#FA243C'
    },
    {
        name: 'SoundCloud',
        logo: soundcloudLogo,
        pattern: /soundcloud\.com/,
        color: '#FF7700'
    },
    {
        name: 'Yandex Music',
        logo: yandexLogo,
        pattern: /music\.yandex\.ru/,
        color: '#FF0000'
    },
    {
        name: 'YouTube Music',
        logo: youtubeMusicLogo,
        pattern: /music\.youtube\.com/,
        color: '#FF0000'
    }
]

export const getMusicService = (url: string): MusicService | null => {
    if (!url) return null
    return musicServices.find(s => s.pattern.test(url)) || null
} 
