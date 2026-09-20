// How a panel stack was opened is only knowable from the document's own
// session: a detail pushed from a feed or the member's rows closes with
// browser back (the origin route returns), a deep-linked detail closes by
// pushing the feed. The memory keeps the exact routes of the in-app pushes,
// not a flag: history can walk back to an entry that was never pushed (a
// deep-linked detail), and closing there must push the feed instead of going
// back off the page. The routes form a stack — a detail opened from inside
// another section's layer (a journal card on a project page) must not erase
// the marker of the layer underneath. Every in-app push of a detail route
// records itself here — the board's cards, the readroom's and the projects'
// share the memory, so a forgotten push reads as a deep link on close.
// Module state lives exactly as long as the SPA session — a full load, which
// is every deep link, resets it — and survives the page remount a push
// performs.

export type StackMemory = {
  rememberPush: (route: string) => void;
  /** Whether the current route is the top in-app push; consumes it, so the
   * layer under this one keeps its own marker for its close. */
  takePushedFrom: (route: string) => boolean;
  requestCardFocus: (threadId: string) => void;
  takePendingCardFocus: () => string | null;
  rememberMemberPush: (route: string, originId: string) => void;
  wasMemberPushedFrom: (route: string) => boolean;
  takePendingMemberFocus: () => string | null;
};

export function createStackMemory(): StackMemory {
  const pushedRoutes: string[] = [];
  let focusReturnId: string | null = null;
  // A profile intercepted above a route keeps the thread mounted, so the
  // known id that opened it remains a valid focus target when the layer pops.
  let memberPushedRoute: string | null = null;
  let memberFocusOriginId: string | null = null;

  return {
    rememberPush(route) {
      // A history walk back then a push of the same route re-records the same
      // entry: the top one already waits for its close.
      if (pushedRoutes.at(-1) === route) return;
      pushedRoutes.push(route);
    },
    takePushedFrom(route) {
      if (pushedRoutes.at(-1) !== route) return false;
      pushedRoutes.pop();
      return true;
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
