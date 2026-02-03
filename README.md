# topdown-learner

Socratic first-principles learning agent that breaks down any topic through progressive questioning, then bridges understanding to code.

## Agents

| Agent | Role |
|-------|------|
| Socratic | Guides learning through first-principles questioning |
| Abstractor | Extracts core concepts from complex topics |
| Curator | Finds and organizes relevant learning resources |
| Quiz Generator | Creates assessments to verify understanding |
| Code Analyzer | Connects concepts to real code patterns |
| Implementor | Generates practice exercises from learned concepts |

## Architecture

```
Express server (:3000)
  ├─ agents/
  │   ├─ socratic.js        → first-principles Q&A
  │   ├─ abstractor.js      → concept extraction
  │   ├─ curator.js         → resource discovery
  │   ├─ quiz-generator.js  → assessment creation
  │   ├─ code-analyzer.js   → code pattern mapping
  │   └─ implementor.js     → exercise generation
  ├─ services/
  │   ├─ gemini.js           → Gemini API integration
  │   └─ claude-md-parser.js → structured prompt parsing
  └─ public/                 → web UI
```

## Stack

- **Runtime**: Node.js + Express
- **AI**: Gemini API
- **Scraping**: Cheerio, Axios

## Setup

```bash
cp .env.example .env   # Add GEMINI_API_KEY
npm install
npm start              # http://localhost:3000
```
