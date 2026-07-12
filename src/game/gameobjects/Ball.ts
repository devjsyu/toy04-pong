import * as Phaser from 'phaser';
import { ASSETS, BALL_SPEED } from '../../constants/gameConfig';

export class Ball extends Phaser.Physics.Arcade.Image {
    private isHost: boolean;
    private targetX: number = 0;
    private targetY: number = 0;

    private visualSprite!: Phaser.GameObjects.Sprite;

    private _isScoreProcessing: boolean = false;
    public get isScoreProcessing(): boolean {
        return this._isScoreProcessing;
    }
    public setScoreProcessing(value: boolean): void {
        this._isScoreProcessing = value;
    }

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
            this.setVisible(false); // 확실하게 렌더링 제외
            if (this.body instanceof Phaser.Physics.Arcade.Body) {
                this.body.enable = false;
            }
            this.visualSprite = this.scene.add.sprite(x, y, ASSETS.BALL);
            this.visualSprite.setOrigin(0.5, 0.5);
            this.visualSprite.setDisplaySize(this.displayWidth, this.displayHeight);
        }
    }

    public resetBall(): void {
        this._isScoreProcessing = true;

        const centerX = this.scene.scale.width / 2;
        const centerY = this.scene.scale.height / 2;

        if (this.body instanceof Phaser.Physics.Arcade.Body) {
            this.body.reset(centerX, centerY);
        }

        if (this.isHost) {
            this.setAlpha(0.5);
        } else if (this.visualSprite) {
            this.visualSprite.setAlpha(0.5);
            this.visualSprite.setPosition(centerX, centerY);
            this.targetX = centerX;
            this.targetY = centerY;
        }
        // 1초 뒤에 이동 시작
        this.scene.time.delayedCall(1000, () => {
            this._isScoreProcessing = false;
            if (!this.active) return;
            if (this.isHost) {
                this.setAlpha(1);
                const moveX = Math.random() > 0.5 ? 1 : -1;
                const moveY = Math.random() > 0.5 ? 1 : -1;
                this.setVelocity(BALL_SPEED * moveX, BALL_SPEED * moveY);
            } else if (this.visualSprite) {
                this.visualSprite.setAlpha(1);
            }
        });
    }

    public setTargetPosition(x: number, y: number): void {
        this.targetX = x;
        this.targetY = y;
    }

    update(delta: number = 16.666) {
        if (this.isHost || this.isScoreProcessing) {
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