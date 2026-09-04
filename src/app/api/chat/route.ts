import Anthropic from "@anthropic-ai/sdk";
import { searchDocs } from "@/lib/knowledge";

export const runtime = "nodejs";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
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
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY가 설정되지 않았습니다." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const { messages } = (await req.json()) as { messages: ChatMessage[] };
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "messages가 필요합니다." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
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
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
