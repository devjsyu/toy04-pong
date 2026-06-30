import * as Phaser from 'phaser';
import { Ball } from '../gameobjects/Ball';
import { Paddle } from '../gameobjects/Paddle';
import { PlayerEnum, WINNING_SCORE, ASSETS, SCENES, EVENTS } from '../../constants/gameConfig';
import { Socket } from 'socket.io-client';

export class Game extends Phaser.Scene {
    paddle1!: Paddle;
    paddle2!: Paddle;
    ball!: Ball;
    private socket!: Socket;
    private isHost: boolean = false;
    private isRoleAssigned: boolean = false;
    private isGameStarted: boolean = false;
    private isGameOver: boolean = false;

    // string 대신 PlayerEnum을 키로 사용하여 타입 안전성을 높이기
    private scores: Record<PlayerEnum, number> = {
        [PlayerEnum.One]: 0,
        [PlayerEnum.Two]: 0
    };

    // Guest(손님) 렌더링용 변수
    private targetBallX: number = 0;
    private targetBallY: number = 0;
    private firstBallRender: boolean = true;

    // 틱 레이트 제한용 타이머
    private lastPaddleSentTime: number = 0;
    private lastBallSentTime: number = 0;

    constructor() {
        super(SCENES.GAME);
    }

    // Lobby 씬으로부터 전달받은 소켓 및 역할 정보 바인딩
    init(data: { socket: Socket; role: string }) {
        this.socket = data.socket;
        this.isHost = (data.role === 'host');
        console.log(`[Game Init] Role: ${data.role}`);
    }

    // 게임 요소 배치 및 소켓 이벤트 등록
    create() {
        console.log('[Game Create] Socket Instance', this.socket);

        // 1. 게임 오브젝트 셋업 (이미 역할이 정해졌으므로 즉시 실행)
        this.setupGameObjects();

        // 2. 본격적인 게임(공 움직임) 시작
        this.onGameStart();

        // 3. 인게임 소켓 이벤트 리스너 등록
        
        // 상대방 패들 움직임 수신
        this.socket.on('opponentMove', (data: { y: number }) => {
            if (!this.isRoleAssigned) return;

            if (this.isHost) {
                this.paddle2.setTargetY(data.y);
            } else {
                this.paddle1.setTargetY(data.y);
            }
        });

        // Guest가 서버로부터 공 위치 수신
        this.socket.on('ballRender', (data: { x: number; y: number }) => {
            if (!this.isRoleAssigned || this.isHost) return;
            
            if (this.firstBallRender) {
                this.ball.setPosition(data.x, data.y);
                this.targetBallX = data.x;
                this.targetBallY = data.y;
                this.firstBallRender = false;
            } else {
                this.targetBallX = data.x;
                this.targetBallY = data.y;
            }
        });

        // 점수/게임 상태 동기화 수신
        this.socket.on('scoreUpdate', (data: { scores: Record<PlayerEnum, number>; isGameOver: boolean; winner?: PlayerEnum }) => {
            this.scores = data.scores;
            this.game.events.emit(EVENTS.SCORE_UPDATED, PlayerEnum.One, this.scores[PlayerEnum.One]);
            this.game.events.emit(EVENTS.SCORE_UPDATED, PlayerEnum.Two, this.scores[PlayerEnum.Two]);

            if (data.isGameOver) {
                this.isGameOver = true;
                this.physics.pause();
                this.sound.play(ASSETS.SOUND_WIN, { volume: 0.5 });

                this.cameras.main.fadeOut(500, 0, 0, 0);
                this.cameras.main.once('camerafadeoutcomplete', () => {
                    this.scene.stop(SCENES.HUD);
                    this.scene.start(SCENES.GAME_OVER, { winner: data.winner });
                });
            } else {
                this.sound.play(ASSETS.SOUND_SCORE, { volume: 0.5 });
                if (this.ball) {
                    this.ball.setAlpha(0.5);
                }
                this.firstBallRender = true; // 공 리셋 시 보간 튀는 현상 방지
            }
        });

        // 인게임 도중 상대방이 연결을 끊었을 때
        this.socket.on('opponentLeft', () => {
            console.log('[Game] Opponent Left.');
            alert('상대방이 게임에서 퇴장했습니다.');
            this.isGameOver = true;
            this.physics.pause();
            if (this.ball) {
                this.ball.setVelocity(0, 0);
            }
        });

        // 씬 종료 시 리스너 및 소켓 정리 (메모리 누수 방지)
        this.events.once('shutdown', () => {
            if (this.socket) {
                this.socket.off('opponentMove');
                this.socket.off('ballRender');
                this.socket.off('scoreUpdate');
                this.socket.off('opponentLeft');
                this.socket.disconnect();
            }
        });

        this.isGameOver = false;

        this.cameras.main.fadeIn(500, 0, 0, 0);
        this.cameras.main.setBackgroundColor(0x000000);

        this.scores[PlayerEnum.One] = 0;
        this.scores[PlayerEnum.Two] = 0;

        this.game.events.emit(EVENTS.SCORE_UPDATED, PlayerEnum.One, 0);
        this.game.events.emit(EVENTS.SCORE_UPDATED, PlayerEnum.Two, 0);
    }

