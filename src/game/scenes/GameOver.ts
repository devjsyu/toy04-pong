import { Scene } from 'phaser';
import { SCENES } from '../../constants/gameConfig';

export class GameOver extends Scene {
    gameover_text!: Phaser.GameObjects.Text;
    winner?: string;

    constructor() {
        super('GameOver');
    }

    init(data: { winner?: string }) {
        this.winner = data.winner;
    }

    create() {
        this.cameras.main.fadeIn(500, 0, 0, 0);
        this.cameras.main.setBackgroundColor(0x000000);

        const titleText = this.winner ? `${this.winner} Wins!` : 'Game Over';

        this.gameover_text = this.add.text(this.scale.width / 2, this.scale.height / 2, titleText, {
            fontFamily: 'Mona12-Bold', fontSize: 60, color: '#ffffff',
            align: 'center'
        });
        this.gameover_text.setOrigin(0.5);

        const restart_msg = this.add.text(this.scale.width / 2, this.scale.height / 2 + 100, 'Press Enter to restart', {
            fontFamily: 'PressStart2P', fontSize: 20, color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        // Tween to blink the text
        this.tweens.add({
            targets: restart_msg,
            alpha: 0,
            duration: 800,
            ease: 'Linear',
            yoyo: true,
            repeat: -1
        });

        this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.input.keyboard?.once('keydown-ENTER', () => {
                    this.scene.start(SCENES.MAIN_MENU);
                });
            }
        });
    }
}
