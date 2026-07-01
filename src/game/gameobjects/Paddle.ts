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

    constructor(scene: Phaser.Scene, x: number, y: number, playerEnum: PlayerEnum, isRemote: boolean = false) {
        super(scene, x, y, ASSETS.PADDLE);

        this.playerEnum = playerEnum;
        this.isRemote = isRemote;
        this.targetY = y;

        this.scene.add.existing(this);
        this.scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        this.setImmovable(true);

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

    public setTargetY(y: number): void {
        this.targetY = y;
    }

    update(delta?: number) {
        if (this.isRemote) {
            // Smoothly interpolate Y position
            // delta가 전달되지 않았을 경우를 대비해 기본값 16.666(60fps)을 지정합니다.
            const currentDelta = delta !== undefined ? delta : 16.666;

            const baseFactor = 0.3;
            const dtRatio = currentDelta / 16.666;
            const lerpFactor = 1 - Math.pow(1 - baseFactor, dtRatio);
            
            this.y = Phaser.Math.Linear(this.y, this.targetY, lerpFactor);
            return;
        }

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

    private moveUp(): void {
        this.setVelocityY(-PADDLE_SPEED);
    }

    private moveDown(): void {
        this.setVelocityY(PADDLE_SPEED);
    }

    private stopMove(): void {
        this.setVelocityY(0);
    }
}