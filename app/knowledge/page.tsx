import { loadAllKnowledgeEntries } from "@/lib/knowledge/knowledge-loader";

import { KnowledgeView } from "./knowledge-view";

export default function KnowledgePage() {
  const entries = loadAllKnowledgeEntries();

  return (
    <main>
      <KnowledgeView entries={entries} />
    </main>
  );
}
