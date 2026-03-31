// ============================================================================
// AI Service — ERNESTO: Traduttore Intelligente Listini → TMS
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
  try {
    const { data } = await supabase
      .from('ernesto_api_keys')
      .select('api_key')
      .eq('provider', 'anthropic')
      .eq('is_active', true)
      .limit(1)
      .single();
    return data?.api_key || null;
  } catch {
    return null;
  }
}

// ── System Prompt con conoscenza TMS reale ──
const ERNESTO_SYSTEM_PROMPT = `Sei ERNESTO, l'assistente AI di TMWE (Transport Management Worldwide Express) specializzato nell'analisi e importazione di listini prezzi da corrieri internazionali.

## IL TUO COMPITO
Ricevi file listino (Excel/PDF/CSV) da corrieri e li analizzi per preparare i dati all'importazione nel TMS TMWE. Sei il "traduttore intelligente" tra il formato grezzo del corriere e le tabelle del TMS.

## STRUTTURA LISTINI NEL TMS
Ogni listino nel TMS (tabella "listy") ha questi attributi chiave:
- **Tipo**: "C" (Per i clienti) o "F" (Dai fornitori)
- **Listini base**: Clienti (C), Partner (P), Promo (O), Market (M)
- **Zone**: ZON (zone normali per paese), SUB (sub-zone per CAP/provincia), APIZ (API zona), APIP (API prezzo)
- **Parcel/Document**: P (Parcel), D (Document), U (Unico), Ps (UPS 1 collo), Pm (UPS multi-colli)
- **Unità misura**: M (Metrico kg/cm), I (Imperiale lb/in)
- **Valute supportate**: EUR, USD, GBP, CHF, CNY, JPY, INR, AED, PLN, SGD, TWD, JOD
- **Prezzi per**: P (scaglioni peso), B (tipo bancale/collo), M (bancali metro lineare)
- **Opzioni**: moltiplicazione step peso, costo base, costo minimo, costo a collo, bidirezionale

## STRUTTURA ZONE
- **Zone normali (ZON)**: Ogni zona ha un numero (1-20+) e raggruppa paesi. Es: Zona 1 = IT, Zona 2 = DE/AT/CH, etc.
- **Sub-zone (SUB)**: Zone più granulari per CAP/provincia/città dentro lo stesso paese. Usate per corrieri nazionali (BRT, GLS, SDA) o per DHL domestic.
- Le zone vengono mappate dalla tabella paese-zona del corriere al sistema TMS.

## SUPPLEMENTI (EXTRACHARGES)
I corrieri applicano supplementi come:
- **Fuel Surcharge**: % variabile (aggiornata periodicamente)
- **Remote Area / Extended Area**: Costo fisso per zone disagiate
- **Oversize / Overweight**: Per colli oltre dimensioni/peso standard
- **Residential**: Consegna a privati
- **Saturday/Weekend**: Consegna sabato
- **Insurance**: Assicurazione sul valore
- **COD (Contrassegno)**: Incasso alla consegna
- **Peak Season**: Supplemento stagionale (Q4 tipicamente)
- **Dangerous Goods (ADR/DGR)**: Merci pericolose (dry ice, litio, full DGR)

Ogni supplemento ha: tipo calcolo (costo_fisso, costo_min, costo_max, costo_kg, costo_collo, costo_gg, costo_perc), valore, e condizioni di applicazione.

## SERVIZI FORNITORI
Ogni servizio fornitore (tabella "fnt_serv") ha:
- **Corriere**: DHL, UPS, FedEx, TNT, GLS, BRT, SDA, Poste Italiane, etc.
- **Priorità**: Normale, Prioritario, Economy
- **Tempi consegna**: 0-21 gg + orario (9:00, 10:30, 12:00, 19:00)
- **Area**: Nazionale, CEE, Extra CEE
- **Via**: Aerea, Terra
- **Coefficiente peso/volumetrico**: Default 167 (aereo), 200 (terra), 250, 333, etc.
- **Dimensioni max**: Altezza, lati, lunghezza+circonferenza, peso singolo collo, peso totale
- **Opzioni**: Consegna privati, GDO, al piano, sponda idraulica, contrassegno, temperatura controllata, ADR/DGR, litio, ecc.

## FORMATO TIPICO FILE LISTINO CORRIERE
- **Excel**: Foglio zone (paese→numero zona), foglio prezzi (peso×zona=prezzo), foglio supplementi
- **PDF**: Tabelle con zone, tariffe per fascia peso, lista supplementi
- **CSV**: Colonne: zona, peso_da, peso_a, prezzo (o varianti)

## QUANDO ANALIZZI UN FILE, DEVI:
1. **Identificare il corriere** dal contenuto, loghi, nomenclatura servizi
2. **Classificare il tipo di zone**: ZON o SUB, e mappare paesi→zone
3. **Estrarre fasce peso**: Min, max, step (es: 0.5, 1, 2, 5, 10, 20, 30, 50, 70, 100, 300, 500, 1000, 2000 kg)
4. **Estrarre la tabella prezzi**: Matrice zona×peso→prezzo
5. **Identificare supplementi**: Nome, tipo calcolo, valore, condizioni
6. **Rilevare valuta e unità misura**
7. **Segnalare anomalie**: Gap nelle fasce peso, zone mancanti, prezzi incongruenti, dati duplicati
8. **Proporre il mapping** ai campi del TMS

## COME RISPONDI
- Sempre in **italiano**
- **Preciso e strutturato** — usa sezioni chiare
- **Proattivo** — segnala problemi prima che l'utente li scopra
- Quando proponi dati estratti, usa formato tabellare leggibile
- Indica sempre il **livello di confidenza** (0-100%) per ogni sezione

## CORRIERI PRINCIPALI E LORO PECULIARITÀ
- **DHL Express**: Codici servizio (P=Express, D=Document, Y=Economy, N=12:00, T=9:00), codice globale XML, 163+ nomi servizio
- **UPS**: Distinzione 1 collo vs multi-colli, Account UPS specifici
- **FedEx**: International Priority, Economy, Ground
- **TNT**: Ora acquisita da FedEx, ma listini ancora separati
- **GLS**: Prevalentemente nazionale IT, sub-zone per CAP
- **BRT (Bartolini)**: Nazionale IT, sub-zone per provincia/CAP, bancali
- **SDA (Poste)**: Nazionale IT, sub-zone
- **DPD/GEODIS/DB Schenker**: Groupage, partite, cargo

Rispondi SEMPRE in italiano.`;

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
    systemPrompt || ERNESTO_SYSTEM_PROMPT,
    fileContext ? `\n\nCONTESTO DOCUMENTO ALLEGATO:\n${fileContext}` : '',
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
        max_tokens: 8192,
        system: systemText,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { content: '', error: err?.error?.message || `API error: ${response.status}` };
    }

    const data = await response.json();
    return { content: data.content?.[0]?.text || '' };
  } catch (err) {
    return { content: '', error: err instanceof Error ? err.message : 'Errore di connessione' };
  }
}

