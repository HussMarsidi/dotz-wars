import { DIPLOMAT_REPLACEMENT_LOCKOUT } from "../shared/config";
import type { DiplomatLockout } from "../shared/game-state";
import type { TeamId } from "../shared/types";
import type { Unit } from "../units";

/**
 * Count down lockouts and start a fresh lockout when a diplomat dies.
 */
export function tickDiplomatLockout(
	previousUnits: readonly Unit[],
	nextUnits: readonly Unit[],
	lockout: DiplomatLockout,
	dt: number,
): DiplomatLockout {
	let blue = Math.max(0, lockout.blue - dt);
	let red = Math.max(0, lockout.red - dt);

	const livingIds = new Set(
		nextUnits
			.filter((unit) => unit.isAlive && unit.kind === "diplomat")
			.map((unit) => unit.id),
	);

	for (const unit of previousUnits) {
		if (unit.kind !== "diplomat" || !unit.isAlive) {
			continue;
		}
		if (livingIds.has(unit.id)) {
			continue;
		}
		if (unit.teamId === "blue") {
			blue = DIPLOMAT_REPLACEMENT_LOCKOUT;
		} else {
			red = DIPLOMAT_REPLACEMENT_LOCKOUT;
		}
	}

	if (blue === lockout.blue && red === lockout.red) {
		return lockout;
	}
	return { blue, red };
}

export function diplomatLockoutRemaining(
	lockout: DiplomatLockout,
	teamId: TeamId,
): number {
	switch (teamId) {
		case "blue":
			return lockout.blue;
		case "red":
			return lockout.red;
		default: {
			const _exhaustive: never = teamId;
			return _exhaustive;
		}
	}
}
