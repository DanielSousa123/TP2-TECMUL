import Phaser from 'phaser';

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
    }

    create() {
        this._isTransitioning = false;
        this.velocidadeJogo = 300;
        this.velocidadeMaxima = 800;
        this.aceleracao = 0.05;
        this.score = 0;

        this.background = this.add.tileSprite(640, 360, 1280, 720, 'fundo');
        this.background.tileScaleX = 1280 / 1416;
        this.background.tileScaleY = 720 / 980;

        this.scoreText = this.add.text(16, 16, 'Pontos: 0', { fontSize: '24px', fill: '#fff' });

        const chaoCanvas = this.make.graphics({ x: 0, y: 0, add: false });
        chaoCanvas.fillStyle(0x8B4513);
        chaoCanvas.fillRect(0, 0, 32, 32);
        chaoCanvas.generateTexture('texturaChao', 32, 32);

        this.chao = this.add.tileSprite(640, 675, 1280, 90, 'texturaChao');
        this.physics.add.existing(this.chao, true);

        this.player = this.physics.add.sprite(100, 200, 'player');
        this.player.setScale(0.05);
        this.player.setCollideWorldBounds(true);
        this.physics.add.collider(this.player, this.chao);

        this.teclas = this.input.keyboard.createCursorKeys();

        this.obstaculos = this.physics.add.group();

        const obstaculoCanvas = this.make.graphics({ x: 0, y: 0, add: false });
        obstaculoCanvas.fillStyle(0xff3333);
        obstaculoCanvas.fillRect(0, 0, 25, 40);
        obstaculoCanvas.generateTexture('texturaObstaculo', 25, 40);

        // Schedule first obstacle with random delay
        this.agendarProximoObstaculo();

        this.physics.add.collider(this.player, this.obstaculos, this.gameOver, null, this);

        this.cameras.main.fadeIn(400);
    }

    update() {
        if (this.velocidadeJogo < this.velocidadeMaxima) {
            this.velocidadeJogo += this.aceleracao;
        }

        this.background.tilePositionX += this.velocidadeJogo * 0.002;
        this.chao.tilePositionX += this.velocidadeJogo * 0.015;

        if ((this.teclas.up.isDown || this.teclas.space.isDown) && this.player.body.touching.down) {
            this.player.setVelocityY(-200);
        }

        this.score += 1;
        this.scoreText.setText('Pontos: ' + Math.floor(this.score / 10));

        this.obstaculos.getChildren().forEach(obstaculo => {
            obstaculo.setVelocityX(-this.velocidadeJogo);
            if (obstaculo.x < -50) {
                obstaculo.destroy();
            }
        });
    }

    criarObstaculo() {
        const obstaculo = this.obstaculos.create(1350, 610, 'texturaObstaculo');
        obstaculo.body.setAllowGravity(false);
        obstaculo.body.setImmovable(true);

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

    gameOver() {
        this.physics.pause();

        this.player.setTint(0xff0000);

        this.transitionTo('GameOverScene', { score: Math.floor(this.score / 10) });
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