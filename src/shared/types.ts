/** Cross-layer contracts. Keep portable for a future server sim. */

export type DotId = string;

export type TeamId = "blue" | "red";

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

/** Flying ranged attack. Homes toward `targetId` until hit or target dies. */
export type Projectile = {
	readonly id: string;
	readonly teamId: TeamId;
	readonly position: Vec2;
	readonly targetId: DotId;
	readonly damage: number;
	readonly speed: number;
};

/** Plain input payloads produced by the input layer. */
export type Input =
	| { readonly type: "click"; readonly position: Vec2 }
	| { readonly type: "marquee"; readonly rect: Rect }
	| { readonly type: "marqueeEnd"; readonly rect: Rect }
	| { readonly type: "move"; readonly position: Vec2 };
