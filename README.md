# Antigravity StudyOS: Agentic AI Learning & Study Assistant

A personalized learning web application powered by **Agentic AI**, **Retrieval-Augmented Generation (RAG)**, **3-Tier Cognitive Memory**, and an **Interactive Study Toolkit**.

---

## 🏛️ Cognitive System Architecture

```
                                  +---------------------------------------+
                                  |         User / Student UI             |
                                  |  - Conversational Study Session       |
                                  |  - Interactive Knowledge Graph        |
                                  |  - Dynamic Flashcards & Quizzes       |
                                  |  - Real-Time Agent Reasoning Trace    |
                                  +-------------------+-------------------+
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |     Agentic Orchestration Core        |
                                  |  (Planner -> ReAct -> Tool -> Memory) |
                                  +---------+-------------------+---------+
                                            |                   |
            +-------------------------------+                   +-------------------------------+
            |                               |                                                   |
            v                               v                                                   v
+-----------------------+       +-----------------------+                           +-----------------------+
|      RAG Engine       |       |     Memory Engine     |                           |      Study Tools      |
| - Document Ingestion  |       | - Working Memory      |                           | - Flashcards & Quiz   |
| - Semantic Chunking   |       | - Session Chat History|                           | - Knowledge Mind Map  |
| - Vector/Keyword Rank |       | - Learner Profile     |                           | - Code Sandbox Runner |
| - Grounding Citations |       | - SM-2 Spaced Rep.    |                           | - Pomodoro Goal Timer |
+-----------------------+       +-----------------------+                           +-----------------------+
```

---

## ✨ Key Capabilities

### 1. 🤖 Agentic AI & ReAct Orchestration (`js/agent.js`)
- **Reasoning Stream**: Transparent display of the agent's internal cognitive phases:
  - `Thought`: Analyzes student request, checks active goals, inspects learner retention.
  - `Plan`: Formulates multi-step pedagogical strategy.
  - `Action`: Dispatches tools (`search_knowledge_base`, `generate_quiz`, `execute_code`, etc.).
  - `Observation`: Evaluates tool output and grounded RAG chunks.
  - `Synthesis`: Formulates clear explanation with citations and Socratic follow-up questions.
- **Dual Engine**: Works out-of-the-box offline with rich heuristic reasoning, or with a live Google Gemini API key.

### 2. 📚 RAG Knowledge Base (`js/rag.js`)
- Preloaded academic domains:
  - *Deep Learning: Attention Mechanisms & Transformers* (CS224N / Vaswani et al.)
  - *Algorithms: Graph Search & Shortest Paths* (CLRS 4th Ed. / MIT 6.006)
  - *Cognitive Science: Spaced Repetition & Recall* (Roediger, Karpicke & SuperMemo)
  - *Distributed Systems: Raft Consensus Protocol* (Ongaro & Ousterhout)
- **Document Chunking & Hybrid Retrieval**: BM25 & TF-IDF similarity matching with grounded citation badges `[1]`, `[2]`.
- **Note Ingestion**: Upload custom study notes or textbook excerpts directly from the UI.

### 3. 🧠 3-Tier Cognitive Memory (`js/memory.js`)
- **Working Memory**: Active goal, current topic, and cognitive load indicator.
- **Short-Term Memory**: Conversation history and active misconception catalog.
- **Long-Term Memory**:
  - Concept Mastery matrix (0-100% scores: *Novice*, *Developing*, *Proficient*, *Mastered*).
  - **SuperMemo SM-2 Spaced Repetition Queue**: Dynamically updates Ease Factor ($EF$), intervals, and next review dates based on recall grades.
  - Persistent across page reloads via `localStorage`.

### 4. 🛠️ Study Tools Suite (`js/tools.js`)
- **Interactive Knowledge Mind Map**: Interactive HTML5 Canvas showing concept nodes, progress rings, and prerequisites.
- **3D Spaced Repetition Flashcards**: Flippable card UI with SM-2 grading buttons (*Again*, *Hard*, *Good*, *Easy*).
- **Targeted Diagnostic Quizzes**: Multiple-choice assessment with instant grading and memory updates.
- **Code Execution Sandbox**: Runs live algorithms (Attention Softmax, Dijkstra, SM-2 Calculator) with `stdout` terminal output.
- **Pomodoro Focus Timer**: 25-minute focus cycles with automatic study session logging.

---

## 🚀 How to Run

Simply open `index.html` in any modern web browser (Chrome, Edge, Firefox, Safari):

```bash
# Optional: Serve locally using Python
python -m http.server 8000
# Then open http://localhost:8000
```
Or open the file directly:
`file:///C:/Users/hi/.gemini/antigravity/scratch/ai-study-assistant/index.html`
