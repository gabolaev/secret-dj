import type { Messages } from './en';
import { ru3, ru3Word } from './plural';

/**
 * Russian catalogue.
 *
 * Typed as `Messages`, so anything missing — or any function with the wrong
 * arity — fails the build rather than silently showing English.
 */
export const ru: Messages = {
    brand: { name: 'Secret', accent: 'DJ' },

    common: {
        loading: 'Загрузка',
        close: 'Закрыть',
        copy: 'Скопировать',
        open: 'открыть ↗',
        you: 'вы',
        host: 'Ведущий',
        nothingYet: 'Пока пусто.',
    },

    locale: { label: 'Язык', en: 'EN', ru: 'RU' },

    join: {
        tagline:
            'Каждый втайне ставит трек в очередь. Комната тратит свои сердца и пытается угадать, кто его включил.',
        nameLabel: 'Ваше имя',
        namePlaceholder: 'DJ Полночь',
        codeLabel: 'Код комнаты',
        codeOptional: 'необязательно',
        codePlaceholder: 'например, K7QM2',
        create: 'Создать комнату',
        join: 'Войти в комнату',
        connecting: 'Подключение…',
        reconnecting: 'Переподключение…',
        howItWorks: 'Как это работает',
        genericError: 'Не получилось.',
        services:
            'Работает со Spotify, YouTube, Apple Music, Deezer, SoundCloud, TIDAL, Bandcamp и Яндекс Музыкой.',
        findingSeat: 'Ищем ваше место…',
    },

    shell: {
        room: 'комната',
        copyInvite: 'скопировать',
        copied: 'скопировано!',
        copyPrompt: 'Скопируйте ссылку-приглашение:',
        rules: 'Правила',
        leave: 'Выйти',
        live: 'в эфире',
        connecting: 'подключение',
        offline: 'нет связи',
    },

    roster: {
        inTheRoom: 'В комнате',
        yourQueue: 'Ваша очередь',
        played: 'Сыграно',
        playlist: 'Плейлист',
        ready: 'готов',
        away: 'отошёл',
        gone: 'вышел',
        thinking: 'думает',
        lockedIn: 'решил',
        onTheDecks: 'за вертушками',
        selectorTitle: 'Селектор — любовь, которую собрали ваши треки',
        detectiveTitle: 'Детектив — догадки и подставы',
    },

    lobby: {
        queueMore: (n: number) => `Добавьте ещё ${ru3(n, 'трек', 'трека', 'треков')}`,
        setReady: 'Ваш сет готов',
        hintSecret: 'Никто не видит, что вы выбрали, — ни сейчас, ни потом.',
        hintWaiting: (names: string) => `Ждём: ${names}.`,
        hintHostCanStart: 'Все готовы. Опускайте иглу, когда захотите.',
        hintWaitingForHost: 'Все готовы. Ждём, когда ведущий начнёт.',
        emptyQueue: 'Пока ничего. Вставьте ссылку выше.',
        title: 'Разогрев',
        settings: 'Настройки комнаты',
        willPlay: (n: number) => `сыграет ${n}`,
        tracksQueued: 'Треков в очереди у каждого',
        tracksQueuedHint: 'В очереди больше, чем сыграет, — так никто не сосчитает, у кого треки кончились.',
        tracksPlayed: 'Сколько сыграет',
        tracksPlayedHint: (total: number) => `Сейчас в сет-листе ${ru3(total, 'трек', 'трека', 'треков')}.`,
        fewer: 'Меньше',
        more: 'Больше',
        guessing: 'Угадывание',
        guessingOn: 'Угадывайте диджея, ставьте подставы и набирайте очки на доске Детектива.',
        guessingOff: 'Вечеринка прослушивания: только сердца, без угадывания и доски Детектива.',
        start: 'Начать вечер',
        needTwo: 'Для угадывания нужно хотя бы два диджея — позовите кого-нибудь или включите режим прослушивания.',
        stillQueueing: (names: string) => `Ещё выбирают: ${names}.`,
    },

    url: {
        placeholder: 'Вставьте ссылку на Spotify, YouTube, Apple Music…',
        submit: 'В очередь',
        hintEmpty: 'Можно что угодно — чем неожиданнее, тем лучше.',
        hintInvalid: 'Это пока не похоже на ссылку.',
        hintUnsupported:
            'Этот сервис мы не проигрываем. Попробуйте Spotify, YouTube, Apple Music, Deezer, SoundCloud, TIDAL или Яндекс.',
        hintLooking: 'Ищем информацию…',
        hintGood: 'Отлично.',
        hintReady: 'Можно добавлять.',
        loading: 'Загрузка…',
    },

    tracks: {
        remove: 'Убрать',
        playingNow: 'Играет сейчас',
    },

    round: {
        position: (n: number, total: number) => `Трек ${n} из ${total}`,
        titleMine: 'Ваш',
        findingTrack: 'Ищем трек…',
        openIn: (service: string) => `Открыть в ${service} ↗`,
        openLink: 'Открыть ссылку',
        hearts: (n: number) => ru3(n, 'сердце', 'сердца', 'сердец'),
        anthems: (n: number) => ru3(n, 'гимн', 'гимна', 'гимнов'),
        voted: (n: number, total: number) => `проголосовали ${n}/${total}`,
        hostReveal: 'Раскрыть диджея',
        hostNext: 'Следующий трек',
        hostFinish: 'Завершить вечер',
        hostWaitingVotes: (n: number) =>
            `Ждём ещё ${ru3(n, 'голос', 'голоса', 'голосов')} — можно раскрыть и так, если кто-то отошёл.`,
        waitingForNext: 'Ждём, когда ведущий поставит следующий трек…',
        waitingForReveal: 'Все проголосовали. Ждём раскрытия ведущим…',
    },

    react: {
        title: 'Заберёте себе?',
        pass: 'Пропустить',
        heart: 'Сердце',
        anthem: 'Гимн',
        walletHearts: (left: number, budget: number) =>
            `Осталось ${left} из ${budget} ${ru3Word(budget, 'сердца', 'сердец', 'сердец')}`,
        walletAnthemLeft: 'Гимн ещё при вас',
        walletAnthemGone: 'Гимн уже потрачен',
        outOfHearts: 'Сердца кончились — берегите их или тратьте гимн.',
        anthemGone: 'Гимн даётся только один за вечер.',
    },

    guess: {
        title: 'Чей трек?',
    },

    decoy: {
        title: 'Свалить на',
        none: 'Никого',
    },

    reveal: {
        queuedBy: 'Этот трек поставил',
        guessSummary: (correct: number, total: number) =>
            `Угадали ${correct} из ${ru3(total, 'голоса', 'голосов', 'голосов')}.`,
        noGuessing: 'Сегодня без угадывания — только сердца.',
        correct: 'верно',
        wrong: 'мимо',
        fooled: 'попался на подставу',
        decoyWas: (name: string) => `Подстава: ${name}`,
        decoyHits: (n: number) => `попались: ${ru3(n, 'слушатель', 'слушателя', 'слушателей')}`,
        heartsTitle: 'Сердца',
        toughCrowd: 'Сегодня строгая публика.',
        anthemFrom: (name: string) => `${name} потратил здесь свой гимн`,
        points: (n: number) => `+${n}`,
    },

    finale: {
        summary: (tracks: number, points: number) =>
            `${ru3(tracks, 'трек', 'трека', 'треков')}, роздано ${ru3(points, 'очко', 'очка', 'очков')} любви`,
        sub: 'Ничья очередь не была видна. Теперь видно всё.',
        awards: 'Награды',
        selectorBoard: 'Селектор',
        selectorBlurb: 'Что ваш вкус сделал с комнатой',
        detectiveBoard: 'Детектив',
        detectiveBlurb: 'Что вы сделали с людьми',
        setlist: 'Сет-лист',
        unplayed: 'Те, что не сыграли',
        leave: 'Выйти из комнаты',
        copyHeader: (room: string) => `Secret DJ — комната ${room}`,
        copyPrompt: 'Скопируйте сет-лист вечера:',
    },

    awards: {
        'crowd-favourite': {
            title: 'Любимец публики',
            blurb: 'Собрал больше всего любви за вечер',
        },
        'track-of-the-night': {
            title: 'Трек вечера',
            blurb: 'Один трек, который зацепил сильнее всех',
        },
        'golden-ear': {
            title: 'Золотое ухо',
            blurb: 'Потратил гимн на трек, который того стоил',
        },
        'human-shazam': {
            title: 'Живой Shazam',
            blurb: 'Чаще всех угадывал диджея',
        },
        ghost: {
            title: 'Призрак',
            blurb: 'Прошёл мимо комнаты неузнанным',
        },
        'puppet-master': {
            title: 'Кукловод',
            blurb: 'Отправил больше всех по ложному следу',
        },
    },

    awardValue: {
        points: (n: number) => ru3(n, 'очко', 'очка', 'очков'),
        hearts: (n: number) => ru3(n, 'сердце', 'сердца', 'сердец'),
        guesses: (n: number) => `${ru3(n, 'верная догадка', 'верные догадки', 'верных догадок')}`,
        percent: (n: number) => `узнан в ${n}% случаев`,
        listeners: (n: number) => ru3(n, 'слушатель', 'слушателя', 'слушателей'),
    },

    rules: {
        title: 'Правила',
        items: [
            {
                head: 'Выбирайте втайне.',
                body: 'Каждый ставит в очередь одинаковое число треков, а сыграет только часть — выбранная случайно. Чужую очередь не видит никто.',
            },
            {
                head: 'Тратьте сердца.',
                body: 'На весь вечер их ограниченное число, поэтому от чего-то придётся отказаться. Сердце — это +1 диджею.',
            },
            {
                head: 'Один гимн.',
                body: 'Ровно один за вечер, стоит +3. Потратьте его на трек, о котором будете думать завтра.',
            },
            {
                head: 'Угадайте диджея.',
                body: 'Все, кроме диджея, выбирают имя. Передумывать можно сколько угодно — ничего не фиксируется до раскрытия.',
            },
            {
                head: 'Поставьте подставу.',
                body: 'Пока играет ваш трек, втайне выберите, на кого свалить. +1 за каждого, кто попадётся.',
            },
            {
                head: 'Две таблицы.',
                body: 'Селектор считает любовь к вашим трекам. Детектив — ваши догадки и подставы. Они не смешиваются.',
            },
        ],
        note: 'Темп задаёт ведущий: он начинает игру, раскрывает каждый раунд и идёт дальше. Если ведущий пропадёт, корона перейдёт другому автоматически.',
    },

    feed: {
        joined: (name: string) => `${name} присоединился`,
        left: (name: string) => `${name} вышел`,
        hostChanged: (name: string) => `${name} теперь ведущий`,
        anthemSpent: 'Кто-то только что потратил свой гимн',
        finished: 'Вот и всё — результаты готовы',
    },

    errors: {
        BAD_REQUEST: 'Непонятный запрос.',
        GAME_NOT_FOUND: 'Комнаты с таким кодом нет. Проверьте написание.',
        GAME_FULL: 'Комната заполнена.',
        GAME_ALREADY_STARTED: 'Игра уже идёт.',
        NAME_TAKEN: 'В этой комнате уже есть игрок с таким именем.',
        NAME_INVALID: 'Имя из 2–20 букв, цифр, пробелов или - _ . апострофа.',
        SESSION_INVALID: 'Ваше место истекло. Войдите заново.',
        NOT_AUTHENTICATED: 'Вы ещё не в комнате.',
        NOT_HOST: 'Это может только ведущий.',
        WRONG_PHASE: 'Сейчас так нельзя.',
        NOT_READY: 'Сначала все должны собрать очередь.',
        NOT_ENOUGH_PLAYERS: 'Для угадывания нужно хотя бы два диджея. Позовите кого-нибудь или включите режим прослушивания.',
        TRACK_LIMIT_REACHED: 'Вы уже добавили все свои треки.',
        TRACK_DUPLICATE: 'Этот трек уже есть в игре.',
        TRACK_UNSUPPORTED: 'Эту ссылку мы проиграть не можем.',
        TRACK_URL_INVALID: 'Ссылка не подходит.',
        TRACK_NOT_FOUND: 'Такого трека в вашей очереди нет.',
        VOTE_NOT_ALLOWED: 'В этом раунде вы не голосуете.',
        VOTE_OWN_TRACK: 'Это ваш трек. Просто наслаждайтесь.',
        VOTE_INVALID_TARGET: 'За этого игрока голосовать нельзя.',
        REACT_OWN_TRACK: 'Ставить сердце своему треку — жульничество и немного грустно.',
        OUT_OF_HEARTS: 'Сердца на сегодня кончились. Тратьте с умом.',
        ANTHEM_SPENT: 'Гимн даётся один за вечер, и ваш уже потрачен.',
        DECOY_NOT_DJ: 'Подставу ставит только диджей.',
        DECOY_INVALID_TARGET: 'Выберите кого-то другого в комнате.',
        RATE_LIMITED: 'Помедленнее.',
        INTERNAL: 'У нас что-то сломалось.',
        TIMEOUT: 'Сервер не ответил. Проверьте соединение.',
    },

    embed: {
        'unrecognised-link': 'Не узнаём эту ссылку.',
        'missing-youtube-id': 'В ссылке YouTube нет идентификатора видео.',
        'missing-spotify-id': 'В ссылке нет идентификатора Spotify.',
        'missing-deezer-id': 'В ссылке нет идентификатора Deezer.',
        'missing-apple-id': 'В ссылке нет идентификатора Apple Music.',
        'missing-yandex-id': 'Ссылке Яндекса нужен альбом или трек.',
        'missing-tidal-id': 'В ссылке нет идентификатора TIDAL.',
        'external-only': 'Это откроется в отдельной вкладке.',
    },
};
