/**
 * ParallaxManager
 * ---------------
 * Gere o fundo com efeito de paralaxe usando apenas as imagens reais:
 *   Camada 0 – background2.jpg (fundo distante)  ×0.15 da velocidade
 *   Camada 1 – ground_Sprite.png (chão)          ×1.00 da velocidade
 */
export default class ParallaxManager {
    constructor(scene) {
        this.scene = scene;
        this.layers = [];
        this.ground = null;
    }

    // Chamar no preload() da cena
    preload() {
        const s = this.scene;
        if (!s.textures.exists('fundo')) {
            s.load.image('fundo', 'assets/images/background2.jpg');
        }
        if (!s.textures.exists('texturaChao')) {
            s.load.image('texturaChao', 'assets/images/ground_Sprite.png');
        }
    }

    // Chamar no create() da cena, ANTES de criar o jogador
    create() {
        this._buildBackground();
        this._buildGround();
    }

    // Chamar no update() da cena com a velocidade actual
    update(speed) {
        const delta = speed * 0.003;

        // Background move-se mais devagar (efeito de profundidade)
        this.layers[0].tilePositionX += delta * 0.15;

        // Chão sincronizado com a velocidade dos obstáculos
        if (this.ground) {
            this.ground.tilePositionX += delta * 3.0;
        }
    }

    // Retorna o sprite do chão para adicionar física na cena
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