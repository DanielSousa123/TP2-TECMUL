import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene'); // Nome de registo da cena
    }

    preload() {
        // Carrega uma imagem de teste diretamente da web para garantir que funciona
        this.load.image('logo', 'https://labs.phaser.io/assets/sprites/phaser3-logo.png');
    }

    create() {
        // Adiciona a imagem no centro do ecrã com física Arcade
        const logo = this.physics.add.image(400, 150, 'logo');

        // Configurações físicas exigidas no enunciado (velocidade e ressalto)
        logo.setVelocity(150, 250);
        logo.setBounce(1, 1);
        logo.setCollideWorldBounds(true); // Faz o logo ressaltar nas bordas do ecrã
    }

    update() {
        // Lógica do jogo que roda a cada frame
    }
}