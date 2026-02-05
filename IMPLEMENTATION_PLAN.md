# TopDown Learner: 에이전트 검증 학습 모드 추가

## 목표
42개 에이전트 목록에서 선택 → 7단계 검증 프레임워크 기반 소크라테스식 학습

## 신규 기능

### 1. 에이전트 검증 모드 (`/api/verify-agent`)
```
입력: agentName (예: "invest-intelligence-loop")
출력: 7단계 검증 프레임워크 기반 소크라테스식 Q&A
```

### 2. 에이전트 목록 API (`/api/agents`)
```json
[
  {"name": "invest-intelligence-loop", "pattern": "Sequential+Aggregator", "description": "투자 통합 시스템"},
  ...
]
```

### 3. 7단계 검증 프레임워크 (prompts/verification-framework.js)
| 단계 | 질문 유형 |
|------|---------|
| 1. 컴포넌트 분해 | "이 에이전트의 핵심 모듈은 무엇인가?" |
| 2. 성공 기준 정의 | "이 에이전트가 '성공'했다는 걸 어떻게 측정하는가?" |
| 3. 코드 검증 | "입력 검증은 어디서 하는가? 에러 핸들링은?" |
| 4. 패턴 분석 | "왜 Sequential 패턴을 선택했는가? 대안은?" |
| 5. 의존성 검토 | "외부 API 실패 시 폴백은 있는가?" |
| 6. 프롬프트 품질 | "CRAFT 요소 중 누락된 것은?" |
| 7. 개선 로드맵 | "우선순위가 높은 개선점 3가지는?" |

### 4. UI 변경 (public/index.html)
- 모드 선택: [일반 주제] [에이전트 검증] ← 신규
- 에이전트 드롭다운 (42개)
- 검증 단계 진행 표시 (1/7, 2/7, ...)

---

## 파일 변경 목록

| 파일 | 변경 내용 | 신규/수정 |
|------|----------|---------|
| `data/agents.json` | 42개 에이전트 메타데이터 | 신규 |
| `prompts/verification-framework.js` | 7단계 프롬프트 템플릿 | 신규 |
| `agents/verifier.js` | 검증 에이전트 (Socratic 확장) | 신규 |
| `server.js` | `/api/agents`, `/api/verify-agent` 라우트 | 수정 |
| `public/index.html` | 에이전트 선택 UI | 수정 |
| `public/app.js` | 검증 모드 로직 | 수정 |
| `public/style.css` | 검증 UI 스타일 | 수정 |

---

## 구현 순서

### Phase 1: 데이터 준비 (~15줄)
- [ ] `data/agents.json` 생성 (42개 에이전트 목록)

### Phase 2: 검증 프레임워크 (~50줄)
- [ ] `prompts/verification-framework.js` 생성

### Phase 3: 검증 에이전트 (~40줄)
- [ ] `agents/verifier.js` 생성

### Phase 4: API 라우트 (~30줄)
- [ ] `server.js`에 `/api/agents`, `/api/verify-agent` 추가

### Phase 5: UI (~50줄)
- [ ] `public/index.html` 에이전트 선택 UI
- [ ] `public/app.js` 검증 모드 로직

---

## 배포
- Render: `https://topdown-learner.onrender.com` (예정)
- 환경변수: `GEMINI_API_KEY`, `ACCESS_PIN`

---

## 승인 요청
위 설계대로 구현을 진행해도 될까요?
