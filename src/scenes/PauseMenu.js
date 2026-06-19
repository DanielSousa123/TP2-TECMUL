import { t } from '../traducao.js';

export default class PauseMenu {
    constructor(scene) {
        this.scene = scene;
    }

    build() {
        const scene = this.scene;
        const group = scene.add.group();
        this.group = group;

        const dim = scene.add.rectangle(640, 360, 1280, 720, 0x000000, 0.65).setDepth(20);

        const panel = scene.add.rectangle(640, 360, 420, 420, 0x2a1a0a, 0.97)
            .setStrokeStyle(3, 0xd4af37).setDepth(20);

        this.titleText = scene.add.text(640, 210, t('pause'), {
            fontSize: '40px', fontStyle: 'bold',
            fill: '#d4af37', stroke: '#4a260d', strokeThickness: 6
        }).setOrigin(0.5).setDepth(20);

        // Resume button
        const resumeBtn = this._makeBtn(640, 295, t('resume'), 0xb8860b, () => {
            if (!scene._isCountingDown) this.startResumeCountdown();
        });

        // Settings button (same label/style as the main menu's settings option)
        const settingsBtn = this._makeBtn(640, 365, t('settings'), 0x8b6914, () => {
            if (!scene._isCountingDown) this._showSettings();
        });

        // Exit to menu button
        const menuBtn = this._makeBtn(640, 435, t('exit'), 0x8b6914, () => {
            if (!scene._isTransitioning && !scene._isCountingDown) {
                this.hide();
                scene.transitionTo('MenuScene');
            }
        });

        this.mainElements = [
            resumeBtn.bg, resumeBtn.label,
            settingsBtn.bg, settingsBtn.label,
            menuBtn.bg, menuBtn.label
        ];

        // Countdown text
        this.countdownText = scene.add.text(640, 360, '', {
            fontSize: '72px', fontStyle: 'bold',
            fill: '#ffffff', stroke: '#000000', strokeThickness: 8
        }).setOrigin(0.5).setDepth(25).setVisible(false);

        this.dim = dim;

        this._buildSettingsControls();

        group.addMultiple([dim, panel, this.titleText, ...this.mainElements,
                            this.countdownText, ...this.settingsElements]);

        this.hide();
    }

