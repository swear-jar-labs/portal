// How the board's stack was opened is only knowable from the document's own
// session: a thread pushed from the feed or the member's rows closes with
// browser back (the origin route returns), a deep-linked thread closes by
// pushing the feed. The memory keeps the exact route of the last push, not a
// flag: history can walk back to an entry that was never pushed (a deep-linked
// thread), and closing there must push the feed instead of going back off the
// page. Every in-app push of a thread route records itself here — the board's
// cards and the profile's rows share the memory, so a forgotten push reads as
// a deep link on close. Module state lives exactly as long as the SPA session —
// a full load, which is every deep link, resets it — and survives the page
// remount a push performs.

export type StackMemory = {
  rememberPush: (route: string) => void;
  wasPushedFrom: (route: string) => boolean;
  requestCardFocus: (threadId: string) => void;
  takePendingCardFocus: () => string | null;
  rememberMemberPush: (route: string, originId: string) => void;
  wasMemberPushedFrom: (route: string) => boolean;
  takePendingMemberFocus: () => string | null;
};

export function createStackMemory(): StackMemory {
  let pushedRoute: string | null = null;
  let focusReturnId: string | null = null;
  // A profile intercepted above a route keeps the thread mounted, so the
  // known id that opened it remains a valid focus target when the layer pops.
  let memberPushedRoute: string | null = null;
  let memberFocusOriginId: string | null = null;

  return {
    rememberPush(route) {
      pushedRoute = route;
    },
    wasPushedFrom(route) {
      return pushedRoute === route;
    },
    requestCardFocus(threadId) {
      focusReturnId = threadId;
    },
    takePendingCardFocus() {
      const id = focusReturnId;
      focusReturnId = null;
      return id;
    },
    rememberMemberPush(route, originId) {
      memberPushedRoute = route;
      memberFocusOriginId = originId;
    },
    wasMemberPushedFrom(route) {
      return memberPushedRoute === route;
    },
    takePendingMemberFocus() {
      const originId = memberFocusOriginId;
      memberPushedRoute = null;
      memberFocusOriginId = null;
      return originId;
    },
  };
}

export const stackMemory = createStackMemory();
