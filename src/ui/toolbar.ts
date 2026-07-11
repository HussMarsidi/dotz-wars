import type { PointerMode } from "../input/input";
import { SHORTCUT_BINDINGS } from "../shortcuts";

export type ToolbarHandlers = {
	readonly onModeChange: (mode: PointerMode) => void;
	readonly onClearSelection: () => void;
};

function bindingLabel(
	action: (typeof SHORTCUT_BINDINGS)[number]["action"],
): string {
	const binding = SHORTCUT_BINDINGS.find((b) => b.action === action);
	if (binding === undefined) {
		return "";
	}
	if (binding.key === "escape") {
		return "Esc";
	}
	return binding.key.toUpperCase();
}

/**
 * Top toolbar: Select / Drag / Deselect. Labels include shortcut keys from the registry.
 */
export function mountToolbar(
	host: HTMLElement,
	handlers: ToolbarHandlers,
): {
	setMode: (mode: PointerMode) => void;
	destroy: () => void;
} {
	const bar = document.createElement("div");
	bar.id = "toolbar";
	bar.className = "toolbar";

	const selectBtn = document.createElement("button");
	selectBtn.type = "button";
	selectBtn.dataset.mode = "select";
	selectBtn.textContent = `Select (${bindingLabel("setSelectMode")})`;

	const panBtn = document.createElement("button");
	panBtn.type = "button";
	panBtn.dataset.mode = "pan";
	panBtn.textContent = `Drag (${bindingLabel("setPanMode")})`;

	const deselectBtn = document.createElement("button");
	deselectBtn.type = "button";
	deselectBtn.dataset.action = "clearSelection";
	deselectBtn.textContent = `Deselect (${bindingLabel("clearSelection")})`;

	bar.append(selectBtn, panBtn, deselectBtn);
	host.appendChild(bar);

	const modeButtons = [selectBtn, panBtn];

	const setMode = (mode: PointerMode) => {
		for (const button of modeButtons) {
			button.classList.toggle("is-active", button.dataset.mode === mode);
		}
		host.dataset.pointerMode = mode;
	};

	const onClick = (event: MouseEvent) => {
		const target = event.target;
		if (!(target instanceof HTMLButtonElement)) {
			return;
		}
		if (target.dataset.action === "clearSelection") {
			handlers.onClearSelection();
			return;
		}
		const mode = target.dataset.mode;
		if (mode !== "select" && mode !== "pan") {
			return;
		}
		setMode(mode);
		handlers.onModeChange(mode);
	};

	bar.addEventListener("click", onClick);
	setMode("select");

	return {
		setMode,
		destroy: () => {
			bar.removeEventListener("click", onClick);
			bar.remove();
		},
	};
}
