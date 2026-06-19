import Phaser from 'phaser';
import { getLanguage, setLanguage, t } from '../traducao.js';

export default class SettingsScene extends Phaser.Scene {
    constructor() {
        super('SettingsScene');
    }

    preload() {
        this.load.image('fundo', 'assets/images/background2.jpg');
    }

    create() {
        this._isTransitioning = false;
        this.background = this.add.tileSprite(640, 360, 1280, 720, 'fundo');
        this.background.tileScaleX = 1280 / 1416;
        this.background.tileScaleY = 720 / 980;

        this.add.rectangle(640, 360, 780, 420, 0x2a1a0a, 0.95).setStrokeStyle(3, 0xd4af37);
        this.add.text(640, 185, t('settings'), { fontSize: '36px', fill: '#d4af37', fontStyle: 'bold' }).setOrigin(0.5);

        const cur = parseFloat(localStorage.getItem('tp2_volume')) || 0.5;
        this._isMuted = localStorage.getItem('tp2_muted') === 'true';

        this.add.text(300, 285, t('volume'), { fontSize: '20px', fill: '#f5deb3' }).setOrigin(0, 0.5);
        this.add.rectangle(400, 285, 300, 10, 0x3d2414).setOrigin(0, 0.5);

        this._sliderFill = this.add.rectangle(400, 285, 300 * cur, 10, 0xd4af37).setOrigin(0, 0.5);
        this._sliderKnob = this.add.circle(400 + (300 * cur), 285, 12, 0xffffff)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(2, 0x8b4513);
        this._valueText = this.add.text(730, 285, Math.round(cur * 100) + '%', { fontSize: '18px', fill: '#f5deb3' }).setOrigin(0.5);
        this._muteBtn = this.add.rectangle(790, 285, 40, 40, this._isMuted ? 0xff4444 : 0x44ff44)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(2, 0xd4af37);
        this._muteIcon = this.add.text(790, 285, this._isMuted ? 'X' : '♪', { fontSize: '24px', fill: '#fff' }).setOrigin(0.5);

        const updateVolume = (v) => {
            const actualVolume = this._isMuted ? 0 : v;
            this._valueText.setText(this._isMuted ? t('muted') : Math.round(v * 100) + '%');
            this._sliderFill.width = 300 * v;
            this._sliderKnob.x = 400 + (300 * v);
            try { localStorage.setItem('tp2_volume', String(v)); } catch (e) {}
            this.sound.sounds.forEach(s => {
                try {
                    if (s.setVolume) s.setVolume(actualVolume);
                    else s.volume = actualVolume;
                } catch (e) {}
            });
        };

        this._sliderKnob.on('pointerdown', () => {
            this._isDragging = true;
        });

        this.input.on('pointermove', (pointer) => {
            if (this._isDragging) {
                const newX = Math.max(400, Math.min(700, pointer.x));
                const v = (newX - 400) / 300;
                updateVolume(v);
            }
        });

        this.input.on('pointerup', () => {
            this._isDragging = false;
        });

        this._muteBtn.on('pointerdown', () => {
            this._isMuted = !this._isMuted;
            localStorage.setItem('tp2_muted', String(this._isMuted));
            this._muteBtn.setFillStyle(this._isMuted ? 0xff4444 : 0x44ff44);
            this._muteIcon.setText(this._isMuted ? 'X' : '♪');
            const currentVol = (this._sliderKnob.x - 400) / 300;
            updateVolume(currentVol);
        });

        updateVolume(cur);
        this.createLanguageControls();

        const closeBtn = this.add.text(640, 465, t('close'), {
            fontSize: '20px',
            fill: '#fff',
            backgroundColor: '#8b4513',
            padding: { x: 18, y: 8 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        closeBtn.on('pointerdown', () => { if (!this._isTransitioning) this.transitionBack(); });

        this.cameras.main.fadeIn(300);
    }

    createLanguageControls() {
        this.add.text(300, 360, t('language'), { fontSize: '20px', fill: '#f5deb3' }).setOrigin(0, 0.5);

        const currentLanguage = getLanguage();
        const makeLanguageButton = (x, language, label) => {
            const active = currentLanguage === language;
            const bg = this.add.rectangle(x, 360, 150, 44, active ? 0xb8860b : 0x5b3518)
                .setInteractive({ useHandCursor: true })
                .setStrokeStyle(2, active ? 0xffd966 : 0x8b6914);
            this.add.text(x, 360, label, { fontSize: '18px', fill: '#fff', fontStyle: active ? 'bold' : 'normal' }).setOrigin(0.5);

            bg.on('pointerdown', () => {
                setLanguage(language);
                this.scene.restart();
            });
        };

        makeLanguageButton(475, 'pt', t('portuguese'));
        makeLanguageButton(645, 'en', t('english'));
        makeLanguageButton(815, 'es', t('spanish'));
    }

    transitionBack() {
        if (this._isTransitioning) return;
        this._isTransitioning = true;

        this.cameras.main.fadeOut(300);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('MenuScene');
        });
    }

    shutdown() {
        if (this._domEl) {
            try {
                this._domEl.destroy();
                this._domEl = null;
            } catch (e) {}
        }
    }
}
