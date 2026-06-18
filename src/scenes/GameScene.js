import Phaser from 'phaser';
import { t } from '../traducao.js';
import ParallaxManager from './ParallaxManager.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    // Pré-carregamento de recursos (imagens, sons, spritesheets)
    preload() {
        this._parallax = new ParallaxManager(this);
        this._parallax.preload();

        // Spritesheet do jogador a correr
        if (!this.textures.exists('player')) {
            this.load.spritesheet('player', 'assets/images/Sprite-0001.png', {
                frameWidth: 96,
                frameHeight: 96
            });
        }
        // Imagens do salto (subida e descida)
        if (!this.textures.exists('playerJumpUp')) {
            this.load.image('playerJumpUp', 'assets/images/Sprite-jump.png');
        }
        if (!this.textures.exists('playerJumpDown')) {
            this.load.image('playerJumpDown', 'assets/images/Sprite-down.png');
        }

        // 4 variantes de cactos
        for (let i = 1; i <= 4; i++) {
            if (!this.textures.exists(`cactus${i}`)) {
                this.load.image(`cactus${i}`, `assets/Cactus/${i}.png`);
            }
        }

        // Imagem do deslize
        if (!this.textures.exists('playerSlide')) {
            this.load.image('playerSlide', 'assets/images/Sprite-slide.png');
        }

        // 7 frames do pássaro a voar
        for (let i = 1; i <= 7; i++) {
            if (!this.textures.exists(`bird${i}`)) {
                this.load.image(`bird${i}`, `assets/bird flying/${i}.png`);
            }
        }

        // Sons
        this.load.audio('gameMusic', 'assets/music/gamemusic.mp3');
        this.load.audio('coinCollectSound', 'assets/music/coin_collect_sound.mp3');

        // Ícones dos itens da loja
        if (!this.textures.exists('wine_deadeye')) {
            this.load.image('wine_deadeye', 'assets/images/wine_deadeye.png');
        }
        if (!this.textures.exists('health_potion')) {
            this.load.image('health_potion', 'assets/images/health_potion.png');
        }

        // Spritesheet da moeda
        this.load.spritesheet('coin', 'assets/images/coin.png', {
            frameWidth: 16,
            frameHeight: 16
        });
    }

    // Inicialização da cena
    create() {

        // Teclas de deslize e deadeye
        this.slideKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.downKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
        this.deadeyeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);

        // Inventário de itens (carregado do localStorage)
        this._deadeyeCount = parseInt(localStorage.getItem('tp2_deadeye_count')) || 0;
        this._doubleLifeCount = parseInt(localStorage.getItem('tp2_doublelife_count')) || 0;
        this._isDeadeye = false;
        this._doubleLifeUsed = false;

        // Animações

        // Animação da moeda a girar
        this.anims.create({
            key: 'coinSpin',
            frames: this.anims.generateFrameNumbers('coin'),
            frameRate: 12,
            repeat: -1
        });

        // Animação do jogador a correr
        this.anims.create({
            key: 'playerRun',
            frames: this.anims.generateFrameNumbers('player'),
            frameRate: 10,
            repeat: -1
        });

        // Animação do pássaro a voar (frames individuais)
        const birdFrames = [];
        for (let i = 1; i <= 7; i++) {
            birdFrames.push({ key: `bird${i}` });
        }
        this.anims.create({
            key: 'birdFly',
            frames: birdFrames,
            frameRate: 12,
            repeat: -1
        });

        // Estado inicial do jogo
        this._isTransitioning = false;
        this.isSliding = false;
        this._slideQueued = false; // deslize agendado para quando aterrar
        this._isPaused = false;
        this.time.paused = false;
        this.physics.resume();
        this._isCountingDown = false;
        this.velocidadeJogo = 300;    // velocidade atual dos obstáculos
        this.velocidadeMaxima = 800;  // teto de velocidade (cresce com o score)
        this.aceleracao = 0.05;       // incremento de velocidade por frame
        this.score = 0;
        this.coinsCollected = 0;
        this._playerState = 'run';

        // Fundo parallax e chão
        this._parallax.create();
        this.chao = this._parallax.getGround();

        // Textos do HUD (pontos e moedas)
        this.scoreText = this.add.text(640, 16, `${t('score')}: 0`, { fontSize: '24px', fill: '#fff' }).setOrigin(0.5, 0);
        this.coinText = this.add.text(640, 48, `${t('coins')}: 0`, { fontSize: '24px', fill: '#fff' }).setOrigin(0.5, 0);
        //this.debugText = this.add.text(100, 16, 'Debug', { fontSize: '16px', fill: '#0f0' }).setOrigin(0, 0);

        // Frase de aceleração — aparece ao centro quando o jogo acelera
        this._speedQuoteText = this.add.text(640, 320, '', {
            fontSize: '28px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 5,
            fontStyle: 'bold italic',
            wordWrap: { width: 500 },
            align: 'center',
        }).setOrigin(0.5, 0.5).setAlpha(0).setDepth(10);
        this._lastScoreTier = 0; // último nível de dificuldade registado

        // Música
        this.startGameMusic();

        // Jogador
        this.player = this.physics.add.sprite(100, 200, 'player');
        this.player.setScale(1);
        this.player.setCollideWorldBounds(true);
        this.player.body.setSize(60, 80);
        this.player.body.setOffset(18, 12);
        this.player.body.setGravityY(800);
        this.player.play('playerRun');
        this.physics.add.collider(this.player, this.chao);

        // Teclas de movimento (setas)
        this.teclas = this.input.keyboard.createCursorKeys();

        // Grupos de física para obstáculos e moedas
        this.obstaculos = this.physics.add.group();
        this.coins = this.physics.add.group();

        // Textura procedural da moeda (fallback caso o spritesheet falhe)
        if (!this.textures.exists('texturaMoeda')) {
            const coinCanvas = this.make.graphics({ x: 0, y: 0, add: false });
            coinCanvas.fillStyle(0xffd34d);
            coinCanvas.fillCircle(16, 16, 15);
            coinCanvas.lineStyle(3, 0xb87900);
            coinCanvas.strokeCircle(16, 16, 14);
            coinCanvas.lineStyle(2, 0xfff3a0);
            coinCanvas.strokeCircle(16, 16, 8);
            coinCanvas.generateTexture('texturaMoeda', 32, 32);
        }

        // Agendamento inicial de obstáculos e moedas
        this.agendarProximoObstaculo();
        this.agendarProximaMoeda();

        // Colisões e sobreposições
        this.physics.add.collider(this.player, this.obstaculos, this.gameOver, null, this);
        this.physics.add.overlap(this.player, this.coins, this.collectCoin, null, this);

        // Botão de pausa (canto superior direito)
        this.pauseBtn = this.add.text(1260, 16, '⏸', {
            fontSize: '32px',
            fill: '#fff',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true }).setDepth(10);

        this.pauseBtn.on('pointerover', () => this.pauseBtn.setAlpha(0.7));
        this.pauseBtn.on('pointerout',  () => this.pauseBtn.setAlpha(1));
        this.pauseBtn.on('pointerdown', () => this.togglePause());

        // ESC ou P para pausar
        this.input.keyboard.on('keydown-ESC', () => this.togglePause());
        this.input.keyboard.on('keydown-P',   () => this.togglePause());

        // Overlay de pausa (começa escondido)
        this._pauseGroup = this.add.group();
        this._buildPauseOverlay();

        // Fade de entrada
        this.cameras.main.fadeIn(400);

        // HUD dos itens (deadeye e dupla vida)
        this._buildItemHUD();

        // Tecla F activa o deadeye
        this.input.keyboard.on('keydown-F', () => this._activateDeadeye());
    }

    // Constrói o HUD dos itens no canto inferior esquerdo
    _buildItemHUD() {
        // Ícone e contador do Deadeye
        this._deadeyeIcon = this.add.image(40, 660, 'wine_deadeye').setDepth(5);
        this._deadeyeIcon.setDisplaySize(40, 40);
        this._deadeyeCountText = this.add.text(68, 660, `x${this._deadeyeCount}`, {
            fontSize: '18px', fill: '#ffd966', stroke: '#000', strokeThickness: 3
        }).setOrigin(0, 0.5).setDepth(5);
        this.add.text(40, 688, '[F]', {
            fontSize: '12px', fill: '#aaa', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(5);

        // Ícone e contador da Dupla Vida
        this._doubleLifeIcon = this.add.image(130, 660, 'health_potion').setDepth(5);
        this._doubleLifeIcon.setDisplaySize(40, 40);
        this._doubleLifeCountText = this.add.text(158, 660, `x${this._doubleLifeCount}`, {
            fontSize: '18px', fill: '#ffd966', stroke: '#000', strokeThickness: 3
        }).setOrigin(0, 0.5).setDepth(5);

        // Barra de tempo do deadeye (escondida até ser ativada)
        this._deadeyeBarBg = this.add.rectangle(40, 710, 100, 8, 0x333333).setOrigin(0, 0.5).setDepth(5).setVisible(false);
        this._deadeyeBar    = this.add.rectangle(40, 710, 100, 8, 0xff8800).setOrigin(0, 0.5).setDepth(5).setVisible(false);

        // Overlay laranja do deadeye (escondido por defeito)
        this._deadeyeOverlay = this.add.rectangle(640, 360, 1280, 720, 0xff6600, 0)
            .setDepth(4).setBlendMode(Phaser.BlendModes.MULTIPLY);
    }

    // Activa o deadeye (abranda o jogo 8 segundos)
    _activateDeadeye() {
        if (this._isDeadeye || this._deadeyeCount <= 0 || this._isPaused || this._isCountingDown || this._isTransitioning) return;

        // Desconta um uso e guarda no localStorage
        this._deadeyeCount--;
        localStorage.setItem('tp2_deadeye_count', String(this._deadeyeCount));
        this._deadeyeCountText.setText(`x${this._deadeyeCount}`);

        this._isDeadeye = true;
        const SLOW = 0.6;       // fator de abrandamento
        const DURATION = 8000;  // duração em milissegundos

        // Abranda a física e o tempo do Phaser
        this.physics.world.timeScale = 1 / SLOW;
        this.time.timeScale = SLOW;
        if (this.gameMusic) this.gameMusic.setRate(SLOW);

        // Overlay laranja aparece gradualmente
        this.tweens.add({ targets: this._deadeyeOverlay, alpha: 0.22, duration: 300 });

        // Mostra e anima a barra de tempo
        this._deadeyeBarBg.setVisible(true);
        this._deadeyeBar.setVisible(true).setScale(1, 1);
        this.tweens.add({
            targets: this._deadeyeBar,
            scaleX: 0,
            duration: DURATION / SLOW,
            ease: 'Linear'
        });

        // Controlo manual da barra via tempo real (para não ser afetado pelo timeScale)
        this._deadeyeStart = this.time.now;
        this._deadeyeBarBg.setVisible(true);
        this._deadeyeBar.setVisible(true);
        this.tweens.killTweensOf(this._deadeyeBar);

        // Marca o instante de fim em tempo real
        this._deadeyeEndAt = Date.now() + DURATION;

        // Pulso no ícone do deadeye enquanto está ativo
        this.tweens.add({ targets: this._deadeyeIcon, alpha: 0.4, duration: 400, yoyo: true, repeat: -1, ease: 'Sine' });

        // Usa setTimeout nativo para não ser afetado pelo timeScale do Phaser
        this._deadeyeTimeout = setTimeout(() => this._endDeadeye(), DURATION);
    }

    // Termina o efeito de deadeye e restaura velocidade normal
    _endDeadeye() {
        if (!this._isDeadeye) return;
        this._isDeadeye = false;

        // Restaura timeScale da física e do tempo
        this.physics.world.timeScale = 1;
        this.time.timeScale = 1;
        if (this.gameMusic) this.gameMusic.setRate(1);

        // Esconde o overlay e a barra
        this.tweens.add({ targets: this._deadeyeOverlay, alpha: 0, duration: 500 });
        this._deadeyeBarBg.setVisible(false);
        this._deadeyeBar.setVisible(false);
        this.tweens.killTweensOf(this._deadeyeIcon);
        this._deadeyeIcon.setAlpha(1);
    }

    // Revive o jogador após usar a Dupla Vida
    _revivePlayer() {
        // Permite colisões novamente
        this._isTransitioning = false;

        // Repõe posição, cor e velocidade do jogador
        this.player.clearTint();
        this.player.setPosition(100, 200);
        this.player.setVelocity(0, 0);
        this.physics.resume();
        this.player.play('playerRun', true);
        this._playerState = 'run';

        // Remove todos os obstáculos do ecrã
        this.obstaculos.clear(true, true);

        // Contagem decrescente antes de retomar o jogo
        this._isCountingDown = true;
        let count = 3;
        const countTxt = this.add.text(640, 360, String(count), {
            fontSize: '100px', fontStyle: 'bold',
            fill: '#ffffff', stroke: '#000000', strokeThickness: 10
        }).setOrigin(0.5).setDepth(30);

        const tick = () => {
            countTxt.setText(String(count));
            countTxt.setScale(1.5).setAlpha(1);
            this.tweens.add({
                targets: countTxt,
                scale: 1, alpha: 0.6,
                duration: 900, ease: 'Cubic.easeIn',
                onComplete: () => {
                    count--;
                    if (count > 0) { tick(); }
                    else {
                        countTxt.destroy();
                        this._isCountingDown = false;
                        this.agendarProximoObstaculo();
                    }
                }
            });
        };
        tick();
    }

    // Inicia o deslize (no chão) ou aciona queda rápida (no ar)
    startSlide() {
        if (this.isSliding) return;

        const onGround =
            this.player.body.touching.down ||
            this.player.body.blocked.down;

        // No ar: cai rapidamente e agenda o deslize para quando aterrar
        if (!onGround) {
            this.player.setVelocityY(600);
            this._slideQueued = true;
            return;
        }

        this._slideQueued = false;
        this.isSliding = true;
        this._playerState = 'slide';

        // Muda textura e reduz hitbox para o deslize
        this.player.stop();
        this.player.setTexture('playerSlide');
        this.player.body.setSize(60, 40);
        this.player.body.setOffset(18, 50);

        // Termina o deslize automaticamente após 600ms
        this._slideTimer = this.time.delayedCall(600, () => {
            this.endSlide();
        });
    }

    // Termina o deslize e repõe o estado normal
    endSlide() {
        if (!this.isSliding) return;

        // Cancela o timer automático se ainda estiver pendente
        if (this._slideTimer) {
            this._slideTimer.remove(false);
            this._slideTimer = null;
        }

        this.isSliding = false;
        this.player.body.setSize(60, 80);
        this.player.body.setOffset(18, 12);

        this.player.setTexture('player');
        this.player.play('playerRun', true);

        this._playerState = 'run';
    }

    // Constrói o overlay de pausa (profundidade 20)
    _buildPauseOverlay() {
        const g = this._pauseGroup;

        // Fundo semi-transparente
        const dim = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.65).setDepth(20);

        // Painel central
        const panel = this.add.rectangle(640, 360, 420, 340, 0x2a1a0a, 0.97)
            .setStrokeStyle(3, 0xd4af37).setDepth(20);

        // Título
        const title = this.add.text(640, 250, 'Pausa', {
            fontSize: '44px', fontStyle: 'bold',
            fill: '#d4af37', stroke: '#4a260d', strokeThickness: 6
        }).setOrigin(0.5).setDepth(20);

        // Botão de continuar
        const resumeBtn = this._makePauseBtn(640, 340, 'Continuar', 0xb8860b, () => {
            if (!this._isCountingDown) this.startResumeCountdown();
        });

        // Botão de sair para o menu
        const menuBtn = this._makePauseBtn(640, 420, 'Sair', 0x8b6914, () => {
            if (!this._isTransitioning && !this._isCountingDown) {
                this._hidePauseOverlay();
                this.transitionTo('MenuScene');
            }
        });

        // Texto da contagem decrescente (escondido até ser necessário)
        this._countdownText = this.add.text(640, 360, '', {
            fontSize: '72px', fontStyle: 'bold',
            fill: '#ffffff', stroke: '#000000', strokeThickness: 8
        }).setOrigin(0.5).setDepth(25).setVisible(false);

        g.addMultiple([dim, panel, title, resumeBtn.bg, resumeBtn.label,
                       menuBtn.bg, menuBtn.label, this._countdownText]);

        this._hidePauseOverlay();
    }

    // Cria um botão estilizado para o overlay de pausa
    _makePauseBtn(x, y, label, color, cb) {
        const bg = this.add.rectangle(x, y, 280, 58, color)
            .setInteractive({ useHandCursor: true })
            .setDepth(20)
            .setStrokeStyle(2, 0xd4af37);

        const lbl = this.add.text(x, y, label, {
            fontSize: '22px', fill: '#fff', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(21);

        // Função auxiliar para escurecer a cor ao passar o rato por cima
        const darker = (c, amt) => {
            const r = Math.max(0, ((c >> 16) & 0xff) - amt);
            const g = Math.max(0, ((c >> 8)  & 0xff) - amt);
            const b = Math.max(0, ( c        & 0xff) - amt);
            return (r << 16) | (g << 8) | b;
        };

        bg.on('pointerover', () => {
            this.tweens.add({ targets: bg,  scale: 1.05, duration: 100, ease: 'Power1' });
            bg.setFillStyle(darker(color, 30));
        });
        bg.on('pointerout', () => {
            this.tweens.add({ targets: bg,  scale: 1.0,  duration: 100, ease: 'Power1' });
            bg.setFillStyle(color);
        });
        bg.on('pointerdown', cb);

        return { bg, label: lbl };
    }

    // Mostra o overlay de pausa
    _showPauseOverlay() {
        this._pauseGroup.getChildren().forEach(c => {
            if (c !== this._countdownText) c.setVisible(true);
        });
    }

    // Esconde o overlay de pausa
    _hidePauseOverlay() {
        this._pauseGroup.getChildren().forEach(c => c.setVisible(false));
    }

    // Alterna entre pausado e a jogar
    togglePause() {
        if (this._isTransitioning || this._isCountingDown) return;

        if (this._isPaused) {
            this.startResumeCountdown();
        } else {
            this._isPaused = true;
            this.physics.pause();
            this.time.paused = true;
            if (this.gameMusic && this.gameMusic.isPlaying) {
                this.tweens.add({ targets: this.gameMusic, volume: 0, duration: 300 });
            }
            this.pauseBtn.setText('▶');
            this._showPauseOverlay();
        }
    }

    // Contagem 3-2-1 antes de retomar o jogo após pausa
    startResumeCountdown() {
        if (this._isCountingDown) return;
        this._isCountingDown = true;

        // Esconde tudo menos o fundo e o texto de contagem
        this._pauseGroup.getChildren().forEach(c => {
            if (c !== this._countdownText) c.setVisible(false);
        });

        const dim = this._pauseGroup.getChildren()[0];
        if (dim) { dim.setAlpha(0.4); dim.setVisible(true); }

        this._countdownText.setVisible(true);

        let count = 3;
        const showCount = () => {
            if (count <= 0) {
                // Contagem acabou — retoma o jogo
                this._countdownText.setVisible(false);
                if (dim) dim.setAlpha(0.65);
                this._isCountingDown = false;
                this._isPaused = false;
                this.pauseBtn.setText('⏸');
                this._hidePauseOverlay();
                this.physics.resume();
                this.time.paused = false;
                const vol = parseFloat(localStorage.getItem('tp2_volume')) || 0.5;
                const muted = localStorage.getItem('tp2_muted') === 'true';
                if (this.gameMusic) {
                    this.tweens.add({ targets: this.gameMusic, volume: muted ? 0 : vol, duration: 300 });
                }
                return;
            }

            // Anima cada número da contagem
            this._countdownText.setText(String(count));
            this._countdownText.setScale(1.4);
            this._countdownText.setAlpha(1);

            this.tweens.add({
                targets: this._countdownText,
                scale: 1.0,
                alpha: 0.7,
                duration: 850,
                ease: 'Cubic.easeIn',
                onComplete: () => {
                    count--;
                    showCount();
                }
            });
        };

        showCount();
    }

    // Loop principal do jogo (chamado a cada frame)
    update() {

        // Verifica input de deslize (S ou Seta Baixo)
        if (Phaser.Input.Keyboard.JustDown(this.slideKey) || Phaser.Input.Keyboard.JustDown(this.downKey)) {
            this.startSlide();
        }

        // Para o update se o jogo estiver pausado ou em contagem
        if (this._isPaused || this._isCountingDown) return;

        // Atualiza a barra de tempo do deadeye em tempo real
        if (this._isDeadeye && this._deadeyeEndAt) {
            const remaining = Math.max(0, this._deadeyeEndAt - Date.now());
            const pct = remaining / 8000;
            this._deadeyeBar.setScale(pct, 1);
        }

        // Dificuldade progressiva
        // Acelera gradualmente até ao teto atual
        if (this.velocidadeJogo < this.velocidadeMaxima) {
            this.velocidadeJogo += this.aceleracao;
        }

        // A cada 1000 pontos: aumenta o teto de velocidade e a aceleração
        const scoreTier = Math.floor(this.score / 10000); // score interno é x10
        this.velocidadeMaxima = Math.min(1400, 800 + scoreTier * 60);
        this.aceleracao = Math.min(0.2, 0.05 + scoreTier * 0.01);

        // Mostra frase de aceleração quando sobe de nível
        if (scoreTier > this._lastScoreTier) {
            this._lastScoreTier = scoreTier;
            this._showSpeedQuote();
        }

        // Atualiza o fundo parallax com a velocidade atual
        this._parallax.update(this.velocidadeJogo);

        // Input do jogador
        const onGround = this.player.body.touching.down || this.player.body.blocked.down;

        // Executa deslize agendado assim que o jogador aterra
        if (onGround && this._slideQueued) {
            this._slideQueued = false;
            this.startSlide();
        }

        // Salto: cancela deslize se estiver a deslizar, depois salta
        if (Phaser.Input.Keyboard.JustDown(this.teclas.up) || Phaser.Input.Keyboard.JustDown(this.teclas.space)) {
            if (onGround || this.isSliding) {
                if (this.isSliding) {
                    this.endSlide();
                }
                this._slideQueued = false;
                this.player.setVelocityY(-520);
            }
        }

        // Texto de debug (estado, chão, velocidade vertical)
        //this.debugText.setText(`State: ${this._playerState} | onGround: ${onGround} | velY: ${Math.round(this.player.body.velocity.y)}`);

        // Máquina de estados da animação do jogador
        if (!this.isSliding) {
            if (onGround) {
                // No chão → animação de corrida
                if (this._playerState !== 'run') {
                    this._playerState = 'run';
                    this.player.stop();
                    this.player.setTexture('player');
                    this.player.play('playerRun', true);
                }
            } else if (this.player.body.velocity.y < -1) {
                // A subir → sprite de salto (subida)
                if (this._playerState !== 'jumpUp') {
                    this._playerState = 'jumpUp';
                    this.player.stop();
                    this.player.setTexture('playerJumpUp', 0);
                    this.player.setScale(0.9);
                }
            } else if (this.player.body.velocity.y > 1) {
                // A descer → sprite de salto (descida)
                if (this._playerState !== 'jumpDown') {
                    this._playerState = 'jumpDown';
                    this.player.stop();
                    this.player.setTexture('playerJumpDown', 0);
                    this.player.setScale(0.9);
                }
            }
        }

        // Pontuação
        this.score += 1;
        this.scoreText.setText(`${t('score')}: ${Math.floor(this.score / 10)}`);

        // Move e limpa obstáculos fora do ecrã
        this.obstaculos.getChildren().forEach(obstaculo => {
            obstaculo.setVelocityX(-this.velocidadeJogo);
            if (obstaculo.x < -50) {
                obstaculo.destroy();
            }
        });

        // Move e limpa moedas fora do ecrã
        this.coins.getChildren().forEach(coin => {
            coin.setVelocityX(-this.velocidadeJogo);
            coin.angle += 0;
            if (coin.x < -50) {
                coin.destroy();
            }
        });
    }

    // Mostra uma frase de aceleração ao centro do ecrã
    _showSpeedQuote() {
        const quotes = t('speedQuotes');
        const quote = quotes[Phaser.Math.Between(0, quotes.length - 1)];
        this._speedQuoteText.setText(quote).setAlpha(1);

        // Faz a frase desaparecer gradualmente após 1.4 segundos
        this.tweens.killTweensOf(this._speedQuoteText);
        this.tweens.add({
            targets: this._speedQuoteText,
            alpha: 0,
            duration: 2200,
            delay: 1400,
            ease: 'Sine.easeIn',
        });
    }

    // Inicia a música de jogo com o volume guardado
    startGameMusic() {
        const isMuted = localStorage.getItem('tp2_muted') === 'true';
        const volume = parseFloat(localStorage.getItem('tp2_volume')) || 0.5;
        const actualVolume = isMuted ? 0 : volume * 0.4;

        this.gameMusic = this.sound.add('gameMusic', { loop: true, volume: actualVolume });
        this.gameMusic.play();

        const coinVolume = isMuted ? 0 : volume * 0.8;
        this.coinCollectSound = this.sound.add('coinCollectSound', { volume: coinVolume });
    }

    // Calcula o bounding box dos píxeis opacos de uma textura
    // Usado para definir hitboxes automáticas com base no conteúdo real da imagem
    getOpaqueBounds(textureKey) {
        const src = this.textures.get(textureKey).getSourceImage();
        const cvs = document.createElement('canvas');
        cvs.width  = src.width;
        cvs.height = src.height;
        const ctx = cvs.getContext('2d');
        ctx.drawImage(src, 0, 0);
        const { data, width, height } = ctx.getImageData(0, 0, cvs.width, cvs.height);

        let minX = width, maxX = 0, minY = height, maxY = 0;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // Ignora píxeis quase transparentes (alpha ≤ 10)
                const alpha = data[(y * width + x) * 4 + 3];
                if (alpha > 10) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        // Fallback para imagem inteira se for totalmente transparente
        if (minX > maxX || minY > maxY) {
            return { x: 0, y: 0, w: width, h: height };
        }
        return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
    }

    // Cria um obstáculo aleatório (cacto ou pássaro)
    criarObstaculo() {
        if (this._isTransitioning) return;
        const obstacleType = Phaser.Math.Between(0, 1) === 0 ? 'cactus' : 'bird';

        if (obstacleType === 'cactus') {
            // Escolhe uma das 4 variantes de cacto aleatoriamente
            const variant = Phaser.Math.Between(1, 4);
            const obstaculo = this.obstaculos.create(1350, 600, `cactus${variant}`);
            obstaculo.setScale(1);
            obstaculo.body.setAllowGravity(false);
            obstaculo.body.setImmovable(true);

            // Hitbox calculada automaticamente com base nos píxeis opacos
            // Largura reduzida para 60% para ser mais justo com o jogador
            const bounds = this.getOpaqueBounds(`cactus${variant}`);
            const hitW = Math.round(bounds.w * 0.6);
            const hitX = bounds.x + Math.round((bounds.w - hitW) / 2);
            obstaculo.body.setSize(hitW, bounds.h);
            obstaculo.body.setOffset(hitX, bounds.y);
        } else {
            // Pássaro — aparece a uma altura que obriga a deslizar
            const BIRD_Y = Phaser.Math.Between(560, 570);
            const obstaculo = this.obstaculos.create(1350, BIRD_Y, 'bird1');
            obstaculo.setScale(1.5);
            obstaculo.play('birdFly');
            obstaculo.body.setAllowGravity(false);
            obstaculo.body.setImmovable(true);
            obstaculo.body.setSize(32, 24);
            obstaculo.body.setOffset(0, 4);
        }

        this.agendarProximoObstaculo();
    }

    // Agenda o próximo obstáculo com delay que diminui com o score
    agendarProximoObstaculo() {
        const scoreTier = Math.floor(this.score / 10000);
        const minDelay = Math.max(350, 1000 - scoreTier * 100);
        const maxDelay = Math.max(700, 3000 - scoreTier * 200);
        const randomDelay = Phaser.Math.Between(minDelay, maxDelay);
        this.time.delayedCall(randomDelay, () => this.criarObstaculo(), [], this);
    }

    // Cria uma moeda numa posição aleatória com animação flutuante
    criarMoeda() {
        if (this._isTransitioning) return;

        const y = Phaser.Math.Between(520, 590);
        const coin = this.coins.create(1350, y, 'coin');
        coin.setScale(2);
        coin.play('coinSpin');
        coin.body.setAllowGravity(false);
        coin.body.setSize(14, 14);
        coin.body.setOffset(1, 1);

        // Animação de flutuação (sobe e desce em loop)
        this.tweens.add({
            targets: coin,
            y: y - 18,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.agendarProximaMoeda();
    }

    // Agenda a próxima moeda com delay aleatório
    agendarProximaMoeda() {
        const randomDelay = Phaser.Math.Between(1200, 2600);
        this.time.delayedCall(randomDelay, this.criarMoeda, [], this);
    }

    // Recolha de moeda pelo jogador
    collectCoin(player, coin) {
        this.tweens.killTweensOf(coin);
        coin.destroy();
        this.coinsCollected += 1;
        this.coinText.setText(`${t('coins')}: ${this.coinsCollected}`);
        if (this.coinCollectSound) {
            this.coinCollectSound.play();
        }
    }

    // Game Over: verifica dupla vida ou transita para o ecrã de fim
    gameOver() {
        if (this._isTransitioning || this._isPaused || this._isCountingDown) return;

        // Se tiver dupla vida disponível, revive o jogador
        if (this._doubleLifeCount > 0 && !this._doubleLifeUsed) {
            this._doubleLifeUsed = true;
            this._doubleLifeCount--;
            localStorage.setItem('tp2_doublelife_count', String(this._doubleLifeCount));
            this._doubleLifeCountText.setText(`x${this._doubleLifeCount}`);

            // Termina o deadeye se estiver ativo
            if (this._isDeadeye) {
                clearTimeout(this._deadeyeTimeout);
                this._endDeadeye();
            }

            this._revivePlayer();
            return;
        }

        // Sem dupla vida: pausa tudo e vai para GameOver
        this._isTransitioning = true;
        this.physics.pause();
        if (this.gameMusic && this.gameMusic.isPlaying) {
            this.gameMusic.stop();
        }

        // Limpa o deadeye antes de sair
        if (this._isDeadeye) {
            clearTimeout(this._deadeyeTimeout);
            this._endDeadeye();
        }

        // Tinge o jogador de vermelho e transita para a cena de Game Over
        this.player.setTint(0xff0000);
        this.transitionTo('GameOverScene', { score: Math.floor(this.score / 10), coins: this.coinsCollected });
    }

    // Limpeza quando a cena é destruída
    shutdown() {
        if (this._deadeyeTimeout) clearTimeout(this._deadeyeTimeout);
        // Restaura timeScales para não afetar outras cenas
        this.physics.world.timeScale = 1;
        this.time.timeScale = 1;
    }

    // Transição suave para outra cena com fade e fade de áudio
    transitionTo(targetScene, data) {
        const dur = 400;

        // Fade out de todos os sons ativos
        this.sound.sounds.forEach(s => {
            try {
                if (!s) return;
                if (s.isPlaying) {
                    this.tweens.killTweensOf(s);
                    this.tweens.add({ targets: s, volume: 0, duration: dur, onComplete: () => { try { s.stop(); } catch(e){} } });
                }
            } catch (e) {}
        });

        // Fade out da câmara e inicia a próxima cena
        this.cameras.main.fadeOut(dur, 0, 0, 0);
        let fired = false;
        this.cameras.main.once('camerafadeoutcomplete', () => {
            fired = true;
            this.scene.start(targetScene, data);
        });
        // Fallback caso o evento de câmara não dispare
        this.time.delayedCall(dur + 200, () => { if (!fired) this.scene.start(targetScene, data); });
    }
}