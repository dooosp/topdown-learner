// 세션 ID 생성
const sessionId = 'session_' + Date.now();

// PIN 저장
let accessPin = localStorage.getItem('accessPin') || '';

// 학습 진도 저장 키
const PROGRESS_KEY = 'topdown_progress';
let currentTopic = '';
let chatHistory = [];

// DOM 요소
const pinModal = document.getElementById('pinModal');
const pinInput = document.getElementById('pinInput');
const pinSubmit = document.getElementById('pinSubmit');
const pinError = document.getElementById('pinError');
const topicInput = document.getElementById('topicInput');
const startBtn = document.getElementById('startBtn');
const chatMessages = document.getElementById('chatMessages');
const chatInputBox = document.getElementById('chatInputBox');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const videoList = document.getElementById('videoList');
const articleList = document.getElementById('articleList');
const missionSection = document.getElementById('missionSection');
const missionContent = document.getElementById('missionContent');

// 모드 관련 요소
const modeSelector = document.getElementById('modeSelector');
const generalInput = document.getElementById('generalInput');
const codeInput = document.getElementById('codeInput');
const projectSelect = document.getElementById('projectSelect');
const startCodeBtn = document.getElementById('startCodeBtn');
const welcomeGeneral = document.getElementById('welcomeGeneral');
const welcomeCode = document.getElementById('welcomeCode');
const welcomeVerify = document.getElementById('welcomeVerify');
const verifyInput = document.getElementById('verifyInput');
const agentSelect = document.getElementById('agentSelect');
const startVerifyBtn = document.getElementById('startVerifyBtn');
const verifyProgress = document.getElementById('verifyProgress');
const currentStepEl = document.getElementById('currentStep');
const stepTitleEl = document.getElementById('stepTitle');
const nextStepBtn = document.getElementById('nextStepBtn');

let currentMode = 'general';
let verifyMode = false;

// PIN 검증
if (accessPin) {
  pinModal.classList.add('hidden');
}

pinSubmit.addEventListener('click', verifyPin);
pinInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') verifyPin();
});

async function verifyPin() {
  const pin = pinInput.value.trim();
  if (!pin) return;

  try {
    const response = await fetch('/api/learn', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Pin': pin
      },
      body: JSON.stringify({ topic: 'test', sessionId: 'verify' })
    });

    if (response.status === 401) {
      pinError.textContent = '잘못된 비밀번호입니다';
      return;
    }

    // 성공
    accessPin = pin;
    localStorage.setItem('accessPin', pin);
    pinModal.classList.add('hidden');
  } catch {
    pinError.textContent = '연결 오류가 발생했습니다';
  }
}

// 모드 전환
modeSelector.addEventListener('click', async (e) => {
  if (!e.target.classList.contains('mode-btn')) return;

  const mode = e.target.dataset.mode;
  if (mode === currentMode) return;

  currentMode = mode;

  // 버튼 활성화 상태 변경
  document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
  e.target.classList.add('active');

  // UI 전환
  generalInput.style.display = 'none';
  codeInput.style.display = 'none';
  verifyInput.style.display = 'none';
  verifyProgress.style.display = 'none';
  welcomeGeneral.style.display = 'none';
  welcomeCode.style.display = 'none';
  welcomeVerify.style.display = 'none';
  verifyMode = false;

  if (mode === 'code') {
    codeInput.style.display = 'flex';
    welcomeCode.style.display = 'block';
    await loadProjects();
  } else if (mode === 'verify') {
    verifyInput.style.display = 'flex';
    welcomeVerify.style.display = 'block';
    verifyMode = true;
    await loadAgents();
  } else {
    generalInput.style.display = 'flex';
    welcomeGeneral.style.display = 'block';
  }
});

// 프로젝트 목록 로드
async function loadProjects() {
  try {
    const response = await fetch('/api/projects', {
      headers: { 'X-Access-Pin': accessPin }
    });
    const data = await response.json();

    if (data.projects) {
      projectSelect.innerHTML = '<option value="">프로젝트를 선택하세요</option>';
      data.projects.forEach(p => {
        if (p.exists) {
          projectSelect.innerHTML += `<option value="${p.name}">${p.name} - ${p.description}</option>`;
        }
      });
    }
  } catch (error) {
    console.error('프로젝트 로드 실패:', error);
  }
}

