from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app, orgins="*")

# Load gene database
data_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'genes.json')
with open(data_path) as f:
    GENE_DATA = json.load(f)

@app.route('/')
def home():
    return jsonify({"message": "Genome Simulator API is running!"})

@app.route('/genes', methods=['GET'])
def get_genes():
    return jsonify(GENE_DATA)

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    selected_genes = data.get('genes', {})
    environment = data.get('environment', {})

    results = []
    health_risks = []

    for gene, variant in selected_genes.items():
        if gene in GENE_DATA:
            gene_info = GENE_DATA[gene]
            variant_data = gene_info['variants'].get(variant, {})

            confidence = variant_data.get('confidence', 0.5)
            risk = variant_data.get('risk', 'none')

            # Environmental modifiers
            exercise = environment.get('exercise', 5)
            sleep = environment.get('sleep', 5)
            stress = environment.get('stress', 5)

            if gene == 'ACTN3' and exercise > 7:
                confidence = min(confidence + 0.08, 1.0)
            if gene == 'FTO' and exercise > 7:
                confidence = min(confidence + 0.05, 1.0)
                if risk == 'high':
                    risk = 'medium'
            if gene == 'SLC6A4' and stress > 7:
                if risk == 'medium':
                    risk = 'high'
            if gene == 'APOE' and sleep < 4:
                if risk == 'medium':
                    risk = 'high'

            result = {
                'gene': gene,
                'trait': gene_info['trait'],
                'category': gene_info['category'],
                'variant': variant,
                'effect': variant_data.get('effect', 'Unknown'),
                'confidence': round(confidence * 100),
                'risk': risk
            }
            results.append(result)

            if risk in ['medium', 'high']:
                health_risks.append({
                    'trait': gene_info['trait'],
                    'risk': risk
                })

    return jsonify({
        'predictions': results,
        'health_risks': health_risks,
        'total_genes_analyzed': len(results)
    })

if __name__ == '__main__':
    app.run(debug=True)