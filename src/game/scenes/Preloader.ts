import { Scene } from 'phaser';
import { ASSETS, SCENES } from '../../constants/gameConfig';

export class Preloader extends Scene {
    constructor() {
        super(SCENES.PRELOADER);
    }

    init() {
        this.add.image(this.scale.width / 2, this.scale.height / 2, 'logo');
    }

    preload() {
        //  Load the assets for the game - Replace with your own assets
        this.load.setPath('assets');

        this.load.font(
            'PressStart2P',
            'fonts/PressStart2P-Regular.ttf',
            'truetype'
        );

        this.load.font(
            'Mona12-Bold',
            'fonts/Mona12-Bold.ttf',
            'truetype'
        );


        // 사각형 텍스처 생성 (20x100)
        this.generateBaseTexture(ASSETS.PADDLE, 20, 160, (g) => {
            g.fillRect(0, 0, 20, 80);
        });

        // 원형 텍스처 생성 (지름 20px이므로 가로세로 20, 반지름은 10)
        this.generateBaseTexture(ASSETS.BALL, 20, 20, (g) => {
            // 원은 중심점을 기준으로 그려지므로 가로세로 20 크기 상자 안에 쏙 들어가려면 (10, 10) 위치에 반지름 10으로 그립니다.
            g.fillCircle(10, 10, 10);
        });

        this.load.audio('win', 'sounds/win.wav');
        this.load.audio('ball-bounce', 'sounds/ball-bounce.wav');
        this.load.audio('change-score', 'sounds/change-score.mp3');
    }

    create() {
        this.time.addEvent({
            delay: 1000,
            callback: () => {
                const main_camera = this.cameras.main.fadeOut(500, 0, 0, 0);
                // Fadeout complete
                main_camera.once("camerafadeoutcomplete", () => {
                    this.scene.start(SCENES.MAIN_MENU);
                });
            }
        });
    }

    /**
     * @param key 생성할 텍스처의 고유 이름 (ID)
     * @param width 텍스처 캔버스의 가로 크기
     * @param height 텍스처 캔버스의 세로 크기
     * @param drawCallback 구체적으로 어떤 모양을 그릴지 지시하는 콜백 함수
     */
    private generateBaseTexture(
        key: string,
        width: number,
        height: number,
        drawCallback: (g: Phaser.GameObjects.Graphics) => void
    ): void {
        // 중복 생성을 방지하는 체크 로직 통합
        if (!this.textures.exists(key)) {
            const graphics = this.make.graphics({ x: 0, y: 0 });
            graphics.setVisible(false);

            // 기본 스타일 설정 채우기 (모든 단색 도형의 공통점)
            graphics.fillStyle(0xffffff, 1);

            // 매개변수로 전달받은 구체적인 그리기 함수를 실행합니다.
            drawCallback(graphics);

            // 텍스처 생성 및 메모리 정리 통합
            graphics.generateTexture(key, width, height);
            graphics.destroy();
        }
    }
}
