import { Container, Graphics, Text } from "pixi.js";
import type { City } from "../cities";
import {
	CITY_CAPTURE_DURATION,
	CITY_CAPTURE_HALF,
	CITY_CAPTURE_PROGRESS_COLOR,
	CITY_CAPTURE_PROGRESS_WIDTH,
	CITY_LABEL_COLOR,
	CITY_SIZE,
	CITY_ZONE_STROKE_ALPHA,
	CITY_ZONE_STROKE_COLOR,
	CITY_ZONE_STROKE_WIDTH,
	SELECTION_RING_COLOR,
	SELECTION_RING_WIDTH,
	TEAM_COLORS,
} from "../shared/config";

export type CityView = {
	readonly root: Container;
	readonly zone: Graphics;
	readonly body: Graphics;
	readonly progress: Graphics;
	readonly selection: Graphics;
	readonly label: Text;
};

/** Maps a sim city → a view container. Render-only; never mutates sim. */
export function createCityView(city: City): CityView {
	const root = new Container();
	const zone = new Graphics();
	const body = new Graphics();
	const progress = new Graphics();
	const selection = new Graphics();
	const label = new Text({
		text: city.label,
		style: {
			fontFamily: "ui-sans-serif, system-ui, sans-serif",
			fontSize: 16,
			fontWeight: "700",
			fill: CITY_LABEL_COLOR,
			align: "center",
		},
	});
	label.anchor.set(0.5);
	root.addChild(zone);
	root.addChild(body);
	root.addChild(progress);
	root.addChild(selection);
	root.addChild(label);
	const view = { root, zone, body, progress, selection, label };
	syncCityView(view, city, false);
	return view;
}

export function syncCityView(
	view: CityView,
	city: City,
	selected: boolean,
): void {
	const half = CITY_SIZE / 2;
	const fill = TEAM_COLORS[city.teamId];

	view.zone.clear();
	view.zone
		.rect(
			-CITY_CAPTURE_HALF,
			-CITY_CAPTURE_HALF,
			CITY_CAPTURE_HALF * 2,
			CITY_CAPTURE_HALF * 2,
		)
		.stroke({
			width: CITY_ZONE_STROKE_WIDTH,
			color: CITY_ZONE_STROKE_COLOR,
			alpha: CITY_ZONE_STROKE_ALPHA,
		});

	view.body.clear();
	view.body.rect(-half, -half, CITY_SIZE, CITY_SIZE).fill(fill);

	view.progress.clear();
	const ratio = Math.max(
		0,
		Math.min(1, city.captureProgress / CITY_CAPTURE_DURATION),
	);
	if (ratio > 0) {
		drawCaptureProgress(view.progress, ratio);
	}

	view.selection.clear();
	if (selected) {
		view.selection
			.rect(
				-CITY_CAPTURE_HALF,
				-CITY_CAPTURE_HALF,
				CITY_CAPTURE_HALF * 2,
				CITY_CAPTURE_HALF * 2,
			)
			.stroke({
				width: SELECTION_RING_WIDTH + 1,
				color: SELECTION_RING_COLOR,
				alpha: 0.95,
			});
	}

	view.label.text = city.label;
	view.root.position.set(city.position.x, city.position.y);
}

/** Draws a progress stroke clockwise around the capture box perimeter. */
function drawCaptureProgress(gfx: Graphics, ratio: number): void {
	const half = CITY_CAPTURE_HALF;
	const edgeLen = half * 2;
	let remaining = edgeLen * 4 * ratio;

	const edges: readonly (readonly [number, number, number, number])[] = [
		[-half, -half, half, -half],
		[half, -half, half, half],
		[half, half, -half, half],
		[-half, half, -half, -half],
	];

	gfx.moveTo(-half, -half);

	for (const [x0, y0, x1, y1] of edges) {
		if (remaining <= 0) {
			break;
		}
		const step = Math.min(remaining, edgeLen);
		const t = step / edgeLen;
		gfx.lineTo(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
		remaining -= step;
	}

	gfx.stroke({
		width: CITY_CAPTURE_PROGRESS_WIDTH,
		color: CITY_CAPTURE_PROGRESS_COLOR,
		alpha: 0.95,
	});
}
