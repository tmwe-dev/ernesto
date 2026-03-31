// ============================================================================
// ElevenLabs Service — TTS e STT con chiave da DB
// ============================================================================

import { supabase } from './supabaseClient';

export interface ElevenLabsVoice {
  voiceId: string;
  name: string;
  language?: string;
  gender?: string;
  accent?: string;
  previewUrl?: string;
}

// Voci precaricate (disponibili senza API call)
export const PRESET_VOICES: ElevenLabsVoice[] = [
  { voiceId: 'HuK8QKF35exsCh2e7fLT', name: 'Carmelo (IT - Professionale)', language: 'it', gender: 'male', accent: 'standard' },
  { voiceId: 'uScy1bXtKz8vPzfdFsFw', name: 'Antonio (IT - Narratore)', language: 'it', gender: 'male', accent: 'standard' },
  { voiceId: 'CiwzbDpaN3pQXjTgx3ML', name: 'Aida (IT - Conversazionale)', language: 'it', gender: 'female', accent: 'standard' },
  { voiceId: 'ImsA1Fn5TNc843fFdz99', name: 'Davide (IT - Giovane)', language: 'it', gender: 'male', accent: 'standard' },
  { voiceId: '8KInRSd4DtD5L5gK7itu', name: 'Giusy (IT - Conversazionale)', language: 'it', gender: 'female', accent: 'sicilian' },
  { voiceId: 'jHaMmf5SfxgmUrgRYbqt', name: 'Carlo (IT)', language: 'it', gender: 'male' },
  { voiceId: 'cjVigY5qzO86Huf0OWal', name: 'Eric (EN - Smooth)', language: 'en', gender: 'male', accent: 'american' },
  { voiceId: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah (EN - Professional)', language: 'en', gender: 'female', accent: 'american' },
  { voiceId: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel (EN - Broadcaster)', language: 'en', gender: 'male', accent: 'british' },
  { voiceId: 'JBFqnCBsd6RMkjVDRZzb', name: 'George (EN - Storyteller)', language: 'en', gender: 'male', accent: 'british' },
];

async function getElevenLabsKey(): Promise<string | null> {
  const { data } = await supabase
    .from('ernesto_api_keys')
    .select('api_key')
    .eq('provider', 'elevenlabs')
    .eq('is_active', true)
    .limit(1)
    .single();

  return data?.api_key || null;
}

/**
 * Text-to-Speech: converte testo in audio
 */
export async function textToSpeech(
  text: string,
  voiceId: string = 'HuK8QKF35exsCh2e7fLT'
): Promise<{ audioUrl: string | null; error?: string }> {
  const apiKey = await getElevenLabsKey();

  if (!apiKey) {
    return { audioUrl: null, error: 'Nessuna chiave ElevenLabs configurata. Vai su Admin → API Keys.' };
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { audioUrl: null, error: err?.detail?.message || `ElevenLabs error: ${response.status}` };
    }

    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);
    return { audioUrl };
  } catch (err) {
    return { audioUrl: null, error: err instanceof Error ? err.message : 'Errore TTS' };
  }
}

/**
 * Speech-to-Text: usa Web Speech API del browser
 */
export function startSpeechRecognition(
  onResult: (text: string) => void,
  onError: (error: string) => void,
  lang: string = 'it-IT'
): { stop: () => void } | null {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    onError('Speech Recognition non supportato in questo browser');
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = lang;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  recognition.onresult = (event: any) => {
    const text = event.results[0][0].transcript;
    onResult(text);
  };

  recognition.onerror = (event: any) => {
    onError(event.error === 'no-speech' ? 'Nessun audio rilevato' : `Errore: ${event.error}`);
  };

  recognition.start();

  return {
    stop: () => {
      try { recognition.stop(); } catch (_) {}
    },
  };
}

/**
 * Cerca voci da ElevenLabs API
 */
export async function fetchVoices(): Promise<{ voices: ElevenLabsVoice[]; error?: string }> {
  const apiKey = await getElevenLabsKey();

  if (!apiKey) {
    return { voices: PRESET_VOICES };
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': apiKey },
    });

    if (!response.ok) {
      return { voices: PRESET_VOICES, error: 'Impossibile caricare voci da ElevenLabs' };
    }

    const data = await response.json();
    const voices: ElevenLabsVoice[] = (data.voices || []).map((v: any) => ({
      voiceId: v.voice_id,
      name: v.name,
      language: v.labels?.language,
      gender: v.labels?.gender,
      accent: v.labels?.accent,
      previewUrl: v.preview_url,
    }));

    return { voices: voices.length > 0 ? voices : PRESET_VOICES };
  } catch (_) {
    return { voices: PRESET_VOICES };
  }
}
