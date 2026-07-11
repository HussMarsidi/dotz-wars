import type { Vec2 } from "./types";

/** Board size in world units (matches canvas for Phase 1). */
export const BOARD_WIDTH = 800;
export const BOARD_HEIGHT = 600;

/** Simulation tick rate (Hz). Render runs separately. */
export const TICK_HZ = 20;
export const TICK_DT = 1 / TICK_HZ;

/** Default dot move speed (world units / second). Pass into each Dot. */
export const DOT_SPEED = 180;

/** Dot collision / selection radius. */
export const DOT_RADIUS = 12;

/** Pointer travel below this (world units) counts as a click, not a marquee. */
export const CLICK_DRAG_THRESHOLD = 4;

export const DOT_COLOR = 0x4fc3f7;
export const DOT_SELECTED_COLOR = 0xffeb3b;

export const LAND_COLOR = 0x4a7c3f;
export const WATER_COLOR = 0x7ec8e3;

export const MOVE_ARROW_COLOR = 0xffffff;
export const MOVE_ARROW_ALPHA = 0.85;

export const SELECTION_STROKE_COLOR = 0xffffff;
export const SELECTION_FILL_COLOR = 0xffffff;
export const SELECTION_FILL_ALPHA = 0.15;

/** Single starter dot at board center — later: selectable + movable. */
export const INITIAL_DOT_POSITIONS: readonly Vec2[] = [
	{ x: BOARD_WIDTH / 2, y: BOARD_HEIGHT / 2 },
];
