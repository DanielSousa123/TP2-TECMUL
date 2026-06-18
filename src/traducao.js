const STORAGE_KEY = 'tp2_language';
 
const dictionaries = {
    pt: {
        start: 'COMEÇAR',
        settings: 'DEFINIÇÕES',
        rules: 'REGRAS',
        ranking: 'RANKING',
        subtitle: 'Uma Aventura no Faroeste',
        name: 'Nome:',
        namePlaceholder: 'Nome (opcional)',
        score: 'Pontos',
        coins: 'Moedas',
        noScores: 'Sem pontuações',
        close: 'Fechar',
        volume: 'Volume',
        language: 'Idioma',
        portuguese: 'Português',
        english: 'Inglês',
        muted: 'MUDO',
        gameOver: 'FIM DE JOGO',
        finalScore: 'Pontuação',
        tryAgain: 'TENTAR DE NOVO',
        mainMenu: 'MENU PRINCIPAL',
        howTo: 'Salta com ESPAÇO ou Seta Cima. Evita obstáculos e apanha moedas.',
        player: 'Player',
        position: 'POS',
        playerColumn: 'NOME',
        scoreColumn: 'PONTOS',
        coinsColumn: 'MOEDAS',
        highestScore: 'Recorde',
        shop: 'LOJA',
        deadeye: 'Olho da Morte',
        deadeyeDesc: 'Abranda o jogo 8 segundos (tecla F)',
        doubleLife: 'Dupla Vida',
        doubleLifeDesc: 'Revive e continua a pontuar',
        owned: 'Tens',
        buyFailed: 'Moedas insuficientes!'
    },
    en: {
        start: 'START',
        settings: 'SETTINGS',
        rules: 'RULES',
        ranking: 'RANKING',
        subtitle: 'A Wild West Adventure',
        name: 'Name:',
        namePlaceholder: 'Name (optional)',
        score: 'Score',
        coins: 'Coins',
        noScores: 'No scores yet',
        close: 'Close',
        volume: 'Volume',
        language: 'Language',
        portuguese: 'Portuguese',
        english: 'English',
        muted: 'MUTE',
        gameOver: 'GAME OVER',
        finalScore: 'Score',
        tryAgain: 'TRY AGAIN',
        mainMenu: 'MAIN MENU',
        howTo: 'Jump with SPACE or Up Arrow. Avoid obstacles and collect coins.',
        player: 'Player',
        position: 'POS',
        playerColumn: 'NAME',
        scoreColumn: 'SCORE',
        coinsColumn: 'COINS',
        highestScore: 'Highest Score',
        shop: 'SHOP',
        deadeye: 'Deadeye',
        deadeyeDesc: 'Slows game for 8 seconds (F key)',
        doubleLife: 'Double Life',
        doubleLifeDesc: 'Revive and keep your score',
        owned: 'Owned',
        buyFailed: 'Not enough coins!'
    }
};
 
export function getLanguage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'en' ? 'en' : 'pt';
}
 
export function setLanguage(language) {
    localStorage.setItem(STORAGE_KEY, language === 'en' ? 'en' : 'pt');
}
 
export function t(key) {
    const language = getLanguage();
    return dictionaries[language][key] || dictionaries.pt[key] || key;
}
 