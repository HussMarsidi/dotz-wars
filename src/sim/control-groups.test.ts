import { describe, expect, it } from "vitest";
import type { GameState } from "../shared/game-state";
import { emptyTerritory } from "../territory";
import { Grunt } from "../units";
import {
	assignControlGroup,
	controlGroupLabels,
	createControlGroups,
	parseControlGroupKey,
	selectControlGroup,
} from "./control-groups";

function stateOf(...units: ReturnType<typeof Grunt.spawn>[]): GameState {
	return {
		units,
		cities: [],
		territory: emptyTerritory(1, 1),
		projectiles: [],
		gold: { blue: 1000, red: 1000 },
		diplomatLockout: { blue: 0, red: 0 },
		winner: null,
	};
}

describe("parseControlGroupKey", () => {
	it("accepts 1–9 only", () => {
		expect(parseControlGroupKey("1")).toBe(1);
		expect(parseControlGroupKey("9")).toBe(9);
		expect(parseControlGroupKey("0")).toBeNull();
		expect(parseControlGroupKey("a")).toBeNull();
	});
});

describe("assignControlGroup", () => {
	it("stores selected living units and replaces on reassign", () => {
		const groups = createControlGroups();
		const a = Grunt.spawn("a", "blue", { x: 0, y: 0 }).copy({ selected: true });
		const b = Grunt.spawn("b", "blue", { x: 10, y: 0 }).copy({
			selected: true,
		});
		const c = Grunt.spawn("c", "blue", { x: 20, y: 0 });
		assignControlGroup(groups, 1, stateOf(a, b, c));
		expect(groups.get(1)).toEqual(["a", "b"]);

		const onlyC = stateOf(
			a.copy({ selected: false }),
			b.copy({ selected: false }),
			c.copy({ selected: true }),
		);
		assignControlGroup(groups, 1, onlyC);
		expect(groups.get(1)).toEqual(["c"]);
	});

	it("clears the group when nothing is selected", () => {
		const groups = createControlGroups();
		const a = Grunt.spawn("a", "blue", { x: 0, y: 0 }).copy({ selected: true });
		assignControlGroup(groups, 2, stateOf(a));
		assignControlGroup(groups, 2, stateOf(a.copy({ selected: false })));
		expect(groups.has(2)).toBe(false);
	});
});

describe("selectControlGroup", () => {
	it("selects living group members and prunes dead ids", () => {
		const groups = createControlGroups();
		const a = Grunt.spawn("a", "blue", { x: 0, y: 0 });
		const b = Grunt.spawn("b", "blue", { x: 10, y: 0 });
		groups.set(1, ["a", "b", "gone"]);
		const next = selectControlGroup(stateOf(a, b), groups, 1);
		expect(next.units.find((u) => u.id === "a")?.selected).toBe(true);
		expect(next.units.find((u) => u.id === "b")?.selected).toBe(true);
		expect(groups.get(1)).toEqual(["a", "b"]);
	});

	it("no-ops when the group is empty after prune", () => {
		const groups = createControlGroups();
		const a = Grunt.spawn("a", "blue", { x: 0, y: 0 }).copy({
			selected: true,
			hp: 0,
		});
		groups.set(3, ["a"]);
		const state = stateOf(a);
		expect(selectControlGroup(state, groups, 3)).toBe(state);
		expect(groups.has(3)).toBe(false);
	});
});

describe("controlGroupLabels", () => {
	it("joins sorted slots per unit", () => {
		const groups = createControlGroups();
		groups.set(3, ["a"]);
		groups.set(1, ["a", "b"]);
		const labels = controlGroupLabels(groups);
		expect(labels.get("a")).toBe("1,3");
		expect(labels.get("b")).toBe("1");
		expect(labels.has("c")).toBe(false);
	});
});
