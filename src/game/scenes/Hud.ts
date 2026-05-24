import * as Phaser from 'phaser';
import { PlayerEnum } from '../../constants/gameConfig';

export class Hud extends Phaser.Scene {
    private score: Map<PlayerEnum, number>;
    private player1ScoreText!: Phaser.GameObjects.Text;
    private player2ScoreText!: Phaser.GameObjects.Text;

    constructor() {
        super("Hud");
    }

    init() {
        this.score = new Map<PlayerEnum, number>();

        this.score.set(PlayerEnum.One, 0);
        this.score.set(PlayerEnum.Two, 0);
    }

    create() {
        this.player1ScoreText = this.createScoreText(
            this.scale.width / 3,
            this.scale.height / 3,
            PlayerEnum.One,
            this.score.get(PlayerEnum.One) ?? 0
        );

        this.player2ScoreText = this.createScoreText(
            this.scale.width * 2 / 3,
            this.scale.height / 3,
            PlayerEnum.Two,
            this.score.get(PlayerEnum.Two) ?? 0
        );
    }

    public updateScore(player: PlayerEnum): number {
        const newScore = (this.score.get(player) ?? 0) + 1;
        this.score.set(player, newScore);

        const formattedScore = newScore.toString().padStart(2, '0');
        const content = `${player}\n${formattedScore}`;

        if (player === PlayerEnum.One) {
            this.player1ScoreText.setText(content);
        } else {
            this.player2ScoreText.setText(content);
        }

        return newScore;
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