// 코드 학습 시작
startCodeBtn.addEventListener('click', startCodeLearning);

async function startCodeLearning() {
  const projectName = projectSelect.value;
  if (!projectName) return;

  chatMessages.innerHTML = '';
  startCodeBtn.disabled = true;
  startCodeBtn.textContent = '분석 중...';

  addLoadingMessage('프로젝트를 분석하고 있습니다...');

  try {
    const response = await fetch('/api/learn-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Pin': accessPin
      },
      body: JSON.stringify({ projectName, sessionId })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    removeLoading();

    // 진도 저장 초기화
    currentTopic = `코드: ${projectName}`;
    chatHistory = [];

    addMessageWithSave('아키텍처 분석', data.analysis, 'assistant');

    setTimeout(() => {
      addMessageWithSave('소크라테스의 질문', data.question, 'assistant');
      showActionButtons();
    }, 500);

    // 리소스 패널에 GitHub 링크 표시
    videoList.innerHTML = `<a href="${data.github}" target="_blank" class="article-card">
      <div class="article-title">GitHub 저장소</div>
      <div class="article-snippet">${data.github}</div>
    </a>`;
    articleList.innerHTML = '<p class="empty-state">코드 학습 모드</p>';

    chatInputBox.style.display = 'flex';
    chatInput.focus();

  } catch (error) {
    removeLoading();
    addMessage('오류', error.message, 'assistant');
  } finally {
    startCodeBtn.disabled = false;
    startCodeBtn.textContent = '분석 시작';
  }
}

// 예시 주제 칩
const topicChips = document.getElementById('topicChips');
topicChips.addEventListener('click', (e) => {
  if (!e.target.classList.contains('topic-chip')) return;
  topicInput.value = e.target.dataset.topic;
  topicInput.focus();
});

// 학습 시작
startBtn.addEventListener('click', startLearning);
topicInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') startLearning();
});

async function startLearning() {
  const topic = topicInput.value.trim();
  if (!topic) return;

  // UI 초기화
  chatMessages.innerHTML = '';
  topicChips.style.display = 'none';
  startBtn.disabled = true;
  startBtn.textContent = '학습 중...';

  // 로딩 표시
  addLoadingMessage('제1원리를 찾고 있습니다...');

  try {
    const response = await fetch('/api/learn', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Pin': accessPin
      },
      body: JSON.stringify({ topic, sessionId })
    });

    const data = await response.json();

    if (response.status === 401) {
      localStorage.removeItem('accessPin');
      location.reload();
      return;
    }

    if (!response.ok) throw new Error(data.error);

    // 로딩 제거
    removeLoading();

    // 진도 저장 초기화
    currentTopic = topic;
    chatHistory = [];

    // 메시지 표시 (저장 포함)
    addMessageWithSave('제1원리 (Big Picture)', data.firstPrinciple, 'assistant');

    setTimeout(() => {
      addMessageWithSave('소크라테스의 질문', data.question, 'assistant');
      showActionButtons();
    }, 500);

    // 리소스 표시
    displayResources(data.resources);

    // 미션 표시
    displayMission(data.mission);

    // 채팅 입력창 표시
    chatInputBox.style.display = 'flex';
    chatInput.focus();

  } catch (error) {
    removeLoading();
    addMessage('오류', error.message, 'assistant');
  } finally {
    startBtn.disabled = false;
    startBtn.textContent = '학습 시작';
  }
}

// 대화 전송
sendBtn.addEventListener('click', sendChat);
chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendChat();
});

