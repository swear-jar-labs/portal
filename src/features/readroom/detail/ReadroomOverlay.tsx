import { notFound } from "next/navigation";
import { OverlayOutlet, type WithDocumentTitle } from "@/features/shell";
import { listTickets } from "@/features/tickets/contracts";
import { getReadroom } from "../data/queries";
import { ReadroomPanel } from "./ReadroomPanel";
import type { ReadroomTaskPageProps } from "./ReadroomTaskPage";
import type { ReadroomLayer } from "../list/ReadroomStack";
import { readroomDocumentTitle } from "../model/readrooms";

export type ReadroomLayerData = WithDocumentTitle<ReadroomLayer>;

/**
 * The shared readroom panel builder: the direct-load page mounts it as the
 * ReadroomStack's own layer, the overlay interceptor registers it as a store
 * layer.
 */
export async function loadReadroomLayer(id: string, now: string): Promise<ReadroomLayerData> {
  const readroom = await getReadroom(id);
  if (!readroom) notFound();
  const tickets = await listTickets();
  return {
    id: readroom.id,
    title: readroom.title,
    documentTitle: readroomDocumentTitle(readroom),
    layer: <ReadroomPanel readroom={readroom} tickets={tickets} now={now} />,
  };
}

/** The same readroom panel mounted into the root overlay slot (any section). */
export async function InterceptedReadroomTaskPage({ params }: ReadroomTaskPageProps) {
  const { id } = await params;
  const layer = await loadReadroomLayer(id, new Date().toISOString());
  return (
    <OverlayOutlet
      panels={[{ title: layer.title, body: layer.layer }]}
      documentTitle={layer.documentTitle}
    />
  );
}
