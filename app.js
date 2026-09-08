/**
 * Application Controller (app.js)
 * Bridges UI interactions, Agentic ReAct pipeline, Memory updates, RAG visualization, and Study Tools.
 */

class AppController {
  constructor() {
    this.activeTab = 'graph'; // 'graph' | 'rag' | 'flashcards' | 'quiz' | 'code'
    this.canvas = null;
    this.ctx = null;
    this.hoveredNode = null;
    this.selectedNode = null;
    this.currentFlashcardIdx = 0;
    this.dueCards = [];
  }

  init() {
    this.bindEvents();
    this.renderLearnerProfile();
    this.renderRAGDocuments();
    this.initGraphCanvas();
    this.updateFlashcardsUI();
    this.initPomodoro();
    this.renderInitialWelcome();
  }

  bindEvents() {
    // Chat input
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    
    if (chatForm) {
      chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (text) {
          this.handleSendMessage(text);
          chatInput.value = '';
        }
      });
    }

    // Quick prompt suggestion pills
    document.querySelectorAll('.quick-prompt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const prompt = btn.getAttribute('data-prompt');
        if (prompt) this.handleSendMessage(prompt);
      });
    });

    // Right Workspace Tabs
    document.querySelectorAll('.workspace-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        this.switchWorkspaceTab(tab);
      });
    });

    // Settings Modal
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const resetMemoryBtn = document.getElementById('resetMemoryBtn');

    if (settingsBtn && settingsModal) {
      settingsBtn.addEventListener('click', () => {
        if (apiKeyInput) apiKeyInput.value = window.agentOrchestrator.geminiApiKey || '';
        settingsModal.classList.remove('hidden');
      });
      closeSettingsBtn?.addEventListener('click', () => settingsModal.classList.add('hidden'));
      saveApiKeyBtn?.addEventListener('click', () => {
        window.agentOrchestrator.setApiKey(apiKeyInput.value);
        this.showToast('Gemini API Key saved successfully!');
        settingsModal.classList.add('hidden');
      });
      resetMemoryBtn?.addEventListener('click', () => {
        if (confirm('Reset learner profile and memory to initial state?')) {
          localStorage.removeItem('agy_study_memory_v1');
          window.location.reload();
        }
      });
    }

    // RAG Document Ingestion Modal / Form
    const addDocForm = document.getElementById('addDocForm');
    if (addDocForm) {
      addDocForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('docTitleInput').value.trim();
        const category = document.getElementById('docCategoryInput').value.trim();
        const content = document.getElementById('docContentInput').value.trim();

        if (title && content) {
          const doc = window.ragEngine.addDocument({ title, category, source: 'Learner Notes', content });
          this.renderRAGDocuments();
          this.showToast(`Document "${title}" indexed into RAG memory (${doc.id})`);
          addDocForm.reset();
        }
      });
    }

    // Flashcard Flip & Ratings
    const flashcardCard = document.getElementById('flashcardCard');
    if (flashcardCard) {
      flashcardCard.addEventListener('click', () => {
        flashcardCard.classList.toggle('flipped');
      });
    }

    document.querySelectorAll('.sm2-rate-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const grade = parseInt(btn.getAttribute('data-grade'), 10);
        this.handleSpacedRating(grade);
      });
    });

    // Code Sandbox Run & Preset Buttons
    const runCodeBtn = document.getElementById('runCodeBtn');
    const codeEditor = document.getElementById('codeEditor');
    const codeSnippetSelect = document.getElementById('codeSnippetSelect');

    if (runCodeBtn && codeEditor) {
      runCodeBtn.addEventListener('click', () => {
        const code = codeEditor.value;
        const result = window.studyTools.executeCode(code);
        this.renderConsoleOutput(result);
      });
    }

    if (codeSnippetSelect && codeEditor) {
      codeSnippetSelect.addEventListener('change', () => {
        const snippetType = codeSnippetSelect.value;
        codeEditor.value = window.studyTools.getCodeSnippet(snippetType);
      });
    }

    // Goal Edit
    const editGoalBtn = document.getElementById('editGoalBtn');
    if (editGoalBtn) {
      editGoalBtn.addEventListener('click', () => {
        const newGoal = prompt('Enter your primary learning goal:', window.memoryEngine.workingMemory.activeGoal);
        if (newGoal) {
          window.memoryEngine.setGoal(newGoal);
          this.renderLearnerProfile();
          this.showToast('Learning Goal updated in Working Memory');
        }
      });
    }
  }

  switchWorkspaceTab(tabName) {
    this.activeTab = tabName;
    document.querySelectorAll('.workspace-tab-btn').forEach(b => {
      if (b.getAttribute('data-tab') === tabName) {
        b.classList.add('bg-indigo-600', 'text-white');
        b.classList.remove('bg-transparent', 'text-gray-400');
      } else {
        b.classList.remove('bg-indigo-600', 'text-white');
        b.classList.add('bg-transparent', 'text-gray-400');
      }
    });

    document.querySelectorAll('.workspace-view').forEach(v => {
      if (v.id === `view-${tabName}`) {
        v.classList.remove('hidden');
      } else {
        v.classList.add('hidden');
      }
    });

    if (tabName === 'graph') {
      setTimeout(() => this.drawGraph(), 50);
    }
  }

  async handleSendMessage(text) {
    const chatContainer = document.getElementById('chatMessages');
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendChatBtn');

    if (input) input.disabled = true;
    if (sendBtn) sendBtn.disabled = true;

    // 1. Append User Bubble
    this.appendUserMessage(text);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // 2. Create Assistant Response Container with live Agentic Stepper
    const assistantMsgId = `msg-${Date.now()}`;
    const assistantEl = this.createAssistantMessageSkeleton(assistantMsgId);
    chatContainer.appendChild(assistantEl);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    const thoughtAccordion = assistantEl.querySelector('.thought-accordion');
    const thoughtList = assistantEl.querySelector('.thought-steps-list');
    const thoughtBadge = assistantEl.querySelector('.thought-badge');
    const responseContentEl = assistantEl.querySelector('.response-text');

    // 3. Run Agentic Pipeline with real-time step streaming
    const result = await window.agentOrchestrator.processQuery(text, (step) => {
      // Append step item
      const stepItem = document.createElement('div');
      stepItem.className = 'reasoning-step pl-3 py-1.5 text-xs';
      
      let badgeColor = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      let icon = '⚡';
      if (step.type === 'thought') { badgeColor = 'bg-purple-500/20 text-purple-400 border-purple-500/30'; icon = '💭'; }
      if (step.type === 'plan') { badgeColor = 'bg-amber-500/20 text-amber-400 border-amber-500/30'; icon = '📋'; }
      if (step.type === 'action') { badgeColor = 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'; icon = '🛠️'; }
      if (step.type === 'observation') { badgeColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'; icon = '👁️'; }

      stepItem.innerHTML = `
        <div class="flex items-center gap-2 mb-0.5">
          <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${badgeColor}">
            ${icon} ${step.type.toUpperCase()}
          </span>
          <span class="font-semibold text-gray-200">${step.title}</span>
          <span class="text-gray-500 text-[10px] ml-auto">${step.timestamp}</span>
        </div>
        <div class="text-gray-400 text-[11px] leading-relaxed">${step.detail}</div>
      `;
      thoughtList.appendChild(stepItem);
      thoughtBadge.textContent = `${thoughtList.children.length} reasoning steps`;
      chatContainer.scrollTop = chatContainer.scrollHeight;
    });

    // 4. Render final response body
    thoughtAccordion.classList.remove('animate-pulse');
    thoughtBadge.classList.remove('bg-indigo-500/20', 'text-indigo-300');
    thoughtBadge.classList.add('bg-gray-800', 'text-gray-400');
    thoughtBadge.textContent = `Completed (${result.thoughtSteps.length} steps)`;

    // Convert markdown headers & bolding
    responseContentEl.innerHTML = this.formatMarkdown(result.text);

    // Citations
    if (result.citations && result.citations.length > 0) {
      const citationsContainer = document.createElement('div');
      citationsContainer.className = 'mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-2 items-center';
      
      const label = document.createElement('span');
      label.className = 'text-xs text-gray-400 font-medium';
      label.innerHTML = '🔗 Grounded Sources:';
      citationsContainer.appendChild(label);

      result.citations.forEach(c => {
        const pill = document.createElement('button');
        pill.className = 'citation-pill';
        pill.innerHTML = `<span>${c.ref}</span> <span class="text-white font-medium">${c.docTitle}</span> <span class="text-indigo-300 text-[10px]">(${c.confidence})</span>`;
        pill.title = `${c.header}\n${c.snippet}`;
        pill.addEventListener('click', () => {
          this.switchWorkspaceTab('rag');
          this.showToast(`Inspecting source: ${c.docTitle} - ${c.header}`);
        });
        citationsContainer.appendChild(pill);
      });

      responseContentEl.appendChild(citationsContainer);
    }

    // 5. Activate contextual tool in right workspace
    if (result.activeWidget) {
      this.switchWorkspaceTab(result.activeWidget === 'quiz' ? 'quiz' : (result.activeWidget === 'flashcards' ? 'flashcards' : (result.activeWidget === 'code_sandbox' ? 'code' : 'graph')));
      
      if (result.activeWidget === 'quiz') {
        this.renderQuizUI(window.studyTools.activeQuiz);
      }
    }

    this.renderLearnerProfile();
    this.drawGraph();
    this.updateFlashcardsUI();

    if (input) input.disabled = false;
    if (sendBtn) sendBtn.disabled = false;
    input?.focus();
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  appendUserMessage(text) {
    const chatContainer = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = 'flex items-start justify-end gap-3 my-4';
    div.innerHTML = `
      <div class="max-w-[80%] bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-2xl rounded-tr-none px-4 py-3 shadow-md">
        <p class="text-sm leading-relaxed">${this.escapeHtml(text)}</p>
      </div>
      <div class="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-xs font-bold text-indigo-300 flex-shrink-0">
        You
      </div>
    `;
    chatContainer.appendChild(div);
  }

  createAssistantMessageSkeleton(msgId) {
    const div = document.createElement('div');
    div.id = msgId;
    div.className = 'flex items-start gap-3 my-4';
    div.innerHTML = `
      <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-lg flex-shrink-0">
        AI
      </div>
      <div class="flex-1 max-w-[90%] glass-panel rounded-2xl rounded-tl-none p-4">
        <!-- Collapsible Thought Stream -->
        <details class="thought-accordion mb-3 bg-black/30 border border-white/5 rounded-lg overflow-hidden animate-pulse" open>
          <summary class="flex items-center justify-between px-3 py-2 cursor-pointer text-xs font-medium text-gray-400 hover:text-white select-none">
            <span class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
              <span>Agentic Reasoning & Tool Orchestration</span>
            </span>
            <span class="thought-badge px-2 py-0.5 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300 font-mono">
              Synthesizing plan...
            </span>
          </summary>
          <div class="thought-steps-list px-3 py-2 space-y-2 border-t border-white/5 max-h-60 overflow-y-auto">
          </div>
        </details>

        <!-- Main Answer Body -->
        <div class="response-text prose-assistant text-sm text-gray-200 leading-relaxed">
          <div class="flex items-center gap-2 text-indigo-400 text-xs py-2">
            <svg class="animate-spin h-4 w-4 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <span>Retrieving knowledge and formulating response...</span>
          </div>
        </div>
      </div>
    `;
    return div;
  }

  renderInitialWelcome() {
    const chatContainer = document.getElementById('chatMessages');
    if (!chatContainer) return;

    chatContainer.innerHTML = `
      <div class="flex items-start gap-3 my-4">
        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-lg flex-shrink-0">
          AI
        </div>
        <div class="flex-1 max-w-[90%] glass-panel rounded-2xl rounded-tl-none p-4">
          <h3 class="text-base font-bold text-white mb-1 flex items-center gap-2">
            <span>Welcome to your Agentic AI Learning Assistant</span>
            <span class="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">System Ready</span>
          </h3>
          <p class="text-xs text-gray-300 mb-3 leading-relaxed">
            I combine <strong>Autonomous Agentic Reasoning</strong>, <strong>RAG Document Grounding</strong>, <strong>3-Tier Cognitive Memory</strong>, and <strong>Interactive Study Tools</strong> (Quizzes, SM-2 Spaced Repetition, Knowledge Mind Map, and Code Execution).
          </p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <div class="p-2.5 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2">
              <span class="text-indigo-400 text-base">📚</span>
              <div>
                <div class="font-semibold text-gray-200">Preloaded RAG Corpus</div>
                <div class="text-[11px] text-gray-400">Transformers, Shortest Paths, SM-2 & Raft</div>
              </div>
            </div>
            <div class="p-2.5 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2">
              <span class="text-emerald-400 text-base">🧠</span>
              <div>
                <div class="font-semibold text-gray-200">Adaptive Memory Tracking</div>
                <div class="text-[11px] text-gray-400">Tracks concept mastery & spaced repetition</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Learner Profile & Working Memory UI
  renderLearnerProfile() {
    const profile = window.memoryEngine.getLearnerSummary();
    
    // Overall retention
    const retentionEl = document.getElementById('retentionPercent');
    if (retentionEl) retentionEl.textContent = `${profile.learner.overallRetention}%`;

    const retentionBar = document.getElementById('retentionProgressBar');
    if (retentionBar) retentionBar.style.width = `${profile.learner.overallRetention}%`;

    // Streak & Study minutes
    const streakEl = document.getElementById('streakDays');
    if (streakEl) streakEl.textContent = `${profile.learner.streakDays}d`;

    const studyTimeEl = document.getElementById('studyMinutes');
    if (studyTimeEl) studyTimeEl.textContent = `${profile.learner.totalStudyMinutes}m`;

    // Active Goal & Topic
    const goalEl = document.getElementById('workingActiveGoal');
    if (goalEl) goalEl.textContent = profile.workingMemory.activeGoal;

    const topicEl = document.getElementById('workingCurrentTopic');
    if (topicEl) topicEl.textContent = profile.workingMemory.currentTopic;

    // Spaced repetition due badge
    const dueBadge = document.getElementById('dueCardsCount');
    if (dueBadge) dueBadge.textContent = `${profile.dueFlashcardsCount} Due`;

    // Mastery List in sidebar
    const masteryListContainer = document.getElementById('masteryListContainer');
    if (masteryListContainer) {
      masteryListContainer.innerHTML = '';
      profile.masteryList.forEach(item => {
        let badgeColor = 'bg-gray-700 text-gray-300';
        let barColor = 'bg-purple-500';
        if (item.tier === 'Mastered') { badgeColor = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'; barColor = 'bg-emerald-400'; }
        else if (item.tier === 'Proficient') { badgeColor = 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'; barColor = 'bg-cyan-400'; }
        else if (item.tier === 'Developing') { badgeColor = 'bg-amber-500/20 text-amber-400 border border-amber-500/30'; barColor = 'bg-amber-400'; }
        else { badgeColor = 'bg-purple-500/20 text-purple-400 border border-purple-500/30'; barColor = 'bg-purple-400'; }

        const row = document.createElement('div');
        row.className = 'p-2 rounded-lg bg-white/5 hover:bg-white/10 transition text-xs cursor-pointer';
        row.innerHTML = `
          <div class="flex items-center justify-between mb-1">
            <span class="font-medium text-gray-200 truncate max-w-[140px]" title="${item.name}">${item.name}</span>
            <span class="px-1.5 py-0.2 rounded text-[10px] ${badgeColor}">${item.score}%</span>
          </div>
          <div class="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div class="h-full ${barColor} rounded-full transition-all duration-500" style="width: ${item.score}%"></div>
          </div>
        `;
        row.addEventListener('click', () => {
          this.handleSendMessage(`Quiz me on ${item.name} to test my understanding.`);
        });
        masteryListContainer.appendChild(row);
      });
    }

    // Active Misconceptions Alert
    const miscContainer = document.getElementById('misconceptionsContainer');
    if (miscContainer) {
      if (profile.activeMisconceptions.length === 0) {
        miscContainer.innerHTML = `<div class="text-[11px] text-gray-500 italic">No active misconceptions recorded. Clean conceptual model!</div>`;
      } else {
        miscContainer.innerHTML = '';
        profile.activeMisconceptions.forEach(m => {
          const mEl = document.createElement('div');
          mEl.className = 'p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200';
          mEl.innerHTML = `
            <div class="font-semibold flex items-center justify-between">
              <span>⚠️ ${m.concept}</span>
              <button class="text-[10px] text-gray-400 hover:text-white" title="Mark resolved">✓</button>
            </div>
            <div class="text-gray-300 text-[10px] mt-0.5">${m.detail}</div>
          `;
          mEl.querySelector('button').addEventListener('click', (e) => {
            e.stopPropagation();
            window.memoryEngine.resolveMisconception(m.concept);
            this.renderLearnerProfile();
            this.showToast(`Misconception for "${m.concept}" resolved!`);
          });
          miscContainer.appendChild(mEl);
        });
      }
    }
  }

  // RAG Documents view
  renderRAGDocuments() {
    const list = document.getElementById('ragDocsList');
    if (!list) return;

    list.innerHTML = '';
    window.ragEngine.documents.forEach(doc => {
      const card = document.createElement('div');
      card.className = 'p-3 rounded-xl bg-white/5 border border-white/10 hover:border-indigo-500/40 transition flex flex-col justify-between';
      card.innerHTML = `
        <div>
          <div class="flex items-center justify-between mb-1">
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-medium">${doc.category}</span>
            <span class="text-[10px] text-gray-500">${doc.source}</span>
          </div>
          <h4 class="text-xs font-semibold text-white mb-1.5">${doc.title}</h4>
          <p class="text-[11px] text-gray-400 line-clamp-3 leading-relaxed">${doc.content.slice(0, 180)}...</p>
        </div>
        <div class="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
          <span class="text-gray-500">${window.ragEngine.chunks.filter(c => c.docId === doc.id).length} chunks</span>
          <button class="text-indigo-400 hover:text-indigo-300 font-medium">Ask Question →</button>
        </div>
      `;

      card.querySelector('button').addEventListener('click', () => {
        this.handleSendMessage(`Explain the core takeaways from "${doc.title}" with citations.`);
      });

      list.appendChild(card);
    });
  }

  // Interactive Knowledge Canvas (Mind Map)
  initGraphCanvas() {
    this.canvas = document.getElementById('conceptGraphCanvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    const resize = () => {
      const parent = this.canvas.parentElement;
      if (parent) {
        this.canvas.width = parent.clientWidth;
        this.canvas.height = 420;
        this.drawGraph();
      }
    };
    window.addEventListener('resize', resize);
    resize();

    // Canvas Mouse interaction
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const nodes = window.memoryEngine.longTermMemory.knowledgeGraph;
      let found = null;
      for (const node of nodes) {
        const dx = node.x - mouseX;
        const dy = node.y - mouseY;
        if (Math.sqrt(dx * dx + dy * dy) < 22) {
          found = node;
          break;
        }
      }

      if (found !== this.hoveredNode) {
        this.hoveredNode = found;
        this.drawGraph();
      }
    });

    this.canvas.addEventListener('click', () => {
      if (this.hoveredNode) {
        this.selectedNode = this.hoveredNode;
        this.handleSendMessage(`Teach me about "${this.hoveredNode.label}" and quiz me.`);
      }
    });
  }

  drawGraph() {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Draw Subtle Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    const nodes = window.memoryEngine.longTermMemory.knowledgeGraph;
    const edges = window.memoryEngine.longTermMemory.knowledgeEdges;
    const nodeMap = {};
    nodes.forEach(n => nodeMap[n.id] = n);

    // Draw Edges
    edges.forEach(edge => {
      const from = nodeMap[edge.from];
      const to = nodeMap[edge.to];
      if (!from || !to) return;

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Edge Label
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;
      ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
      ctx.font = '9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(edge.label, midX, midY - 4);
    });

    // Draw Nodes
    nodes.forEach(node => {
      const isHovered = this.hoveredNode === node;
      const radius = isHovered ? 24 : 18;

      // Outer glow
      let color = '#8B5CF6';
      if (node.mastery >= 85) color = '#10B981'; // Emerald
      else if (node.mastery >= 70) color = '#06B6D4'; // Cyan
      else if (node.mastery >= 50) color = '#F59E0B'; // Amber

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + (isHovered ? 6 : 3), 0, Math.PI * 2);
      ctx.fillStyle = isHovered ? 'rgba(99, 102, 241, 0.35)' : 'rgba(255, 255, 255, 0.05)';
      ctx.fill();

      // Node Circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#1E293B';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = isHovered ? 3 : 2;
      ctx.stroke();

      // Mastery Progress Arc inside circle
      const arcEnd = (node.mastery / 100) * (Math.PI * 2) - Math.PI / 2;
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius - 4, -Math.PI / 2, arcEnd);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Text label
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${node.mastery}%`, node.x, node.y + 3);

      // Node Name below
      ctx.fillStyle = isHovered ? '#FFFFFF' : '#CBD5E1';
      ctx.font = isHovered ? 'bold 10px Inter, sans-serif' : '10px Inter, sans-serif';
      ctx.fillText(node.label, node.x, node.y + radius + 14);
    });
  }

  // Active Recall: Flashcards UI
  updateFlashcardsUI() {
    this.dueCards = window.memoryEngine.longTermMemory.flashcards;
    if (this.currentFlashcardIdx >= this.dueCards.length) {
      this.currentFlashcardIdx = 0;
    }

    const card = this.dueCards[this.currentFlashcardIdx];
    if (!card) return;

    const cardEl = document.getElementById('flashcardCard');
    cardEl?.classList.remove('flipped');

    const questionEl = document.getElementById('cardQuestionText');
    const answerEl = document.getElementById('cardAnswerText');
    const conceptBadge = document.getElementById('cardConceptBadge');
    const intervalBadge = document.getElementById('cardIntervalBadge');
    const indexBadge = document.getElementById('cardIndexBadge');

    if (questionEl) questionEl.textContent = card.question;
    if (answerEl) answerEl.textContent = card.answer;
    if (conceptBadge) conceptBadge.textContent = card.concept;
    if (intervalBadge) intervalBadge.textContent = `Interval: ${card.interval}d | EF: ${card.easeFactor}`;
    if (indexBadge) indexBadge.textContent = `${this.currentFlashcardIdx + 1} / ${this.dueCards.length}`;
  }

  handleSpacedRating(qualityGrade) {
    const card = this.dueCards[this.currentFlashcardIdx];
    if (!card) return;

    const updated = window.memoryEngine.recordSpacedReview(card.id, qualityGrade);
    this.showToast(`Recorded SM-2 Grade: ${qualityGrade}/5 (New interval: ${updated.interval}d)`);
    
    // Move to next card
    this.currentFlashcardIdx = (this.currentFlashcardIdx + 1) % this.dueCards.length;
    this.updateFlashcardsUI();
    this.renderLearnerProfile();
    this.drawGraph();
  }

  // Interactive Quiz UI
  renderQuizUI(quizData) {
    const container = document.getElementById('quizContainer');
    if (!container || !quizData) return;

    container.innerHTML = `
      <div class="glass-panel p-4 rounded-xl border border-indigo-500/30">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold text-indigo-400 uppercase tracking-wide">${quizData.topic}</span>
          <span class="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">${quizData.concept}</span>
        </div>
        <p class="text-sm font-medium text-white mb-4 leading-relaxed">${quizData.question}</p>
        <div class="space-y-2" id="quizOptionsList">
          ${quizData.options.map((opt, idx) => `
            <button class="quiz-opt-btn w-full text-left p-3 rounded-lg bg-white/5 border border-white/10 hover:border-indigo-500 hover:bg-white/10 text-xs text-gray-200 transition flex items-center justify-between" data-opt="${idx}">
              <span>${opt}</span>
              <span class="opt-mark text-xs font-bold"></span>
            </button>
          `).join('')}
        </div>
        <div id="quizFeedbackArea" class="mt-4 hidden p-3 rounded-lg text-xs leading-relaxed"></div>
      </div>
    `;

    container.querySelectorAll('.quiz-opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const selected = parseInt(btn.getAttribute('data-opt'), 10);
        const evalResult = window.studyTools.evaluateQuizAnswer(selected);
        
        // Highlight options
        container.querySelectorAll('.quiz-opt-btn').forEach((b, i) => {
          b.disabled = true;
          if (i === evalResult.correctIndex) {
            b.classList.add('bg-emerald-500/20', 'border-emerald-500', 'text-emerald-300');
            b.querySelector('.opt-mark').textContent = '✓ Correct';
          } else if (i === selected && !evalResult.isCorrect) {
            b.classList.add('bg-rose-500/20', 'border-rose-500', 'text-rose-300');
            b.querySelector('.opt-mark').textContent = '✗';
          }
        });

        // Show explanation
        const feedback = container.querySelector('#quizFeedbackArea');
        feedback.classList.remove('hidden');
        if (evalResult.isCorrect) {
          feedback.className = 'mt-4 p-3 rounded-lg text-xs leading-relaxed bg-emerald-500/10 border border-emerald-500/30 text-emerald-200';
          feedback.innerHTML = `<strong>🎉 Excellent! Mastered concept boosted +10%!</strong><p class="mt-1">${evalResult.explanation}</p>`;
        } else {
          feedback.className = 'mt-4 p-3 rounded-lg text-xs leading-relaxed bg-amber-500/10 border border-amber-500/30 text-amber-200';
          feedback.innerHTML = `<strong>💡 Misconception identified and logged.</strong><p class="mt-1">${evalResult.explanation}</p>`;
        }

        this.renderLearnerProfile();
        this.drawGraph();
      });
    });
  }

  // Code Sandbox
  renderConsoleOutput(result) {
    const consoleEl = document.getElementById('codeConsoleOutput');
    if (!consoleEl) return;

    consoleEl.innerHTML = `
      <div class="flex items-center justify-between text-[11px] text-gray-500 mb-1 border-b border-white/5 pb-1">
        <span>Status: ${result.success ? '✓ Success' : '✗ Error'}</span>
        <span>Execution: ${result.executionTime}</span>
      </div>
      <pre class="font-mono text-xs text-gray-200 whitespace-pre-wrap">${this.escapeHtml(result.output)}</pre>
    `;
  }

  // Pomodoro Timer
  initPomodoro() {
    const timerDisplay = document.getElementById('pomodoroDisplay');
    const toggleBtn = document.getElementById('pomodoroToggleBtn');
    const resetBtn = document.getElementById('pomodoroResetBtn');

    const updateDisplay = () => {
      const mins = Math.floor(window.studyTools.pomodoro.remaining / 60).toString().padStart(2, '0');
      const secs = (window.studyTools.pomodoro.remaining % 60).toString().padStart(2, '0');
      if (timerDisplay) timerDisplay.textContent = `${mins}:${secs}`;
    };

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const p = window.studyTools.pomodoro;
        if (p.isRunning) {
          clearInterval(p.intervalId);
          p.isRunning = false;
          toggleBtn.textContent = '▶ Start Focus';
          toggleBtn.classList.remove('bg-amber-600');
          toggleBtn.classList.add('bg-indigo-600');
        } else {
          p.isRunning = true;
          toggleBtn.textContent = '⏸ Pause';
          toggleBtn.classList.remove('bg-indigo-600');
          toggleBtn.classList.add('bg-amber-600');

          p.intervalId = setInterval(() => {
            if (p.remaining > 0) {
              p.remaining -= 1;
              updateDisplay();
            } else {
              clearInterval(p.intervalId);
              p.isRunning = false;
              p.completedSessions += 1;
              window.memoryEngine.longTermMemory.learner.totalStudyMinutes += 25;
              this.renderLearnerProfile();
              this.showToast('🎉 Pomodoro Focus Session Complete! Time for a 5-minute cognitive rest.');
              toggleBtn.textContent = '▶ Start Focus';
            }
          }, 1000);
        }
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        clearInterval(window.studyTools.pomodoro.intervalId);
        window.studyTools.pomodoro.isRunning = false;
        window.studyTools.pomodoro.remaining = 25 * 60;
        updateDisplay();
        if (toggleBtn) toggleBtn.textContent = '▶ Start Focus';
      });
    }

    updateDisplay();
  }

  formatMarkdown(text) {
    if (!text) return '';
    let parsed = text
      .replace(/^### (.*$)/gim, '<h3 class="text-sm font-bold text-white mt-3 mb-1">$1</h3>')
      .replace(/^#### (.*$)/gim, '<h4 class="text-xs font-semibold text-gray-200 mt-2 mb-1">$1</h4>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold text-white">$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em class="text-gray-300">$1</em>')
      .replace(/`([^`]+)`/gim, '<code class="px-1 py-0.5 rounded bg-black/40 text-indigo-300 font-mono text-[11px]">$1</code>')
      .replace(/^> (.*$)/gim, '<blockquote class="border-l-2 border-indigo-500 pl-3 py-1 my-2 text-xs text-gray-300 bg-indigo-500/10 rounded-r">$1</blockquote>')
      .replace(/\n\n/gim, '</p><p class="mt-2 text-xs leading-relaxed text-gray-300">');

    return `<p class="text-xs leading-relaxed text-gray-300">${parsed}</p>`;
  }

  escapeHtml(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
  }

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-5 right-5 bg-gray-900/95 border border-indigo-500/50 text-white text-xs px-4 py-2.5 rounded-xl shadow-2xl z-50 flex items-center gap-2 transform transition-all duration-300 translate-y-4 opacity-0';
    toast.innerHTML = `<span>⚡</span><span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.remove('translate-y-4', 'opacity-0');
    }, 10);

    setTimeout(() => {
      toast.classList.add('translate-y-4', 'opacity-0');
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }
}

// Instantiate on load
window.addEventListener('DOMContentLoaded', () => {
  window.appController = new AppController();
  window.appController.init();
});
