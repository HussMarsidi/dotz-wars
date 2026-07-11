import type { City } from "../cities";
import type { Unit } from "../units/unit";
import type { Projectile, TeamId } from "./types";

export type GameState = {
	readonly units: readonly Unit[];
	readonly cities: readonly City[];
	readonly projectiles: readonly Projectile[];
	/** Set when one team owns every city. */
	readonly winner: TeamId | null;
};
