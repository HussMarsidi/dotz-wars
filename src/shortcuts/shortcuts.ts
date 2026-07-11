/**
 * Central shortcut registry — add bindings here to keep keys easy to audit.
 * Keys are lowercase `KeyboardEvent.key` values.
 *
 * Control groups (1–9): digit alone selects; Cmd/Ctrl+digit assigns.
 */

export type ShortcutAction = "setSelectMode" | "setPanMode" | "clearSelection";

export type ShortcutBinding = {
	readonly key: string;
	readonly action: ShortcutAction;
	readonly label: string;
};

export const SHORTCUT_BINDINGS: readonly ShortcutBinding[] = [
	{ key: "a", action: "setSelectMode", label: "Select" },
	{ key: "s", action: "setPanMode", label: "Drag" },
	{ key: "escape", action: "clearSelection", label: "Deselect" },
] as const;

export type ShortcutHandlers = {
	readonly [K in ShortcutAction]: () => void;
};

export type ControlGroupShortcutHandlers = {
	readonly assignGroup: (slot: number) => void;
	readonly selectGroup: (slot: number) => void;
};

function isEditableTarget(target: EventTarget | null): boolean {
	return (
		target instanceof HTMLElement &&
		(target.tagName === "INPUT" ||
			target.tagName === "TEXTAREA" ||
			target.isContentEditable)
	);
}

function parseDigitSlot(key: string): number | null {
	if (key.length !== 1) {
		return null;
	}
	const slot = Number(key);
	if (!Number.isInteger(slot) || slot < 1 || slot > 9) {
		return null;
	}
	return slot;
}

/** Listen for registered shortcuts. Ignores events from editable fields. */
export function attachShortcuts(
	handlers: ShortcutHandlers,
	controlGroups?: ControlGroupShortcutHandlers,
): () => void {
	const byKey = new Map(
		SHORTCUT_BINDINGS.map((binding) => [binding.key, binding.action]),
	);

	const onKeyDown = (event: KeyboardEvent) => {
		if (isEditableTarget(event.target)) {
			return;
		}

		const slot = parseDigitSlot(event.key);
		if (slot !== null && controlGroups !== undefined) {
			if (event.altKey || event.shiftKey) {
				return;
			}
			event.preventDefault();
			if (event.metaKey || event.ctrlKey) {
				controlGroups.assignGroup(slot);
			} else {
				controlGroups.selectGroup(slot);
			}
			return;
		}

		if (event.metaKey || event.ctrlKey || event.altKey) {
			return;
		}

		const action = byKey.get(event.key.toLowerCase());
		if (action === undefined) {
			return;
		}
		event.preventDefault();
		handlers[action]();
	};

	window.addEventListener("keydown", onKeyDown);
	return () => {
		window.removeEventListener("keydown", onKeyDown);
	};
}
