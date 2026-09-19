import type { ReadroomAttachment, ReadroomPerson, Readroom, ReadroomNote } from "./readrooms";
import type { ReadroomDraft } from "./datetime";

// The readroom's session memory: the mock state outlives the route remount
// (the feed unmounts when a task opens) and dies with the page reload. The
// overlays live beside the fixtures: a task's base facts never change, the
// session's notes, edits, deletions, write-up, deadline move and stop layer on
// top. Phase 5 replaces these methods with server actions; the signatures stay.
//
// The effective task has two channels: `sessionReadroom` over a base Readroom
// (facts that belong to the type) and `readroomStateOf(...).attachments` (the
// mock's blob URLs, which the Readroom type does not carry). Consumers of an
// open task read both — see ReadroomView.

export type ReadroomReport = {
  body: string;
  at: string;
};

export type ReadroomTaskState = {
  addedNotes: readonly ReadroomNote[];
  // Edited note bodies, keyed by note id: the marker and the render read this
  // map (a session note lives in addedNotes and is edited through it too).
  noteEdits: ReadonlyMap<string, string>;
  // Deleted notes (a fixture's or a session's): the author removes their own
  // contribution while the cycle collects, then may post a fresh one.
  deletedNotes: ReadonlySet<string>;
  // Attached files: the mock storage's blob URLs (see ./attachments). Not part
  // of `sessionReadroom` — an open task reads them from here.
  attachments: readonly ReadroomAttachment[];
  report?: ReadroomReport;
  deadlineAt?: string;
  archivedAt?: string;
};

export type ReadroomState = {
  tasks: Readonly<Record<string, ReadroomTaskState>>;
  addedReadrooms: readonly Readroom[];
};

export const EMPTY_TASK_STATE: ReadroomTaskState = {
  addedNotes: [],
  noteEdits: new Map(),
  deletedNotes: new Set(),
  attachments: [],
};

const INITIAL_READROOM_STATE: ReadroomState = { tasks: {}, addedReadrooms: [] };

const LOCAL_READROOM_ID_PREFIX = "local-readroom-";
const LOCAL_NOTE_ID_PREFIX = "local-note-";

function localId(prefix: string): string {
  return `${prefix}${crypto.randomUUID()}`;
}

let state: ReadroomState = INITIAL_READROOM_STATE;
const listeners = new Set<() => void>();

function setState(next: ReadroomState): void {
  state = next;
  for (const listener of listeners) listener();
}

function taskStateOf(readroomId: string): ReadroomTaskState {
  return state.tasks[readroomId] ?? EMPTY_TASK_STATE;
}

function updateTask(
  readroomId: string,
  patch: (current: ReadroomTaskState) => ReadroomTaskState,
): void {
  setState({
    ...state,
    tasks: { ...state.tasks, [readroomId]: patch(taskStateOf(readroomId)) },
  });
}

/** A session note: authored by the logged-on member, stamped now. */
export function addNote(readroomId: string, body: string, author: ReadroomPerson): ReadroomNote {
  const note: ReadroomNote = {
    id: localId(LOCAL_NOTE_ID_PREFIX),
    author,
    body,
    createdAt: new Date().toISOString(),
  };
  updateTask(readroomId, (current) => ({ ...current, addedNotes: [...current.addedNotes, note] }));
  return note;
}

export function editNote(readroomId: string, noteId: string, body: string): void {
  updateTask(readroomId, (current) => {
    const noteEdits = new Map(current.noteEdits);
    noteEdits.set(noteId, body);
    return { ...current, noteEdits };
  });
}

/** The author removes their note: it leaves the task (and its sealed count),
 * and the one-note gate reopens. */
export function deleteNote(readroomId: string, noteId: string): void {
  updateTask(readroomId, (current) => {
    const deletedNotes = new Set(current.deletedNotes);
    deletedNotes.add(noteId);
    return { ...current, deletedNotes };
  });
}

/** The lead's attachment batch: the picked files join the task's source
 * materials (the mock's blob URLs live one SPA session). */
