import Phaser from 'phaser';

export default class LeaderboardScene extends Phaser.Scene {
    constructor() {
        super('LeaderboardScene');
    }

    preload() {
        this.load.image('fundo', 'assets/images/background2.jpg');
    }

    create() {
        this.background = this.add.tileSprite(640, 360, 1280, 720, 'fundo');
        this.background.tileScaleX = 1280 / 1416;
        this.background.tileScaleY = 720 / 980;

        const bg = this.add.rectangle(640, 360, 780, 520, 0x3d2414, 0.98).setStrokeStyle(3, 0xd4af37);

        this.add.text(640, 140, 'RANKING', { fontSize: '36px', fill: '#d4af37', fontStyle: 'bold' }).setOrigin(0.5);

        const scores = (() => {
            try { const raw = localStorage.getItem('tp2_leaderboard'); return raw ? JSON.parse(raw) : []; } catch(e) { return []; }
        })().sort((a,b) => b.score - a.score).slice(0, 10);

        if (scores.length === 0) {
            this.add.text(640, 320, 'Sem pontuações', { fontSize: '20px', fill: '#8b7355' }).setOrigin(0.5);
        } else {
            let startY = 220;
            const gap = 44;
            scores.forEach((s, i) => {
                const place = i + 1;
                const prefix = place <= 3 ? `${place}º` : `${place}.`;
                this.add.text(360, startY + i*gap, `${prefix}`, { fontSize: '20px', fill: '#f5deb3' }).setOrigin(0, 0.5);
                this.add.text(420, startY + i*gap, `${s.name.slice(0,12)}`, { fontSize: '20px', fill: '#f5deb3' }).setOrigin(0, 0.5);
                this.add.text(980, startY + i*gap, `${s.score}`, { fontSize: '20px', fill: '#f5deb3' }).setOrigin(1, 0.5);
            });
        }

        const close = this.add.text(640, 560, 'Fechar', { fontSize: '18px', fill: '#fff', backgroundColor: '#8b4513' })
            .setOrigin(0.5).setInteractive({ useHandCursor: true });
        close.on('pointerdown', () => this.transitionBack());

        this.cameras.main.fadeIn(300);
    }

    transitionBack() {
        const dur = 300;
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
}
