export { applyTerritoryDrain, buddyDrainMultiplier } from "./drain";
export {
	bfsPathHome,
	BFS_SEED,
	BFS_UNREACHED,
	computeEncirclement,
	computeTeamConnectivity,
	nearestReachedCellCenter,
} from "./encirclement";
export type { EncirclementResult, TeamConnectivity } from "./encirclement";
export {
	computeTerritory,
	emptyTerritory,
	influenceAt,
	isEnemyGround,
	overwhelmAt,
	ownerAt,
	teamInfluenceAt,
} from "./field";
export { cityAsSource, collectSources, unitAsSource } from "./sources";
export type {
	InfluenceSource,
	TerritoryField,
	TerritoryOwner,
} from "./types";
