---
date: 2026-02-01
tags: [#ux, #onboarding, #review-tester, #frontend]
project: topdown-learner
---

## 해결 문제 (Context)
- review-tester 리뷰 결과 종합 2.0/10 → UX 5개 항목 개선 후 Render 배포

## 최종 핵심 로직 (Solution)

### 변경 파일 3개 (백엔드 무변경)

**1. PIN 모달 개선 (index.html)**
- "비밀번호 입력" → "Top-Down Learner" + "소크라테스식 제1원리 학습 도구" 설명 추가

**2. 온보딩 3단계 가이드 (index.html + style.css)**
- ①주제 입력 → ②AI 핵심 원리 추출 → ③소크라테스식 질문 안내
- `.onboarding-step` + `.step-num` (그라데이션 원형 번호)

**3. 버튼 레이블 (index.html + app.js)**
- 일반 주제 → 주제 학습 / 내 코드 → 코드 분석
- 탐구 시작 → 학습 시작 / 코드 학습 → 분석 시작

**4. placeholder 가독성 (style.css)**
- `::placeholder` 색상: `#888` → `rgba(255,255,255,0.5)`

**5. 예시 주제 칩 (index.html + style.css + app.js)**
- 반도체 / 양자역학 / TCP/IP / 미적분 (클릭 → 자동 입력)
- 학습 시작 후 `topicChips.style.display = 'none'`

### server.js 별도 커밋
- `ACCESS_PIN` 기본값 `'1234'` 제거 → 환경변수 필수화 + 미설정 시 `process.exit(1)`

## 핵심 통찰 (Learning & Decision)

- **Problem:** review-tester가 PIN 모달에 가려진 상태로 스크린샷 캡처 → 개선 후에도 동일 점수
- **Decision:** Playwright에서 `localStorage.setItem('accessPin', pin)` + `page.reload()` 방식으로 PIN 우회. `/api/learn` POST 기반 검증은 Gemini API 호출이 포함되어 30초+ 소요되므로 부적합
- **Result:** PIN 모달 우회 성공 → ui_design 2→5, usability 1→3 (종합 2.0→2.8)
- **Next Step:** review-tester의 `auth` 스키마를 다른 웹 에이전트 프로파일(shadow-english, portfolio-agent 등)에도 확장 적용 가능
