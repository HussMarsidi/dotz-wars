import {
	FORMATION_SHAPES,
	type FormationShape,
	formationShapeLabel,
} from "../formation/types";

export type FormationMenuHandlers = {
	readonly onPickShape: (shape: FormationShape) => void;
	readonly onFace: () => void;
	readonly onBreak: () => void;
	readonly onClose: () => void;
};

export type FormationMenuController = {
	readonly sync: (options: {
		readonly visible: boolean;
		readonly status: string;
		readonly activeShape: FormationShape | null;
		readonly canPickShape: boolean;
		readonly canFace: boolean;
		readonly canBreak: boolean;
	}) => void;
	readonly hide: () => void;
	readonly isOpen: () => boolean;
	readonly destroy: () => void;
};

/**
 * Persistent formation HUD while a relevant selection is active.
 * Shows current shape, Face (re-aim), shape switch, Break.
 */
export function mountFormationMenu(
	host: HTMLElement,
	handlers: FormationMenuHandlers,
): FormationMenuController {
	const panel = document.createElement("div");
	panel.className = "formation-menu";
	panel.hidden = true;

	const title = document.createElement("div");
	title.className = "formation-menu__title";
	title.textContent = "Formation";

	const status = document.createElement("div");
	status.className = "formation-menu__status";
	status.textContent = "No formation";

	const shapesRow = document.createElement("div");
	shapesRow.className = "formation-menu__row";

	const shapeButtons = new Map<FormationShape, HTMLButtonElement>();
	for (const shape of FORMATION_SHAPES) {
		const button = document.createElement("button");
		button.type = "button";
		button.dataset.shape = shape;
		button.textContent = formationShapeLabel(shape);
		button.addEventListener("click", () => {
			if (button.disabled) {
				return;
			}
			handlers.onPickShape(shape);
		});
		shapeButtons.set(shape, button);
		shapesRow.appendChild(button);
	}

	const actionsRow = document.createElement("div");
	actionsRow.className = "formation-menu__row";

	const faceBtn = document.createElement("button");
	faceBtn.type = "button";
	faceBtn.textContent = "Face (⌘F)";
	faceBtn.addEventListener("click", () => {
		if (faceBtn.disabled) {
			return;
		}
		handlers.onFace();
	});

	const breakBtn = document.createElement("button");
	breakBtn.type = "button";
	breakBtn.textContent = "Break";
	breakBtn.addEventListener("click", () => {
		if (breakBtn.disabled) {
			return;
		}
		handlers.onBreak();
	});

	const closeBtn = document.createElement("button");
	closeBtn.type = "button";
	closeBtn.textContent = "Close";
	closeBtn.addEventListener("click", () => handlers.onClose());

	actionsRow.append(faceBtn, breakBtn, closeBtn);
	panel.append(title, status, shapesRow, actionsRow);
	host.appendChild(panel);

	return {
		sync({
			visible,
			status: statusText,
			activeShape,
			canPickShape,
			canFace,
			canBreak,
		}) {
			status.textContent = statusText;
			for (const [shape, button] of shapeButtons) {
				button.disabled = !canPickShape;
				button.classList.toggle("is-active", shape === activeShape);
			}
			faceBtn.disabled = !canFace;
			breakBtn.disabled = !canBreak;
			panel.hidden = !visible;
		},
		hide() {
			panel.hidden = true;
		},
		isOpen() {
			return !panel.hidden;
		},
		destroy() {
			panel.remove();
		},
	};
}
