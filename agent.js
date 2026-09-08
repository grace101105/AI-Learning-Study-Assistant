/**
 * Agentic Orchestrator
 * Implements the ReAct (Reasoning + Acting) loop:
 * Plan -> Thought -> Action (Tools / RAG) -> Observation -> Memory Update -> Grounded Response
 */

class AgenticOrchestrator {
  constructor() {
    this.geminiApiKey = localStorage.getItem('agy_gemini_api_key') || '';
    this.isProcessing = false;
    this.thoughtSteps = [];
  }

  setApiKey(key) {
    this.geminiApiKey = key.trim();
    localStorage.setItem('agy_gemini_api_key', this.geminiApiKey);
  }

  /**
   * Main Agent Execution Pipeline
   * @param {string} userMessage 
   * @param {Function} onStepCallback (stepType, stepTitle, stepDetail)
   * @returns {Promise<{text: string, citations: Array, toolResults: Array, activeWidget: string|null}>}
   */
  async processQuery(userMessage, onStepCallback = () => {}) {
    if (this.isProcessing) return;
    this.isProcessing = true;
    this.thoughtSteps = [];

    const recordStep = (type, title, detail) => {
      const step = { type, title, detail, timestamp: new Date().toLocaleTimeString() };
      this.thoughtSteps.push(step);
      onStepCallback(step);
    };

    try {
      // Step 1: Perceive & Retrieve Working Memory Context
      recordStep('thought', 'Perception & Goal Alignment', 
        `Analyzing user query: "${userMessage.slice(0, 70)}..." against Working Memory goal: "${window.memoryEngine.workingMemory.activeGoal}" and learner profile (Retention: ${window.memoryEngine.longTermMemory.learner.overallRetention}%).`);
      
      await this.sleep(400);

      // Step 2: Intent Classification & Tool Planning
      const intent = this.classifyIntent(userMessage);
      recordStep('plan', 'Execution Strategy Planned', 
        `Identified Intent: [${intent.category}]. Tools required: [${intent.tools.join(', ')}]. Context focus: "${intent.focusTopic}".`);

      await this.sleep(450);

      let retrievedChunks = [];
      let citations = [];
      let toolResults = [];
      let activeWidget = null;

      // Step 3: Execute RAG Retrieval if needed
      if (intent.tools.includes('search_knowledge_base')) {
        recordStep('action', 'Executing Tool: search_knowledge_base', 
          `Querying vector knowledge base for terms: "${intent.searchQuery || userMessage}"...`);
        
        await this.sleep(500);
        const searchResults = window.ragEngine.retrieve(intent.searchQuery || userMessage, 3);
        const formatted = window.ragEngine.formatContextForPrompt(searchResults);
        retrievedChunks = searchResults;
        citations = formatted.citations;

        recordStep('observation', 'Observation: RAG Context Retrieved', 
          `Found ${searchResults.length} relevant sections with confidence up to ${citations[0]?.confidence || '85%'}. Top source: ${citations[0]?.docTitle || 'Study Notes'}.`);
        
        await this.sleep(400);
      }

      // Step 4: Execute Domain Tools
      if (intent.tools.includes('generate_quiz')) {
        recordStep('action', 'Executing Tool: generate_quiz', 
          `Generating active recall assessment for topic: "${intent.focusTopic}"...`);
        
        await this.sleep(450);
        const quiz = window.studyTools.generateQuiz(intent.focusTopic);
        toolResults.push({ tool: 'generate_quiz', data: quiz });
        activeWidget = 'quiz';

        recordStep('observation', 'Observation: Quiz Generated', 
          `Formulated question on "${quiz.concept}" with 4 options and grounding rationale.`);
        
        await this.sleep(350);
      } else if (intent.tools.includes('review_flashcards')) {
        recordStep('action', 'Executing Tool: query_spaced_repetition_queue', 
          `Inspecting SM-2 queue for due flashcards...`);
        
        await this.sleep(400);
        const due = window.memoryEngine.getDueFlashcards();
        activeWidget = 'flashcards';

        recordStep('observation', 'Observation: Spaced Repetition Queue', 
          `Found ${due.length} items currently due for recall review.`);
        
        await this.sleep(300);
      } else if (intent.tools.includes('render_concept_graph')) {
        recordStep('action', 'Executing Tool: render_concept_graph', 
          `Synthesizing topological concept dependencies and learner mastery states...`);
        
        await this.sleep(450);
        activeWidget = 'concept_graph';

        recordStep('observation', 'Observation: Knowledge Graph Computed', 
          `Generated 12 concept nodes across Deep Learning, Algorithms, Systems, and Cognitive Science.`);
        
        await this.sleep(300);
      } else if (intent.tools.includes('execute_code')) {
        recordStep('action', 'Executing Tool: execute_code', 
          `Running interactive code simulation for algorithm demonstration...`);
        
        await this.sleep(500);
        const codeType = intent.focusTopic.includes('attention') ? 'attention' : (intent.focusTopic.includes('sm2') ? 'sm2' : 'dijkstra');
        const codeSnippet = window.studyTools.getCodeSnippet(codeType);
        const execResult = window.studyTools.executeCode(codeSnippet);
        toolResults.push({ tool: 'execute_code', snippet: codeSnippet, result: execResult });
        activeWidget = 'code_sandbox';

        recordStep('observation', 'Observation: Code Executed Successfully', 
          `Execution time: ${execResult.executionTime}. Output generated.`);
        
        await this.sleep(350);
      }

      // Step 5: Check Misconceptions in Short-Term Memory
      const unresolvedMisc = window.memoryEngine.shortTermMemory.activeMisconceptions.filter(m => !m.resolved);
      let misconceptionAlert = null;
      if (unresolvedMisc.length > 0) {
        misconceptionAlert = unresolvedMisc[0];
        recordStep('thought', 'Memory Alignment & Misconception Check', 
          `Noticed active learner misconception: "${misconceptionAlert.concept}". Preparing Socratic clarification.`);
        await this.sleep(300);
      }

      // Step 6: Formulate Final Pedagogical Response
      recordStep('thought', 'Response Synthesis & Dual Coding', 
        `Synthesizing grounded explanation, embedding citations, and structuring active recall prompt.`);
      await this.sleep(400);

      // Generate response via Gemini API if key is present, otherwise high-quality local pedagogical engine
      let responseText = '';
      if (this.geminiApiKey) {
        responseText = await this.callGeminiApi(userMessage, retrievedChunks, misconceptionAlert);
      } else {
        responseText = this.generateLocalAgentResponse(intent, userMessage, retrievedChunks, misconceptionAlert, activeWidget);
      }

      // Update Working Memory topic
      window.memoryEngine.setTopic(intent.focusTopic);
      window.memoryEngine.addTurn('user', userMessage);
      window.memoryEngine.addTurn('assistant', responseText, { citations, toolResults, activeWidget });

      this.isProcessing = false;
      return {
        text: responseText,
        citations,
        toolResults,
        activeWidget,
        thoughtSteps: this.thoughtSteps
      };

    } catch (err) {
      console.error('Agent processing error', err);
      this.isProcessing = false;
      recordStep('thought', 'Error Recovery', `An error occurred: ${err.message}. Gracefully falling back.`);
      return {
        text: `I encountered an issue processing that step: ${err.message}. Let's continue exploring your study materials!`,
        citations: [],
        toolResults: [],
        activeWidget: null,
        thoughtSteps: this.thoughtSteps
      };
    }
  }

