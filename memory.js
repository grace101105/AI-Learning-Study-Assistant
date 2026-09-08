/**
 * Memory Engine: 3-Tier Cognitive Architecture for Personalized Learning
 * - Tier 1: Working Memory (active goal, context focus, tool scratchpad)
 * - Tier 2: Short-Term Conversational Memory (sliding dialog window & session misconceptions)
 * - Tier 3: Long-Term Memory (Learner Profile, Concept Mastery Graph, SM-2 Spaced Repetition Schedule)
 */

class MemoryEngine {
  constructor() {
    this.storageKey = 'agy_study_memory_v1';
    
    // Tier 1: Working Memory
    this.workingMemory = {
      activeGoal: 'Master Transformer Self-Attention & Shortest Path Algorithms',
      currentTopic: 'Attention Mechanisms',
      subGoal: 'Understand Q, K, V mathematical intuition',
      cognitiveLoad: 'Optimal (Medium)',
      sessionStartTime: Date.now()
    };

    // Tier 2: Short-Term Conversational Memory
    this.shortTermMemory = {
      dialogHistory: [],
      maxHistoryTurns: 12,
      activeMisconceptions: [
        {
          id: 'misc-1',
          concept: 'Dijkstra on Negative Weights',
          detail: 'Previously assumed Dijkstra works with negative edge weights.',
          resolved: false,
          loggedAt: new Date(Date.now() - 3600000 * 5).toISOString()
        }
      ]
    };

    // Tier 3: Long-Term Memory
    this.longTermMemory = {
      learner: {
        name: 'Alex',
        level: 'Intermediate Explorer',
        overallRetention: 84,
        totalStudyMinutes: 142,
        quizzesCompleted: 18,
        streakDays: 4
      },
      // Concept mastery scores (0 - 100)
      conceptMastery: {
        'Scaled Dot-Product Attention': { score: 76, tier: 'Proficient', lastReviewed: '2 days ago' },
        'Multi-Head Attention': { score: 62, tier: 'Developing', lastReviewed: '3 days ago' },
        'Positional Encoding': { score: 45, tier: 'Novice', lastReviewed: '5 days ago' },
        'Dijkstra Algorithm': { score: 88, tier: 'Mastered', lastReviewed: '1 day ago' },
        'Bellman-Ford & Negative Cycles': { score: 55, tier: 'Developing', lastReviewed: '4 days ago' },
        'A* Search & Admissibility': { score: 70, tier: 'Proficient', lastReviewed: '3 days ago' },
        'SM-2 Spaced Repetition': { score: 92, tier: 'Mastered', lastReviewed: 'Today' },
        'Raft Leader Election': { score: 38, tier: 'Novice', lastReviewed: '6 days ago' }
      },
      // Knowledge Graph Nodes and Relationships
      knowledgeGraph: [
        { id: 'seq_models', label: 'Sequential Models (RNN/LSTM)', category: 'Deep Learning', mastery: 85, x: 120, y: 140 },
        { id: 'attn_core', label: 'Scaled Dot-Product Attention', category: 'Deep Learning', mastery: 76, x: 260, y: 140 },
        { id: 'multi_head', label: 'Multi-Head Attention', category: 'Deep Learning', mastery: 62, x: 420, y: 120 },
        { id: 'pos_enc', label: 'Positional Encoding', category: 'Deep Learning', mastery: 45, x: 420, y: 220 },
        { id: 'transformers', label: 'Full Transformer Architecture', category: 'Deep Learning', mastery: 60, x: 580, y: 170 },
        { id: 'graph_rep', label: 'Graph Representations (Adj List)', category: 'Algorithms', mastery: 90, x: 140, y: 340 },
        { id: 'dijkstra', label: 'Dijkstra Algorithm', category: 'Algorithms', mastery: 88, x: 290, y: 340 },
        { id: 'bellman_ford', label: 'Bellman-Ford & Neg Cycles', category: 'Algorithms', mastery: 55, x: 460, y: 340 },
        { id: 'a_star', label: 'A* Heuristic Search', category: 'Algorithms', mastery: 70, x: 460, y: 440 },
        { id: 'active_recall', label: 'Active Recall & Testing Effect', category: 'Cognitive Science', mastery: 94, x: 160, y: 520 },
        { id: 'sm2_algo', label: 'SuperMemo SM-2 Math', category: 'Cognitive Science', mastery: 92, x: 340, y: 520 },
        { id: 'distributed_consensus', label: 'Consensus & Raft Protocol', category: 'Distributed Systems', mastery: 38, x: 560, y: 520 }
      ],
      knowledgeEdges: [
        { from: 'seq_models', to: 'attn_core', label: 'Motivates' },
        { from: 'attn_core', to: 'multi_head', label: 'Extends to h heads' },
        { from: 'attn_core', to: 'pos_enc', label: 'Requires order injection' },
        { from: 'multi_head', to: 'transformers', label: 'Core block' },
        { from: 'pos_enc', to: 'transformers', label: 'Input sum' },
        { from: 'graph_rep', to: 'dijkstra', label: 'Input graph' },
        { from: 'graph_rep', to: 'bellman_ford', label: 'Input graph' },
        { from: 'dijkstra', to: 'a_star', label: 'Generalized by heuristic' },
        { from: 'active_recall', to: 'sm2_algo', label: 'Operationalized by' }
      ],
      // Spaced Repetition Queue (SM-2 Algorithm cards)
      flashcards: [
        {
          id: 'card-1',
          concept: 'Scaled Dot-Product Attention',
          category: 'Deep Learning',
          question: 'Why is the dot product of Query and Key divided by sqrt(d_k) in Transformers?',
          answer: 'For large values of d_k, the dot products grow large in magnitude, pushing the softmax function into regions with extremely small gradients (gradient saturation). Dividing by sqrt(d_k) scales the variance back to 1.',
          interval: 2,
          repetition: 2,
          easeFactor: 2.5,
          nextReviewDate: new Date(Date.now() + 86400000).toISOString() // tomorrow
        },
        {
          id: 'card-2',
          concept: 'Dijkstra Algorithm',
          category: 'Algorithms',
          question: 'Why does Dijkstra’s algorithm fail on graphs with negative edge weights?',
          answer: 'Dijkstra assumes that adding an edge will never decrease the total path cost (greedy monotonic choice). Once a vertex is popped from the priority queue, its distance is considered finalized. Negative edges violate this property.',
          interval: 5,
          repetition: 4,
          easeFactor: 2.6,
          nextReviewDate: new Date(Date.now() - 3600000).toISOString() // due now!
        },
        {
          id: 'card-3',
          concept: 'Positional Encoding',
          category: 'Deep Learning',
          question: 'What is the purpose of using sinusoidal functions of varying frequencies for positional embeddings?',
          answer: 'It allows the model to easily learn to attend by relative positions, because for any fixed offset k, PE(pos + k) can be represented as a linear function of PE(pos).',
          interval: 1,
          repetition: 1,
          easeFactor: 2.4,
          nextReviewDate: new Date(Date.now() - 7200000).toISOString() // due now!
        },
        {
          id: 'card-4',
          concept: 'SM-2 Algorithm',
          category: 'Cognitive Science',
          question: 'What is the default initial Ease Factor (EF) in the SuperMemo SM-2 spaced repetition algorithm?',
          answer: 'The initial Ease Factor is 2.5. It adjusts after every review based on user recall grade (q from 0 to 5) with a floor minimum of 1.3.',
          interval: 7,
          repetition: 5,
          easeFactor: 2.7,
          nextReviewDate: new Date(Date.now() + 86400000 * 3).toISOString()
        },
        {
          id: 'card-5',
          concept: 'Raft Leader Election',
          category: 'Distributed Systems',
          question: 'How does Raft prevent split votes when multiple nodes start an election simultaneously?',
          answer: 'Raft uses randomized election timeouts (e.g., between 150ms and 300ms) for each node. This ensures that in most cases, one follower will time out first, start an election, and collect a majority of votes before others time out.',
          interval: 1,
          repetition: 1,
          easeFactor: 2.3,
          nextReviewDate: new Date(Date.now() - 10000).toISOString() // due now!
        }
      ]
    };

    this.restoreFromStorage();
  }

