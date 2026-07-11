import { circleFitsOnLand } from "../map/terrain";
import type { MapDefinition } from "../map/types";
import type { Vec2 } from "../shared/types";
import type { Unit } from "../units";

/**
 * Hard separation: push overlapping living units apart along the axis between them.
 * Positions that leave land are clamped back to the previous spot for that unit.
 */
export function separateUnits(
	units: readonly Unit[],
	map: MapDefinition,
	radius: number,
): readonly Unit[] {
	const minDist = radius * 2;
	const minDistSq = minDist * minDist;
	const positions: Vec2[] = units.map((unit) => unit.position);

	for (let i = 0; i < units.length; i++) {
		const a = units[i];
		if (a === undefined || !a.isAlive) {
			continue;
		}
		for (let j = i + 1; j < units.length; j++) {
			const b = units[j];
			if (b === undefined || !b.isAlive) {
				continue;
			}

			const pa = positions[i];
			const pb = positions[j];
			if (pa === undefined || pb === undefined) {
				continue;
			}

			const dx = pb.x - pa.x;
			const dy = pb.y - pa.y;
			const distSq = dx * dx + dy * dy;
			if (distSq >= minDistSq || distSq === 0) {
				if (distSq === 0) {
					// Identical centers — nudge along +x.
					const half = radius;
					const nextA = { x: pa.x - half, y: pa.y };
					const nextB = { x: pb.x + half, y: pb.y };
					positions[i] = circleFitsOnLand(map, nextA, radius) ? nextA : pa;
					positions[j] = circleFitsOnLand(map, nextB, radius) ? nextB : pb;
				}
				continue;
			}

			const dist = Math.sqrt(distSq);
			const overlap = (minDist - dist) / 2;
			const ux = dx / dist;
			const uy = dy / dist;
			const nextA = { x: pa.x - ux * overlap, y: pa.y - uy * overlap };
			const nextB = { x: pb.x + ux * overlap, y: pb.y + uy * overlap };
			positions[i] = circleFitsOnLand(map, nextA, radius) ? nextA : pa;
			positions[j] = circleFitsOnLand(map, nextB, radius) ? nextB : pb;
		}
	}

	return units.map((unit, index) => {
		const next = positions[index];
		if (next === undefined || next === unit.position) {
			return unit;
		}
		if (next.x === unit.position.x && next.y === unit.position.y) {
			return unit;
		}
		return unit.copy({ position: next });
	});
}
