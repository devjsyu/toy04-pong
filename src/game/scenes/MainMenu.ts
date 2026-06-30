import { Scene, Actions } from 'phaser';
import { ASSETS, SCENES } from '../../constants/gameConfig';

export class MainMenu extends Scene {

    constructor() {
        super(SCENES.MAIN_MENU);
    }

    create() {
        this.cameras.main.fadeIn(500, 0, 0, 0);
        this.cameras.main.setBackgroundColor(0x000000);

        const title = this.add.text(this.scale.width / 2, this.scale.height / 2, 'Pong!', {
            fontFamily: 'PressStart2P', fontSize: 100, color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        Actions.AddEffectShine(title);

        const start_msg = this.add.text(this.scale.width / 2, this.scale.height / 2 + 100, 'Press any key to start', {
            fontFamily: 'PressStart2P', fontSize: 20, color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        // Tween to blink the text
        this.tweens.add({
            targets: start_msg,
            alpha: 0,
            duration: 800,
            ease: 'Linear',
            yoyo: true,
            repeat: -1
        });

        // Press any key to start
        this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.input.keyboard?.once('keydown', () => {
                    const urlParams = new URLSearchParams(window.location.search);
                    const ticket = urlParams.get('ticket');

                    this.cameras.main.fadeOut(500, 0, 0, 0);
                    this.cameras.main.once('camerafadeoutcomplete', () => {
                        this.scene.start(SCENES.LOBBY, { ticket });
                    });
                });
            }
        });

        this.sound.play(ASSETS.SOUND_WIN, { volume: 0.5 });
    }
}