    _buildSettingsControls() {
        const scene = this.scene;
        const sliderStartX = 520;
        const sliderWidth = 240;
        const sliderY = 310;

        this.sliderStartX = sliderStartX;
        this.sliderWidth = sliderWidth;

        const volumeLabel = scene.add.text(640, 268, t('volume'), {
            fontSize: '20px', fill: '#f5deb3'
        }).setOrigin(0.5).setDepth(20);

        const sliderBg = scene.add.rectangle(sliderStartX, sliderY, sliderWidth, 10, 0x3d2414)
            .setOrigin(0, 0.5).setDepth(20);

        const cur = parseFloat(localStorage.getItem('tp2_volume')) || 0.5;

        const sliderFill = scene.add.rectangle(sliderStartX, sliderY, sliderWidth * cur, 10, 0xd4af37)
            .setOrigin(0, 0.5).setDepth(20);

        const sliderKnob = scene.add.circle(sliderStartX + (sliderWidth * cur), sliderY, 12, 0xffffff)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(2, 0x8b4513)
            .setDepth(21);

        const valueText = scene.add.text(640, 345, Math.round(cur * 100) + '%', {
            fontSize: '18px', fill: '#f5deb3'
        }).setOrigin(0.5).setDepth(20);

        this.isMuted = localStorage.getItem('tp2_muted') === 'true';

        const muteBtn = scene.add.rectangle(640, 400, 48, 48, this.isMuted ? 0xff4444 : 0x44ff44)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(2, 0xd4af37)
            .setDepth(20);
        const muteIcon = scene.add.text(640, 400, this.isMuted ? 'X' : '♪', {
            fontSize: '24px', fill: '#fff'
        }).setOrigin(0.5).setDepth(21);

        const backBtn = scene.add.text(640, 470, t('close'), {
            fontSize: '20px', fill: '#fff',
            backgroundColor: '#8b4513', padding: { x: 18, y: 8 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(20);

        this.sliderFill = sliderFill;
        this.sliderKnob = sliderKnob;
        this.valueText = valueText;
        this.muteBtn = muteBtn;
        this.muteIcon = muteIcon;

        this.settingsElements = [
            volumeLabel, sliderBg, sliderFill, sliderKnob,
            valueText, muteBtn, muteIcon, backBtn
        ];

        sliderKnob.on('pointerdown', () => { this.volDragging = true; });

        scene.input.on('pointermove', (pointer) => {
            if (this.volDragging) {
                const minX = this.sliderStartX;
                const maxX = this.sliderStartX + this.sliderWidth;
                const newX = Math.max(minX, Math.min(maxX, pointer.x));
                const v = (newX - minX) / this.sliderWidth;
                this._updateVolume(v);
            }
        });

        scene.input.on('pointerup', () => { this.volDragging = false; });

        muteBtn.on('pointerdown', () => {
            this.isMuted = !this.isMuted;
            try { localStorage.setItem('tp2_muted', String(this.isMuted)); } catch (e) {}
            this.muteBtn.setFillStyle(this.isMuted ? 0xff4444 : 0x44ff44);
            this.muteIcon.setText(this.isMuted ? 'X' : '♪');
            const currentV = (this.sliderKnob.x - this.sliderStartX) / this.sliderWidth;
            this._updateVolume(currentV);
        });

        backBtn.on('pointerdown', () => this._hideSettings());
    }

    _updateVolume(v) {
        const scene = this.scene;
        const actualVolume = this.isMuted ? 0 : v;

        this.valueText.setText(this.isMuted ? t('muted') : Math.round(v * 100) + '%');
        this.sliderFill.width = this.sliderWidth * v;
        this.sliderKnob.x = this.sliderStartX + (this.sliderWidth * v);

        try { localStorage.setItem('tp2_volume', String(v)); } catch (e) {}

        scene.sound.sounds.forEach(s => {
            try {
                if (s === scene.gameMusic) return; // handled by the resume countdown
                if (s.setVolume) s.setVolume(actualVolume);
                else s.volume = actualVolume;
            } catch (e) {}
        });
    }

    _showSettings() {
        this.mainElements.forEach(o => o.setVisible(false));
        this.titleText.setText(t('settings'));

        const vol = parseFloat(localStorage.getItem('tp2_volume')) || 0.5;
        this.isMuted = localStorage.getItem('tp2_muted') === 'true';
        this.muteBtn.setFillStyle(this.isMuted ? 0xff4444 : 0x44ff44);
        this.muteIcon.setText(this.isMuted ? 'X' : '♪');
        this._updateVolume(vol);

        this.settingsElements.forEach(o => o.setVisible(true));
    }

    _hideSettings() {
        this.settingsElements.forEach(o => o.setVisible(false));
        this.titleText.setText(t('pause'));
        this.mainElements.forEach(o => o.setVisible(true));
    }

    _makeBtn(x, y, label, color, cb) {
        const scene = this.scene;
        const bg = scene.add.rectangle(x, y, 280, 58, color)
            .setInteractive({ useHandCursor: true })
            .setDepth(20)
            .setStrokeStyle(2, 0xd4af37);

        const lbl = scene.add.text(x, y, label, {
            fontSize: '22px', fill: '#fff', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(21);

        const darker = (c, amt) => {
            const r = Math.max(0, ((c >> 16) & 0xff) - amt);
            const g = Math.max(0, ((c >> 8)  & 0xff) - amt);
            const b = Math.max(0, ( c        & 0xff) - amt);
            return (r << 16) | (g << 8) | b;
        };

        bg.on('pointerover', () => {
            scene.tweens.add({ targets: bg, scale: 1.05, duration: 100, ease: 'Power1' });
            bg.setFillStyle(darker(color, 30));
        });
        bg.on('pointerout', () => {
            scene.tweens.add({ targets: bg, scale: 1.0, duration: 100, ease: 'Power1' });
            bg.setFillStyle(color);
        });
        bg.on('pointerdown', cb);

        return { bg, label: lbl };
    }

    show() {
        this.group.getChildren().forEach(c => {
            if (c !== this.countdownText) c.setVisible(true);
        });
        this.titleText.setText(t('pause'));
        this.settingsElements.forEach(o => o.setVisible(false));
    }

    hide() {
        this.group.getChildren().forEach(c => c.setVisible(false));
    }

    toggle() {
        const scene = this.scene;
        if (scene._isTransitioning || scene._isCountingDown) return;

        if (scene._isPaused) {
            this.startResumeCountdown();
        } else {
            scene._isPaused = true;
            scene.physics.pause();
            scene.time.paused = true;
            if (scene.gameMusic && scene.gameMusic.isPlaying) {
                scene.tweens.add({ targets: scene.gameMusic, volume: 0, duration: 300 });
            }
            scene.pauseBtn.setText('▶');
            this.show();
        }
    }

    startResumeCountdown() {
        const scene = this.scene;
        if (scene._isCountingDown) return;
        scene._isCountingDown = true;

        this.group.getChildren().forEach(c => {
            if (c !== this.countdownText) c.setVisible(false);
        });

        const dim = this.group.getChildren()[0];
        if (dim) { dim.setAlpha(0.4); dim.setVisible(true); }

        this.countdownText.setVisible(true);

        let count = 3;
        const showCount = () => {
            if (count <= 0) {
                this.countdownText.setVisible(false);
                if (dim) dim.setAlpha(0.65);
                scene._isCountingDown = false;
                scene._isPaused = false;
                scene.pauseBtn.setText('⏸');
                this.hide();
                scene.physics.resume();
                scene.time.paused = false;
                const vol = parseFloat(localStorage.getItem('tp2_volume')) || 0.5;
                const muted = localStorage.getItem('tp2_muted') === 'true';
                if (scene.gameMusic) {
                    scene.tweens.add({ targets: scene.gameMusic, volume: muted ? 0 : vol, duration: 300 });
                }
                return;
            }

            this.countdownText.setText(String(count));
            this.countdownText.setScale(1.4);
            this.countdownText.setAlpha(1);

            scene.tweens.add({
                targets: this.countdownText,
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
}