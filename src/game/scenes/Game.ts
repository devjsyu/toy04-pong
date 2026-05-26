import * as Phaser from 'phaser';
import { Ball } from '../gameobjects/Ball';
import { Paddle } from '../gameobjects/Paddle';
import { PlayerEnum, WINNING_SCORE, ASSETS, SCENES } from '../../constants/gameConfig';

export class Game extends Phaser.Scene {
    paddle1!: Paddle;
    paddle2!: Paddle;
    ball!: Ball;

    constructor() {
        super(SCENES.GAME);
    }

    create() {
        this.cameras.main.fadeIn(500, 0, 0, 0);
        this.cameras.main.setBackgroundColor(0x000000);

        // 시작 전 점수 초기화
        this.registry.set(PlayerEnum.One, 0);
        this.registry.set(PlayerEnum.Two, 0);

        // HUD 씬을 병렬로 실행합니다.
        this.scene.run(SCENES.HUD);

        this.ball = new Ball(this, this.scale.width / 2, this.scale.height / 2);
        this.paddle1 = new Paddle(this, 20, this.scale.height / 2, PlayerEnum.One);
        this.paddle2 = new Paddle(this, this.scale.width - 20, this.scale.height / 2, PlayerEnum.Two);

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

        this.physics.world.setBoundsCollision(false, false, true, true);

        this.physics.world.on(
            Phaser.Physics.Arcade.Events.WORLD_BOUNDS,
            (body: Phaser.Physics.Arcade.Body, up: boolean, down: boolean) => {
                if (body.gameObject instanceof Ball && (up || down)) {
                    body.gameObject.hitWall();
                }
            },
            this
        );

        // Press any key to start
        this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.input.keyboard?.once('keydown-ENTER', () => {
                    this.cameras.main.fadeOut(500, 0, 0, 0);
                    this.cameras.main.once('camerafadeoutcomplete', () => {
                        this.scene.stop(SCENES.HUD);
                        this.scene.start(SCENES.GAME_OVER);
                    });
                });
            }
        });
    }

    update() {
        this.paddle1.update();
        this.paddle2.update();

        this.checkScore();
    }

    private checkScore() {
        if (this.ball.x < 0 || this.ball.x > this.scale.width) {
            const scorer = this.ball.x < 0 ? PlayerEnum.Two : PlayerEnum.One;
            
            const currentScore = (this.registry.get(scorer) || 0) + 1;
            this.registry.set(scorer, currentScore);

            if (currentScore >= WINNING_SCORE) {
                this.sound.play(ASSETS.SOUND_WIN);

                this.cameras.main.fadeOut(500, 0, 0, 0);
                this.cameras.main.once('camerafadeoutcomplete', () => {
                    this.scene.stop(SCENES.HUD);
                    this.scene.start(SCENES.GAME_OVER, { winner: scorer });
                });
            } else {
                this.sound.play(ASSETS.SOUND_SCORE, { volume: 0.5 });

                this.ball.resetBall();
            }
        }
    }
}
