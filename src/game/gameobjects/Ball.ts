import * as Phaser from 'phaser';

export class Ball extends Phaser.Physics.Arcade.Image {
    private ballSpeed: number = 300;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'white_circle');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        this.setBounce(1, 1);

        this.resetBall();
    }

    public resetBall(): void {
        this.setPosition(this.scene.scale.width / 2, this.scene.scale.height / 2);

        const moveX = Math.random() > 0.5 ? 1 : -1;
        const moveY = Math.random() > 0.5 ? 1 : -1;

        this.setVelocity(this.ballSpeed * moveX, this.ballSpeed * moveY);
    }

    public hitPaddle() {
        // Increase the ball speed slightly on each bounce
        if (this.body) {
            this.setVelocityX(this.body.velocity.x * 1.1);
            this.setVelocityY(this.body.velocity.y * 1.1);
        }
    }
}