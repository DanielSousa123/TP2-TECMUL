import Phaser from 'phaser';
import { t } from '../traducao.js';
import ParallaxManager from './ParallaxManager.js';
import PauseMenu from './PauseMenu.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        this._parallax = new ParallaxManager(this);
        this._parallax.preload();

        // Player running spritesheet
        if (!this.textures.exists('player')) {
            this.load.spritesheet('player', 'assets/images/Sprite-0001.png', {
                frameWidth: 96,
                frameHeight: 96
            });
        }
        // Jump images
        if (!this.textures.exists('playerJumpUp')) {
            this.load.image('playerJumpUp', 'assets/images/Sprite-jump.png');
        }
        if (!this.textures.exists('playerJumpDown')) {
            this.load.image('playerJumpDown', 'assets/images/Sprite-down.png');
        }

        // 4 cactus variants
        for (let i = 1; i <= 4; i++) {
            if (!this.textures.exists(`cactus${i}`)) {
                this.load.image(`cactus${i}`, `assets/Cactus/${i}.png`);
            }
        }

        // Slide image
        if (!this.textures.exists('playerSlide')) {
            this.load.image('playerSlide', 'assets/images/Sprite-slide.png');
        }

        // 7 flying-bird frames
        for (let i = 1; i <= 7; i++) {
            if (!this.textures.exists(`bird${i}`)) {
                this.load.image(`bird${i}`, `assets/bird flying/${i}.png`);
            }
        }

        // Sounds
        this.load.audio('gameMusic', 'assets/music/gamemusic.mp3');
        this.load.audio('coinCollectSound', 'assets/music/coin_collect_sound.mp3');

        // Shop item icons
        if (!this.textures.exists('wine_deadeye')) {
            this.load.image('wine_deadeye', 'assets/images/wine_deadeye.png');
        }
        if (!this.textures.exists('health_potion')) {
            this.load.image('health_potion', 'assets/images/health_potion.png');
        }
        if (!this.textures.exists('morgans_hat')) {
            this.load.image('morgans_hat', 'assets/images/hat.png');
        }

        // Coin spritesheet
        this.load.spritesheet('coin', 'assets/images/coin.png', {
            frameWidth: 16,
            frameHeight: 16
        });
    }

    create() {

        this.slideKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.downKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
        this.deadeyeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);

        this._deadeyeCount = parseInt(localStorage.getItem('tp2_deadeye_count')) || 0;
        this._doubleLifeCount = parseInt(localStorage.getItem('tp2_doublelife_count')) || 0;
        this._morgansHatCount = parseInt(localStorage.getItem('tp2_morganshat_count')) || 0;
        this._morgansHatActive = false;

        // Consume one Morgan's Hat use at the start of the game
        if (this._morgansHatCount > 0) {
            this._morgansHatActive = true;
            this._morgansHatCount--;
            localStorage.setItem('tp2_morganshat_count', String(this._morgansHatCount));
        }

        this._isDeadeye = false;
        this._doubleLifeUsed = false;

        // Animations

        // Coin spin animation
        this.anims.create({
            key: 'coinSpin',
            frames: this.anims.generateFrameNumbers('coin'),
            frameRate: 12,
            repeat: -1
        });

        // Player run animation
        this.anims.create({
            key: 'playerRun',
            frames: this.anims.generateFrameNumbers('player'),
            frameRate: 10,
            repeat: -1
        });

        // Bird flying animation (individual frames)
        const birdFrames = [];
        for (let i = 1; i <= 7; i++) {
            birdFrames.push({ key: `bird${i}` });
        }
        this.anims.create({
            key: 'birdFly',
            frames: birdFrames,
            frameRate: 12,
            repeat: -1
        });

        // Initial game state
        this._isTransitioning = false;
        this.isSliding = false;
        this._slideQueued = false; 
        this._isPaused = false;
        this.time.paused = false;
        this.physics.resume();
        this._isCountingDown = false;
        this.velocidadeJogo = 300;    
        this.velocidadeMaxima = 800;  
        this.aceleracao = 0.05;       
        this.score = 0;
        this.coinsCollected = 0;
        this._playerState = 'run';

        // Parallax background and ground
        this._parallax.create();
        this.chao = this._parallax.getGround();

        // Procedural coin texture (fallback in case the spritesheet fails;
        // also used as the coin icon in the score HUD below)
        if (!this.textures.exists('texturaMoeda')) {
            const coinCanvas = this.make.graphics({ x: 0, y: 0, add: false });
            coinCanvas.fillStyle(0xffd34d);
            coinCanvas.fillCircle(16, 16, 15);
            coinCanvas.lineStyle(3, 0xb87900);
            coinCanvas.strokeCircle(16, 16, 14);
            coinCanvas.lineStyle(2, 0xfff3a0);
            coinCanvas.strokeCircle(16, 16, 8);
            coinCanvas.generateTexture('texturaMoeda', 32, 32);
        }

        // HUD (score and coins, top-left)
        this._buildScoreHUD();
        //this.debugText = this.add.text(100, 16, 'Debug', { fontSize: '16px', fill: '#0f0' }).setOrigin(0, 0);

        // Speed-up quote — appears center screen when the game speeds up
        this._speedQuoteText = this.add.text(640, 320, '', {
            fontSize: '28px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 5,
            fontStyle: 'bold italic',
            wordWrap: { width: 500 },
            align: 'center',
        }).setOrigin(0.5, 0.5).setAlpha(0).setDepth(10);
        this._lastScoreTier = 0; // last difficulty tier reached

        // Music
        this.startGameMusic();

        // Player
        this.player = this.physics.add.sprite(100, 200, 'player');
        this.player.setScale(1);
        this.player.setCollideWorldBounds(true);
        this.player.body.setSize(60, 80);
        this.player.body.setOffset(18, 12);
        this.player.body.setGravityY(800);
        this.player.play('playerRun');
        this.physics.add.collider(this.player, this.chao);

        // Movement keys (arrows)
        this.teclas = this.input.keyboard.createCursorKeys();

        // Physics groups for obstacles and coins
        this.obstaculos = this.physics.add.group();
        this.coins = this.physics.add.group();

        // Initial scheduling of obstacles and coins
        this.agendarProximoObstaculo();
        this.agendarProximaMoeda();

        // Collisions and overlaps
        this.physics.add.collider(this.player, this.obstaculos, this.gameOver, null, this);
        this.physics.add.overlap(this.player, this.coins, this.collectCoin, null, this);

        // Pause button (top-right corner)
        this.pauseBtn = this.add.text(1260, 16, '⏸', {
            fontSize: '32px',
            fill: '#fff',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true }).setDepth(10);

        this.pauseBtn.on('pointerover', () => this.pauseBtn.setAlpha(0.7));
        this.pauseBtn.on('pointerout',  () => this.pauseBtn.setAlpha(1));
        this.pauseBtn.on('pointerdown', () => this._pauseMenu.toggle());

        // ESC or P to pause
        this.input.keyboard.on('keydown-ESC', () => this._pauseMenu.toggle());
        this.input.keyboard.on('keydown-P',   () => this._pauseMenu.toggle());

        // Pause menu (overlay, settings sub-view, resume countdown)
        this._pauseMenu = new PauseMenu(this);
        this._pauseMenu.build();

        // Fade in
        this.cameras.main.fadeIn(400);

        // Item HUD (deadeye and double life)
        this._buildItemHUD();

        // F key activates deadeye
        this.input.keyboard.on('keydown-F', () => this._activateDeadeye());
    }

    // Builds the score/coins HUD in the top-left corner: a parchment-style
    // panel with an icon + value for each stat, matching the game's wood/gold
    // aesthetic instead of plain white text.
    _buildScoreHUD() {
        const panelX = 20;
        const panelY = 16;
        const panelW = 220;
        const rowH = 50;            // height reserved for each stat row
        const panelH = rowH * 2;    // panel height derived from the rows, so nothing overflows

        // Backing panel
        this._scorePanel = this.add.rectangle(panelX, panelY, panelW, panelH, 0x2a1a0a, 0.78)
            .setOrigin(0, 0)
            .setStrokeStyle(2, 0xd4af37, 0.9)
            .setDepth(9);

        // Subtle inner divider between the two rows
        this.add.rectangle(panelX + 14, panelY + rowH, panelW - 28, 1, 0xd4af37, 0.35)
            .setOrigin(0, 0.5)
            .setDepth(9);

        // Each row's vertical center (icon, label and value all align to this)
        const row1CenterY = panelY + rowH / 2;
        const row2CenterY = panelY + rowH + rowH / 2;
        const iconX = panelX + 30;
        const textX = panelX + 56;

        // Score row: trophy icon + label + value
        this.add.text(iconX, row1CenterY, '🏆', { fontSize: '24px' })
            .setOrigin(0.5).setDepth(10);
        this.add.text(textX, row1CenterY - 14, t('score').toUpperCase(), {
            fontSize: '12px', fontStyle: 'bold', fill: '#d2b48c', letterSpacing: 1
        }).setOrigin(0, 0.5).setDepth(10);
        this.scoreText = this.add.text(textX, row1CenterY + 8, '0', {
            fontSize: '22px', fontStyle: 'bold',
            fill: '#ffd966', stroke: '#000000', strokeThickness: 3
        }).setOrigin(0, 0.5).setDepth(10);

        // Coins row: coin icon (game's own coin texture, not an emoji glyph,
        // so it can't get clipped by font metrics) + label + value
        this.add.image(iconX, row2CenterY, 'texturaMoeda')
            .setDisplaySize(26, 26)
            .setDepth(10);
        this.add.text(textX, row2CenterY - 14, t('coins').toUpperCase(), {
            fontSize: '12px', fontStyle: 'bold', fill: '#d2b48c', letterSpacing: 1
        }).setOrigin(0, 0.5).setDepth(10);
        this.coinText = this.add.text(textX, row2CenterY + 8, '0', {
            fontSize: '22px', fontStyle: 'bold',
            fill: '#ffd966', stroke: '#000000', strokeThickness: 3
        }).setOrigin(0, 0.5).setDepth(10);
    }

    // Builds the item HUD in the bottom-left corner
    _buildItemHUD() {
        // Deadeye icon and counter
        this._deadeyeIcon = this.add.image(40, 660, 'wine_deadeye').setDepth(5);
        this._deadeyeIcon.setDisplaySize(40, 40);
        this._deadeyeCountText = this.add.text(68, 660, `x${this._deadeyeCount}`, {
            fontSize: '18px', fill: '#ffd966', stroke: '#000', strokeThickness: 3
        }).setOrigin(0, 0.5).setDepth(5);
        this.add.text(40, 688, '[F]', {
            fontSize: '12px', fill: '#aaa', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(5);

        // Double Life icon and counter
        this._doubleLifeIcon = this.add.image(130, 660, 'health_potion').setDepth(5);
        this._doubleLifeIcon.setDisplaySize(40, 40);
        this._doubleLifeCountText = this.add.text(158, 660, `x${this._doubleLifeCount}`, {
            fontSize: '18px', fill: '#ffd966', stroke: '#000', strokeThickness: 3
        }).setOrigin(0, 0.5).setDepth(5);

        // Morgan's Hat icon (passive bonus indicator)
        if (this._morgansHatActive) {
            this._morgansHatIcon = this.add.image(220, 660, 'morgans_hat').setDepth(5);
            this._morgansHatIcon.setDisplaySize(40, 40);
            this.add.text(220, 688, '2x', {
                fontSize: '12px', fill: '#ffd966', stroke: '#000', strokeThickness: 2
            }).setOrigin(0.5).setDepth(5);
        }

        // Deadeye timer bar (hidden until activated)
        this._deadeyeBarBg = this.add.rectangle(40, 710, 100, 8, 0x333333).setOrigin(0, 0.5).setDepth(5).setVisible(false);
        this._deadeyeBar    = this.add.rectangle(40, 710, 100, 8, 0xff8800).setOrigin(0, 0.5).setDepth(5).setVisible(false);

        // Orange deadeye overlay (hidden by default)
        this._deadeyeOverlay = this.add.rectangle(640, 360, 1280, 720, 0xff6600, 0)
            .setDepth(4).setBlendMode(Phaser.BlendModes.MULTIPLY);
    }

    // Activates deadeye (slows the game down for 8 seconds)
    _activateDeadeye() {
        if (this._isDeadeye || this._deadeyeCount <= 0 || this._isPaused || this._isCountingDown || this._isTransitioning) return;

        // Spend one use and persist it to localStorage
        this._deadeyeCount--;
        localStorage.setItem('tp2_deadeye_count', String(this._deadeyeCount));
        this._deadeyeCountText.setText(`x${this._deadeyeCount}`);

        this._isDeadeye = true;
        const SLOW = 0.6;       // slow-down factor
        const DURATION = 8000;  // duration in milliseconds

        // Slow down Phaser's physics and time
        this.physics.world.timeScale = 1 / SLOW;
        this.time.timeScale = SLOW;
        if (this.gameMusic) this.gameMusic.setRate(SLOW);

        // Orange overlay fades in
        this.tweens.add({ targets: this._deadeyeOverlay, alpha: 0.22, duration: 300 });

        // Show and animate the timer bar
        this._deadeyeBarBg.setVisible(true);
        this._deadeyeBar.setVisible(true).setScale(1, 1);
        this.tweens.add({
            targets: this._deadeyeBar,
            scaleX: 0,
            duration: DURATION / SLOW,
            ease: 'Linear'
        });

        // Manually drive the bar using real elapsed time (so it's unaffected by timeScale)
        this._deadeyeStart = this.time.now;
        this._deadeyeBarBg.setVisible(true);
        this._deadeyeBar.setVisible(true);
        this.tweens.killTweensOf(this._deadeyeBar);

        // Mark the real-time end instant
        this._deadeyeEndAt = Date.now() + DURATION;

        // Pulse the deadeye icon while it's active
        this.tweens.add({ targets: this._deadeyeIcon, alpha: 0.4, duration: 400, yoyo: true, repeat: -1, ease: 'Sine' });

        // Use a native setTimeout so it's unaffected by Phaser's timeScale
        this._deadeyeTimeout = setTimeout(() => this._endDeadeye(), DURATION);
    }

    // Ends the deadeye effect and restores normal speed
    _endDeadeye() {
        if (!this._isDeadeye) return;
        this._isDeadeye = false;

        // Restore physics and time timeScale
        this.physics.world.timeScale = 1;
        this.time.timeScale = 1;
        if (this.gameMusic) this.gameMusic.setRate(1);

        // Hide the overlay and the bar
        this.tweens.add({ targets: this._deadeyeOverlay, alpha: 0, duration: 500 });
        this._deadeyeBarBg.setVisible(false);
        this._deadeyeBar.setVisible(false);
        this.tweens.killTweensOf(this._deadeyeIcon);
        this._deadeyeIcon.setAlpha(1);
    }

    // Revives the player after using Double Life
    _revivePlayer() {
        // Allow collisions again
        this._isTransitioning = false;

        // Reset the player's position, tint and velocity
        this.player.clearTint();
        this.player.setPosition(100, 200);
        this.player.setVelocity(0, 0);
        this.physics.resume();
        this.player.play('playerRun', true);
        this._playerState = 'run';

        // Remove all obstacles from the screen
        this.obstaculos.clear(true, true);

        // Countdown before resuming the game
        this._isCountingDown = true;
        let count = 3;
        const countTxt = this.add.text(640, 360, String(count), {
            fontSize: '100px', fontStyle: 'bold',
            fill: '#ffffff', stroke: '#000000', strokeThickness: 10
        }).setOrigin(0.5).setDepth(30);

        const tick = () => {
            countTxt.setText(String(count));
            countTxt.setScale(1.5).setAlpha(1);
            this.tweens.add({
                targets: countTxt,
                scale: 1, alpha: 0.6,
                duration: 900, ease: 'Cubic.easeIn',
                onComplete: () => {
                    count--;
                    if (count > 0) { tick(); }
                    else {
                        countTxt.destroy();
                        this._isCountingDown = false;
                        this.agendarProximoObstaculo();
                    }
                }
            });
        };
        tick();
    }

    // Starts the slide (on the ground) or triggers a fast drop (in the air)
    startSlide() {
        if (this.isSliding) return;

        const onGround =
            this.player.body.touching.down ||
            this.player.body.blocked.down;

        // In the air: drop fast and queue the slide for when the player lands
        if (!onGround) {
            this.player.setVelocityY(600);
            this._slideQueued = true;
            return;
        }

        this._slideQueued = false;
        this.isSliding = true;
        this._playerState = 'slide';

        // Switch texture and shrink the hitbox for the slide
        this.player.stop();
        this.player.setTexture('playerSlide');
        this.player.body.setSize(60, 40);
        this.player.body.setOffset(18, 50);

        // End the slide automatically after 600ms
        this._slideTimer = this.time.delayedCall(600, () => {
            this.endSlide();
        });
    }

    // Ends the slide and restores the normal state
    endSlide() {
        if (!this.isSliding) return;

        // Cancel the automatic timer if it's still pending
        if (this._slideTimer) {
            this._slideTimer.remove(false);
            this._slideTimer = null;
        }

        this.isSliding = false;
        this.player.body.setSize(60, 80);
        this.player.body.setOffset(18, 12);

        this.player.setTexture('player');
        this.player.play('playerRun', true);

        this._playerState = 'run';
    }

    // Main game loop (called every frame)
    update(time, delta) {

        // Check slide input (S or Down Arrow)
        if (Phaser.Input.Keyboard.JustDown(this.slideKey) || Phaser.Input.Keyboard.JustDown(this.downKey)) {
            this.startSlide();
        }

        // Stop updating if the game is paused or counting down
        if (this._isPaused || this._isCountingDown) return;

        // Update the deadeye timer bar in real time
        if (this._isDeadeye && this._deadeyeEndAt) {
            const remaining = Math.max(0, this._deadeyeEndAt - Date.now());
            const pct = remaining / 8000;
            this._deadeyeBar.setScale(pct, 1);
        }

        // Progressive difficulty
        // Gradually accelerates up to the current cap
        if (this.velocidadeJogo < this.velocidadeMaxima) {
            this.velocidadeJogo += this.aceleracao;
        }

        // Every 1000 points: raise the speed cap and the acceleration
        const scoreTier = Math.floor(this.score / 800); // internal score is x10
        this.velocidadeMaxima = Math.min(1400, 800 + scoreTier * 60);
        this.aceleracao = Math.min(0.2, 0.05 + scoreTier * 0.01);

        // Show the speed-up quote when leveling up
        if (scoreTier > this._lastScoreTier) {
            this._lastScoreTier = scoreTier;
            this._showSpeedQuote();
        }

        // Update the parallax background with the current speed
        this._parallax.update(this.velocidadeJogo, delta);

        // Player input
        const onGround = this.player.body.touching.down || this.player.body.blocked.down;

        // Run the queued slide as soon as the player lands
        if (onGround && this._slideQueued) {
            this._slideQueued = false;
            this.startSlide();
        }

        // Jump: cancel the slide if currently sliding, then jump
        if (Phaser.Input.Keyboard.JustDown(this.teclas.up) || Phaser.Input.Keyboard.JustDown(this.teclas.space)) {
            if (onGround || this.isSliding) {
                if (this.isSliding) {
                    this.endSlide();
                }
                this._slideQueued = false;
                this.player.setVelocityY(-520);
            }
        }

        // Player animation
        if (!this.isSliding) {
            if (onGround) {
                // On the ground → run animation
                if (this._playerState !== 'run') {
                    this._playerState = 'run';
                    this.player.stop();
                    this.player.setTexture('player');
                    this.player.play('playerRun', true);
                }
            } else if (this.player.body.velocity.y < -1) {
                // Going up → jump-up sprite
                if (this._playerState !== 'jumpUp') {
                    this._playerState = 'jumpUp';
                    this.player.stop();
                    this.player.setTexture('playerJumpUp', 0);
                    this.player.setScale(0.9);
                }
            } else if (this.player.body.velocity.y > 1) {
                // Going down → jump-down sprite
                if (this._playerState !== 'jumpDown') {
                    this._playerState = 'jumpDown';
                    this.player.stop();
                    this.player.setTexture('playerJumpDown', 0);
                    this.player.setScale(0.9);
                }
            }
        }

        // Score (doubled if Morgan's Hat is active this run)
        this.score += this._morgansHatActive ? 2 : 1;
        this.scoreText.setText(`${Math.floor(this.score / 10)}`);

        // Move and clean up off-screen obstacles
        this.obstaculos.getChildren().forEach(obstaculo => {
            obstaculo.setVelocityX(-this.velocidadeJogo);
            if (obstaculo.x < -50) {
                obstaculo.destroy();
            }
        });

        // Move and clean up off-screen coins
        this.coins.getChildren().forEach(coin => {
            coin.setVelocityX(-this.velocidadeJogo);
            coin.angle += 0;
            if (coin.x < -50) {
                coin.destroy();
            }
        });
    }

    // Shows a speed-up quote at the center of the screen
    _showSpeedQuote() {
        const quotes = t('speedQuotes');
        const quote = quotes[Phaser.Math.Between(0, quotes.length - 1)];
        this._speedQuoteText.setText(quote).setAlpha(1);

        // Gradually fade the quote out after 1.4 seconds
        this.tweens.killTweensOf(this._speedQuoteText);
        this.tweens.add({
            targets: this._speedQuoteText,
            alpha: 0,
            duration: 2200,
            delay: 1400,
            ease: 'Sine.easeIn',
        });
    }

    // Starts the game music with the saved volume
    startGameMusic() {
        const isMuted = localStorage.getItem('tp2_muted') === 'true';
        const volume = parseFloat(localStorage.getItem('tp2_volume')) || 0.5;
        const actualVolume = isMuted ? 0 : volume * 0.4;

        this.gameMusic = this.sound.add('gameMusic', { loop: true, volume: actualVolume });
        this.gameMusic.play();

        const coinVolume = isMuted ? 0 : volume * 0.8;
        this.coinCollectSound = this.sound.add('coinCollectSound', { volume: coinVolume });
    }

    getOpaqueBounds(textureKey) {
        const src = this.textures.get(textureKey).getSourceImage();
        const cvs = document.createElement('canvas');
        cvs.width  = src.width;
        cvs.height = src.height;
        const ctx = cvs.getContext('2d');
        ctx.drawImage(src, 0, 0);
        const { data, width, height } = ctx.getImageData(0, 0, cvs.width, cvs.height);

        let minX = width, maxX = 0, minY = height, maxY = 0;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // Ignore near-transparent pixels (alpha ≤ 10)
                const alpha = data[(y * width + x) * 4 + 3];
                if (alpha > 10) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        if (minX > maxX || minY > maxY) {
            return { x: 0, y: 0, w: width, h: height };
        }
        return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
    }

    // Creates a random obstacle (cactus or bird)
    criarObstaculo() {
        if (this._isTransitioning) return;
        const obstacleType = Phaser.Math.Between(0, 1) === 0 ? 'cactus' : 'bird';

        if (obstacleType === 'cactus') {

            const variant = Phaser.Math.Between(1, 4);

            const obstaculo = this.obstaculos.create(1350, 590, `cactus${variant}`);
            obstaculo.setScale(1);
            obstaculo.body.setAllowGravity(false);
            obstaculo.body.setImmovable(true);

            const bounds = this.getOpaqueBounds(`cactus${variant}`);
            const hitW = Math.round(bounds.w * 0.6);
            const hitX = bounds.x + Math.round((bounds.w - hitW) / 2);
            obstaculo.body.setSize(hitW, bounds.h);
            obstaculo.body.setOffset(hitX, bounds.y);
        } else {
            const BIRD_Y = Phaser.Math.Between(560, 570);
            const obstaculo = this.obstaculos.create(1350, BIRD_Y, 'bird1');
            obstaculo.setScale(1.5);
            obstaculo.play('birdFly');
            obstaculo.body.setAllowGravity(false);
            obstaculo.body.setImmovable(true);

            const bounds = this.getOpaqueBounds('bird1');
            obstaculo.body.setSize(bounds.w, bounds.h);
            obstaculo.body.setOffset(bounds.x, bounds.y);
        }

        this.agendarProximoObstaculo();
    }

    // Schedules the next obstacle with a delay that shrinks as the score grows
    agendarProximoObstaculo() {
        const scoreTier = Math.floor(this.score / 800);
        const minDelay = Math.max(350, 1000 - scoreTier * 100);
        const maxDelay = Math.max(700, 3000 - scoreTier * 200);
        const randomDelay = Phaser.Math.Between(minDelay, maxDelay);
        this.time.delayedCall(randomDelay, () => this.criarObstaculo(), [], this);
    }

    // Creates a coin at a random position with a floating animation
    criarMoeda() {
        if (this._isTransitioning) return;

        const y = Phaser.Math.Between(520, 590);
        const coin = this.coins.create(1350, y, 'coin');
        coin.setScale(2);
        coin.play('coinSpin');
        coin.body.setAllowGravity(false);
        coin.body.setSize(14, 14);
        coin.body.setOffset(1, 1);

        // Floating animation
        this.tweens.add({
            targets: coin,
            y: y - 18,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.agendarProximaMoeda();
    }

    // Schedules the next coin with a random delay
    agendarProximaMoeda() {
        const randomDelay = Phaser.Math.Between(1200, 2600);
        this.time.delayedCall(randomDelay, this.criarMoeda, [], this);
    }

    // Coin pickup by the player
    collectCoin(player, coin) {
        this.tweens.killTweensOf(coin);
        coin.destroy();
        this.coinsCollected += 1;
        this.coinText.setText(`${this.coinsCollected}`);
        if (this.coinCollectSound) {
            this.coinCollectSound.play();
        }
    }

    // Checks for Double Life or transitions to the game-over screen
    gameOver() {
        if (this._isTransitioning || this._isPaused || this._isCountingDown) return;

        // If Double Life is available, revive the player
        if (this._doubleLifeCount > 0 && !this._doubleLifeUsed) {
            this._doubleLifeUsed = true;
            this._doubleLifeCount--;
            localStorage.setItem('tp2_doublelife_count', String(this._doubleLifeCount));
            this._doubleLifeCountText.setText(`x${this._doubleLifeCount}`);

            if (this._isDeadeye) {
                clearTimeout(this._deadeyeTimeout);
                this._endDeadeye();
            }

            this._revivePlayer();
            return;
        }

        this._isTransitioning = true;
        this.physics.pause();
        if (this.gameMusic && this.gameMusic.isPlaying) {
            this.gameMusic.stop();
        }

        if (this._isDeadeye) {
            clearTimeout(this._deadeyeTimeout);
            this._endDeadeye();
        }

        // Tint the player red and transition to the Game Over scene
        this.player.setTint(0xff0000);
        this.transitionTo('GameOverScene', { score: Math.floor(this.score / 10), coins: this.coinsCollected });
    }

    shutdown() {
        if (this._deadeyeTimeout) clearTimeout(this._deadeyeTimeout);
        this.physics.world.timeScale = 1;

        this.time.timeScale = 1;

        if (this.gameMusic) {
            this.gameMusic.destroy();
            this.gameMusic = null;
        }
        if (this.coinCollectSound) {
            this.coinCollectSound.destroy();
            this.coinCollectSound = null;
        }
    }

    // Smooth transition to another scene with fade and audio fade
    transitionTo(targetScene, data) {
        const dur = 400;

        // Fade out all active sounds
        this.sound.sounds.forEach(s => {
            try {
                if (!s) return;
                if (s.isPlaying) {
                    this.tweens.killTweensOf(s);
                    this.tweens.add({ targets: s, volume: 0, duration: dur, onComplete: () => { try { s.stop(); } catch(e){} } });
                }
            } catch (e) {}
        });

        // Fade out the camera and start the next scene
        this.cameras.main.fadeOut(dur, 0, 0, 0);
        let fired = false;
        this.cameras.main.once('camerafadeoutcomplete', () => {
            fired = true;
            this.scene.start(targetScene, data);
        });
        // Fallback in case the camera event doesn't fire
        this.time.delayedCall(dur + 200, () => { if (!fired) this.scene.start(targetScene, data); });
    }
}