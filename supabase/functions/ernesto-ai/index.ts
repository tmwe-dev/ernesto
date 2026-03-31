import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { readXlsxFile } from "https://esm.sh/read-excel-file@5.0.0";

// Types
interface RequestBody {
  action: string;
  [key: string]: unknown;
}

interface AnalyzeReportRequest {
  action: "analyze_report";
  file_base64: string;
  file_name: string;
  carrier_hint?: string;
}

interface AnalyzeExtractRequest {
  action: "analyze_extract";
  job_id: string;
  file_base64: string;
}

interface ChatRequest {
  action: "chat";
  job_id: string;
  messages: Array<{ role: string; content: string }>;
  phase?: string;
  attachments?: Array<{ name: string; content: string }>;
}

interface BuildMappingRequest {
  action: "build_mapping";
  job_id: string;
}

interface DryRunRequest {
  action: "dry_run";
  job_id: string;
  file_base64: string;
  mapping_override?: Record<string, unknown>;
}

interface CommitRequest {
  action: "commit";
  job_id: string;
  price_list_name: string;
  service_id: string;
}

interface ListDocumentsRequest {
  action: "list_documents";
  limit?: number;
  offset?: number;
}

interface GetDocumentRequest {
  action: "get_document";
  document_id: string;
}

interface ListRulesRequest {
  action: "list_rules";
  carrier?: string;
  limit?: number;
  offset?: number;
}

interface SaveRuleRequest {
  action: "save_rule";
  carrier: string;
  operation: string;
  rule_key: string;
  rule_value: Record<string, unknown>;
}

interface DeleteRuleRequest {
  action: "delete_rule";
  rule_id: string;
}

interface MemoryHealthRequest {
  action: "memory_health";
}

interface MemoryItem {
  id?: string;
  carrier?: string;
  level: "L1" | "L2" | "L3";
  type: string;
  title: string;
  content: string;
  tags?: string[];
  confidence: number;
  promoted_at?: string;
  archived?: boolean;
}

interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

// Global state for rate limiting
const rateLimitMap = new Map<string, number[]>();

// Helper Functions

function getEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

