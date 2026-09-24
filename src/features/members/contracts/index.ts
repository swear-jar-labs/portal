// The members' contract: the only surface other features import. It is a
// manifest, not an implementation: explicit re-exports of the slice's
// board-free leaves, nothing else. Page bodies stay out: MemberPage reads the
// board's contract, so publishing it here would loop the slice graph
// (board → members → board). The contract test pins the published list.

export { MemberLink, type MemberLinkProps, type MemberPerson } from "../MemberLink";