  classifyIntent(message) {
    const text = message.toLowerCase();
    
    if (text.includes('quiz') || text.includes('test me') || text.includes('assess') || text.includes('check my understanding')) {
      let topic = 'Attention & Transformers';
      if (text.includes('dijkstra') || text.includes('graph') || text.includes('path')) topic = 'Dijkstra Algorithm';
      else if (text.includes('bellman') || text.includes('negative')) topic = 'Bellman-Ford & Negative Cycles';
      else if (text.includes('sm2') || text.includes('spaced') || text.includes('forgetting')) topic = 'SM-2 Spaced Repetition';
      else if (text.includes('raft') || text.includes('consensus')) topic = 'Raft Leader Election';
      
      return {
        category: 'Assessment & Active Recall',
        tools: ['search_knowledge_base', 'generate_quiz'],
        focusTopic: topic,
        searchQuery: topic
      };
    }

    if (text.includes('flashcard') || text.includes('review due') || text.includes('spaced repetition') || text.includes('cards')) {
      return {
        category: 'Spaced Repetition Review',
        tools: ['review_flashcards'],
        focusTopic: 'Spaced Repetition Deck',
        searchQuery: 'spaced repetition active recall'
      };
    }

    if (text.includes('graph') || text.includes('mind map') || text.includes('concept map') || text.includes('visualize knowledge')) {
      return {
        category: 'Knowledge Graph Visualization',
        tools: ['render_concept_graph'],
        focusTopic: 'Knowledge Graph',
        searchQuery: 'concepts'
      };
    }

    if (text.includes('code') || text.includes('run') || text.includes('sandbox') || text.includes('implementation') || text.includes('python')) {
      let topic = 'attention';
      if (text.includes('dijkstra')) topic = 'dijkstra';
      else if (text.includes('sm2') || text.includes('interval')) topic = 'sm2';
      return {
        category: 'Interactive Code Simulation',
        tools: ['execute_code'],
        focusTopic: topic,
        searchQuery: topic
      };
    }

    // Default: Explanation & RAG Retrieval
    let focusTopic = 'Transformer Self-Attention';
    if (text.includes('dijkstra') || text.includes('shortest path') || text.includes('graph')) focusTopic = 'Dijkstra & Graph Search';
    else if (text.includes('memory') || text.includes('ebbinghaus') || text.includes('retention') || text.includes('recall')) focusTopic = 'Cognitive Science & Memory';
    else if (text.includes('raft') || text.includes('distributed') || text.includes('consensus')) focusTopic = 'Raft Consensus Protocol';

    return {
      category: 'Concept Explanation & RAG Grounding',
      tools: ['search_knowledge_base'],
      focusTopic: focusTopic,
      searchQuery: text
    };
  }

