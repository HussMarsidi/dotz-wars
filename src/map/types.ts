import type { TerrainKind } from "../shared/config";
import type { Vec2 } from "../shared/types";

export type { TerrainKind };

/** Procedural ellipse overlay on the base land. */
export type TerrainRegion = {
	readonly terrain: Exclude<TerrainKind, "land">;
	readonly shape: "ellipse";
	readonly center: Vec2;
	readonly radiusX: number;
	readonly radiusY: number;
};

/** Pure map data — no Pixi. More maps can live beside this later. */
export type MapDefinition = {
	readonly id: string;
	readonly width: number;
	readonly height: number;
	readonly regions: readonly TerrainRegion[];
};
