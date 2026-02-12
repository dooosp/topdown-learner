const express = require('express');
const path = require('path');
const { createServer, startServer } = require('server-base');
const config = require('./config');

// 에이전트들
const abstractor = require('./agents/abstractor');
const socratic = require('./agents/socratic');
const curator = require('./agents/curator');
const implementor = require('./agents/implementor');
const codeAnalyzer = require('./agents/code-analyzer');
const claudeMdParser = require('./services/claude-md-parser');
const quizGenerator = require('./agents/quiz-generator');
const verifier = require('./agents/verifier');
const curriculumComposer = require('./agents/curriculum-composer');
const store = require('./lib/store');
const agentsList = require('./data/agents.json');

const app = createServer({ name: 'topdown-learner' });
app.use(express.static(path.join(__dirname, 'public')));

// 세션 저장 (간단한 인메모리)
const sessions = new Map();

// PIN 인증 미들웨어
const ACCESS_PIN = process.env.ACCESS_PIN;
if (!ACCESS_PIN) {
  console.error('ACCESS_PIN 환경변수가 설정되지 않았습니다. 서버를 시작할 수 없습니다.');
  process.exit(1);
}

function checkAuth(req, res, next) {
  const pin = req.headers['x-access-pin'] || req.body.pin;
  if (pin !== ACCESS_PIN) {
    return res.status(401).json({ error: '잘못된 비밀번호입니다' });
  }
  next();
}

