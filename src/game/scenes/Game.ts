import * as Phaser from 'phaser';
import { Ball } from '../gameobjects/Ball';
import { Paddle } from '../gameobjects/Paddle';
import { PlayerEnum, WINNING_SCORE, ASSETS, SCENES, EVENTS } from '../../constants/gameConfig';
import { io, Socket } from 'socket.io-client';

export class Game extends Phaser.Scene {
    paddle1!: Paddle;
    paddle2!: Paddle;
    ball!: Ball;
    private socket!: Socket;
    private roomId!: string;
    private isHost: boolean = false;
    private isRoleAssigned: boolean = false;
    private isGameStarted: boolean = false;

    // 게임 종료 상태를 추적하는 플래그
    private isGameOver: boolean = false;

    // string 대신 PlayerEnum을 키로 사용하여 타입 안전성을 높이기
    private scores: Record<PlayerEnum, number> = {
        [PlayerEnum.One]: 0,
        [PlayerEnum.Two]: 0
    };

    constructor() {
        super(SCENES.GAME);
    }

    // 다른 씬에서 넘겨준 데이터 받기
    init(data: { ticket: string; roomId: string }) {
        this.roomId = data.roomId;

        // 현재 도메인(Nginx Proxy)을 통해 Node.js 서버로 연결을 시도하며 티켓 보내기
        this.socket = io({
            auth: {
                token: data.ticket
            }
        });
    }

    // 게임 요소 배치 및 소켓 이벤트 등록
    create() {
        // 소켓 연결 성공하면 서버의 Room에 조인 요청
        this.socket.on('connect', () => {
            console.log('Connected to Node.js Game Server');
            this.socket.emit('joinRoom', this.roomId);
        });

        // 역할 할당 이벤트 수신 (서버에서 소켓의 입장 순서에 따라 발송)
        this.socket.on('assignRole', (data: { role: string }) => {
            console.log('Role assigned:', data.role);
            this.isHost = (data.role === 'host');
            this.setupGameObjects();
        });

        // 게임 시작 이벤트 수신 (두 플레이어가 모두 참여했을 때)
        this.socket.on('gameStart', () => {
            this.onGameStart();
        });

        // 서버로부터 상대방의 움직임 이벤트 들을 준비
        this.socket.on('opponentMove', (data: { y: number }) => {
            if (!this.isRoleAssigned) return;

            // 상대방 패들의 Y 좌표 동기화 로직 수행
            if (this.isHost) {
                this.paddle2.setTargetY(data.y);
            } else {
                this.paddle1.setTargetY(data.y);
            }
        });

        // Guest (Player 2) receives ball render position from the server
        this.socket.on('ballRender', (data: { x: number; y: number }) => {
            if (!this.isRoleAssigned || this.isHost) return;
            this.ball.setPosition(data.x, data.y);
        });

        // Handle score/game state synchronization from the Host (Player 1)
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
            }
        });

        // 인증 실패 등으로 소켓 연결 에러가 났을 때 처리
        this.socket.on('connect_error', (err) => {
            console.error('Socket Connection Error:', err.message);
            alert('게임 서버 인증에 실패했습니다.');
        });

        // 씬 종료 시 소켓 연결 해제 (메모리 누수 방지)
        this.events.once('shutdown', () => {
            if (this.socket) {
                this.socket.disconnect();
            }
        });

        this.isGameOver = false;
        this.isRoleAssigned = false;
        this.isGameStarted = false;

        this.cameras.main.fadeIn(500, 0, 0, 0);
        this.cameras.main.setBackgroundColor(0x000000);

        // 점수 내부 변수 초기화 및 초기 UI 반영을 위한 이벤트 발행
        this.scores[PlayerEnum.One] = 0;
        this.scores[PlayerEnum.Two] = 0;

        this.game.events.emit(EVENTS.SCORE_UPDATED, PlayerEnum.One, 0);
        this.game.events.emit(EVENTS.SCORE_UPDATED, PlayerEnum.Two, 0);
    }

    private setupGameObjects() {
        if (this.isRoleAssigned) return;

        // HUD 씬을 병렬로 실행합니다.
        this.scene.run(SCENES.HUD);

        // Ball is initially created frozen
        this.ball = new Ball(this, this.scale.width / 2, this.scale.height / 2, true);

        // Disable physics for Guest ball
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

        // Host handles collisions and bounds
        if (this.isHost) {
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
        // 게임이 종료되었거나 역할이 할당되지 않았다면 로직 업데이트 중단
        if (this.isGameOver || !this.isRoleAssigned) return;

        this.paddle1.update();
        this.paddle2.update();

        if (this.isHost) {
            this.checkScore();
            this.emitBallPosition();
        }

        // Emit local paddle position
        const localPaddle = this.isHost ? this.paddle1 : this.paddle2;
        this.emitPaddlePosition(localPaddle.y);
    }

    private lastPaddleSentY: number = -1;
    private lastPaddleSentTime: number = 0;

    private emitPaddlePosition(y: number) {
        if (!this.socket || !this.socket.connected) return;

        const now = Date.now();
        // Check if Y has changed significantly and throttle check (e.g. 33ms or 30Hz)
        if (Math.abs(y - this.lastPaddleSentY) > 0.5 && now - this.lastPaddleSentTime > 33) {
            this.socket.emit("paddleMove", { roomId: this.roomId, y });
            this.lastPaddleSentY = y;
            this.lastPaddleSentTime = now;
        }
    }

    private lastBallSentX: number = -1;
    private lastBallSentY: number = -1;
    private lastBallSentTime: number = 0;

    private emitBallPosition() {
        if (!this.socket || !this.socket.connected) return;

        const now = Date.now();
        // Throttle check (e.g. 33ms or 30Hz)
        if (now - this.lastBallSentTime > 33) {
            this.socket.emit("ballUpdate", {
                roomId: this.roomId,
                x: this.ball.x,
                y: this.ball.y
            });
            this.lastBallSentX = this.ball.x;
            this.lastBallSentY = this.ball.y;
            this.lastBallSentTime = now;
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

            // Host emits scoreUpdate to server so Guest can synchronize
            this.socket.emit('scoreUpdate', {
                roomId: this.roomId,
                scores: this.scores,
                isGameOver: isWin,
                winner: isWin ? scorer : undefined
            });

            if (isWin) {
                this.isGameOver = true;
                // 물리 엔진도 멈춰서 공이 계속 움직이지 않게 합니다.
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
