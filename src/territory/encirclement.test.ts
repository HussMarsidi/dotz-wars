import { describe, expect, it } from "vitest";
import { createCity } from "../cities";
import { Grunt } from "../units";
import {
	BFS_UNREACHED,
	computeEncirclement,
	computeTeamConnectivity,
	type TerritoryField,
	type TerritoryOwner,
} from "./index";

function fieldFromOwners(
	cols: number,
	rows: number,
	cellSize: number,
	owners: TerritoryOwner[],
): TerritoryField {
	return {
		cellSize,
		cols,
		rows,
		width: cols * cellSize,
		height: rows * cellSize,
		owners,
	};
}

describe("computeTeamConnectivity", () => {
	it("reaches own and neutral cells from cities, blocked by enemy ground", () => {
		// 5x1: blue city | blue | neutral | red | red city cell
		const owners: TerritoryOwner[] = [
			"blue",
			"blue",
			"neutral",
			"red",
			"red",
		];
		const field = fieldFromOwners(5, 1, 16, owners);
		const blueCity = createCity("b", "blue", { x: 8, y: 8 }, "N");
		const redCity = createCity("r", "red", { x: 8 + 4 * 16, y: 8 }, "N");

		const blue = computeTeamConnectivity(field, [blueCity, redCity], "blue");
		expect(blue.parent[0]).not.toBe(BFS_UNREACHED);
		expect(blue.parent[1]).not.toBe(BFS_UNREACHED);
		expect(blue.parent[2]).not.toBe(BFS_UNREACHED); // neutral ok
		expect(blue.parent[3]).toBe(BFS_UNREACHED); // enemy blocks
		expect(blue.parent[4]).toBe(BFS_UNREACHED);
	});
});

describe("computeEncirclement", () => {
	it("flags a unit on owned ground the BFS did not reach", () => {
		// 5x5 grid: blue city at (0,2), enemy ring walls off a blue pocket at (4,2).
		const cols = 5;
		const rows = 5;
		const owners: TerritoryOwner[] = Array.from(
			{ length: cols * rows },
			() => "neutral" as TerritoryOwner,
		);
		const at = (c: number, r: number) => r * cols + c;
		owners[at(0, 2)] = "blue"; // city / home
		owners[at(1, 2)] = "blue";
		// Red wall columns 2 fully blocks east-west through neutrals too if we
		// paint the whole column red.
		for (let r = 0; r < rows; r += 1) {
			owners[at(2, r)] = "red";
		}
		owners[at(3, 2)] = "blue";
		owners[at(4, 2)] = "blue"; // pocket

		const field = fieldFromOwners(cols, rows, 16, owners);
		const blueHome = createCity("home", "blue", { x: 8, y: 8 + 2 * 16 }, "H");
		const stranded = Grunt.spawn("u", "blue", {
			x: 8 + 4 * 16,
			y: 8 + 2 * 16,
		});
		const free = Grunt.spawn("f", "blue", { x: 8, y: 8 + 2 * 16 });
		const onEnemy = Grunt.spawn("e", "blue", {
			x: 8 + 2 * 16,
			y: 8 + 2 * 16,
		});

		const result = computeEncirclement(
			field,
			[blueHome],
			[stranded, free, onEnemy],
		);

		expect(result.encircledIds.has("u")).toBe(true);
		expect(result.encircledIds.has("f")).toBe(false);
		expect(result.encircledIds.has("e")).toBe(false);
	});
});
