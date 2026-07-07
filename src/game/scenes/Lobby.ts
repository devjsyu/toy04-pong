import { Scene } from 'phaser';
import { SCENES } from '../../constants/gameConfig';
import { io, Socket } from 'socket.io-client';

export class Lobby extends Scene {
    private socket!: Socket;
    private isHost: boolean = false;
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

        // Node.js 웹소켓 서버(wss://api-gallery.devjsyu.site)에 연결 (withCredentials: true)
        // this.socket = io('wss://api-gallery.devjsyu.site', {
        //     transports: ["websocket"],
        //     auth: {
        //         token: ticket
        //     },
        //     withCredentials: true
        // });
        // 변경: 새로 구축한 라즈베리 파이 서버 주소
        this.socket = io('wss://devjsyu.duckdns.org', {
            transports: ["websocket"], // 레이턴시가 중요한 게임이므로 HTTP 폴링 대신 웹소켓 강제 적용 권장
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

        // 1. waiting: "상대방을 기다리는 중..." 텍스트 렌더링
        this.socket.on('waiting', () => {
            console.log('[Lobby] Waiting for opponent...');
            if (this.waitingText && this.waitingText.active) {
                this.waitingText.setText('상대방을 기다리는 중...');
            }
        });

        // 2. matched: 서버가 보내준 role (host 또는 guest) 데이터를 변수에 저장
        this.socket.on('matched', (data: { role: string } | string) => {
            console.log('[Lobby] Matched!', data);
            const role = typeof data === 'string' ? data : data.role;
            this.isHost = (role === 'host');
            if (this.waitingText && this.waitingText.active) {
                this.waitingText.setText('매칭 완료! 곧 시작합니다...');
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
                    role: this.isHost ? 'host' : 'guest'
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
