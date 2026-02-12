// 세션 ID 생성
const sessionId = 'session_' + Date.now();

// PIN 저장
let accessPin = localStorage.getItem('accessPin') || '';

// 학습 진도 저장 키
const PROGRESS_KEY = 'topdown_progress';
const BOOKMARK_KEY = 'topdown_bookmarks';
const THEME_KEY = 'topdown_theme';
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
const themeToggleBtn = document.getElementById('themeToggleBtn');
const voiceBtn = document.getElementById('voiceBtn');
const bookmarkList = document.getElementById('bookmarkList');
const statsCards = document.getElementById('statsCards');
const quizTrendCanvas = document.getElementById('quizTrendChart');

// 도움말/내보내기/공유 모달
const shortcutHelp = document.getElementById('shortcutHelp');
const shortcutCloseBtn = document.getElementById('shortcutCloseBtn');
const exportModal = document.getElementById('exportModal');
const exportPdfBtn = document.getElementById('exportPdfBtn');
const exportMdBtn = document.getElementById('exportMdBtn');
const exportObsidianBtn = document.getElementById('exportObsidianBtn');
const exportCloseBtn = document.getElementById('exportCloseBtn');
const shareModal = document.getElementById('shareModal');
const shareUrlInput = document.getElementById('shareUrlInput');
const copyShareBtn = document.getElementById('copyShareBtn');
const shareXLink = document.getElementById('shareXLink');
const shareLinkedInLink = document.getElementById('shareLinkedInLink');
const shareCloseBtn = document.getElementById('shareCloseBtn');

// 모드 관련 요소
const modeSelector = document.getElementById('modeSelector');
const generalInput = document.getElementById('generalInput');
const codeInput = document.getElementById('codeInput');
const projectSelect = document.getElementById('projectSelect');
const startCodeBtn = document.getElementById('startCodeBtn');
const welcomeGeneral = document.getElementById('welcomeGeneral');
const welcomeCode = document.getElementById('welcomeCode');
const welcomeVerify = document.getElementById('welcomeVerify');
const welcomeCurriculum = document.getElementById('welcomeCurriculum');
const verifyInput = document.getElementById('verifyInput');
const agentSelect = document.getElementById('agentSelect');
const startVerifyBtn = document.getElementById('startVerifyBtn');
const verifyProgress = document.getElementById('verifyProgress');
const currentStepEl = document.getElementById('currentStep');
const stepTitleEl = document.getElementById('stepTitle');
const nextStepBtn = document.getElementById('nextStepBtn');
const curriculumInput = document.getElementById('curriculumInput');
const curriculumOptions = document.getElementById('curriculumOptions');
const curriculumTopicInput = document.getElementById('curriculumTopicInput');
const createCurriculumBtn = document.getElementById('createCurriculumBtn');
const useCodePatternsCheckbox = document.getElementById('useCodePatterns');

let currentMode = 'general';
let verifyMode = false;

// 진행률 바 요소
const progressBar = document.getElementById('progressBar');
const progressTopic = document.getElementById('progressTopic');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');

// 모바일 탭 요소
const mobileTabs = document.getElementById('mobileTabs');
const resourcePanel = document.getElementById('resourcePanel');
const chatPanel = document.querySelector('.chat-panel');

// 모드 전환 모달 요소
const switchModal = document.getElementById('switchModal');
const switchConfirmBtn = document.getElementById('switchConfirmBtn');
const switchCancelBtn = document.getElementById('switchCancelBtn');
let pendingModeSwitch = null; // { mode, target }
let quizTrendChart = null;
let speechRecognition = null;
let isRecording = false;
const sharedSessionId = window.location.pathname.startsWith('/shared/')
  ? decodeURIComponent(window.location.pathname.replace('/shared/', ''))
  : null;
const isSharedView = Boolean(sharedSessionId);

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripHtml(value) {
  return String(value ?? '').replace(/<[^>]*>/g, '');
}

function sanitizeUrl(rawUrl) {
  try {
    const url = new URL(rawUrl, window.location.origin);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return '#';
    }
    return url.toString();
  } catch {
    return '#';
  }
}

function normalizeFilename(value) {
  return String(value ?? 'note').replace(/[^a-zA-Z0-9가-힣_-]/g, '_');
}

function toggleModal(modalEl, shouldShow) {
  if (!modalEl) return;
  modalEl.style.display = shouldShow ? 'flex' : 'none';
}

function getMermaidTheme(theme) {
  return theme === 'light' ? 'default' : 'dark';
}

function applyTheme(theme, { persist = true } = {}) {
  const nextTheme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = nextTheme;

  if (persist) {
    localStorage.setItem(THEME_KEY, nextTheme);
  }

  if (themeToggleBtn) {
    themeToggleBtn.textContent = nextTheme === 'light' ? '☾' : '☀︎';
    themeToggleBtn.setAttribute('aria-label', nextTheme === 'light' ? '다크 모드 전환' : '라이트 모드 전환');
  }

  if (window.mermaid?.initialize) {
    window.mermaid.initialize({ startOnLoad: false, theme: getMermaidTheme(nextTheme) });
    if (currentMode === 'curriculum' && activeCurriculumId) {
      showCurriculumDetail(activeCurriculumId);
    }
  }

  renderStats();
}

function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme) {
    applyTheme(savedTheme, { persist: false });
    return;
  }
  const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  applyTheme(prefersLight ? 'light' : 'dark', { persist: false });
}

