const fs = require('fs');
const path = require('path');

const PROJECTS_JSON_PATH = path.join(__dirname, '../data/projects.json');

/**
 * projects.json에서 프로젝트 목록 로드
 */
function parseProjects() {
  try {
    const data = JSON.parse(fs.readFileSync(PROJECTS_JSON_PATH, 'utf-8'));
    return data.projects.map(p => ({
      ...p,
      exists: true  // GitHub 기반이므로 항상 존재
    }));
  } catch (error) {
    console.error('프로젝트 목록 로드 실패:', error);
    return [];
  }
}

/**
 * 특정 프로젝트 정보 가져오기
 */
function getProject(name) {
  const projects = parseProjects();
  return projects.find(p => p.name === name);
}

module.exports = { parseProjects, getProject };
