import type { TeamId, Vec2 } from "../shared/types";
import { Archer } from "./archer";
import { Diplomat } from "./diplomat";
import { Grunt } from "./grunt";
import { Scout } from "./scout";
import { Tank } from "./tank";
import type { Unit, UnitKind } from "./unit";

export type { TeamId } from "../shared/types";
export { Archer } from "./archer";
export {
	Diplomat,
	sendDiplomatSignal,
	type DiplomatSignal,
} from "./diplomat";
export { Grunt } from "./grunt";
export { Scout } from "./scout";
export { Tank } from "./tank";
export type {
	CombatMode,
	OrderKind,
	UnitFields,
	UnitKind,
	UnitState,
} from "./unit";
export { Unit } from "./unit";

const SPAWNERS: Record<
	UnitKind,
	(id: string, teamId: TeamId, position: Vec2) => Unit
> = {
	grunt: Grunt.spawn,
	archer: Archer.spawn,
	tank: Tank.spawn,
	scout: Scout.spawn,
	diplomat: Diplomat.spawn,
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
	"diplomat",
	"diplomat",
];

export function spawnUnit(
	kind: UnitKind,
	id: string,
	teamId: TeamId,
	position: Vec2,
): Unit {
	return SPAWNERS[kind](id, teamId, position);
}
