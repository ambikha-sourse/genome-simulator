import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__, static_folder='../frontend', static_url_path='/')
# Enable CORS for local development
CORS(app, resources={r"/*": {"origins": "*"}})

# Load gene database with error handling
DATA_PATH = os.path.join(os.path.dirname(__file__), 'data', 'genes.json')
try:
    with open(DATA_PATH, 'r') as f:
        GENE_DATA = json.load(f)
except FileNotFoundError:
    print(f"Error: Database file not found at {DATA_PATH}")
    GENE_DATA = {}

@app.route('/')
def home():
    return app.send_static_file('index.html')

@app.route('/genes', methods=['GET'])
def get_genes():
    """Returns the available genes and their variants."""
    if not GENE_DATA:
        return jsonify({"error": "Gene database is offline"}), 500
    return jsonify(GENE_DATA)

@app.route('/predict', methods=['POST'])
def predict():
    """
    Analyzes selected gene variants and applies environmental modifiers
    to predict traits and calculate health risks.
    """
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    data = request.get_json()
    selected_genes = data.get('genes', {})
    environment = data.get('environment', {})

    if not isinstance(selected_genes, dict) or not isinstance(environment, dict):
        return jsonify({"error": "Invalid payload format"}), 400

    results = []
    health_risks = []

    # Parse environmental modifiers with defaults (1-10 scale)
    exercise = int(environment.get('exercise', 5))
    sleep = int(environment.get('sleep', 5))
    stress = int(environment.get('stress', 5))

    for gene, selected_variant in selected_genes.items():
        if gene not in GENE_DATA:
            continue

        gene_info = GENE_DATA[gene]
        variants_dict = gene_info.get('variants', {})
        
        if selected_variant not in variants_dict:
            continue
            
        variant_data = variants_dict[selected_variant]

        confidence = variant_data.get('confidence', 0.5)
        risk = variant_data.get('risk', 'none')

        # --- Environmental Modifiers Logic ---
        
        # ACTN3 & FTO: Impacted by high exercise
        if exercise > 7:
            if gene == 'ACTN3':
                confidence = min(confidence + 0.12, 0.99)
            elif gene == 'FTO':
                confidence = min(confidence + 0.08, 0.95)
                # Exercise mitigates FTO obesity risk
                if risk == 'high':
                    risk = 'medium'
                elif risk == 'medium':
                    risk = 'low'
                    
        # FTO: Impacted by low exercise
        elif exercise < 4 and gene == 'FTO':
            if risk == 'low':
                risk = 'medium'

        # SLC6A4: Impacted by stress
        if stress > 7 and gene == 'SLC6A4':
            confidence = min(confidence + 0.10, 0.95)
            if risk == 'medium':
                risk = 'high'
            elif risk == 'low':
                risk = 'medium'

        # APOE: Impacted by poor sleep
        if sleep < 4 and gene == 'APOE':
            if risk == 'medium':
                risk = 'high'
            elif risk == 'low':
                risk = 'medium'
                
        # ------------------------------------

        result = {
            'gene': gene,
            'trait': gene_info['trait'],
            'category': gene_info['category'],
            'variant': selected_variant,
            'effect': variant_data.get('effect', 'Unknown'),
            'confidence': int(round(confidence * 100)),
            'risk': risk
        }
        results.append(result)

        if risk in ['medium', 'high']:
            health_risks.append({
                'gene': gene,
                'trait': gene_info['trait'],
                'risk': risk
            })

    return jsonify({
        'predictions': results,
        'health_risks': health_risks,
        'total_genes_analyzed': len(results)
    })

if __name__ == '__main__':
    # Use debug=True for local development
    app.run(debug=True, port=5000)