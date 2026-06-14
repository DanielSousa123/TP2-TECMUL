import Phaser from 'phaser';
import { t } from '../traducao.js';

export default class LeaderboardScene extends Phaser.Scene {
    constructor() {
        super('LeaderboardScene');
    }

    preload() {
        this.load.image('fundo', 'assets/images/background2.jpg');
    }

    create() {
        this._isTransitioning = false;
        this.background = this.add.tileSprite(640, 360, 1280, 720, 'fundo');
        this.background.tileScaleX = 1280 / 1416;
        this.background.tileScaleY = 720 / 980;

        this.add.rectangle(640, 360, 850, 540, 0x2a1608, 0.96).setStrokeStyle(3, 0xd4af37);
        this.add.rectangle(640, 360, 790, 455, 0x3d2414, 0.88).setStrokeStyle(1, 0x8b6914);

        this.add.text(640, 125, t('ranking'), {
            fontSize: '42px',
            fill: '#d4af37',
            fontStyle: 'bold',
            stroke: '#4a260d',
            strokeThickness: 5
        }).setOrigin(0.5);

        const scores = this.loadScores().sort((a, b) => b.score - a.score).slice(0, 10);

        if (scores.length === 0) {
            this.add.text(640, 330, t('noScores'), { fontSize: '22px', fill: '#d2b48c' }).setOrigin(0.5);
        } else {
            this.add.text(300, 185, t('position'), { fontSize: '16px', fill: '#d4af37', fontStyle: 'bold' }).setOrigin(0.5);
            this.add.text(430, 185, t('playerColumn'), { fontSize: '16px', fill: '#d4af37', fontStyle: 'bold' }).setOrigin(0, 0.5);
            this.add.text(835, 185, t('scoreColumn'), { fontSize: '16px', fill: '#d4af37', fontStyle: 'bold' }).setOrigin(1, 0.5);
            this.add.text(980, 185, t('coinsColumn'), { fontSize: '16px', fill: '#d4af37', fontStyle: 'bold' }).setOrigin(1, 0.5);

            const startY = 225;
            const gap = 42;
            scores.forEach((entry, index) => {
                const y = startY + index * gap;
                const place = index + 1;
                const rowColor = index % 2 === 0 ? 0x4b2b13 : 0x35200f;
                const medalColor = place <= 3 ? '#ffd966' : '#f5deb3';

                this.add.rectangle(640, y, 720, 34, rowColor, 0.82);
                this.add.text(300, y, `${place}.`, { fontSize: '20px', fill: medalColor, fontStyle: 'bold' }).setOrigin(0.5);
                this.add.text(430, y, `${entry.name || t('player')}`.slice(0, 12), { fontSize: '20px', fill: '#fff4cf' }).setOrigin(0, 0.5);
                this.add.text(835, y, `${entry.score || 0}`, { fontSize: '20px', fill: '#f5deb3' }).setOrigin(1, 0.5);
                this.add.text(980, y, `${entry.coins || 0}`, { fontSize: '20px', fill: '#ffd966' }).setOrigin(1, 0.5);
            });
        }

        const close = this.add.text(640, 580, t('close'), {
            fontSize: '18px',
            fill: '#fff',
            backgroundColor: '#8b4513',
            padding: { x: 18, y: 8 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        close.on('pointerdown', () => { if (!this._isTransitioning) this.transitionBack(); });

        this.cameras.main.fadeIn(300);
    }

    loadScores() {
        try {
            const raw = localStorage.getItem('tp2_leaderboard');
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    transitionBack() {
        if (this._isTransitioning) return;
        this._isTransitioning = true;

        this.cameras.main.fadeOut(300);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('MenuScene');
        });
    }
}
