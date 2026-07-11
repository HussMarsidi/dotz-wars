import { type City, copyCity } from "../cities";
import { CITY_CAPTURE_DURATION, CITY_CAPTURE_HALF } from "../shared/config";
import type { TeamId, Vec2 } from "../shared/types";
import type { Unit } from "../units";

/** True when `point` is inside the city's axis-aligned capture box. */
export function inCaptureBox(city: City, point: Vec2): boolean {
	return (
		Math.abs(point.x - city.position.x) <= CITY_CAPTURE_HALF &&
		Math.abs(point.y - city.position.y) <= CITY_CAPTURE_HALF
	);
}

function hasDefenderInBox(city: City, units: readonly Unit[]): boolean {
	return units.some(
		(unit) =>
			unit.isAlive &&
			unit.teamId === city.teamId &&
			inCaptureBox(city, unit.position),
	);
}

/** Opposing team with at least one living unit in the capture box, else null. */
function capturerInBox(city: City, units: readonly Unit[]): TeamId | null {
	let blue = false;
	let red = false;
	for (const unit of units) {
		if (!unit.isAlive || unit.teamId === city.teamId) {
			continue;
		}
		if (!inCaptureBox(city, unit.position)) {
			continue;
		}
		if (unit.teamId === "blue") {
			blue = true;
		} else if (unit.teamId === "red") {
			red = true;
		} else {
			const _exhaustive: never = unit.teamId;
			void _exhaustive;
		}
	}

	if (city.teamId === "blue") {
		return red ? "red" : null;
	}
	if (city.teamId === "red") {
		return blue ? "blue" : null;
	}
	const _exhaustive: never = city.teamId;
	return _exhaustive;
}

function clearCapture(city: City): City {
	if (city.captureProgress === 0 && city.capturingTeamId === null) {
		return city;
	}
	return copyCity(city, { captureProgress: 0, capturingTeamId: null });
}

/**
 * Capture rules:
 * - Defenders in the box → progress resets (must clear them first).
 * - No defenders + enemy in box → progress toward CITY_CAPTURE_DURATION.
 * - Progress complete → ownership flips; city can be recaptured the same way.
 */
export function tickCapture(
	cities: readonly City[],
	units: readonly Unit[],
	dt: number,
): readonly City[] {
	return cities.map((city) => {
		if (hasDefenderInBox(city, units)) {
			return clearCapture(city);
		}

		const capturer = capturerInBox(city, units);
		if (capturer === null) {
			return clearCapture(city);
		}

		const progress =
			city.capturingTeamId === capturer ? city.captureProgress + dt : dt;

		if (progress >= CITY_CAPTURE_DURATION) {
			return copyCity(city, {
				teamId: capturer,
				captureProgress: 0,
				capturingTeamId: null,
			});
		}

		return copyCity(city, {
			captureProgress: progress,
			capturingTeamId: capturer,
		});
	});
}

/** One team owns every city → that team wins. */
export function checkCityWinner(cities: readonly City[]): TeamId | null {
	if (cities.length === 0) {
		return null;
	}
	const first = cities[0];
	if (first === undefined) {
		return null;
	}
	for (const city of cities) {
		if (city.teamId !== first.teamId) {
			return null;
		}
	}
	return first.teamId;
}
