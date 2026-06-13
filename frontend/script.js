const API = 'https://genome-simulator.onrender.com';
let geneData = {};

// Load genes on page load
window.onload = async () => {
  buildDNAHelix();
  try {
    const res = await fetch(`${API}/genes`);
    geneData = await res.json();
    renderGeneCards();
  } catch (e) {
    document.getElementById('gene-list').innerHTML =
      '<p style="color:#ff4444">Could not connect to backend. Make sure Flask is running.</p>';
  }
};

function buildDNAHelix() {
  const strand = document.getElementById('strand');
  for (let i = 0; i < 18; i++) {
    strand.innerHTML += `
      <div class="base-pair">
        <div class="base left"></div>
        <div class="bond"></div>
        <div class="base right"></div>
      </div>`;
  }
}

function renderGeneCards() {
  const container = document.getElementById('gene-list');
  container.innerHTML = '';
  for (const [gene, info] of Object.entries(geneData)) {
    const variants = Object.keys(info.variants);
    const options = variants.map(v =>
      `<option value="${v}">${v} — ${info.variants[v].effect}</option>`
    ).join('');
    container.innerHTML += `
      <div class="gene-card">
        <label>${gene}</label>
        <div class="trait-tag">📌 ${info.trait} · ${info.category}</div>
        <select id="gene-${gene}">${options}</select>
      </div>`;
  }
}

async function analyzeGenome() {
  const btn = document.getElementById('analyze-btn');
  btn.textContent = '⏳ Analyzing...';
  btn.disabled = true;

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
    const res = await fetch(`${API}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ genes, environment })
    });
    const data = await res.json();
    renderResults(data);
  } catch (e) {
    document.getElementById('results-output').innerHTML =
      '<p style="color:#ff4444">Analysis failed. Check Flask backend.</p>';
  }

  btn.textContent = '🧪 Analyze My Genome';
  btn.disabled = false;
}

function renderResults(data) {
  const output = document.getElementById('results-output');
  const summary = document.getElementById('dna-summary');

  const high   = data.health_risks.filter(r => r.risk === 'high').length;
  const medium = data.health_risks.filter(r => r.risk === 'medium').length;

  summary.innerHTML = `
    <p style="color:#7ef0ff;font-size:1rem;font-weight:600">
      ${data.total_genes_analyzed} Genes Analyzed
    </p>
    <p style="margin-top:6px">
      🔴 ${high} High Risk &nbsp; 🟡 ${medium} Medium Risk
    </p>`;

  output.innerHTML = data.predictions.map(p => `
    <div class="result-card risk-${p.risk}">
      <h3>${p.trait} — ${p.gene}</h3>
      <p>Variant: <strong>${p.variant}</strong></p>
      <p>${p.effect}</p>
      <span class="risk-badge badge-${p.risk}">
        ${p.risk === 'none' ? '✅ No Risk' :
          p.risk === 'low'  ? '🟢 Low Risk' :
          p.risk === 'medium' ? '🟡 Medium Risk' : '🔴 High Risk'}
      </span>
      <div class="confidence-bar">
        <div class="confidence-fill" style="width:${p.confidence}%"></div>
      </div>
      <p style="font-size:0.75rem;margin-top:4px;color:#5555aa">
        Confidence: ${p.confidence}%
      </p>
    </div>`).join('');
}