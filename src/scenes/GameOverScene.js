import Phaser from 'phaser';
import { t } from '../traducao.js';

export default class GameOverScene extends Phaser.Scene {
    constructor() {
        super('GameOverScene');
    }

    init(data) {
        this.finalScore = data.score || 0;
        this.finalCoins = data.coins || 0;
    }

    preload() {
        this.load.image('fundo', 'assets/images/background2.jpg');
        this.load.audio('gameOverMusic', '/assets/music/Medusa.wav');
        this.load.audio('hoverSfx', '/assets/music/Retro1.wav');
    }

    create() {
        this._isTransitioning = false;
        this.background = this.add.tileSprite(640, 360, 1280, 720, 'fundo');
        this.background.tileScaleX = 1280 / 1416;
        this.background.tileScaleY = 720 / 980;
        this.add.rectangle(640, 360, 1280, 720, 0x0a0a0a, 0.85);

        const isMuted = localStorage.getItem('tp2_muted') === 'true';
        const volume = parseFloat(localStorage.getItem('tp2_volume')) || 0.5;
        const actualVolume = isMuted ? 0 : volume;

        this.sound.stopAll();
        this.gameOverMusic = this.sound.get('gameOverMusic');
        if (!this.gameOverMusic) {
            this.gameOverMusic = this.sound.add('gameOverMusic', { loop: true, volume: 0 });
            this.gameOverMusic.play();
            this.tweens.add({ targets: this.gameOverMusic, volume: actualVolume, duration: 700 });
        } else if (!this.gameOverMusic.isPlaying) {
            this.gameOverMusic.play();
            this.tweens.add({ targets: this.gameOverMusic, volume: actualVolume, duration: 700 });
        }

        this.cameras.main.fadeIn(400);

        this.add.text(640, 135, t('gameOver'), { fontSize: '88px', fontStyle: 'bold', fill: '#d4af37', stroke: '#654321', strokeThickness: 8 }).setOrigin(0.5);
        this.add.text(640, 230, `${t('finalScore')}: ${this.finalScore}`, { fontSize: '40px', fill: '#f5deb3', stroke: '#8b4513', strokeThickness: 4 }).setOrigin(0.5);
        this.add.text(640, 285, `${t('coins')}: ${this.finalCoins}`, { fontSize: '32px', fill: '#ffd966', stroke: '#8b4513', strokeThickness: 3 }).setOrigin(0.5);

        this.saveScore(this.finalScore, this.finalCoins);

        const makeGameOverButton = (x, label, color, cb) => {
            const btn = this.add.rectangle(x, 420, 280, 64, color).setInteractive({ useHandCursor: true });
            this.add.text(x, 420, label, { fontSize: '22px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5);

            const darker = (c, amt) => {
                const r = Math.max(0, ((c >> 16) & 0xff) - amt);
                const g = Math.max(0, ((c >> 8) & 0xff) - amt);
                const b = Math.max(0, (c & 0xff) - amt);
                return (r << 16) | (g << 8) | b;
            };

            btn.on('pointerover', () => {
                if (btn._isHover) return;
                btn._isHover = true;
                this.tweens.killTweensOf(btn);
                this.tweens.add({ targets: btn, scale: 1.08, duration: 110, ease: 'Power1' });
                btn.setFillStyle(darker(color, 30));
                try { this.sound.play('hoverSfx', { volume: 0.6 }); } catch (e) {}
            });
            btn.on('pointerout', () => {
                btn._isHover = false;
                this.tweens.killTweensOf(btn);
                this.tweens.add({ targets: btn, scale: 1.0, duration: 110, ease: 'Power1' });
                btn.setFillStyle(color);
            });
            btn.on('pointerdown', cb);
            return btn;
        };

        makeGameOverButton(480, t('tryAgain'), 0xb8860b, () => { this.transitionTo('GameScene'); });
        makeGameOverButton(800, t('mainMenu'), 0x8b6914, () => { this.transitionTo('MenuScene'); });

        this.input.keyboard.once('keydown-SPACE', () => { if (!this._isTransitioning) this.transitionTo('GameScene'); });
        this.input.keyboard.once('keydown-ESC', () => { if (!this._isTransitioning) this.transitionTo('MenuScene'); });
    }

    transitionTo(targetScene, data) {
        if (this._isTransitioning) return;
        this._isTransitioning = true;

        const dur = 400;
        this.sound.stopAll();
        this.cameras.main.fadeOut(dur, 0, 0, 0);

        let transitionComplete = false;
        this.cameras.main.once('camerafadeoutcomplete', () => {
            if (!transitionComplete) {
                transitionComplete = true;
                this.scene.start(targetScene, data);
            }
        });

        this.time.delayedCall(dur + 500, () => {
            if (!transitionComplete) {
                transitionComplete = true;
                this.scene.start(targetScene, data);
            }
        });
    }

    saveScore(score, coins) {
        try {
            const name = localStorage.getItem('tp2_player_name') || t('player');
            const key = 'tp2_leaderboard';
            const raw = localStorage.getItem(key);
            const arr = raw ? JSON.parse(raw) : [];
            const existingIndex = arr.findIndex(entry => entry.name === name);

            if (existingIndex !== -1) {
                arr[existingIndex].coins = coins;
                if (score > arr[existingIndex].score) {
                    arr[existingIndex].score = score;
                    arr[existingIndex].date = Date.now();
                }
            } else {
                arr.push({ name, score, coins, date: Date.now() });
            }

            arr.sort((a, b) => b.score - a.score);
            localStorage.setItem(key, JSON.stringify(arr.slice(0, 50)));
        } catch (e) {}
    }
}
