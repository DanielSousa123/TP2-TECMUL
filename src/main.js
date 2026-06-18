import Phaser from 'phaser';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import SettingsScene from './scenes/SettingsScene.js';
import ShopScene from './scenes/ShopScene.js';

const config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: true
        }
    },
    dom: {
        createContainer: true
    },
    scene: [MenuScene, GameScene, GameOverScene, SettingsScene, ShopScene]
};

const game = new Phaser.Game(config);