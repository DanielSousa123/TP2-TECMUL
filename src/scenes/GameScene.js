import Phaser from 'phaser';
import { t } from '../traducao.js';
import ParallaxManager from './ParallaxManager.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        this._parallax = new ParallaxManager(this);
        this._parallax.preload();

        if (!this.textures.exists('player')) {
            this.load.spritesheet('player', 'assets/images/Sprite-0001.png', {
                frameWidth: 96,
                frameHeight: 96
            });
        }
        if (!this.textures.exists('playerJumpUp')) {
            this.load.image('playerJumpUp', 'assets/images/Sprite-jump.png');
        }
        if (!this.textures.exists('playerJumpDown')) {
            this.load.image('playerJumpDown', 'assets/images/Sprite-down.png');
        }
        if (!this.textures.exists('cactus')) {
            this.load.image('cactus', 'assets/images/cactus.png');
        }
        if (!this.textures.exists('playerSlide')) {
            this.load.image('playerSlide', 'assets/images/Sprite-slide.png');
        }
        
        for (let i = 1; i <= 7; i++) {
            if (!this.textures.exists(`bird${i}`)) {
                this.load.image(`bird${i}`, `assets/bird flying/${i}.png`);
            }
        }

        this.load.audio('gameMusic', 'assets/music/gamemusic.mp3');
        this.load.spritesheet('coin', 'assets/images/coin.png', {
            frameWidth: 16,
            frameHeight: 16
        });
    }

    create() {
        // Create Coin Animation
        this.anims.create({
            key: 'coinSpin',
            frames: this.anims.generateFrameNumbers('coin'),
            frameRate: 12,
            repeat: -1
        });

        // Create Player Run Animation
        this.anims.create({
            key: 'playerRun',
            frames: this.anims.generateFrameNumbers('player'),
            frameRate: 10,
            repeat: -1
        });

        // Create Bird Flying Animation
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

        this._isTransitioning = false;
        this.isSliding = false;
        this._isPaused = false;
        this.time.paused = false;
        this.physics.resume();
        this._isCountingDown = false;
        this.velocidadeJogo = 300;
        this.velocidadeMaxima = 800;
        this.aceleracao = 0.05;
        this.score = 0;
        this.coinsCollected = 0;
        this._playerState = 'run'; 

        this._parallax.create();
        this.chao = this._parallax.getGround();

        this.scoreText = this.add.text(640, 16, `${t('score')}: 0`, { fontSize: '24px', fill: '#fff' }).setOrigin(0.5, 0);
        this.coinText = this.add.text(640, 48, `${t('coins')}: 0`, { fontSize: '24px', fill: '#fff' }).setOrigin(0.5, 0);
        this.debugText = this.add.text(100, 16, 'Debug', { fontSize: '16px', fill: '#0f0' }).setOrigin(0, 0);
        this.startGameMusic();

        this.player = this.physics.add.sprite(100, 200, 'player');
        this.player.setScale(1);
        this.player.setCollideWorldBounds(true);
        this.player.body.setSize(60, 80);
        this.player.body.setOffset(18, 12);
        this.player.body.setGravityY(800);
        this.player.play('playerRun');
        this.physics.add.collider(this.player, this.chao);

        this.teclas = this.input.keyboard.createCursorKeys();

        this.obstaculos = this.physics.add.group();
        this.coins = this.physics.add.group();

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

        this.agendarProximoObstaculo();
        this.agendarProximaMoeda();

        this.physics.add.collider(this.player, this.obstaculos, this.gameOver, null, this);
        this.physics.add.overlap(this.player, this.coins, this.collectCoin, null, this);

        // ── Pause button (top-right) ──────────────────────────────────────
        this.pauseBtn = this.add.text(1260, 16, '⏸', {
            fontSize: '32px',
            fill: '#fff',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true }).setDepth(10);

        this.pauseBtn.on('pointerover', () => this.pauseBtn.setAlpha(0.7));
        this.pauseBtn.on('pointerout',  () => this.pauseBtn.setAlpha(1));
        this.pauseBtn.on('pointerdown', () => this.togglePause());

        // ESC / P to pause
        this.input.keyboard.on('keydown-ESC', () => this.togglePause());
        this.input.keyboard.on('keydown-P',   () => this.togglePause());

        // ── Pause overlay (hidden initially) ─────────────────────────────
        this._pauseGroup = this.add.group();
        this._buildPauseOverlay();

        this.cameras.main.fadeIn(400);

        
    }

    startSlide() {
    if (this.isSliding) return;

    const onGround =
        this.player.body.touching.down ||
        this.player.body.blocked.down;

    if (!onGround) return;

    this.isSliding = true;
    this._playerState = 'slide';

    this.player.stop();
    this.player.setTexture('playerSlide');

    this.player.body.setSize(60, 40);
    this.player.body.setOffset(18, 50);

    this.time.delayedCall(600, () => {
        this.endSlide();
    });
    }

    endSlide() {
        if (!this.isSliding) return;

        this.isSliding = false;
        this.player.body.setSize(60, 80);
        this.player.body.setOffset(18, 12);

        this.player.setTexture('player');
        this.player.play('playerRun', true);

        this._playerState = 'run';
    }

    // ── Build the pause overlay objects (depth 20) ───────────────────────
    _buildPauseOverlay() {
        const g = this._pauseGroup;

        const dim = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.65).setDepth(20);

        const panel = this.add.rectangle(640, 360, 420, 340, 0x2a1a0a, 0.97)
            .setStrokeStyle(3, 0xd4af37).setDepth(20);

        const title = this.add.text(640, 250, 'Pausa', {
            fontSize: '44px', fontStyle: 'bold',
            fill: '#d4af37', stroke: '#4a260d', strokeThickness: 6
        }).setOrigin(0.5).setDepth(20);

        // Resume button
        const resumeBtn = this._makePauseBtn(640, 340, 'Continuar', 0xb8860b, () => {
            if (!this._isCountingDown) this.startResumeCountdown();
        });

        // Menu button
        const menuBtn = this._makePauseBtn(640, 420, 'Sair', 0x8b6914, () => {
            if (!this._isTransitioning && !this._isCountingDown) {
                this._hidePauseOverlay();
                this.transitionTo('MenuScene');
            }
        });

        this._countdownText = this.add.text(640, 360, '', {
            fontSize: '72px', fontStyle: 'bold',
            fill: '#ffffff', stroke: '#000000', strokeThickness: 8
        }).setOrigin(0.5).setDepth(25).setVisible(false);

        g.addMultiple([dim, panel, title, resumeBtn.bg, resumeBtn.label,
                       menuBtn.bg, menuBtn.label, this._countdownText]);

        this._hidePauseOverlay();
    }

    _makePauseBtn(x, y, label, color, cb) {
        const bg = this.add.rectangle(x, y, 280, 58, color)
            .setInteractive({ useHandCursor: true })
            .setDepth(20)
            .setStrokeStyle(2, 0xd4af37);

        const lbl = this.add.text(x, y, label, {
            fontSize: '22px', fill: '#fff', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(21);

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

    _showPauseOverlay() {
        this._pauseGroup.getChildren().forEach(c => {
            if (c !== this._countdownText) c.setVisible(true);
        });
    }

    _hidePauseOverlay() {
        this._pauseGroup.getChildren().forEach(c => c.setVisible(false));
    }

    // ── Toggle pause ─────────────────────────────────────────────────────
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

    // ── 3-2-1 countdown before resuming ──────────────────────────────────
    startResumeCountdown() {
        if (this._isCountingDown) return;
        this._isCountingDown = true;
        this._pauseGroup.getChildren().forEach(c => {
            if (c !== this._countdownText) c.setVisible(false);
        });


        const dim = this._pauseGroup.getChildren()[0];
        if (dim) { dim.setAlpha(0.4); dim.setVisible(true); }

        this._countdownText.setVisible(true);

        let count = 3;
        const showCount = () => {
            if (count <= 0) {
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

    update() {
        if (this._isPaused || this._isCountingDown) return;

        if (this.velocidadeJogo < this.velocidadeMaxima) {
            this.velocidadeJogo += this.aceleracao;
        }

        this._parallax.update(this.velocidadeJogo);

        const onGround = this.player.body.touching.down || this.player.body.blocked.down;

        if ((this.teclas.up.isDown || this.teclas.space.isDown) && onGround) {
            this.player.setVelocityY(-520);
        }

        this.debugText.setText(`State: ${this._playerState} | onGround: ${onGround} | velY: ${Math.round(this.player.body.velocity.y)}`);

        
       if (onGround) {
            if (this._playerState !== 'run') {
                this._playerState = 'run';
                this.player.stop(); 
                this.player.setTexture('player'); 
                this.player.play('playerRun', true);
            }
        } else if (this.player.body.velocity.y < -1) { 
            // Rising
            if (this._playerState !== 'jumpUp') {
                this._playerState = 'jumpUp';
                this.player.stop(); 
                this.player.setTexture('playerJumpUp', 0);
                this.player.setScale(0.9);
            }
        } else if (this.player.body.velocity.y > 1) {
            // Falling
            if (this._playerState !== 'jumpDown') {
                this._playerState = 'jumpDown';
                this.player.stop(); 
                this.player.setTexture('playerJumpDown', 0); 
                this.player.setScale(0.9);
            }
        }
        
        this.score += 1;
        this.scoreText.setText(`${t('score')}: ${Math.floor(this.score / 10)}`);

        this.obstaculos.getChildren().forEach(obstaculo => {
            obstaculo.setVelocityX(-this.velocidadeJogo);
            if (obstaculo.x < -50) {
                obstaculo.destroy();
            }
        });

        this.coins.getChildren().forEach(coin => {
            coin.setVelocityX(-this.velocidadeJogo);
            coin.angle += 0;
            if (coin.x < -50) {
                coin.destroy();
            }
        });
    }

    startGameMusic() {
        const isMuted = localStorage.getItem('tp2_muted') === 'true';
        const volume = parseFloat(localStorage.getItem('tp2_volume')) || 0.5;
        const actualVolume = isMuted ? 0 : volume;

        this.gameMusic = this.sound.add('gameMusic', { loop: true, volume: actualVolume });
        this.gameMusic.play();
    }

    criarObstaculo() {
        if (this._isTransitioning) return;
        const obstacleType = Phaser.Math.Between(0, 1) === 0 ? 'cactus' : 'bird';

        if (obstacleType === 'cactus') {
            const CACTUS_SCALE = 0.080;
            const obstaculo = this.obstaculos.create(1350, 600, 'cactus');
            obstaculo.setScale(CACTUS_SCALE);
            obstaculo.body.setAllowGravity(false);
            obstaculo.body.setImmovable(true);
            obstaculo.body.setSize(420, 820);
            obstaculo.body.setOffset(258, 105);
        } else {
            
            const BIRD_Y = Phaser.Math.Between(560, 570); // High enough to require sliding under
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

    agendarProximoObstaculo() {
        const minDelay = 1000;
        const maxDelay = 3000;
        const randomDelay = Phaser.Math.Between(minDelay, maxDelay);
        this.time.delayedCall(randomDelay, () => this.criarObstaculo(), [], this);
    }

    criarMoeda() {
        if (this._isTransitioning) return;

        const y = Phaser.Math.Between(520, 590);

        const coin = this.coins.create(1350, y, 'coin');

        coin.setScale(2);
        coin.play('coinSpin');

        coin.body.setAllowGravity(false);
        coin.body.setSize(14, 14);
        coin.body.setOffset(1, 1);

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

    agendarProximaMoeda() {
        const randomDelay = Phaser.Math.Between(1200, 2600);
        this.time.delayedCall(randomDelay, this.criarMoeda, [], this);
    }

    collectCoin(player, coin) {
        this.tweens.killTweensOf(coin);
        coin.destroy();
        this.coinsCollected += 1;
        this.coinText.setText(`${t('coins')}: ${this.coinsCollected}`);
    }

    gameOver() {
        if (this._isTransitioning || this._isPaused || this._isCountingDown) return;
        this._isTransitioning = true;
        this.physics.pause();
        if (this.gameMusic && this.gameMusic.isPlaying) {
            this.gameMusic.stop();
        }

        this.player.setTint(0xff0000);
        this.transitionTo('GameOverScene', { score: Math.floor(this.score / 10), coins: this.coinsCollected });
    }

    transitionTo(targetScene, data) {
        const dur = 400;
        this.sound.sounds.forEach(s => {
            try {
                if (!s) return;
                if (s.isPlaying) {
                    this.tweens.killTweensOf(s);
                    this.tweens.add({ targets: s, volume: 0, duration: dur, onComplete: () => { try { s.stop(); } catch(e){} } });
                }
            } catch (e) {}
        });

        this.cameras.main.fadeOut(dur, 0, 0, 0);
        let fired = false;
        this.cameras.main.once('camerafadeoutcomplete', () => {
            fired = true;
            this.scene.start(targetScene, data);
        });
        this.time.delayedCall(dur + 200, () => { if (!fired) this.scene.start(targetScene, data); });
    }
}