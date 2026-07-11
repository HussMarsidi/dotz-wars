import { CITY_CAPTURE_HALF, LOCAL_TEAM } from "../shared/config";
import type { TeamId, Vec2 } from "../shared/types";
import type { City, CityId } from "./city";

function pointInCaptureBox(city: City, point: Vec2): boolean {
	return (
		Math.abs(point.x - city.position.x) <= CITY_CAPTURE_HALF &&
		Math.abs(point.y - city.position.y) <= CITY_CAPTURE_HALF
	);
}

/**
 * Owned city whose capture box contains `point`, else null.
 * Only `owner` (default local team) cities are selectable for production.
 */
export function findOwnedCityAtPoint(
	cities: readonly City[],
	point: Vec2,
	owner: TeamId = LOCAL_TEAM,
): City | null {
	for (const city of cities) {
		if (city.teamId !== owner) {
			continue;
		}
		if (pointInCaptureBox(city, point)) {
			return city;
		}
	}
	return null;
}

export function cityById(
	cities: readonly City[],
	cityId: CityId,
): City | undefined {
	return cities.find((city) => city.id === cityId);
}
