const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');
const { getStep, getAllSteps } = require('../prompts/verification-framework');

let genAI = null;

function getModel() {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(config.geminiApiKey);
  }
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
}

/**
 * 검증 세션 시작 - 선택한 에이전트에 대한 7단계 검증 학습
 */
async function startVerification(agent) {
  const step = getStep(1, agent);
  const model = getModel();

  const systemPrompt = `당신은 소프트웨어 아키텍처 멘토입니다.
사용자가 만든 AI 에이전트를 소크라테스식 문답법으로 함께 검증합니다.
- 답을 직접 주지 말고, 질문으로 사용자가 스스로 깨닫게 하세요
- 사용자의 답변이 부족하면 힌트와 함께 더 깊이 생각하도록 유도하세요
- 칭찬과 격려를 아끼지 마세요`;

  const userPrompt = `[검증 대상 에이전트]
- 이름: ${agent.name}
- 패턴: ${agent.pattern}
- 설명: ${agent.description}

[1단계: ${step.title}]
${step.question}

사용자가 이 에이전트를 직접 만들었습니다. 검증 학습을 시작해주세요.
소크라테스식으로 질문하며, 사용자가 스스로 분석하도록 유도하세요.`;

  try {
    const result = await model.generateContent([
      { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }
    ]);
    return {
      step: 1,
      totalSteps: 7,
      title: step.title,
      response: result.response.text(),
      hint: step.hint,
      followUp: step.followUp
    };
  } catch (err) {
    console.error('[Verifier] 오류:', err.message);
    throw err;
  }
}

/**
 * 검증 대화 계속 - 사용자 답변에 대한 소크라테스식 응답
 */
async function continueVerification(agent, currentStep, userAnswer, history) {
  const model = getModel();
  const step = getStep(currentStep, agent);

  const prompt = `[검증 대상]
- 에이전트: ${agent.name} (${agent.pattern})

[현재 단계: ${currentStep}/7 - ${step.title}]

[이전 대화]
${history.map(h => `${h.role}: ${h.content}`).join('\n')}

[사용자 답변]
${userAnswer}

소크라테스식으로 응답하세요:
1. 사용자의 답변에서 좋은 점을 인정
2. 부족한 부분에 대해 추가 질문
3. 필요하면 힌트 제공: "${step.hint}"
4. 충분히 답했다면 다음 단계로 넘어갈 준비가 됐는지 확인

답변이 완전하면 "다음 단계로 넘어갈까요?"라고 물어보세요.`;

  try {
    const result = await model.generateContent(prompt);
    return {
      step: currentStep,
      response: result.response.text()
    };
  } catch (err) {
    console.error('[Verifier] 대화 오류:', err.message);
    throw err;
  }
}

/**
 * 다음 단계로 이동
 */
async function nextStep(agent, nextStepNumber, history) {
  if (nextStepNumber > 7) {
    return generateSummary(agent, history);
  }

  const step = getStep(nextStepNumber, agent);
  const model = getModel();

  const prompt = `[검증 대상: ${agent.name}]

[${nextStepNumber}단계: ${step.title}]로 넘어갑니다.

${step.question}

소크라테스식으로 이 단계의 질문을 시작하세요.`;

  try {
    const result = await model.generateContent(prompt);
    return {
      step: nextStepNumber,
      totalSteps: 7,
      title: step.title,
      response: result.response.text(),
      hint: step.hint,
      followUp: step.followUp
    };
  } catch (err) {
    throw err;
  }
}

/**
 * 7단계 완료 후 요약 생성
 */
async function generateSummary(agent, history) {
  const model = getModel();

  const prompt = `[검증 완료: ${agent.name}]

7단계 검증 학습이 완료되었습니다. 전체 대화를 바탕으로 요약해주세요:

[대화 기록]
${history.slice(-20).map(h => `${h.role}: ${h.content}`).join('\n')}

다음을 포함한 요약을 작성하세요:
1. 이 에이전트의 강점 3가지
2. 개선이 필요한 영역 3가지
3. 즉시 적용할 수 있는 Quick Win 1가지
4. 장기적 개선 로드맵 제안

마지막으로 사용자의 학습 여정을 칭찬하는 메시지를 추가하세요.`;

  try {
    const result = await model.generateContent(prompt);
    return {
      step: 'complete',
      title: '검증 완료',
      response: result.response.text(),
      isComplete: true
    };
  } catch (err) {
    throw err;
  }
}

module.exports = {
  startVerification,
  continueVerification,
  nextStep,
  generateSummary,
  getAllSteps
};