// 학습 시작 API
app.post('/api/learn', checkAuth, async (req, res) => {
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

    // 세션 저장 (Gemini API는 user로 시작해야 함)
    const session = {
      topic,
      history: [
        { role: 'user', content: `"${topic}"에 대해 배우고 싶습니다.` },
        { role: 'model', content: firstPrinciple + '\n\n' + question }
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
app.post('/api/chat', checkAuth, async (req, res) => {
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

    // 히스토리 업데이트 (Gemini는 'model' 사용)
    session.history.push({ role: 'user', content: message });
    session.history.push({ role: 'model', content: response });

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

// 프로젝트 목록 API (코드 학습용)
app.get('/api/projects', checkAuth, (req, res) => {
  try {
    const projects = claudeMdParser.parseProjects();
    res.json({ success: true, projects });
  } catch (error) {
    console.error('프로젝트 목록 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// 코드 학습 시작 API
app.post('/api/learn-code', checkAuth, async (req, res) => {
  const { projectName, sessionId } = req.body;

  if (!projectName) {
    return res.status(400).json({ error: '프로젝트를 선택해주세요' });
  }

  try {
    console.log(`\n💻 코드 학습 시작: "${projectName}"`);

    const project = claudeMdParser.getProject(projectName);
    if (!project || !project.exists) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다' });
    }

    // 1단계: 코드 분석 (GitHub에서 가져옴)
    console.log('1️⃣ GitHub에서 프로젝트 분석 중...');
    const analysis = await codeAnalyzer.analyze(project);

    // 2단계: 소크라테스 질문
    console.log('2️⃣ 학습 질문 생성 중...');
    const question = await socratic.inquireCode(projectName, analysis);

    // 세션 저장
    const session = {
      topic: `코드: ${projectName}`,
      github: project.github,
      mode: 'code',
      history: [
        { role: 'user', content: `"${projectName}" 코드를 배우고 싶습니다.` },
        { role: 'model', content: analysis + '\n\n' + question }
      ]
    };
    sessions.set(sessionId, session);

    console.log('✅ 코드 학습 준비 완료!\n');

    res.json({
      success: true,
      analysis,
      question,
      github: `https://github.com/${project.github}`
    });
  } catch (error) {
    console.error('코드 학습 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// 퀴즈 생성 API
app.post('/api/quiz', checkAuth, async (req, res) => {
  const { topic, chatHistory } = req.body;

  if (!topic || !chatHistory) {
    return res.status(400).json({ error: '학습 내용이 필요합니다' });
  }

  try {
    console.log(`\n📝 퀴즈 생성: "${topic}"`);
    const quiz = await quizGenerator.generate(topic, chatHistory);
    console.log('✅ 퀴즈 생성 완료!\n');

    res.json({ success: true, quiz });
  } catch (error) {
    console.error('퀴즈 생성 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 에이전트 검증 학습 API (7단계 프레임워크)
// ============================================

// 에이전트 목록 조회
app.get('/api/agents', checkAuth, (req, res) => {
  const grouped = agentsList.reduce((acc, agent) => {
    const cat = agent.category || 'etc';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(agent);
    return acc;
  }, {});
  res.json({ success: true, agents: agentsList, grouped });
});

// 검증 학습 시작
app.post('/api/verify-start', checkAuth, async (req, res) => {
  const { agentName, sessionId } = req.body;

  const agent = agentsList.find(a => a.name === agentName);
  if (!agent) {
    return res.status(404).json({ error: '에이전트를 찾을 수 없습니다' });
  }

  try {
    console.log(`\n🔍 검증 학습 시작: "${agentName}"`);
    const result = await verifier.startVerification(agent);

    // 검증 세션 저장
    const session = {
      mode: 'verify',
      agent,
      currentStep: 1,
      history: [
        { role: 'user', content: `"${agentName}" 에이전트를 검증하고 싶습니다.` },
        { role: 'model', content: result.response }
      ]
    };
    sessions.set(sessionId, session);

    console.log('✅ 검증 1단계 시작!\n');
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('검증 시작 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// 검증 대화
app.post('/api/verify-chat', checkAuth, async (req, res) => {
  const { message, sessionId } = req.body;

  const session = sessions.get(sessionId);
  if (!session || session.mode !== 'verify') {
    return res.status(400).json({ error: '먼저 에이전트를 선택해주세요' });
  }

  try {
    const result = await verifier.continueVerification(
      session.agent,
      session.currentStep,
      message,
      session.history
    );

    session.history.push({ role: 'user', content: message });
    session.history.push({ role: 'model', content: result.response });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('검증 대화 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// 다음 검증 단계로 이동
app.post('/api/verify-next', checkAuth, async (req, res) => {
  const { sessionId } = req.body;

  const session = sessions.get(sessionId);
  if (!session || session.mode !== 'verify') {
    return res.status(400).json({ error: '검증 세션이 없습니다' });
  }

  try {
    const nextStep = session.currentStep + 1;
    console.log(`\n➡️ 검증 ${nextStep}단계로 이동`);

    const result = await verifier.nextStep(session.agent, nextStep, session.history);

    if (!result.isComplete) {
      session.currentStep = nextStep;
      session.history.push({ role: 'model', content: result.response });
    }

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('다음 단계 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 커리큘럼 학습 API
// ============================================

// 커리큘럼 생성
app.post('/api/curriculum', checkAuth, async (req, res) => {
  const { topic, useCodePatterns } = req.body;
  if (!topic) {
    return res.status(400).json({ error: '주제를 입력해주세요' });
  }

  try {
    console.log(`\n📚 커리큘럼 생성: "${topic}" (코드 기반: ${!!useCodePatterns})`);
    const curriculum = useCodePatterns
      ? await curriculumComposer.composeFromCode(topic)
      : await curriculumComposer.compose(topic);

    const id = store.createCurriculum(
      topic,
      curriculum,
      curriculum.mermaid,
      curriculum.weeks.length
    );
    store.createWeeks(id, curriculum.weeks);

    console.log(`✅ 커리큘럼 생성 완료 (${curriculum.weeks.length}주차)\n`);
    res.json({ success: true, id, curriculum });
  } catch (error) {
    console.error('커리큘럼 생성 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// 커리큘럼 목록
app.get('/api/curricula', checkAuth, (req, res) => {
  try {
    const list = store.getCurricula();
    res.json({ success: true, curricula: list });
  } catch (error) {
    console.error('커리큘럼 목록 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// 커리큘럼 상세
app.get('/api/curriculum/:id', checkAuth, (req, res) => {
  try {
    const curriculum = store.getCurriculumById(Number(req.params.id));
    if (!curriculum) {
      return res.status(404).json({ error: '커리큘럼을 찾을 수 없습니다' });
    }
    res.json({ success: true, curriculum });
  } catch (error) {
    console.error('커리큘럼 상세 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// 주차 학습 시작
app.post('/api/curriculum/:id/week/:week/start', checkAuth, async (req, res) => {
  const curriculumId = Number(req.params.id);
  const weekNumber = Number(req.params.week);

  try {
    const curriculum = store.getCurriculumById(curriculumId);
    if (!curriculum) {
      return res.status(404).json({ error: '커리큘럼을 찾을 수 없습니다' });
    }

    const week = curriculum.weeks.find(w => w.weekNumber === weekNumber);
    if (!week) {
      return res.status(404).json({ error: '해당 주차를 찾을 수 없습니다' });
    }

    // 선수과목 검증
    if (!store.arePrerequisitesComplete(curriculumId, week.prerequisites)) {
      return res.status(400).json({
        error: '선수 주차를 먼저 완료해주세요',
        incompletePrerequisites: week.prerequisites
      });
    }

    // 상태 업데이트
    store.updateWeekStatus(curriculumId, weekNumber, 'in_progress');

    // 기존 학습 파이프라인 실행
    const topic = week.topicForLearning;
    console.log(`\n🎯 커리큘럼 ${weekNumber}주차 학습 시작: "${topic}"`);

    const firstPrinciple = await abstractor.extract(topic);
    const question = await socratic.inquire(topic, firstPrinciple);
    const resources = await curator.curate(topic, firstPrinciple);
    const mission = await implementor.createMission(topic, firstPrinciple);

    const { sessionId } = req.body;
    if (sessionId) {
      sessions.set(sessionId, {
        topic,
        history: [
          { role: 'user', content: `"${topic}"에 대해 배우고 싶습니다.` },
          { role: 'model', content: firstPrinciple + '\n\n' + question }
        ],
        resources,
        mission,
        curriculumId,
        weekNumber
      });
    }

    console.log('✅ 주차 학습 준비 완료!\n');
    res.json({
      success: true,
      weekNumber,
      curriculumId,
      firstPrinciple,
      question,
      resources,
      mission
    });
  } catch (error) {
    console.error('주차 시작 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// 주차 완료
app.put('/api/curriculum/:id/week/:week/complete', checkAuth, (req, res) => {
  const curriculumId = Number(req.params.id);
  const weekNumber = Number(req.params.week);

  try {
    store.updateWeekStatus(curriculumId, weekNumber, 'completed');
    res.json({ success: true });
  } catch (error) {
    console.error('주차 완료 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// 커리큘럼 삭제
app.delete('/api/curriculum/:id', checkAuth, (req, res) => {
  try {
    store.deleteCurriculum(Number(req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error('커리큘럼 삭제 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// 검증 단계 목록
app.get('/api/verify-steps', (req, res) => {
  res.json({ success: true, steps: verifier.getAllSteps() });
});

// Vercel 서버리스 환경 지원
if (process.env.VERCEL) {
  module.exports = app;
} else {
  startServer(app, config.port, { name: 'topdown-learner' });
}

module.exports = app;
