import Phaser from 'phaser';
import { t } from '../traducao.js';
import ParallaxManager from './ParallaxManager.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    // Preload assets (images, sounds, spritesheets)
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
        // Jump images (going up and coming down)
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

        // Coin spritesheet
        this.load.spritesheet('coin', 'assets/images/coin.png', {
            frameWidth: 16,
            frameHeight: 16
        });
    }

    // Scene initialization
    create() {

        // Slide and deadeye keys
        this.slideKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.downKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
        this.deadeyeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);

        // Item inventory (loaded from localStorage)
        this._deadeyeCount = parseInt(localStorage.getItem('tp2_deadeye_count')) || 0;
        this._doubleLifeCount = parseInt(localStorage.getItem('tp2_doublelife_count')) || 0;
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
        this._slideQueued = false; // slide scheduled for when the player lands
        this._isPaused = false;
        this.time.paused = false;
        this.physics.resume();
        this._isCountingDown = false;
        this.velocidadeJogo = 300;    // current obstacle speed
        this.velocidadeMaxima = 800;  // speed cap (grows with score)
        this.aceleracao = 0.05;       // speed increment per frame
        this.score = 0;
        this.coinsCollected = 0;
        this._playerState = 'run';

        // Parallax background and ground
        this._parallax.create();
        this.chao = this._parallax.getGround();

        // HUD texts (score and coins)
        this.scoreText = this.add.text(640, 16, `${t('score')}: 0`, { fontSize: '24px', fill: '#fff' }).setOrigin(0.5, 0);
        this.coinText = this.add.text(640, 48, `${t('coins')}: 0`, { fontSize: '24px', fill: '#fff' }).setOrigin(0.5, 0);
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

        // Procedural coin texture (fallback in case the spritesheet fails)
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
        this.pauseBtn.on('pointerdown', () => this.togglePause());

        // ESC or P to pause
        this.input.keyboard.on('keydown-ESC', () => this.togglePause());
        this.input.keyboard.on('keydown-P',   () => this.togglePause());

        // Pause overlay (starts hidden)
        this._pauseGroup = this.add.group();
        this._buildPauseOverlay();

        // Fade in
        this.cameras.main.fadeIn(400);

        // Item HUD (deadeye and double life)
        this._buildItemHUD();

        // F key activates deadeye
        this.input.keyboard.on('keydown-F', () => this._activateDeadeye());
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

    // Builds the pause overlay objects (depth 20)
    _buildPauseOverlay() {
        const g = this._pauseGroup;

        // Semi-transparent backdrop
        const dim = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.65).setDepth(20);

        // Central panel (taller to fit the settings button)
        const panel = this.add.rectangle(640, 360, 420, 420, 0x2a1a0a, 0.97)
            .setStrokeStyle(3, 0xd4af37).setDepth(20);

        // Title (also reused as the settings sub-view header)
        this._pauseTitleText = this.add.text(640, 210, 'Pausa', {
            fontSize: '40px', fontStyle: 'bold',
            fill: '#d4af37', stroke: '#4a260d', strokeThickness: 6
        }).setOrigin(0.5).setDepth(20);

        // Resume button
        const resumeBtn = this._makePauseBtn(640, 295, 'Continuar', 0xb8860b, () => {
            if (!this._isCountingDown) this.startResumeCountdown();
        });

        // Settings button (same label/style as the main menu's settings option)
        const settingsBtn = this._makePauseBtn(640, 365, t('settings'), 0x8b6914, () => {
            if (!this._isCountingDown) this._showPauseSettings();
        });

        // Exit to menu button
        const menuBtn = this._makePauseBtn(640, 435, 'Sair', 0x8b6914, () => {
            if (!this._isTransitioning && !this._isCountingDown) {
                this._hidePauseOverlay();
                this.transitionTo('MenuScene');
            }
        });

        this._pauseMainElements = [
            resumeBtn.bg, resumeBtn.label,
            settingsBtn.bg, settingsBtn.label,
            menuBtn.bg, menuBtn.label
        ];

        // Countdown text (hidden until needed)
        this._countdownText = this.add.text(640, 360, '', {
            fontSize: '72px', fontStyle: 'bold',
            fill: '#ffffff', stroke: '#000000', strokeThickness: 8
        }).setOrigin(0.5).setDepth(25).setVisible(false);

        // Settings sub-view (volume / mute) — uses the same localStorage keys
        // as SettingsScene, so the percentage is always kept in sync
        this._buildPauseSettingsControls();

        g.addMultiple([dim, panel, this._pauseTitleText, ...this._pauseMainElements,
                       this._countdownText, ...this._pauseSettingsElements]);

        this._hidePauseOverlay();
    }

    // Pause menu settings sub-view: volume slider + mute button,
    // always synced with the tp2_volume / tp2_muted keys used by SettingsScene
    _buildPauseSettingsControls() {
        const sliderStartX = 520;
        const sliderWidth = 240;
        const sliderY = 310;

        this._pauseSliderStartX = sliderStartX;
        this._pauseSliderWidth = sliderWidth;

        const volumeLabel = this.add.text(640, 268, t('volume'), {
            fontSize: '20px', fill: '#f5deb3'
        }).setOrigin(0.5).setDepth(20);

        const sliderBg = this.add.rectangle(sliderStartX, sliderY, sliderWidth, 10, 0x3d2414)
            .setOrigin(0, 0.5).setDepth(20);

        const cur = parseFloat(localStorage.getItem('tp2_volume')) || 0.5;

        const sliderFill = this.add.rectangle(sliderStartX, sliderY, sliderWidth * cur, 10, 0xd4af37)
            .setOrigin(0, 0.5).setDepth(20);

        const sliderKnob = this.add.circle(sliderStartX + (sliderWidth * cur), sliderY, 12, 0xffffff)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(2, 0x8b4513)
            .setDepth(21);

        const valueText = this.add.text(640, 345, Math.round(cur * 100) + '%', {
            fontSize: '18px', fill: '#f5deb3'
        }).setOrigin(0.5).setDepth(20);

        this._pauseIsMuted = localStorage.getItem('tp2_muted') === 'true';

        const muteBtn = this.add.rectangle(640, 400, 48, 48, this._pauseIsMuted ? 0xff4444 : 0x44ff44)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(2, 0xd4af37)
            .setDepth(20);
        const muteIcon = this.add.text(640, 400, this._pauseIsMuted ? 'X' : '♪', {
            fontSize: '24px', fill: '#fff'
        }).setOrigin(0.5).setDepth(21);

        const backBtn = this.add.text(640, 470, t('close'), {
            fontSize: '20px', fill: '#fff',
            backgroundColor: '#8b4513', padding: { x: 18, y: 8 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(20);

        this._pauseSliderFill = sliderFill;
        this._pauseSliderKnob = sliderKnob;
        this._pauseValueText = valueText;
        this._pauseMuteBtn = muteBtn;
        this._pauseMuteIcon = muteIcon;

        this._pauseSettingsElements = [
            volumeLabel, sliderBg, sliderFill, sliderKnob,
            valueText, muteBtn, muteIcon, backBtn
        ];

        sliderKnob.on('pointerdown', () => { this._pauseVolDragging = true; });

        this.input.on('pointermove', (pointer) => {
            if (this._pauseVolDragging) {
                const minX = this._pauseSliderStartX;
                const maxX = this._pauseSliderStartX + this._pauseSliderWidth;
                const newX = Math.max(minX, Math.min(maxX, pointer.x));
                const v = (newX - minX) / this._pauseSliderWidth;
                this._updatePauseVolume(v);
            }
        });

        this.input.on('pointerup', () => { this._pauseVolDragging = false; });

        muteBtn.on('pointerdown', () => {
            this._pauseIsMuted = !this._pauseIsMuted;
            try { localStorage.setItem('tp2_muted', String(this._pauseIsMuted)); } catch (e) {}
            this._pauseMuteBtn.setFillStyle(this._pauseIsMuted ? 0xff4444 : 0x44ff44);
            this._pauseMuteIcon.setText(this._pauseIsMuted ? 'X' : '♪');
            const currentV = (this._pauseSliderKnob.x - this._pauseSliderStartX) / this._pauseSliderWidth;
            this._updatePauseVolume(currentV);
        });

        backBtn.on('pointerdown', () => this._hidePauseSettings());
    }

    // Updates the slider visuals + localStorage, just like SettingsScene,
    // so the displayed percentage always matches on both screens
    _updatePauseVolume(v) {
        const actualVolume = this._pauseIsMuted ? 0 : v;

        this._pauseValueText.setText(this._pauseIsMuted ? t('muted') : Math.round(v * 100) + '%');
        this._pauseSliderFill.width = this._pauseSliderWidth * v;
        this._pauseSliderKnob.x = this._pauseSliderStartX + (this._pauseSliderWidth * v);

        try { localStorage.setItem('tp2_volume', String(v)); } catch (e) {}

        // Immediately sync already-loaded sounds (game music stays at 0 while
        // paused and picks up the new value when the resume countdown finishes)
        this.sound.sounds.forEach(s => {
            try {
                if (s === this.gameMusic) return; // handled by the resume countdown
                if (s.setVolume) s.setVolume(actualVolume);
                else s.volume = actualVolume;
            } catch (e) {}
        });
    }

    _showPauseSettings() {
        this._pauseMainElements.forEach(o => o.setVisible(false));
        this._pauseTitleText.setText(t('settings'));

        // Re-read from localStorage in case it changed elsewhere
        // (e.g. the main menu's SettingsScene), to guarantee consistency
        const vol = parseFloat(localStorage.getItem('tp2_volume')) || 0.5;
        this._pauseIsMuted = localStorage.getItem('tp2_muted') === 'true';
        this._pauseMuteBtn.setFillStyle(this._pauseIsMuted ? 0xff4444 : 0x44ff44);
        this._pauseMuteIcon.setText(this._pauseIsMuted ? 'X' : '♪');
        this._updatePauseVolume(vol);

        this._pauseSettingsElements.forEach(o => o.setVisible(true));
    }

    _hidePauseSettings() {
        this._pauseSettingsElements.forEach(o => o.setVisible(false));
        this._pauseTitleText.setText('Pausa');
        this._pauseMainElements.forEach(o => o.setVisible(true));
    }

    // Creates a styled button for the pause overlay
    _makePauseBtn(x, y, label, color, cb) {
        const bg = this.add.rectangle(x, y, 280, 58, color)
            .setInteractive({ useHandCursor: true })
            .setDepth(20)
            .setStrokeStyle(2, 0xd4af37);

        const lbl = this.add.text(x, y, label, {
            fontSize: '22px', fill: '#fff', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(21);

        // Helper to darken the color on hover
        const darker = (c, amt) => {
            const r = Math.max(0, ((c >> 16) & 0xff) - amt);
            const g = Math.max(0, ((c >> 8)  & 0xff) - amt);
            const b = Math.max(0, ( c        & 0xff) - amt);
            return (r << 16) | (g << 8) | b;
        };

        bg.on('pointerover', () => {
            this.tweens.add({ targets: bg,  scale: 1.05, duration: 100, ease: 'Power1' });
            bg.setFillStyle(darker(color, 30));
        });
        bg.on('pointerout', () => {
            this.tweens.add({ targets: bg,  scale: 1.0,  duration: 100, ease: 'Power1' });
            bg.setFillStyle(color);
        });
        bg.on('pointerdown', cb);

        return { bg, label: lbl };
    }

    // Shows the pause overlay
    _showPauseOverlay() {
        this._pauseGroup.getChildren().forEach(c => {
            if (c !== this._countdownText) c.setVisible(true);
        });
        // Always reopen on the main pause view, never on the settings sub-view
        this._pauseTitleText.setText('Pausa');
        this._pauseSettingsElements.forEach(o => o.setVisible(false));
    }

    // Hides the pause overlay
    _hidePauseOverlay() {
        this._pauseGroup.getChildren().forEach(c => c.setVisible(false));
    }

    // Toggles between paused and playing
    togglePause() {
        if (this._isTransitioning || this._isCountingDown) return;

        if (this._isPaused) {
            this.startResumeCountdown();
        } else {
            this._isPaused = true;
            this.physics.pause();
            this.time.paused = true;
            if (this.gameMusic && this.gameMusic.isPlaying) {
                this.tweens.add({ targets: this.gameMusic, volume: 0, duration: 300 });
            }
            this.pauseBtn.setText('▶');
            this._showPauseOverlay();
        }
    }

    // 3-2-1 countdown before resuming after a pause
    startResumeCountdown() {
        if (this._isCountingDown) return;
        this._isCountingDown = true;

        // Hide everything except the backdrop and the countdown text
        this._pauseGroup.getChildren().forEach(c => {
            if (c !== this._countdownText) c.setVisible(false);
        });

        const dim = this._pauseGroup.getChildren()[0];
        if (dim) { dim.setAlpha(0.4); dim.setVisible(true); }

        this._countdownText.setVisible(true);

        let count = 3;
        const showCount = () => {
            if (count <= 0) {
                // Countdown finished — resume the game
                this._countdownText.setVisible(false);
                if (dim) dim.setAlpha(0.65);
                this._isCountingDown = false;
                this._isPaused = false;
                this.pauseBtn.setText('⏸');
                this._hidePauseOverlay();
                this.physics.resume();
                this.time.paused = false;
                const vol = parseFloat(localStorage.getItem('tp2_volume')) || 0.5;
                const muted = localStorage.getItem('tp2_muted') === 'true';
                if (this.gameMusic) {
                    this.tweens.add({ targets: this.gameMusic, volume: muted ? 0 : vol, duration: 300 });
                }
                return;
            }

            // Animate each countdown number
            this._countdownText.setText(String(count));
            this._countdownText.setScale(1.4);
            this._countdownText.setAlpha(1);

            this.tweens.add({
                targets: this._countdownText,
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

    // Main game loop (called every frame)
    update() {

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
        this._parallax.update(this.velocidadeJogo);

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

        // Debug text (state, ground, vertical velocity)
        //this.debugText.setText(`State: ${this._playerState} | onGround: ${onGround} | velY: ${Math.round(this.player.body.velocity.y)}`);

        // Player animation state machine
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

        // Score
        this.score += 1;
        this.scoreText.setText(`${t('score')}: ${Math.floor(this.score / 10)}`);

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

        // Floating animation (loops up and down)
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
        this.coinText.setText(`${t('coins')}: ${this.coinsCollected}`);
        if (this.coinCollectSound) {
            this.coinCollectSound.play();
        }
    }

    // Game Over: checks for Double Life or transitions to the game-over screen
    gameOver() {
        if (this._isTransitioning || this._isPaused || this._isCountingDown) return;

        // If Double Life is available, revive the player
        if (this._doubleLifeCount > 0 && !this._doubleLifeUsed) {
            this._doubleLifeUsed = true;
            this._doubleLifeCount--;
            localStorage.setItem('tp2_doublelife_count', String(this._doubleLifeCount));
            this._doubleLifeCountText.setText(`x${this._doubleLifeCount}`);

            // End deadeye if it's active
            if (this._isDeadeye) {
                clearTimeout(this._deadeyeTimeout);
                this._endDeadeye();
            }

            this._revivePlayer();
            return;
        }

        // No Double Life left: pause everything and go to GameOver
        this._isTransitioning = true;
        this.physics.pause();
        if (this.gameMusic && this.gameMusic.isPlaying) {
            this.gameMusic.stop();
        }

        // Clean up deadeye before leaving
        if (this._isDeadeye) {
            clearTimeout(this._deadeyeTimeout);
            this._endDeadeye();
        }

        // Tint the player red and transition to the Game Over scene
        this.player.setTint(0xff0000);
        this.transitionTo('GameOverScene', { score: Math.floor(this.score / 10), coins: this.coinsCollected });
    }

    // Cleanup when the scene is destroyed
    shutdown() {
        if (this._deadeyeTimeout) clearTimeout(this._deadeyeTimeout);
        // Restore timeScales so other scenes aren't affected
        this.physics.world.timeScale = 1;
        this.time.timeScale = 1;
        // Stop the music when the scene is destroyed
        if (this.gameMusic && this.gameMusic.isPlaying) {
            this.gameMusic.stop();
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