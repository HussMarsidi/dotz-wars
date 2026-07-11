import { STARTING_GOLD } from "../shared/config";
import type { TeamId } from "../shared/types";

/** Per-team gold balances. Income generation is out of scope. */
export type TeamGold = {
	readonly blue: number;
	readonly red: number;
};

export function createInitialGold(): TeamGold {
	return { blue: STARTING_GOLD, red: STARTING_GOLD };
}

export function goldOf(gold: TeamGold, teamId: TeamId): number {
	return gold[teamId];
}

export function canAfford(
	gold: TeamGold,
	teamId: TeamId,
	cost: number,
): boolean {
	return gold[teamId] >= cost;
}

/**
 * Deduct `cost` from `teamId`. Returns null if unaffordable.
 */
export function spend(
	gold: TeamGold,
	teamId: TeamId,
	cost: number,
): TeamGold | null {
	if (!canAfford(gold, teamId, cost)) {
		return null;
	}
	return { ...gold, [teamId]: gold[teamId] - cost };
}

/** Add gold back to a team (cancel / refund). */
export function refund(
	gold: TeamGold,
	teamId: TeamId,
	amount: number,
): TeamGold {
	if (amount <= 0) {
		return gold;
	}
	return { ...gold, [teamId]: gold[teamId] + amount };
}

/**
 * Partial refund for an in-progress order.
 * `progress` is 0..1 (0 = just started → full refund, 1 = done → none).
 */
export function partialRefundAmount(cost: number, progress: number): number {
	const clamped = Math.min(1, Math.max(0, progress));
	return Math.floor(cost * (1 - clamped));
}
