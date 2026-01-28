// 세션 ID 생성
const sessionId = 'session_' + Date.now();

// PIN 저장
let accessPin = localStorage.getItem('accessPin') || '';

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

let currentMode = 'general';

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
  } catch (error) {
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
  if (mode === 'code') {
    generalInput.style.display = 'none';
    codeInput.style.display = 'flex';
    welcomeGeneral.style.display = 'none';
    welcomeCode.style.display = 'block';
    await loadProjects();
  } else {
    generalInput.style.display = 'flex';
    codeInput.style.display = 'none';
    welcomeGeneral.style.display = 'block';
    welcomeCode.style.display = 'none';
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

    addMessage('아키텍처 분석', data.analysis, 'assistant');

    setTimeout(() => {
      addMessage('소크라테스의 질문', data.question, 'assistant');
    }, 500);

    // 리소스 패널에 경로 표시
    videoList.innerHTML = `<p class="empty-state">경로: ${data.projectPath}</p>`;
    articleList.innerHTML = '<p class="empty-state">코드 학습 모드</p>';

    chatInputBox.style.display = 'flex';
    chatInput.focus();

  } catch (error) {
    removeLoading();
    addMessage('오류', error.message, 'assistant');
  } finally {
    startCodeBtn.disabled = false;
    startCodeBtn.textContent = '코드 학습';
  }
}

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
  startBtn.disabled = true;
  startBtn.textContent = '탐구 중...';

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

    // 메시지 표시
    addMessage('제1원리 (Big Picture)', data.firstPrinciple, 'assistant');

    setTimeout(() => {
      addMessage('소크라테스의 질문', data.question, 'assistant');
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
    startBtn.textContent = '탐구 시작';
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

  // 사용자 메시지 표시
  addMessage('나', message, 'user');
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
    addMessage('튜터', data.response, 'assistant');

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
