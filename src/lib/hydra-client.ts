// ══════════════════════════════════════════════════════════════
// ERNESTO → Hydra Memory Client (TypeScript)
// Collega ERNESTO al cervello centrale Hydra via REST API
// Sostituisce gli store locali duplicati
// ══════════════════════════════════════════════════════════════

export interface HydraConfig {
  apiUrl: string;       // Supabase Edge Function URL
  authToken: string;    // Supabase JWT (user session)
}

export interface HydraMemoryItem {
  id: string;
  level: 'L1' | 'L2' | 'L3';
  type: string;
  title: string;
  content: string;
  tags: string[];
  carrier?: string;
  confidence: number;
  usefulness: number;
  relevance: number;
  access_count: number;
  source: string;
  approved: boolean;
  pinned: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface HydraKBRule {
  id: string;
  carrier_code?: string;
  operation_type: string;
  rule_type: string;
  title: string;
  content: string;
  priority: number;
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HydraContext {
  memory_context: string;
  rules_context: string;
  memory_count: number;
  rules_count: number;
}

class HydraAPIClient {
  private config: HydraConfig | null = null;

  configure(config: HydraConfig): void {
    this.config = config;
  }

  updateToken(token: string): void {
    if (this.config) this.config.authToken = token;
  }

  isConfigured(): boolean {
    return !!(this.config?.apiUrl && this.config?.authToken);
  }

  private async call<T = Record<string, unknown>>(
    action: string,
    data: Record<string, unknown> = {}
  ): Promise<T | null> {
    if (!this.config) {
      console.warn('[Hydra] Client not configured');
      return null;
    }

    try {
      const response = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.authToken}`,
        },
        body: JSON.stringify({ action, ...data }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as any).error || `Hydra API error: ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (e) {
      console.error('[Hydra]', action, 'failed:', e instanceof Error ? e.message : e);
      return null;
    }
  }

  // ── Memory ──

  async memorySave(item: {
    type: string;
    title: string;
    content: string;
    tags?: string[];
    carrier?: string;
    confidence?: number;
    source?: string;
  }): Promise<{ success: boolean; item?: { id: string } } | null> {
    return this.call('memory.save', {
      ...item,
      source: item.source || 'ernesto',
    });
  }

  async memorySearch(
    query: string,
    opts?: { carrier?: string; level?: string; limit?: number }
  ): Promise<{ items: HydraMemoryItem[]; count: number } | null> {
    return this.call('memory.search', { query, ...opts });
  }

  async memoryUpdate(
    itemId: string,
    updates: Partial<HydraMemoryItem>
  ): Promise<{ success: boolean } | null> {
    return this.call('memory.update', { item_id: itemId, updates });
  }

  async memoryPromote(
    itemId: string,
    reason?: string
  ): Promise<{ success: boolean; from?: string; to?: string } | null> {
    return this.call('memory.promote', { item_id: itemId, reason });
  }

  async memoryFeedback(
    itemId: string,
    type: 'positive' | 'negative',
    context?: string
  ): Promise<{ success: boolean } | null> {
    return this.call('memory.feedback', { item_id: itemId, feedback_type: type, context });
  }

  // ── Knowledge Base ──

  async kbSave(rule: {
    title: string;
    content: string;
    carrier_code?: string;
    rule_type?: string;
    operation_type?: string;
    priority?: number;
    tags?: string[];
  }): Promise<{ success: boolean; rule?: { id: string } } | null> {
    return this.call('kb.save', { ...rule, source: 'ernesto' });
  }

  async kbSearch(
    query: string,
    carrier?: string,
    limit?: number
  ): Promise<{ rules: HydraKBRule[]; count: number } | null> {
    return this.call('kb.search', { query, carrier, limit });
  }

  async kbUpdate(
    ruleId: string,
    updates: Partial<HydraKBRule>
  ): Promise<{ success: boolean } | null> {
    return this.call('kb.update', { rule_id: ruleId, updates });
  }

  async kbDelete(ruleId: string): Promise<{ success: boolean } | null> {
    return this.call('kb.delete', { rule_id: ruleId });
  }

  // ── Context (RAG) — per arricchire i prompt AI ──

  async getContext(
    query: string,
    carrier?: string,
    maxItems?: number
  ): Promise<HydraContext | null> {
    return this.call('context.get', { query, carrier, max_items: maxItems });
  }

  // ── Health ──

  async health(): Promise<Record<string, unknown> | null> {
    return this.call('health');
  }
}

// Singleton export
export const hydraClient = new HydraAPIClient();
