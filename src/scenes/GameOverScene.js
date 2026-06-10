import Phaser from 'phaser';

export default class GameOverScene extends Phaser.Scene {
    constructor() {
        super('GameOverScene');
    }

    init(data) {
        this.finalScore = data.score || 0;
    }

    preload() {
        this.load.image('fundo', 'assets/images/background2.jpg');
        this.load.audio('gameOverMusic', '/assets/music/Medusa.wav');
        this.load.audio('hoverSfx', '/assets/music/Retro1.wav');
    }

    create() {
        this.background = this.add.tileSprite(640, 360, 1280, 720, 'fundo');
        this.background.tileScaleX = 1280 / 1416;
        this.background.tileScaleY = 720 / 980;
        this.add.rectangle(640, 360, 1280, 720, 0x0a0a0a, 0.85);

        this.sound.stopAll();
        if (!this.sound.get('gameOverMusic')) {
            this.gameOverMusic = this.sound.add('gameOverMusic', { loop: true, volume: 0 });
            this.gameOverMusic.play();
            this.tweens.add({ targets: this.gameOverMusic, volume: 0.5, duration: 700 });
        }

        this.cameras.main.fadeIn(400);

        this.add.text(640, 140, 'GAME OVER', { fontSize: '88px', fontStyle: 'bold', fill: '#d4af37', stroke: '#654321', strokeThickness: 8 }).setOrigin(0.5);
        this.add.text(640, 230, `Pontuação: ${this.finalScore}`, { fontSize: '40px', fill: '#f5deb3', stroke: '#8b4513', strokeThickness: 4 }).setOrigin(0.5);

        this.savePromptText = this.add.text(640, 280, 'Guarda a tua pontuação (opcional)', { fontSize: '20px', fill: '#d2b48c' }).setOrigin(0.5);

        this.createNameInputOverlay();

        const makeGameOverButton = (x, label, color, cb) => {
            const btn = this.add.rectangle(x, 420, 280, 64, color).setInteractive({ useHandCursor: true });
            const txt = this.add.text(x, 420, label, { fontSize: '22px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5);

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

        makeGameOverButton(480, 'TENTAR DE NOVO', 0xb8860b, () => { this.cleanupOverlay(); this.transitionTo('GameScene'); });
        makeGameOverButton(800, 'MENU PRINCIPAL', 0x8b6914, () => { this.cleanupOverlay(); this.transitionTo('MenuScene'); });

        this.input.keyboard.once('keydown-SPACE', () => { this.cleanupOverlay(); this.transitionTo('GameScene'); });
        this.input.keyboard.once('keydown-ESC',   () => { this.cleanupOverlay(); this.transitionTo('MenuScene'); });
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

    saveScore(name, score) {
        try {
            const key = 'tp2_leaderboard';
            const raw = localStorage.getItem(key);
            const arr = raw ? JSON.parse(raw) : [];
            arr.push({ name, score, date: Date.now() });
            arr.sort((a,b) => b.score - a.score);
            localStorage.setItem(key, JSON.stringify(arr.slice(0, 50)));
        } catch (e) {
        }
    }

    createNameInputOverlay() {
        this.cleanupOverlay();
        const container = document.createElement('div');
        container.id = 'tp2-name-input';
        Object.assign(container.style, {
            position: 'fixed', left: '50%', top: '70%', transform: 'translate(-50%, -50%)', zIndex: 9999,
            background: 'rgba(0,0,0,0.7)', padding: '12px', borderRadius: '8px', display: 'flex', gap: '10px', alignItems: 'center'
        });

        const input = document.createElement('input');
        input.type = 'text'; input.placeholder = 'Nome (máx 12)'; input.maxLength = 12;
        Object.assign(input.style, { padding: '8px 10px', fontSize: '14px', borderRadius: '6px', border: 'none', outline: 'none' });

        const saveBtn = document.createElement('button'); saveBtn.textContent = 'Guardar';
        Object.assign(saveBtn.style, { padding: '8px 10px', background: '#ff4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' });

        const skipBtn = document.createElement('button'); skipBtn.textContent = 'Pular';
        Object.assign(skipBtn.style, { padding: '8px 10px', background: '#666', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' });

        container.appendChild(input); container.appendChild(saveBtn); container.appendChild(skipBtn);
        document.body.appendChild(container);

        this._overlayCleanup = () => { const el = document.getElementById('tp2-name-input'); if (el) el.remove(); };

        saveBtn.addEventListener('click', () => {
            const name = (input.value.trim() || 'Player').slice(0,12);
            this.saveScore(name, this.finalScore);
            this.savePromptText.setText('Pontuação guardada!');
            this._overlayCleanup();
        });

        skipBtn.addEventListener('click', () => {
            this.savePromptText.setText('Pontuação não guardada');
            this._overlayCleanup();
        });

        saveBtn.addEventListener('mouseover', () => { try { this.sound.play('hoverSfx', { volume: 0.6 }); } catch(e){} });
        skipBtn.addEventListener('mouseover', () => { try { this.sound.play('hoverSfx', { volume: 0.6 }); } catch(e){} });

        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveBtn.click(); });
    }

    cleanupOverlay() {
        if (this._overlayCleanup) { this._overlayCleanup(); this._overlayCleanup = null; }
    }
}