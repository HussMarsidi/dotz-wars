import type { TeamId, Vec2 } from "../shared/types";
import type { UnitKind } from "../units/unit";

export type CityId = string;

export type ProductionOrderId = string;

/** One concurrent train slot in a city queue. */
export type ProductionOrder = {
	readonly id: ProductionOrderId;
	readonly kind: UnitKind;
	readonly cost: number;
	readonly trainTime: number;
	/** Seconds elapsed toward `trainTime`. */
	readonly elapsed: number;
};

export type CityFields = {
	readonly id: CityId;
	readonly teamId: TeamId;
	readonly position: Vec2;
	readonly label: string;
	/** Seconds of uninterrupted capture progress. */
	readonly captureProgress: number;
	/** Team currently capturing; null when idle. */
	readonly capturingTeamId: TeamId | null;
	/** Concurrent production orders (cap via CITY_PRODUCTION_QUEUE_CAP). */
	readonly queue: readonly ProductionOrder[];
};

/** Static map objective. Ownership flips via capture, not combat HP. */
export type City = CityFields;

export function createCity(
	id: CityId,
	teamId: TeamId,
	position: Vec2,
	label: string,
): City {
	return {
		id,
		teamId,
		position,
		label,
		captureProgress: 0,
		capturingTeamId: null,
		queue: [],
	};
}

export function copyCity(city: City, partial: Partial<CityFields>): City {
	return {
		id: partial.id ?? city.id,
		teamId: partial.teamId ?? city.teamId,
		position: partial.position ?? city.position,
		label: partial.label ?? city.label,
		captureProgress: partial.captureProgress ?? city.captureProgress,
		capturingTeamId:
			partial.capturingTeamId !== undefined
				? partial.capturingTeamId
				: city.capturingTeamId,
		queue: partial.queue ?? city.queue,
	};
}
