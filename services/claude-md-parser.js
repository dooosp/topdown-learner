const fs = require('fs');
const path = require('path');

const CLAUDE_MD_PATH = '/home/taeho/.claude/CLAUDE.md';

/**
 * CLAUDE.md에서 프로젝트 목록 파싱
 */
function parseProjects() {
  const content = fs.readFileSync(CLAUDE_MD_PATH, 'utf-8');
  const projects = [];

  // "## 프로젝트명" 패턴으로 분리
  const projectRegex = /## (\S+) \(([^)]+)\)\n([\s\S]*?)(?=\n## |\n# |$)/g;
  let match;

  while ((match = projectRegex.exec(content)) !== null) {
    const name = match[1];
    const description = match[2];
    const body = match[3];

    // 경로 추출
    const pathMatch = body.match(/경로:\s*(\S+)/);
    const projectPath = pathMatch ? pathMatch[1] : null;

    // GitHub URL 추출
    const githubMatch = body.match(/GitHub:\s*(https:\/\/github\.com\/\S+)/);
    const github = githubMatch ? githubMatch[1] : null;

    // 기능 추출 (간단히)
    const featuresMatch = body.match(/기능:\s*([\s\S]*?)(?=\n- [^-]|\n##|\n#|$)/);

    if (projectPath) {
      projects.push({
        name,
        description,
        path: projectPath,
        github,
        exists: fs.existsSync(projectPath)
      });
    }
  }

  return projects;
}

/**
 * 특정 프로젝트 정보 가져오기
 */
function getProject(name) {
  const projects = parseProjects();
  return projects.find(p => p.name === name);
}

module.exports = { parseProjects, getProject };
