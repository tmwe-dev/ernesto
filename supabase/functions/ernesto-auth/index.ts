import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { corsHeaders } from "../_shared/cors.ts";

interface AuthRequest {
  action: string;
  email?: string;
  password?: string;
  full_name?: string;
  invite_code?: string;
  employee_id?: string;
  role?: string;
  is_active?: boolean;
}

interface AuthResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  message?: string;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================================================
// LOGIN
// ============================================================================

async function handleLogin(
  email: string,
  password: string
): Promise<AuthResponse> {
  try {
    if (!email || !password) {
      return {
        success: false,
        error: "Email and password are required",
      };
    }

    // Use Supabase auth client to validate credentials
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: "Failed to authenticate user",
      };
    }

    // Check if user is active
    const { data: profile } = await supabase
      .from("ernesto_profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (!profile) {
      return {
        success: false,
        error: "User profile not found",
      };
    }

    if (!profile.is_active) {
      return {
        success: false,
        error: "Account has been deactivated",
      };
    }

    // Update last login
    await supabase
      .from("ernesto_profiles")
      .update({ last_login: new Date().toISOString() })
      .eq("id", data.user.id);

    // Log activity
    await supabase.from("ernesto_activity_log").insert({
      user_id: data.user.id,
      action: "login",
      details: { email },
    });

    return {
      success: true,
      data: {
        session: data.session,
        user: {
          id: data.user.id,
          email: data.user.email,
          profile,
        },
      },
    };
  } catch (error) {
    console.error("Login error:", error);
    return {
      success: false,
      error: "Internal server error",
    };
  }
}

// ============================================================================
// REGISTER WITH INVITE CODE
// ============================================================================

async function handleRegister(
  email: string,
  password: string,
  full_name: string,
  invite_code: string
): Promise<AuthResponse> {
  try {
    if (!email || !password || !full_name || !invite_code) {
      return {
        success: false,
        error: "Email, password, full name, and invite code are required",
      };
    }

    // Verify invite code
    const { data: invite } = await supabase
      .from("ernesto_invites")
      .select("*")
      .eq("invite_code", invite_code)
      .single();

    if (!invite) {
      return {
        success: false,
        error: "Invalid invite code",
      };
    }

    if (invite.email !== email) {
      return {
        success: false,
        error: "Email does not match invite",
      };
    }

    if (new Date(invite.expires_at) < new Date()) {
      return {
        success: false,
        error: "Invite code has expired",
      };
    }

    if (invite.accepted_at) {
      return {
        success: false,
        error: "Invite code has already been used",
      };
    }

    // Create user via Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role: invite.role,
      },
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: "Failed to create user",
      };
    }

    // Create profile
    const { error: profileError } = await supabase
      .from("ernesto_profiles")
      .insert({
        id: data.user.id,
        email,
        full_name,
        role: invite.role,
      });

    if (profileError) {
      return {
        success: false,
        error: "Failed to create profile",
      };
    }

    // Mark invite as accepted
    await supabase
      .from("ernesto_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id);

    // Log activity
    await supabase.from("ernesto_activity_log").insert({
      user_id: data.user.id,
      action: "register",
      details: { email, role: invite.role },
    });

    return {
      success: true,
      message: "User registered successfully",
      data: {
        user: {
          id: data.user.id,
          email,
          full_name,
          role: invite.role,
        },
      },
    };
  } catch (error) {
    console.error("Register error:", error);
    return {
      success: false,
      error: "Internal server error",
    };
  }
}

// ============================================================================
// CREATE INVITE (ADMIN ONLY)
// ============================================================================

async function handleCreateInvite(
  _request: Request,
  email: string,
  role: string,
  admin_id: string
): Promise<AuthResponse> {
  try {
    // Verify admin role
    const { data: admin } = await supabase
      .from("ernesto_profiles")
      .select("role")
      .eq("id", admin_id)
      .single();

    if (!admin || admin.role !== "admin") {
      return {
        success: false,
        error: "Unauthorized: Admin access required",
      };
    }

    if (!email || !role) {
      return {
        success: false,
        error: "Email and role are required",
      };
    }

    // Generate invite code
    const invite_code = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const { data: invite, error } = await supabase
      .from("ernesto_invites")
      .insert({
        email,
        role,
        invite_code,
        invited_by: admin_id,
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
      user_id: admin_id,
      action: "create_invite",
      details: { email, role, invite_code },
    });

    return {
      success: true,
      data: {
        invite,
      },
    };
  } catch (error) {
    console.error("Invite creation error:", error);
    return {
      success: false,
      error: "Internal server error",
    };
  }
}

