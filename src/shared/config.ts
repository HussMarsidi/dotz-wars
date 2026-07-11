import type { Vec2 } from "./types";

/** World size — larger than a typical viewport; pan/zoom to explore. */
export const BOARD_WIDTH = 2400;
export const BOARD_HEIGHT = 1600;

/** Simulation tick rate (Hz). Render runs separately. */
export const TICK_HZ = 20;
export const TICK_DT = 1 / TICK_HZ;

/** Default dot move speed (world units / second). Pass into each Dot. */
export const DOT_SPEED = 180;

/**
 * Multiplier applied to `dot.speed` while standing on that terrain.
 * Tune here — water is blocked (0), not walked.
 */
export const TERRAIN_SPEED_MULTIPLIER = {
	land: 1,
	forest: 0.7,
	mountain: 0.45,
	water: 0,
} as const;

export type TerrainKind = keyof typeof TERRAIN_SPEED_MULTIPLIER;

/** Dot collision / selection radius. */
export const DOT_RADIUS = 12;

/** Pointer travel below this (world units) counts as a click, not a marquee. */
export const CLICK_DRAG_THRESHOLD = 4;

/** Camera zoom limits / wheel factor. Tune these for feel. */
/** Hard floor — also never zoom out past fitting the whole map in view. */
export const CAMERA_ZOOM_MIN = 0.35;
/** Hard ceiling for zoom-in. */
export const CAMERA_ZOOM_MAX = 2;
export const CAMERA_ZOOM_WHEEL_FACTOR = 1.08;

export const DOT_COLOR = 0x4fc3f7;
export const DOT_SELECTED_COLOR = 0xffeb3b;

export const LAND_COLOR = 0x4a7c3f;
export const FOREST_COLOR = 0x2d5a27;
export const MOUNTAIN_COLOR = 0x8b8680;
export const WATER_COLOR = 0x7ec8e3;

export const MOVE_ARROW_COLOR = 0xffffff;
export const MOVE_ARROW_ALPHA = 0.85;

export const SELECTION_STROKE_COLOR = 0xffffff;
export const SELECTION_FILL_COLOR = 0xffffff;
export const SELECTION_FILL_ALPHA = 0.15;

/** Single starter dot at board center. */
export const INITIAL_DOT_POSITIONS: readonly Vec2[] = [
	{ x: BOARD_WIDTH / 2, y: BOARD_HEIGHT / 2 },
];
