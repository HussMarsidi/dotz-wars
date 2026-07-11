import type { DotId, Vec2 } from "../shared/types";
import { normalizeFacing } from "./layout";
import {
	type Formation,
	type FormationId,
	type FormationMarch,
	type FormationShape,
	formationShapeLetter,
	spacingForShape,
} from "./types";

let nextFormationId = 1;

export type FormationRegistry = {
	readonly create: (
		shape: FormationShape,
		memberIds: readonly DotId[],
		facing: Vec2,
		spacing?: number,
	) => Formation;
	readonly breakById: (id: FormationId) => void;
	readonly breakMembers: (memberIds: readonly DotId[]) => void;
	readonly breakSelected: (selectedIds: ReadonlySet<DotId>) => void;
	readonly get: (id: FormationId) => Formation | undefined;
	readonly formationForUnit: (unitId: DotId) => Formation | undefined;
	readonly updateFacing: (id: FormationId, facing: Vec2) => void;
	readonly updateShape: (id: FormationId, shape: FormationShape) => void;
	readonly setMarch: (id: FormationId, march: FormationMarch | null) => void;
	readonly pruneToLiving: (livingIds: ReadonlySet<DotId>) => void;
	readonly all: () => readonly Formation[];
	readonly labelsByUnit: () => ReadonlyMap<DotId, string>;
	readonly marchingUnitIds: () => ReadonlySet<DotId>;
};

/** Mutable registry of active formations (player UI state, not sim tick state). */
export function createFormationRegistry(): FormationRegistry {
	const byId = new Map<FormationId, Formation>();
	const unitIndex = new Map<DotId, FormationId>();

	const detachMembers = (memberIds: readonly DotId[]) => {
		for (const id of memberIds) {
			const fid = unitIndex.get(id);
			if (fid === undefined) {
				continue;
			}
			unitIndex.delete(id);
			const formation = byId.get(fid);
			if (formation === undefined) {
				continue;
			}
			const nextMembers = formation.memberIds.filter((m) => m !== id);
			if (nextMembers.length === 0) {
				byId.delete(fid);
			} else {
				byId.set(fid, { ...formation, memberIds: nextMembers });
			}
		}
	};

	return {
		create(shape, memberIds, facing, spacing = spacingForShape(shape)) {
			const unique = [...new Set(memberIds)];
			detachMembers(unique);
			const id = `formation-${nextFormationId++}`;
			const formation: Formation = {
				id,
				shape,
				spacing,
				facing: normalizeFacing(facing),
				memberIds: unique,
				march: null,
			};
			byId.set(id, formation);
			for (const memberId of unique) {
				unitIndex.set(memberId, id);
			}
			return formation;
		},

		breakById(id) {
			const formation = byId.get(id);
			if (formation === undefined) {
				return;
			}
			for (const memberId of formation.memberIds) {
				unitIndex.delete(memberId);
			}
			byId.delete(id);
		},

		breakMembers(memberIds) {
			detachMembers(memberIds);
		},

		breakSelected(selectedIds) {
			const seen = new Set<FormationId>();
			for (const unitId of selectedIds) {
				const fid = unitIndex.get(unitId);
				if (fid !== undefined) {
					seen.add(fid);
				}
			}
			for (const fid of seen) {
				this.breakById(fid);
			}
		},

		get(id) {
			return byId.get(id);
		},

		formationForUnit(unitId) {
			const fid = unitIndex.get(unitId);
			return fid === undefined ? undefined : byId.get(fid);
		},

		updateFacing(id, facing) {
			const formation = byId.get(id);
			if (formation === undefined) {
				return;
			}
			byId.set(id, {
				...formation,
				facing: normalizeFacing(facing),
			});
		},

		updateShape(id, shape) {
			const formation = byId.get(id);
			if (formation === undefined) {
				return;
			}
			byId.set(id, {
				...formation,
				shape,
				spacing: spacingForShape(shape),
			});
		},

		setMarch(id, march) {
			const formation = byId.get(id);
			if (formation === undefined) {
				return;
			}
			byId.set(id, {
				...formation,
				march,
				facing: march?.facing ?? formation.facing,
			});
		},

		pruneToLiving(livingIds) {
			for (const formation of [...byId.values()]) {
				const kept = formation.memberIds.filter((id) => livingIds.has(id));
				if (kept.length === 0) {
					this.breakById(formation.id);
					continue;
				}
				if (kept.length !== formation.memberIds.length) {
					for (const id of formation.memberIds) {
						unitIndex.delete(id);
					}
					const next = { ...formation, memberIds: kept };
					byId.set(formation.id, next);
					for (const id of kept) {
						unitIndex.set(id, formation.id);
					}
				}
			}
		},

		all() {
			return [...byId.values()];
		},

		labelsByUnit() {
			const labels = new Map<DotId, string>();
			for (const formation of byId.values()) {
				const letter = formationShapeLetter(formation.shape);
				for (const memberId of formation.memberIds) {
					labels.set(memberId, letter);
				}
			}
			return labels;
		},

		marchingUnitIds() {
			const ids = new Set<DotId>();
			for (const formation of byId.values()) {
				if (formation.march === null) {
					continue;
				}
				for (const memberId of formation.memberIds) {
					ids.add(memberId);
				}
			}
			return ids;
		},
	};
}

/** True if any of these units already belongs to a formation. */
export function selectionHasFormation(
	registry: FormationRegistry,
	unitIds: readonly DotId[],
): boolean {
	return unitIds.some((id) => registry.formationForUnit(id) !== undefined);
}
