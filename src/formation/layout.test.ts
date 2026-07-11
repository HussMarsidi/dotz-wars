import { describe, expect, it } from "vitest";
import { formationSlots, normalizeFacing } from "./layout";
import { createFormationRegistry, selectionHasFormation } from "./registry";

describe("formationSlots", () => {
	it("line spreads units along the right axis, centered", () => {
		const slots = formationSlots(
			"line",
			3,
			40,
			{ x: 100, y: 100 },
			{ x: 0, y: -1 },
		);
		// facing up (-y), right is +x
		expect(slots[0]?.x).toBeCloseTo(60);
		expect(slots[1]?.x).toBeCloseTo(100);
		expect(slots[2]?.x).toBeCloseTo(140);
		expect(slots[0]?.y).toBeCloseTo(100);
	});

	it("column places later units behind the tip", () => {
		const slots = formationSlots(
			"column",
			3,
			40,
			{ x: 0, y: 0 },
			{ x: 1, y: 0 },
		);
		expect(slots[0]).toEqual({ x: 0, y: 0 });
		expect(slots[1]?.x).toBeCloseTo(-40);
		expect(slots[2]?.x).toBeCloseTo(-80);
	});

	it("wedge tip is at the anchor", () => {
		const slots = formationSlots(
			"wedge",
			3,
			40,
			{ x: 50, y: 50 },
			{ x: 0, y: -1 },
		);
		expect(slots[0]).toEqual({ x: 50, y: 50 });
		expect(slots.length).toBe(3);
	});

	it("box returns count slots", () => {
		expect(
			formationSlots("box", 5, 40, { x: 0, y: 0 }, { x: 1, y: 0 }),
		).toHaveLength(5);
	});
});

describe("normalizeFacing", () => {
	it("defaults to +x for zero vector", () => {
		expect(normalizeFacing({ x: 0, y: 0 })).toEqual({ x: 1, y: 0 });
	});
});

describe("createFormationRegistry", () => {
	it("create / break / lookup", () => {
		const registry = createFormationRegistry();
		const formation = registry.create("line", ["a", "b"], { x: 1, y: 0 });
		expect(registry.formationForUnit("a")?.id).toBe(formation.id);
		expect(selectionHasFormation(registry, ["a"])).toBe(true);
		registry.breakById(formation.id);
		expect(registry.formationForUnit("a")).toBeUndefined();
	});

	it("moving a unit into a new formation detaches it from the old one", () => {
		const registry = createFormationRegistry();
		registry.create("line", ["a", "b"], { x: 1, y: 0 });
		registry.create("wedge", ["b", "c"], { x: 0, y: 1 });
		expect(registry.formationForUnit("a")?.memberIds).toEqual(["a"]);
		expect(registry.formationForUnit("b")?.shape).toBe("wedge");
	});
});
