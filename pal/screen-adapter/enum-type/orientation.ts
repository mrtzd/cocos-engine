const _PORTRAIT = 1;
const _PORTRAIT_UPSIDE_DOWN = _PORTRAIT << 1;
const _LEFT = _PORTRAIT << 2;
const _RIGHT = _PORTRAIT << 3;
const _LANDSCAPE = _LEFT | _RIGHT;
const _AUTO = _PORTRAIT | _LANDSCAPE;

export enum Orientation {
    PORTRAIT = _PORTRAIT,
    PORTRAIT_UPSIDE_DOWN = _PORTRAIT_UPSIDE_DOWN,
    LANDSCAPE_LEFT = _LEFT,
    LANDSCAPE_RIGHT = _RIGHT,
    LANDSCAPE = _LANDSCAPE,
    AUTO = _AUTO,
}