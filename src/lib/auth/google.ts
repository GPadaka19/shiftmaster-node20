import "server-only";
import { OAuth2Client } from "google-auth-library";

let client: OAuth2Client | undefined;

/**
 * Checks a Google Identity Services credential (ID token): signature, expiry,
 * and that it was issued for our client ID. Returns the verified email.
 */
export async function verifyGoogleCredential(credential: string, clientId: string): Promise<{ email: string } | null> {
  client ??= new OAuth2Client();
  try {
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.email_verified) return null;
    return { email: payload.email.toLowerCase() };
  } catch {
    return null;
  }
}