function closeAllModals() {
  if (pendingModeSwitch) {
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === currentMode);
    });
    pendingModeSwitch = null;
  }
  toggleModal(switchModal, false);
  toggleModal(shortcutHelp, false);
  toggleModal(exportModal, false);
  toggleModal(shareModal, false);
}

function shouldUseChatInput() {
  return chatInputBox.style.display !== 'none' && currentMode !== 'curriculum';
}

function focusPrimaryInput() {
  if (!pinModal.classList.contains('hidden')) {
    pinInput.focus();
    return;
  }

  if (shouldUseChatInput()) {
    chatInput.focus();
    return;
  }

  if (currentMode === 'code') {
    projectSelect.focus();
    return;
  }
  if (currentMode === 'verify') {
    agentSelect.focus();
    return;
  }
  if (currentMode === 'curriculum') {
    curriculumTopicInput.focus();
    return;
  }
  topicInput.focus();
}

// ========== 진행률 바 ==========
function updateProgressBar(topic, step, total) {
  progressBar.style.display = 'flex';
  progressTopic.textContent = topic;
  const percent = Math.round((step / total) * 100);
  progressFill.style.width = percent + '%';
  progressText.textContent = `${step}/${total}`;
}

function hideProgressBar() {
  progressBar.style.display = 'none';
}

// ========== 모바일 탭 ==========
mobileTabs.addEventListener('click', (e) => {
  const tab = e.target.closest('.mobile-tab');
  if (!tab) return;

  const tabType = tab.dataset.tab;
  mobileTabs.querySelectorAll('.mobile-tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');

  // 뱃지 제거
  const badge = tab.querySelector('.tab-badge');
  if (badge) badge.remove();

  if (tabType === 'chat') {
    chatPanel.classList.remove('hidden-mobile');
    resourcePanel.classList.add('hidden-mobile');
  } else {
    chatPanel.classList.add('hidden-mobile');
    resourcePanel.classList.remove('hidden-mobile');
  }
});

function showResourceBadge() {
  const resourceTab = mobileTabs.querySelector('[data-tab="resource"]');
  if (!resourceTab || resourceTab.classList.contains('active')) return;
  if (resourceTab.querySelector('.tab-badge')) return;
  const badge = document.createElement('span');
  badge.className = 'tab-badge';
  resourceTab.appendChild(badge);
}

function toggleShortcutHelp(forceOpen) {
  const isOpen = shortcutHelp.style.display === 'flex';
  const nextOpen = typeof forceOpen === 'boolean' ? forceOpen : !isOpen;
  toggleModal(shortcutHelp, nextOpen);
}

function switchModeByIndex(index) {
  const modeMap = ['general', 'code', 'verify', 'curriculum'];
  const mode = modeMap[index];
  if (!mode) return;
  const button = modeSelector.querySelector(`[data-mode="${mode}"]`);
  if (button) {
    button.click();
  }
}

async function moveVerifyStep(delta) {
  if (!verifyMode || !currentTopic.startsWith('검증:')) return;
  const currentStep = Number(currentStepEl.textContent || '1');
  const targetStep = Math.min(7, Math.max(1, currentStep + delta));
  if (targetStep === currentStep) return;
  await goToStep(targetStep);
}

function handleShortcut(event) {
  const key = event.key.toLowerCase();
  const isCtrl = event.ctrlKey || event.metaKey;

  if (isCtrl && key === 'k') {
    event.preventDefault();
    focusPrimaryInput();
    return;
  }

  if (isCtrl && ['1', '2', '3', '4'].includes(key)) {
    event.preventDefault();
    switchModeByIndex(Number(key) - 1);
    return;
  }

  if (isCtrl && key === '/') {
    event.preventDefault();
    toggleShortcutHelp();
    return;
  }

  if (event.key === 'Escape') {
    closeAllModals();
    return;
  }

  if (event.altKey && event.key === 'ArrowRight') {
    event.preventDefault();
    moveVerifyStep(1);
    return;
  }

  if (event.altKey && event.key === 'ArrowLeft') {
    event.preventDefault();
    moveVerifyStep(-1);
  }
}

if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const activeTheme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    applyTheme(activeTheme === 'light' ? 'dark' : 'light');
  });
}

if (shortcutCloseBtn) {
  shortcutCloseBtn.addEventListener('click', () => toggleShortcutHelp(false));
}
document.addEventListener('keydown', handleShortcut);

if (exportPdfBtn) exportPdfBtn.addEventListener('click', async () => { await exportPDF(); toggleModal(exportModal, false); });
if (exportMdBtn) exportMdBtn.addEventListener('click', () => { exportMarkdown(); toggleModal(exportModal, false); });
if (exportObsidianBtn) exportObsidianBtn.addEventListener('click', () => { exportObsidian(); toggleModal(exportModal, false); });
if (exportCloseBtn) exportCloseBtn.addEventListener('click', () => toggleModal(exportModal, false));
if (shareCloseBtn) shareCloseBtn.addEventListener('click', () => toggleModal(shareModal, false));
if (copyShareBtn) copyShareBtn.addEventListener('click', copyShareLink);

[shortcutHelp, exportModal, shareModal].forEach((modal) => {
  if (!modal) return;
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      toggleModal(modal, false);
    }
  });
});

// ========== 모드 전환 경고 ==========
switchConfirmBtn.addEventListener('click', () => {
  switchModal.style.display = 'none';
  if (pendingModeSwitch) {
    executeModeSwitch(pendingModeSwitch.mode, pendingModeSwitch.target);
    pendingModeSwitch = null;
  }
});