async function sendChat() {
  const message = chatInput.value.trim();
  if (!message) return;

  // 사용자 메시지 표시 (저장 포함)
  addMessageWithSave('나', message, 'user');
  chatInput.value = '';
  sendBtn.disabled = true;

  // 로딩 표시
  addLoadingMessage('생각 중...');

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Pin': accessPin
      },
      body: JSON.stringify({ message, sessionId })
    });

    const data = await response.json();

    if (response.status === 401) {
      localStorage.removeItem('accessPin');
      location.reload();
      return;
    }

    if (!response.ok) throw new Error(data.error);

    removeLoading();
    addMessageWithSave('튜터', data.response, 'assistant');

  } catch (error) {
    removeLoading();
    addMessage('오류', error.message, 'assistant');
  } finally {
    sendBtn.disabled = false;
  }
}

// 메시지 추가
function addMessage(label, content, type) {
  const div = document.createElement('div');
  div.className = `message ${type}`;
  div.innerHTML = `
    <div class="message-label">${label}</div>
    <div class="message-content">${formatContent(content)}</div>
  `;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 마크다운 기본 변환
function formatContent(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

// 로딩 메시지
function addLoadingMessage(text) {
  const div = document.createElement('div');
  div.className = 'loading';
  div.id = 'loadingMessage';
  div.innerHTML = `
    <div class="loading-spinner"></div>
    <span>${text}</span>
  `;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeLoading() {
  const loading = document.getElementById('loadingMessage');
  if (loading) loading.remove();
}

// 리소스 표시
function displayResources(resources) {
  // 비디오
  if (resources.videos && resources.videos.length > 0) {
    videoList.innerHTML = resources.videos.map(video => `
      <a href="${video.link}" target="_blank" class="video-card">
        <img src="${video.thumbnail}" alt="" class="video-thumbnail">
        <div class="video-info">
          <div class="video-title">${video.title}</div>
          <div class="video-channel">${video.channel}</div>
        </div>
      </a>
    `).join('');
  } else {
    videoList.innerHTML = '<p class="empty-state">관련 영상을 찾지 못했습니다</p>';
  }

  // 아티클
  if (resources.articles && resources.articles.length > 0) {
    articleList.innerHTML = resources.articles.map(article => `
      <a href="${article.link}" target="_blank" class="article-card">
        <div class="article-title">${article.title}</div>
        <div class="article-snippet">${article.snippet || ''}</div>
      </a>
    `).join('');
  } else {
    articleList.innerHTML = '<p class="empty-state">관련 자료를 찾지 못했습니다</p>';
  }
}

// 미션 표시
function displayMission(mission) {
  missionSection.style.display = 'block';
  missionContent.innerHTML = formatContent(mission);
}

// ========== 학습 진도 저장 ==========

function saveProgress() {
  const progress = {
    topic: currentTopic,
    mode: currentMode,
    chatHistory: chatHistory,
    lastUpdated: new Date().toISOString()
  };
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

function loadProgress() {
  const saved = localStorage.getItem(PROGRESS_KEY);
  if (!saved) return null;
  return JSON.parse(saved);
}

function clearProgress() {
  localStorage.removeItem(PROGRESS_KEY);
  currentTopic = '';
  chatHistory = [];
}

function showResumePrompt() {
  const progress = loadProgress();
  if (!progress || !progress.topic) return;

  const resumeDiv = document.createElement('div');
  resumeDiv.id = 'resumePrompt';
  resumeDiv.className = 'resume-prompt';
  resumeDiv.innerHTML = `
    <p>이전 학습: <strong>${progress.topic}</strong></p>
    <p class="resume-date">${new Date(progress.lastUpdated).toLocaleDateString('ko-KR')}</p>
    <div class="resume-buttons">
      <button id="resumeBtn">이어서 학습</button>
      <button id="newStartBtn">새로 시작</button>
    </div>
  `;
  chatMessages.appendChild(resumeDiv);

  document.getElementById('resumeBtn').onclick = resumeLearning;
  document.getElementById('newStartBtn').onclick = () => {
    clearProgress();
    resumeDiv.remove();
  };
}

function resumeLearning() {
  const progress = loadProgress();
  if (!progress) return;

  document.getElementById('resumePrompt')?.remove();
  currentTopic = progress.topic;
  currentMode = progress.mode;
  chatHistory = progress.chatHistory || [];

  // 대화 복원
  chatHistory.forEach(msg => {
    addMessage(msg.label, msg.content, msg.type);
  });

  chatInputBox.style.display = 'flex';
  chatInput.focus();
  showActionButtons();
}

// 메시지 추가 시 히스토리 저장
function addMessageWithSave(label, content, type) {
  addMessage(label, content, type);
  chatHistory.push({ label, content, type });
  saveProgress();
}

// 페이지 로드 시 진도 확인
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (!pinModal.classList.contains('hidden')) return;
    showResumePrompt();
  }, 500);
});

