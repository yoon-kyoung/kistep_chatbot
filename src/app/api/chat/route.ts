import Anthropic from "@anthropic-ai/sdk";
import { searchDocs } from "@/lib/knowledge";

export const runtime = "nodejs";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function mockAnswer(userText: string): string {
  const docs = searchDocs(userText);
  const intro = "[데모 응답] ANTHROPIC_API_KEY가 아직 등록되지 않아 예시 답변을 보여드리고 있어요.";

  if (docs.length === 0) {
    return `${intro}\n\n실제 서비스에서는 Claude가 KISTEP 관련 자료를 바탕으로 답변합니다.`;
  }

  return `${intro}\n\n참고할 만한 자료로 "${docs[0].title}"이(가) 있어요:\n\n${docs[0].content}`;
}

function chunkText(text: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

function mockStream(userText: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const chunks = chunkText(mockAnswer(userText), 3);

  return new ReadableStream({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      controller.close();
    },
  });
}

function buildSystemPrompt(query: string): string {
  const docs = searchDocs(query);
  const context = docs
    .map((d) => `### ${d.title}\n${d.content}`)
    .join("\n\n---\n\n");

  return [
    "당신은 KISTEP(한국과학기술기획평가원) 관련 정보를 안내하는 Q&A 챗봇입니다.",
    "아래 참고 자료를 우선적으로 활용해 답변하고, 자료에 없는 내용은 추측하지 말고 모른다고 답하세요.",
    "답변은 한국어로, 간결하고 정확하게 작성하세요.",
    context ? `\n[참고 자료]\n${context}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  const { messages } = (await req.json()) as { messages: ChatMessage[] };
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "messages가 필요합니다." }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }

  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");

  if (!apiKey) {
    return new Response(mockStream(lastUserMessage?.content ?? ""), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Demo-Mode": "true",
        ...CORS_HEADERS,
      },
    });
  }

  const system = buildSystemPrompt(lastUserMessage?.content ?? "");

  const client = new Anthropic({ apiKey });

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 1024,
    system,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      stream.on("text", (text) => {
        controller.enqueue(encoder.encode(text));
      });
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8", ...CORS_HEADERS },
  });
}