    private setupGameObjects() {
        if (this.isRoleAssigned) return;

        this.scene.run(SCENES.HUD);

        // Ball 생성 (처음에는 멈춤 상태)
        this.ball = new Ball(this, this.scale.width / 2, this.scale.height / 2, true);

        // Guest 로직: 자체적인 공 물리 연산 완전히 비활성화(Disable)
        if (!this.isHost) {
            if (this.ball.body instanceof Phaser.Physics.Arcade.Body) {
                this.ball.body.enable = false;
            }
        }

        // Host local: paddle1. Remote: paddle2
        // Guest local: paddle2. Remote: paddle1
        this.paddle1 = new Paddle(this, 20, this.scale.height / 2, PlayerEnum.One, !this.isHost);
        this.paddle2 = new Paddle(this, this.scale.width - 20, this.scale.height / 2, PlayerEnum.Two, this.isHost);

        const paddles = [this.paddle1, this.paddle2];

        // Host 로직: 공의 물리 연산(벽 충돌, 패들 충돌, 점수 판정) 활성화 및 직접 계산
        if (this.isHost) {
            this.physics.add.collider(
                this.ball,
                paddles,
                (ballObj) => {
                    const currentBall = ballObj as Ball;
                    currentBall.hitPaddle();
                },
                undefined,
                this
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
        }

        this.isRoleAssigned = true;
    }

    private onGameStart() {
        if (this.isGameStarted) return;
        this.isGameStarted = true;
        console.log('Game starting. Unfreezing ball.');

        if (this.isHost && this.ball) {
            this.ball.resetBall();
        }
    }

    update() {
        if (this.isGameOver || !this.isRoleAssigned) return;

        this.paddle1.update();
        this.paddle2.update();

        // Guest의 공 렌더링 (보간)
        if (!this.isHost && this.ball) {
            this.ball.x = Phaser.Math.Linear(this.ball.x, this.targetBallX, 0.3);
            this.ball.y = Phaser.Math.Linear(this.ball.y, this.targetBallY, 0.3);
        }

        if (this.isHost) {
            this.checkScore();
        }

        const now = Date.now();

        // 내 패들 이동 좌표를 paddleMove 이벤트로 30Hz마다 서버에 발송
        if (now - this.lastPaddleSentTime > 33) {
            const localPaddle = this.isHost ? this.paddle1 : this.paddle2;
            if (localPaddle) {
                this.socket.emit("paddleMove", { y: localPaddle.y });
                this.lastPaddleSentTime = now;
            }
        }

        // Host: 계산된 공의 현재 좌표를 ballUpdate 이벤트로 30Hz마다 서버에 지속 발송
        if (this.isHost && this.ball && this.isGameStarted) {
            if (now - this.lastBallSentTime > 33) {
                this.socket.emit("ballUpdate", {
                    x: this.ball.x,
                    y: this.ball.y
                });
                this.lastBallSentTime = now;
            }
        }
    }

    private checkScore() {
        if (this.isGameOver) return;

        if (this.ball.x < 0 || this.ball.x > this.scale.width) {
            const scorer = this.ball.x < 0 ? PlayerEnum.Two : PlayerEnum.One;

            this.scores[scorer]++;
            const currentScore = this.scores[scorer];
            this.game.events.emit(EVENTS.SCORE_UPDATED, scorer, currentScore);

            const isWin = currentScore >= WINNING_SCORE;

            // Host가 점수 업데이트 이벤트를 서버에 전송
            this.socket.emit('scoreUpdate', {
                scores: this.scores,
                isGameOver: isWin,
                winner: isWin ? scorer : undefined
            });

            if (isWin) {
                this.isGameOver = true;
                this.physics.pause();

                this.sound.play(ASSETS.SOUND_WIN, { volume: 0.5 });

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
