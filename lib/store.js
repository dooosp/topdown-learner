const { getDB } = require('./db');

function createCurriculum(topic, structure, mermaid, totalWeeks) {
  const db = getDB();
  const result = db.prepare(
    'INSERT INTO curricula (topic, structure, mermaid_diagram, total_weeks) VALUES (?, ?, ?, ?)'
  ).run(topic, JSON.stringify(structure), mermaid || null, totalWeeks);
  return result.lastInsertRowid;
}

function getCurricula() {
  const db = getDB();
  const rows = db.prepare(`
    SELECT c.id, c.topic, c.total_weeks, c.created_at,
      (SELECT COUNT(*) FROM curriculum_weeks w WHERE w.curriculum_id = c.id AND w.status = 'completed') AS completed_weeks
    FROM curricula c
    ORDER BY c.created_at DESC
  `).all();
  return rows.map(r => ({
    id: r.id,
    topic: r.topic,
    totalWeeks: r.total_weeks,
    completedWeeks: r.completed_weeks,
    createdAt: r.created_at
  }));
}

function getCurriculumById(id) {
  const db = getDB();
  const row = db.prepare('SELECT * FROM curricula WHERE id = ?').get(id);
  if (!row) return null;

  const weeks = db.prepare(
    'SELECT * FROM curriculum_weeks WHERE curriculum_id = ? ORDER BY week_number'
  ).all(id);

  return {
    id: row.id,
    topic: row.topic,
    structure: JSON.parse(row.structure),
    mermaid: row.mermaid_diagram,
    totalWeeks: row.total_weeks,
    createdAt: row.created_at,
    weeks: weeks.map(w => ({
      weekNumber: w.week_number,
      title: w.title,
      objectives: JSON.parse(w.objectives || '[]'),
      concepts: JSON.parse(w.concepts || '[]'),
      prerequisites: JSON.parse(w.prerequisites || '[]'),
      topicForLearning: w.topic_for_learning,
      status: w.status,
      completedAt: w.completed_at
    }))
  };
}

function createWeeks(curriculumId, weeks) {
  const db = getDB();
  const insert = db.prepare(`
    INSERT INTO curriculum_weeks (curriculum_id, week_number, title, objectives, concepts, prerequisites, topic_for_learning)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items) => {
    for (const w of items) {
      insert.run(
        curriculumId,
        w.week,
        w.title,
        JSON.stringify(w.objectives || []),
        JSON.stringify(w.concepts || []),
        JSON.stringify(w.prerequisites || []),
        w.topic_for_learning
      );
    }
  });

  insertMany(weeks);
}

function updateWeekStatus(curriculumId, weekNumber, status) {
  const db = getDB();
  const completedAt = status === 'completed' ? new Date().toISOString() : null;
  db.prepare(
    'UPDATE curriculum_weeks SET status = ?, completed_at = ? WHERE curriculum_id = ? AND week_number = ?'
  ).run(status, completedAt, curriculumId, weekNumber);
}

function arePrerequisitesComplete(curriculumId, prerequisites) {
  if (!prerequisites || prerequisites.length === 0) return true;
  const db = getDB();
  const placeholders = prerequisites.map(() => '?').join(',');
  const row = db.prepare(`
    SELECT COUNT(*) AS cnt FROM curriculum_weeks
    WHERE curriculum_id = ? AND week_number IN (${placeholders}) AND status != 'completed'
  `).get(curriculumId, ...prerequisites);
  return row.cnt === 0;
}

function saveQuizResult(curriculumId, weekNumber, score, total) {
  const db = getDB();
  db.prepare(
    'INSERT INTO quiz_results (curriculum_id, week_number, score, total) VALUES (?, ?, ?, ?)'
  ).run(curriculumId, weekNumber, score, total);
}

function getQuizResults(curriculumId, weekNumber) {
  const db = getDB();
  return db.prepare(
    'SELECT score, total, created_at AS createdAt FROM quiz_results WHERE curriculum_id = ? AND week_number = ? ORDER BY created_at DESC'
  ).all(curriculumId, weekNumber);
}

function createSharedSession(id, topic, mode, chatHistory) {
  const db = getDB();
  db.prepare(
    'INSERT INTO shared_sessions (id, topic, mode, chat_history) VALUES (?, ?, ?, ?)'
  ).run(id, topic, mode || null, JSON.stringify(chatHistory || []));
}

function getSharedSessionById(id) {
  const db = getDB();
  const row = db.prepare(
    'SELECT id, topic, mode, chat_history, created_at AS createdAt FROM shared_sessions WHERE id = ?'
  ).get(id);

  if (!row) return null;
  return {
    id: row.id,
    topic: row.topic,
    mode: row.mode,
    createdAt: row.createdAt,
    chatHistory: JSON.parse(row.chat_history || '[]')
  };
}

function cleanExpiredSharedSessions(daysToKeep = 30) {
  const db = getDB();
  const result = db.prepare(
    "DELETE FROM shared_sessions WHERE created_at < datetime('now', ?)"
  ).run(`-${daysToKeep} days`);
  return result.changes;
}

function deleteCurriculum(id) {
  const db = getDB();
  const del = db.transaction(() => {
    db.prepare('DELETE FROM quiz_results WHERE curriculum_id = ?').run(id);
    db.prepare('DELETE FROM curriculum_weeks WHERE curriculum_id = ?').run(id);
    db.prepare('DELETE FROM curricula WHERE id = ?').run(id);
  });
  del();
}

module.exports = {
  createCurriculum,
  getCurricula,
  getCurriculumById,
  createWeeks,
  updateWeekStatus,
  arePrerequisitesComplete,
  saveQuizResult,
  getQuizResults,
  createSharedSession,
  getSharedSessionById,
  cleanExpiredSharedSessions,
  deleteCurriculum
};
