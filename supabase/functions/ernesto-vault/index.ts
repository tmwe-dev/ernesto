import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { corsHeaders } from "../_shared/cors.ts";

interface VaultRequest {
  action: string;
  provider?: string;
  display_name?: string;
  api_key?: string;
  model_default?: string;
  rate_limit_rpm?: number;
  monthly_budget_usd?: number;
  key_id?: string;
  user_id?: string;
}

interface VaultResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  message?: string;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const vaultEncryptionKey = Deno.env.get("VAULT_ENCRYPTION_KEY") || "";

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

if (!vaultEncryptionKey) {
  throw new Error("Missing VAULT_ENCRYPTION_KEY environment variable");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================================================
// ENCRYPTION / DECRYPTION
// ============================================================================

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const keyBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    passwordKey,
    256
  );

  return crypto.subtle.importKey("raw", keyBits, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

async function encryptKey(plaintext: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const key = await deriveKey(vaultEncryptionKey, salt);

    const encrypted = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      encoder.encode(plaintext)
    );

    // Combine salt + iv + ciphertext
    const combined = new Uint8Array(
      salt.length + iv.length + encrypted.byteLength
    );
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    // Return as base64
    return btoa(String.fromCharCode.apply(null, Array.from(combined) as never));
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt API key");
  }
}

async function decryptKey(encryptedB64: string): Promise<string> {
  try {
    const combined = new Uint8Array(
      atob(encryptedB64)
        .split("")
        .map((c) => c.charCodeAt(0))
    );

    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const ciphertext = combined.slice(28);

    const key = await deriveKey(vaultEncryptionKey, salt);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt API key");
  }
}

// ============================================================================
// VERIFY ADMIN
// ============================================================================

async function verifyAdmin(user_id: string): Promise<boolean> {
  try {
    const { data: profile } = await supabase
      .from("ernesto_profiles")
      .select("role")
      .eq("id", user_id)
      .single();

    return profile && profile.role === "admin";
  } catch {
    return false;
  }
}

// ============================================================================
// SAVE / ROTATE KEY
// ============================================================================

async function handleSaveKey(
  user_id: string,
  provider: string,
  display_name: string,
  api_key: string,
  model_default?: string,
  rate_limit_rpm?: number,
  monthly_budget_usd?: number
): Promise<VaultResponse> {
  try {
    if (!verifyAdmin(user_id)) {
      return {
        success: false,
        error: "Unauthorized: Admin access required",
      };
    }

    if (!provider || !display_name || !api_key) {
      return {
        success: false,
        error: "Provider, display name, and API key are required",
      };
    }

    // Encrypt the key
    const encrypted_key = await encryptKey(api_key);

    // Get last 4 chars for hint
    const key_hint =
      api_key.length > 4
        ? `...${api_key.slice(-4)}`
        : "...****";

    // Deactivate any existing keys for this provider
    await supabase
      .from("ernesto_api_keys")
      .update({ is_active: false })
      .eq("provider", provider)
      .eq("is_active", true);

    // Insert new key
    const { data: savedKey, error } = await supabase
      .from("ernesto_api_keys")
      .insert({
        provider,
        display_name,
        encrypted_key,
        key_hint,
        model_default,
        rate_limit_rpm: rate_limit_rpm || 60,
        monthly_budget_usd: monthly_budget_usd || null,
        created_by: user_id,
      })
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    // Log activity
    await supabase.from("ernesto_activity_log").insert({
      user_id,
      action: "save_api_key",
      details: {
        provider,
        display_name,
      },
    });

    return {
      success: true,
      message: `API key for ${provider} saved successfully`,
      data: {
        key: {
          id: savedKey.id,
          provider: savedKey.provider,
          display_name: savedKey.display_name,
          key_hint: savedKey.key_hint,
          is_active: savedKey.is_active,
          model_default: savedKey.model_default,
          rate_limit_rpm: savedKey.rate_limit_rpm,
          monthly_budget_usd: savedKey.monthly_budget_usd,
          created_at: savedKey.created_at,
        },
      },
    };
  } catch (error) {
    console.error("Save key error:", error);
    return {
      success: false,
      error: "Failed to save API key",
    };
  }
}

// ============================================================================
// LIST KEYS
// ============================================================================

async function handleListKeys(user_id: string): Promise<VaultResponse> {
  try {
    if (!verifyAdmin(user_id)) {
      return {
        success: false,
        error: "Unauthorized: Admin access required",
      };
    }

    const { data: keys, error } = await supabase
      .from("ernesto_api_keys")
      .select(
        "id, provider, display_name, key_hint, is_active, model_default, rate_limit_rpm, monthly_budget_usd, usage_this_month, last_used_at, created_at"
      )
      .order("provider", { ascending: true });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    // Calculate budget remaining
    const keysWithBudget = keys.map((k: Record<string, unknown>) => ({
      ...k,
      budget_remaining:
        k.monthly_budget_usd && k.usage_this_month
          ? Number(k.monthly_budget_usd) - Number(k.usage_this_month)
          : k.monthly_budget_usd,
      budget_percent:
        k.monthly_budget_usd && k.usage_this_month
          ? Math.round(
              (Number(k.usage_this_month) / Number(k.monthly_budget_usd)) * 100
            )
          : 0,
    }));

    return {
      success: true,
      data: {
        keys: keysWithBudget,
      },
    };
  } catch (error) {
    console.error("List keys error:", error);
    return {
      success: false,
      error: "Failed to list API keys",
    };
  }
}

