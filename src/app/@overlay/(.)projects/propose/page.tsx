// Next does not apply a parallel-route page's metadata on a soft navigation
// (the base page's metadata wins); the interceptor's tab title arrives through
// the store's documentTitle instead (see OverlayDocumentTitle).
export { InterceptedProjectProposalPage as default } from "@/features/projects";
