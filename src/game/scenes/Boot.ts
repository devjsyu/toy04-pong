import { Scene } from 'phaser';
import { SCENES } from '../../constants/gameConfig';

export class Boot extends Scene
{
    constructor ()
    {
        super(SCENES.BOOT);
    }

    preload ()
    {
        //  The Boot Scene is typically used to load in any assets you require for your Preloader, such as a game logo or background.
        //  The smaller the file size of the assets, the better, as the Boot Scene itself has no preloader.

        this.load.image('logo', 'assets/images/logo.png');
    }

    create ()
    {
        this.scene.start(SCENES.PRELOADER);
    }
}
