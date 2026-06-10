import Phaser from 'phaser';

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

        this.add.text(640, 220, 'DEFINIÇÕES', { fontSize: '36px', fill: '#d4af37', fontStyle: 'bold' }).setOrigin(0.5);


        const cur = parseFloat(localStorage.getItem('tp2_volume')) || 0.5;
        this._isMuted = localStorage.getItem('tp2_muted') === 'true';

        this.add.text(300, 300, 'Volume', { fontSize: '20px', fill: '#f5deb3' }).setOrigin(0, 0.5);

        this.add.rectangle(400, 300, 300, 10, 0x3d2414).setOrigin(0, 0.5);

        
        this._sliderFill = this.add.rectangle(400, 300, 300 * cur, 10, 0xd4af37).setOrigin(0, 0.5);

        
        this._sliderKnob = this.add.circle(400 + (300 * cur), 300, 12, 0xffffff)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(2, 0x8b4513);

        this._valueText = this.add.text(730, 300, Math.round(cur * 100) + '%', { fontSize: '18px', fill: '#f5deb3' }).setOrigin(0.5);

        this._muteBtn = this.add.rectangle(790, 300, 40, 40, this._isMuted ? 0xff4444 : 0x44ff44)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(2, 0xd4af37);

        this._muteIcon = this.add.text(790, 300, this._isMuted ? '✕' : '♪', { fontSize: '24px', fill: '#fff' }).setOrigin(0.5);

        const updateVolume = (v) => {
            const actualVolume = this._isMuted ? 0 : v;
            this._valueText.setText(this._isMuted ? 'MUTE' : Math.round(v * 100) + '%');
            this._sliderFill.width = 300 * v;
            this._sliderKnob.x = 400 + (300 * v);
            try { localStorage.setItem('tp2_volume', String(v)); } catch (e) {}
            this.sound.sounds.forEach(s => { try { if (s.setVolume) s.setVolume(actualVolume); else s.volume = actualVolume; } catch (e) {} });
        };

        this._sliderKnob.on('pointerdown', () => {
            this._isDragging = true;
        });

        this.input.on('pointermove', (pointer) => {
            if (this._isDragging) {
                let newX = Math.max(400, Math.min(700, pointer.x));
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
            this._muteIcon.setText(this._isMuted ? '✕' : '♪');
            const currentVol = (this._sliderKnob.x - 400) / 300;
            updateVolume(currentVol);
        });

        // Initial volume set
        updateVolume(cur);

        
        const closeBtn = this.add.text(640, 380, 'Fechar', { fontSize: '20px', fill: '#fff', backgroundColor: '#8b4513' })
            .setOrigin(0.5).setInteractive({ useHandCursor: true });
        closeBtn.on('pointerdown', () => { if (!this._isTransitioning) this.transitionBack(); });

        this.cameras.main.fadeIn(300);
    }

    transitionBack() {
        if (this._isTransitioning) return;
        this._isTransitioning = true;

        const dur = 300;
        
        
        this.cameras.main.fadeOut(dur);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('MenuScene');
        });
    }

    shutdown() {
        if (this._domEl) { try { this._domEl.destroy(); this._domEl = null; } catch(e){} }
    }
}
