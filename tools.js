/**
 * Study Assistant Tools Library
 * Provides interactive tools callable by the Agent or user:
 * - Quiz Generator & Evaluator
 * - 3D Flippable Flashcard Deck (SM-2 integration)
 * - Concept Knowledge Graph Canvas Visualizer
 * - Interactive Code Execution Sandbox
 * - Pomodoro Focus Cycle Timer
 */

class StudyTools {
  constructor() {
    this.activeQuiz = null;
    this.currentCardIndex = 0;
    this.pomodoro = {
      duration: 25 * 60,
      remaining: 25 * 60,
      isRunning: false,
      intervalId: null,
      mode: 'focus', // 'focus' | 'break'
      completedSessions: 3
    };
  }

  // TOOL: generate_quiz
  generateQuiz(topicOrConcept) {
    const quizBank = {
      'attention': {
        topic: 'Attention & Transformers',
        concept: 'Scaled Dot-Product Attention',
        question: 'In the equation Attention(Q, K, V) = softmax((Q * K^T) / sqrt(d_k)) * V, why is the division by sqrt(d_k) crucial for large embedding dimensions?',
        options: [
          'A) To enforce that all attention weights sum strictly to zero.',
          'B) To prevent large dot products from pushing softmax into regions with vanishingly small gradients.',
          'C) To reduce the computational complexity from O(N^2) to O(N log N).',
          'D) To convert keys and values from floating-point into integers.'
        ],
        correctIndex: 1,
        explanation: 'When d_k is large, dot products grow large in magnitude. Large positive inputs into softmax result in probabilities near 1 for the maximum and 0 for others, producing tiny gradients during backpropagation. Dividing by sqrt(d_k) stabilizes the variance of the dot product to 1.'
      },
      'dijkstra': {
        topic: 'Algorithms: Shortest Paths',
        concept: 'Dijkstra Algorithm',
        question: 'Under what specific graph condition does Dijkstra’s algorithm fail to produce correct shortest paths?',
        options: [
          'A) When the graph is a directed acyclic graph (DAG).',
          'B) When the graph has multiple connected components.',
          'C) When the graph contains edges with negative weights.',
          'D) When the graph has more edges than vertices (|E| > |V|).'
        ],
        correctIndex: 2,
        explanation: 'Dijkstra relies on a greedy property: once a vertex is marked visited (popped from priority queue), its path distance is assumed optimal. Negative weight edges can later offer a shorter route through an already finalized vertex, breaking the greedy invariant.'
      },
      'bellman': {
        topic: 'Algorithms: Shortest Paths',
        concept: 'Bellman-Ford & Negative Cycles',
        question: 'How does the Bellman-Ford algorithm reliably detect the presence of a negative-weight cycle reachable from the source?',
        options: [
          'A) It checks if any vertex is visited more than twice during BFS traversal.',
          'B) It relaxes all edges |V| - 1 times, and checks if any edge can still be relaxed in the |V|-th pass.',
          'C) It computes the determinant of the graph adjacency matrix.',
          'D) It stops as soon as a cycle is found using Depth First Search.'
        ],
        correctIndex: 1,
        explanation: 'The shortest simple path in a graph with |V| vertices has at most |V|-1 edges. If any edge can still be relaxed on the |V|-th iteration, there must exist a negative cycle that reduces the distance indefinitely.'
      },
      'spaced_repetition': {
        topic: 'Cognitive Science: Memory',
        concept: 'SM-2 Spaced Repetition',
        question: 'In the SuperMemo SM-2 algorithm, what happens to the repetition count (n) and interval (I) when a user gives a recall grade below 3 (e.g. blackout or severe error)?',
        options: [
          'A) The interval is halved, but repetition count remains unchanged.',
          'B) The card is permanently deleted from the queue.',
          'C) The repetition count resets to 0 and the interval resets to 1 day.',
          'D) The ease factor drops to zero and the interval becomes 0 hours.'
        ],
        correctIndex: 2,
        explanation: 'In SM-2, scores q < 3 signify failed retrieval. The algorithm resets repetition count to 0 and sets the next interval back to 1 day to re-establish the memory trace.'
      },
      'raft': {
        topic: 'Distributed Systems',
        concept: 'Raft Leader Election',
        question: 'In the Raft consensus protocol, what mechanism prevents two candidates from perpetually splitting votes in split-brain ties?',
        options: [
          'A) Randomized election timeouts (typically 150ms - 300ms) for each node.',
          'B) Hardware atomic clocks synchronized via GPS.',
          'C) Centralized token ring passing.',
          'D) Two-phase commit lock on all candidate nodes.'
        ],
        correctIndex: 0,
        explanation: 'Randomized election timeouts spread out when followers transition to candidates. In most cases, one follower times out before others, claims its own vote, and quickly collects quorum before competitors start.'
      }
    };

    // Find best match or default
    let selectedQuiz = quizBank['attention'];
    if (topicOrConcept) {
      const lower = topicOrConcept.toLowerCase();
      for (const [key, q] of Object.entries(quizBank)) {
        if (lower.includes(key) || lower.includes(q.concept.toLowerCase()) || lower.includes(q.topic.toLowerCase())) {
          selectedQuiz = q;
          break;
        }
      }
    }

    this.activeQuiz = selectedQuiz;
    return selectedQuiz;
  }

