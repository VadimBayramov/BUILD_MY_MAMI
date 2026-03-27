/**
 * Undo/Redo middleware notes.
 *
 * Current implementation uses Immer produceWithPatches directly
 * inside funnel-slice.ts (undoableUpdate helper).
 *
 * When moving to Zustand middleware pattern, this file will export
 * a `withUndoRedo` middleware wrapper that automatically captures
 * patches for any action marked as undoable.
 */

export type UndoableAction = {
  description: string;
  undoable: true;
};
