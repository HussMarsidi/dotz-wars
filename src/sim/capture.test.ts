import { describe, expect, it } from "vitest";
import { createCity } from "../cities";
import { CITY_CAPTURE_DURATION } from "../shared/config";
import { Grunt } from "../units";
import { checkCityWinner, inCaptureBox, tickCapture } from "./capture";

describe("inCaptureBox", () => {
	it("includes points inside the capture half-extent", () => {
		const city = createCity("c", "blue", { x: 100, y: 100 }, "N");
		expect(inCaptureBox(city, { x: 100, y: 100 })).toBe(true);
		expect(inCaptureBox(city, { x: 200, y: 100 })).toBe(true);
		expect(inCaptureBox(city, { x: 201, y: 100 })).toBe(false);
	});
});

describe("tickCapture", () => {
	it("does not progress while a defender is in the box", () => {
		const city = createCity("c", "blue", { x: 0, y: 0 }, "N");
		const defender = Grunt.spawn("d", "blue", { x: 10, y: 0 });
		const attacker = Grunt.spawn("a", "red", { x: 20, y: 0 });
		const next = tickCapture([city], [defender, attacker], 0.5);
		expect(next[0]?.captureProgress).toBe(0);
		expect(next[0]?.teamId).toBe("blue");
	});

	it("progresses when undefended and an enemy holds the box", () => {
		const city = createCity("c", "blue", { x: 0, y: 0 }, "N");
		const attacker = Grunt.spawn("a", "red", { x: 10, y: 0 });
		const next = tickCapture([city], [attacker], 0.5);
		expect(next[0]?.captureProgress).toBeCloseTo(0.5);
		expect(next[0]?.capturingTeamId).toBe("red");
		expect(next[0]?.teamId).toBe("blue");
	});

	it("flips ownership after CITY_CAPTURE_DURATION", () => {
		const city = createCity("c", "blue", { x: 0, y: 0 }, "N");
		const attacker = Grunt.spawn("a", "red", { x: 10, y: 0 });
		const next = tickCapture([city], [attacker], CITY_CAPTURE_DURATION);
		expect(next[0]?.teamId).toBe("red");
		expect(next[0]?.captureProgress).toBe(0);
		expect(next[0]?.capturingTeamId).toBeNull();
	});

	it("resets progress when the capturer leaves", () => {
		const city = {
			...createCity("c", "blue", { x: 0, y: 0 }, "N"),
			captureProgress: 0.8,
			capturingTeamId: "red" as const,
		};
		const next = tickCapture([city], [], 0.1);
		expect(next[0]?.captureProgress).toBe(0);
		expect(next[0]?.capturingTeamId).toBeNull();
	});

	it("allows recapture after a flip", () => {
		const city = createCity("c", "red", { x: 0, y: 0 }, "N");
		const attacker = Grunt.spawn("a", "blue", { x: 5, y: 0 });
		const next = tickCapture([city], [attacker], CITY_CAPTURE_DURATION);
		expect(next[0]?.teamId).toBe("blue");
	});
});

describe("checkCityWinner", () => {
	it("requires every city to share one owner", () => {
		expect(
			checkCityWinner([
				createCity("a", "red", { x: 0, y: 0 }, "A"),
				createCity("b", "red", { x: 1, y: 0 }, "B"),
			]),
		).toBe("red");
		expect(
			checkCityWinner([
				createCity("a", "red", { x: 0, y: 0 }, "A"),
				createCity("b", "blue", { x: 1, y: 0 }, "B"),
			]),
		).toBeNull();
	});
});