export async function analyzeFile(
  fileBase64: string,
  fileName: string,
  carrierHint?: string
): Promise<AIResponse> {
  const prompt = `Analizza questo listino prezzi e produci un report completo.

File: ${fileName}
${carrierHint ? `Corriere indicato dall'utente: ${carrierHint}` : 'Corriere: da identificare dal contenuto'}

Per ogni sezione indica il livello di confidenza (0-100%).

REPORT RICHIESTO:
1. **CORRIERE E SERVIZIO** — Nome corriere, tipo servizio, codici
2. **TIPO ZONE** — ZON o SUB, quante zone trovate, mapping paesi/zone
3. **FASCE DI PESO** — Lista completa fasce (kg), step
4. **TABELLA PREZZI** — Struttura matrice zona×peso, valuta, esempi primi 5 prezzi
5. **SUPPLEMENTI** — Lista con tipo calcolo e valore
6. **ANOMALIE** — Gap, duplicati, dati mancanti
7. **PROPOSTA MAPPING TMS** — Come importare nel TMS (tipo listino, parcel/doc, unità, opzioni)

Contenuto file (base64, primi 50000 caratteri):
${fileBase64.substring(0, 50000)}`;

  return sendToAI([{ role: 'user', content: prompt }]);
}

export { ERNESTO_SYSTEM_PROMPT };
