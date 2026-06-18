export default class ParallaxManager {
    constructor(scene) {
        this.scene = scene;
        this.layers = [];
        this.ground = null;
    }

    preload() {
        const s = this.scene;
        if (!s.textures.exists('fundo')) {
            s.load.image('fundo', 'assets/images/background2.jpg');
        }
        if (!s.textures.exists('texturaChao')) {
            s.load.image('texturaChao', 'assets/images/ground_Sprite.png');
        }
    }


    create() {
        this._buildBackground();
        this._buildGround();
    }

    
    update(speed) {
        const delta = speed * 0.01;

        // Background moves slower
        this.layers[0].tilePositionX += delta * 0.15;

        if (this.ground) {
            this.ground.tilePositionX += delta * 3.0;
        }
    }

    getGround() {
        return this.ground;
    }

    _buildBackground() {
        const s = this.scene;
        const bg = s.add.tileSprite(640, 360, 1280, 720, 'fundo');
        bg.tileScaleX = 1280 / 1416;
        bg.tileScaleY = 720 / 980;
        bg.postFX.addBlur(0.5, 0.5, 1, 1);
        this.layers.push(bg);
    }

    _buildGround() {
        const s = this.scene;
        this.ground = s.add.tileSprite(640, 675, 1280, 90, 'texturaChao');

        const frame = s.textures.get('texturaChao').get();
        if (frame) {
            this.ground.tileScaleY = 90 / frame.height;
            this.ground.tileScaleX = this.ground.tileScaleY;
        }

        this.ground.postFX.addBlur(0.01, 0.01, 0.01, 0.01);
        s.physics.add.existing(this.ground, true);
    }
}