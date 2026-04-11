const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const SUPPORTED_PDF_TYPE = 'application/pdf';
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB — Anthropic API document limit

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function resolveMediaType(file) {
  const mime = file.type || '';
  if (SUPPORTED_IMAGE_TYPES.includes(mime)) return mime;
  if (mime === SUPPORTED_PDF_TYPE) return SUPPORTED_PDF_TYPE;
  // Fallback by extension
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'pdf') return SUPPORTED_PDF_TYPE;
  if (ext === 'png') return 'image/png';
  if (['jpg', 'jpeg'].includes(ext)) return 'image/jpeg';
  if (ext === 'webp') return 'image/webp';
  return null; // unsupported
}

const EXTRACT_PROMPT = `Tu es un expert-comptable. Analyse cette facture et extrais les informations suivantes.

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans texte avant ou après.

{
  "supplier_name": "string (nom du fournisseur/émetteur, obligatoire)",
  "invoice_date": "YYYY-MM-DD ou null",
  "invoice_number": "string ou null",
  "amount_ht": number ou null,
  "amount_tva": number ou null,
  "amount_ttc": number ou null,
  "is_closer_invoice": boolean (true si c'est une facture de commission/closing/apporteur d'affaires/parrainage commercial),
  "closer_lines": [
    {
      "closer_name": "string (nom du closer ou commercial, obligatoire)",
      "client_name": "string (nom du client signé, obligatoire)",
      "closing_date": "YYYY-MM-DD ou null",
      "product_sold": "string (produit/offre vendu) ou null",
      "amount": number (montant HT de la commission pour ce deal)
    }
  ],
  "notes": "string ou null"
}

Règles:
- closer_lines doit être un tableau, même vide ([] si pas une facture closer)
- Si is_closer_invoice est true, extrais chaque deal listé sur la facture dans closer_lines
- Si le closer_name n'est pas explicite, utilise le supplier_name
- Tous les montants sont en euros, valeurs numériques sans symbole`;

export function useInvoiceExtraction() {
  const canExtract = !!API_KEY;

  const extract = async (file) => {
    if (!API_KEY) {
      throw new Error('Clé API Claude manquante (VITE_ANTHROPIC_API_KEY non définie)');
    }

    const mediaType = resolveMediaType(file);
    if (!mediaType) {
      throw new Error(`Format non supporté pour l'extraction IA: ${file.name}`);
    }

    if (file.size > MAX_FILE_BYTES) {
      throw new Error(`Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} Mo) — limite 5 Mo pour l'extraction IA`);
    }

    try {
      const base64 = await fileToBase64(file);

      const contentBlock = mediaType === SUPPORTED_PDF_TYPE
        ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
        : { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } };

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-6',
          max_tokens: 1500,
          messages: [
            {
              role: 'user',
              content: [contentBlock, { type: 'text', text: EXTRACT_PROMPT }],
            },
          ],
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `Erreur API Claude (${response.status})`);
      }

      const data = await response.json();
      const text = data.content?.[0]?.text || '';

      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Réponse IA invalide (JSON introuvable)');

      const extracted = JSON.parse(match[0]);

      // Normalize
      extracted.closer_lines = Array.isArray(extracted.closer_lines) ? extracted.closer_lines : [];
      extracted.is_closer_invoice = Boolean(extracted.is_closer_invoice);
      extracted.amount_ht = extracted.amount_ht != null ? Number(extracted.amount_ht) : null;
      extracted.amount_tva = extracted.amount_tva != null ? Number(extracted.amount_tva) : null;
      extracted.amount_ttc = extracted.amount_ttc != null ? Number(extracted.amount_ttc) : null;

      return extracted;
    } catch (e) {
      throw e;
    }
  };

  return { extract, canExtract };
}
