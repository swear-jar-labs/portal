import { docs } from "@/content/docs";
import { DocView } from "./DocView/DocView";
import { HomeBoard } from "./HomeBoard";

export function HomePage() {
  const renderedDocs = docs.map((doc) => ({
    id: doc.id,
    title: doc.title,
    content: <DocView doc={doc} />,
  }));

  return <HomeBoard docs={renderedDocs} />;
}
