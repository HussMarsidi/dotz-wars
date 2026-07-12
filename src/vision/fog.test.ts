import { describe, expect, it } from "vitest";
import { createCity } from "../cities";
import { FOG_EXPLORED, FOG_UNEXPLORED, FOG_VISIBLE } from "../shared/config";
import { Grunt } from "../units";
import { createInitialFog, fogOf, tickFog } from "./fog";

describe("tickFog", () => {
	it("marks cells near units/cities visible and remembers explored", () => {
		const fog0 = createInitialFog(400, 400, 32);
		const city = createCity("c", "blue", { x: 50, y: 50 }, "N");
		const unit = Grunt.spawn("u", "blue", { x: 50, y: 50 });
		const fog1 = tickFog(fog0, [city], [unit]);
		const cells = fogOf(fog1, "blue").cells;
		const idx = Math.floor(50 / 32) + Math.floor(50 / 32) * fogOf(fog1, "blue").cols;
		expect(cells[idx]).toBe(FOG_VISIBLE);

		const fog2 = tickFog(fog1, [], []);
		expect(fogOf(fog2, "blue").cells[idx]).toBe(FOG_EXPLORED);
		const far = fogOf(fog2, "blue").cols * fogOf(fog2, "blue").rows - 1;
		expect(fogOf(fog2, "blue").cells[far]).toBe(FOG_UNEXPLORED);
	});
});
