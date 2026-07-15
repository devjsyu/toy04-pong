import * as Phaser from 'phaser';
import { PlayerEnum, SCENES, EVENTS } from '../../constants/gameConfig';

export class Hud extends Phaser.Scene {
    private player1ScoreText!: Phaser.GameObjects.Text;
    private player2ScoreText!: Phaser.GameObjects.Text;

    constructor() {
        super(SCENES.HUD);
    }

    create() {
        const hostNickname = this.registry.get('hostNickname');
        const guestNickname = this.registry.get('guestNickname');

        this.player1ScoreText = this.createScoreText(
            this.scale.width * 0.15, // 왼쪽 끝으로 이동
            20,                      // 최상단 여백
            hostNickname,
            0
        );

        this.player2ScoreText = this.createScoreText(
            this.scale.width * 0.85, // 오른쪽 끝으로 이동
            20,                      // 최상단 여백
            guestNickname,
            0
        );

        // 전역 이벤트 리스너 등록
        this.game.events.on(EVENTS.SCORE_UPDATED, this.handleScoreUpdate, this);

        // 씬 종료 시 이벤트 리스너 제거 (메모리 누수 방지)
        this.events.once('shutdown', () => {
            this.game.events.off(EVENTS.SCORE_UPDATED, this.handleScoreUpdate, this);
        });
    }

    private handleScoreUpdate(player: PlayerEnum, score: number) {
        const hostNickname = this.registry.get('hostNickname');
        const guestNickname = this.registry.get('guestNickname');

        if (player === PlayerEnum.One) {
            this.updateText(this.player1ScoreText, hostNickname, score);
        } else if (player === PlayerEnum.Two) {
            this.updateText(this.player2ScoreText, guestNickname, score);
        }
    }

    private updateText(textObj: Phaser.GameObjects.Text, label: string | undefined, score: number) {
        const formattedScore = score.toString().padStart(2, '0');
        // 모든 텍스트를 대문자로 변환하여 아케이드 느낌을 강조하고 세로로 배치합니다.
        textObj.setText(`${label?.toUpperCase()}\n${formattedScore}`);
    }

    /**
     * Helper method to centralize score text styling and creation
     */
    private createScoreText(x: number, y: number, label: string | undefined, score: number): Phaser.GameObjects.Text {
        const formattedScore = score.toString().padStart(2, '0');
        const content = `${label?.toUpperCase()}\n${formattedScore}`;

        const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
            fontFamily: 'Mona12-Bold',
            fontSize: '20px', // 크기를 줄여 시야 방해 최소화
            color: '#ffffff',
            align: 'center',
            lineSpacing: 10   // 라벨과 점수 사이 간격
        };

        return this.add.text(x, y, content, textStyle).setOrigin(0.5, 0);
    }
}