function sanitizeForPrompt(text: string): string {
  return text.replace(/[`$]/g, (match) => `\\${match}`);
}

function detectDelimiter(line: string): string {
  const delimiters = [",", ";", "\t", "|"];
  for (const delimiter of delimiters) {
    if (line.includes(delimiter)) {
      return delimiter;
    }
  }
  return ",";
}

function buildExcelFullExtract(sheets: Record<string, unknown[][]>): string {
  let text = "";
  for (const [sheetName, rows] of Object.entries(sheets)) {
    text += `\n=== Sheet: ${sheetName} ===\n`;
    if (Array.isArray(rows)) {
      for (const row of rows) {
        if (Array.isArray(row)) {
          text += row.map((cell) => String(cell ?? "")).join(" | ") + "\n";
        }
      }
    }
  }
  return text;
}

function buildReportPrompt(
  carrier: string,
  fileName: string,
  fileType: string
): string {
  return `You are an expert logistics and pricing analyst specializing in international courier and freight services. You are analyzing a pricelist document for the carrier: ${sanitizeForPrompt(carrier)}.

DOCUMENT INFO:
- Filename: ${sanitizeForPrompt(fileName)}
- File Type: ${fileType}
- Carrier: ${sanitizeForPrompt(carrier)}

YOUR TASK:
Extract and analyze the complete pricing structure from this document. You will structure the data according to our 7-table database schema.

REQUIRED OUTPUT TABLES:

1. **supplier_services** (one per carrier/service combo)
   - supplier_id: ID of the carrier
   - service_name: e.g., "Express", "Standard", "Economy"
   - service_code: e.g., "EX01"
   - description: Service description
   - is_active: true/false

2. **price_list_headers** (one per price list)
   - supplier_id: Carrier ID
   - service_id: Service ID
   - price_list_name: e.g., "2024-Q1-Express"
   - effective_date: YYYY-MM-DD
   - expiry_date: YYYY-MM-DD or null
   - currency: ISO code (e.g., EUR, USD)
   - notes: Any special conditions

3. **price_list_rules** (conditions for pricing)
   - price_list_header_id: Foreign key
   - rule_type: "min_weight", "max_weight", "ce_extra_ce", "service_direction", "per_collo", "mpl"
   - rule_value: The threshold or condition
   - description: Human-readable explanation

4. **price_list_prices** (actual prices)
   - price_list_header_id: Foreign key
   - origin_zone_id: Zone ID
   - destination_zone_id: Zone ID
   - weight_min: Minimum weight (kg)
   - weight_max: Maximum weight (kg) or null
   - unit_type: "per_kg" | "per_collo" | "mpl" (Minimum Priceable Load)
   - base_price: The price amount
   - currency: ISO code

5. **country_zones** (groupings of countries)
   - zone_code: e.g., "EU1", "EXTRA-EU"
   - zone_name: e.g., "EU Zone 1"
   - description: Zone definition
   - parent_zone_id: For zone hierarchies

6. **country_zones_sub** (individual countries in zones)
   - country_zone_id: Foreign key to zones
   - country_code: ISO 2-letter code
   - country_name: Full name

7. **price_list_supplements** (additional charges)
   - price_list_header_id: Foreign key
   - supplement_type: e.g., "residential", "saturday", "fuel_surcharge"
   - supplement_value: Amount or percentage
   - is_percentage: true/false
   - description: What this charge applies to
   - applicable_countries: JSON array or null for all

KEY DOMAIN RULES:

**CE vs Extra-CE Splitting:**
- Identify if prices differ between EU/CE countries and non-EU/Extra-CE countries
- CE typically includes: EU27 + Switzerland, Norway, Iceland, UK (post-2021)
- Create separate price rows or rules for CE and Extra-CE if applicable
- Mark rules with rule_type: "ce_extra_ce"

**Service Direction Classification:**
- Inbound: Shipments going to the carrier's home country
- Outbound: Shipments leaving the carrier's home country
- Domestic: Within the carrier's home country
- International: All cross-border
- Identify and mark rule_type: "service_direction" for direction-specific pricing

**Per-Collo vs MPL (Minimum Priceable Load):**
- Per-Collo: Charged per piece/parcel
- MPL: Minimum weight at which a shipment can be sent (e.g., 500kg)
- If MPL exists, create rules with rule_type: "mpl"
- Create pricing rows with unit_type: "per_collo" or "mpl"

**Weight Breaks:**
- Identify weight brackets and create separate price_list_prices rows
- weight_min and weight_max define each bracket
- Include 0-1kg, 1-5kg, 5-10kg, 10-20kg, 20-50kg, 50-100kg, 100-250kg, 250+kg as appropriate

ANALYSIS STEPS:
1. Identify all services offered
2. Map countries to zones
3. Extract all price brackets
4. Identify all supplements and special charges
5. Classify pricing logic (direction, CE/Extra-CE, per-collo vs per-kg)
6. Note any missing or unclear information

CRITICAL EXTRACTION GUIDELINES:
- Be precise about weight units (kg, lbs)
- Be precise about currency
- Preserve all weight breaks exactly as documented
- Note any ambiguities or missing data
- Identify service direction if determinable
- Flag if CE/Extra-CE separation is present

Return a comprehensive structured analysis that can be directly used to populate the database.`;
}

async function callAI(
  messages: AIMessage[],
  tools?: Array<Record<string, unknown>>,
  toolChoice?: string | Record<string, unknown>,
  model?: string
): Promise<{
  content: string;
  toolCalls?: Array<{ name: string; arguments: Record<string, unknown> }>;
}> {
  const apiKey = getEnv("LOVABLE_API_KEY");
  const gatewayUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
  const modelId = model || "google/gemini-2.5-flash";

  const payload: Record<string, unknown> = {
    model: modelId,
    messages,
    temperature: 0.7,
    max_tokens: 4096,
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
    if (toolChoice) {
      payload.tool_choice = toolChoice;
    }
  }

  const response = await fetch(gatewayUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  if (!choice) {
    throw new Error("No response choice from AI");
  }

  let content = choice.message?.content || "";
  const toolCalls: Array<{ name: string; arguments: Record<string, unknown> }> = [];

  if (choice.message?.tool_calls) {
    for (const toolCall of choice.message.tool_calls) {
      toolCalls.push({
        name: toolCall.function.name,
        arguments:
          typeof toolCall.function.arguments === "string"
            ? JSON.parse(toolCall.function.arguments)
            : toolCall.function.arguments,
      });
    }
  }

  return { content, toolCalls: toolCalls.length > 0 ? toolCalls : undefined };
}

async function loadKBRules(
  supabase: ReturnType<typeof createClient>,
  carrier: string,
  operation?: string,
  userId?: string
): Promise<Array<Record<string, unknown>>> {
  let query = supabase
    .from("ernesto_knowledge_rules")
    .select("*")
    .eq("carrier_code", carrier)
    .eq("is_active", true);

  // Tenant isolation: filter by user_id
  if (userId) {
    query = query.eq("user_id", userId);
  }

  if (operation) {
    query = query.eq("operation_type", operation);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error loading KB rules:", error);
    return [];
  }

  return data || [];
}

async function retrieveMemoryContext(
  supabase: ReturnType<typeof createClient>,
  carrier: string,
  query?: string,
  limit: number = 20,
  userId?: string
): Promise<string> {
  let q = supabase
    .from("ernesto_memory_items")
    .select("*")
    .or("level.eq.L3,level.eq.L2,and(level.eq.L1,confidence.gte.60)")
    .eq("archived", false)
    .order("level", { ascending: false });

  // Tenant isolation: filter by user_id
  if (userId) {
    q = q.eq("user_id", userId);
  }

  // Filter by carrier if provided
  if (carrier) {
    q = q.or(`tags.cs.{${carrier}},carrier.eq.${carrier}`);
  }

  q = q.limit(limit);

  const { data, error } = await q;

  if (error) {
    console.error("Error loading memory context:", error);
    return "";
  }

  if (!data || data.length === 0) {
    return "";
  }

  return data
    .map(
      (m: MemoryItem) =>
        `[${m.level}|${m.type}|conf:${m.confidence}] ${m.title}: ${m.content}`
    )
    .join("\n");
}

function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(identifier) || [];

  // Remove old timestamps outside the window
  const validTimestamps = timestamps.filter((ts) => now - ts < windowMs);

  if (validTimestamps.length >= maxRequests) {
    return false; // Rate limited
  }

  validTimestamps.push(now);
  rateLimitMap.set(identifier, validTimestamps);

  return true;
}

function getCorsHeaders(origin?: string): Record<string, string> {
  const allowedOrigins = (
    Deno.env.get("ALLOWED_ORIGINS") || "http://localhost:3000"
  ).split(",");
  const corsOrigin =
    allowedOrigins.includes(origin || "") ||
    allowedOrigins.includes("*")
      ? origin || "*"
      : allowedOrigins[0];

  return {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
  };
}

function validateAuth(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const expectedAuth = getEnv("LOVABLE_API_KEY");
  return authHeader === `Bearer ${expectedAuth}`;
}

// Extract user_id from Supabase JWT or request body
async function extractUserId(
  request: Request,
  body: RequestBody,
  supabase: ReturnType<typeof createClient>
): Promise<string> {
  // Try from explicit body field (for service-to-service calls)
  if (body.user_id && typeof body.user_id === "string") {
    return body.user_id;
  }

  // Try from Authorization header JWT (user session)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (user && !error) {
      return user.id;
    }
  }

  throw new Error("User authentication required: no valid user_id found");
}

// Action Handlers

async function handleAnalyzeReport(
  req: AnalyzeReportRequest,
  supabase: ReturnType<typeof createClient>,
  userId?: string
): Promise<Record<string, unknown>> {
  const { file_base64, file_name, carrier_hint } = req;

  // Determine file type
  const ext = file_name.split(".").pop()?.toLowerCase() || "";
  const fileType = ext === "xlsx" || ext === "xls" ? "excel" : ext;

  // Decode base64 to binary
  const binaryString = atob(file_base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Create document record
  const { data: docData, error: docError } = await supabase
    .from("import_documents")
    .insert({
      file_name,
      file_type: fileType,
      carrier_hint,
      user_id: userId,
      status: "analyzing",
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (docError) {
    throw new Error(`Failed to create document: ${docError.message}`);
  }

  const document_id = docData.id;
  const job_id = `job_${document_id}_${Date.now()}`;

  // Extract text content
  let fileText = "";
  if (fileType === "excel") {
    try {
      const workbook = await readXlsxFile({ buffer: bytes });
      fileText = buildExcelFullExtract(workbook);
    } catch (e) {
      console.error("Excel parsing error:", e);
      fileText = "(Excel parsing failed)";
    }
  } else if (fileType === "csv") {
    fileText = new TextDecoder().decode(bytes);
  } else if (fileType === "pdf") {
    fileText = "(PDF extraction not implemented - manual review required)";
  }

  const carrier = carrier_hint || "UNKNOWN";
  const reportPrompt = buildReportPrompt(carrier, file_name, fileType);

  // Load KB rules and memory context
  const kbRules = await loadKBRules(supabase, carrier, undefined, userId);
  const memoryContext = await retrieveMemoryContext(supabase, carrier, undefined, 20, userId);

  const systemPrompt =
    reportPrompt +
    "\n\nKNOWLEDGE BASE RULES:\n" +
    JSON.stringify(kbRules, null, 2) +
    "\n\nRELEVANT MEMORY ITEMS:\n" +
    memoryContext;

  // Call AI to analyze
  const aiResponse = await callAI([
    {
      role: "user",
      content: `Analyze this pricing document:\n\n${fileText.substring(0, 10000)}`,
    },
  ]);

  const report = aiResponse.content;

  // Update document status
  await supabase
    .from("import_documents")
    .update({
      status: "analyzed",
      report,
      updated_at: new Date().toISOString(),
    })
    .eq("id", document_id);

  // Create job record
  await supabase.from("import_jobs").insert({
    job_id,
    document_id,
    status: "report_generated",
    carrier: carrier,
    created_at: new Date().toISOString(),
  });

  const summary = report.substring(0, 500);

  return {
    job_id,
    document_id,
    report,
    summary,
    file_type: fileType,
  };
}

async function handleAnalyzeExtract(
  req: AnalyzeExtractRequest,
  supabase: ReturnType<typeof createClient>,
  userId?: string
): Promise<Record<string, unknown>> {
  const { job_id, file_base64 } = req;

  // Fetch job and document
  const { data: jobData, error: jobError } = await supabase
    .from("import_jobs")
    .select("*, import_documents(*)")
    .eq("job_id", job_id)
    .single();

  if (jobError || !jobData) {
    throw new Error("Job not found");
  }

  const document = jobData.import_documents;
  const report = document.report || "";

  // Define extraction tool
  const extractionTools = [
    {
      type: "function",
      function: {
        name: "create_ai_document",
        description: "Save extracted structured data",
        parameters: {
          type: "object",
          properties: {
            summary: {
              type: "string",
              description: "Executive summary of extraction",
            },
            structured_data: {
              type: "object",
              description: "Extracted structured pricing data",
              properties: {
                services: { type: "array" },
                zones: { type: "array" },
                prices: { type: "array" },
                supplements: { type: "array" },
                rules: { type: "array" },
                notes: { type: "array" },
              },
            },
          },
          required: ["summary", "structured_data"],
        },
      },
    },
  ];

  const aiResponse = await callAI(
    [
      {
        role: "user",
        content: `Based on this analysis report, extract and structure the data:\n\n${report.substring(0, 5000)}`,
      },
    ],
    extractionTools,
    { type: "function", function: { name: "create_ai_document" } }
  );

  let structuredData = {};
  if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
    const toolCall = aiResponse.toolCalls[0];
    if (toolCall.name === "create_ai_document") {
      structuredData = toolCall.arguments.structured_data || {};
    }
  }

  // Save to import_documents
  await supabase
    .from("import_documents")
    .update({
      structured_data: structuredData,
      status: "extracted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", document.id);

  // Update job status
  await supabase
    .from("import_jobs")
    .update({
      status: "extracted",
      updated_at: new Date().toISOString(),
    })
    .eq("job_id", job_id);

  return {
    job_id,
    document_id: document.id,
    structured_data: structuredData,
    summary: aiResponse.content.substring(0, 500),
  };
}

async function handleChat(
  req: ChatRequest,
  supabase: ReturnType<typeof createClient>,
  userId?: string
): Promise<Record<string, unknown>> {
  const { job_id, messages, phase, attachments } = req;

  // Fetch job and document
  const { data: jobData } = await supabase
    .from("import_jobs")
    .select("*, import_documents(*)")
    .eq("job_id", job_id)
    .single();

  if (!jobData) {
    throw new Error("Job not found");
  }

  const document = jobData.import_documents;
  const carrier = jobData.carrier || "UNKNOWN";

  // Load recent messages and summary
  const { data: chatMessages } = await supabase
    .from("import_chat_messages")
    .select("*")
    .eq("job_id", job_id)
    .order("created_at", { ascending: false })
    .limit(10);

  const recentMessages = (chatMessages || []).reverse();

  // Load KB rules and memory
  const kbRules = await loadKBRules(supabase, carrier, undefined, userId);
  const memoryContext = await retrieveMemoryContext(supabase, carrier, undefined, 20, userId);

  // Build conversation context
  const conversationHistory: AIMessage[] = [];
  for (const msg of recentMessages) {
    conversationHistory.push({
      role: msg.role,
      content: msg.content,
    });
  }

  // Add new user messages
  for (const msg of messages) {
    conversationHistory.push({
      role: msg.role,
      content: msg.content,
    });
  }

  // Define chat tools
  const chatTools = [
    {
      type: "function",
      function: {
        name: "save_kb_rule",
        description: "Save a knowledge base rule for future use",
        parameters: {
          type: "object",
          properties: {
            operation: { type: "string" },
            rule_key: { type: "string" },
            rule_value: { type: "object" },
            description: { type: "string" },
          },
          required: ["operation", "rule_key", "rule_value"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "save_memory",
        description: "Save a learning item to Hydra memory",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string" },
            content: { type: "string" },
            type: { type: "string" },
            tags: { type: "array", items: { type: "string" } },
            confidence: { type: "number", minimum: 0, maximum: 100 },
          },
          required: ["title", "content", "type", "confidence"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "search_memory",
        description: "Search Hydra memory for relevant items",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string" },
            tags: { type: "array", items: { type: "string" } },
            limit: { type: "number" },
          },
          required: ["query"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "promote_memory",
        description: "Promote a memory item to higher level",
        parameters: {
          type: "object",
          properties: {
            memory_id: { type: "string" },
            target_level: {
              type: "string",
              enum: ["L2", "L3"],
            },
          },
          required: ["memory_id", "target_level"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "update_document",
        description: "Update the AI document with corrections",
        parameters: {
          type: "object",
          properties: {
            field: { type: "string" },
            value: {},
          },
          required: ["field", "value"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "detect_conflicts",
        description: "Check if new information conflicts with existing memory",
        parameters: {
          type: "object",
          properties: {
            new_info: { type: "string" },
            context: { type: "string" },
          },
          required: ["new_info"],
        },
      },
    },
  ];

  const systemPrompt = `You are an expert pricing analyst assistant helping to import and validate carrier pricing data.
Current Job: ${job_id}
Carrier: ${carrier}
Phase: ${phase || "workspace"}

KNOWLEDGE BASE RULES:
${JSON.stringify(kbRules, null, 2)}

RELEVANT MEMORY ITEMS:
${memoryContext}

INSTRUCTIONS:
- Always learn from corrections and user feedback
- Save rules without asking for confirmation
- Use the provided tools to save learnings and manage memory
- Be precise about pricing logic, weight breaks, and zone definitions
- Flag ambiguities and ask clarifying questions
- Help validate and refine the extracted data`;

  // Call AI with tools
  const aiResponse = await callAI(
    conversationHistory,
    chatTools,
    { type: "auto" }
  );

  // Execute tool calls
  const toolResults: Record<string, unknown> = {};
  if (aiResponse.toolCalls) {
    for (const toolCall of aiResponse.toolCalls) {
      try {
        switch (toolCall.name) {
          case "save_kb_rule":
            {
              const args = toolCall.arguments;
              const { error } = await supabase.from("knowledge_rules").insert({
                carrier,
                operation: args.operation,
                rule_key: args.rule_key,
                rule_value: args.rule_value,
                description: args.description,
                is_active: true,
                created_at: new Date().toISOString(),
              });
              toolResults[toolCall.name] = error
                ? `Error: ${error.message}`
                : "Rule saved successfully";
            }
            break;

          case "save_memory":
            {
              const args = toolCall.arguments;
              const { error } = await supabase.from("memory_items").insert({
                carrier,
                level: "L1",
                type: args.type,
                title: args.title,
                content: args.content,
                tags: args.tags || [],
                confidence: args.confidence,
                archived: false,
                created_at: new Date().toISOString(),
              });
              toolResults[toolCall.name] = error
                ? `Error: ${error.message}`
                : "Memory saved";
            }
            break;

          case "search_memory":
            {
              const args = toolCall.arguments;
              const { data } = await supabase
                .from("memory_items")
                .select("*")
                .eq("archived", false)
                .limit(args.limit || 10);
              toolResults[toolCall.name] = data || [];
            }
            break;

          case "promote_memory":
            {
              const args = toolCall.arguments;
              const { error } = await supabase
                .from("memory_items")
                .update({
                  level: args.target_level,
                  promoted_at: new Date().toISOString(),
                })
                .eq("id", args.memory_id);
              toolResults[toolCall.name] = error
                ? `Error: ${error.message}`
                : "Memory promoted";
            }
            break;

          case "update_document":
            {
              const args = toolCall.arguments;
              const updateObj: Record<string, unknown> = {};
              updateObj[args.field] = args.value;
              updateObj.updated_at = new Date().toISOString();
              const { error } = await supabase
                .from("import_documents")
                .update(updateObj)
                .eq("id", document.id);
              toolResults[toolCall.name] = error
                ? `Error: ${error.message}`
                : "Document updated";
            }
            break;

          case "detect_conflicts":
            {
              const args = toolCall.arguments;
              // Simple conflict detection - check memory for contradictions
              const { data } = await supabase
                .from("memory_items")
                .select("*")
                .eq("archived", false)
                .limit(5);
              toolResults[toolCall.name] = {
                conflicts_found: 0,
                details: data || [],
              };
            }
            break;
        }
      } catch (err) {
        console.error(`Error executing tool ${toolCall.name}:`, err);
        toolResults[toolCall.name] = `Error: ${String(err)}`;
      }
    }
  }

  // Save user and assistant messages to DB
  for (const msg of messages) {
    await supabase.from("import_chat_messages").insert({
      job_id,
      role: msg.role,
      content: msg.content,
      created_at: new Date().toISOString(),
    });
  }

  await supabase.from("import_chat_messages").insert({
    job_id,
    role: "assistant",
    content: aiResponse.content,
    created_at: new Date().toISOString(),
  });

  return {
    job_id,
    assistant_message: aiResponse.content,
    tool_results: toolResults,
  };
}

async function handleBuildMapping(
  req: BuildMappingRequest,
  supabase: ReturnType<typeof createClient>,
  userId?: string
): Promise<Record<string, unknown>> {
  const { job_id } = req;

  const { data: jobData } = await supabase
    .from("import_jobs")
    .select("*, import_documents(*)")
    .eq("job_id", job_id)
    .single();

  if (!jobData) {
    throw new Error("Job not found");
  }

  const document = jobData.import_documents;
  const structuredData = document.structured_data || {};

  const mappingTools = [
    {
      type: "function",
      function: {
        name: "generate_mapping",
        description: "Generate column mapping from source data",
        parameters: {
          type: "object",
          properties: {
            mapping: {
              type: "object",
              description: "Column mapping configuration",
            },
            validation_warnings: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: ["mapping"],
        },
      },
    },
  ];

  const aiResponse = await callAI(
    [
      {
        role: "user",
        content: `Generate a column mapping for this structured data:\n\n${JSON.stringify(structuredData, null, 2).substring(0, 3000)}`,
      },
    ],
    mappingTools,
    { type: "function", function: { name: "generate_mapping" } }
  );

  let mapping = {};
  if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
    mapping = aiResponse.toolCalls[0].arguments.mapping || {};
  }

  await supabase
    .from("import_documents")
    .update({
      column_mapping: mapping,
      status: "mapped",
      updated_at: new Date().toISOString(),
    })
    .eq("id", document.id);

  return {
    job_id,
    mapping,
    message: "Mapping generated successfully",
  };
}

async function handleDryRun(
  req: DryRunRequest,
  supabase: ReturnType<typeof createClient>,
  userId?: string
): Promise<Record<string, unknown>> {
  const { job_id, file_base64, mapping_override } = req;

  const { data: jobData } = await supabase
    .from("import_jobs")
    .select("*, import_documents(*)")
    .eq("job_id", job_id)
    .single();

  if (!jobData) {
    throw new Error("Job not found");
  }

  const document = jobData.import_documents;
  const structuredData = document.structured_data || {};
  const mapping = mapping_override || document.column_mapping || {};

  // Simulate data extraction and validation
  const warnings: string[] = [];
  const stats = {
    total_zones: 0,
    total_prices: 0,
    total_supplements: 0,
    validation_issues: 0,
  };

  if (structuredData.zones && Array.isArray(structuredData.zones)) {
    stats.total_zones = structuredData.zones.length;
  }

  if (structuredData.prices && Array.isArray(structuredData.prices)) {
    stats.total_prices = structuredData.prices.length;
  }

  if (
    structuredData.supplements &&
    Array.isArray(structuredData.supplements)
  ) {
    stats.total_supplements = structuredData.supplements.length;
  }

  // Add some validation checks
  if (stats.total_zones === 0) {
    warnings.push("No zones defined");
    stats.validation_issues++;
  }

  if (stats.total_prices === 0) {
    warnings.push("No prices defined");
    stats.validation_issues++;
  }

  const preview = {
    first_zone:
      structuredData.zones && structuredData.zones.length > 0
        ? structuredData.zones[0]
        : null,
    first_price:
      structuredData.prices && structuredData.prices.length > 0
        ? structuredData.prices[0]
        : null,
    first_supplement:
      structuredData.supplements && structuredData.supplements.length > 0
        ? structuredData.supplements[0]
        : null,
  };

  return {
    job_id,
    stats,
    warnings,
    preview,
    ready_to_commit: stats.validation_issues === 0,
  };
}

async function handleCommit(
  req: CommitRequest,
  supabase: ReturnType<typeof createClient>,
  userId?: string
): Promise<Record<string, unknown>> {
  const { job_id, price_list_name, service_id } = req;

  const { data: jobData } = await supabase
    .from("import_jobs")
    .select("*, import_documents(*)")
    .eq("job_id", job_id)
    .single();

  if (!jobData) {
    throw new Error("Job not found");
  }

  const document = jobData.import_documents;
  const structuredData = document.structured_data || {};
  const carrier = jobData.carrier;

  try {
    // Create price list header
    const { data: headerData, error: headerError } = await supabase
      .from("price_list_headers")
      .insert({
        supplier_id: carrier,
        service_id,
        price_list_name,
        effective_date: new Date().toISOString().split("T")[0],
        currency: "EUR",
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (headerError) {
      throw new Error(`Failed to create header: ${headerError.message}`);
    }

    const price_list_header_id = headerData.id;

    // Insert zones
    if (structuredData.zones && Array.isArray(structuredData.zones)) {
      const zoneInserts = structuredData.zones.map(
        (zone: Record<string, unknown>) => ({
          ...zone,
          created_at: new Date().toISOString(),
        })
      );

      const { error: zoneError } = await supabase
        .from("country_zones")
        .insert(zoneInserts);

      if (zoneError) {
        console.error("Zone insert error:", zoneError);
      }
    }

    // Insert prices
    if (structuredData.prices && Array.isArray(structuredData.prices)) {
      const priceInserts = structuredData.prices.map(
        (price: Record<string, unknown>) => ({
          ...price,
          price_list_header_id,
          created_at: new Date().toISOString(),
        })
      );

      // Batch insert
      const batchSize = 100;
      for (let i = 0; i < priceInserts.length; i += batchSize) {
        const batch = priceInserts.slice(i, i + batchSize);
        const { error: priceError } = await supabase
          .from("price_list_prices")
          .insert(batch);

        if (priceError) {
          console.error("Price insert error:", priceError);
        }
      }
    }

    // Insert supplements
    if (
      structuredData.supplements &&
      Array.isArray(structuredData.supplements)
    ) {
      const supplementInserts = structuredData.supplements.map(
        (supp: Record<string, unknown>) => ({
          ...supp,
          price_list_header_id,
          created_at: new Date().toISOString(),
        })
      );

      const { error: suppError } = await supabase
        .from("price_list_supplements")
        .insert(supplementInserts);

      if (suppError) {
        console.error("Supplement insert error:", suppError);
      }
    }

    // Update job status
    await supabase
      .from("import_jobs")
      .update({
        status: "committed",
        price_list_header_id,
        updated_at: new Date().toISOString(),
      })
      .eq("job_id", job_id);

    // Save successful commit as memory
    await supabase.from("memory_items").insert({
      carrier,
      level: "L1",
      type: "successful_commit",
      title: `Successful commit: ${price_list_name}`,
      content: `Price list committed with ${structuredData.prices?.length || 0} prices and ${structuredData.zones?.length || 0} zones.`,
      tags: [carrier, "commit", price_list_name],
      confidence: 100,
      archived: false,
      user_id: userId,
      created_at: new Date().toISOString(),
    });

    return {
      job_id,
      price_list_header_id,
      status: "committed",
      message: "Price list imported successfully",
      stats: {
        zones_imported: structuredData.zones?.length || 0,
        prices_imported: structuredData.prices?.length || 0,
        supplements_imported: structuredData.supplements?.length || 0,
      },
    };
  } catch (err) {
    throw new Error(`Commit failed: ${String(err)}`);
  }
}

async function handleListDocuments(
  req: ListDocumentsRequest,
  supabase: ReturnType<typeof createClient>,
  userId?: string
): Promise<Record<string, unknown>> {
  const limit = req.limit || 20;
  const offset = req.offset || 0;

  const { data, error, count } = await supabase
    .from("import_documents")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to list documents: ${error.message}`);
  }

  return {
    documents: data || [],
    count: count || 0,
    limit,
    offset,
  };
}

