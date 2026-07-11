import type { TeamId, Vec2 } from "../shared/types";

export type CityId = string;

export type CityFields = {
	readonly id: CityId;
	readonly teamId: TeamId;
	readonly position: Vec2;
	readonly label: string;
	/** Seconds of uninterrupted capture progress. */
	readonly captureProgress: number;
	/** Team currently capturing; null when idle. */
	readonly capturingTeamId: TeamId | null;
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
	};
}
