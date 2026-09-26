import { beforeEach, describe, expect, it } from "vitest";
import {
  addReply,
  addThread,
  boardSnapshot,
  deletePost,
  resetBoardStore,
} from "@/features/board/data/board-store";
import { forumActivitySeed } from "@/features/board/data/queries";
import { forumActivityCounts, localForumThreads } from "@/features/board/data/forum-activity";

beforeEach(resetBoardStore);

describe("forum activity", () => {
  it("counts fixture posts and replies separately", async () => {
    const seed = await forumActivitySeed("ada");
    expect(seed.posts).toBeGreaterThan(0);
    expect(seed.replies.length).toBeGreaterThan(0);
    expect(forumActivityCounts("ada", seed, boardSnapshot())).toEqual({
      posts: seed.posts,
      replies: seed.replies.length,
    });
  });

  it("adds session posts and replies, then drops tombstoned replies", () => {
    const seed = {
      posts: 1,
      replies: [{ threadId: "fixture", postId: "fixture-reply" }],
    };
    const ada = { user: "ada", role: "member" } as const;
    const ken = { user: "ken", role: "member" } as const;
    const thread = addThread({ board: "general", tags: [], title: "A post", body: "Body" }, ada);
    addThread({ board: "general", tags: [], title: "Another", body: "Body" }, ken);
    const reply = addReply(thread.id, "Reply", ada);
    addReply(thread.id, "Other", ken);
    expect(forumActivityCounts("ada", seed, boardSnapshot())).toEqual({ posts: 2, replies: 2 });
    expect(localForumThreads("ada", boardSnapshot())).toEqual([{ id: thread.id, title: "A post" }]);

    deletePost("fixture", "fixture-reply");
    deletePost(thread.id, reply.id);
    expect(forumActivityCounts("ada", seed, boardSnapshot())).toEqual({ posts: 2, replies: 0 });
  });
});
