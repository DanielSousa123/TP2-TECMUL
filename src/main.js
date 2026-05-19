import Phaser from 'phaser';
import GameScene from './scenes/GameScene.js';

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade', // Sistema de física Arcade exigido
        arcade: {
            gravity: { y: 300 }, // Gravidade para empurrar as coisas para baixo
            debug: false         // Muda para true para ver as caixas de colisão
        }
    },
    scene: [GameScene] // Registo da cena que criámos acima
};

const game = new Phaser.Game(config);