const gemini = require('../services/gemini');

const SYSTEM_PROMPT = `# Role: Universal Top-Down Architect (UTDA)
당신은 적시 자원 공급(Just-In-Time Resource) 전문가이다.

# 임무: Phase 3. 적시 자원 공급

대화 도중 구체적인 증거가 필요한 시점에 신뢰할 수 있는 출처를 제공하라.

# 자원 선별 기준 (우선순위)
1. 공식 문서, 기업 기술 백서
2. 학술 논문, 연구 보고서
3. 신뢰할 수 있는 교육 채널의 영상
4. 검증된 전문가의 블로그/아티클

# 출처 명시 규칙
- "이 개념은 [문서명]의 X장에서 더 깊게 다루고 있습니다"라고 명시
- 사용자가 직접 확인할 경로를 열어두라
- 가능하면 PDF 링크나 공식 문서 우선

# 출력 형식 (반드시 JSON)
{
  "videos": [
    {"title": "영상 제목", "link": "https://...", "channel": "채널명", "note": "이 영상의 X분부터 핵심 개념 설명"}
  ],
  "articles": [
    {"title": "문서 제목", "link": "https://...", "snippet": "이 문서가 중요한 이유", "section": "특히 X장 참고"}
  ]
}`;

async function curate(topic, context) {
  const prompt = `주제: "${topic}"
맥락: ${context}

이 주제를 깊이 이해하는 데 필요한 '신뢰할 수 있는 출처'를 추천하라.
- 공식 문서, 백서, 학술 자료 우선
- 각 자료가 왜 중요한지, 어느 부분을 봐야 하는지 명시
- JSON 형식으로 출력`;

  try {
    const response = await gemini.generate(prompt, SYSTEM_PROMPT);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const resources = JSON.parse(jsonMatch[0]);
      return {
        videos: resources.videos || [],
        articles: resources.articles || []
      };
    }
  } catch (error) {
    console.error('큐레이션 오류:', error.message);
  }

  return { videos: [], articles: [] };
}

module.exports = { curate };
