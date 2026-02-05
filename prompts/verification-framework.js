/**
 * 에이전트 검증 7단계 프레임워크
 * 소크라테스식 문답법으로 에이전트를 깊이 이해
 */

const VERIFICATION_STEPS = [
  {
    step: 1,
    title: '컴포넌트 분해',
    question: (agent) => `"${agent.name}" 에이전트의 핵심 모듈/컴포넌트는 무엇인가요? 각 컴포넌트의 역할을 설명해보세요.`,
    followUp: '왜 이렇게 분해했나요? 다르게 분해할 수 있는 방법은?',
    hint: '기본 모델 성능, 도구 선택, 계획 논리 관점에서 생각해보세요.'
  },
  {
    step: 2,
    title: '성공 기준 정의',
    question: (agent) => `"${agent.name}" 에이전트가 '성공적으로 작동했다'는 것을 어떻게 측정할 수 있나요? 구체적인 지표를 3개 이상 정의해보세요.`,
    followUp: '이 지표들이 비즈니스 목표와 어떻게 연결되나요?',
    hint: '정확도, 응답 시간, 에러율, 사용자 만족도 등을 고려하세요.'
  },
  {
    step: 3,
    title: '코드 검증 체크리스트',
    question: (agent) => `"${agent.name}" 에이전트의 코드에서 다음을 점검해보세요:\n- 입력 검증은 어디서 하나요?\n- 에러 핸들링은 어떻게 되어 있나요?\n- 민감 정보(시크릿)는 안전하게 관리되나요?`,
    followUp: '발견한 취약점이나 개선점이 있나요?',
    hint: 'OWASP Top 10, 환경변수 사용, try-catch 패턴을 확인하세요.'
  },
  {
    step: 4,
    title: '아키텍처 패턴 분석',
    question: (agent) => `"${agent.name}"은 "${agent.pattern}" 패턴을 사용합니다.\n- 왜 이 패턴을 선택했나요?\n- 대안 패턴(Sequential/Parallel/Router/Loop/Hierarchical)은 어떤 것이 있나요?\n- 다른 패턴을 선택했다면 장단점은?`,
    followUp: '현재 패턴의 병목 지점은 어디인가요?',
    hint: 'Google의 8가지 멀티 에이전트 패턴을 참고하세요.'
  },
  {
    step: 5,
    title: '의존성 및 폴백 검토',
    question: (agent) => `"${agent.name}" 에이전트가 의존하는 외부 서비스(API, DB, 다른 에이전트)를 나열하고:\n- 각 의존성이 실패하면 어떻게 되나요?\n- 폴백(fallback) 메커니즘이 있나요?\n- 타임아웃 설정은 적절한가요?`,
    followUp: '단일 장애점(Single Point of Failure)이 있나요?',
    hint: 'Circuit Breaker, Retry, Graceful Degradation을 고려하세요.'
  },
  {
    step: 6,
    title: '프롬프트 품질 (CRAFT)',
    question: (agent) => `"${agent.name}" 에이전트의 LLM 프롬프트를 CRAFT 프레임워크로 평가해보세요:\n- [C]ontext: 배경 정보가 충분한가?\n- [R]ole: 역할이 명확한가?\n- [A]ction: 수행 작업이 구체적인가?\n- [F]ormat: 출력 형식이 정의되어 있나?\n- [T]one: 응답 스타일이 지정되어 있나?\n\n누락된 요소는 무엇인가요?`,
    followUp: '검증 체크리스트(Verification)를 추가한다면 어떤 항목?',
    hint: '프롬프트가 없는 에이전트라면 왜 없는지 생각해보세요.'
  },
  {
    step: 7,
    title: '개선 로드맵',
    question: (agent) => `지금까지의 분석을 바탕으로 "${agent.name}" 에이전트의 개선 우선순위 Top 3를 정해보세요.\n각 항목에 대해:\n- 문제점\n- 해결 방안\n- 예상 효과\n- 난이도 (쉬움/중간/어려움)`,
    followUp: '다음 분기에 꼭 해야 할 1가지는 무엇인가요?',
    hint: '비즈니스 임팩트 × 기술 부채 매트릭스로 우선순위를 정하세요.'
  }
];

function getStep(stepNumber, agent) {
  const step = VERIFICATION_STEPS[stepNumber - 1];
  if (!step) return null;
  return {
    ...step,
    question: step.question(agent)
  };
}

function getAllSteps() {
  return VERIFICATION_STEPS.map(s => ({ step: s.step, title: s.title }));
}

module.exports = { VERIFICATION_STEPS, getStep, getAllSteps };
