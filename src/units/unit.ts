import {
	HIT_FLASH_DURATION,
	MELEE_HP_DAMAGE_MULT,
	MELEE_MORALE_DAMAGE_MULT,
	RANGED_HP_DAMAGE_MULT,
	RANGED_MORALE_DAMAGE_MULT,
	UNIT_MAX_MORALE,
} from "../shared/config";
import type { DotId, TeamId, Vec2 } from "../shared/types";

export type { TeamId };

export type CombatMode = "melee" | "ranged";

export type UnitKind = "grunt" | "archer" | "tank" | "scout" | "diplomat";

/** Ground click vs enemy click — drives move-arrow color. */
export type OrderKind = "move" | "attack";

/** Per-tick combat/movement state machine. */
export type UnitState = "idle" | "marching" | "fighting" | "routing";

/** Mutable fields shared by every unit copy. */
export type UnitFields = {
	readonly id: DotId;
	readonly teamId: TeamId;
	readonly position: Vec2;
	readonly selected: boolean;
	readonly hp: number;
	/** Separate from HP — 0 forces Routing. */
	readonly morale: number;
	readonly state: UnitState;
	/** Final RTS destination; null when idle. */
	readonly target: Vec2 | null;
	/** Remaining waypoints to `target`. */
	readonly path: readonly Vec2[];
	/** Move (white) vs attack (red) order for the current target. */
	readonly orderKind: OrderKind;
	/** Seconds since the current order was issued (for attack-arrow blink). */
	readonly orderAge: number;
	/** Seconds until this unit may attack again. */
	readonly attackTimer: number;
	/** Remaining attack lunge / slash anim (seconds). */
	readonly attackAnim: number;
	/** Remaining hit-flash anim (seconds). */
	readonly hitFlash: number;
	/** Unit vector toward last attack target; null when idle. */
	readonly attackDir: Vec2 | null;
};

/**
 * Base combat unit. Subclasses own stats + combat mode.
 *
 * NOTE: out-of-range enemies are chased via `tickChase` (aggro radius).
 */
export abstract class Unit {
	readonly id: DotId;
	readonly teamId: TeamId;
	readonly position: Vec2;
	readonly selected: boolean;
	readonly hp: number;
	readonly morale: number;
	readonly state: UnitState;
	readonly target: Vec2 | null;
	readonly path: readonly Vec2[];
	readonly orderKind: OrderKind;
	readonly orderAge: number;
	readonly attackTimer: number;
	readonly attackAnim: number;
	readonly hitFlash: number;
	readonly attackDir: Vec2 | null;

	protected constructor(fields: UnitFields) {
		this.id = fields.id;
		this.teamId = fields.teamId;
		this.position = fields.position;
		this.selected = fields.selected;
		this.hp = fields.hp;
		this.morale = fields.morale;
		this.state = fields.state;
		this.target = fields.target;
		this.path = fields.path;
		this.orderKind = fields.orderKind;
		this.orderAge = fields.orderAge;
		this.attackTimer = fields.attackTimer;
		this.attackAnim = fields.attackAnim;
		this.hitFlash = fields.hitFlash;
		this.attackDir = fields.attackDir;
	}

	abstract readonly kind: UnitKind;
	abstract readonly maxHp: number;
	abstract readonly damage: number;
	abstract readonly defense: number;
	/** World units per second. */
	abstract readonly speed: number;
	/** World-unit reach for auto-attack. */
	abstract readonly attackRange: number;
	/** Seconds between attacks. */
	abstract readonly attackCooldown: number;
	abstract readonly combatMode: CombatMode;
	/** Projectile flight speed; unused for melee. */
	abstract readonly projectileSpeed: number;

	/** Diplomats cannot attack; everyone else can. */
	get canAttack(): boolean {
		return this.kind !== "diplomat";
	}

	/** Diplomats project no territory influence. */
	get projectsTerritory(): boolean {
		return this.kind !== "diplomat";
	}

	get maxMorale(): number {
		return UNIT_MAX_MORALE;
	}

	abstract copy(partial: Partial<UnitFields>): Unit;

	get isAlive(): boolean {
		return this.hp > 0;
	}

	/** Simple formula: at least 1 HP after defense (before mode mult). */
	incomingDamage(rawDamage: number): number {
		return Math.max(1, rawDamage - this.defense);
	}

	/**
	 * Apply a hit. Melee softer on HP; ranged mostly chips morale.
	 */
	receiveHit(rawDamage: number, combatMode: CombatMode = "melee"): Unit {
		const dealt = this.incomingDamage(rawDamage);
		let hpMult: number;
		let moraleMult: number;
		switch (combatMode) {
			case "melee":
				hpMult = MELEE_HP_DAMAGE_MULT;
				moraleMult = MELEE_MORALE_DAMAGE_MULT;
				break;
			case "ranged":
				hpMult = RANGED_HP_DAMAGE_MULT;
				moraleMult = RANGED_MORALE_DAMAGE_MULT;
				break;
			default: {
				const _exhaustive: never = combatMode;
				return _exhaustive;
			}
		}

		const hpLoss = Math.max(1, Math.round(dealt * hpMult));
		const moraleLoss = dealt * moraleMult;

		return this.copy({
			hp: Math.max(0, this.hp - hpLoss),
			morale: Math.max(0, this.morale - moraleLoss),
			hitFlash: Math.max(this.hitFlash, HIT_FLASH_DURATION),
		});
	}

	protected fields(partial: Partial<UnitFields> = {}): UnitFields {
		return {
			id: partial.id ?? this.id,
			teamId: partial.teamId ?? this.teamId,
			position: partial.position ?? this.position,
			selected: partial.selected ?? this.selected,
			hp: partial.hp ?? this.hp,
			morale: partial.morale ?? this.morale,
			state: partial.state ?? this.state,
			target: partial.target !== undefined ? partial.target : this.target,
			path: partial.path ?? this.path,
			orderKind: partial.orderKind ?? this.orderKind,
			orderAge: partial.orderAge ?? this.orderAge,
			attackTimer: partial.attackTimer ?? this.attackTimer,
			attackAnim: partial.attackAnim ?? this.attackAnim,
			hitFlash: partial.hitFlash ?? this.hitFlash,
			attackDir:
				partial.attackDir !== undefined ? partial.attackDir : this.attackDir,
		};
	}
}
