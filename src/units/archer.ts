import { Unit, type UnitFields, type UnitKind } from "./unit";

/** Ranged skirmisher; fires flying projectiles. */
export class Archer extends Unit {
	readonly kind: UnitKind = "archer";
	readonly maxHp = 70;
	readonly damage = 10;
	readonly defense = 1;
	readonly speed = 150;
	readonly attackRange = 180;
	readonly attackCooldown = 0.9;
	readonly combatMode = "ranged" as const;
	readonly projectileSpeed = 420;

	static spawn(
		id: string,
		teamId: UnitFields["teamId"],
		position: UnitFields["position"],
	): Archer {
		return new Archer({
			id,
			teamId,
			position,
			selected: false,
			hp: 70,
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

	copy(partial: Partial<UnitFields>): Archer {
		return new Archer(this.fields(partial));
	}
}
