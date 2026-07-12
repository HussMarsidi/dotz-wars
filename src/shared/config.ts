import type { TeamId, Vec2 } from "./types";

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

/** Extra clearance from water when snapping start/goal onto land. */
export const PATH_LAND_SNAP_BUFFER = 6;

/** Max search radius (world units) when snapping a point onto land. */
export const PATH_LAND_SNAP_MAX = 64;

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

/**
 * Auto-chase / support radius = attackRange * this.
 * Enemies inside aggro interrupt orders and pull units into the fight.
 */
export const AGGRO_RANGE_MULTIPLIER = 2;

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
/** Gap between HP bar and morale bar (world px). */
export const MORALE_BAR_GAP = 1;
export const MORALE_BAR_COLOR = 0x4fc3f7;
export const MORALE_BAR_LOW = 0x0288d1;

/**
 * Hit split after defense (🔢 TBD).
 * Melee: softer HP so fights last; light morale chip.
 * Ranged: most of the hit goes to morale — arrows break will, not bodies.
 */
export const MELEE_HP_DAMAGE_MULT = 0.55;
export const MELEE_MORALE_DAMAGE_MULT = 0.35;
export const RANGED_HP_DAMAGE_MULT = 0.2;
export const RANGED_MORALE_DAMAGE_MULT = 1.25;

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

/** Blue team spawn column (world x) and vertical spacing for the test lineup. */
export const BLUE_SPAWN_X = 420;
export const RED_SPAWN_X = 1980;
export const SPAWN_Y_START = 400;
export const SPAWN_Y_GAP = 100;

/** Per-shape slot spacing (world units). Compact so stacked influence grows. */
export const FORMATION_SPACING_BY_SHAPE = {
	line: 25,
	wedge: 25,
	column: 25,
	box: 25,
} as const;
/** @deprecated Prefer FORMATION_SPACING_BY_SHAPE / spacingForShape. */
export const FORMATION_SPACING = FORMATION_SPACING_BY_SHAPE.line;
export const FORMATION_PREVIEW_COLOR = 0xfff59d;
export const FORMATION_PREVIEW_ALPHA = 0.85;
export const FORMATION_FACING_COLOR = 0xffffff;
export const FORMATION_BADGE_COLOR = 0x80cbc4;

/** Local human player — buys/selects cities for this team only. */
export const LOCAL_TEAM: TeamId = "blue";

/** Starting gold per team. Income generation is out of scope for now. */
export const STARTING_GOLD = 1000;

/** Max concurrent production orders per city. */
export const CITY_PRODUCTION_QUEUE_CAP = 8;

/** Gold cost per unit kind (tunable). */
export const UNIT_COST = {
	scout: 50,
	grunt: 75,
	archer: 100,
	diplomat: 150,
	tank: 200,
} as const;

/** Train duration in seconds per unit kind (tunable). */
export const UNIT_TRAIN_TIME = {
	scout: 2,
	grunt: 3,
	archer: 4,
	diplomat: 20,
	tank: 8,
} as const;

/** Max living + queued diplomats per team. */
export const DIPLOMAT_CAP = 2;
/** Seconds before a team may train another diplomat after one dies. */
export const DIPLOMAT_REPLACEMENT_LOCKOUT = 300;

/**
 * Morale (🔢 TBD — playtest).
 * Combat drain = incoming hits only (`receiveHit` HP/morale split).
 * Encircled units also idle-drain via `MORALE_DRAIN_PER_SEC`.
 * At 0 the unit enters Routing; exits when morale recovers past the exit threshold.
 */
export const UNIT_MAX_MORALE = 100;
/** Idle morale drain per second while encircled (own ground cut off from cities). */
export const MORALE_DRAIN_PER_SEC = 25;
export const MORALE_REGEN_PER_SEC = 15;
/** Must regen to this before Routing ends (🔢 TBD — >0 alone exits too fast while fleeing). */
export const MORALE_ROUTING_EXIT = 40;
/** Extra incoming damage multiplier while encircled and fighting. */
export const ENCIRCLED_INCOMING_DAMAGE_MULT = 1.35;

/** City body square side length (world units). */
export const CITY_SIZE = 48;
/** Half-extent of the always-visible capture box around a city. */
export const CITY_CAPTURE_HALF = 100;
/** Seconds an enemy must hold an undefended city to flip ownership. */
export const CITY_CAPTURE_DURATION = 1.5;
export const CITY_ZONE_STROKE_COLOR = 0xffffff;
export const CITY_ZONE_STROKE_ALPHA = 0.4;
export const CITY_ZONE_STROKE_WIDTH = 2;
export const CITY_CAPTURE_PROGRESS_COLOR = 0xffeb3b;
export const CITY_CAPTURE_PROGRESS_WIDTH = 3;
export const CITY_LABEL_COLOR = 0xffffff;

/**
 * Territory influence knobs.
 * Ownership at a point = whoever has more projected influence; near-ties are neutral.
 */
export const TERRITORY_CELL = 16;
/** Same strength for all cities in Phase 2 — per-city sizes come later. */
export const CITY_INFLUENCE_STRENGTH = 100;
export const CITY_INFLUENCE_RADIUS = 320;
/** Local aura — stacks when units cluster, so formations push the fringe deeper. */
export const UNIT_INFLUENCE_STRENGTH = 20;
export const UNIT_INFLUENCE_RADIUS = 72;
/** |blue - red| below this → neutral (no HP drain). */
export const TERRITORY_NEUTRAL_EPSILON = 1;
export const TERRITORY_TINT_ALPHA = 0.2;
export const TERRITORY_BORDER_COLOR = 0xffffff;
export const TERRITORY_BORDER_ALPHA = 0.75;
export const TERRITORY_BORDER_WIDTH = 2;
/**
 * Max HP lost per second when fully overwhelmed on enemy ground.
 * Actual drain = this * overwhelm * buddyMult * dt, where overwhelm =
 * (enemy - own) / enemy (0 at the seam, → 1 deep where own influence is tiny)
 * and buddyMult shrinks when living teammates stand nearby.
 */
export const TERRITORY_DRAIN_HP_PER_SEC = 22;
/** Teammates within this range slow territory drain for the unit. */
export const TERRITORY_DRAIN_BUDDY_RADIUS = 64;
/** Drain multiplier reduction per nearby living teammate (before cap). */
export const TERRITORY_DRAIN_BUDDY_REDUCTION_PER = 0.12;
/** Max total reduction from buddies (0.75 → drain can drop to 25%). */
export const TERRITORY_DRAIN_BUDDY_REDUCTION_MAX = 0.75;

/** @deprecated Prefer TEAM_COLORS + selection ring. Kept only if something still imports it. */
export const DOT_COLOR = TEAM_COLORS.blue;
export const DOT_SELECTED_COLOR = 0xffeb3b;

/** Legacy single-dot spawn — unused; see createInitialUnits. */
export const INITIAL_DOT_POSITIONS: readonly Vec2[] = [
	{ x: BOARD_WIDTH / 2, y: BOARD_HEIGHT / 2 },
];
