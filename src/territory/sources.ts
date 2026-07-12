import type { City } from "../cities";
import {
	CITY_INFLUENCE_RADIUS,
	CITY_INFLUENCE_STRENGTH,
	UNIT_INFLUENCE_RADIUS,
	UNIT_INFLUENCE_STRENGTH,
} from "../shared/config";
import type { Unit } from "../units";
import type { InfluenceSource } from "./types";

/** Shared projection rules — cities and units both become InfluenceSources. */
export function cityAsSource(city: City): InfluenceSource {
	return {
		teamId: city.teamId,
		position: city.position,
		strength: CITY_INFLUENCE_STRENGTH,
		radius: CITY_INFLUENCE_RADIUS,
	};
}

export function unitAsSource(unit: Unit): InfluenceSource | null {
	if (!unit.projectsTerritory) {
		return null;
	}
	return {
		teamId: unit.teamId,
		position: unit.position,
		strength: UNIT_INFLUENCE_STRENGTH,
		radius: UNIT_INFLUENCE_RADIUS,
	};
}

export function collectSources(
	cities: readonly City[],
	units: readonly Unit[],
): InfluenceSource[] {
	const sources: InfluenceSource[] = [];
	for (const city of cities) {
		sources.push(cityAsSource(city));
	}
	for (const unit of units) {
		if (!unit.isAlive) {
			continue;
		}
		const source = unitAsSource(unit);
		if (source !== null) {
			sources.push(source);
		}
	}
	return sources;
}
