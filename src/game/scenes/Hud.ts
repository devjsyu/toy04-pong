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
            this.scale.width * 0.15, // 왼쪽 끝으로 이동
            20,                      // 최상단 여백
            PlayerEnum.One,
            this.registry.get(PlayerEnum.One) ?? 0
        );

        this.player2ScoreText = this.createScoreText(
            this.scale.width * 0.85, // 오른쪽 끝으로 이동
            20,                      // 최상단 여백
            PlayerEnum.Two,
            this.registry.get(PlayerEnum.Two) ?? 0
        );

        // Registry의 데이터 변경 감시 (이벤트 리스너)
        this.registry.events.on(`changedata-${PlayerEnum.One}`, (_: any, value: number) => {
            this.updateText(this.player1ScoreText, PlayerEnum.One, value);
        });

        this.registry.events.on(`changedata-${PlayerEnum.Two}`, (_: any, value: number) => {
            this.updateText(this.player2ScoreText, PlayerEnum.Two, value);
        });

        // 씬 종료 시 이벤트 리스너 제거 (메모리 누수 방지)
        this.events.once('shutdown', () => {
            this.registry.events.off(`changedata-${PlayerEnum.One}`);
            this.registry.events.off(`changedata-${PlayerEnum.Two}`);
        });
    }

    private updateText(textObj: Phaser.GameObjects.Text, label: string | PlayerEnum, score: number) {
        const formattedScore = score.toString().padStart(2, '0');
        // 모든 텍스트를 대문자로 변환하여 아케이드 느낌을 강조하고 세로로 배치합니다.
        textObj.setText(`${label.toUpperCase()}\n${formattedScore}`);
    }

    /**
     * Helper method to centralize score text styling and creation
     */
    private createScoreText(x: number, y: number, label: string | PlayerEnum, score: number): Phaser.GameObjects.Text {
        const formattedScore = score.toString().padStart(2, '0');
        const content = `${label.toUpperCase()}\n${formattedScore}`;

        const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
            fontFamily: 'PressStart2P',
            fontSize: '20px', // 크기를 줄여 시야 방해 최소화
            color: '#ffffff',
            align: 'center',
            lineSpacing: 10   // 라벨과 점수 사이 간격
        };

        return this.add.text(x, y, content, textStyle).setOrigin(0.5, 0);
    }
}