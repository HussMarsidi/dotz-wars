/** Cross-layer contracts. Keep portable for a future server sim. */

export type DotId = string;

export type Vec2 = {
	readonly x: number;
	readonly y: number;
};

/** Axis-aligned rectangle. Width/height may be negative (drag direction). */
export type Rect = {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
};

export type Dot = {
	readonly id: DotId;
	/** World-space center. */
	readonly position: Vec2;
	readonly selected: boolean;
};

export type GameState = {
	readonly dots: readonly Dot[];
};

/** Plain input payloads produced by the input layer. */
export type Input =
	| { readonly type: "marquee"; readonly rect: Rect }
	| { readonly type: "marqueeEnd"; readonly rect: Rect };
