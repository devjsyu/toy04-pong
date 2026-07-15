import { Boot } from './scenes/Boot';
import { GameOver } from './scenes/GameOver';
import { Game as MainGame } from './scenes/Game';
import { MainMenu } from './scenes/MainMenu';
import { Lobby } from './scenes/Lobby';
import { AUTO, Game, Scale } from 'phaser';
import { Preloader } from './scenes/Preloader';
import { Hud } from './scenes/Hud';

//  Find out more information about the Game Config at:
//  https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: 1024,
    height: 768,
    parent: 'game-container',
    backgroundColor: '#000000',

    scale: {
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH,
    },

    scene: [
        Boot,
        Preloader,
        MainMenu,
        Lobby,
        MainGame,
        GameOver,
        Hud
    ],
    physics: {
        default: "arcade"
    }
};

const StartGame = (parent: string) => {

    return new Game({ ...config, parent });

}

export default StartGame;
