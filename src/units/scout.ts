import { Unit, type UnitFields, type UnitKind } from "./unit";

/** Fast, fragile melee harasser. */
export class Scout extends Unit {
	readonly kind: UnitKind = "scout";
	readonly maxHp = 55;
	readonly damage = 8;
	readonly defense = 0;
	readonly speed = 240;
	readonly attackRange = 26;
	readonly attackCooldown = 0.45;
	readonly combatMode = "melee" as const;
	readonly projectileSpeed = 0;

	static spawn(
		id: string,
		teamId: UnitFields["teamId"],
		position: UnitFields["position"],
	): Scout {
		return new Scout({
			id,
			teamId,
			position,
			selected: false,
			hp: 55,
			target: null,
			path: [],
			attackTimer: 0,
			attackAnim: 0,
			hitFlash: 0,
			attackDir: null,
		});
	}

	copy(partial: Partial<UnitFields>): Scout {
		return new Scout(this.fields(partial));
	}
}
