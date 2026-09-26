// The inbox's contract: the only surface other features import. It is a
// manifest, not an implementation: explicit re-exports of the slice's
// internals, nothing else. Only leaves without cross-feature imports live
// here — pages that read other contracts stay out, or the barrel would loop
// the slice graph (see AGENTS.md). The contract test pins the published list.
//
// Task 09 (section events → inbox) is the consumer: it builds InboxEvent
// values and posts them with enqueueInboxEvent. The rest of the model and the
// store stay internal — the inbox UI owns read and delete actions.

export { enqueueInboxEvent } from "../inbox-store";
export type {
  InboxEvent,
  InboxKind,
  InboxNotification,
  InboxTarget,
  InboxTargetKind,
} from "../inbox";
