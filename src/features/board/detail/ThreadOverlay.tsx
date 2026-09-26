import { notFound } from "next/navigation";
import { OverlayOutlet, type WithDocumentTitle } from "@/features/shell";
import { getThread } from "../data/queries";
import { threadDocumentTitle } from "../model/threads";
import { ThreadOverlayActions } from "./ThreadOverlayActions";
import { ThreadPanel } from "./ThreadPanel";
import type { ThreadPageProps } from "./ThreadPage";
import type { BoardThreadLayer } from "../list/BoardStack";

export type ThreadLayerData = WithDocumentTitle<BoardThreadLayer>;

/**
 * The shared thread panel builder: the direct-load page mounts it as the
 * BoardStack's own layer, the overlay interceptor registers it as a store
 * layer — one panel, one actions binding.
 */
export async function loadThreadLayer(id: string, now: string): Promise<ThreadLayerData> {
  const thread = await getThread(id);
  if (!thread) notFound();
  return {
    id: thread.id,
    title: thread.title,
    documentTitle: threadDocumentTitle(thread),
    layer: (
      <ThreadOverlayActions threadId={thread.id}>
        <ThreadPanel thread={thread} now={now} />
      </ThreadOverlayActions>
    ),
  };
}

/** The same thread panel mounted into the root overlay slot (any section). */
export async function InterceptedThreadPage({ params }: ThreadPageProps) {
  const { id } = await params;
  const layer = await loadThreadLayer(id, new Date().toISOString());
  return (
    <OverlayOutlet
      panels={[{ title: layer.title, body: layer.layer }]}
      documentTitle={layer.documentTitle}
    />
  );
}
