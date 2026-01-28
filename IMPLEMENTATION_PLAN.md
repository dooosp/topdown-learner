# Top-Down Learner 확장: 코드 학습 모드

## 1. 개요

기존 topdown-learner에 "코드 학습" 기능을 추가하여
태호님이 만든 에이전트들을 소크라테스 문답법으로 학습하는 시스템

## 2. 변경 사항

### 2.1 신규 파일
- `services/claude-md-parser.js` - CLAUDE.md 파서
- `agents/code-analyzer.js` - 코드 분석 + 아키텍처 맵

### 2.2 수정 파일
- `server.js` - 코드 학습 API 추가
- `agents/socratic.js` - 코드용 문답 함수
- `public/index.html` - 모드 선택 UI
- `public/app.js` - 코드 학습 로직

## 3. 작동 방식

```
[시작 화면]
"무엇을 배우시겠어요?"
[일반 주제]  [내 코드]

[내 코드] 선택 시:
→ CLAUDE.md에서 프로젝트 목록 표시
→ 프로젝트 선택 (예: news-scraper)
→ 코드 분석 + 아키텍처 맵 생성
→ 소크라테스 질문 시작
```

## 4. 구현 완료
- [x] 설계서 작성
- [x] claude-md-parser.js
- [x] code-analyzer.js
- [x] socratic.js 확장
- [x] server.js 수정
- [x] UI 수정 (index.html + app.js + style.css)

**승인일**: 2026-01-28
