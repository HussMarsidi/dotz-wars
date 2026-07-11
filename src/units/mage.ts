import { Unit, type UnitFields, type UnitKind } from "./unit";

/** Slow, hard-hitting ranged caster. */
export class Mage extends Unit {
	readonly kind: UnitKind = "mage";
	readonly maxHp = 60;
	readonly damage = 18;
	readonly defense = 0;
	readonly speed = 120;
	readonly attackRange = 200;
	readonly attackCooldown = 1.2;
	readonly combatMode = "ranged" as const;
	readonly projectileSpeed = 320;

	static spawn(
		id: string,
		teamId: UnitFields["teamId"],
		position: UnitFields["position"],
	): Mage {
		return new Mage({
			id,
			teamId,
			position,
			selected: false,
			hp: 60,
			target: null,
			path: [],
			attackTimer: 0,
			attackAnim: 0,
			hitFlash: 0,
			attackDir: null,
		});
	}

	copy(partial: Partial<UnitFields>): Mage {
		return new Mage(this.fields(partial));
	}
}
