import type { Vec2 } from "./types";

/** World size — larger than a typical viewport; pan/zoom to explore. */
export const BOARD_WIDTH = 2400;
export const BOARD_HEIGHT = 1600;

/** Simulation tick rate (Hz). Render runs separately. */
export const TICK_HZ = 20;
export const TICK_DT = 1 / TICK_HZ;

/** Default move speed fallback (world units / second). Prefer per-unit `speed`. */
export const DOT_SPEED = 180;

/**
 * Multiplier applied to `unit.speed` while standing on that terrain.
 * Tune here — water is blocked (0), not walked.
 */
export const TERRAIN_SPEED_MULTIPLIER = {
	land: 1,
	forest: 0.7,
	mountain: 0.45,
	water: 0,
} as const;

export type TerrainKind = keyof typeof TERRAIN_SPEED_MULTIPLIER;

/** Unit collision / selection radius. */
export const DOT_RADIUS = 12;

/** How close a projectile must get to apply damage (world units). */
export const PROJECTILE_HIT_RADIUS = 10;

/** Pointer travel below this (world units) counts as a click, not a marquee. */
export const CLICK_DRAG_THRESHOLD = 4;

/** Pathfinding grid cell size (world units). Smaller = tighter paths, more CPU. */
export const PATH_GRID_CELL = 24;

/** How close a unit must get to a waypoint before advancing (world units). */
export const PATH_WAYPOINT_REACH = 10;

/** Camera zoom limits / wheel factor. Tune these for feel. */
/** Hard floor — also never zoom out past fitting the whole map in view. */
export const CAMERA_ZOOM_MIN = 0.35;
/** Hard ceiling for zoom-in. */
export const CAMERA_ZOOM_MAX = 2;
export const CAMERA_ZOOM_WHEEL_FACTOR = 1.08;

/** Team fill colors. */
export const TEAM_COLORS = {
	blue: 0x4fc3f7,
	red: 0xef5350,
} as const;

/** White ring drawn around selected units (keeps team color readable). */
export const SELECTION_RING_COLOR = 0xffffff;
export const SELECTION_RING_WIDTH = 2;

export const PROJECTILE_COLOR = 0xfff59d;
export const PROJECTILE_RADIUS = 4;

/** Brief melee lunge / slash window (seconds). */
export const ATTACK_ANIM_DURATION = 0.22;
/** How far a melee unit lunges toward the target (world units). */
export const MELEE_LUNGE_DISTANCE = 10;
/** White flash on a unit that just took a hit (seconds). */
export const HIT_FLASH_DURATION = 0.15;

export const HP_BAR_WIDTH = 24;
export const HP_BAR_HEIGHT = 3;
export const HP_BAR_OFFSET_Y = -18;
export const HP_BAR_BG = 0x1a1a1a;
export const HP_BAR_HIGH = 0x66bb6a;
export const HP_BAR_MID = 0xffca28;
export const HP_BAR_LOW = 0xef5350;

export const UNIT_LABEL_COLOR = 0xffffff;
export const MELEE_SLASH_COLOR = 0xffffff;

export const LAND_COLOR = 0x4a7c3f;
export const FOREST_COLOR = 0x2d5a27;
export const MOUNTAIN_COLOR = 0x8b8680;
export const WATER_COLOR = 0x7ec8e3;

export const MOVE_ARROW_COLOR = 0xffffff;
export const MOVE_ARROW_ALPHA = 0.85;
/** Attack-order arrow (click enemy while selected). */
export const ATTACK_ARROW_COLOR = 0xef5350;
/** How long the attack arrow blinks after the order (seconds). */
export const ATTACK_ARROW_BLINK_DURATION = 2.5;
export const ATTACK_ARROW_BLINK_HZ = 4;

export const SELECTION_STROKE_COLOR = 0xffffff;
export const SELECTION_FILL_COLOR = 0xffffff;
export const SELECTION_FILL_ALPHA = 0.15;

/** Blue team spawn column (world x) and vertical spacing for the 5-unit lineup. */
export const BLUE_SPAWN_X = 420;
export const RED_SPAWN_X = 1980;
export const SPAWN_Y_START = 560;
export const SPAWN_Y_GAP = 120;

/** @deprecated Prefer TEAM_COLORS + selection ring. Kept only if something still imports it. */
export const DOT_COLOR = TEAM_COLORS.blue;
export const DOT_SELECTED_COLOR = 0xffeb3b;

/** Legacy single-dot spawn — unused; see createInitialUnits. */
export const INITIAL_DOT_POSITIONS: readonly Vec2[] = [
	{ x: BOARD_WIDTH / 2, y: BOARD_HEIGHT / 2 },
];
