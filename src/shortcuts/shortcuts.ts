/**
 * Central shortcut registry — add bindings here to keep keys easy to audit.
 * Keys are lowercase `KeyboardEvent.key` values.
 *
 * Control groups (1–9): digit alone selects; Cmd/Ctrl+digit assigns.
 * Cmd/Ctrl+A: select all units of the same type(s) as the current selection.
 * Cmd/Ctrl+D: open formation menu; Cmd/Ctrl+Shift+D: break; Cmd/Ctrl+F: face.
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

export type ExtraShortcutHandlers = {
	readonly selectAllSameType: () => void;
	readonly openFormationMenu?: () => void;
	readonly breakFormation?: () => void;
	readonly faceFormation?: () => void;
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
	extra?: ExtraShortcutHandlers,
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

		if (
			extra !== undefined &&
			(event.metaKey || event.ctrlKey) &&
			!event.altKey &&
			event.key.toLowerCase() === "d"
		) {
			event.preventDefault();
			if (event.shiftKey) {
				extra.breakFormation?.();
			} else {
				extra.openFormationMenu?.();
			}
			return;
		}

		if (
			extra !== undefined &&
			(event.metaKey || event.ctrlKey) &&
			!event.altKey &&
			!event.shiftKey &&
			event.key.toLowerCase() === "f"
		) {
			event.preventDefault();
			extra.faceFormation?.();
			return;
		}

		if (
			extra !== undefined &&
			(event.metaKey || event.ctrlKey) &&
			!event.altKey &&
			!event.shiftKey &&
			event.key.toLowerCase() === "a"
		) {
			event.preventDefault();
			extra.selectAllSameType();
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
