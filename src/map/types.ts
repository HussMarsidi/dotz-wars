import type { Vec2 } from "../shared/types";

/** Axis-aligned ellipse water body (blocked terrain). */
export type WaterEllipse = {
	readonly kind: "ellipse";
	readonly center: Vec2;
	readonly radiusX: number;
	readonly radiusY: number;
};

export type WaterBody = WaterEllipse;

/** Pure map data — no Pixi. More maps can live beside this later. */
export type MapDefinition = {
	readonly id: string;
	readonly width: number;
	readonly height: number;
	readonly water: readonly WaterBody[];
};
