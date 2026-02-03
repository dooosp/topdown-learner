---
date: 2026-02-01
tags: [#debug, #render, #gemini, #api-key]
project: topdown-learner
---

## 해결 문제 (Context)
- 코드분석 기능에서 Gemini 오류 발생 + 프로젝트 목록 미업데이트

## 최종 핵심 로직 (Solution)

### 1. Gemini 오류 원인: Render 환경변수 `GEMINI_API_KEY` 만료
```
[GoogleGenerativeAI Error]: API key expired. Please renew the API key.
- 로컬 키: 정상 (테스트 통과)
- Render 키: 만료 (400 Bad Request)
```

### 2. 프로젝트 목록: `data/projects.json`에 6개만 등록
- 현재: news-scraper, auto-trader, b2b-lead-agent, job-hunter-agent, topdown-learner, pm-agent-system
- CLAUDE.md 기준 25개+ 프로젝트 존재 → 업데이트 필요

## 핵심 통찰 (Learning & Decision)
- **Problem:** Render 배포 환경의 API 키 만료를 로컬에서 감지 불가
- **Decision:** `curl`로 Render 엔드포인트 직접 호출하여 에러 메시지 확인
- **Next Step:**
  1. https://aistudio.google.com/apikey 에서 Gemini API 키 갱신
  2. Render 대시보드 → Environment → `GEMINI_API_KEY` 교체
  3. `data/projects.json`에 누락된 프로젝트 추가 (별도 세션)
