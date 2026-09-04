# kistep_chatbot

KISTEP(한국과학기술기획평가원) 관련 정보/문서 기반 Q&A 챗봇. Next.js(App Router) + TypeScript + Tailwind, Anthropic Claude API.

## 구조

- `src/app/page.tsx` — 채팅 UI
- `src/app/api/chat/route.ts` — `POST /api/chat` — `{ messages: [{role, content}] }`를 받아 Claude 응답을 스트리밍으로 반환
- `src/lib/knowledge.ts` — `data/kistep-docs/`의 `.md`/`.txt` 문서를 읽어 키워드 매칭으로 관련 문서를 찾아 시스템 프롬프트에 넣는 아주 단순한 검색. 문서가 늘어나면 임베딩 기반 검색으로 교체 필요.
- `data/kistep-docs/` — 참고 문서를 넣는 곳. `.md` 또는 `.txt` 파일을 추가하면 자동으로 검색 대상이 됨.

## 환경 변수

`.env.local.example`을 `.env.local`로 복사 후 값을 채운다.

- `ANTHROPIC_API_KEY` (필수) — https://console.anthropic.com/settings/keys 에서 발급
- `ANTHROPIC_MODEL` (선택) — 기본값 `claude-sonnet-5`

## 개발

```
npm install
npm run dev
```

## 배포

Vercel 프로젝트에 연결 후 Environment Variables에 `ANTHROPIC_API_KEY`를 등록하면 된다.

```
vercel --prod
```

## TODO

- [ ] 실제 KISTEP 문서를 `data/kistep-docs/`에 추가
- [ ] 문서 양이 늘어나면 임베딩 기반 검색(벡터 DB)으로 교체
- [ ] 대화 기록 저장/세션 관리 여부 결정
