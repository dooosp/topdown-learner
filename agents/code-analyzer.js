const fs = require('fs');
const path = require('path');
const gemini = require('../services/gemini');

const SYSTEM_PROMPT = `당신은 코드 구조를 "큰 그림"으로 시각화하는 전문가입니다.

# 규칙
1. 코딩 용어 대신 일상적인 비유 사용
2. ASCII 아트로 아키텍처 맵 그리기
3. 데이터 흐름을 화살표(→)로 표현
4. 한국어로 설명`;

/**
 * 프로젝트 디렉토리 구조 스캔
 */
function scanDirectory(dirPath, depth = 0, maxDepth = 2) {
  if (depth > maxDepth) return [];

  const items = [];
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

      const fullPath = path.join(dirPath, entry.name);
      const item = { name: entry.name, type: entry.isDirectory() ? 'dir' : 'file' };

      if (entry.isDirectory()) {
        item.children = scanDirectory(fullPath, depth + 1, maxDepth);
      }
      items.push(item);
    }
  } catch (e) { /* ignore */ }

  return items;
}

/**
 * package.json에서 정보 추출
 */
function readPackageJson(projectPath) {
  try {
    const pkgPath = path.join(projectPath, 'package.json');
    return JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * 프로젝트 분석 및 아키텍처 맵 생성
 */
async function analyze(projectPath, projectName) {
  const structure = scanDirectory(projectPath);
  const pkg = readPackageJson(projectPath);

  const prompt = `프로젝트: ${projectName}
경로: ${projectPath}
디렉토리 구조: ${JSON.stringify(structure, null, 2)}
${pkg ? `의존성: ${Object.keys(pkg.dependencies || {}).join(', ')}` : ''}

이 프로젝트의:
1. **아키텍처 맵** (ASCII 아트, 데이터 흐름 포함)
2. **핵심 역할** (한 문장)
3. **배워야 할 개념** (3-5개, 레벨 1이 가장 기초)

코딩 용어는 쓰되, 반드시 일상 비유를 함께 제시하세요.`;

  return await gemini.generate(prompt, SYSTEM_PROMPT);
}

module.exports = { analyze, scanDirectory };
