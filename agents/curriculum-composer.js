const gemini = require('../services/gemini');
const codePatterns = require('../data/code-patterns');

const SYSTEM_PROMPT = `# Role: Curriculum Architect
당신은 학습 커리큘럼을 설계하는 전문가이다.
제1원리(First Principles)에서 출발하여 실무 적용까지 체계적인 학습 경로를 설계한다.

# 설계 원칙
1. 블룸 분류법(Bloom's Taxonomy) 기반 난이도 상승: 기억 → 이해 → 적용 → 분석 → 평가 → 창조
2. 제1원리 → 핵심 개념 → 실무 확장 순서
3. 각 주차는 명확한 선수과목(prerequisites)을 가진 DAG 구조
4. topic_for_learning은 해당 주차의 핵심 학습 주제를 구체적으로 서술

# 출력 규칙
- 반드시 JSON만 출력하라 (마크다운 코드블록 없이)
- 4~8주차 구성
- mermaid 다이어그램은 graph TD 형식`;

const CODE_SYSTEM_PROMPT = `# Role: Code-Based Curriculum Architect
당신은 실전 코드 기반 학습 커리큘럼을 설계하는 전문가이다.
학습자가 실제로 구현한 에이전트 코드 패턴을 분석하여, 초보→중급→고급 단계로 확장하는 커리큘럼을 설계한다.

# 설계 원칙
1. 초보 (1~3주차): 기본 패턴 이해 — Express, fetch, dotenv, 기본 에이전트 구조
2. 중급 (4~5주차): 인프라 패턴 — SQLite, LLM 래퍼, 헬스체크, 봇 연동
3. 고급 (6~8주차): 아키텍처 패턴 — Circuit Breaker, Event Bus, A/B 테스트, 오케스트레이션
4. 각 주차의 topic_for_learning에 해당 코드 패턴의 "왜 이 패턴이 필요한가?"를 포함
5. 실제 코드 뼈대를 참고하여 구체적인 학습 목표 설정

# 출력 규칙
- 반드시 JSON만 출력하라 (마크다운 코드블록 없이)
- 6~8주차 구성 (초보 3 + 중급 2 + 고급 1~3)
- mermaid 다이어그램은 graph TD 형식`;

const BASE_JSON_FORMAT = `{
  "title": "커리큘럼 제목",
  "description": "한 줄 설명",
  "weeks": [
    {
      "week": 1,
      "title": "주차 제목",
      "objectives": ["학습 목표1", "학습 목표2"],
      "concepts": ["핵심 개념1", "핵심 개념2"],
      "prerequisites": [],
      "topic_for_learning": "이 주차에서 깊이 탐구할 학습 주제 문장"
    }
  ],
  "mermaid": "graph TD\\n  W1[1주차: 제목] --> W2[2주차: 제목]"
}`;

const BASE_REQUIREMENTS = `- 1주차는 prerequisites가 빈 배열
- 이후 주차는 반드시 선행 주차 번호를 prerequisites에 포함
- topic_for_learning은 소크라테스식 학습에 사용될 구체적 주제 문장
- mermaid는 주차 간 의존성을 graph TD로 표현`;

function parseJSON(response) {
  const cleaned = response.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('커리큘럼 JSON 파싱 실패');
  return JSON.parse(match[0]);
}

async function compose(topic) {
  const prompt = `"${topic}" 주제에 대한 학습 커리큘럼을 설계하라.

다음 JSON 구조로만 출력하라:
${BASE_JSON_FORMAT}

요구사항:
- 4~8주차로 구성
${BASE_REQUIREMENTS}`;

  const response = await gemini.generate(prompt, SYSTEM_PROMPT);
  return parseJSON(response);
}

async function composeFromCode(topic) {
  const patternsByLevel = { beginner: [], intermediate: [], advanced: [] };
  for (const p of codePatterns) {
    patternsByLevel[p.level].push(p);
  }

  const formatPatterns = (list) => list.map(p =>
    `### ${p.name}\n설명: ${p.description}\n출처: ${p.source}\n\`\`\`javascript\n${p.skeleton}\n\`\`\``
  ).join('\n\n');

  const prompt = `"${topic}" 주제에 대한 코드 기반 학습 커리큘럼을 설계하라.

아래는 학습자가 실제 구현한 에이전트 에코시스템의 코드 패턴이다. 이 패턴들을 바탕으로 초보→중급→고급 커리큘럼을 설계하라.

## 초보 패턴 (1~3주차에 활용)
${formatPatterns(patternsByLevel.beginner)}

## 중급 패턴 (4~5주차에 활용)
${formatPatterns(patternsByLevel.intermediate)}

## 고급 패턴 (6~8주차에 활용)
${formatPatterns(patternsByLevel.advanced)}

다음 JSON 구조로만 출력하라:
${BASE_JSON_FORMAT}

요구사항:
- 6~8주차로 구성 (초보 2~3 + 중급 2 + 고급 2~3)
- 각 주차의 objectives에 해당 코드 패턴 이름을 포함
- topic_for_learning에 "왜 이 패턴이 필요한가?"라는 관점 포함
${BASE_REQUIREMENTS}`;

  const response = await gemini.generate(prompt, CODE_SYSTEM_PROMPT);
  return parseJSON(response);
}

module.exports = { compose, composeFromCode };
