import { createClient } from "npm:@supabase/supabase-js@2";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "npm:@simplewebauthn/server@13.1.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const rpId = Deno.env.get("PASSKEY_RP_ID")!;
const expectedOrigins = (Deno.env.get("PASSKEY_ORIGINS") || "").split(",").map(value => value.trim()).filter(Boolean);
const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

const json = (body: unknown, status = 200, origin = "") => new Response(JSON.stringify(body), {
  status,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  },
});

const bytesToBase64Url = (bytes: Uint8Array) => {
  let binary = "";
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const base64UrlToBytes = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, character => character.charCodeAt(0));
};

const uuidToBytes = (value: string) => Uint8Array.from(
  value.replace(/-/g, "").match(/.{2}/g) || [],
  byte => Number.parseInt(byte, 16),
);

const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
};

const serializeOptions = (options: Record<string, unknown>) => {
  const result = structuredClone(options) as Record<string, any>;
  if (result.user?.id instanceof Uint8Array) result.user.id = bytesToBase64Url(result.user.id);
  return result;
};

Deno.serve(async request => {
  const origin = request.headers.get("origin") || "";
  if (!expectedOrigins.includes(origin)) return json({ error: "Origin not allowed." }, 403, origin);
  if (request.method === "OPTIONS") return new Response("ok", { headers: {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  } });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405, origin);

  try {
    const body = await request.json();
    const action = String(body.action || "");

    if (action === "authentication-options") {
      const identifier = String(body.identifier || "").trim().toLowerCase();
      const { data: vault } = await supabase.from("vaults").select("id,identifier").eq("identifier", identifier).maybeSingle();
      if (!vault) return json({ enabled: false }, 200, origin);
      const { data: credentials, error: credentialError } = await supabase
        .from("passguard_passkeys")
        .select("credential_id,transports")
        .eq("vault_id", vault.id);
      if (credentialError) throw credentialError;
      if (!credentials?.length) return json({ enabled: false }, 200, origin);

      const options = await generateAuthenticationOptions({
        rpID: rpId,
        allowCredentials: credentials.map(credential => ({
          id: credential.credential_id,
          transports: credential.transports,
        })),
        userVerification: "required",
      });
      const { data: challenge, error: challengeError } = await supabase
        .from("passguard_passkey_challenges")
        .insert({ vault_id: vault.id, challenge: options.challenge, purpose: "authentication" })
        .select("id")
        .single();
      if (challengeError) throw challengeError;
      return json({ enabled: true, challengeId: challenge.id, options }, 200, origin);
    }

    if (action === "authentication-verify") {
      const { data: challengeRows, error: challengeError } = await supabase.rpc("consume_passkey_challenge_secure", {
        p_challenge_id: body.challengeId,
        p_purpose: "authentication",
        p_session_token: null,
      });
      if (challengeError) throw challengeError;
      const challenge = challengeRows?.[0];
      if (!challenge) return json({ error: "Passkey challenge expired." }, 400, origin);

      const credentialId = String(body.credential?.id || "");
      const { data: credential, error: credentialError } = await supabase
        .from("passguard_passkeys")
        .select("credential_id,public_key,sign_count,transports,vault_id")
        .eq("credential_id", credentialId)
        .eq("vault_id", challenge.vault_id)
        .maybeSingle();
      if (credentialError) throw credentialError;
      if (!credential) return json({ error: "Passkey not recognized." }, 400, origin);

      const verification = await verifyAuthenticationResponse({
        response: body.credential,
        expectedChallenge: challenge.challenge,
        expectedOrigin: origin,
        expectedRPID: rpId,
        credential: {
          id: credential.credential_id,
          publicKey: base64UrlToBytes(credential.public_key),
          counter: Number(credential.sign_count),
          transports: credential.transports,
        },
        requireUserVerification: true,
      });
      if (!verification.verified) return json({ error: "Passkey verification failed." }, 401, origin);

      const { data: updatedCredential, error: updateError } = await supabase.from("passguard_passkeys")
        .update({ sign_count: verification.authenticationInfo.newCounter, last_used_at: new Date().toISOString() })
        .eq("credential_id", credential.credential_id)
        .eq("sign_count", credential.sign_count)
        .select("credential_id")
        .maybeSingle();
      if (updateError) throw updateError;
      if (!updatedCredential) return json({ error: "Passkey counter changed; authenticate again." }, 409, origin);

      const token = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
      const { error: tokenError } = await supabase.from("passguard_passkey_tokens").insert({
        token_hash: await sha256(token),
        vault_id: challenge.vault_id,
        expires_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
      });
      if (tokenError) throw tokenError;
      return json({ token }, 200, origin);
    }

    const sessionToken = String(body.sessionToken || "");
    if (!sessionToken) return json({ error: "A valid vault session is required." }, 401, origin);
    const { data: sessionValid, error: sessionError } = await supabase.rpc("validate_vault_session_secure", {
      p_session_token: sessionToken,
    });
    if (sessionError) throw sessionError;
    if (!sessionValid) return json({ error: "Vault session expired." }, 401, origin);

    if (action === "registration-options") {
      const vaultId = String(body.vaultId || "");
      const { data: vault, error: vaultError } = await supabase.from("vaults")
        .select("id,identifier")
        .eq("id", vaultId)
        .maybeSingle();
      if (vaultError) throw vaultError;
      if (!vault) return json({ error: "Vault not found." }, 404, origin);
      const { data: credentials, error: credentialError } = await supabase
        .from("passguard_passkeys")
        .select("credential_id,transports")
        .eq("vault_id", vaultId);
      if (credentialError) throw credentialError;

      const options = await generateRegistrationOptions({
        rpName: "Pass-Guard",
        rpID: rpId,
        userID: uuidToBytes(vault.id),
        userName: vault.identifier,
        attestationType: "none",
        excludeCredentials: (credentials || []).map(credential => ({
          id: credential.credential_id,
          transports: credential.transports,
        })),
        authenticatorSelection: { residentKey: "preferred", userVerification: "required" },
      });
      const { data: challenge, error: challengeError } = await supabase
        .from("passguard_passkey_challenges")
        .insert({
          vault_id: vaultId,
          challenge: options.challenge,
          purpose: "registration",
          session_token_hash: await sha256(sessionToken),
        })
        .select("id")
        .single();
      if (challengeError) throw challengeError;
      return json({ challengeId: challenge.id, options: serializeOptions(options as unknown as Record<string, unknown>) }, 200, origin);
    }

    if (action === "registration-verify") {
      const { data: challengeRows, error: challengeError } = await supabase.rpc("consume_passkey_challenge_secure", {
        p_challenge_id: body.challengeId,
        p_purpose: "registration",
        p_session_token: sessionToken,
      });
      if (challengeError) throw challengeError;
      const challenge = challengeRows?.[0];
      if (!challenge) return json({ error: "Passkey challenge expired." }, 400, origin);

      const verification = await verifyRegistrationResponse({
        response: body.credential,
        expectedChallenge: challenge.challenge,
        expectedOrigin: origin,
        expectedRPID: rpId,
        requireUserVerification: true,
      });
      if (!verification.verified || !verification.registrationInfo) {
        return json({ error: "Passkey registration verification failed." }, 400, origin);
      }

      const credential = verification.registrationInfo.credential;
      const { error: insertError } = await supabase.from("passguard_passkeys").insert({
        credential_id: credential.id,
        vault_id: challenge.vault_id,
        public_key: bytesToBase64Url(credential.publicKey),
        sign_count: credential.counter,
        transports: credential.transports || [],
        label: String(body.label || "").trim().slice(0, 80),
      });
      if (insertError) throw insertError;
      return json({ registered: true }, 200, origin);
    }

    return json({ error: "Unknown action." }, 400, origin);
  } catch (error) {
    console.error("Passkey operation failed:", error);
    return json({ error: "Passkey operation failed." }, 500, origin);
  }
});