// ============================================================================
// LIST EMPLOYEES (ADMIN/MANAGER ONLY)
// ============================================================================

async function handleListEmployees(admin_id: string): Promise<AuthResponse> {
  try {
    // Verify admin/manager role
    const { data: requester } = await supabase
      .from("ernesto_profiles")
      .select("role")
      .eq("id", admin_id)
      .single();

    if (!requester || !["admin", "manager"].includes(requester.role)) {
      return {
        success: false,
        error: "Unauthorized: Admin or manager access required",
      };
    }

    const { data: employees, error } = await supabase
      .from("ernesto_profiles")
      .select("id, email, full_name, role, is_active, last_login, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      data: {
        employees,
      },
    };
  } catch (error) {
    console.error("List employees error:", error);
    return {
      success: false,
      error: "Internal server error",
    };
  }
}

// ============================================================================
// UPDATE EMPLOYEE (ADMIN ONLY)
// ============================================================================

async function handleUpdateEmployee(
  admin_id: string,
  employee_id: string,
  updates: Record<string, unknown>
): Promise<AuthResponse> {
  try {
    // Verify admin role
    const { data: admin } = await supabase
      .from("ernesto_profiles")
      .select("role")
      .eq("id", admin_id)
      .single();

    if (!admin || admin.role !== "admin") {
      return {
        success: false,
        error: "Unauthorized: Admin access required",
      };
    }

    const { data: updated, error } = await supabase
      .from("ernesto_profiles")
      .update(updates)
      .eq("id", employee_id)
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
      user_id: admin_id,
      action: "update_employee",
      details: { employee_id, updates },
    });

    return {
      success: true,
      data: {
        employee: updated,
      },
    };
  } catch (error) {
    console.error("Update employee error:", error);
    return {
      success: false,
      error: "Internal server error",
    };
  }
}

// ============================================================================
// DEACTIVATE EMPLOYEE (ADMIN ONLY)
// ============================================================================

async function handleDeactivate(
  admin_id: string,
  employee_id: string
): Promise<AuthResponse> {
  try {
    // Verify admin role
    const { data: admin } = await supabase
      .from("ernesto_profiles")
      .select("role")
      .eq("id", admin_id)
      .single();

    if (!admin || admin.role !== "admin") {
      return {
        success: false,
        error: "Unauthorized: Admin access required",
      };
    }

    const { data: employee, error } = await supabase
      .from("ernesto_profiles")
      .update({ is_active: false })
      .eq("id", employee_id)
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
      user_id: admin_id,
      action: "deactivate_employee",
      details: { employee_id },
    });

    return {
      success: true,
      message: "Employee deactivated",
      data: {
        employee,
      },
    };
  } catch (error) {
    console.error("Deactivate error:", error);
    return {
      success: false,
      error: "Internal server error",
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
    const { action, ...payload } = (await req.json()) as AuthRequest;

    let response: AuthResponse;

    switch (action) {
      case "login":
        response = await handleLogin(payload.email || "", payload.password || "");
        break;

      case "register":
        response = await handleRegister(
          payload.email || "",
          payload.password || "",
          payload.full_name || "",
          payload.invite_code || ""
        );
        break;

      case "invite":
        response = await handleCreateInvite(
          req,
          payload.email || "",
          payload.role || "operator",
          payload.email || ""
        );
        break;

      case "list_employees":
        response = await handleListEmployees(payload.email || "");
        break;

      case "update_employee":
        response = await handleUpdateEmployee(
          payload.email || "",
          payload.employee_id || "",
          {
            role: payload.role,
            is_active: payload.is_active,
          }
        );
        break;

      case "deactivate":
        response = await handleDeactivate(
          payload.email || "",
          payload.employee_id || ""
        );
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
