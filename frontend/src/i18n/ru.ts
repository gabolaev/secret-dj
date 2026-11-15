import type { Messages } from './en';
import { ru3 } from './plural';

/**
 * Russian catalogue.
 *
 * Typed as `Messages`, so anything missing — or any function with the wrong
 * arity — fails the build rather than silently showing English.
 */
export const ru: Messages = {
    common: {
        loading: 'Загрузка',
        close: 'Закрыть',
        open: 'Открыть ↗',
    },

    locale: { label: 'Язык', en: 'EN', ru: 'RU' },

    join: {
        tagline: 'Каждый втайне ставит трек. Угадайте, чей какой.',
        nameLabel: 'Ваше имя',
        namePlaceholder: 'DJ Набе',
        codeLabel: 'Код комнаты',
        codePlaceholder: 'K7QM2',
        create: 'Создать свою',
        join: 'Войти в комнату',
        connecting: 'Подключение…',
        reconnecting: 'Переподключение…',
        howItWorks: 'Как это работает',
        genericError: 'Не получилось.',
        findingSeat: 'Ищем ваше место…',
    },

    shell: {
        copyInvite: 'Скопировать приглашение',
        copied: 'Скопировано',
        copyPrompt: 'Скопируйте ссылку-приглашение:',
        rules: 'Правила',
        leave: 'Выйти',
        live: 'в эфире',
        connecting: 'подключение',
        offline: 'нет связи',
    },

    roster: {
        gone: 'вышел',
        away: 'отошёл',
        ready: 'готов',
        scoreTitle: 'Очки',
        theRoom: 'Игроки',
        setlist: 'Сетлист',
        notPlayedYet: '—',
    },

    lobby: {
        queueMore: (n: number) => `Добавьте ещё ${ru3(n, 'трек', 'трека', 'треков')}`,
        setReady: 'Ваши треки',
        hintWaiting: (names: string) => `Ждём: ${names}.`,
        hintWaitingForHost: 'Все готовы. Ждём ведущего.',
        setlistLength: (n: number) => `${ru3(n, 'трек', 'трека', 'треков')} за вечер`,
        settings: 'Настройки комнаты',
        tracksQueued: 'Треков у каждого',
        tracksPlayed: 'Из них сыграет',
        fewer: 'Меньше',
        more: 'Больше',
        guessing: 'Угадывание',
        start: 'Начать вечер',
        needTwo: 'Для угадывания нужно хотя бы два игрока.',
    },

    claims: {
        label: 'Заявка',
        needsPlayers: (n: number) => `Нужно от ${n} игроков`,
        needsGuessing: 'Нужно угадывание',
        evidence: {
            'never-heard': (n: number, of: number) => `${n} из ${of} не слышали`,
            unanimous: (n: number, of: number) => `${n} из ${of} поставили 4+`,
            emotional: (n: number, of: number) => `${n} из ${of} зацепило`,
            'so-me': (n: number, of: number) => `${n} из ${of} вас угадали`,
            'not-me': (n: number, of: number) => `${n} из ${of} подумали на другого`,
            divisive: (n: number, of: number) => `${n} из ${of}`,
        },
        evidenceSpread: (percent: number) => `разброс ${percent}%`,
        spent: 'Уже на другом треке',
        none: {
            title: 'Без заявки',
            blurb: 'Без риска. Сколько дала комната — ваше.',
        },
        'never-heard': {
            title: 'Вы такого не слышали',
            blurb: 'Платит, если трек для комнаты новый.',
        },
        unanimous: {
            title: 'Понравится всем',
            blurb: 'Платит, если все поставят 4+.',
        },
        emotional: {
            title: 'Это вас проймёт',
            blurb: 'Платит, если трек цепляет.',
        },
        'so-me': {
            title: 'Вы поймёте, что это я',
            blurb: 'Платит, если вас угадают.',
        },
        'not-me': {
            title: 'Вы не угадаете, что это я',
            blurb: 'Платит, если вас не угадают.',
        },
        divisive: {
            title: 'Расколет комнату',
            blurb: 'Платит, если оценки разойдутся.',
        },
    },

    url: {
        placeholder: 'Ссылка на Spotify, YouTube, Apple Music…',
        submit: 'Добавить',
        hintInvalid: 'Это пока не ссылка.',
        hintUnsupported: 'С этого сервиса мы не играем.',
        loading: 'Загрузка…',
    },

    tracks: {
        remove: 'Убрать',
        playingNow: 'Играет сейчас',
    },

    round: {
        position: (n: number, total: number) => `Трек ${n} / ${total}`,
        timeLeft: 'Осталось времени',
        lookupFailed: 'Не удалось прочитать ссылку.',

        itWas: 'Это был',
        namedBy: (n: number, of: number) => `угадали ${n}/${of}`,

        yoursTitle: 'Это ваш трек',
        yourClaim: 'Ваша заявка:',
        findingTrack: 'Ищем трек…',
        openIn: (service: string) => `Открыть в ${service} ↗`,
        openLink: 'Открыть ссылку',
        done: 'Готово',
        undone: 'Ещё не готов',
        doneCount: (n: number, total: number) => `Готовы ${n} из ${total}`,
        hostReveal: 'Раскрыть диджея',
        hostNext: 'Следующий трек',
        hostFinish: 'Завершить вечер',
        hostWaiting: 'Ждём, пока все закончат.',
        waitingForNext: 'Ждём ведущего…',
        waitingForReveal: 'Все сделали выбор. Ждём ведущего…',
    },

    answer: {
        likeTitle: 'Насколько понравилось?',
        likeValue: (n: number) => `${n} из 5`,
        // По фразе на каждое число, чтобы оценка значила у всех одно и то же.
        verdicts: ['Совсем никак', 'Не моё', 'Так себе', 'Неплохо', 'Очень хорошо', 'Отлично'],
        heard: 'Слышал раньше',
        heardHint: 'Вы знали этот трек до сегодняшнего вечера?',
        popular: 'Популярный',
        popularHint: 'Это известный трек?',
        moved: 'Зацепило',
        movedHint: 'Трек вас пробрал?',
        unsigned: 'Поставьте оценку, чтобы ответ засчитался.',
    },

    guess: {
        title: 'Чей трек?',
    },

    reveal: {
        correct: 'верно',
        wrong: 'мимо',
        likedIt: (name: string, n: number) => `${name} поставил ${n} из 5`,
        sumLabel: 'Оценки плюс бонусы',
        nobodyAnswered: 'никто не ответил',
        scaleLabel: 'Среднее на весь стол',
        scaleWorking: (total: number, answered: number, listeners: number) =>
            `${total} ÷ ${answered} ответивших × ${listeners} слушателей`,
        nothingToScale: 'нечего пересчитывать',
        dragWorking: (n: number, of: number) => `${n} из ${of} назвали популярным`,
        noClaim: 'без заявки',
        unchanged: 'без изменений',
        newTag: (n: number) => `новинка +${n}`,
        movedTag: (n: number) => `зацепило +${n}`,
        saidNothing: 'промолчал',
        answersTitle: 'Ответы',
        obviousLabel: 'Налог на популярность',
        noDrag: 'популярным никто не назвал',
        silent: (n: number) => `промолчали: ${n}`,
        heardTag: 'слышал',
        popularTag: 'популярный',
        toughCrowd: 'Никто ничего не ответил.',
        answeredSummary: (answered: number, silent: number) =>
            silent > 0 ? `ответили: ${answered} · промолчали: ${silent}` : `ответили: ${answered}`,
        theWorking: 'Как это посчитано',
        claimLabel: 'Заявка',
        roomGave: '♥ Комната',
        djBanked: '★ Диджею',
    },

    finale: {
        thatWasTheNight: 'Вот и всё.',
        roomSummary: (tracks: number, players: number) =>
            `${ru3(tracks, 'трек', 'трека', 'треков')} · ${ru3(players, 'игрок', 'игрока', 'игроков')}`,
        rankedBy: 'Треки',
        starRanksNothing: '♥ комната · ★ диджей',
        notGiven: 'Не вручена',
        copyAll: (n: number) => `Скопировать (${n})`,

        awards: 'Награды',
        takeaway: 'Ваше любимое',
        takeawayEmpty: 'Сегодня вы никому не поставили 4.',
        copyTakeawayHeader: (room: string) => `Secret DJ — любимое из комнаты ${room}`,
        loveTitle: 'Сколько дала комната',
        totalTitle: 'Сколько получил диджей',
        unplayed: 'Не попали в сет',
        leave: 'Выйти из комнаты',
        copyPrompt: 'Скопируйте список:',
    },

    awards: {
        'track-of-the-night': {
            title: 'Трек вечера',
            blurb: 'больше всех ♥ за вечер',
        },
        'deep-cut': {
            title: 'Находка',
            blurb: 'никто не слышал — и зашло',
        },
        'gut-punch': {
            title: 'Под дых',
            blurb: 'зацепил больше всех',
        },
        'human-shazam': {
            title: 'Живой Shazam',
            blurb: 'чаще всех угадывал диджея',
        },
        ghost: {
            title: 'Призрак',
            blurb: 'его не угадали',
        },
    },

    awardValue: {
        points: (n: number) => ru3(n, 'очко', 'очка', 'очков'),
        guesses: (n: number) => `${ru3(n, 'верная догадка', 'верные догадки', 'верных догадок')}`,
        percent: (n: number) => `${n}%`,
        listeners: (n: number) => ru3(n, 'слушатель', 'слушателя', 'слушателей'),
    },

    rules: {
        title: 'Правила',
        oath: 'Отвечайте честно. Что вы слышали и что почувствовали, проверить никто не может, кроме людей рядом. Игра работает, только если это правда.',
        items: [
            {
                head: 'Выбирайте втайне.',
                body: 'Все ставят одинаковое число треков. Сыграют не все — решает случай.',
            },
            {
                head: 'Сделайте заявку.',
                body: 'Ставка на то, как трек подействует на комнату. Сбылась — до ×1,5, нет — ×0,5. Без заявки — без риска.',
            },
            {
                head: 'Оценка 0–5.',
                body: 'Плюс отметки: слышал, популярный, зацепило. Без оценки ответ не считается.',
            },
            {
                head: 'Популярность дорого стоит.',
                body: 'Чем больше людей назовут трек популярным, тем меньше он принесёт — вплоть до половины.',
            },
            {
                head: 'Угадайте диджея.',
                body: 'Назовите, чей это трек. Угадали — очко вам.',
            },
        ],
        claimsTitle: 'Заявки',
        claimsBody: 'Каждая — раз за вечер. Сбылась полностью ×1,5, наполовину ×1, совсем нет ×0,5.',
        scoring: {
            title: 'Очки',
            addTitle: 'Каждый слушатель даёт',
            add: [
                { what: 'Свою оценку', points: '0–5' },
                { what: 'Не слышал раньше', points: '+1' },
                { what: 'Зацепило', points: '+2' },
            ],
            addNote: 'Среднее, умноженное на число слушателей, — молчание диджею не вредит.',
            obviousTitle: 'Потом налог на популярность',
            obviousBody: 'Никто не отметил — без изменений. Половина — −25%. Все — −50%.',
            claimTitle: 'Потом заявка',
            claimBody: 'Умножает то, что осталось. Без заявки — без изменений.',
            guessLine: { what: 'Вы угадали диджея', points: '+1' },
            example: '4 слушателя: 5, 4, 4, 3 = 16. Никто не слышал: +4 → 20. Двоих зацепило: +4 → 24. Популярным не назвал никто: 24. «Вы такого не слышали» сбылась: ×1,5 → 36.',
        },
        note: 'Ведущий начинает игру и переключает раунды. Если он уйдёт, его место займёт другой.',
    },

    feed: {
        joined: (name: string) => `${name} присоединился`,
        left: (name: string) => `${name} вышел`,
        hostChanged: (name: string) => `${name} теперь ведущий`,
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
        ROUND_NOT_READY: 'Кто-то в комнате ещё не закончил.',
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
        CLAIM_INVALID: 'Такую заявку сделать нельзя.',
        CLAIM_SPENT: 'Эта заявка уже стоит на другом вашем треке.',
        CLAIM_UNAVAILABLE: 'Для этой заявки нужен стол побольше или включённое угадывание.',
        ANSWER_OWN_TRACK: 'Отвечать про свой трек — жульничество и немного грустно.',
        RATING_INVALID: 'Оценка — это целое число от нуля до пяти.',
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
