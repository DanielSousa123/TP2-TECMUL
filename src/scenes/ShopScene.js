import Phaser from 'phaser';
import { t } from '../traducao.js';

export default class ShopScene extends Phaser.Scene {
    constructor() {
        super('ShopScene');
    }

    preload() {
        this.load.image('fundo', 'assets/images/background2.jpg');
        if (!this.textures.exists('wine_deadeye')) {
            this.load.image('wine_deadeye', 'assets/images/wine_deadeye.png');
        }
        if (!this.textures.exists('health_potion')) {
            this.load.image('health_potion', 'assets/images/health_potion.png');
        }
        if (!this.textures.exists('morgans_hat')) {
            this.load.image('morgans_hat', 'assets/images/hat.png');
        }
        this.load.audio('purchaseSound', 'assets/music/purchase_sound.mp3');
    }

    create() {
        this._isTransitioning = false;
        this.background = this.add.tileSprite(640, 360, 1280, 720, 'fundo');
        this.background.tileScaleX = 1280 / 1416;
        this.background.tileScaleY = 720 / 980;

        this.add.rectangle(640, 360, 1280, 720, 0x2a1a0a, 0.85);

        this._totalCoins = parseInt(localStorage.getItem('tp2_total_coins')) || 0;

        this.add.text(640, 60, t('shop'), {
            fontSize: '48px',
            fill: '#d4af37',
            fontStyle: 'bold',
            stroke: '#4a260d',
            strokeThickness: 6
        }).setOrigin(0.5);

        this._coinDisplay = this.add.text(640, 110, `${t('coins')}: ${this._totalCoins}`, {
            fontSize: '28px',
            fill: '#ffd966',
            stroke: '#4a260d',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Feedback text (hidden)
        this._feedbackText = this.add.text(640, 148, '', {
            fontSize: '18px',
            fill: '#ff6666',
            stroke: '#4a260d',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(10);

        // ── Item definitions ────────────────────────────────────────────
        const shopItems = [
            {
                key: 'deadeye',
                nameKey: 'deadeye',
                descKey: 'deadeyeDesc',
                price: 25,
                sprite: 'wine_deadeye',
                storageKey: 'tp2_deadeye_count'
            },
            {
                key: 'doubleLife',
                nameKey: 'doubleLife',
                descKey: 'doubleLifeDesc',
                price: 50,
                sprite: 'health_potion',
                storageKey: 'tp2_doublelife_count'
            },
            {
                key: 'morgansHat',
                name: "Morgan's Hat",
                desc: 'Duplica a pontuação desde o início',
                price: 50,
                sprite: 'morgans_hat',
                storageKey: 'tp2_morganshat_count'
            }
        ];

        const startY = 195;
        const gap = 115;
        this._ownedTexts = {};

        shopItems.forEach((item, index) => {
            const y = startY + index * gap;
            const owned = parseInt(localStorage.getItem(item.storageKey)) || 0;
            const label = item.nameKey ? t(item.nameKey) : item.name;
            const desc  = item.descKey ? t(item.descKey) : item.desc;

            // Row background
            this.add.rectangle(640, y, 820, 95, 0x3d2414, 0.9)
                .setStrokeStyle(2, 0xd4af37);

            // Sprite / icon
            if (item.sprite && this.textures.exists(item.sprite)) {
                const icon = this.add.image(270, y, item.sprite);
                const maxDim = 64;
                const scale = Math.min(maxDim / icon.width, maxDim / icon.height);
                icon.setScale(scale);
            } else {
                this.add.rectangle(270, y, 52, 52, 0x8b6914).setStrokeStyle(2, 0xd4af37);
            }

            // Name & description
            this.add.text(320, y - 18, label, {
                fontSize: '22px', fill: '#f5deb3', fontStyle: 'bold'
            }).setOrigin(0, 0.5);

            this.add.text(320, y + 10, desc, {
                fontSize: '15px', fill: '#d2b48c'
            }).setOrigin(0, 0.5);

            // Owned count
            const ownedTxt = this.add.text(320, y + 34, `${t('owned')}: ${owned}`, {
                fontSize: '14px', fill: '#ffd966'
            }).setOrigin(0, 0.5);
            this._ownedTexts[item.key] = { text: ownedTxt, storageKey: item.storageKey };

            // Buy button
            const buyBtn = this.add.rectangle(920, y, 160, 54, 0xb8860b)
                .setInteractive({ useHandCursor: true })
                .setStrokeStyle(2, 0xd4af37);

            this.add.text(920, y, `${item.price} 🪙`, {
                fontSize: '20px', fill: '#fff', fontStyle: 'bold'
            }).setOrigin(0.5);

            buyBtn.on('pointerover', () => {
                this.tweens.add({ targets: buyBtn, scale: 1.06, duration: 100 });
                buyBtn.setFillStyle(0xc9960b);
            });
            buyBtn.on('pointerout', () => {
                this.tweens.add({ targets: buyBtn, scale: 1.0, duration: 100 });
                buyBtn.setFillStyle(0xb8860b);
            });
            buyBtn.on('pointerdown', () => this._purchase(item));
        });

        // Back button
        const backBtn = this.add.text(640, 655, t('close'), {
            fontSize: '20px',
            fill: '#fff',
            backgroundColor: '#8b4513',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        backBtn.on('pointerdown', () => { if (!this._isTransitioning) this.transitionBack(); });

        this.cameras.main.fadeIn(300);
    }

    _purchase(item) {
        if (this._totalCoins < item.price) {
            this._showFeedback(t('buyFailed'), '#ff6666');
            return;
        }

        // Deduct coins
        this._totalCoins -= item.price;
        localStorage.setItem('tp2_total_coins', String(this._totalCoins));
        this._coinDisplay.setText(`${t('coins')}: ${this._totalCoins}`);

        // Increment owned count
        const prev = parseInt(localStorage.getItem(item.storageKey)) || 0;
        const next = prev + 1;
        localStorage.setItem(item.storageKey, String(next));

        // Update owned text in place
        const entry = this._ownedTexts[item.key];
        if (entry) {
            entry.text.setText(`${t('owned')}: ${next}`);
        }

        // Play purchase sound
        try { this.sound.play('purchaseSound', { volume: 0.7 }); } catch (e) {}

        this._showFeedback('✓ ' + (item.nameKey ? t(item.nameKey) : item.name), '#66ff88');
    }

    _showFeedback(msg, color) {
        this._feedbackText.setText(msg).setColor(color).setVisible(true);
        this.time.delayedCall(1800, () => {
            if (this._feedbackText) this._feedbackText.setVisible(false);
        });
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