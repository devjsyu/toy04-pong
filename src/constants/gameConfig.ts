export enum PlayerEnum {
    One = 'Player 1',
    Two = 'Player 2'
}

export const WINNING_SCORE = 3;

export const ASSETS = {
    PADDLE: 'white_square',
    BALL: 'white_circle',
    SOUND_WIN: 'win',
    SOUND_BOUNCE: 'ball-bounce',
    SOUND_SCORE: 'change-score',
    FONT: 'PressStart2P'
} as const;

export const SCENES = {
    BOOT: 'Boot',
    PRELOADER: 'Preloader',
    MAIN_MENU: 'MainMenu',
    GAME: 'Game',
    HUD: 'Hud',
    GAME_OVER: 'GameOver'
} as const;

export const EVENTS = {
    SCORE_UPDATED: 'SCORE_UPDATED'
} as const;

export const PADDLE_SPEED = 800;