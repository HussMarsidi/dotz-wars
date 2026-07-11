import type { City } from "../cities";
import type { TeamGold } from "../money";
import type { TerritoryField } from "../territory";
import type { Unit } from "../units/unit";
import type { Projectile, TeamId } from "./types";

export type GameState = {
	readonly units: readonly Unit[];
	readonly cities: readonly City[];
	readonly territory: TerritoryField;
	readonly projectiles: readonly Projectile[];
	/** Per-team gold balances. */
	readonly gold: TeamGold;
	/** Set when one team owns every city. */
	readonly winner: TeamId | null;
};
