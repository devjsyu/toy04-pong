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

    // Host 관점에서 Guest의 Paddle을 렌더링
    private paddle2Visual!: Phaser.GameObjects.Sprite;

    // string 대신 PlayerEnum을 키로 사용하여 타입 안전성을 높이기
    private scores: Record<PlayerEnum, number> = {
        [PlayerEnum.One]: 0,
        [PlayerEnum.Two]: 0
    };

    // Guest(손님) 렌더링용 변수
    private targetBallX: number = 0;
    private targetBallY: number = 0;
    private firstBallRender: boolean = true;

    // 틱 레이트와 상관없이 충돌 시 즉시 Guest에게 알리기 위한 변수
    private nextCollisionSFX: 'none' | 'paddle' | 'wall' = 'none';

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

            // 정확한 Guest 물리 충돌 판정 위해 보간 없이 y 좌표 즉시 대입 
            if (this.isHost) {
                this.paddle2.y = data.y; // Host 관점에서 Guest의 Paddle은 즉시 동기화
                if (this.paddle2.body) this.paddle2.body.updateFromGameObject();
            } else {
                // 물리 충돌 판정 책임이 없는 Guest는 보간 활용하여 렌더링
                this.paddle1.setTargetY(data.y);
            }
        });

        // Guest가 서버로부터 공 위치 수신
        this.socket.on('ballRender', (data: { x: number; y: number; sfx?: string }) => {
            if (!this.isRoleAssigned || this.isHost) return;

            if (data.sfx && data.sfx !== 'none') {
                console.log(`[Guest Sound Debug] SFX 수신됨: ${data.sfx}`);
            }

            if (this.firstBallRender) {
                // 공의 현재 위치를 즉시 화면 정중앙으로 리셋
                this.ball.setPosition(data.x, data.y);
                // 다음 프레임 update() 보간 루프가 튀지 않도록 targetBall x, y 좌표도 동일하게 갱신
                this.targetBallX = data.x;
                this.targetBallY = data.y;
                this.firstBallRender = false;
            } else {
                this.targetBallX = data.x;
                this.targetBallY = data.y;
            }

            if (data.sfx && ['paddle', 'wall'].includes(data.sfx)) {
                this.sound.play(ASSETS.SOUND_BOUNCE, { volume: 0.5 });
            }
        });

        // 점수/게임 상태 동기화 수신
        this.socket.on('scoreUpdate', (data: { scores: Record<PlayerEnum, number>; isGameOver: boolean; winner?: PlayerEnum }) => {
            if (this.isHost) return;

            this.scores = data.scores;
            this.game.events.emit(EVENTS.SCORE_UPDATED, PlayerEnum.One, this.scores[PlayerEnum.One]);
            this.game.events.emit(EVENTS.SCORE_UPDATED, PlayerEnum.Two, this.scores[PlayerEnum.Two]);

            if (data.isGameOver) {
                this.triggerGameOverSequence(data.winner);
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

        // 공 충돌 이벤트 리스너
        this.socket.on('ballCollision', (data: { type: 'paddle' | 'wall' }) => {
            if (this.isHost) return;

            this.sound.play(ASSETS.SOUND_BOUNCE, { volume: 0.5 });
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

        // [물리-렌더 분리] Host 측에서 상대방(Guest) 패들의 시각적 요소 분리 처리
        if (this.isHost) {
            // 1. 실제 물리 연산용 패들은 완전 투명하게 가려 뚝뚝 끊겨 보이는 렌더링을 완전히 가림
            this.paddle2.setAlpha(0);

            // 2. 화면에 부드럽게 표현하기 위한 물리 바디 없는 렌더 전용 대역 생성
            this.paddle2Visual = this.add.sprite(this.paddle2.x, this.paddle2.y, this.paddle2.texture.key);
            this.paddle2Visual.setOrigin(this.paddle2.originX, this.paddle2.originY);

            if (this.paddle2.displayWidth && this.paddle2.displayHeight) {
                this.paddle2Visual.setDisplaySize(this.paddle2.displayWidth, this.paddle2.displayHeight);
            }
            if (this.paddle2.tintTopLeft !== undefined) {
                this.paddle2Visual.setTint(this.paddle2.tintTopLeft);
            }
        }

        // Host 로직: 공의 물리 연산(벽 충돌, 패들 충돌, 점수 판정) 활성화 및 직접 계산
        if (this.isHost) {
            this.physics.add.collider(
                this.ball,
                paddles,
                (ballObj) => {
                    const currentBall = ballObj as Ball;
                    currentBall.hitPaddle();
                    this.socket.emit("ballCollision", { type: 'paddle' });
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
                        this.socket.emit("ballCollision", { type: 'wall' });
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

    // Phaser의 내장 매개변수 time과 delta 명시적 수신
    update(time: number, delta: number) {
        if (this.isGameOver || !this.isRoleAssigned) return;

        this.paddle1.update(delta);
        this.paddle2.update(delta);

        // --- [delta time 기반 프레임 독립형 보간 계수 계산] ---
        // 기준점: 60fps(프레임당 16.66ms 흘렀을 때 보간율 0.3)
        // 모니터 주사율이 144Hz나 240Hz로 올라가 delta가 작아져도 일정한 속도로 보간
        const baseFactor = 0.3;
        const dtRatio = delta / 16.666;
        const lerpFactor = 1 - Math.pow(1 - baseFactor, dtRatio);

        // [물리-렌더 분리] Host 측: 실제 물리 패들 위치 추종 (delta 반영)
        if (this.isHost && this.paddle2Visual) {
            if (Math.abs(this.paddle2Visual.y - this.paddle2.y) > 100) {
                this.paddle2Visual.y = this.paddle2.y;
            } else {
                this.paddle2Visual.y = Phaser.Math.Linear(this.paddle2Visual.y, this.paddle2.y, lerpFactor);
            }
        }

        // Guest의 공 렌더링 (delta 반영)
        if (!this.isHost && this.ball) {
            this.ball.x = Phaser.Math.Linear(this.ball.x, this.targetBallX, lerpFactor);
            this.ball.y = Phaser.Math.Linear(this.ball.y, this.targetBallY, lerpFactor);
        }

        if (this.isHost) {
            this.checkScore();
        }

        const now = Date.now();

        // (Host/Guest) 내 패들 이동 좌표를 paddleMove 이벤트로 30Hz마다 서버에 발송
        if (now - this.lastPaddleSentTime > 33) {
            const localPaddle = this.isHost ? this.paddle1 : this.paddle2;
            if (localPaddle) {
                this.socket.emit("paddleMove", { y: localPaddle.y });
                this.lastPaddleSentTime = now;
            }
        }

        // (Only Host) 계산된 공의 현재 좌표를 ballUpdate 이벤트로 30Hz마다 서버에 지속 발송
        if (this.isHost && this.ball && this.isGameStarted) {
            if (now - this.lastBallSentTime > 33) {
                this.socket.emit("ballUpdate", {
                    x: this.ball.x,
                    y: this.ball.y,
                    sfx: this.nextCollisionSFX // 충돌 상태 변수 추가로 얹기
                });
                this.lastBallSentTime = now;
                this.nextCollisionSFX = 'none'; // 전송 완료하였으니 초기화
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
                this.triggerGameOverSequence(scorer);
            } else {
                this.sound.play(ASSETS.SOUND_SCORE, { volume: 0.5 });
                this.ball.resetBall();

                this.sendBallUpdateImmediate('none');
            }
        }
    }

    private triggerGameOverSequence(winner?: PlayerEnum) {
        this.isGameOver = true;
        this.physics.pause();

        this.sound.play(ASSETS.SOUND_WIN, { volume: 0.5 });

        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.stop(SCENES.HUD);
            this.scene.start(SCENES.GAME_OVER, { winner });
        });
    }

    // 충돌 시 주기적 타이머와 별개로 즉시 동기화하기 위한 헬퍼 함수
    private sendBallUpdateImmediate(sfxType: 'none' | 'paddle' | 'wall') {
        if (!this.ball) return;
        this.socket.emit("ballUpdate", {
            x: this.ball.x,
            y: this.ball.y,
            sfx: sfxType
        });
        this.lastBallSentTime = Date.now();
        this.nextCollisionSFX = 'none';
    }
}
