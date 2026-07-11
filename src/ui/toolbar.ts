import type { PointerMode } from "../input/input";
import { SHORTCUT_BINDINGS } from "../shortcuts";

export type ToolbarHandlers = {
	readonly onModeChange: (mode: PointerMode) => void;
};

/**
 * Top toolbar: Select / Drag. Labels include shortcut keys from the registry.
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

	const selectLabel =
		SHORTCUT_BINDINGS.find((b) => b.action === "setSelectMode")?.key ?? "a";
	const panLabel =
		SHORTCUT_BINDINGS.find((b) => b.action === "setPanMode")?.key ?? "s";

	const selectBtn = document.createElement("button");
	selectBtn.type = "button";
	selectBtn.dataset.mode = "select";
	selectBtn.textContent = `Select (${selectLabel.toUpperCase()})`;

	const panBtn = document.createElement("button");
	panBtn.type = "button";
	panBtn.dataset.mode = "pan";
	panBtn.textContent = `Drag (${panLabel.toUpperCase()})`;

	bar.append(selectBtn, panBtn);
	host.appendChild(bar);

	const buttons = [selectBtn, panBtn];

	const setMode = (mode: PointerMode) => {
		for (const button of buttons) {
			button.classList.toggle("is-active", button.dataset.mode === mode);
		}
		host.dataset.pointerMode = mode;
	};

	const onClick = (event: MouseEvent) => {
		const target = event.target;
		if (!(target instanceof HTMLButtonElement)) {
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
