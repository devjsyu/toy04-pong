import * as Phaser from 'phaser';
import { PlayerEnum } from '../../constants/gameConfig';

export class Hud extends Phaser.Scene {
    private player1ScoreText!: Phaser.GameObjects.Text;
    private player2ScoreText!: Phaser.GameObjects.Text;

    constructor() {
        super("Hud");
    }

    create() {
        this.player1ScoreText = this.createScoreText(
            this.scale.width / 3,
            this.scale.height / 3,
            PlayerEnum.One,
            this.registry.get(PlayerEnum.One) ?? 0
        );

        this.player2ScoreText = this.createScoreText(
            this.scale.width * 2 / 3,
            this.scale.height / 3,
            PlayerEnum.Two,
            this.registry.get(PlayerEnum.Two) ?? 0
        );

        // Registry의 데이터 변경 감시 (이벤트 리스너)
        this.registry.on(`changedata-${PlayerEnum.One}`, (_: any, value: number) => {
            this.updateText(this.player1ScoreText, PlayerEnum.One, value);
        });

        this.registry.on(`changedata-${PlayerEnum.Two}`, (_: any, value: number) => {
            this.updateText(this.player2ScoreText, PlayerEnum.Two, value);
        });

        // 씬 종료 시 이벤트 리스너 제거 (메모리 누수 방지)
        this.events.once('shutdown', () => {
            this.registry.off(`changedata-${PlayerEnum.One}`);
            this.registry.off(`changedata-${PlayerEnum.Two}`);
        });
    }

    private updateText(textObj: Phaser.GameObjects.Text, label: string, score: number) {
        const formattedScore = score.toString().padStart(2, '0');
        textObj.setText(`${label}\n${formattedScore}`);
    }

    /**
     * Helper method to centralize score text styling and creation
     */
    private createScoreText(x: number, y: number, label: string, score: number): Phaser.GameObjects.Text {
        const formattedScore = score.toString().padStart(2, '0');
        const content = `${label}\n${formattedScore}`;

        const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
            fontFamily: 'PressStart2P',
            fontSize: '40px',
            color: '#ffffff',
            align: 'center'
        };

        return this.add.text(x, y, content, textStyle).setOrigin(0.5, 0.5);
    }
}