export function addAttachments(
  readroomId: string,
  attachments: readonly ReadroomAttachment[],
): void {
  if (attachments.length === 0) return;
  updateTask(readroomId, (current) => ({
    ...current,
    attachments: [...current.attachments, ...attachments],
  }));
}

export function removeAttachment(readroomId: string, attachmentId: string): void {
  updateTask(readroomId, (current) => ({
    ...current,
    attachments: current.attachments.filter((attachment) => attachment.id !== attachmentId),
  }));
}

/** The lead's write-up: the report fact appears, the phase projects to
 * published. */
export function publishReport(readroomId: string, body: string): void {
  updateTask(readroomId, (current) => ({
    ...current,
    report: { body, at: new Date().toISOString() },
  }));
}

/** The lead's deadline move: notes reopen or close by the new instant. */
export function moveDeadline(readroomId: string, deadlineAt: string): void {
  updateTask(readroomId, (current) => ({ ...current, deadlineAt }));
}

/** The lead's stop: an archive without a report (READROOM.md §7). */
export function stopReadroom(readroomId: string): void {
  updateTask(readroomId, (current) => ({ ...current, archivedAt: new Date().toISOString() }));
}

/** A task opened in this session: the lead is its author, no notes yet. */
export function createReadroom(draft: ReadroomDraft, lead: ReadroomPerson): Readroom {
  const readroom: Readroom = {
    id: localId(LOCAL_READROOM_ID_PREFIX),
    title: draft.title,
    tags: draft.tags,
    description: draft.description,
    ...(draft.sourceUrl === undefined ? {} : { sourceUrl: draft.sourceUrl }),
    ...(draft.ticket === undefined ? {} : { ticket: draft.ticket }),
    lead,
    createdAt: new Date().toISOString(),
    deadlineAt: draft.deadlineAt,
    notes: [],
  };
  const tasks =
    draft.attachments.length === 0
      ? state.tasks
      : {
          ...state.tasks,
          [readroom.id]: { ...EMPTY_TASK_STATE, attachments: draft.attachments },
        };
  setState({ ...state, addedReadrooms: [...state.addedReadrooms, readroom], tasks });
  return readroom;
}

/** The effective task: the base facts overlaid with the session's facts. Over
 * an unchanged task this returns the base object, so identity marks the
 * untouched fixtures (the RSC-rendered bodies stay theirs). */
export function sessionReadroom(readroom: Readroom, snapshot: ReadroomState): Readroom {
  const task = snapshot.tasks[readroom.id];
  if (task === undefined) return readroom;
  const notes = [...readroom.notes, ...task.addedNotes]
    .filter((note) => !task.deletedNotes.has(note.id))
    .map((note) => {
      const body = task.noteEdits.get(note.id);
      return body === undefined ? note : { ...note, body };
    });
  return {
    ...readroom,
    deadlineAt: task.deadlineAt ?? readroom.deadlineAt,
    ...(task.report === undefined ? {} : { report: task.report.body, reportAt: task.report.at }),
    ...(task.archivedAt === undefined ? {} : { archivedAt: task.archivedAt }),
    notes,
  };
}

/** The feed's view: the fixtures and the composed tasks, each overlaid. */
export function withSession(readrooms: readonly Readroom[], snapshot: ReadroomState): Readroom[] {
  return readrooms.map((readroom) => sessionReadroom(readroom, snapshot));
}

export function readroomStateOf(snapshot: ReadroomState, readroomId: string): ReadroomTaskState {
  return snapshot.tasks[readroomId] ?? EMPTY_TASK_STATE;
}

export function subscribeReadroom(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function readroomSnapshot(): ReadroomState {
  return state;
}

export function readroomServerSnapshot(): ReadroomState {
  return INITIAL_READROOM_STATE;
}

/** Tests only: drop the session memory back to its initial snapshot. */
export function resetReadroomStore(): void {
  setState(INITIAL_READROOM_STATE);
}
