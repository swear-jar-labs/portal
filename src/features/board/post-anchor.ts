// A post's anchor is one string in two roles: the element id the jump focuses
// and the hash it writes into the address. Sharing the prefix here keeps the
// marker, the deep link and the e2e contract from drifting apart.

const POST_ANCHOR_PREFIX = "board-post-";

export function postElementId(postId: string): string {
  return `${POST_ANCHOR_PREFIX}${postId}`;
}

export function postHash(postId: string): string {
  return `#${postElementId(postId)}`;
}

export function postIdFromHash(hash: string): string | undefined {
  if (!hash.startsWith(`#${POST_ANCHOR_PREFIX}`)) return undefined;
  const id = hash.slice(POST_ANCHOR_PREFIX.length + 1);
  return id.length > 0 ? id : undefined;
}
