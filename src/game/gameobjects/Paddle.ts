import * as Phaser from 'phaser';
import { PlayerEnum, ASSETS, PADDLE_SPEED } from '../../constants/gameConfig';

export class Paddle extends Phaser.Physics.Arcade.Image {
    private playerEnum: PlayerEnum;
    // 키가 없을 수도 있으므로 optional (?)로 선언
    private up?: Phaser.Input.Keyboard.Key;
    private down?: Phaser.Input.Keyboard.Key;

    constructor(scene: Phaser.Scene, x: number, y: number, playerEnum: PlayerEnum) {
        super(scene, x, y, ASSETS.PADDLE);

        this.playerEnum = playerEnum;

        this.scene.add.existing(this);
        this.scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        this.setImmovable(true);

        const keyboard = this.scene.input.keyboard;
        if (keyboard) {
            if (this.playerEnum === PlayerEnum.One) {
                this.up = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
                this.down = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
            } else {
                this.up = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
                this.down = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
            }
        }
    }

    update() {
        if (!this.up || !this.down) return;

        if (this.up.isDown) {
            this.moveUp();
        }
        else if (this.down.isDown) {
            this.moveDown();
        }
        else {
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