// ============================================================================
// DELETE / DEACTIVATE KEY
// ============================================================================

async function handleDeleteKey(
  user_id: string,
  key_id: string
): Promise<VaultResponse> {
  try {
    if (!verifyAdmin(user_id)) {
      return {
        success: false,
        error: "Unauthorized: Admin access required",
      };
    }

    const { data: deleted, error } = await supabase
      .from("ernesto_api_keys")
      .update({ is_active: false })
      .eq("id", key_id)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    // Log activity
    await supabase.from("ernesto_activity_log").insert({
      user_id,
      action: "delete_api_key",
      details: {
        key_id,
        provider: deleted.provider,
      },
    });

    return {
      success: true,
      message: "API key deactivated",
    };
  } catch (error) {
    console.error("Delete key error:", error);
    return {
      success: false,
      error: "Failed to delete API key",
    };
  }
}

// ============================================================================
// TEST KEY
// ============================================================================

async function handleTestKey(
  user_id: string,
  key_id: string
): Promise<VaultResponse> {
  try {
    if (!verifyAdmin(user_id)) {
      return {
        success: false,
        error: "Unauthorized: Admin access required",
      };
    }

    const { data: keyData, error: fetchError } = await supabase
      .from("ernesto_api_keys")
      .select("*")
      .eq("id", key_id)
      .single();

    if (fetchError || !keyData) {
      return {
        success: false,
        error: "API key not found",
      };
    }

    // Decrypt key
    const plainkey = await decryptKey(keyData.encrypted_key);

    // Make minimal API call to test
    try {
      if (keyData.provider === "anthropic") {
        const response = await fetch(
          "https://api.anthropic.com/v1/models",
          {
            headers: {
              "x-api-key": plainkey,
            },
          }
        );
        const isValid = response.ok;

        return {
          success: isValid,
          message: isValid ? "API key is valid" : "API key test failed",
          data: {
            provider: keyData.provider,
            valid: isValid,
          },
        };
      } else if (keyData.provider === "openai") {
        const response = await fetch(
          "https://api.openai.com/v1/models",
          {
            headers: {
              "Authorization": `Bearer ${plainkey}`,
            },
          }
        );
        const isValid = response.ok;

        return {
          success: isValid,
          message: isValid ? "API key is valid" : "API key test failed",
          data: {
            provider: keyData.provider,
            valid: isValid,
          },
        };
      } else {
        // Generic test
        return {
          success: true,
          message: "Key format validated (specific API test not implemented)",
          data: {
            provider: keyData.provider,
            valid: true,
          },
        };
      }
    } catch (testError) {
      console.error("Key test error:", testError);
      return {
        success: false,
        message: "API key test failed",
        data: {
          provider: keyData.provider,
          valid: false,
        },
      };
    }
  } catch (error) {
    console.error("Test key error:", error);
    return {
      success: false,
      error: "Failed to test API key",
    };
  }
}

// ============================================================================
// GET USAGE STATS
// ============================================================================

async function handleGetUsage(
  user_id: string,
  provider?: string
): Promise<VaultResponse> {
  try {
    if (!verifyAdmin(user_id)) {
      return {
        success: false,
        error: "Unauthorized: Admin access required",
      };
    }

    let query = supabase
      .from("ernesto_api_usage")
      .select("*")
      .gte(
        "created_at",
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      );

    if (provider) {
      query = query.eq("provider", provider);
    }

    const { data: usage, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    // Aggregate stats
    const stats: Record<string, Record<string, unknown>> = {};

    for (const record of usage || []) {
      const key = record.provider;
      if (!stats[key]) {
        stats[key] = {
          provider: record.provider,
          total_calls: 0,
          total_tokens_in: 0,
          total_tokens_out: 0,
          total_cost_usd: 0,
          success_count: 0,
          error_count: 0,
        };
      }

      stats[key].total_calls = (stats[key].total_calls as number) + 1;
      stats[key].total_tokens_in = (stats[key].total_tokens_in as number) + (record.tokens_in || 0);
      stats[key].total_tokens_out = (stats[key].total_tokens_out as number) + (record.tokens_out || 0);
      stats[key].total_cost_usd = (stats[key].total_cost_usd as number) + (record.cost_usd || 0);
      if (record.success) {
        stats[key].success_count = (stats[key].success_count as number) + 1;
      } else {
        stats[key].error_count = (stats[key].error_count as number) + 1;
      }
    }

    return {
      success: true,
      data: {
        usage: Object.values(stats),
      },
    };
  } catch (error) {
    console.error("Get usage error:", error);
    return {
      success: false,
      error: "Failed to retrieve usage stats",
    };
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: Request) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, ...payload } = (await req.json()) as VaultRequest;

    const user_id = payload.user_id || "";

    let response: VaultResponse;

    switch (action) {
      case "save_key":
        response = await handleSaveKey(
          user_id,
          payload.provider || "",
          payload.display_name || "",
          payload.api_key || "",
          payload.model_default,
          payload.rate_limit_rpm,
          payload.monthly_budget_usd
        );
        break;

      case "list_keys":
        response = await handleListKeys(user_id);
        break;

      case "delete_key":
        response = await handleDeleteKey(user_id, payload.key_id || "");
        break;

      case "test_key":
        response = await handleTestKey(user_id, payload.key_id || "");
        break;

      case "get_usage":
        response = await handleGetUsage(user_id, payload.provider);
        break;

      default:
        response = {
          success: false,
          error: "Unknown action",
        };
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: response.success ? 200 : 400,
    });
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
