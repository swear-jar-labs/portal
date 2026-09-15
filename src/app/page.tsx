import { docs } from "@/content/docs";
import { DocView } from "./components/DocView/DocView";
import { HomeBoard } from "./components/HomeBoard/HomeBoard";

export default function Home() {
  const renderedDocs = docs.map((doc) => ({
    id: doc.id,
    title: doc.title,
    content: <DocView doc={doc} />,
  }));

  return <HomeBoard docs={renderedDocs} />;
}
