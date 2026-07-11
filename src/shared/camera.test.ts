import { describe, expect, it } from "vitest";
import { Camera } from "./camera";

describe("Camera.clampToBounds", () => {
	it("stops pan from revealing past the map edge", () => {
		const camera = new Camera();
		camera.setWorldSize(1000, 800);
		camera.setViewSize(400, 300);
		camera.zoom = 1;

		camera.x = 50;
		camera.y = 50;
		camera.clampToBounds();
		expect(camera.x).toBe(0);
		expect(camera.y).toBe(0);

		camera.x = -900;
		camera.y = -700;
		camera.clampToBounds();
		expect(camera.x).toBe(400 - 1000);
		expect(camera.y).toBe(300 - 800);
	});

	it("centers when the map fits inside the view", () => {
		const camera = new Camera();
		camera.setWorldSize(200, 100);
		camera.setViewSize(400, 300);
		camera.zoom = 1;
		camera.x = 0;
		camera.y = 0;
		camera.clampToBounds();
		expect(camera.x).toBe((400 - 200) / 2);
		expect(camera.y).toBe((300 - 100) / 2);
	});

	it("clamps after panScreen", () => {
		const camera = new Camera();
		camera.setWorldSize(1000, 800);
		camera.setViewSize(400, 300);
		camera.zoom = 1;
		camera.x = 0;
		camera.y = 0;
		camera.panScreen(100, 100);
		expect(camera.x).toBe(0);
		expect(camera.y).toBe(0);
	});
});

describe("Camera zoom limits", () => {
	it("does not zoom out past fitting the whole map", () => {
		const camera = new Camera();
		camera.setWorldSize(1000, 800);
		camera.setViewSize(400, 300);
		camera.zoom = 1;
		// fit = min(400/1000, 300/800) = 0.375
		expect(camera.minZoom()).toBeCloseTo(0.375);

		camera.zoomAt({ x: 200, y: 150 }, 0.01);
		expect(camera.zoom).toBeCloseTo(0.375);
	});

	it("does not zoom in past CAMERA_ZOOM_MAX", () => {
		const camera = new Camera();
		camera.setWorldSize(1000, 800);
		camera.setViewSize(400, 300);
		camera.zoom = 1;
		camera.zoomAt({ x: 200, y: 150 }, 100);
		expect(camera.zoom).toBe(camera.maxZoom());
	});
});
