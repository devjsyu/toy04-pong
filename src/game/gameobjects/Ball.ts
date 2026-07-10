import * as Phaser from 'phaser';
import { ASSETS, BALL_SPEED } from '../../constants/gameConfig';

export class Ball extends Phaser.Physics.Arcade.Image {
    private isHost: boolean;
    private targetX: number = 0;
    private targetY: number = 0;

    private visualSprite!: Phaser.GameObjects.Sprite;

    constructor(scene: Phaser.Scene, x: number, y: number, isHost: boolean) {
        super(scene, x, y, ASSETS.BALL);
        this.isHost = isHost;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        if (this.isHost) {
            if (this.body instanceof Phaser.Physics.Arcade.Body) {
                this.body.onWorldBounds = true;
                this.setCollideWorldBounds(true);
                scene.physics.world.setBoundsCollision(false, false, true, true);
                this.setBounce(1, 1);
            }
        } else {
            // Guest 로직: 자체적인 공 물리 연산 완전히 비활성화(Disable)
            this.setAlpha(0);
            if (this.body instanceof Phaser.Physics.Arcade.Body) {
                this.body.enable = false;
            }
            this.visualSprite = this.scene.add.sprite(x, y, ASSETS.BALL);
        }
    }

    public resetBall(): void {
        const centerX = this.scene.scale.width / 2;
        const centerY = this.scene.scale.height / 2;

        this.setPosition(centerX, centerY);
        this.setVelocity(0, 0); // 일단 멈춤
        this.setAlpha(0.5);    // 대기 중임을 알리기 위한 반투명 연출

        // 1초 뒤에 이동 시작
        this.scene.time.delayedCall(1000, () => {
            if (!this.active) return;
            this.setAlpha(1);
            const moveX = Math.random() > 0.5 ? 1 : -1;
            const moveY = Math.random() > 0.5 ? 1 : -1;
            this.setVelocity(BALL_SPEED * moveX, BALL_SPEED * moveY);
        });

        if (!this.isHost && this.visualSprite) {
            this.visualSprite.setPosition(centerX, centerY);
            // Guest의 Lerp 타겟도 중앙으로 리셋
            this.targetX = centerX;
            this.targetY = centerY;
        }

    }

    public setTargetPosition(x: number, y: number): void {
        this.targetX = x;
        this.targetY = y;
    }

    update(delta: number = 16.666) {
        if (this.isHost) {
            // Host는 별도 로직 불필요
            return;
        }

        // Guest는 Host가 준 좌표로 Lerp 수행
        const baseFactor = 0.3;
        const dtRatio = delta / 16.666;
        const lerpFactor = 1 - Math.pow(1 - baseFactor, dtRatio);

        if (this.visualSprite) {
            this.visualSprite.x = Phaser.Math.Linear(this.visualSprite.x, this.targetX, lerpFactor);
            this.visualSprite.y = Phaser.Math.Linear(this.visualSprite.y, this.targetY, lerpFactor);
        }
    }

    public hitPaddle() {
        this.scene.sound.play('ball-bounce', { volume: 0.5 });
    }

    public hitWall() {
        this.scene.sound.play('ball-bounce', { volume: 0.5 });
    }
}