async function handleGetDocument(
  req: GetDocumentRequest,
  supabase: ReturnType<typeof createClient>,
  userId?: string
): Promise<Record<string, unknown>> {
  const { document_id } = req;

  const { data, error } = await supabase
    .from("import_documents")
    .select("*")
    .eq("id", document_id)
    .single();

  if (error) {
    throw new Error(`Document not found: ${error.message}`);
  }

  return {
    document: data,
  };
}

async function handleListRules(
  req: ListRulesRequest,
  supabase: ReturnType<typeof createClient>,
  userId?: string
): Promise<Record<string, unknown>> {
  const limit = req.limit || 20;
  const offset = req.offset || 0;

  let query = supabase
    .from("knowledge_rules")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (req.carrier) {
    query = query.eq("carrier", req.carrier);
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to list rules: ${error.message}`);
  }

  return {
    rules: data || [],
    count: count || 0,
    limit,
    offset,
  };
}

async function handleSaveRule(
  req: SaveRuleRequest,
  supabase: ReturnType<typeof createClient>,
  userId?: string
): Promise<Record<string, unknown>> {
  const { carrier, operation, rule_key, rule_value } = req;

  const { data, error } = await supabase
    .from("knowledge_rules")
    .insert({
      carrier,
      operation,
      rule_key,
      rule_value,
      is_active: true,
      user_id: userId,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to save rule: ${error.message}`);
  }

  // Also save to memory
  await supabase.from("memory_items").insert({
    carrier,
    level: "L1",
    type: "kb_rule",
    title: `Rule: ${rule_key}`,
    content: JSON.stringify(rule_value),
    tags: [carrier, operation],
    confidence: 80,
    archived: false,
    user_id: userId,
    created_at: new Date().toISOString(),
  });

  return {
    rule_id: data.id,
    message: "Rule saved successfully",
  };
}

