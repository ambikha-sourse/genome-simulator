const API = '';
let geneData = {};

// Initialize application
window.onload = async () => {
  buildDNAHelix();
  await loadGenes();
};

function buildDNAHelix() {
  const strand = document.getElementById('strand');
  strand.innerHTML = ''; // clear any existing
  // Build 14 base pairs to fit the panel without overflowing
  for (let i = 0; i < 14; i++) {
    // Staggered animation delay
    const delay = -(i * 0.4);
    strand.innerHTML += `
      <div class="base-pair" style="animation-delay: ${delay}s">
        <div class="base left"></div>
        <div class="bond"></div>
        <div class="base right"></div>
      </div>`;
  }
}

async function loadGenes() {
  const container = document.getElementById('gene-list');
  try {
    const res = await fetch(`${API}/genes`);
    if (!res.ok) throw new Error('Network response was not ok');
    geneData = await res.json();
    renderGeneCards();
  } catch (e) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔌</div>
        <p style="color:var(--risk-high)">Backend Connection Failed.</p>
        <p style="font-size:0.85rem;margin-top:8px">Please ensure the Flask API is running on localhost:5000.</p>
      </div>`;
    document.getElementById('analyze-btn').disabled = true;
  }
}

function renderGeneCards() {
  const container = document.getElementById('gene-list');
  container.innerHTML = '';
  
  // Sort genes alphabetically for consistent UI
  const genes = Object.keys(geneData).sort();
  
  genes.forEach((gene, index) => {
    const info = geneData[gene];
    const variants = Object.keys(info.variants);
    const options = variants.map(v =>
      `<option value="${v}">${v} — ${info.variants[v].effect}</option>`
    ).join('');
    
    // Staggered entry animation
    const delay = index * 0.05;
    
    container.innerHTML += `
      <div class="gene-card" style="animation: slideIn 0.4s ease forwards; animation-delay: ${delay}s; opacity: 0;">
        <label for="gene-${gene}">${gene}</label>
        <div class="trait-tag">
          ${getCategoryIcon(info.category)} ${info.trait}
        </div>
        <select id="gene-${gene}">${options}</select>
      </div>`;
  });
}

function getCategoryIcon(category) {
  const icons = {
    physical: '👁️',
    digestion: '🥛',
    fitness: '🏃',
    health: '❤️',
    metabolism: '⚡',
    mental: '🧠'
  };
  return icons[category] || '🧬';
}

function getRiskBadge(risk) {
  const badges = {
    none:   '<span class="risk-badge badge-none">✅ No Risk</span>',
    low:    '<span class="risk-badge badge-low">🟢 Low Risk</span>',
    medium: '<span class="risk-badge badge-medium">🟡 Moderate Risk</span>',
    high:   '<span class="risk-badge badge-high">🔴 High Risk</span>'
  };
  return badges[risk] || badges.none;
}

async function analyzeGenome() {
  const btn = document.getElementById('analyze-btn');
  const summary = document.getElementById('dna-summary');
  const seeAnalysisBtn = document.getElementById('see-analysis-btn');
  
  // UI Loading State
  btn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;margin:0"></div> Analyzing...';
  btn.disabled = true;
  seeAnalysisBtn.style.display = 'none';
  
  summary.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Sequencing DNA and applying modifiers...</p>
    </div>`;

  const genes = {};
  for (const gene of Object.keys(geneData)) {
    const el = document.getElementById(`gene-${gene}`);
    if (el) genes[gene] = el.value;
  }

  const environment = {
    exercise: parseInt(document.getElementById('exercise').value),
    sleep:    parseInt(document.getElementById('sleep').value),
    stress:   parseInt(document.getElementById('stress').value)
  };

  try {
    // Artificial delay to show the nice loading animation
    await new Promise(r => setTimeout(r, 800));
    
    const res = await fetch(`${API}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ genes, environment })
    });
    
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    renderResults(data);
    
  } catch (e) {
    summary.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">❌</div>
        <p style="color:var(--risk-high)">Analysis failed.</p>
        <p style="font-size:0.85rem;margin-top:8px">Check if backend is running.</p>
      </div>`;
  }

  // Restore button
  btn.innerHTML = '<span class="btn-icon">🧪</span> Analyze My Genome';
  btn.disabled = false;
}

function renderResults(data) {
  const output = document.getElementById('results-output');
  const summary = document.getElementById('dna-summary');
  const seeAnalysisBtn = document.getElementById('see-analysis-btn');

  const high   = data.health_risks.filter(r => r.risk === 'high').length;
  const medium = data.health_risks.filter(r => r.risk === 'medium').length;
  const total = data.total_genes_analyzed;

  summary.innerHTML = `
    <h3 style="color:var(--accent-cyan); font-family:var(--font-heading); margin-bottom:8px">
      Analysis Complete
    </h3>
    <p style="color:#fff; margin-bottom:8px">${total} Traits Analyzed</p>
    <div style="display:flex; justify-content:center; gap:12px">
      <span class="val-badge" style="background:rgba(255,51,102,0.2); color:var(--risk-high)">${high} High Risk</span>
      <span class="val-badge" style="background:rgba(255,170,0,0.2); color:var(--risk-med)">${medium} Med Risk</span>
    </div>`;

  seeAnalysisBtn.style.display = 'block';

  output.innerHTML = '';
  
  // Sort results: High risk first, then medium, then low/none
  const riskWeight = { high: 3, medium: 2, low: 1, none: 0 };
  const sortedPredictions = data.predictions.sort((a, b) => riskWeight[b.risk] - riskWeight[a.risk]);

  sortedPredictions.forEach((p, index) => {
    // Delay animation for each card
    const delay = index * 0.1;
    
    output.innerHTML += `
      <div class="result-card" style="border-top: 4px solid var(--risk-${p.risk === 'none' ? 'low' : p.risk === 'medium' ? 'med' : p.risk}); animation-delay: ${delay}s">
        
        <div class="result-header">
          <div>
            <h3 class="result-title">${p.trait}</h3>
            <span class="result-gene">${p.gene} [${p.variant}]</span>
          </div>
          ${getRiskBadge(p.risk)}
        </div>
        
        <p class="result-effect">${p.effect}</p>
        
        <div class="confidence-wrapper">
          <div class="confidence-header">
            <span>Prediction Confidence</span>
            <span>${p.confidence}%</span>
          </div>
          <div class="confidence-bar">
            <!-- Inline style for width, but we trigger it after DOM insert for animation -->
            <div class="confidence-fill" style="width: ${p.confidence}%"></div>
          </div>
        </div>
      </div>`;
  });
}

function openGeneModal() {
  const modal = document.getElementById('gene-modal');
  if (modal) {
    modal.classList.remove('hidden');
  }
}

function closeGeneModal() {
  const modal = document.getElementById('gene-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

function openResultsModal() {
  const modal = document.getElementById('results-modal');
  if (modal) {
    modal.classList.remove('hidden');
  }
}

function closeResultsModal() {
  const modal = document.getElementById('results-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}