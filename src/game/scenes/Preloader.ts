import { Scene } from 'phaser';

export class Preloader extends Scene {
    constructor() {
        super('Preloader');
    }

    init() {
        this.add.image(this.scale.width / 2, this.scale.height / 2, 'logo');
    }

    preload() {
        //  Load the assets for the game - Replace with your own assets
        this.load.setPath('assets');

        this.load.font(
            'PressStart2P',
            'fonts/PressStart2P-Regular.ttf',
            'truetype'
        );
    }

    create() {
        //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
        this.time.addEvent({
            delay: 1000,
            callback: () => {
                const main_camera = this.cameras.main.fadeOut(500, 0, 0, 0);
                // Fadeout complete
                main_camera.once("camerafadeoutcomplete", () => {
                    this.scene.start('MainMenu');
                });
            }
        });
    }
}
