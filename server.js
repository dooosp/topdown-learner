const express = require('express');
const path = require('path');
const config = require('./config');

// 에이전트들
const abstractor = require('./agents/abstractor');
const socratic = require('./agents/socratic');
const curator = require('./agents/curator');
const implementor = require('./agents/implementor');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 세션 저장 (간단한 인메모리)
const sessions = new Map();

// 학습 시작 API
app.post('/api/learn', async (req, res) => {
  const { topic, sessionId } = req.body;

  if (!topic) {
    return res.status(400).json({ error: '주제를 입력해주세요' });
  }

  try {
    console.log(`\n🎯 새로운 학습 시작: "${topic}"`);

    // 1단계: 제1원리 추출
    console.log('1️⃣ 제1원리 추출 중...');
    const firstPrinciple = await abstractor.extract(topic);

    // 2단계: 소크라테스식 질문
    console.log('2️⃣ 소크라테스식 질문 생성 중...');
    const question = await socratic.inquire(topic, firstPrinciple);

    // 3단계: 자료 큐레이션
    console.log('3️⃣ 관련 자료 검색 중...');
    const resources = await curator.curate(topic, firstPrinciple);

    // 4단계: 실습 과제
    console.log('4️⃣ 실습 과제 생성 중...');
    const mission = await implementor.createMission(topic, firstPrinciple);

    // 세션 저장
    const session = {
      topic,
      history: [
        { role: 'assistant', content: firstPrinciple },
        { role: 'assistant', content: question }
      ],
      resources,
      mission
    };
    sessions.set(sessionId, session);

    console.log('✅ 학습 준비 완료!\n');

    res.json({
      success: true,
      firstPrinciple,
      question,
      resources,
      mission
    });
  } catch (error) {
    console.error('학습 시작 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// 대화 API
app.post('/api/chat', async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message) {
    return res.status(400).json({ error: '메시지를 입력해주세요' });
  }

  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(400).json({ error: '먼저 주제를 입력해주세요' });
  }

  try {
    const gemini = require('./services/gemini');

    const systemPrompt = `# Role: Universal Top-Down Architect (UTDA)
당신은 모든 지식 체계를 제1원리(First Principles)에서 시작하여 실무적 디테일로 분해하는 '하향식 학습 설계자'이다.

현재 주제: ${session.topic}

# Protocol Rules
1. 사전적 정의(Bottom-up)로 시작하는 것을 엄격히 금지한다.
2. 모든 설명은 '왜(Why)'에서 시작하여 '어떻게(How)'로 끝낸다.
3. 사용자가 어려워하면 더 낮은 단계로 내려가는 것이 아니라, 더 높은 단계의 비유(Metaphor)로 돌아가라.
4. 절대 먼저 정답을 나열하지 마라. 고차원적 질문으로 사용자가 스스로 추론하게 하라.
5. 사용자의 철학적/논리적 사고 역량을 신뢰하고, 고도화된 추상화를 두려워하지 마라.

# 대화 지침
- 사용자의 답변이 핵심을 찌르면: 다음 단계의 심화 질문으로 이끌어라
- 사용자가 막히면: 더 높은 추상화 수준의 비유를 제시하라
- 사용자가 오해하면: 거대 지도(Mega Map)로 돌아가 위치를 재확인시켜라`;

    const response = await gemini.chat(session.history, message, systemPrompt);

    // 히스토리 업데이트
    session.history.push({ role: 'user', content: message });
    session.history.push({ role: 'assistant', content: response });

    res.json({
      success: true,
      response
    });
  } catch (error) {
    console.error('대화 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// 추가 자료 검색 API
app.post('/api/search', async (req, res) => {
  const { query } = req.body;

  try {
    const resources = await curator.curate(query, '');
    res.json({ success: true, resources });
  } catch (error) {
    console.error('검색 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// Vercel 서버리스 환경 지원
if (process.env.VERCEL) {
  module.exports = app;
} else {
  app.listen(config.port, () => {
    console.log(`
╔═══════════════════════════════════════════════════╗
║     🎓 Top-Down Learner 서버 시작                   ║
║     http://localhost:${config.port}                        ║
╚═══════════════════════════════════════════════════╝
    `);
  });
}

module.exports = app;
