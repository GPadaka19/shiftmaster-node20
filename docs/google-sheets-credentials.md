# Kredensial Google

ShiftMaster memakai dua OAuth client di project Google Cloud yang sama:

| Client | Tipe | Dipakai untuk | Env |
|---|---|---|---|
| Sheets | **Desktop app** | Membaca spreadsheet jadwal dan agenda dengan akun kampus | `GOOGLE_SHEETS_CLIENT_ID`, `GOOGLE_SHEETS_CLIENT_SECRET`, `GOOGLE_SHEETS_REFRESH_TOKEN` |
| Login admin | **Web application** | Tombol "Masuk dengan Google" | `GOOGLE_CLIENT_ID` |

Jangan pernah commit file client atau token. Simpan di luar repo (misalnya `~/secrets/`).

---

## A. Rotasi client + token Sheets

Yang dibutuhkan: akun kampus yang bisa membuka **kedua** spreadsheet (jadwal dan AgendaLab).

### 1. Siapkan project

1. Buka [console.cloud.google.com](https://console.cloud.google.com) dan pilih project yang sama
   dengan yang lama (lihat `project_id` di `jadwal-lab-upt/secrets/google-oauth-client.json`).
2. **APIs & Services → Enabled APIs & services**: pastikan **Google Sheets API** aktif.
   Kalau belum, buka Library, cari "Google Sheets API", lalu Enable.

### 2. Cek layar persetujuan (penyebab paling umum token mati)

Buka **Google Auth Platform → Audience** (di UI lama namanya "OAuth consent screen").

- **User type Internal** (hanya ada kalau project berada di organisasi kampus): aman,
  token tidak kedaluwarsa dan tidak perlu verifikasi.
- **User type External**: status harus **In production** (tombol "Publish app").
  Kalau masih **Testing**, refresh token mati sendiri setelah **7 hari**.
  Saat login akan muncul "Google hasn't verified this app". Klik Advanced → Go to …
  Ini normal untuk pemakaian internal.

### 3. Buat client baru

1. **Google Auth Platform → Clients → Create client** (atau APIs & Services → Credentials →
   Create credentials → OAuth client ID).
2. Application type: **Desktop app**. Beri nama, misalnya `shiftmaster-sheets-2026-10`.
3. Create → **Download JSON**. File ini berisi `installed.client_id` dan `installed.client_secret`.

### 4. Buat refresh token

Dari folder `shiftmaster-fe`:

```bash
node scripts/sheets-token.mjs ~/Downloads/client_secret_XXXX.json ~/secrets/google-oauth-token.json
```

1. Terminal menampilkan URL. Buka di browser.
2. Login dengan **akun kampus** yang bisa membaca spreadsheet, lalu izinkan akses
   "See all your Google Sheets spreadsheets".
3. Browser menampilkan "Berhasil", dan terminal menulis file token.

Script ini menjalankan server kecil di `127.0.0.1` untuk menangkap balasan Google, lalu
menukarnya dengan token. Aksesnya hanya baca (`spreadsheets.readonly`).

### 5. Pasang nilai baru

- **Backend Go lama** (selama masih jalan): ganti `secrets/google-oauth-client.json` dengan
  file client baru dan `secrets/google-oauth-token.json` dengan file token baru. Kalau di PaaS,
  ganti isi `CREDENTIALS_JSON` / `TOKEN_JSON`. Restart, lalu pastikan `GET /jadwal` masih
  mengembalikan data.
- **ShiftMaster v2**: isi `GOOGLE_SHEETS_CLIENT_ID` dan `GOOGLE_SHEETS_CLIENT_SECRET` dari
  file client, lalu `GOOGLE_SHEETS_REFRESH_TOKEN` dari field `refresh_token` di file token.

### 6. Matikan yang lama

Setelah yang baru terbukti jalan:

1. Di **Clients**, hapus client lama. Cocokkan `client_id`-nya dengan file lama.
   Semua token dari client itu ikut mati. Inilah inti rotasinya.
2. Opsional: di akun kampus, buka [myaccount.google.com/permissions](https://myaccount.google.com/permissions)
   dan cabut akses aplikasi lama.
3. Hapus file client/token lama dari laptop dan server.

### Kalau gagal

| Gejala | Penyebab | Solusi |
|---|---|---|
| "Google tidak mengirim refresh_token" | Akun sudah pernah memberi izin ke client ini | Cabut akses di myaccount.google.com/permissions, jalankan ulang script |
| "Access blocked" / "admin has blocked" | Workspace kampus memblokir aplikasi pihak ketiga | Minta admin kampus mengizinkan client ID ini, atau pakai akun lain yang punya akses |
| `invalid_grant` beberapa hari kemudian | Consent screen masih **Testing**, atau akses dicabut, atau akun kampus dinonaktifkan | Lihat langkah 2, lalu buat token baru |
| `403` saat membaca sheet | Akun itu tidak punya akses ke spreadsheet | Minta pemilik sheet membagikan ke akun tersebut |
| `redirect_uri_mismatch` | Tipe client bukan Desktop app | Buat ulang dengan tipe Desktop app |

---

## B. Client login admin (dibutuhkan di Fase 0)

1. **Clients → Create client**, Application type: **Web application**.
2. **Authorized JavaScript origins**:
   - `http://localhost:5171` untuk development. Google menolak domain non-publik seperti
     `.test`, jadi login admin di lokal harus lewat localhost, bukan `https://shiftmaster.test`.
   - Domain uji dan domain akhir, misalnya `https://sm.gpadaka.com` dan `https://shiftmaster.gpadaka.com`.
   - **Authorized redirect URIs** dikosongkan, karena tombol Google memakai mode popup.
3. Salin **Client ID** ke `GOOGLE_CLIENT_ID`. Client secret tidak dipakai, karena server
   hanya memverifikasi ID token.
