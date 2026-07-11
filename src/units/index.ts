import type { TeamId, Vec2 } from "../shared/types";
import { Archer } from "./archer";
import { Grunt } from "./grunt";
import { Mage } from "./mage";
import { Scout } from "./scout";
import { Tank } from "./tank";
import type { Unit, UnitKind } from "./unit";

export type { TeamId } from "../shared/types";
export { Archer } from "./archer";
export { Grunt } from "./grunt";
export { Mage } from "./mage";
export { Scout } from "./scout";
export { Tank } from "./tank";
export type { CombatMode, OrderKind, UnitFields, UnitKind } from "./unit";
export { Unit } from "./unit";

const SPAWNERS: Record<
	UnitKind,
	(id: string, teamId: TeamId, position: Vec2) => Unit
> = {
	grunt: Grunt.spawn,
	archer: Archer.spawn,
	tank: Tank.spawn,
	scout: Scout.spawn,
	mage: Mage.spawn,
};

/** Test lineup: two of each kind (for Cmd+A same-type select). */
export const UNIT_LINEUP: readonly UnitKind[] = [
	"grunt",
	"grunt",
	"archer",
	"archer",
	"tank",
	"tank",
	"scout",
	"scout",
	"mage",
	"mage",
];

export function spawnUnit(
	kind: UnitKind,
	id: string,
	teamId: TeamId,
	position: Vec2,
): Unit {
	return SPAWNERS[kind](id, teamId, position);
}
