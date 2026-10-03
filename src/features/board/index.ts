export { DiscussionsPage, discussionsMetadata } from "./list/DiscussionsPage";
export { ThreadPage, generateThreadMetadata, type ThreadPageProps } from "./detail/ThreadPage";
export { InterceptedThreadPage, loadThreadLayer } from "./detail/ThreadOverlay";
// The shell's jar dialog counts the board's errata through the layout: the
// app layer reads the facade, never the slice's internals.
export { listThreads } from "./data/queries";
export { ErrataJarRow } from "./jar/ErrataJarRow";
