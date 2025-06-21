export interface MusicService {
    name: string
    pattern: RegExp
}

export const musicServices: MusicService[] = [
    {
        name: 'Spotify',
        pattern: /spotify\.com/,
    },
    {
        name: 'YouTube',
        pattern: /youtube\.com|youtu\.be/,
    },
    {
        name: 'Deezer',
        pattern: /deezer\.com/,
    },
    {
        name: 'Apple Music',
        pattern: /music\.apple\.com/,
    },
    {
        name: 'SoundCloud',
        pattern: /soundcloud\.com/,
    },
    {
        name: 'Yandex Music',
        pattern: /music\.yandex\.ru/,
    },
    {
        name: 'YouTube Music',
        pattern: /music\.youtube\.com/,
    }
]

export const getMusicService = (url: string): MusicService | null => {
    if (!url) return null
    return musicServices.find(s => s.pattern.test(url)) || null
} 