switchCancelBtn.addEventListener('click', () => {
  switchModal.style.display = 'none';
  // 이전 모드 버튼으로 복원
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === currentMode);
  });
  pendingModeSwitch = null;
});

// PIN 검증
if (isSharedView) {
  pinModal.classList.add('hidden');
} else if (accessPin) {
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
modeSelector.addEventListener('click', (e) => {
  if (!e.target.classList.contains('mode-btn')) return;

  const mode = e.target.dataset.mode;
  if (mode === currentMode) return;

  // 학습 중이면 경고 모달 표시
  if (chatHistory.length > 0) {
    pendingModeSwitch = { mode, target: e.target };
    // 버튼 미리 시각적 전환 (취소 시 복원됨)
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    switchModal.style.display = 'flex';
    return;
  }

  executeModeSwitch(mode, e.target);
});

async function executeModeSwitch(mode, targetBtn) {
  currentMode = mode;
  chatHistory = [];
  currentTopic = '';

  // 버튼 활성화 상태 변경
  document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
  targetBtn.classList.add('active');

  // 진행률 바 숨기기
  hideProgressBar();

  // UI 전환
  generalInput.style.display = 'none';
  codeInput.style.display = 'none';
  verifyInput.style.display = 'none';
  verifyProgress.style.display = 'none';
  curriculumInput.style.display = 'none';
  curriculumOptions.style.display = 'none';
  welcomeGeneral.style.display = 'none';
  welcomeCode.style.display = 'none';
  welcomeVerify.style.display = 'none';
  welcomeCurriculum.style.display = 'none';
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
  } else if (mode === 'curriculum') {
    curriculumInput.style.display = 'flex';
    curriculumOptions.style.display = 'flex';
    welcomeCurriculum.style.display = 'block';
    chatInputBox.style.display = 'none';
    await loadCurricula();
  } else {
    generalInput.style.display = 'flex';
    welcomeGeneral.style.display = 'block';
  }
}

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
    recordLearningSession(currentTopic, 'code');

    updateProgressBar(projectName, 1, 3);

    addMessageWithSave('아키텍처 분석', data.analysis, 'assistant');

    setTimeout(() => {
      addMessageWithSave('소크라테스의 질문', data.question, 'assistant');
      updateProgressBar(projectName, 2, 3);
      showActionButtons();
    }, 500);

    updateProgressBar(projectName, 3, 3);

    // 리소스 패널에 GitHub 링크 표시
    videoList.innerHTML = renderResourceCard({
      type: 'article',
      title: 'GitHub 저장소',
      link: data.github,
      snippet: data.github
    });
    articleList.innerHTML = '<p class="empty-state">코드 학습 모드</p>';
    bindBookmarkButtons(videoList);

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
    recordLearningSession(currentTopic, 'general');

    // 진행률 바: 원리추출(1) → 질문(2) → 자료(3) → 미션(4)
    updateProgressBar(topic, 1, 4);

    // 메시지 표시 (저장 포함)
    addMessageWithSave('제1원리 (Big Picture)', data.firstPrinciple, 'assistant');

    setTimeout(() => {
      addMessageWithSave('소크라테스의 질문', data.question, 'assistant');
      updateProgressBar(topic, 2, 4);
      showActionButtons();
    }, 500);

    // 리소스 표시
    displayResources(data.resources);
    updateProgressBar(topic, 3, 4);
    showResourceBadge();

    // 미션 표시
    displayMission(data.mission);
    updateProgressBar(topic, 4, 4);

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

// 대화 전송 이벤트는 파일 하단에서 모드별로 분기 처리

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

function highlightCode(container) {
  if (window.Prism?.highlightAllUnder) {
    window.Prism.highlightAllUnder(container);
  }
}

