import * as Phaser from 'phaser';

export class Paddle extends Phaser.Physics.Arcade.Image {
    private paddleSpeed = 800;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'white_square');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        this.setImmovable(true);
    }

    public moveUp(): void {
        this.setVelocityY(-this.paddleSpeed);
    }

    public moveDown(): void {
        this.setVelocityY(this.paddleSpeed);
    }

    public stopMove(): void {
        this.setVelocityY(0);
    }
}