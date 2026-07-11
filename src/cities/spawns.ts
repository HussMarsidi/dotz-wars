import { type City, createCity } from "./city";

/**
 * Fixed Phase-1 city layout: 2 per team (north / south), near each spawn column.
 * Positions avoid the main water ellipses on the battlefield map.
 */
export const CITY_SPAWNS = [
	{
		id: "blue-n",
		teamId: "blue" as const,
		position: { x: 520, y: 380 },
		label: "N",
	},
	{
		id: "blue-s",
		teamId: "blue" as const,
		position: { x: 520, y: 1120 },
		label: "S",
	},
	{
		id: "red-n",
		teamId: "red" as const,
		position: { x: 1880, y: 380 },
		label: "N",
	},
	{
		id: "red-s",
		teamId: "red" as const,
		position: { x: 1880, y: 1120 },
		label: "S",
	},
] as const;

export function createInitialCities(): City[] {
	return CITY_SPAWNS.map((spawn) =>
		createCity(spawn.id, spawn.teamId, spawn.position, spawn.label),
	);
}
