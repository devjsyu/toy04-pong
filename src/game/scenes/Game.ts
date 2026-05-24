import * as Phaser from 'phaser';
import { Ball } from '../gameobjects/Ball';
import { Paddle } from '../gameobjects/Paddle';
import { PlayerEnum } from '../../constants/gameConfig';

export class Game extends Phaser.Scene {
    paddle1!: Paddle;
    paddle2!: Paddle;
    ball!: Ball;
    wasdKeys?: {
        W: Phaser.Input.Keyboard.Key;
        A: Phaser.Input.Keyboard.Key;
        S: Phaser.Input.Keyboard.Key;
        D: Phaser.Input.Keyboard.Key;
    };
    cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    constructor() {
        super('Game');
    }

    create() {
        this.cameras.main.fadeIn(500, 0, 0, 0);
        this.cameras.main.setBackgroundColor(0x000000);

        // 시작 전 점수 초기화
        this.registry.set(PlayerEnum.One, 0);
        this.registry.set(PlayerEnum.Two, 0);

        // HUD 씬을 병렬로 실행합니다.
        this.scene.run('Hud');

        this.ball = new Ball(this, this.scale.width / 2, this.scale.height / 2);
        this.paddle1 = new Paddle(this, 20, this.scale.height / 2);
        this.paddle2 = new Paddle(this, this.scale.width - 20, this.scale.height / 2);

        const paddles = [this.paddle1, this.paddle2];

        this.physics.add.collider(
            this.ball,
            paddles,
            (ballObj) => {
                const currentBall = ballObj as Ball;
                currentBall.hitPaddle();
            },
            undefined, // processCallback은 사용하지 않으므로 무시
            this // 콜백이 실행될 컨텍스트 환경을 지정
        );

        if (this.input.keyboard) {
            this.wasdKeys = {
                W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
                A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
                S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
                D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            }
            this.cursors = this.input.keyboard.createCursorKeys();
        }

        // Press any key to start
        this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.input.keyboard?.once('keydown-ENTER', () => {
                    this.scene.stop('Hud');
                    this.scene.start('GameOver');
                });
            }
        });
    }

    update() {
        if (!this.wasdKeys || !this.cursors || !this.paddle1 || !this.paddle2) return;

        if (this.wasdKeys?.W.isDown) {
            this.paddle1.moveUp();
        }
        else if (this.wasdKeys?.S.isDown) {
            this.paddle1.moveDown();
        }
        else {
            this.paddle1.stopMove();
        }

        if (this.cursors.up.isDown) {
            this.paddle2.moveUp();
        }
        else if (this.cursors.down.isDown) {
            this.paddle2.moveDown();
        }
        else {
            this.paddle2.stopMove();
        }

        if (this.ball.x < 0 || this.ball.x > this.scale.width) {
            const scorer = this.ball.x < 0 ? PlayerEnum.Two : PlayerEnum.One;
            
            const currentScore = (this.registry.get(scorer) || 0) + 1;
            this.registry.set(scorer, currentScore);

            if (currentScore >= 3) {
                this.scene.stop('Hud');
                this.scene.start('GameOver', { winner: scorer });
            } else {
                this.ball.resetBall();
            }
        }
    }
}
