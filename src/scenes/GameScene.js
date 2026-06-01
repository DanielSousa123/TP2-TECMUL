import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        this.load.image('fundo', 'assets/images/background2.jpg');
    }

    create() {
        // 1. Variáveis de controlo do jogo
        this.velocidadeJogo = 300;
        this.velocidadeMaxima=800;
        this.aceleracao=0.05;
        this.score = 0;
        //Dimensões do Background
        this.background = this.add.tileSprite(640, 360, 1280, 720, 'fundo');
        this.background.tileScaleX = 1280 / 1416; 
        this.background.tileScaleY = 720 / 980;  

        // Texto para mostrar a pontuação no ecrã
        this.scoreText = this.add.text(16, 16, 'Pontos: 0', { fontSize: '24px', fill: '#fff' });

        // 2. Criar o Chão
        // Criamos uma textura para o chão
        const chaoCanvas = this.make.graphics({ x: 0, y: 0, add: false });
        chaoCanvas.fillStyle(0x8B4513); // Cor Castanha para o chão
        chaoCanvas.fillRect(0, 0, 32, 32);
        chaoCanvas.generateTexture('texturaChao', 32, 32);

        // Criamos o TileSprite (X, Y, Largura, Altura, Chave da Textura)
        this.chao = this.add.tileSprite(640, 675, 1280, 90, 'texturaChao');
        
        // Ativamos a física no chão e tornamo-lo estático (não cai com a gravidade)
        this.physics.add.existing(this.chao, true);

        // 3. Criar o Jogador
        // Criamos uma textura para o jogador (um quadrado azul)
        const playerCanvas = this.make.graphics({ x: 0, y: 0, add: false });
        playerCanvas.fillStyle(0x00aaff);
        playerCanvas.fillRect(0, 0, 50, 50);
        playerCanvas.generateTexture('texturaPlayer', 50, 50);

        // Adicionamos o jogador com física Arcade
        this.player = this.physics.add.sprite(100, 200, 'texturaPlayer');
        this.player.setCollideWorldBounds(true); // Não deixa sair do ecrã

        // Adiciona colisão entre o Jogador e o Chão
        this.physics.add.collider(this.player, this.chao);

        // 4. Configurar controlos do Teclado (Barra de Espaço ou Seta para Cima)
        this.teclas = this.input.keyboard.createCursorKeys();

        // 5. Criar o Grupo de Obstáculos (Exigido no enunciado)
        this.obstaculos = this.physics.add.group();

        // Criar textura para os obstáculos (um retângulo vermelho)
        const obstaculoCanvas = this.make.graphics({ x: 0, y: 0, add: false });
        obstaculoCanvas.fillStyle(0xff3333);
        obstaculoCanvas.fillRect(0, 0, 25, 40);
        obstaculoCanvas.generateTexture('texturaObstaculo', 25, 40);

        // Loop de tempo (Timer) para gerar obstáculos a cada 1.5 segundos (1500ms)
        this.geradorObstaculos = this.time.addEvent({
            delay: 1500,
            callback: this.criarObstaculo,
            callbackScope: this,
            loop: true
        });

        // Configurar colisor entre o Jogador e o Grupo de Obstáculos
        this.physics.add.collider(this.player, this.obstaculos, this.gameOver, null, this);
    }

    update() {

        if (this.velocidadeJogo < this.velocidadeMaxima) {
            this.velocidadeJogo += this.aceleracao;
        }
    
        this.background.tilePositionX += this.velocidadeJogo * 0.002;
        this.chao.tilePositionX += this.velocidadeJogo * 0.015;

        // 2. Controlar o Salto
        if ((this.teclas.up.isDown || this.teclas.space.isDown) && this.player.body.touching.down) {
            this.player.setVelocityY(-200); // Força do salto
        }

        // 3. Atualizar a pontuação dinamicamente
        this.score += 1;
        this.scoreText.setText('Pontos: ' + Math.floor(this.score / 10));

        // 4. Otimização: Destruir obstáculos que já saíram completamente do ecrã à esquerda
        this.obstaculos.getChildren().forEach(obstaculo => {
            obstaculo.setVelocityX(-this.velocidadeJogo);
            if (obstaculo.x < -50) {
                obstaculo.destroy();
            }
        });
    }

    criarObstaculo() {
        // Gera um obstáculo ligeiramente fora do ecrã do lado direito (X: 850)
        // Alinhado mesmo acima do chão (Y: 340)
        const obstaculo = this.obstaculos.create(1350, 610, 'texturaObstaculo')
        
        obstaculo.body.setAllowGravity(false);
        obstaculo.body.setImmovable(true);
        
        // Remove a gravidade do obstáculo para ele não cair através do cenário
        obstaculo.body.setAllowGravity(false);
        obstaculo.body.setImmovable(true);
    }

    gameOver() {
        // Para a física do jogo e o gerador de obstáculos
        this.physics.pause();
        this.geradorObstaculos.destroy();
        
        // Pinta o jogador para indicar impacto
        this.player.setTint(0xff0000);

        // Aguarda 1 segundo e reinicia a cena atual
        this.time.delayedCall(1000, () => {
            this.scene.restart();
        });
    }
}