  // Evaluate quiz answer and update memory
  evaluateQuizAnswer(selectedIndex) {
    if (!this.activeQuiz) return null;

    const isCorrect = selectedIndex === this.activeQuiz.correctIndex;
    const delta = isCorrect ? 10 : -8;

    // Update long term memory
    window.memoryEngine.updateMastery(this.activeQuiz.concept, delta);

    // If incorrect, record in short-term misconception log
    if (!isCorrect) {
      window.memoryEngine.recordMisconception(
        this.activeQuiz.concept,
        `Selected incorrect option for "${this.activeQuiz.question.slice(0, 50)}..."`
      );
    } else {
      window.memoryEngine.resolveMisconception(this.activeQuiz.concept);
    }

    return {
      isCorrect,
      correctIndex: this.activeQuiz.correctIndex,
      explanation: this.activeQuiz.explanation,
      concept: this.activeQuiz.concept,
      newMastery: window.memoryEngine.longTermMemory.conceptMastery[this.activeQuiz.concept]
    };
  }

  // TOOL: execute_code (Code sandbox runner)
  executeCode(codeStr) {
    const logs = [];
    const customConsole = {
      log: (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
      warn: (...args) => logs.push('[WARN] ' + args.join(' ')),
      error: (...args) => logs.push('[ERROR] ' + args.join(' '))
    };

    try {
      // Safe sandbox function creation
      const runFn = new Function('console', codeStr);
      const startTime = performance.now();
      const result = runFn(customConsole);
      const duration = (performance.now() - startTime).toFixed(2);

      return {
        success: true,
        output: logs.join('\n') || (result !== undefined ? `Result: ${String(result)}` : 'Execution completed (No stdout output).'),
        executionTime: `${duration} ms`
      };
    } catch (err) {
      return {
        success: false,
        output: logs.length ? logs.join('\n') + `\nRuntime Error: ${err.message}` : `Runtime Error: ${err.message}`,
        executionTime: '0 ms'
      };
    }
  }

  // Preset Code Demos
  getCodeSnippet(type = 'attention') {
    if (type === 'attention') {
      return `// Scaled Dot-Product Attention Simulation
function softmax(arr) {
  const max = Math.max(...arr);
  const exps = arr.map(x => Math.exp(x - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(x => (x / sum).toFixed(4));
}

function computeAttention(query, keys, d_k) {
  console.log("Query vector:", JSON.stringify(query));
  console.log("Keys matrix:", JSON.stringify(keys));
  const scale = Math.sqrt(d_k);
  console.log("Scale factor sqrt(d_k):", scale.toFixed(2));
  
  // Dot products Q . K_i
  const rawScores = keys.map(k => {
    return query.reduce((sum, q_val, idx) => sum + (q_val * k[idx]), 0);
  });
  console.log("Raw Dot Products (Q . K^T):", rawScores);
  
  // Scaled scores
  const scaledScores = rawScores.map(s => s / scale);
  console.log("Scaled Scores (Q . K^T / sqrt(d_k)):", scaledScores);
  
  // Softmax weights
  const weights = softmax(scaledScores);
  console.log("Softmax Attention Weights (sum = 1.0):", weights);
  return weights;
}

// 4-dimensional query & 3 keys
const Q = [1.2, 0.8, -0.4, 0.5];
const K = [
  [1.0, 0.9, -0.3, 0.4],  // High similarity
  [-0.5, 0.1, 1.2, -0.2], // Low similarity
  [0.2, 0.3, 0.1, 0.8]    // Medium similarity
];
computeAttention(Q, K, 4);`;
    }

    if (type === 'sm2') {
      return `// SuperMemo SM-2 Interval Calculation Simulation
function calculateNextInterval(repetition, interval, easeFactor, quality) {
  console.log("--- Calculating Review for Quality Grade: " + quality + "/5 ---");
  let nextRep = repetition;
  let nextInterval = interval;
  let nextEF = easeFactor;

  if (quality >= 3) {
    if (repetition === 0) nextInterval = 1;
    else if (repetition === 1) nextInterval = 6;
    else nextInterval = Math.round(interval * easeFactor);
    nextRep += 1;
  } else {
    nextRep = 0;
    nextInterval = 1; // reset due to lapse
  }

  // SM-2 formula
  nextEF = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (nextEF < 1.3) nextEF = 1.3;

  console.log("Old -> Rep: " + repetition + ", Int: " + interval + "d, EF: " + easeFactor.toFixed(2));
  console.log("New -> Rep: " + nextRep + ", Int: " + nextInterval + "d, EF: " + nextEF.toFixed(2));
  return { nextRep, nextInterval, nextEF };
}

// Test recall with a good grade (4) vs blackout (1)
calculateNextInterval(2, 6, 2.5, 4);
calculateNextInterval(3, 15, 2.5, 1);`;
    }

    // Default Dijkstra demo
    return `// Dijkstra Single-Source Shortest Path Simulation
class Graph {
  constructor() { this.adj = {}; }
  addNode(u) { if (!this.adj[u]) this.adj[u] = []; }
  addEdge(u, v, w) {
    this.addNode(u); this.addNode(v);
    this.adj[u].push({ node: v, weight: w });
  }
}

const g = new Graph();
g.addEdge('A', 'B', 4);
g.addEdge('A', 'C', 2);
g.addEdge('C', 'B', 1);
g.addEdge('B', 'D', 5);
g.addEdge('C', 'D', 8);

function dijkstra(startNode) {
  const distances = { A: Infinity, B: Infinity, C: Infinity, D: Infinity };
  distances[startNode] = 0;
  const visited = new Set();

  while (visited.size < Object.keys(distances).length) {
    let minNode = null;
    let minDist = Infinity;
    for (const [node, d] of Object.entries(distances)) {
      if (!visited.has(node) && d < minDist) {
        minDist = d;
        minNode = node;
      }
    }
    if (!minNode) break;
    visited.add(minNode);
    console.log("Visiting node: " + minNode + " (Current Shortest Dist = " + minDist + ")");

    for (const edge of (g.adj[minNode] || [])) {
      if (!visited.has(edge.node)) {
        const newDist = distances[minNode] + edge.weight;
        if (newDist < distances[edge.node]) {
          console.log("  Relaxing edge " + minNode + " -> " + edge.node + " (new dist: " + newDist + ")");
          distances[edge.node] = newDist;
        }
      }
    }
  }
  console.log("Optimal Shortest Distances from " + startNode + ":", distances);
  return distances;
}

dijkstra('A');`;
  }
}

window.studyTools = new StudyTools();