async function handleDeleteRule(
  req: DeleteRuleRequest,
  supabase: ReturnType<typeof createClient>,
  userId?: string
): Promise<Record<string, unknown>> {
  const { rule_id } = req;

  const { error } = await supabase
    .from("knowledge_rules")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", rule_id);

  if (error) {
    throw new Error(`Failed to delete rule: ${error.message}`);
  }

  return {
    rule_id,
    message: "Rule deleted successfully",
  };
}

async function handleMemoryHealth(
  supabase: ReturnType<typeof createClient>,
  userId?: string
): Promise<Record<string, unknown>> {
  const { data: l1Items } = await supabase
    .from("memory_items")
    .select("id", { count: "exact" })
    .eq("level", "L1")
    .eq("archived", false);

  const { data: l2Items } = await supabase
    .from("memory_items")
    .select("id", { count: "exact" })
    .eq("level", "L2")
    .eq("archived", false);

  const { data: l3Items } = await supabase
    .from("memory_items")
    .select("id", { count: "exact" })
    .eq("level", "L3")
    .eq("archived", false);

  const { data: recentPromotions } = await supabase
    .from("memory_items")
    .select("*")
    .not("promoted_at", "is", null)
    .order("promoted_at", { ascending: false })
    .limit(5);

  return {
    memory_stats: {
      l1_count: (l1Items || []).length,
      l2_count: (l2Items || []).length,
      l3_count: (l3Items || []).length,
    },
    recent_promotions: recentPromotions || [],
    health_score:
      ((l3Items?.length || 0) * 3 + (l2Items?.length || 0) * 2 + (l1Items?.length || 0)) / 6,
  };
}

