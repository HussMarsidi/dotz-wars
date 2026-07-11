import { Unit, type UnitFields, type UnitKind } from "./unit";

/** Slow, durable melee anchor. */
export class Tank extends Unit {
	readonly kind: UnitKind = "tank";
	readonly maxHp = 180;
	readonly damage = 14;
	readonly defense = 8;
	readonly speed = 100;
	readonly attackRange = 30;
	readonly attackCooldown = 1.0;
	readonly combatMode = "melee" as const;
	readonly projectileSpeed = 0;

	static spawn(
		id: string,
		teamId: UnitFields["teamId"],
		position: UnitFields["position"],
	): Tank {
		return new Tank({
			id,
			teamId,
			position,
			selected: false,
			hp: 180,
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

	copy(partial: Partial<UnitFields>): Tank {
		return new Tank(this.fields(partial));
	}
}
