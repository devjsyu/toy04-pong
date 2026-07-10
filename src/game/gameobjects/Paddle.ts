import * as Phaser from 'phaser';
import { PlayerEnum, ASSETS, PADDLE_SPEED } from '../../constants/gameConfig';

export class Paddle extends Phaser.Physics.Arcade.Image {
    private playerEnum: PlayerEnum;
    private isRemote: boolean = false;
    private up?: Phaser.Input.Keyboard.Key;
    private down?: Phaser.Input.Keyboard.Key;
    private upW?: Phaser.Input.Keyboard.Key;
    private downS?: Phaser.Input.Keyboard.Key;
    private targetY: number;

    private visualSprite!: Phaser.GameObjects.Sprite;

    constructor(scene: Phaser.Scene, x: number, y: number, playerEnum: PlayerEnum, isRemote: boolean = false) {
        // 물리 바디 초기화
        super(scene, x, y, ASSETS.PADDLE);
        this.playerEnum = playerEnum;
        this.isRemote = isRemote;
        this.targetY = y;

        this.scene.add.existing(this);
        this.scene.physics.add.existing(this);
        this.setCollideWorldBounds(true);
        this.setImmovable(true);

        // 물리/렌더링 분리
        // 실제 물리 연산용 패들은 완전 투명하게 가려 뚝뚝 끊겨 보이는 렌더링을 완전히 가림
        this.setAlpha(0);

        // 화면에 부드럽게 표현하기 위한 물리 바디 없는 렌더 전용 대역 생성
        this.visualSprite = scene.add.sprite(x, y, ASSETS.PADDLE);
        this.visualSprite.setOrigin(0.5, 0.5);
        this.visualSprite.setDisplaySize(this.displayWidth, this.displayHeight);

        // Local 플레이어 키보드 초기화
        if (!this.isRemote) {
            const keyboard = this.scene.input.keyboard;
            if (keyboard) {
                // local paddle always uses arrow keys and W/S
                this.up = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
                this.down = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
                this.upW = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
                this.downS = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
            }
        }
    }

    // 소켓에서 전달받은 목표 좌표 업데이트
    public setTargetY(y: number): void {
        this.targetY = y;
    }

    update(delta: number = 16.666) {
        this.updatePhysicalBody();
        this.updateVisualBody(delta);
    }

    private updatePhysicalBody(): void {
        if (this.isRemote) {
            // Remote 플레이어: 물리 바디는 서버(또는 상대)가 보낸 위치로 즉시(Snap) 이동시켜 정확한 충돌을 보장
            this.y = this.targetY;
            if (this.body) this.body.updateFromGameObject();
        } else {
            // Local 플레이어: 키보드 입력에 따라 물리 바디 이동
            let isMovingUp = false;
            let isMovingDown = false;

            if (this.up?.isDown) isMovingUp = true;
            if (this.upW?.isDown) isMovingUp = true;
            if (this.down?.isDown) isMovingDown = true;
            if (this.downS?.isDown) isMovingDown = true;

            if (isMovingUp) {
                this.moveUp();
            } else if (isMovingDown) {
                this.moveDown();
            } else {
                this.stopMove();
            }
        }
    }

    private moveUp(): void {
        this.setVelocityY(-PADDLE_SPEED);
    }

    private moveDown(): void {
        this.setVelocityY(PADDLE_SPEED);
    }

    private stopMove(): void {
        this.setVelocityY(0);
    }

    private updateVisualBody(delta: number): void {
        // Smoothly interpolate Y position
        // 기준점: 60fps(프레임당 16.66ms 흘렀을 때 보간율 0.3)
        // 모니터 주사율이 144Hz나 240Hz로 올라가 delta가 작아져도 일정한 속도로 보간
        // delta가 전달되지 않았을 경우를 대비해 기본값 16.666(60fps)을 지정
        const currentDelta = delta !== undefined ? delta : 16.666;

        const baseFactor = 0.3;
        const dtRatio = currentDelta / 16.666;
        const lerpFactor = 1 - Math.pow(1 - baseFactor, dtRatio);

        const distance = Math.abs(this.visualSprite.y - this.y);

        // 상한선: 두 위치의 차이가 너무 크면 (렉 or 순간이동) 즉시 동기화
        if (distance > 100) {
            this.visualSprite.y = this.y;
        }
        // 하한선: 두 위치의 차이가 0.1픽셀 미만으로 극히 작아지면 계산 종료하고 딱 붙이기
        else if (distance < 0.1) {
            this.visualSprite.y = this.y;
        }
        // 그 사이일 때만 부드럽게 보간(Lerp, Linear Interpolation) 적용
        else {
            this.visualSprite.y = Phaser.Math.Linear(this.visualSprite.y, this.y, lerpFactor);
        }
    }

    // 메모리 누수 방지: 객체가 파괴될 때 시각 요소도 같이 파괴
    destroy(fromScene?: boolean) {
        if (this.visualSprite) {
            this.visualSprite.destroy();
        }
        super.destroy(fromScene);
    }
}