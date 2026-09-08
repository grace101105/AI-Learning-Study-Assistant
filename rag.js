/**
 * RAG (Retrieval-Augmented Generation) Engine
 * Handles document storage, academic knowledge base, chunking, semantic retrieval, and citation formatting.
 */

class RAGEngine {
  constructor() {
    this.documents = [];
    this.chunks = [];
    this.loadDefaultKnowledgeBase();
  }

  loadDefaultKnowledgeBase() {
    const defaultDocs = [
      {
        id: 'doc-transformers',
        title: 'Deep Learning: Attention & Transformers',
        category: 'Machine Learning',
        source: 'Vaswani et al. / Stanford CS224N',
        content: `
# Attention Mechanisms and Transformers

## 1. The Bottleneck of Recurrent Neural Networks (RNNs)
Traditional sequence models (RNNs, LSTMs, GRUs) process tokens sequentially from left to right. This imposes an O(N) sequential dependency bottleneck, making parallel training on GPUs impossible. Furthermore, gradient vanishing/exploding limits their effective context window for long-range dependencies.

## 2. Scaled Dot-Product Attention
The core building block of the Transformer is the Scaled Dot-Product Attention:
Attention(Q, K, V) = softmax((Q * K^T) / sqrt(d_k)) * V
Where:
- Q (Query): Vector representing what the current token is seeking.
- K (Key): Vector representing what other tokens offer or contain.
- V (Value): Information payload retrieved if Query matches Key.
- sqrt(d_k): Scaling factor preventing the dot products from growing excessively large, which would push softmax into regions with vanishingly small gradients.

## 3. Multi-Head Attention
Instead of performing a single attention function, Multi-Head Attention linearly projects Q, K, and V into h different subspaces with dimensions d_k = d_v = d_model / h.
MultiHead(Q, K, V) = Concat(head_1, ..., head_h) * W_O
This allows the model to simultaneously attend to information from different representation subspaces at different positions (e.g. syntax, semantic role, coreference).

## 4. Positional Encodings
Because self-attention is an unordered set operation (permutation invariant), positional encodings are injected into input embeddings:
PE(pos, 2i) = sin(pos / 10000^(2i/d_model))
PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model))
This provides unique, periodic relative distance information to each token position.

## 5. Transformer Encoder vs. Decoder
- Encoder: Uses bidirectional self-attention to encode input representations (e.g., BERT).
- Decoder: Uses causal masked self-attention (preventing leftward information leak) and cross-attention over encoder outputs (e.g., GPT, T5).
`
      },
      {
        id: 'doc-dsa',
        title: 'Algorithms: Graph Search & Shortest Paths',
        category: 'Algorithms',
        source: 'MIT 6.006 / CLRS Algorithms 4th Ed.',
        content: `
# Graph Theory & Shortest Path Algorithms

## 1. Graph Representations
Graphs G = (V, E) can be represented using:
- Adjacency Matrix: Space complexity O(V^2). Edge lookup is O(1). Ideal for dense graphs.
- Adjacency List: Space complexity O(V + E). Iterating neighbors of vertex v takes O(deg(v)). Ideal for sparse graphs.

## 2. Dijkstra's Algorithm
Dijkstra's algorithm finds single-source shortest paths on graphs with non-negative edge weights.
- Mechanism: Greedily selects the unvisited vertex with the minimum tentative distance using a min-priority heap.
- Time Complexity: O((V + E) log V) with a binary min-heap; O(E + V log V) with a Fibonacci heap.
- Invariant: Once a vertex u is extracted from the priority queue, its shortest path distance dist[u] is optimal and finalized.
- Limitation: Fails on graphs with negative weight edges because the greedy choice property is violated.

## 3. Bellman-Ford Algorithm
- Capability: Handles negative edge weights and detects negative weight cycles.
- Mechanism: Relaxes all |E| edges (|V| - 1) times.
- Time Complexity: O(V * E).
- Negative Cycle Detection: If an edge can still be relaxed in the |V|-th iteration, a reachable negative weight cycle exists.

## 4. A* Search Algorithm
- Formula: f(n) = g(n) + h(n)
  - g(n): Exact cost from the start node to node n.
  - h(n): Heuristic estimate of the cost from node n to the goal.
- Admissibility: An admissible heuristic never overestimates the true cost (h(n) <= h*(n)). Guarantees optimal path finding.
- Consistency (Monotonicity): h(A) <= cost(A, B) + h(B). Ensures nodes are evaluated at most once.
`
      },
      {
        id: 'doc-cogsci',
        title: 'Cognitive Science: Spaced Repetition & Recall',
        category: 'Cognitive Psychology',
        source: 'Roediger & Karpicke / SuperMemo SM-2',
        content: `
# Cognitive Science: Spaced Repetition & Active Recall

## 1. The Forgetting Curve & Spaced Repetition
Hermann Ebbinghaus discovered that memory retention decays exponentially over time if no attempt is made to retain it: R = e^(-t/S).
Spaced repetition disrupts this decay: reviewing material at expanding temporal intervals (1 day, 3 days, 7 days, 21 days) resets the forgetting curve with each repetition yielding a flatter subsequent decay slope.

## 2. Active Recall vs. Passive Review
Testing effect (Roediger & Karpicke): Retrieving knowledge from memory produces substantially superior long-term retention compared to re-reading or highlighting notes. Active recall forces the brain to reconstruct synaptic pathways, signaling to the hippocampus that the memory trace is vital.

## 3. The SuperMemo SM-2 Algorithm
SM-2 calculates optimal review intervals using three metrics:
- Repetition number (n)
- Ease Factor (EF), starting at 2.5: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
- Quality score (q) from 0 (complete blackout) to 5 (perfect response).
- Next Interval I(n):
  - I(1) = 1 day
  - I(2) = 6 days
  - I(n) = I(n-1) * EF for n > 2

## 4. Interleaving & Desirable Difficulties
- Interleaving: Mixing different topics or problem types during a study session forces the brain to discriminate between concepts, resulting in deeper conceptual mastery than blocked practice.
- Dual Coding Theory: Combining verbal explanations with visual spatial representations (knowledge maps, diagrams) increases cognitive anchor points.
`
      },
      {
        id: 'doc-systems',
        title: 'Distributed Systems: Raft Consensus Protocol',
        category: 'Computer Systems',
        source: 'Ongaro & Ousterhout (Stanford 2014)',
        content: `
# Distributed Consensus and The Raft Protocol

## 1. The Consensus Problem
In a fault-tolerant distributed system, multiple nodes must agree on a shared state machine log despite network partitions, packet drops, and server crashes.

## 2. Raft Roles and State Machine
At any given time, each Raft node is in one of three states:
- Follower: Passive; responds to incoming RPCs from leaders and candidates.
- Candidate: Requests votes during an election.
- Leader: Manages log replication and client requests.

## 3. Leader Election
- Term Numbers: Time is divided into arbitrary terms with monotonically increasing integers.
- Heartbeats: Leaders periodically send AppendEntries RPCs with empty payloads as heartbeats.
- Election Timeout: If a follower hears no heartbeat within a randomized timeout (150-300ms), it transitions to candidate, increments term, votes for itself, and broadcasts RequestVote RPCs.
- Majority Quorum: A candidate requires votes from a majority of servers (floor(N/2) + 1) to become leader.

## 4. Log Replication & Safety Invariants
- The leader appends client commands to its local log and sends AppendEntries to all followers.
- When an entry is replicated on a majority of servers, it is considered committed.
- Election Safety: A candidate can only be elected if its log is at least as up-to-date as any voter's log (compared by term of last entry, then length of log).
`
      }
    ];

    defaultDocs.forEach(doc => this.addDocument(doc));
  }

