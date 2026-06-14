import Phaser from 'phaser';
import { t } from '../traducao.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        if (!this.textures.exists('fundo')) {
            this.load.image('fundo', 'assets/images/background2.jpg');
        }
        if (!this.textures.exists('player')) {
            this.load.image('player', 'assets/images/player.png');
        }
        if (!this.textures.exists('cactus')) {
            this.load.image('cactus', 'assets/images/cactus.png');
        }
        this.load.audio('gameMusic', '/assets/music/gamemusic.mp3');
    }

    create() {
        this._isTransitioning = false;
        this.velocidadeJogo = 300;
        this.velocidadeMaxima = 800;
        this.aceleracao = 0.05;
        this.score = 0;
        this.coinsCollected = 0;

        this.background = this.add.tileSprite(640, 360, 1280, 720, 'fundo');
        this.background.tileScaleX = 1280 / 1416;
        this.background.tileScaleY = 720 / 980;

        this.scoreText = this.add.text(16, 16, `${t('score')}: 0`, { fontSize: '24px', fill: '#fff' });
        this.coinText = this.add.text(16, 48, `${t('coins')}: 0`, { fontSize: '24px', fill: '#ffd966' });
        this.startGameMusic();

        if (!this.textures.exists('texturaChao')) {
            const chaoCanvas = this.make.graphics({ x: 0, y: 0, add: false });
            chaoCanvas.fillStyle(0xd9a441);
            chaoCanvas.fillRect(0, 0, 64, 32);
            chaoCanvas.fillStyle(0xc58b32);
            chaoCanvas.fillRect(0, 0, 64, 5);
            chaoCanvas.fillStyle(0xe8bf68, 0.7);
            chaoCanvas.fillEllipse(14, 15, 24, 5);
            chaoCanvas.fillEllipse(48, 23, 30, 4);
            chaoCanvas.fillStyle(0x9b6626, 0.8);
            chaoCanvas.fillCircle(27, 19, 2);
            chaoCanvas.fillCircle(58, 12, 1.5);
            chaoCanvas.generateTexture('texturaChao', 64, 32);
        }

        this.chao = this.add.tileSprite(640, 675, 1280, 90, 'texturaChao');
        this.physics.add.existing(this.chao, true);

        this.player = this.physics.add.sprite(100, 200, 'player');
        this.player.setScale(0.05);
        this.player.setCollideWorldBounds(true);
        this.player.body.setSize(720, 1320);
        this.player.body.setOffset(560, 600);
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

        // Schedule first obstacle with random delay
        this.agendarProximoObstaculo();
        this.agendarProximaMoeda();

        this.physics.add.collider(this.player, this.obstaculos, this.gameOver, null, this);
        this.physics.add.overlap(this.player, this.coins, this.collectCoin, null, this);

        this.cameras.main.fadeIn(400);
    }

    update() {
        if (this.velocidadeJogo < this.velocidadeMaxima) {
            this.velocidadeJogo += this.aceleracao;
        }

        this.background.tilePositionX += this.velocidadeJogo * 0.002;
        this.chao.tilePositionX += this.velocidadeJogo * 0.015;

        if ((this.teclas.up.isDown || this.teclas.space.isDown) && this.player.body.touching.down) {
            this.player.setVelocityY(-250);
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
            coin.angle += 4;
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
        const obstaculo = this.obstaculos.create(1350, 600, 'cactus');
        obstaculo.setScale(0.065);
        obstaculo.body.setAllowGravity(false);
        obstaculo.body.setImmovable(true);
        obstaculo.body.setSize(420, 820);
        obstaculo.body.setOffset(258, 105);

        // Schedule next obstacle with random delay
        this.agendarProximoObstaculo();
    }

    agendarProximoObstaculo() {
        // Calculate random delay based on game speed
        // Faster game = shorter delay, but always enough space to jump
        const minDelay = 1000;
        const maxDelay = 3000;
        const randomDelay = Phaser.Math.Between(minDelay, maxDelay);

        this.time.delayedCall(randomDelay, this.criarObstaculo, [], this);
    }

    criarMoeda() {
        const y = Phaser.Math.Between(520, 590);
        const coin = this.coins.create(1350, y, 'texturaMoeda');
        coin.body.setAllowGravity(false);
        coin.body.setCircle(14);

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
        if (this._isTransitioning) return;
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