// 메시지 추가
function addMessage(label, content, type, options = {}) {
  const { rawHtml = false } = options;
  const div = document.createElement('div');
  div.className = `message ${type}`;
  const renderedContent = rawHtml ? String(content ?? '') : formatContent(content);
  div.innerHTML = `
    <div class="message-label">${escapeHtml(label)}</div>
    <div class="message-content">${renderedContent}</div>
  `;
  chatMessages.appendChild(div);
  highlightCode(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function normalizeCodeLanguage(language) {
  if (!language) return 'plaintext';
  const lang = language.toLowerCase();
  if (lang === 'js') return 'javascript';
  if (lang === 'ts') return 'typescript';
  if (lang === 'md') return 'markdown';
  return lang;
}

function formatInlineMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

// 마크다운 변환 (fenced code block + inline)
function formatContent(text) {
  const source = String(text ?? '');
  const codeBlocks = [];
  const withPlaceholders = source.replace(/```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g, (match, lang = '', code = '') => {
    const token = `@@CODEBLOCK_${codeBlocks.length}@@`;
    codeBlocks.push({
      language: normalizeCodeLanguage(lang),
      code: String(code).replace(/\n$/, '')
    });
    return token;
  });

  let html = escapeHtml(withPlaceholders);
  html = formatInlineMarkdown(html).replace(/\n/g, '<br>');

  codeBlocks.forEach((block, index) => {
    const token = `@@CODEBLOCK_${index}@@`;
    const replacement = `<pre class="code-block"><code class="language-${escapeHtml(block.language)}">${escapeHtml(block.code)}</code></pre>`;
    html = html.replace(token, replacement);
  });

  return html;
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

function loadBookmarks() {
  try {
    const saved = localStorage.getItem(BOOKMARK_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveBookmarks(bookmarks) {
  localStorage.setItem(BOOKMARK_KEY, JSON.stringify(bookmarks));
}

function isBookmarked(link) {
  return loadBookmarks().some(item => item.link === link);
}

function buildBookmarkPayload(resource) {
  return encodeURIComponent(JSON.stringify(resource));
}

function renderBookmarkButton(resource) {
  const active = isBookmarked(resource.link);
  return `
    <button class="bookmark-btn ${active ? 'active' : ''}" data-bookmark="${buildBookmarkPayload(resource)}" title="북마크">
      ${active ? '★' : '☆'}
    </button>
  `;
}

function bindBookmarkButtons(container) {
  container.querySelectorAll('.bookmark-btn').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const rawPayload = button.getAttribute('data-bookmark');
      if (!rawPayload) return;
      try {
        const resource = JSON.parse(decodeURIComponent(rawPayload));
        toggleBookmark(resource);
      } catch (error) {
        console.error('북마크 파싱 실패:', error);
      }
    });
  });
}

function toggleBookmark(resource) {
  const bookmarks = loadBookmarks();
  const index = bookmarks.findIndex(item => item.link === resource.link);
  if (index >= 0) {
    bookmarks.splice(index, 1);
  } else {
    bookmarks.unshift({
      ...resource,
      topic: currentTopic || resource.topic || '일반',
      date: new Date().toISOString()
    });
  }
  saveBookmarks(bookmarks.slice(0, 100));
  renderBookmarks();
  renderStats();
  refreshResourceBookmarks();
}

function refreshResourceBookmarks() {
  const cards = [videoList, articleList];
  cards.forEach((container) => {
    container.querySelectorAll('.bookmark-btn').forEach((button) => {
      const rawPayload = button.getAttribute('data-bookmark');
      if (!rawPayload) return;
      try {
        const resource = JSON.parse(decodeURIComponent(rawPayload));
        const active = isBookmarked(resource.link);
        button.classList.toggle('active', active);
        button.textContent = active ? '★' : '☆';
      } catch {
        // ignore
      }
    });
  });
}

function renderBookmarks() {
  const bookmarks = loadBookmarks();
  if (!bookmarks.length) {
    bookmarkList.innerHTML = '<p class="empty-state">북마크한 자료가 없습니다</p>';
    return;
  }

  bookmarkList.innerHTML = bookmarks.map(item => `
    <div class="resource-card-wrap">
      <a href="${sanitizeUrl(item.link)}" target="_blank" rel="noopener noreferrer" class="article-card">
        <div class="article-title">${escapeHtml(item.title)}</div>
        <div class="article-snippet">${escapeHtml(item.topic || '')}${item.date ? ` · ${new Date(item.date).toLocaleDateString('ko-KR')}` : ''}</div>
      </a>
      ${renderBookmarkButton(item)}
    </div>
  `).join('');

  bindBookmarkButtons(bookmarkList);
}

function renderResourceCard(resource) {
  const base = {
    title: resource.title,
    link: resource.link,
    type: resource.type,
    topic: currentTopic
  };
  if (resource.type === 'video') {
    return `
      <div class="resource-card-wrap">
        <a href="${sanitizeUrl(resource.link)}" target="_blank" rel="noopener noreferrer" class="video-card">
          <img src="${escapeHtml(resource.thumbnail || '')}" alt="" class="video-thumbnail">
          <div class="video-info">
            <div class="video-title">${escapeHtml(resource.title)}</div>
            <div class="video-channel">${escapeHtml(resource.channel || '')}</div>
          </div>
        </a>
        ${renderBookmarkButton(base)}
      </div>
    `;
  }

  return `
    <div class="resource-card-wrap">
      <a href="${sanitizeUrl(resource.link)}" target="_blank" rel="noopener noreferrer" class="article-card">
        <div class="article-title">${escapeHtml(resource.title)}</div>
        <div class="article-snippet">${escapeHtml(resource.snippet || '')}</div>
      </a>
      ${renderBookmarkButton(base)}
    </div>
  `;
}

// 리소스 표시
function displayResources(resources) {
  const safeResources = resources || {};
  // 비디오
  if (safeResources.videos && safeResources.videos.length > 0) {
    videoList.innerHTML = safeResources.videos.map(video => renderResourceCard({
      type: 'video',
      title: video.title,
      link: video.link,
      channel: video.channel,
      thumbnail: video.thumbnail
    })).join('');
  } else {
    videoList.innerHTML = '<p class="empty-state">관련 영상을 찾지 못했습니다</p>';
  }

  // 아티클
  if (safeResources.articles && safeResources.articles.length > 0) {
    articleList.innerHTML = safeResources.articles.map(article => renderResourceCard({
      type: 'article',
      title: article.title,
      link: article.link,
      snippet: article.snippet || ''
    })).join('');
  } else {
    articleList.innerHTML = '<p class="empty-state">관련 자료를 찾지 못했습니다</p>';
  }

  bindBookmarkButtons(videoList);
  bindBookmarkButtons(articleList);
}

// 미션 표시
function displayMission(mission) {
  missionSection.style.display = 'block';
  missionContent.innerHTML = formatContent(mission);
  highlightCode(missionContent);
}

// ========== 학습 진도 저장 ==========

function saveProgress() {
  updateStoredProgress((progress) => {
    progress.topic = currentTopic;
    progress.mode = currentMode;
    progress.chatHistory = chatHistory;
    progress.lastUpdated = new Date().toISOString();
  });
  renderStats();
}

function loadProgress() {
  try {
    const saved = localStorage.getItem(PROGRESS_KEY);
    if (!saved) return null;
    const progress = JSON.parse(saved);
    if (!progress || typeof progress !== 'object') return null;
    return progress;
  } catch {
    return null;
  }
}

function updateStoredProgress(mutator) {
  const progress = loadProgress() || {};
  progress.chatHistory = Array.isArray(progress.chatHistory) ? progress.chatHistory : [];
  progress.quizScores = Array.isArray(progress.quizScores) ? progress.quizScores : [];
  progress.learningHistory = Array.isArray(progress.learningHistory) ? progress.learningHistory : [];
  mutator(progress);
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  return progress;
}

function clearProgress() {
  localStorage.removeItem(PROGRESS_KEY);
  currentTopic = '';
  chatHistory = [];
  renderStats();
}

function recordLearningSession(topic, mode) {
  if (!topic) return;
  updateStoredProgress((progress) => {
    const history = progress.learningHistory || [];
    const today = new Date().toISOString().slice(0, 10);
    const hasTodayEntry = history.some(item => item.topic === topic && item.mode === mode && String(item.date).startsWith(today));
    if (!hasTodayEntry) {
      history.unshift({
        topic,
        mode,
        date: new Date().toISOString()
      });
      progress.learningHistory = history.slice(0, 300);
    }
  });
  renderStats();
}

function dateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function calculateLearningStreak(items) {
  if (!items.length) return 0;
  const daySet = new Set(items.map(item => dateKey(item.date)).filter(Boolean));
  let streak = 0;
  const cursor = new Date();
  while (daySet.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function renderQuizTrendChart(quizScores) {
  if (!quizTrendCanvas || !window.Chart) return;
  if (quizTrendChart) {
    quizTrendChart.destroy();
    quizTrendChart = null;
  }

  if (!quizScores.length) {
    quizTrendCanvas.style.display = 'none';
    return;
  }
  quizTrendCanvas.style.display = 'block';

  const computed = getComputedStyle(document.documentElement);
  const accent = computed.getPropertyValue('--accent').trim() || '#667eea';
  const textColor = computed.getPropertyValue('--text-muted').trim() || '#888';
  const labels = quizScores.map(item => new Date(item.date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }));
  const values = quizScores.map(item => Math.round((item.score / item.total) * 100));
  const ctx = quizTrendCanvas.getContext('2d');

  quizTrendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: '퀴즈 점수(%)',
        data: values,
        borderColor: accent,
        backgroundColor: `${accent}33`,
        fill: true,
        tension: 0.35,
        pointRadius: 3
      }]
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          ticks: { color: textColor, maxTicksLimit: 6 },
          grid: { display: false }
        },
        y: {
          min: 0,
          max: 100,
          ticks: { color: textColor, callback: (value) => `${value}%` },
          grid: { color: `${accent}22` }
        }
      }
    }
  });
}

function renderStats() {
  if (!statsCards) return;

  const progress = loadProgress() || {};
  const history = Array.isArray(progress.learningHistory) ? progress.learningHistory : [];
  const quizScores = Array.isArray(progress.quizScores) ? progress.quizScores : [];

  const uniqueTopics = new Set(history.map(item => item.topic).filter(Boolean));
  const avgScore = quizScores.length
    ? Math.round(quizScores.reduce((sum, item) => sum + (item.score / item.total) * 100, 0) / quizScores.length)
    : 0;
  const streak = calculateLearningStreak(history);

  statsCards.innerHTML = `
    <div class="stat-card">
      <span class="stat-label">학습 주제</span>
      <span class="stat-value">${uniqueTopics.size}</span>
    </div>
    <div class="stat-card">
      <span class="stat-label">퀴즈 평균</span>
      <span class="stat-value">${avgScore}%</span>
    </div>
    <div class="stat-card">
      <span class="stat-label">연속 학습일</span>
      <span class="stat-value">${streak}일</span>
    </div>
  `;

  renderQuizTrendChart(quizScores.slice(-14));
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

  // 진행률 바 복원
  if (currentTopic) {
    updateProgressBar(currentTopic, chatHistory.length, chatHistory.length);
  }

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

function initVoiceInput() {
  if (!voiceBtn) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    voiceBtn.style.display = 'none';
    return;
  }

  speechRecognition = new SpeechRecognition();
  speechRecognition.lang = 'ko-KR';
  speechRecognition.interimResults = true;
  speechRecognition.continuous = false;

  speechRecognition.onstart = () => {
    isRecording = true;
    voiceBtn.classList.add('recording');
    voiceBtn.textContent = '⏺';
  };

  speechRecognition.onend = () => {
    isRecording = false;
    voiceBtn.classList.remove('recording');
    voiceBtn.textContent = '🎤';
  };

  speechRecognition.onresult = (event) => {
    const transcript = Array.from(event.results).map(result => result[0].transcript).join('');
    chatInput.value = transcript.trim();
    chatInput.focus();
  };

  speechRecognition.onerror = () => {
    isRecording = false;
    voiceBtn.classList.remove('recording');
    voiceBtn.textContent = '🎤';
  };

  voiceBtn.addEventListener('click', () => {
    if (isRecording) {
      speechRecognition.stop();
    } else {
      speechRecognition.start();
    }
  });
}

async function loadSharedSession() {
  if (!isSharedView) return;

  pinModal.classList.add('hidden');
  modeSelector.style.display = 'none';
  generalInput.style.display = 'none';
  codeInput.style.display = 'none';
  verifyInput.style.display = 'none';
  curriculumInput.style.display = 'none';
  curriculumOptions.style.display = 'none';
  verifyProgress.style.display = 'none';
  topicChips.style.display = 'none';
  resourcePanel.style.display = 'none';
  chatInputBox.style.display = 'none';
  chatMessages.innerHTML = '';
  hideProgressBar();
  document.querySelector('.subtitle').textContent = '읽기 전용 공유 노트';

  try {
    const response = await fetch(`/api/shared/${encodeURIComponent(sharedSessionId)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    currentTopic = data.shared.topic;
    chatHistory = Array.isArray(data.shared.chatHistory) ? data.shared.chatHistory : [];

    addMessage('공유 노트', `**${currentTopic}**\n\n생성일: ${new Date(data.shared.createdAt).toLocaleString('ko-KR')}`, 'assistant');
    chatHistory.forEach((msg) => {
      addMessage(msg.label || '메시지', msg.content || '', msg.type || 'assistant');
    });
  } catch (error) {
    addMessage('오류', `공유 노트를 불러오지 못했습니다: ${error.message}`, 'assistant');
  }
}

// 페이지 로드 시 진도 확인
document.addEventListener('DOMContentLoaded', async () => {
  if (window.mermaid?.initialize) {
    window.mermaid.initialize({ startOnLoad: false, theme: 'dark' });
  }
  initTheme();
  renderBookmarks();
  renderStats();
  initVoiceInput();

  if (isSharedView) {
    await loadSharedSession();
    return;
  }

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

  addMessage('퀴즈 결과', resultHtml, 'assistant', { rawHtml: true });

  // 점수 저장
  updateStoredProgress((progress) => {
    progress.quizScores = progress.quizScores || [];
    progress.quizScores.push({
      date: new Date().toISOString(),
      topic: currentTopic,
      score: quizScore,
      total: quizData.questions.length
    });
  });
  renderStats();
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

function ensureExportable() {
  if (!currentTopic || chatHistory.length < 2) {
    alert('내보낼 학습 내용이 없습니다!');
    return false;
  }
  return true;
}

// eslint-disable-next-line no-unused-vars -- called via onclick in dynamic HTML
function showExportModal() {
  if (!ensureExportable()) return;
  toggleModal(exportModal, true);
}

function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildMarkdownSections() {
  return chatHistory.map((msg) => {
    const content = stripHtml(msg.content).trim();
    return `## [${msg.label}]\n\n${content}`;
  }).join('\n\n---\n\n');
}

// eslint-disable-next-line no-unused-vars -- called via modal button
function exportMarkdown() {
  if (!ensureExportable()) return;
  const markdown = `# ${currentTopic}\n\n${buildMarkdownSections()}\n`;
  downloadTextFile(`topdown-${normalizeFilename(currentTopic)}.md`, markdown);
}

// eslint-disable-next-line no-unused-vars -- called via modal button
function exportObsidian() {
  if (!ensureExportable()) return;
  const safeTopic = stripHtml(currentTopic);
  const date = new Date().toISOString().slice(0, 10);
  const frontmatter = [
    '---',
    `title: "${safeTopic.replace(/"/g, '\\"')}"`,
    `date: ${date}`,
    'tags: [topdown, learner, study]',
    `topic: "${safeTopic.replace(/"/g, '\\"')}"`,
    '---',
    ''
  ].join('\n');
  const body = `${frontmatter}# [[${safeTopic}]]\n\n${buildMarkdownSections()}\n`;
  downloadTextFile(`obsidian-${normalizeFilename(safeTopic)}.md`, body);
}

function updateShareLinks(url) {
  if (!shareUrlInput) return;
  shareUrlInput.value = url;
  const encodedUrl = encodeURIComponent(url);
  const text = encodeURIComponent(`${currentTopic} 학습 노트 공유`);
  shareXLink.href = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${text}`;
  shareLinkedInLink.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
}

async function copyShareLink() {
  if (!shareUrlInput?.value) return;
  try {
    await navigator.clipboard.writeText(shareUrlInput.value);
    copyShareBtn.textContent = '복사됨!';
    setTimeout(() => { copyShareBtn.textContent = '링크 복사'; }, 1200);
  } catch {
    shareUrlInput.select();
    document.execCommand('copy');
  }
}

// eslint-disable-next-line no-unused-vars -- called via onclick in dynamic HTML
async function shareLearning() {
  if (!ensureExportable()) return;
  try {
    const response = await fetch('/api/share', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Pin': accessPin
      },
      body: JSON.stringify({
        topic: currentTopic,
        mode: currentMode,
        chatHistory
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '공유 링크 생성에 실패했습니다');
    updateShareLinks(data.url);
    toggleModal(shareModal, true);
  } catch (error) {
    alert(`공유 실패: ${error.message}`);
  }
}

// 액션 버튼 표시
function showActionButtons() {
  const existing = document.getElementById('actionButtons');
  if (existing) return;

  const btnsHtml = `
    <div class="action-buttons" id="actionButtons">
      <button class="action-btn" onclick="startQuiz()">퀴즈 풀기</button>
      <button class="action-btn" onclick="showExportModal()">내보내기</button>
      <button class="action-btn" onclick="shareLearning()">공유</button>
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
    recordLearningSession(currentTopic, 'verify');

    // 진행률 바
    updateProgressBar(agentName, data.step, 7);

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
  const currentStep = Number(currentStepEl.textContent || '1');
  await goToStep(currentStep + 1);
}

async function goToStep(step) {
  if (step < 1 || step > 7) return;
  nextStepBtn.style.display = 'none';
  addLoadingMessage(`${step}단계로 이동 중...`);

  try {
    const response = await fetch('/api/verify-step', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Pin': accessPin
      },
      body: JSON.stringify({ sessionId, step })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    removeLoading();

    if (data.isComplete) {
      verifyProgress.innerHTML = '<span class="step-complete">검증 완료!</span>';
      updateProgressBar(currentTopic.replace('검증: ', ''), 7, 7);
      addMessageWithSave('검증 완료', data.response, 'assistant');
      showVerifyActionButtons();
    } else {
      updateStepIndicator(data.step, data.title);
      updateProgressBar(currentTopic.replace('검증: ', ''), data.step, 7);
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
      <button class="action-btn" onclick="showExportModal()">내보내기</button>
      <button class="action-btn" onclick="shareLearning()">공유</button>
      <button class="action-btn" onclick="location.reload();">새 검증 시작</button>
    </div>
  `;
  const div = document.createElement('div');
  div.innerHTML = btnsHtml;
  chatMessages.appendChild(div.firstElementChild);
}

// ========== 커리큘럼 학습 모드 ==========

let activeCurriculumId = null;
let activeWeekNumber = null;

createCurriculumBtn.addEventListener('click', createCurriculum);
curriculumTopicInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') createCurriculum();
});

async function createCurriculum() {
  const topic = curriculumTopicInput.value.trim();
  if (!topic) return;

  createCurriculumBtn.disabled = true;
  createCurriculumBtn.textContent = '생성 중...';
  chatMessages.innerHTML = '';
  welcomeCurriculum.style.display = 'none';
  addLoadingMessage('AI가 커리큘럼을 설계하고 있습니다...');

  try {
    const response = await fetch('/api/curriculum', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Pin': accessPin
      },
      body: JSON.stringify({ topic, useCodePatterns: useCodePatternsCheckbox.checked })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    removeLoading();
    curriculumTopicInput.value = '';

    const modeLabel = useCodePatternsCheckbox.checked ? ' (코드 기반 초보→고급)' : '';
    addMessage('커리큘럼 생성 완료', `"${topic}" 커리큘럼이 ${data.curriculum.weeks.length}주차로 생성되었습니다.${modeLabel}`, 'assistant');

    // 상세 보기
    showCurriculumDetail(data.id);
  } catch (error) {
    removeLoading();
    addMessage('오류', error.message, 'assistant');
  } finally {
    createCurriculumBtn.disabled = false;
    createCurriculumBtn.textContent = '커리큘럼 생성';
  }
}

async function loadCurricula() {
  try {
    const response = await fetch('/api/curricula', {
      headers: { 'X-Access-Pin': accessPin }
    });
    const data = await response.json();

    const listEl = document.getElementById('curriculumList');
    if (!data.curricula || data.curricula.length === 0) {
      listEl.innerHTML = '<p class="empty-state">주제를 입력하여 첫 커리큘럼을 만들어보세요</p>';
      return;
    }

    listEl.innerHTML = data.curricula.map(c => {
      const percent = c.totalWeeks > 0 ? Math.round((c.completedWeeks / c.totalWeeks) * 100) : 0;
      return `
        <div class="curriculum-card" onclick="showCurriculumDetail(${c.id})">
          <div class="curriculum-card-header">
            <span class="curriculum-topic">${c.topic}</span>
            <button class="curriculum-delete-btn" onclick="event.stopPropagation(); deleteCurriculum(${c.id})" title="삭제">&times;</button>
          </div>
          <div class="curriculum-progress-bar">
            <div class="curriculum-progress-fill" style="width: ${percent}%"></div>
          </div>
          <div class="curriculum-meta">
            <span>${c.completedWeeks}/${c.totalWeeks}주차 완료</span>
            <span>${new Date(c.createdAt).toLocaleDateString('ko-KR')}</span>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('커리큘럼 목록 로드 실패:', error);
  }
}

async function showCurriculumDetail(id) {
  try {
    const response = await fetch(`/api/curriculum/${id}`, {
      headers: { 'X-Access-Pin': accessPin }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    const c = data.curriculum;
    activeCurriculumId = c.id;
    chatMessages.innerHTML = '';
    welcomeCurriculum.style.display = 'none';

    // Mermaid DAG
    if (c.mermaid) {
      const mermaidDiv = document.createElement('div');
      mermaidDiv.className = 'mermaid-container';
      mermaidDiv.innerHTML = `<pre class="mermaid">${c.mermaid}</pre>`;
      chatMessages.appendChild(mermaidDiv);
      try { await mermaid.run({ nodes: mermaidDiv.querySelectorAll('.mermaid') }); } catch (_) { /* mermaid parse error — ignore */ }
    }

    // 주차 카드 렌더링
    const weeksHtml = c.weeks.map(w => {
      const isLocked = w.prerequisites.length > 0 &&
        w.prerequisites.some(p => {
          const pw = c.weeks.find(wk => wk.weekNumber === p);
          return pw && pw.status !== 'completed';
        });
      const statusClass = w.status === 'completed' ? 'completed' : w.status === 'in_progress' ? 'in-progress' : (isLocked ? 'locked' : 'pending');
      const statusLabel = w.status === 'completed' ? '완료' : w.status === 'in_progress' ? '진행 중' : (isLocked ? '잠김' : '대기');

      return `
        <div class="week-card ${statusClass}">
          <div class="week-card-header">
            <span class="week-number">${w.weekNumber}주차</span>
            <span class="week-status-badge ${statusClass}">${statusLabel}</span>
          </div>
          <h4 class="week-title">${w.title}</h4>
          <div class="week-objectives">
            ${w.objectives.map(o => `<span class="week-tag">${o}</span>`).join('')}
          </div>
          <div class="week-concepts">
            ${w.concepts.map(co => `<span class="concept-tag">${co}</span>`).join('')}
          </div>
          ${w.prerequisites.length > 0 ? `<div class="week-prereqs">선수: ${w.prerequisites.map(p => p + '주차').join(', ')}</div>` : ''}
          <div class="week-actions">
            ${w.status === 'completed' ? '' :
              w.status === 'in_progress' ?
                `<button class="week-btn complete" onclick="completeWeek(${c.id}, ${w.weekNumber})">완료 처리</button>` :
                (isLocked ? '' : `<button class="week-btn start" onclick="startWeek(${c.id}, ${w.weekNumber})">학습 시작</button>`)
            }
          </div>
        </div>
      `;
    }).join('');

    const detailDiv = document.createElement('div');
    detailDiv.className = 'curriculum-detail';
    detailDiv.innerHTML = `
      <div class="curriculum-detail-header">
        <button class="back-btn" onclick="backToCurriculumList()">← 목록으로</button>
        <h3>${c.topic}</h3>
      </div>
      <div class="weeks-grid">${weeksHtml}</div>
    `;
    chatMessages.appendChild(detailDiv);

    // 리소스 패널에 진행 요약 표시
    const completed = c.weeks.filter(w => w.status === 'completed').length;
    const percent = Math.round((completed / c.totalWeeks) * 100);
    videoList.innerHTML = `
      <div class="curriculum-summary">
        <div class="summary-stat"><strong>${completed}</strong>/${c.totalWeeks} 주차 완료</div>
        <div class="curriculum-progress-bar large">
          <div class="curriculum-progress-fill" style="width: ${percent}%"></div>
        </div>
        <div class="summary-stat">${percent}% 진행</div>
      </div>
    `;
    articleList.innerHTML = '<p class="empty-state">커리큘럼 학습 모드</p>';

  } catch (error) {
    addMessage('오류', error.message, 'assistant');
  }
}

async function startWeek(curriculumId, weekNumber) {
  chatMessages.innerHTML = '';
  addLoadingMessage(`${weekNumber}주차 학습을 준비하고 있습니다...`);
  activeWeekNumber = weekNumber;
  activeCurriculumId = curriculumId;

  try {
    const response = await fetch(`/api/curriculum/${curriculumId}/week/${weekNumber}/start`, {
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

    currentTopic = data.firstPrinciple ? `커리큘럼 ${weekNumber}주차` : '';
    chatHistory = [];
    if (currentTopic) {
      recordLearningSession(currentTopic, 'curriculum');
    }

    updateProgressBar(`${weekNumber}주차`, 1, 4);

    addMessageWithSave('제1원리 (Big Picture)', data.firstPrinciple, 'assistant');
    setTimeout(() => {
      addMessageWithSave('소크라테스의 질문', data.question, 'assistant');
      // 주차 완료/돌아가기 버튼
      const btnsDiv = document.createElement('div');
      btnsDiv.className = 'action-buttons';
      btnsDiv.innerHTML = `
        <button class="action-btn" onclick="completeWeek(${curriculumId}, ${weekNumber})">이 주차 완료</button>
        <button class="action-btn" onclick="showCurriculumDetail(${curriculumId})">커리큘럼으로 돌아가기</button>
        <button class="action-btn" onclick="startQuiz()">퀴즈 풀기</button>
        <button class="action-btn" onclick="showExportModal()">내보내기</button>
        <button class="action-btn" onclick="shareLearning()">공유</button>
      `;
      chatMessages.appendChild(btnsDiv);
    }, 500);

    displayResources(data.resources);
    updateProgressBar(`${weekNumber}주차`, 3, 4);
    showResourceBadge();
    displayMission(data.mission);
    updateProgressBar(`${weekNumber}주차`, 4, 4);

    chatInputBox.style.display = 'flex';
    chatInput.focus();

  } catch (error) {
    removeLoading();
    addMessage('오류', error.message, 'assistant');
  }
}

async function completeWeek(curriculumId, weekNumber) {
  try {
    await fetch(`/api/curriculum/${curriculumId}/week/${weekNumber}/complete`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Pin': accessPin
      }
    });
    addMessage('완료', `${weekNumber}주차 학습을 완료했습니다!`, 'assistant');
    setTimeout(() => showCurriculumDetail(curriculumId), 1000);
  } catch (error) {
    addMessage('오류', error.message, 'assistant');
  }
}

async function deleteCurriculum(id) {
  if (!confirm('이 커리큘럼을 삭제하시겠습니까?')) return;
  try {
    await fetch(`/api/curriculum/${id}`, {
      method: 'DELETE',
      headers: { 'X-Access-Pin': accessPin }
    });
    loadCurricula();
  } catch (error) {
    console.error('삭제 실패:', error);
  }
}

function backToCurriculumList() {
  chatMessages.innerHTML = '';
  welcomeCurriculum.style.display = 'block';
  chatInputBox.style.display = 'none';
  loadCurricula();
}

// 전송 버튼 - 모드에 따라 분기
sendBtn.addEventListener('click', () => {
  if (verifyMode) {
    sendVerifyMessage();
  } else {
    sendChat();
  }
});

// Enter 키 - 모드에 따라 분기
chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    if (verifyMode) {
      sendVerifyMessage();
    } else {
      sendChat();
    }
  }
});
