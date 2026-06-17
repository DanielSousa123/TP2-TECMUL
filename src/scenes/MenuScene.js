import Phaser from 'phaser';
import { t } from '../traducao.js';

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    preload() {
        this.load.image('fundo', 'assets/images/background2.jpg');
        this.load.audio('menuMusic', 'assets/music/Losing Sight.wav');
        this.load.audio('hoverSfx', 'assets/music/Retro1.wav');
    }

    create() {
        this._isTransitioning = false;
        this.background = this.add.tileSprite(640, 360, 1280, 720, 'fundo');
        this.background.tileScaleX = 1280 / 1416;
        this.background.tileScaleY = 720 / 980;

        const isMuted = localStorage.getItem('tp2_muted') === 'true';
        const volume = parseFloat(localStorage.getItem('tp2_volume')) || 0.5;
        const actualVolume = isMuted ? 0 : volume;

        this.menuMusic = this.sound.get('menuMusic');
        if (!this.menuMusic) {
            this.menuMusic = this.sound.add('menuMusic', { loop: true, volume: 0 });
            this.menuMusic.play();
            this.tweens.add({ targets: this.menuMusic, volume: actualVolume, duration: 700 });
        } else if (!this.menuMusic.isPlaying) {
            this.menuMusic.play();
            this.tweens.add({ targets: this.menuMusic, volume: actualVolume, duration: 700 });
        }

        this.cameras.main.fadeIn(400);
        this.add.rectangle(640, 360, 1280, 720, 0x2a1a0a, 0.6);

        const cx = 640;
        this.add.text(cx, 140, 'DAMNATION', {
            fontSize: '70px',
            fontStyle: 'bold',
            fill: '#f5deb3',
            stroke: '#8b4513',
            strokeThickness: 8
        }).setOrigin(0.5);
        this.add.text(cx, 200, t('subtitle'), { fontSize: '20px', fill: '#d2b48c' }).setOrigin(0.5);
        this.add.text(cx, 255, '--------------------', { fontSize: '16px', fill: '#8b7355' }).setOrigin(0.5);

        const playY = 300;
        const btnW = 280;
        const btnH = 72;

        const darken = (hex, amt) => {
            const r = Math.max(0, ((hex >> 16) & 0xff) - amt);
            const g = Math.max(0, ((hex >> 8) & 0xff) - amt);
            const b = Math.max(0, (hex & 0xff) - amt);
            return (r << 16) | (g << 8) | b;
        };

        const makeLeftButton = (y, label, color, cb) => {
            const bg = this.add.rectangle(cx, y, btnW, btnH, color).setInteractive({ useHandCursor: true });
            this.add.text(cx, y, label, { fontSize: '22px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
            const darker = darken(color, 28);

            bg.on('pointerover', () => {
                if (bg._isHover) return;
                bg._isHover = true;
                this.tweens.killTweensOf(bg);
                this.tweens.add({ targets: bg, scale: 1.05, duration: 120, ease: 'Power1' });
                bg.setFillStyle(darker);
                try { this.sound.play('hoverSfx', { volume: 0.6 }); } catch (e) {}
            });
            bg.on('pointerout', () => {
                bg._isHover = false;
                this.tweens.killTweensOf(bg);
                this.tweens.add({ targets: bg, scale: 1.0, duration: 120, ease: 'Power1' });
                bg.setFillStyle(color);
            });
            bg.on('pointerdown', cb);
            return bg;
        };

        makeLeftButton(playY, t('start'), 0xb8860b, () => { if (!this._isTransitioning) this.transitionTo('GameScene'); });
        makeLeftButton(playY + 96, t('shop'), 0x8b6914, () => { if (!this._isTransitioning) this.transitionTo('ShopScene'); });
        makeLeftButton(playY + 192, t('settings'), 0x8b6914, () => { if (!this._isTransitioning) this.transitionTo('SettingsScene'); });
        makeLeftButton(playY + 288, t('rules'), 0x8b6914, () => this.showHowTo());

        this.input.keyboard.on('keydown-SPACE', () => { if (!this._isTransitioning) this.transitionTo('GameScene'); });
        this.input.keyboard.on('keydown-ENTER', () => { if (!this._isTransitioning) this.transitionTo('GameScene'); });

        this.updateStatsDisplay();
    }

    update() {
        this.background.tilePositionX += 0.25;
    }

    transitionTo(targetScene, data) {
        if (this._isTransitioning) return;
        this._isTransitioning = true;

        const dur = 400;
        if (targetScene === 'GameScene' || targetScene === 'GameOverScene') {
            this.sound.stopAll();
        }

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

    showOptions() {
        this.transitionTo('SettingsScene');
    }

    showHowTo() {
        alert(t('howTo'));
    }

    updateStatsDisplay() {
        const highestScore = localStorage.getItem('tp2_highest_score') || 0;
        const totalCoins = localStorage.getItem('tp2_total_coins') || 0;

        // Remove existing stats display if any
        if (this._statsDisplay) {
            this._statsDisplay.destroy();
        }

        this._statsDisplay = this.add.text(640, 240, `${t('highestScore')}: ${highestScore} | ${t('coins')}: ${totalCoins}`, {
            fontSize: '20px',
            fill: '#ffd966',
            stroke: '#4a260d',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(10);
    }
}
