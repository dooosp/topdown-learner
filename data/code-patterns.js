// 에이전트 에코시스템에서 추출한 코드 패턴 뼈대
// 커리큘럼 생성 시 Gemini 컨텍스트로 활용

const patterns = [
  // ===== 초보 (Beginner) =====
  {
    level: 'beginner',
    name: 'Express 서버 기본 구조',
    description: 'dotenv + Express + 정적 파일 서빙 + 미들웨어 구성',
    source: 'topdown-learner/server.js',
    skeleton: `require('dotenv').config();
const express = require('express');
const app = express();
app.use(express.json());
app.use(express.static('public'));
app.listen(process.env.PORT || 3000);`
  },
  {
    level: 'beginner',
    name: 'PIN 기반 인증 미들웨어',
    description: '헤더/바디에서 PIN 추출 → 환경변수 비교 → next() 또는 401',
    source: 'topdown-learner/server.js',
    skeleton: `function checkAuth(req, res, next) {
  const pin = req.headers['x-access-pin'] || req.body.pin;
  if (pin !== process.env.ACCESS_PIN) return res.status(401).json({ error: '인증 실패' });
  next();
}
app.post('/api/data', checkAuth, handler);`
  },
  {
    level: 'beginner',
    name: 'fetch API 호출',
    description: '외부 API 호출 + JSON 파싱 + 에러 처리',
    source: 'telegram-bot-agent/lib/api-client.js',
    skeleton: `async function fetchData(endpoint) {
  const res = await fetch(BASE_URL + endpoint);
  if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
  return res.json();
}`
  },
  {
    level: 'beginner',
    name: 'Gemini 서비스 래퍼',
    description: 'GoogleGenerativeAI 초기화 + generate/chat 함수',
    source: 'topdown-learner/services/gemini.js',
    skeleton: `const { GoogleGenerativeAI } = require('@google/generative-ai');
const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: 'gemini-3-flash-preview' });
async function generate(prompt, systemInstruction) {
  const result = await model.generateContent(systemInstruction + '\\n\\n' + prompt);
  return result.response.text();
}`
  },
  {
    level: 'beginner',
    name: 'Gemini 에이전트 패턴',
    description: 'SYSTEM_PROMPT 상수 + generate 호출 + 모듈 export',
    source: 'topdown-learner/agents/abstractor.js',
    skeleton: `const gemini = require('../services/gemini');
const SYSTEM_PROMPT = '# Role: 전문가\\n# 규칙: ...';
async function execute(input) {
  const prompt = '입력: "' + input + '"\\n출력 형식: ...';
  return await gemini.generate(prompt, SYSTEM_PROMPT);
}
module.exports = { execute };`
  },

  // ===== 중급 (Intermediate) =====
  {
    level: 'intermediate',
    name: 'LLM 래퍼 (withRetry + timeout)',
    description: 'Exponential backoff + jitter + 호출별 타임아웃 + JSON 파싱',
    source: 'shared-libs/llm-client',
    skeleton: `function createLLMClient({ provider, apiKey, model, timeout, maxRetries }) {
  async function withRetry(fn, retries = maxRetries) {
    for (let i = 0; i <= retries; i++) {
      try { return await Promise.race([fn(), sleep(timeout).then(() => { throw new Error('timeout'); })]); }
      catch (e) { if (i === retries) throw e; await sleep(Math.pow(2, i) * 1000 + Math.random() * 500); }
    }
  }
  return {
    chat: (prompt) => withRetry(() => callAPI(prompt)),
    chatJSON: (prompt) => withRetry(() => callAPI(prompt).then(JSON.parse))
  };
}`
  },
  {
    level: 'intermediate',
    name: 'SQLite 초기화 (싱글턴 + WAL)',
    description: 'better-sqlite3 싱글턴 패턴 + WAL 모드 + 스키마 초기화',
    source: 'invest-intelligence-loop/lib/db.js',
    skeleton: `const Database = require('better-sqlite3');
let _db = null;
function getDB() {
  if (_db) return _db;
  _db = new Database('data/app.db');
  _db.pragma('journal_mode = WAL');
  _db.pragma('busy_timeout = 5000');
  _db.exec('CREATE TABLE IF NOT EXISTS ...');
  return _db;
}
module.exports = { getDB };`
  },
  {
    level: 'intermediate',
    name: 'SQLite CRUD 스토어',
    description: 'prepare() + all/get/run + 트랜잭션 래퍼 + JSON 직렬화',
    source: 'invest-intelligence-loop/lib/store.js',
    skeleton: `const { getDB } = require('./db');
function loadAll() { return getDB().prepare('SELECT * FROM items').all(); }
function save(item) { getDB().prepare('INSERT INTO items (data) VALUES (?)').run(JSON.stringify(item)); }
function saveMany(items) {
  const db = getDB();
  const insert = db.prepare('INSERT INTO items (data) VALUES (?)');
  db.transaction((list) => { for (const item of list) insert.run(JSON.stringify(item)); })(items);
}`
  },
  {
    level: 'intermediate',
    name: '헬스체크 엔드포인트',
    description: '항상 200 반환 + DB/서비스 상태 포함 + 버전 정보',
    source: 'invest-intelligence-loop/server.js',
    skeleton: `app.get('/health', (_req, res) => {
  const dbOk = checkDB();
  const services = checkServices();
  res.status(200).json({ status: dbOk && services.allOk ? 'healthy' : 'degraded', db: dbOk, services, version: pkg.version, uptime: process.uptime() });
});
// 주의: 503 반환하면 Render/Railway 배포 실패 → 항상 200 + body에 상태 포함`
  },
  {
    level: 'intermediate',
    name: 'Telegram 봇 (Long Polling)',
    description: 'getUpdates offset 방식 + 명령어 라우팅 + HTML 파싱',
    source: 'telegram-bot-agent/index.js',
    skeleton: `let offset = 0;
async function poll() {
  const updates = await fetch(BOT_URL + '/getUpdates?offset=' + offset).then(r => r.json());
  for (const update of updates.result) {
    offset = update.update_id + 1;
    const text = update.message?.text;
    if (text === '/start') handleStart(update);
    else if (text.startsWith('/help')) handleHelp(update);
  }
  setTimeout(poll, 1000);
}
// HTML: <, >, & 반드시 이스케이프, <b><i><code><pre><a>만 허용`
  },

  // ===== 고급 (Advanced) =====
  {
    level: 'advanced',
    name: 'Circuit Breaker 패턴',
    description: 'CLOSED→OPEN→HALF_OPEN 상태 머신 + 실패 임계값 + 자동 복구',
    source: 'invest-intelligence-loop/quant/utils/circuit-breaker.js',
    skeleton: `class CircuitBreaker {
  constructor(name, { threshold = 5, resetTimeout = 60000 }) {
    this.state = 'CLOSED'; this.failures = 0;
  }
  async call(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() > this.nextAttempt) this.state = 'HALF_OPEN';
      else throw new Error('Circuit OPEN');
    }
    try { const r = await fn(); this.failures = 0; this.state = 'CLOSED'; return r; }
    catch (e) { this.failures++; if (this.failures >= this.threshold) { this.state = 'OPEN'; this.nextAttempt = Date.now() + this.resetTimeout; } throw e; }
  }
}`
  },
  {
    level: 'advanced',
    name: '이벤트 버스 (Pub/Sub)',
    description: 'EventEmitter 확장 + 이벤트 큐 + 최근 이벤트 리플레이',
    source: 'invest-intelligence-loop/shared/event-bus.js',
    skeleton: `const { EventEmitter } = require('events');
class EventBus extends EventEmitter {
  constructor() { super(); this._recentEvents = {}; }
  emit(event, data) {
    if (!this._recentEvents[event]) this._recentEvents[event] = [];
    this._recentEvents[event].push({ data, timestamp: Date.now() });
    if (this._recentEvents[event].length > 100) this._recentEvents[event].shift();
    super.emit(event, data);
  }
  getRecentEvents(event, count = 10) { return (this._recentEvents[event] || []).slice(-count); }
}
module.exports = new EventBus(); // 싱글턴`
  },
  {
    level: 'advanced',
    name: '프롬프트 A/B 테스트',
    description: 'MD5 해시 기반 일관적 분배 + 실험 결과 저장 + 통계 비교',
    source: 'invest-intelligence-loop/lib/prompts/ab-manager.js',
    skeleton: `const crypto = require('crypto');
function selectVariant(stockCode, experiment = 'default', variants = [{name:'v1',weight:50},{name:'v2',weight:50}]) {
  const hash = crypto.createHash('md5').update(stockCode + ':' + experiment + ':' + today()).digest('hex');
  const value = parseInt(hash.slice(0, 8), 16) % 100;
  let cumulative = 0;
  for (const v of variants) { cumulative += v.weight; if (value < cumulative) return v.name; }
}
function logResult({ experiment, variant, stockCode, score }) {
  db.prepare('INSERT INTO prompt_experiments (experiment, variant, stock_code, score) VALUES (?,?,?,?)').run(...);
}`
  },
  {
    level: 'advanced',
    name: '체크포인트/재개 (워크플로우)',
    description: '실행 중간 상태 저장 → 실패 시 마지막 완료 지점부터 재개',
    source: 'agent-orchestrator/lib/checkpoint.js',
    skeleton: `async function saveCheckpoint(workflowId, { currentStep, completedSteps, context }) {
  const data = { workflowId, currentStep, completedSteps, context, updatedAt: new Date().toISOString() };
  await fs.writeFile(checkpointPath(workflowId), JSON.stringify(data));
}
async function loadCheckpoint(workflowId) {
  try { return JSON.parse(await fs.readFile(checkpointPath(workflowId), 'utf-8')); }
  catch { return null; }
}
// 워크플로우 실행: for step of steps → if step > checkpoint.currentStep → execute → saveCheckpoint`
  },
  {
    level: 'advanced',
    name: 'YAML 워크플로우 오케스트레이션',
    description: '10개 어댑터 + 단계별 실행 + 타임아웃 + 조건부 분기',
    source: 'agent-orchestrator',
    skeleton: `// workflow.yml
// steps:
//   - name: fetch-data
//     adapter: http
//     config: { url: '...', method: GET }
//     timeout: 30000
//   - name: analyze
//     adapter: gemini
//     config: { prompt: '{{steps.fetch-data.output}}' }
//     depends_on: [fetch-data]
async function executeWorkflow(workflow) {
  for (const step of topologicalSort(workflow.steps)) {
    const adapter = adapters[step.adapter];
    const result = await Promise.race([adapter.execute(step.config, context), timeout(step.timeout)]);
    context[step.name] = result;
    await saveCheckpoint(workflow.id, { currentStep: step.name, context });
  }
}`
  },
  {
    level: 'advanced',
    name: 'Prometheus 메트릭 수집',
    description: 'prom-client + HTTP 미들웨어 + /metrics 엔드포인트',
    source: 'invest-intelligence-loop/lib/metrics.js',
    skeleton: `const { Registry, Counter, Histogram } = require('prom-client');
const register = new Registry();
const httpRequests = new Counter({ name: 'http_requests_total', help: 'Total HTTP requests', labelNames: ['method','path','status'], registers: [register] });
const httpDuration = new Histogram({ name: 'http_duration_seconds', help: 'HTTP duration', labelNames: ['method','path'], registers: [register] });
function httpMetricsMiddleware(req, res, next) {
  const end = httpDuration.startTimer({ method: req.method, path: req.path });
  res.on('finish', () => { httpRequests.inc({ method: req.method, path: req.path, status: res.statusCode }); end(); });
  next();
}
app.get('/metrics', async (_req, res) => { res.set('Content-Type', register.contentType); res.end(await register.metrics()); });`
  }
];

module.exports = patterns;
