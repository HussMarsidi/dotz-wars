import type { Unit } from "../units/unit";
import type { Projectile, TeamId } from "./types";

export type GameState = {
	readonly units: readonly Unit[];
	readonly projectiles: readonly Projectile[];
	/** Set when one team is wiped. */
	readonly winner: TeamId | null;
};
