/** The board canon shared by content and the board slice: ERRATA.EXE opens
 * the feed with ?board=errata (content/commands.ts), and the feed parses the
 * same parameter (features/board/model/feed.ts) over the errata board id of the
 * taxonomy (features/board/model/threads.ts). */
export const BOARD_QUERY_PARAM = "board";
export const ERRATA_BOARD_ID = "errata";
