import fs from "fs";
import path from "path";

const DOCS_DIR = path.join(process.cwd(), "data", "kistep-docs");

export interface KnowledgeDoc {
  id: string;
  title: string;
  content: string;
}

let cache: KnowledgeDoc[] | null = null;

function loadDocs(): KnowledgeDoc[] {
  if (cache) return cache;

  if (!fs.existsSync(DOCS_DIR)) {
    cache = [];
    return cache;
  }

  const files = fs
    .readdirSync(DOCS_DIR)
    .filter((f) => f.endsWith(".md") || f.endsWith(".txt"));

  cache = files.map((file) => {
    const content = fs.readFileSync(path.join(DOCS_DIR, file), "utf-8");
    const firstLine = content.split("\n")[0]?.replace(/^#\s*/, "").trim();
    return {
      id: file,
      title: firstLine || file,
      content,
    };
  });

  return cache;
}

/** 아주 단순한 키워드 매칭 기반 검색. 문서 수가 늘어나면 임베딩 기반 검색으로 교체. */
export function searchDocs(query: string, limit = 3): KnowledgeDoc[] {
  const docs = loadDocs();
  if (docs.length === 0) return [];

  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 1);

  if (terms.length === 0) return docs.slice(0, limit);

  const scored = docs.map((doc) => {
    const haystack = doc.content.toLowerCase();
    const score = terms.reduce(
      (acc, term) => acc + (haystack.includes(term) ? 1 : 0),
      0
    );
    return { doc, score };
  });

  const matched = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.doc);

  return matched.length > 0 ? matched : docs.slice(0, limit);
}