  addDocument({ id, title, category, source, content }) {
    const docId = id || `doc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const doc = {
      id: docId,
      title: title || 'Untitled Study Note',
      category: category || 'General',
      source: source || 'User Upload',
      content: content.trim(),
      dateAdded: new Date().toISOString()
    };
    this.documents.push(doc);
    this.chunkDocument(doc);
    return doc;
  }

  chunkDocument(doc, chunkSize = 250, overlap = 40) {
    const rawSections = doc.content.split(/\n(?=##?\s)/g);
    
    rawSections.forEach((section, sIdx) => {
      const trimmed = section.trim();
      if (!trimmed) return;

      const lines = trimmed.split('\n');
      const headerLine = lines[0].startsWith('#') ? lines[0].replace(/^#+\s*/, '') : `Section ${sIdx + 1}`;
      const body = lines.slice(lines[0].startsWith('#') ? 1 : 0).join('\n').trim();

      if (!body && !headerLine) return;

      const fullText = (headerLine + '\n' + body);
      const words = fullText.split(/\s+/);

      if (words.length <= chunkSize) {
        this.chunks.push({
          id: `${doc.id}-c${this.chunks.length}`,
          docId: doc.id,
          docTitle: doc.title,
          category: doc.category,
          source: doc.source,
          header: headerLine,
          text: fullText,
          keywords: this.extractKeywords(fullText)
        });
      } else {
        for (let i = 0; i < words.length; i += (chunkSize - overlap)) {
          const chunkWords = words.slice(i, i + chunkSize);
          if (chunkWords.length < 20) continue;
          const chunkStr = chunkWords.join(' ');
          this.chunks.push({
            id: `${doc.id}-c${this.chunks.length}`,
            docId: doc.id,
            docTitle: doc.title,
            category: doc.category,
            source: doc.source,
            header: `${headerLine} [P.${Math.floor(i / chunkSize) + 1}]`,
            text: chunkStr,
            keywords: this.extractKeywords(chunkStr)
          });
        }
      }
    });
  }

  extractKeywords(text) {
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'that', 'to', 'for', 'it', 'with', 'as', 'by',
      'this', 'of', 'from', 'or', 'are', 'be', 'has', 'have', 'had', 'was', 'were', 'not', 'but', 'can', 'could',
      'into', 'then', 'than', 'over', 'these', 'those', 'also', 'such', 'when', 'where', 'how', 'each', 'other',
      'their', 'there', 'they', 'what', 'will', 'with', 'would', 'your', 'about', 'above', 'after', 'before'
    ]);
    const clean = text.toLowerCase().replace(/[^a-z0-9_\-\s]/g, ' ');
    const tokens = clean.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
    
    const freq = {};
    tokens.forEach(t => freq[t] = (freq[t] || 0) + 1);
    return freq;
  }

  // Hybrid BM25 / Cosine Similarity Simulation for Semantic Match
  retrieve(query, topK = 3) {
    if (!query || typeof query !== 'string') return [];
    
    const queryKeywords = this.extractKeywords(query);
    const queryTokens = Object.keys(queryKeywords);
    if (queryTokens.length === 0) return [];

    const scoredChunks = this.chunks.map(chunk => {
      let score = 0;
      let matchedTerms = [];

      queryTokens.forEach(token => {
        if (chunk.keywords[token]) {
          const tf = chunk.keywords[token];
          const queryWeight = queryKeywords[token];
          score += (tf * queryWeight * 3.0);
          matchedTerms.push(token);
        } else {
          if (chunk.text.toLowerCase().includes(token)) {
            score += 1.2;
            matchedTerms.push(token);
          }
        }
      });

      const headerLower = chunk.header.toLowerCase();
      queryTokens.forEach(token => {
        if (headerLower.includes(token)) score += 4.5;
      });

      if (chunk.docTitle.toLowerCase().includes(query.toLowerCase())) {
        score += 6.0;
      }

      const lengthPenalty = Math.log(chunk.text.length + 10) / 4;
      const normalizedScore = score / (lengthPenalty || 1);

      return {
        chunk,
        score: parseFloat(normalizedScore.toFixed(3)),
        matchedTerms
      };
    });

    return scoredChunks
      .filter(item => item.score > 0.4)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  formatContextForPrompt(retrievedItems) {
    if (!retrievedItems || retrievedItems.length === 0) {
      return {
        contextString: "No relevant documents found in knowledge base.",
        citations: []
      };
    }

    const citations = [];
    const contextBlocks = retrievedItems.map((item, idx) => {
      const citationRef = `[${idx + 1}]`;
      const confidence = Math.min(99, Math.max(72, Math.round(item.score * 15)));
      citations.push({
        ref: citationRef,
        source: item.chunk.source,
        docTitle: item.chunk.docTitle,
        header: item.chunk.header,
        confidence: `${confidence}% match`,
        snippet: item.chunk.text.slice(0, 160) + '...'
      });

      return `Source ${citationRef} [Document: "${item.chunk.docTitle}", Section: "${item.chunk.header}"]:\n${item.chunk.text}`;
    });

    return {
      contextString: contextBlocks.join('\n\n---\n\n'),
      citations
    };
  }
}

window.ragEngine = new RAGEngine();
