import Phaser from 'phaser';

export default class SettingsScene extends Phaser.Scene {
    constructor() {
        super('SettingsScene');
    }

    preload() {
        this.load.image('fundo', 'assets/images/background2.jpg');
    }

    create() {
        this.background = this.add.tileSprite(640, 360, 1280, 720, 'fundo');
        this.background.tileScaleX = 1280 / 1416;
        this.background.tileScaleY = 720 / 980;

        // dark panel
        this.add.rectangle(640, 360, 780, 420, 0x2a1a0a, 0.95).setStrokeStyle(3, 0xd4af37);

        this.add.text(640, 220, 'DEFINIÇÕES', { fontSize: '36px', fill: '#d4af37', fontStyle: 'bold' }).setOrigin(0.5);

        // Load current volume from storage
        const cur = parseFloat(localStorage.getItem('tp2_volume')) || 0.5;

        // Label
        this.add.text(420, 300, 'Volume', { fontSize: '20px', fill: '#f5deb3' }).setOrigin(0, 0.5);

        // Create an HTML range input centered in the scene
        const el = document.createElement('input');
        el.type = 'range'; el.min = '0'; el.max = '1'; el.step = '0.01'; el.value = String(cur);
        Object.assign(el.style, { width: '420px' });

        this._domEl = this.add.dom(640, 300, el);

        this._valueText = this.add.text(980, 300, Math.round(cur * 100) + '%', { fontSize: '18px', fill: '#f5deb3' }).setOrigin(0.5);

        el.addEventListener('input', (e) => {
            const v = parseFloat(e.target.value);
            this._valueText.setText(Math.round(v * 100) + '%');
            try { localStorage.setItem('tp2_volume', String(v)); } catch (e) {}
            this.sound.sounds.forEach(s => { try { if (s.setVolume) s.setVolume(v); else s.volume = v; } catch (e) {} });
        });

        // Buttons
        const closeBtn = this.add.text(640, 380, 'Fechar', { fontSize: '20px', fill: '#fff', backgroundColor: '#8b4513' })
            .setOrigin(0.5).setInteractive({ useHandCursor: true });
        closeBtn.on('pointerdown', () => this.transitionBack());

        this.cameras.main.fadeIn(300);
    }

    transitionBack() {
        const dur = 300;
        // safe per-sound fade
        this.sound.sounds.forEach(s => {
            try {
                if (!s) return;
                if (s.isPlaying) {
                    this.tweens.killTweensOf(s);
                    this.tweens.add({ targets: s, volume: 0, duration: dur, onComplete: () => { try { s.stop(); } catch(e){} } });
                }
            } catch (e) {}
        });

        this.cameras.main.fadeOut(dur);
        let fired = false;
        this.cameras.main.once('camerafadeoutcomplete', () => {
            fired = true;
            this.scene.start('MenuScene');
        });
        this.time.delayedCall(dur + 200, () => { if (!fired) this.scene.start('MenuScene'); });
    }

    shutdown() {
        if (this._domEl) { try { this._domEl.destroy(); } catch(e){} }
    }
}
