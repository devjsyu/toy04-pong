import { Scene } from 'phaser';

export class Game extends Scene {
    constructor() {
        super('Game');
    }

    create() {
        this.cameras.main.fadeIn(500, 0, 0, 0);
        this.cameras.main.setBackgroundColor(0x000000);

        const start_msg = this.add.text(this.scale.width / 2, this.scale.height / 2 + 100, 'Press any key to proceed to the GameOver Scene', {
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
                    this.scene.start('GameOver');
                });
            }
        });
    }
}