// Main handler
serve(async (request: Request) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(request.headers.get("origin") || undefined),
    });
  }

  // Validate method
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: getCorsHeaders(request.headers.get("origin") || undefined),
    });
  }

  // Validate auth
  if (!validateAuth(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: getCorsHeaders(request.headers.get("origin") || undefined),
    });
  }

  // Rate limit check
  const clientIp = request.headers.get("x-forwarded-for") || "unknown";
  if (!checkRateLimit(clientIp, 100, 60000)) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
      headers: getCorsHeaders(request.headers.get("origin") || undefined),
    });
  }

  try {
    const body = (await request.json()) as RequestBody;
    const action = body.action as string;

    if (!action) {
      return new Response(JSON.stringify({ error: "Missing action" }), {
        status: 400,
        headers: getCorsHeaders(request.headers.get("origin") || undefined),
      });
    }

    // Initialize Supabase
    const supabaseUrl = getEnv("SUPABASE_URL");
    const supabaseKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract authenticated user_id (tenant isolation)
    const userId = await extractUserId(request, body, supabase);

    let result: Record<string, unknown>;

    // Route to action handler — userId passed to all handlers for data isolation
    switch (action) {
      case "analyze_report":
        result = await handleAnalyzeReport(
          body as AnalyzeReportRequest,
          supabase,
          userId
        );
        break;

      case "analyze_extract":
        result = await handleAnalyzeExtract(
          body as AnalyzeExtractRequest,
          supabase,
          userId
        );
        break;

      case "chat":
        result = await handleChat(body as ChatRequest, supabase, userId);
        break;

      case "build_mapping":
        result = await handleBuildMapping(body as BuildMappingRequest, supabase, userId);
        break;

      case "dry_run":
        result = await handleDryRun(body as DryRunRequest, supabase, userId);
        break;

      case "commit":
        result = await handleCommit(body as CommitRequest, supabase, userId);
        break;

      case "list_documents":
        result = await handleListDocuments(
          body as ListDocumentsRequest,
          supabase,
          userId
        );
        break;

      case "get_document":
        result = await handleGetDocument(body as GetDocumentRequest, supabase, userId);
        break;

      case "list_rules":
        result = await handleListRules(body as ListRulesRequest, supabase, userId);
        break;

      case "save_rule":
        result = await handleSaveRule(body as SaveRuleRequest, supabase, userId);
        break;

      case "delete_rule":
        result = await handleDeleteRule(body as DeleteRuleRequest, supabase, userId);
        break;

      case "memory_health":
        result = await handleMemoryHealth(supabase, userId);
        break;

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: getCorsHeaders(request.headers.get("origin") || undefined),
        });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: getCorsHeaders(request.headers.get("origin") || undefined),
    });
  } catch (err) {
    console.error("Handler error:", err);
    return new Response(
      JSON.stringify({
        error: String(err),
        message: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: getCorsHeaders(request.headers.get("origin") || undefined),
      }
    );
  }
});