  // Restore state from LocalStorage if present
  restoreFromStorage() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.longTermMemory) this.longTermMemory = parsed.longTermMemory;
        if (parsed.workingMemory) this.workingMemory = { ...this.workingMemory, ...parsed.workingMemory };
      }
    } catch (e) {
      console.warn('Could not restore study memory from localStorage', e);
    }
  }

  persist() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({
        longTermMemory: this.longTermMemory,
        workingMemory: this.workingMemory
      }));
    } catch (e) {
      console.warn('Could not save study memory to localStorage', e);
    }
  }

  // Working Memory operations
  setGoal(goal, subGoal = '') {
    this.workingMemory.activeGoal = goal;
    if (subGoal) this.workingMemory.subGoal = subGoal;
    this.persist();
  }

  setTopic(topic) {
    this.workingMemory.currentTopic = topic;
    this.persist();
  }

  // Short-term Memory operations
  addTurn(role, content, metadata = {}) {
    this.shortTermMemory.dialogHistory.push({
      id: `turn-${Date.now()}`,
      role,
      content,
      metadata,
      timestamp: new Date().toISOString()
    });

    if (this.shortTermMemory.dialogHistory.length > this.shortTermMemory.maxHistoryTurns) {
      this.shortTermMemory.dialogHistory.shift();
    }
  }

  recordMisconception(concept, detail) {
    this.shortTermMemory.activeMisconceptions.push({
      id: `misc-${Date.now()}`,
      concept,
      detail,
      resolved: false,
      loggedAt: new Date().toISOString()
    });
  }

  resolveMisconception(concept) {
    const item = this.shortTermMemory.activeMisconceptions.find(m => m.concept.toLowerCase().includes(concept.toLowerCase()));
    if (item) item.resolved = true;
  }

  // Long-Term Memory: Update Concept Mastery
  updateMastery(conceptName, deltaScore) {
    let entry = this.longTermMemory.conceptMastery[conceptName];
    if (!entry) {
      // Find matching key case-insensitively
      const existingKey = Object.keys(this.longTermMemory.conceptMastery).find(
        k => k.toLowerCase().includes(conceptName.toLowerCase()) || conceptName.toLowerCase().includes(k.toLowerCase())
      );
      if (existingKey) {
        entry = this.longTermMemory.conceptMastery[existingKey];
        conceptName = existingKey;
      } else {
        entry = { score: 50, tier: 'Developing', lastReviewed: 'Just now' };
        this.longTermMemory.conceptMastery[conceptName] = entry;
      }
    }

    entry.score = Math.max(10, Math.min(100, entry.score + deltaScore));
    if (entry.score >= 85) entry.tier = 'Mastered';
    else if (entry.score >= 70) entry.tier = 'Proficient';
    else if (entry.score >= 50) entry.tier = 'Developing';
    else entry.tier = 'Novice';
    entry.lastReviewed = 'Just now';

    // Also update graph node mastery if present
    const node = this.longTermMemory.knowledgeGraph.find(n => n.label.toLowerCase().includes(conceptName.toLowerCase()));
    if (node) node.mastery = entry.score;

    // Recalculate overall retention
    const scores = Object.values(this.longTermMemory.conceptMastery).map(c => c.score);
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    this.longTermMemory.learner.overallRetention = avg;

    this.persist();
    return entry;
  }

  // SuperMemo SM-2 Spaced Repetition update
  // quality grade q: 0 = complete blackout, 3 = pass with effort, 4 = good, 5 = perfect recall
  recordSpacedReview(cardId, quality) {
    const card = this.longTermMemory.flashcards.find(c => c.id === cardId);
    if (!card) return null;

    const q = Math.max(0, Math.min(5, quality));

    if (q >= 3) {
      if (card.repetition === 0) {
        card.interval = 1;
      } else if (card.repetition === 1) {
        card.interval = 6;
      } else {
        card.interval = Math.round(card.interval * card.easeFactor);
      }
      card.repetition += 1;
    } else {
      // Failed recall: reset intervals
      card.repetition = 0;
      card.interval = 1;
    }

    // Update Ease Factor (EF)
    card.easeFactor = card.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    if (card.easeFactor < 1.3) card.easeFactor = 1.3;
    card.easeFactor = parseFloat(card.easeFactor.toFixed(2));

    // Next review timestamp
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + card.interval);
    card.nextReviewDate = nextDate.toISOString();

    // Adjust mastery for the concept
    const delta = q >= 4 ? 6 : (q === 3 ? 2 : -8);
    this.updateMastery(card.concept, delta);

    this.persist();
    return card;
  }

  getDueFlashcards() {
    const now = new Date();
    return this.longTermMemory.flashcards.filter(c => new Date(c.nextReviewDate) <= now);
  }

  addFlashcard({ concept, category, question, answer }) {
    const newCard = {
      id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`,
      concept,
      category: category || 'General',
      question,
      answer,
      interval: 1,
      repetition: 0,
      easeFactor: 2.5,
      nextReviewDate: new Date().toISOString()
    };
    this.longTermMemory.flashcards.push(newCard);
    this.persist();
    return newCard;
  }

  getLearnerSummary() {
    return {
      learner: this.longTermMemory.learner,
      workingMemory: this.workingMemory,
      dueFlashcardsCount: this.getDueFlashcards().length,
      totalFlashcards: this.longTermMemory.flashcards.length,
      activeMisconceptions: this.shortTermMemory.activeMisconceptions.filter(m => !m.resolved),
      masteryList: Object.entries(this.longTermMemory.conceptMastery).map(([k, v]) => ({
        name: k,
        score: v.score,
        tier: v.tier,
        lastReviewed: v.lastReviewed
      }))
    };
  }
}

window.memoryEngine = new MemoryEngine();
