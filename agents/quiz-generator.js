const gemini = require('../services/gemini');

const SYSTEM_PROMPT = `당신은 학습 내용을 바탕으로 퀴즈를 만드는 전문가입니다.

# 규칙
1. 객관식 문제 3개 생성
2. 각 문제당 4개 선택지
3. 정답은 1개만
4. 너무 쉽거나 어렵지 않게
5. 학습한 핵심 개념을 테스트

# 출력 형식 (JSON)
{
  "questions": [
    {
      "question": "질문 내용",
      "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
      "answer": 0,
      "explanation": "정답 해설"
    }
  ]
}

반드시 유효한 JSON만 출력하세요. 다른 텍스트 없이 JSON만.`;

async function generate(topic, chatHistory) {
  const historyText = chatHistory
    .map(h => `${h.label}: ${h.content.slice(0, 500)}`)
    .join('\n\n');

  const prompt = `주제: ${topic}

학습 내용:
${historyText}

위 학습 내용을 바탕으로 퀴즈 3문제를 JSON 형식으로 생성하세요.`;

  const response = await gemini.generate(prompt, SYSTEM_PROMPT);

  // JSON 파싱
  try {
    // 코드 블록 제거
    const jsonStr = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('퀴즈 JSON 파싱 오류:', error);
    return { questions: [] };
  }
}

module.exports = { generate };
