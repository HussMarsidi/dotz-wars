import { UNIT_MAX_MORALE } from "../shared/config";
import { Unit, type UnitFields, type UnitKind } from "./unit";

/** Balanced melee frontliner. */
export class Grunt extends Unit {
	readonly kind: UnitKind = "grunt";
	readonly maxHp = 100;
	readonly damage = 12;
	readonly defense = 3;
	readonly speed = 160;
	readonly attackRange = 28;
	readonly attackCooldown = 0.7;
	readonly combatMode = "melee" as const;
	readonly projectileSpeed = 0;

	static spawn(
		id: string,
		teamId: UnitFields["teamId"],
		position: UnitFields["position"],
	): Grunt {
		return new Grunt({
			id,
			teamId,
			position,
			selected: false,
			hp: 100,
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

	copy(partial: Partial<UnitFields>): Grunt {
		return new Grunt(this.fields(partial));
	}
}
