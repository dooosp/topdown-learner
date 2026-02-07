const gemini = require('../services/gemini');

// GitHub 토큰 (private repo 접근용)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const SYSTEM_PROMPT = `당신은 코드 구조를 "큰 그림"으로 시각화하는 전문가입니다.

# 규칙
1. 코딩 용어 대신 일상적인 비유 사용
2. ASCII 아트로 아키텍처 맵 그리기
3. 데이터 흐름을 화살표(→)로 표현
4. 한국어로 설명`;

// GitHub API 헤더 (토큰 있으면 추가)
function getGitHubHeaders() {
  const headers = { 'Accept': 'application/vnd.github.v3+json' };
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `token ${GITHUB_TOKEN}`;
  }
  return headers;
}

/**
 * GitHub에서 파일 내용 가져오기
 */
async function fetchGitHubFile(repo, filePath) {
  const headers = getGitHubHeaders();
  const url = `https://raw.githubusercontent.com/${repo}/master/${filePath}`;
  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      // master 브랜치가 없으면 main 시도
      const mainUrl = `https://raw.githubusercontent.com/${repo}/main/${filePath}`;
      const mainResponse = await fetch(mainUrl, { headers });
      if (!mainResponse.ok) return null;
      return await mainResponse.text();
    }
    return await response.text();
  } catch (error) {
    console.error(`파일 fetch 실패: ${filePath}`, error);
    return null;
  }
}

/**
 * GitHub 저장소 구조 가져오기
 */
async function fetchRepoStructure(repo) {
  const url = `https://api.github.com/repos/${repo}/contents`;
  try {
    const response = await fetch(url, { headers: getGitHubHeaders() });
    if (!response.ok) return [];
    return await response.json();
  } catch {
    return [];
  }
}

/**
 * 프로젝트 분석 (GitHub 기반)
 */
async function analyze(project) {
  const { name, github, mainFiles } = project;

  // 주요 파일들 가져오기
  const fileContents = {};
  for (const file of mainFiles || []) {
    const content = await fetchGitHubFile(github, file);
    if (content) {
      // 너무 길면 앞부분만
      fileContents[file] = content.slice(0, 2000);
    }
  }

  // 저장소 구조 가져오기
  const structure = await fetchRepoStructure(github);
  const structureNames = structure.map(item =>
    `${item.type === 'dir' ? '📁' : '📄'} ${item.name}`
  ).join('\n');

  const prompt = `프로젝트: ${name}
GitHub: https://github.com/${github}

디렉토리 구조:
${structureNames}

주요 파일 내용:
${Object.entries(fileContents).map(([f, c]) => `--- ${f} ---\n${c}`).join('\n\n')}

이 프로젝트의:
1. **아키텍처 맵** (ASCII 아트, 데이터 흐름 포함)
2. **핵심 역할** (한 문장)
3. **배워야 할 개념** (3-5개, 레벨 1이 가장 기초)

코딩 용어는 쓰되, 반드시 일상 비유를 함께 제시하세요.`;

  return await gemini.generate(prompt, SYSTEM_PROMPT);
}

module.exports = { analyze, fetchGitHubFile };
