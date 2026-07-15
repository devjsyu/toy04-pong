import { Scene } from 'phaser';
import { SCENES } from '../../constants/gameConfig';
import { io, Socket } from 'socket.io-client';

interface MatchedData {
    role: string;
    hostNickname: string;
    guestNickname: string;
}

export class Lobby extends Scene {
    private socket!: Socket;
    private isHost: boolean = false;
    private hostNickname?: string;
    private guestNickname?: string;
    private transitionedToGame: boolean = false;
    private waitingText!: Phaser.GameObjects.Text;

    constructor() {
        super(SCENES.LOBBY);
    }

    init(data?: { ticket?: string }) {
        let ticket = data?.ticket;
        if (!ticket) {
            const urlParams = new URLSearchParams(window.location.search);
            ticket = urlParams.get('ticket') || '';
        }

        console.log(`[Lobby Init] Ticket: ${ticket}`);
        this.transitionedToGame = false;

        // 변경: 새로 구축한 라즈베리 파이 서버 주소
        this.socket = io(import.meta.env.VITE_SOCKET_SERVER_URL, {
            transports: ["polling", "websocket"],
            auth: {
                token: ticket
            }
        });
    }

    create() {
        console.log('[Lobby Create] Socket Instance', this.socket);

        this.cameras.main.fadeIn(500, 0, 0, 0);
        this.cameras.main.setBackgroundColor(0x000000);

        // 대기 텍스트 렌더링
        this.waitingText = this.add.text(this.scale.width / 2, this.scale.height / 2, '연결 중...', {
            fontFamily: 'Mona12-Bold',
            fontSize: 24,
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        // 웹소켓 연결 및 트랜스포트(통신 방식) 업그레이드 디버깅 로그
        this.socket.on("connect", () => {
            const transport = this.socket.io.engine.transport.name;
            console.log(`[Socket Connect] 연결 성공! 현재 통신 방식: ${transport}`);

            this.socket.io.engine.on("upgrade", () => {
                const upgradedTransport = this.socket.io.engine.transport.name;
                console.log(`[Socket Upgrade] 통신 방식 업그레이드 완료: ${upgradedTransport}`);
            });
        });

        // 소켓 연결이 끊겼을 때의 원인 분석 로그
        this.socket.on("disconnect", (reason) => {
            console.warn(`[Socket Disconnect] 연결이 끊겼습니다. 원인: ${reason}`);
        });


        // 1. waiting: "상대방을 기다리는 중..." 텍스트 렌더링
        this.socket.on('waiting', () => {
            console.log('[Lobby] Waiting for opponent...');
            if (this.waitingText && this.waitingText.active) {
                this.waitingText.setText('상대방을 기다리는 중...');
            }
        });

        // 2. matched: 서버가 보내준 role (host 또는 guest) 데이터를 변수에 저장
        this.socket.on('matched', (data: MatchedData) => {
            console.log('[Lobby] Matched!', data);
            const { role, hostNickname, guestNickname } = data;
            this.isHost = (role === 'host');
            this.hostNickname = hostNickname;
            this.guestNickname = guestNickname;

            const message = this.isHost
                ? `${hostNickname} vs ${guestNickname}`
                : `${guestNickname} vs ${hostNickname}`;

            if (this.waitingText && this.waitingText.active) {
                this.waitingText.setText(`${message}\n매칭 완료! 곧 시작합니다...`);
            }
        });

        // 3. gameStart: 대기 텍스트를 숨기고 본격적인 게임 시작
        this.socket.on('gameStart', () => {
            console.log('[Lobby] Game Starting!');
            this.transitionedToGame = true;

            // 대기용 리스너 정리
            this.socket.off('waiting');
            this.socket.off('matched');
            this.socket.off('gameStart');
            this.socket.off('opponentLeft');

            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start(SCENES.GAME, {
                    socket: this.socket,
                    role: this.isHost ? 'host' : 'guest',
                    hostNickname: this.hostNickname,
                    guestNickname: this.guestNickname
                });
            });
        });

        // 대기 중 상대방이 연결을 끊었을 때
        this.socket.on('opponentLeft', () => {
            console.log('[Lobby] Opponent Left during waiting.');
            alert('상대방이 게임에서 퇴장했습니다.');
            if (this.waitingText && this.waitingText.active) {
                this.waitingText.setText('상대방을 기다리는 중...');
            }
        });

        this.socket.on('connect_error', (err) => {
            console.error('[Lobby] Connection Error:', err.message);
            alert('게임 서버 인증에 실패했습니다.');
            if (this.waitingText && this.waitingText.active) {
                this.waitingText.setText('인증 실패');
            }
        });

        // 씬 종료 시 리소스 정리
        this.events.once('shutdown', () => {
            // Game 씬으로 전환된 게 아니라면 소켓 연결을 명시적으로 끊음
            if (!this.transitionedToGame && this.socket) {
                this.socket.disconnect();
            }
        });
    }
}
