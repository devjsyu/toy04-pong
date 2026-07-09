import * as Phaser from 'phaser';

export class Ball extends Phaser.Physics.Arcade.Image {
    private ballSpeed: number = 200;

    constructor(scene: Phaser.Scene, x: number, y: number, startFrozen: boolean = false) {
        super(scene, x, y, 'white_circle');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        scene.physics.world.setBoundsCollision(false, false, true, true);
        this.setBounce(1, 1);

        if (!startFrozen) {
            this.resetBall();
        } else {
            this.setPosition(x, y);
            this.setVelocity(0, 0);
            this.setAlpha(0.5);
        }

        if (this.body instanceof Phaser.Physics.Arcade.Body) {
            this.body.onWorldBounds = true;
        }
    }

    public resetBall(): void {
        // 위치는 즉시 초기화
        this.setPosition(this.scene.scale.width / 2, this.scene.scale.height / 2);
        this.setVelocity(0, 0); // 일단 멈춤
        this.setAlpha(0.5);    // 대기 중임을 알리기 위한 반투명 연출 (선택 사항)

        // 1초 뒤에 이동 시작 (선택 사항: 연출을 위해)
        this.scene.time.delayedCall(1000, () => {
            if (!this.active) return;
            this.setAlpha(1);
            const moveX = Math.random() > 0.5 ? 1 : -1;
            const moveY = Math.random() > 0.5 ? 1 : -1;
            this.setVelocity(this.ballSpeed * moveX, this.ballSpeed * moveY);
        });
    }

    public hitPaddle() {
        this.scene.sound.play('ball-bounce', { volume: 0.5 });
    }

    public hitWall() {
        this.scene.sound.play('ball-bounce', { volume: 0.5 });
    }
}