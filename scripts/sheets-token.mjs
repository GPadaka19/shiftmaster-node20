#!/usr/bin/env node
// Creates a Google Sheets refresh token from an OAuth "Desktop app" client.
// Usage: node scripts/sheets-token.mjs <client.json> [out.json]
//
// The output file has the same shape as jadwal-lab-upt's google-oauth-token.json,
// so it works for the old Go backend as well as for GOOGLE_SHEETS_REFRESH_TOKEN.
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";

const SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

const [clientPath, outPath = "google-oauth-token.json"] = process.argv.slice(2);
if (!clientPath) {
  console.error("Pemakaian: node scripts/sheets-token.mjs <client.json> [out.json]");
  process.exit(1);
}

const clientFile = JSON.parse(readFileSync(clientPath, "utf8"));
const client = clientFile.installed;
if (!client?.client_id || !client?.client_secret) {
  console.error('File client harus bertipe "Desktop app" (berisi installed.client_id dan installed.client_secret).');
  process.exit(1);
}

const state = randomBytes(16).toString("hex");
let redirectUri = "";

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", redirectUri);
  if (url.pathname !== "/") {
    res.writeHead(404).end();
    return;
  }

  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  if (error || url.searchParams.get("state") !== state || !code) {
    res.writeHead(400).end(`Gagal: ${error ?? "state tidak cocok atau code kosong"}`);
    console.error(`Gagal: ${error ?? "state tidak cocok atau code kosong"}`);
    process.exitCode = 1;
    server.close();
    return;
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: client.client_id,
        client_secret: client.client_secret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const token = await response.json();
    if (!response.ok) throw new Error(`${token.error}: ${token.error_description ?? ""}`);
    if (!token.refresh_token) {
      throw new Error(
        "Google tidak mengirim refresh_token. Cabut akses lama di myaccount.google.com/permissions lalu ulangi.",
      );
    }

    token.expiry = new Date(Date.now() + token.expires_in * 1000).toISOString();
    writeFileSync(outPath, `${JSON.stringify(token, null, 2)}\n`, { mode: 0o600 });
    res.end("Berhasil. Tab ini boleh ditutup.");
    console.log(`\nToken tersimpan di ${outPath}`);
  } catch (err) {
    res.writeHead(500).end("Gagal menukar code. Lihat terminal.");
    console.error(`\nGagal: ${err.message}`);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});

server.listen(0, "127.0.0.1", () => {
  redirectUri = `http://127.0.0.1:${server.address().port}`;
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.search = new URLSearchParams({
    client_id: client.client_id,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  }).toString();

  console.log("Buka URL ini di browser, login dengan akun kampus yang bisa membaca spreadsheet:\n");
  console.log(authUrl.toString());
  console.log("\nMenunggu login...");
});
