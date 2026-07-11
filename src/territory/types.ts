import type { TeamId, Vec2 } from "../shared/types";

/** Anything that projects influence (cities, units). */
export type InfluenceSource = {
	readonly teamId: TeamId;
	readonly position: Vec2;
	readonly strength: number;
	/** Distance where influence reaches zero. */
	readonly radius: number;
};

export type TerritoryOwner = TeamId | "neutral";

export type TerritoryField = {
	readonly cellSize: number;
	readonly cols: number;
	readonly rows: number;
	readonly width: number;
	readonly height: number;
	/** Row-major ownership per cell. */
	readonly owners: readonly TerritoryOwner[];
};