  generateLocalAgentResponse(intent, userMessage, retrievedChunks, misconceptionAlert, activeWidget) {
    const topic = intent.focusTopic;

    if (activeWidget === 'quiz') {
      return `### 🎯 Targeted Active Recall Assessment: **${topic}**

Based on your current mastery tier and study notes, here is a targeted retrieval question to calibrate your understanding and strengthen your synaptic retention:

> **Active Recall Challenge:** Review the interactive options in the **Active Tools** panel on the right. Select the correct choice to update your learner profile and verify the core invariant!`;
    }

    if (activeWidget === 'flashcards') {
      const dueCount = window.memoryEngine.getDueFlashcards().length;
      return `### 🗂️ Spaced Repetition Session (SM-2 Algorithm)

You currently have **${dueCount} flashcard${dueCount === 1 ? '' : 's'}** ready for review according to your exponential forgetting curve intervals!

Reviewing now locks in memory stabilization. 
- Click on the card in the **Right Workspace** to flip between Question and Answer.
- Rate your recall accuracy (*Again*, *Hard*, *Good*, *Easy*) to recalibrate the Ease Factor ($EF$) and schedule the next optimal repetition.`;
    }

    if (activeWidget === 'concept_graph') {
      return `### 🧠 Interactive Knowledge & Concept Graph

I have loaded your multidimensional knowledge map in the **Right Workspace**. 

- **Color Legend:**
  - 🟢 **Emerald (85-100%):** Mastered
  - 🔵 **Cyan (70-84%):** Proficient
  - 🟡 **Amber (50-69%):** Developing
  - 🟣 **Violet (<50%):** Novice / Needs Attention
- Connected edges denote direct pedagogical prerequisites (e.g., *Scaled Dot-Product Attention* $\\rightarrow$ *Multi-Head Attention*).
- Click on any node to view detailed mastery metrics or drill into targeted practice!`;
    }

    if (activeWidget === 'code_sandbox') {
      return `### 💻 Interactive Code Simulation Sandbox

I have spun up the code execution environment in the **Right Workspace** to demonstrate **${topic}** with step-by-step telemetry:

- You can edit the parameters, add custom test cases, and click **Run Code** to inspect runtime variables in real time.
- Notice how the numerical scaling or graph relaxation guarantees the mathematical invariant!`;
    }

    // Comprehensive RAG Grounded Concept Explanation
    let response = '';

    if (topic.includes('Attention') || topic.includes('Transformer')) {
      response = `### 🔍 Grounded Deep Dive: Scaled Dot-Product Attention & Transformers [1]

To understand the architectural leap of Transformers over recurrent networks (RNNs), consider their core formulation:

$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{Q K^T}{\\sqrt{d_k}}\\right) V$$

#### 1. Why Recurrence Was Replaced [1]
In traditional RNNs and LSTMs, token computation occurs strictly sequentially: hidden state $h_t = f(h_{t-1}, x_t)$. This imposes an **$O(N)$ sequential dependency bottleneck**, preventing parallel training across GPU tensor cores and suffering from catastrophic forgetting over long context spans.

#### 2. The Mechanics of $Q$, $K$, and $V$
- **Query ($Q$):** What the current token is seeking (e.g., a verb seeking its direct object).
- **Key ($K$):** What other tokens broadcast as their identity or semantic role.
- **Value ($V$):** The actual conceptual content that gets routed into the output representation when $Q$ and $K$ align.

#### 3. Why the $\\sqrt{d_k}$ Scaling Factor is Vital [1]
As vector dimensionality $d_k$ increases (e.g., $d_k = 64$ or $128$), the dot products $Q K^T$ grow quadratically in magnitude. Without scaling by $\\frac{1}{\\sqrt{d_k}}$, the inputs to the $\\text{softmax}$ function become very large, pushing the function into regions where the gradient is practically zero. The scaling factor keeps the variance at $1$, ensuring stable backpropagation gradients.

#### 4. Extension: Multi-Head Attention
Instead of computing attention once, Multi-Head Attention projects $Q, K, V$ into $h$ subspaces:
$$\\text{MultiHead}(Q, K, V) = \\text{Concat}(\\text{head}_1, \\dots, \\text{head}_h) W^O$$
This allows the model to simultaneously track syntactic agreements, semantic coreferences, and long-range semantic dependencies.`;
    } else if (topic.includes('Dijkstra') || topic.includes('Shortest') || topic.includes('Graph')) {
      response = `### 🔍 Grounded Deep Dive: Dijkstra's Algorithm & Shortest Paths [1]

Dijkstra's algorithm finds single-source shortest paths on weighted graphs $G = (V, E)$ where edge weights $w(u, v) \\ge 0$.

#### 1. Core Invariant & Greedy Choice [1]
Using a min-priority heap, Dijkstra repeatedly extracts the unvisited vertex $u$ with minimum tentative distance $\\text{dist}[u]$.
- **Time Complexity:** $O((V + E) \\log V)$ using a binary min-heap, or $O(E + V \\log V)$ using a Fibonacci heap.
- **Invariant:** Once a node $u$ is popped from the priority queue, $\\text{dist}[u]$ is guaranteed to be optimal and will never decrease.

${misconceptionAlert ? `\n> ⚠️ **Memory Alert (Previous Misconception Noted):**\n> You previously asked about running Dijkstra on negative weights. Remember: **Dijkstra fundamentally breaks with negative edge weights**! Because it greedily marks vertices as finalized, it cannot re-evaluate paths if a negative edge later reduces total cost. For negative weights, we must use **Bellman-Ford** ($O(V \\cdot E)$) or Floyd-Warshall.` : ''}

#### 2. When to Use Bellman-Ford vs. A*
- Use **Bellman-Ford** when edge weights can be negative, or when you must detect negative weight cycles.
- Use **A* Search** ($f(n) = g(n) + h(n)$) when searching for a specific target node and an admissible heuristic $h(n) \\le h^*(n)$ is available.`;
    } else if (topic.includes('Memory') || topic.includes('Cognitive') || topic.includes('Spaced')) {
      response = `### 🧠 Grounded Deep Dive: The Science of Memory & Spaced Repetition [1]

#### 1. The Ebbinghaus Forgetting Curve
Without reinforcement, memory decay follows an exponential trajectory:
$$R = e^{-\\frac{t}{S}}$$
Where $R$ is memory retention, $t$ is time elapsed, and $S$ is memory stability.

#### 2. The SuperMemo SM-2 Algorithm [1]
To maximize study efficiency, review should occur just as memory retrieval probability approaches a critical threshold. SM-2 dynamically adjusts intervals based on recall quality $q \\in [0, 5]$:
$$\\text{EF}' = \\text{EF} + \\left(0.1 - (5 - q) \\cdot (0.08 + (5 - q) \\cdot 0.02)\\right)$$
$$\\text{Interval}(n) = \\text{Interval}(n-1) \\times \\text{EF}$$

#### 3. Active Recall vs. Passive Re-reading
Testing yourself through active retrieval forces neural reconstruction. Every successful recall event steepens memory stability $S$, lengthening subsequent retention by $2\\times$ to $5\\times$ compared to passive re-reading.`;
    } else if (topic.includes('Raft') || topic.includes('Consensus')) {
      response = `### 🛡️ Grounded Deep Dive: Distributed Consensus & The Raft Protocol [1]

In distributed systems, achieving consensus across independent servers despite network partitions and crashes is critical for database replication.

#### 1. The Three Roles [1]
- **Follower:** Responds to RPCs from candidates and leaders.
- **Candidate:** Runs for election when heartbeats cease.
- **Leader:** Handles client read/writes and replicates log entries.

#### 2. Randomized Election Timeouts
To avoid split-vote deadlocks where multiple candidates split the vote equally, Raft uses **randomized election timeouts (150ms - 300ms)**. One follower consistently times out first, increments term, votes for itself, and requests quorum before competitors awaken!`;
    } else {
      response = `### 📚 Grounded Knowledge Synthesis: ${topic}

Here is the synthesis based on your active study notes and memory state:

${retrievedChunks.length > 0 ? retrievedChunks.map((c, i) => `**Source [${i+1}] (${c.chunk.docTitle}):**\n${c.chunk.text.slice(0, 300)}...`).join('\n\n') : 'Retrieved general conceptual framework.'}

---
*Would you like to test your active recall with a quick 1-question quiz or inspect the interactive concept graph?*`;
    }

    return response;
  }

  async callGeminiApi(prompt, retrievedChunks, misconceptionAlert) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`;
    
    const contextText = retrievedChunks.map((c, idx) => `[Citation ${idx + 1}] Title: ${c.chunk.docTitle} - ${c.chunk.header}\n${c.chunk.text}`).join('\n\n');
    
    const systemPrompt = `You are an expert AI Learning & Study Assistant equipped with Agentic reasoning, RAG context, and Long-Term Memory.
Current Learner: Alex (Retention: ${window.memoryEngine.longTermMemory.learner.overallRetention}%).
Active Goal: ${window.memoryEngine.workingMemory.activeGoal}.
${misconceptionAlert ? `Note active learner misconception to address gently: ${misconceptionAlert.concept} - ${misconceptionAlert.detail}` : ''}

Use the following retrieved study notes to ground your answer with bracketed citations like [1], [2]:
${contextText}

Format your response with clear markdown headers, LaTeX math where appropriate ($...$ and $$...$$), bullet points, and conclude with a Socratic check for understanding.`;

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\nUser Question: ${prompt}` }]
        }
      ]
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`Gemini API returned status ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

window.agentOrchestrator = new AgenticOrchestrator();
