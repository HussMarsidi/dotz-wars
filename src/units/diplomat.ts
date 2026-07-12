import { UNIT_MAX_MORALE } from "../shared/config";
import { Unit, type UnitFields, type UnitKind } from "./unit";

/**
 * Non-combat envoy. Cannot attack, projects no territory.
 * Cap / train / lockout are enforced in cities production.
 */
export class Diplomat extends Unit {
	readonly kind: UnitKind = "diplomat";
	readonly maxHp = 60;
	readonly damage = 0;
	readonly defense = 0;
	readonly speed = 120;
	readonly attackRange = 0;
	readonly attackCooldown = 1;
	readonly combatMode = "melee" as const;
	readonly projectileSpeed = 0;

	static spawn(
		id: string,
		teamId: UnitFields["teamId"],
		position: UnitFields["position"],
	): Diplomat {
		return new Diplomat({
			id,
			teamId,
			position,
			selected: false,
			hp: 60,
			morale: UNIT_MAX_MORALE,
			state: "idle",
			target: null,
			path: [],
			orderKind: "move",
			orderAge: 0,
			attackTimer: 0,
			attackAnim: 0,
			hitFlash: 0,
			attackDir: null,
		});
	}

	copy(partial: Partial<UnitFields>): Diplomat {
		return new Diplomat(this.fields(partial));
	}
}

/** Preset free signals — wired in later UI / net work. */
export type DiplomatSignal = "ally" | "with-you" | "surrender";

/** Stub: unlimited free preset signals (no gameplay effect yet). */
export function sendDiplomatSignal(
	_unitId: string,
	_signal: DiplomatSignal,
): void {
	// Step 7 / net — intentional no-op.
}
