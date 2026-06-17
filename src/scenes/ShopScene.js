import Phaser from 'phaser';
import { t } from '../traducao.js';

export default class ShopScene extends Phaser.Scene {
    constructor() {
        super('ShopScene');
    }

    preload() {
        this.load.image('fundo', 'assets/images/background2.jpg');
    }

    create() {
        this._isTransitioning = false;
        this.background = this.add.tileSprite(640, 360, 1280, 720, 'fundo');
        this.background.tileScaleX = 1280 / 1416;
        this.background.tileScaleY = 720 / 980;

        this.add.rectangle(640, 360, 1280, 720, 0x2a1a0a, 0.85);

        const totalCoins = parseInt(localStorage.getItem('tp2_total_coins')) || 0;

        this.add.text(640, 80, t('shop'), {
            fontSize: '48px',
            fill: '#d4af37',
            fontStyle: 'bold',
            stroke: '#4a260d',
            strokeThickness: 6
        }).setOrigin(0.5);

        this.add.text(640, 130, `${t('coins')}: ${totalCoins}`, {
            fontSize: '28px',
            fill: '#ffd966',
            stroke: '#4a260d',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Shop items
        const items = [
            { name: 'Extra Life', price: 50, description: 'Start with 1 extra life', purchased: false },
            { name: 'Double Coins', price: 100, description: 'Coins worth 2x for 1 game', purchased: false },
            { name: 'Shield', price: 150, description: 'Protect from 1 obstacle', purchased: false }
        ];

        const startY = 200;
        const gap = 100;

        items.forEach((item, index) => {
            const y = startY + index * gap;

            const itemBg = this.add.rectangle(640, y, 700, 80, 0x3d2414, 0.9)
                .setStrokeStyle(2, 0xd4af37);

            this.add.text(350, y, item.name, {
                fontSize: '24px',
                fill: '#f5deb3',
                fontStyle: 'bold'
            }).setOrigin(0, 0.5);

            this.add.text(350, y + 25, item.description, {
                fontSize: '16px',
                fill: '#d2b48c'
            }).setOrigin(0, 0.5);

            const buyBtn = this.add.rectangle(950, y, 150, 50, 0xb8860b)
                .setInteractive({ useHandCursor: true })
                .setStrokeStyle(2, 0xd4af37);

            const buyText = this.add.text(950, y, `${item.price} 🪙`, {
                fontSize: '20px',
                fill: '#fff',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            buyBtn.on('pointerover', () => {
                this.tweens.add({ targets: buyBtn, scale: 1.05, duration: 100 });
                buyBtn.setFillStyle(0xc9960b);
            });
            buyBtn.on('pointerout', () => {
                this.tweens.add({ targets: buyBtn, scale: 1.0, duration: 100 });
                buyBtn.setFillStyle(0xb8860b);
            });
            buyBtn.on('pointerdown', () => {
                if (totalCoins >= item.price) {
                    const newCoins = totalCoins - item.price;
                    localStorage.setItem('tp2_total_coins', newCoins);
                    this.scene.restart();
                }
            });
        });

        // Back button
        const backBtn = this.add.text(640, 600, t('close'), {
            fontSize: '20px',
            fill: '#fff',
            backgroundColor: '#8b4513',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        backBtn.on('pointerdown', () => { if (!this._isTransitioning) this.transitionBack(); });

        this.cameras.main.fadeIn(300);
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
