import {
	createFormationRegistry,
	expandSelectionToFormations,
	type FormationShape,
	formationCentroid,
	formationShapeLabel,
	issueFormationMove,
	normalizeFacing,
	selectedUnitIds,
	soleSelectedFormation,
	spacingForShape,
} from "./formation";
import {
	attachPointerInput,
	type PointerGesture,
	type PointerMode,
} from "./input/input";
import type { FormationPreview } from "./render/formation-preview";
import { Renderer } from "./render/renderer";
import {
	CAMERA_ZOOM_WHEEL_FACTOR,
	CLICK_DRAG_THRESHOLD,
	DOT_RADIUS,
	TICK_DT,
} from "./shared/config";
import type { GameState } from "./shared/game-state";
import type { DotId, Rect, Vec2 } from "./shared/types";
import { attachShortcuts } from "./shortcuts";
import {
	assignControlGroup,
	controlGroupLabels,
	createControlGroups,
	isControlGroupSlot,
	selectControlGroup,
} from "./sim/control-groups";
import {
	applyClickSelection,
	applyMarqueeSelection,
	clearSelection,
	findUnitAtPoint,
	selectAllSameType,
	selectUnitsInRect,
} from "./sim/selection";
import { createInitialState } from "./sim/state";
import {
	interpolateState,
	issueMoveOrder,
	stateHasSelection,
	step,
} from "./sim/step";
import { mountFormationMenu } from "./ui/formation-menu";
import { mountGoldHud } from "./ui/gold-hud";
import { mountToolbar } from "./ui/toolbar";

type FacingDraft = {
	readonly mode: "create" | "reface";
	readonly shape: FormationShape;
	readonly memberIds: readonly DotId[];
	readonly formationId: string | null;
	readonly spacing: number;
	anchor: Vec2;
	facing: Vec2;
};

