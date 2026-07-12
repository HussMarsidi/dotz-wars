import type { City } from "../cities";
import type { TeamGold } from "../money";
import type { TerritoryField } from "../territory";
import type { Unit } from "../units/unit";
import type { Projectile, TeamId } from "./types";

/** Seconds remaining before a team may train a replacement diplomat. */
export type DiplomatLockout = {
	readonly blue: number;
	readonly red: number;
};

export type GameState = {
	readonly units: readonly Unit[];
	readonly cities: readonly City[];
	readonly territory: TerritoryField;
	readonly projectiles: readonly Projectile[];
	/** Per-team gold balances. */
	readonly gold: TeamGold;
	/** Seconds remaining before a team may train a replacement diplomat. */
	readonly diplomatLockout: DiplomatLockout;
	/** Set when one team owns every city. */
	readonly winner: TeamId | null;
};

export function createInitialDiplomatLockout(): DiplomatLockout {
	return { blue: 0, red: 0 };
}