// ========== 퀴즈 모드 ==========

// eslint-disable-next-line no-unused-vars -- called via onclick in dynamic HTML
async function startQuiz() {
  if (!currentTopic || chatHistory.length < 2) {
    alert('먼저 학습을 진행해주세요!');
    return;
  }

  addMessage('퀴즈', '퀴즈를 생성하고 있습니다...', 'assistant');

  try {
    const response = await fetch('/api/quiz', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Pin': accessPin
      },
      body: JSON.stringify({ topic: currentTopic, chatHistory })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    // 마지막 메시지 교체
    const lastMsg = chatMessages.lastElementChild;
    if (lastMsg) lastMsg.remove();

    displayQuiz(data.quiz);
  } catch (error) {
    alert('퀴즈 생성 실패: ' + error.message);
  }
}

let quizData = null;
let quizScore = 0;
let currentQuestion = 0;

function displayQuiz(quiz) {
  quizData = quiz;
  quizScore = 0;
  currentQuestion = 0;

  showQuestion();
}

function showQuestion() {
  if (!quizData || currentQuestion >= quizData.questions.length) {
    showQuizResult();
    return;
  }

  const q = quizData.questions[currentQuestion];

  const quizHtml = `
    <div class="quiz-section" id="quizSection">
      <h4>문제 ${currentQuestion + 1} / ${quizData.questions.length}</h4>
      <div class="quiz-question">${q.question}</div>
      <div class="quiz-options">
        ${q.options.map((opt, i) => `
          <div class="quiz-option" data-index="${i}">${opt}</div>
        `).join('')}
      </div>
    </div>
  `;

  // 기존 퀴즈 섹션 제거
  document.getElementById('quizSection')?.remove();

  const div = document.createElement('div');
  div.innerHTML = quizHtml;
  chatMessages.appendChild(div.firstElementChild);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // 선택지 클릭 이벤트
  document.querySelectorAll('.quiz-option').forEach(opt => {
    opt.onclick = () => selectAnswer(parseInt(opt.dataset.index));
  });
}

function selectAnswer(index) {
  const q = quizData.questions[currentQuestion];
  const options = document.querySelectorAll('.quiz-option');

  options.forEach((opt, i) => {
    opt.onclick = null;
    if (i === q.answer) {
      opt.classList.add('correct');
    } else if (i === index && i !== q.answer) {
      opt.classList.add('wrong');
    }
  });

  if (index === q.answer) {
    quizScore++;
  }

  // 해설 표시
  const explanation = document.createElement('p');
  explanation.style.marginTop = '15px';
  explanation.style.color = '#888';
  explanation.innerHTML = `<strong>해설:</strong> ${q.explanation}`;
  document.getElementById('quizSection').appendChild(explanation);

  // 다음 문제 버튼
  setTimeout(() => {
    currentQuestion++;
    if (currentQuestion < quizData.questions.length) {
      showQuestion();
    } else {
      showQuizResult();
    }
  }, 2000);
}