async function main(): Promise<void> {
	const host = document.getElementById("app");
	if (host === null) {
		throw new Error("#app mount point missing");
	}

	let previous: GameState = createInitialState();
	let current: GameState = previous;
	let accumulator = 0;
	let marquee: Rect | null = null;
	let mode: PointerMode = "select";
	let gesture: PointerGesture = "normal";
	let facingDraft: FacingDraft | null = null;
	let formationPreview: FormationPreview | null = null;
	const controlGroups = createControlGroups();
	const formations = createFormationRegistry();

	const renderer = await Renderer.create(host);
	const map = renderer.map;

	const livingIds = () =>
		new Set(
			current.units.filter((unit) => unit.isAlive).map((unit) => unit.id),
		);

	const syncFormationHud = () => {
		const ids = selectedUnitIds(current);
		const sole = soleSelectedFormation(current, formations);
		if (ids.length === 0) {
			formationMenu.hide();
			return;
		}
		if (sole !== null) {
			formationMenu.sync({
				visible: true,
				status: `${formationShapeLabel(sole.shape)} · ${ids.length} units`,
				activeShape: sole.shape,
				canPickShape: true,
				canFace: true,
				canBreak: true,
			});
			return;
		}
		formationMenu.sync({
			visible: true,
			status:
				ids.length >= 2
					? "Pick a shape, then drag facing on the map"
					: "Select 2+ units to form up",
			activeShape: null,
			canPickShape: ids.length >= 2,
			canFace: false,
			canBreak: false,
		});
	};

	const redraw = (alpha = 1) => {
		formations.pruneToLiving(livingIds());
		const viewState =
			alpha >= 1 ? current : interpolateState(previous, current, alpha);
		renderer.sync(
			viewState,
			marquee,
			controlGroupLabels(controlGroups),
			formationPreview,
			formations.labelsByUnit(),
		);
		goldHud.sync(viewState.gold);
		if (gesture !== "formationFacing") {
			syncFormationHud();
		}
	};

	const setMode = (next: PointerMode) => {
		mode = next;
		toolbar.setMode(next);
		if (gesture !== "formationFacing") {
			renderer.canvas.style.cursor = next === "pan" ? "grab" : "default";
		}
	};

	const setGesture = (next: PointerGesture) => {
		gesture = next;
		host.dataset.formationFacing = next === "formationFacing" ? "1" : "0";
		if (next === "formationFacing") {
			renderer.canvas.style.cursor = "crosshair";
		} else if (mode === "pan") {
			renderer.canvas.style.cursor = "grab";
		} else {
			renderer.canvas.style.cursor = "default";
		}
	};

	const clearFacingDraft = () => {
		facingDraft = null;
		formationPreview = null;
		setGesture("normal");
	};

	const beginFacingDraft = (draft: FacingDraft) => {
		facingDraft = draft;
		setGesture("formationFacing");
		formationMenu.sync({
			visible: true,
			status:
				draft.mode === "reface"
					? "Hold-drag to set facing, release to apply"
					: "Hold-drag on map: place + facing, release to form",
			activeShape: draft.shape,
			canPickShape: false,
			canFace: false,
			canBreak: false,
		});
		redraw();
	};

	const startReface = () => {
		const sole = soleSelectedFormation(current, formations);
		if (sole === null) {
			return;
		}
		const centroid = formationCentroid(current, sole) ?? {
			x: 0,
			y: 0,
		};
		beginFacingDraft({
			mode: "reface",
			shape: sole.shape,
			memberIds: sole.memberIds,
			formationId: sole.id,
			spacing: sole.spacing,
			anchor: centroid,
			facing: sole.facing,
		});
		formationPreview = {
			shape: sole.shape,
			count: sole.memberIds.length,
			spacing: sole.spacing,
			anchor: centroid,
			facing: sole.facing,
		};
		redraw();
	};

	const reshapeInPlace = (shape: FormationShape) => {
		const sole = soleSelectedFormation(current, formations);
		if (sole === null) {
			return;
		}
		formations.updateShape(sole.id, shape);
		const updated = formations.get(sole.id);
		if (updated === undefined) {
			return;
		}
		const centroid = formationCentroid(current, updated);
		if (centroid === null) {
			return;
		}
		previous = current;
		current = issueFormationMove(
			current,
			formations,
			updated,
			centroid,
			map,
			DOT_RADIUS,
			updated.facing,
			{ assemble: true },
		);
		redraw();
	};

	const deselectAll = () => {
		marquee = null;
		formationMenu.hide();
		clearFacingDraft();
		previous = current;
		current = clearSelection(current);
		redraw();
	};

	const toolbar = mountToolbar(host, {
		onModeChange: setMode,
		onClearSelection: deselectAll,
	});

	const goldHud = mountGoldHud(host);

	const formationMenu = mountFormationMenu(host, {
		onPickShape: (shape) => {
			const sole = soleSelectedFormation(current, formations);
			if (sole !== null) {
				if (sole.shape === shape) {
					startReface();
					return;
				}
				reshapeInPlace(shape);
				return;
			}
			const ids = selectedUnitIds(current);
			if (ids.length < 2) {
				syncFormationHud();
				return;
			}
			beginFacingDraft({
				mode: "create",
				shape,
				memberIds: ids,
				formationId: null,
				spacing: spacingForShape(shape),
				anchor: { x: 0, y: 0 },
				facing: { x: 1, y: 0 },
			});
		},
		onFace: () => {
			startReface();
		},
		onBreak: () => {
			formations.breakSelected(new Set(selectedUnitIds(current)));
			clearFacingDraft();
			redraw();
		},
		onClose: () => {
			formationMenu.hide();
			clearFacingDraft();
			redraw();
		},
	});

	attachShortcuts(
		{
			setSelectMode: () => setMode("select"),
			setPanMode: () => setMode("pan"),
			clearSelection: deselectAll,
		},
		{
			assignGroup: (slot) => {
				if (!isControlGroupSlot(slot)) {
					return;
				}
				assignControlGroup(controlGroups, slot, current);
				redraw();
			},
			selectGroup: (slot) => {
				if (!isControlGroupSlot(slot)) {
					return;
				}
				marquee = null;
				const next = selectControlGroup(current, controlGroups, slot);
				if (next === current) {
					return;
				}
				previous = current;
				current = next;
				redraw();
			},
		},
		{
			selectAllSameType: () => {
				marquee = null;
				const same = selectAllSameType(current);
				const expanded = expandSelectionToFormations(
					same,
					formations,
					new Set(selectedUnitIds(same)),
				);
				if (expanded === current) {
					return;
				}
				previous = current;
				current = expanded;
				redraw();
			},
			openFormationMenu: () => {
				if (selectedUnitIds(current).length === 0) {
					return;
				}
				clearFacingDraft();
				syncFormationHud();
			},
			breakFormation: () => {
				formations.breakSelected(new Set(selectedUnitIds(current)));
				clearFacingDraft();
				redraw();
			},
			faceFormation: () => {
				startReface();
			},
		},
	);

	attachPointerInput({
		canvas: renderer.canvas,
		camera: renderer.camera,
		getMode: () => mode,
		getGesture: () => gesture,
		clickThresholdWorld: CLICK_DRAG_THRESHOLD,
		zoomWheelFactor: CAMERA_ZOOM_WHEEL_FACTOR,
		handlers: {
			onClick: (position) => {
				marquee = null;

				if (stateHasSelection(current)) {
					const hit = findUnitAtPoint(current.units, position, DOT_RADIUS);
					if (hit === null) {
						const formation = soleSelectedFormation(current, formations);
						const next =
							formation === null
								? issueMoveOrder(current, position, map, DOT_RADIUS, "move")
								: issueFormationMove(
										current,
										formations,
										formation,
										position,
										map,
										DOT_RADIUS,
									);
						previous = current;
						current = next;
						redraw();
						return;
					}

					const selectedEnemyOfHit = current.units.some(
						(unit) => unit.selected && unit.teamId !== hit.teamId,
					);
					if (selectedEnemyOfHit) {
						const next = issueMoveOrder(
							current,
							hit.position,
							map,
							DOT_RADIUS,
							"attack",
						);
						previous = current;
						current = next;
						redraw();
						return;
					}
				}

				previous = current;
				const clicked = applyClickSelection(current, position, DOT_RADIUS);
				current = expandSelectionToFormations(
					clicked,
					formations,
					new Set(selectedUnitIds(clicked)),
				);
				redraw();
			},
			onMarquee: (rect) => {
				marquee = rect;
				previous = current;
				const boxed = applyMarqueeSelection(current, rect, DOT_RADIUS);
				current = expandSelectionToFormations(
					boxed,
					formations,
					selectUnitsInRect(current.units, rect, DOT_RADIUS),
				);
				redraw();
			},
			onMarqueeEnd: (rect) => {
				marquee = null;
				previous = current;
				const boxed = applyMarqueeSelection(current, rect, DOT_RADIUS);
				current = expandSelectionToFormations(
					boxed,
					formations,
					selectUnitsInRect(current.units, rect, DOT_RADIUS),
				);
				redraw();
			},
			onPan: (delta) => {
				renderer.camera.panScreen(delta.x, delta.y);
				renderer.applyCamera();
			},
			onZoom: (screen, factor) => {
				renderer.camera.zoomAt(screen, factor);
				renderer.applyCamera();
			},
			onFormationFacingStart: (anchor) => {
				if (facingDraft === null) {
					return;
				}
				if (facingDraft.mode === "reface") {
					const sole =
						facingDraft.formationId === null
							? undefined
							: formations.get(facingDraft.formationId);
					const centroid =
						sole === undefined ? null : formationCentroid(current, sole);
					facingDraft.anchor = centroid ?? anchor;
					facingDraft.facing = sole?.facing ?? { x: 1, y: 0 };
				} else {
					facingDraft.anchor = anchor;
					facingDraft.facing = { x: 1, y: 0 };
				}
				formationPreview = {
					shape: facingDraft.shape,
					count: facingDraft.memberIds.length,
					spacing: facingDraft.spacing,
					anchor: facingDraft.anchor,
					facing: facingDraft.facing,
				};
				redraw();
			},
			onFormationFacingMove: (anchor, currentPos) => {
				if (facingDraft === null) {
					return;
				}
				const origin =
					facingDraft.mode === "reface" ? facingDraft.anchor : anchor;
				const facing = normalizeFacing({
					x: currentPos.x - origin.x,
					y: currentPos.y - origin.y,
				});
				if (facingDraft.mode === "create") {
					facingDraft.anchor = anchor;
				}
				facingDraft.facing = facing;
				formationPreview = {
					shape: facingDraft.shape,
					count: facingDraft.memberIds.length,
					spacing: facingDraft.spacing,
					anchor: facingDraft.anchor,
					facing,
				};
				redraw();
			},
			onFormationFacingEnd: (anchor, currentPos) => {
				if (facingDraft === null) {
					return;
				}
				const origin =
					facingDraft.mode === "reface" ? facingDraft.anchor : anchor;
				const facing = normalizeFacing({
					x: currentPos.x - origin.x,
					y: currentPos.y - origin.y,
				});
				const place =
					facingDraft.mode === "reface" ? facingDraft.anchor : anchor;
				const { mode: draftMode, shape, memberIds, formationId } = facingDraft;

				if (draftMode === "reface" && formationId !== null) {
					formations.updateFacing(formationId, facing);
					const formation = formations.get(formationId);
					clearFacingDraft();
					if (formation !== undefined) {
						previous = current;
						current = issueFormationMove(
							current,
							formations,
							formation,
							place,
							map,
							DOT_RADIUS,
							facing,
							{ assemble: true },
						);
					}
					redraw();
					return;
				}

				const formation = formations.create(shape, memberIds, facing);
				clearFacingDraft();
				previous = current;
				current = issueFormationMove(
					current,
					formations,
					formation,
					place,
					map,
					DOT_RADIUS,
					facing,
					{ assemble: true },
				);
				redraw();
			},
			onFormationFacingCancel: () => {
				clearFacingDraft();
				redraw();
			},
		},
	});

	let lastTime = performance.now();
	renderer.app.ticker.add(() => {
		const now = performance.now();
		const frameDt = Math.min((now - lastTime) / 1000, 0.25);
		lastTime = now;

		accumulator += frameDt;
		while (accumulator >= TICK_DT) {
			previous = current;
			current = step(current, map, DOT_RADIUS, TICK_DT, formations);
			accumulator -= TICK_DT;
		}

		redraw(accumulator / TICK_DT);
	});

	setMode("select");
	redraw();
}

void main();
