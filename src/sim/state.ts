import { createInitialCities } from "../cities";
import {
	BLUE_SPAWN_X,
	BOARD_HEIGHT,
	BOARD_WIDTH,
	RED_SPAWN_X,
	SPAWN_Y_GAP,
	SPAWN_Y_START,
} from "../shared/config";
import type { GameState } from "../shared/game-state";
import { collectSources, computeTerritory } from "../territory";
import { spawnUnit, type TeamId, UNIT_LINEUP, type Unit } from "../units";

function spawnTeam(teamId: TeamId, spawnX: number): Unit[] {
	return UNIT_LINEUP.map((kind, index) =>
		spawnUnit(kind, `${teamId}-${kind}`, teamId, {
			x: spawnX,
			y: SPAWN_Y_START + index * SPAWN_Y_GAP,
		}),
	);
}

/**
 * 5v5 test lineup: one of each unit kind per team.
 *
 * TODO: other team will be managed by AI — for now both teams are player-selectable for testing.
 */
export function createInitialUnits(): Unit[] {
	return [...spawnTeam("blue", BLUE_SPAWN_X), ...spawnTeam("red", RED_SPAWN_X)];
}

export function createInitialState(): GameState {
	const units = createInitialUnits();
	const cities = createInitialCities();
	return {
		units,
		cities,
		territory: computeTerritory(
			BOARD_WIDTH,
			BOARD_HEIGHT,
			collectSources(cities, units),
		),
		projectiles: [],
		winner: null,
	};
}