function showQuizResult() {
  document.getElementById('quizSection')?.remove();

  const percent = Math.round((quizScore / quizData.questions.length) * 100);
  const resultHtml = `
    <div class="quiz-result">
      <h3>퀴즈 완료!</h3>
      <p style="font-size: 2rem; margin: 20px 0;">${quizScore} / ${quizData.questions.length}</p>
      <p>${percent}% 정답</p>
      ${percent >= 70 ? '<p style="color: #2ecc71;">훌륭해요!</p>' : '<p style="color: #f39c12;">조금 더 복습해보세요!</p>'}
    </div>
  `;

  addMessage('퀴즈 결과', resultHtml, 'assistant');

  // 점수 저장
  const progress = loadProgress() || {};
  progress.quizScores = progress.quizScores || [];
  progress.quizScores.push({ date: new Date().toISOString(), score: quizScore, total: quizData.questions.length });
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

// ========== PDF 내보내기 (html2pdf 사용) ==========

// eslint-disable-next-line no-unused-vars -- called via onclick in dynamic HTML
async function exportPDF() {
  if (!currentTopic || chatHistory.length < 2) {
    alert('내보낼 학습 내용이 없습니다!');
    return;
  }

  // html2pdf 로드
  if (!window.html2pdf) {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    document.head.appendChild(script);
    await new Promise(resolve => script.onload = resolve);
  }

  // PDF용 HTML 생성
  const pdfContent = document.createElement('div');
  pdfContent.style.cssText = 'padding: 20px; font-family: sans-serif; background: white; color: black;';

  pdfContent.innerHTML = `
    <h1 style="text-align: center; color: #667eea;">Top-Down Learner</h1>
    <h2 style="color: #333;">${currentTopic}</h2>
    <p style="color: #888;">학습일: ${new Date().toLocaleDateString('ko-KR')}</p>
    <hr style="margin: 20px 0;">
    ${chatHistory.map(msg => `
      <div style="margin-bottom: 20px;">
        <p style="font-weight: bold; color: #667eea; margin-bottom: 5px;">[${msg.label}]</p>
        <div style="line-height: 1.6; white-space: pre-wrap;">${msg.content.replace(/<[^>]*>/g, '')}</div>
      </div>
    `).join('')}
  `;

  const opt = {
    margin: 10,
    filename: `topdown-${currentTopic.replace(/[^a-zA-Z0-9가-힣]/g, '_')}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  await html2pdf().set(opt).from(pdfContent).save();
}

// 액션 버튼 표시
function showActionButtons() {
  const existing = document.getElementById('actionButtons');
  if (existing) return;

  const btnsHtml = `
    <div class="action-buttons" id="actionButtons">
      <button class="action-btn" onclick="startQuiz()">퀴즈 풀기</button>
      <button class="action-btn" onclick="exportPDF()">PDF 저장</button>
      <button class="action-btn" onclick="clearProgress(); location.reload();">진도 초기화</button>
    </div>
  `;

  const div = document.createElement('div');
  div.innerHTML = btnsHtml;
  chatMessages.appendChild(div.firstElementChild);
}

// ========== 에이전트 검증 학습 모드 ==========

const STEP_TITLES = [
  '컴포넌트 분해', '성공 기준 정의', '코드 검증 체크리스트',
  '아키텍처 패턴 분석', '의존성 및 폴백 검토', '프롬프트 품질 (CRAFT)', '개선 로드맵'
];

// 에이전트 목록 로드
async function loadAgents() {
  try {
    const response = await fetch('/api/agents', {
      headers: { 'X-Access-Pin': accessPin }
    });
    const data = await response.json();

    if (data.grouped) {
      agentSelect.innerHTML = '<option value="">검증할 에이전트를 선택하세요</option>';
      Object.entries(data.grouped).forEach(([category, agents]) => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = category.toUpperCase();
        agents.forEach(a => {
          const opt = document.createElement('option');
          opt.value = a.name;
          opt.textContent = `${a.name} (${a.pattern})`;
          optgroup.appendChild(opt);
        });
        agentSelect.appendChild(optgroup);
      });
    }
  } catch (error) {
    console.error('에이전트 로드 실패:', error);
  }
}

// 검증 시작
startVerifyBtn.addEventListener('click', startVerification);

async function startVerification() {
  const agentName = agentSelect.value;
  if (!agentName) return;

  chatMessages.innerHTML = '';
  startVerifyBtn.disabled = true;
  startVerifyBtn.textContent = '검증 준비 중...';

  addLoadingMessage('검증 학습을 준비하고 있습니다...');

  try {
    const response = await fetch('/api/verify-start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Pin': accessPin
      },
      body: JSON.stringify({ agentName, sessionId })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    removeLoading();

    currentTopic = `검증: ${agentName}`;
    chatHistory = [];

    // 진행 표시 업데이트
    verifyProgress.style.display = 'flex';
    updateStepIndicator(data.step, data.title);

    addMessageWithSave(`1단계: ${data.title}`, data.response, 'assistant');

    // 힌트 표시
    if (data.hint) {
      addMessage('힌트', data.hint, 'hint');
    }

    chatInputBox.style.display = 'flex';
    chatInput.focus();

    // 리소스 패널에 단계 표시
    displayVerifySteps(data.step);

  } catch (error) {
    removeLoading();
    addMessage('오류', error.message, 'assistant');
  } finally {
    startVerifyBtn.disabled = false;
    startVerifyBtn.textContent = '검증 시작';
  }
}

// 검증 대화
async function sendVerifyMessage() {
  const message = chatInput.value.trim();
  if (!message) return;

  addMessageWithSave('나의 답변', message, 'user');
  chatInput.value = '';

  addLoadingMessage('분석 중...');

  try {
    const response = await fetch('/api/verify-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Pin': accessPin
      },
      body: JSON.stringify({ message, sessionId })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    removeLoading();
    addMessageWithSave('멘토', data.response, 'assistant');

    // "다음 단계" 버튼 표시 조건
    if (data.response.includes('다음 단계') || data.response.includes('넘어갈')) {
      nextStepBtn.style.display = 'inline-block';
    }

  } catch (error) {
    removeLoading();
    addMessage('오류', error.message, 'assistant');
  }
}

// 다음 단계로 이동
nextStepBtn.addEventListener('click', goToNextStep);

async function goToNextStep() {
  nextStepBtn.style.display = 'none';
  addLoadingMessage('다음 단계로 이동 중...');

  try {
    const response = await fetch('/api/verify-next', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Pin': accessPin
      },
      body: JSON.stringify({ sessionId })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    removeLoading();

    if (data.isComplete) {
      verifyProgress.innerHTML = '<span class="step-complete">검증 완료!</span>';
      addMessageWithSave('검증 완료', data.response, 'assistant');
      showVerifyActionButtons();
    } else {
      updateStepIndicator(data.step, data.title);
      addMessageWithSave(`${data.step}단계: ${data.title}`, data.response, 'assistant');
      displayVerifySteps(data.step);
    }

  } catch (error) {
    removeLoading();
    addMessage('오류', error.message, 'assistant');
  }
}

function updateStepIndicator(step, title) {
  currentStepEl.textContent = step;
  stepTitleEl.textContent = title;
}

function displayVerifySteps(currentStep) {
  videoList.innerHTML = STEP_TITLES.map((title, i) => `
    <div class="verify-step-item ${i + 1 === currentStep ? 'active' : ''} ${i + 1 < currentStep ? 'done' : ''}">
      <span class="step-num">${i + 1}</span>
      <span>${title}</span>
    </div>
  `).join('');
  articleList.innerHTML = '<p class="empty-state">에이전트 검증 모드</p>';
}

function showVerifyActionButtons() {
  const btnsHtml = `
    <div class="action-buttons" id="actionButtons">
      <button class="action-btn" onclick="exportPDF()">PDF 저장</button>
      <button class="action-btn" onclick="location.reload();">새 검증 시작</button>
    </div>
  `;
  const div = document.createElement('div');
  div.innerHTML = btnsHtml;
  chatMessages.appendChild(div.firstElementChild);
}

// 전송 버튼 - 모드에 따라 분기
const originalSendClick = sendBtn.onclick;
sendBtn.onclick = null;
sendBtn.addEventListener('click', () => {
  if (verifyMode) {
    sendVerifyMessage();
  } else {
    sendMessage();
  }
});

// Enter 키 - 모드에 따라 분기
chatInput.removeEventListener('keypress', () => {});
chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    if (verifyMode) {
      sendVerifyMessage();
    } else {
      sendMessage();
    }
  }
});
