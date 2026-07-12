import { ATTACK_ANIM_DURATION, PROJECTILE_HIT_RADIUS } from "../shared/config";
import type { DotId, Projectile, Vec2 } from "../shared/types";
import type { Unit } from "../units";

function distanceSquared(a: Vec2, b: Vec2): number {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	return dx * dx + dy * dy;
}

function directionToward(from: Vec2, to: Vec2): Vec2 {
	const dx = to.x - from.x;
	const dy = to.y - from.y;
	const len = Math.hypot(dx, dy);
	if (len < 1e-6) {
		return { x: 1, y: 0 };
	}
	return { x: dx / len, y: dy / len };
}

function decayCombatAnims(unit: Unit, dt: number): Unit {
	const attackAnim = Math.max(0, unit.attackAnim - dt);
	const hitFlash = Math.max(0, unit.hitFlash - dt);
	if (attackAnim === unit.attackAnim && hitFlash === unit.hitFlash) {
		return unit;
	}
	return unit.copy({
		attackAnim,
		hitFlash,
		attackDir: attackAnim > 0 ? unit.attackDir : null,
	});
}

/** Closest living enemy within `range`, or null. */
export function findClosestEnemy(
	attacker: Unit,
	units: readonly Unit[],
	range: number,
): Unit | null {
	let best: Unit | null = null;
	let bestDist = range * range;

	for (const other of units) {
		if (!other.isAlive || other.teamId === attacker.teamId) {
			continue;
		}
		const dist = distanceSquared(attacker.position, other.position);
		if (dist <= bestDist) {
			bestDist = dist;
			best = other;
		}
	}
	return best;
}

/**
 * Living enemy within `range`, preferring lowest HP ratio then closest.
 * Used for both auto-attack and chase targeting.
 */
export function findPriorityEnemy(
	attacker: Unit,
	units: readonly Unit[],
	range: number,
): Unit | null {
	let best: Unit | null = null;
	let bestHpRatio = Number.POSITIVE_INFINITY;
	let bestDist = Number.POSITIVE_INFINITY;
	const rangeSq = range * range;

	for (const other of units) {
		if (!other.isAlive || other.teamId === attacker.teamId) {
			continue;
		}
		const dist = distanceSquared(attacker.position, other.position);
		if (dist > rangeSq) {
			continue;
		}
		const hpRatio = other.hp / other.maxHp;
		if (hpRatio < bestHpRatio || (hpRatio === bestHpRatio && dist < bestDist)) {
			best = other;
			bestHpRatio = hpRatio;
			bestDist = dist;
		}
	}
	return best;
}

export type CombatTickResult = {
	readonly units: readonly Unit[];
	readonly projectiles: readonly Projectile[];
	readonly nextProjectileId: number;
};

type DamageEvent = {
	readonly targetId: DotId;
	readonly rawDamage: number;
};

function applyDamageEvents(
	units: readonly Unit[],
	events: readonly DamageEvent[],
): readonly Unit[] {
	if (events.length === 0) {
		return units;
	}
	return units.map((unit) => {
		let current = unit;
		for (const event of events) {
			if (event.targetId === current.id) {
				current = current.receiveHit(event.rawDamage);
			}
		}
		return current;
	});
}

/**
 * Auto-attack priority enemy in range (lowest HP ratio, then closest).
 * Melee applies damage immediately; ranged spawns a flying projectile.
 * Chase / support movement is handled by `tickChase`.
 */
export function tickCombat(
	units: readonly Unit[],
	projectiles: readonly Projectile[],
	dt: number,
	nextProjectileId: number,
): CombatTickResult {
	const living = units.filter((unit) => unit.isAlive);
	const meleeHits: DamageEvent[] = [];
	const spawned: Projectile[] = [];
	let projectileSeq = nextProjectileId;

	const afterTimers = units.map((unit) => {
		if (!unit.isAlive) {
			return decayCombatAnims(unit, dt);
		}

		if (!unit.canAttack) {
			return decayCombatAnims(unit, dt).copy({ attackTimer: 0 });
		}

		const timer = Math.max(0, unit.attackTimer - dt);
		if (timer > 0) {
			return decayCombatAnims(unit, dt).copy({ attackTimer: timer });
		}

		const enemy = findPriorityEnemy(unit, living, unit.attackRange);
		if (enemy === null) {
			return decayCombatAnims(unit, dt).copy({ attackTimer: 0 });
		}

		const attackDir = directionToward(unit.position, enemy.position);

		if (unit.combatMode === "melee") {
			meleeHits.push({ targetId: enemy.id, rawDamage: unit.damage });
			return unit.copy({
				attackTimer: unit.attackCooldown,
				attackAnim: ATTACK_ANIM_DURATION,
				attackDir,
			});
		}

		if (unit.combatMode === "ranged") {
			spawned.push({
				id: `proj-${projectileSeq}`,
				teamId: unit.teamId,
				position: { ...unit.position },
				targetId: enemy.id,
				damage: unit.damage,
				speed: unit.projectileSpeed,
			});
			projectileSeq += 1;
			return unit.copy({
				attackTimer: unit.attackCooldown,
				attackAnim: ATTACK_ANIM_DURATION * 0.6,
				attackDir,
			});
		}

		const _exhaustive: never = unit.combatMode;
		return _exhaustive;
	});

	return {
		units: applyDamageEvents(afterTimers, meleeHits),
		projectiles: [...projectiles, ...spawned],
		nextProjectileId: projectileSeq,
	};
}

export type ProjectileTickResult = {
	readonly units: readonly Unit[];
	readonly projectiles: readonly Projectile[];
};

/** Advance projectiles toward their target; apply damage on hit. */
export function tickProjectiles(
	units: readonly Unit[],
	projectiles: readonly Projectile[],
	dt: number,
): ProjectileTickResult {
	const byId = new Map<DotId, Unit>(units.map((unit) => [unit.id, unit]));
	const remaining: Projectile[] = [];
	const hits: DamageEvent[] = [];

	for (const projectile of projectiles) {
		const target = byId.get(projectile.targetId);
		if (target === undefined || !target.isAlive) {
			continue;
		}

		const dx = target.position.x - projectile.position.x;
		const dy = target.position.y - projectile.position.y;
		const dist = Math.hypot(dx, dy);
		const step = projectile.speed * dt;

		if (dist <= PROJECTILE_HIT_RADIUS || step >= dist) {
			hits.push({ targetId: target.id, rawDamage: projectile.damage });
			continue;
		}

		const nextPos = {
			x: projectile.position.x + (dx / dist) * step,
			y: projectile.position.y + (dy / dist) * step,
		};
		if (
			distanceSquared(nextPos, target.position) <=
			PROJECTILE_HIT_RADIUS ** 2
		) {
			hits.push({ targetId: target.id, rawDamage: projectile.damage });
			continue;
		}

		remaining.push({ ...projectile, position: nextPos });
	}

	return {
		units: applyDamageEvents(units, hits),
		projectiles: remaining,
	};
}
