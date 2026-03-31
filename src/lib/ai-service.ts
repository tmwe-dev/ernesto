// ============================================================================
// AI Service — Chiama Anthropic API con la chiave salvata in DB
// ============================================================================

import { supabase } from './supabaseClient';

interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AIResponse {
  content: string;
  error?: string;
}

async function getAnthropicKey(): Promise<string | null> {
  const { data } = await supabase
    .from('ernesto_api_keys')
    .select('api_key')
    .eq('provider', 'anthropic')
    .eq('is_active', true)
    .limit(1)
    .single();

  return data?.api_key || null;
}

export async function sendToAI(
  messages: AIMessage[],
  systemPrompt?: string,
  fileContext?: string
): Promise<AIResponse> {
  const apiKey = await getAnthropicKey();

  if (!apiKey) {
    return { content: '', error: 'Nessuna chiave Anthropic configurata. Vai su Admin → API Keys per aggiungerne una.' };
  }

  const systemText = [
    systemPrompt || `Sei ERNESTO, un assistente AI specializzato nell'analisi di listini prezzi per spedizioni e logistica.
Rispondi in italiano. Sei preciso, professionale e conciso.
Aiuti gli utenti a importare, analizzare e gestire listini di corrieri (DHL, FedEx, UPS, TNT, GLS, BRT, ecc).
Conosci zone, tariffe, supplementi, fasce di peso, e formati standard dei listini.`,
    fileContext ? `\n\nContesto documento allegato:\n${fileContext}` : '',
  ].join('');

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemText,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { content: '', error: err?.error?.message || `API error: ${response.status}` };
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    return { content: text };
  } catch (err) {
    return { content: '', error: err instanceof Error ? err.message : 'Errore di connessione' };
  }
}

export async function analyzeFile(
  fileBase64: string,
  fileName: string,
  carrierHint?: string
): Promise<AIResponse> {
  const systemPrompt = `Sei ERNESTO, analizzatore esperto di listini prezzi per spedizioni.
Analizza il documento fornito e restituisci un report dettagliato con:
1. Corriere identificato
2. Tipo di file e struttura
3. Zone trovate (numero e tipo ZON/SUB)
4. Fasce di peso
5. Valuta
6. Supplementi trovati
7. Anomalie o problemi
8. Livello di confidenza (0-100%)

Rispondi in italiano con formato strutturato.`;

  const fileMsg = `Analizza questo listino prezzi.
File: ${fileName}
${carrierHint ? `Suggerimento corriere: ${carrierHint}` : ''}

Contenuto file (base64): ${fileBase64.substring(0, 50000)}`;

  return sendToAI([{ role: 'user', content: fileMsg }], systemPrompt);
}
