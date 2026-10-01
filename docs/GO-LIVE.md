# Go-live ShiftMaster v2 (Coolify)

ShiftMaster v2 langsung memakai domain **`sm.gpadaka.com`**. Sistem lama (`shiftmaster` + `jadwal-lab-upt`)
sudah tidak dipakai, jadi tidak ada masa uji paralel atau pindah domain.

## Cara deploy bekerja

- `development`: CI di setiap push (lint, typecheck, test, build Next.js, dan build image Docker).
- `production`: Coolify (self-hosted, dashboard hanya lewat Tailscale `http://100.64.50.20:8000`) build
  `Dockerfile` dari repo publik `GPadaka19/shiftmaster-node20`, lalu mengganti container lama setelah container
  baru sehat (`/api/health`). Kalau build gagal, versi lama tetap jalan.
- **Deploy tidak otomatis.** GitHub tidak bisa menjangkau Coolify yang hanya ada di Tailscale, jadi setelah
  merge ke `production` klik **Redeploy** di Coolify (atau lewat MCP/API Coolify).
- Saat start, container menjalankan migrasi database, mengisi konfigurasi awal (area, ruangan, shift,
  kursi), membuat superadmin dari `BOOTSTRAP_SUPERADMIN_EMAIL`, dan mengisi tim awal dari
  `src/lib/db/seed-data.ts` (sekali saja per database).
- Roster minggu depan dibuat otomatis tiap Jumat 17:30 WIB oleh `.github/workflows/weekly-roster.yml`.

## 1. Kredensial Google

Ikuti [google-sheets-credentials.md](google-sheets-credentials.md):

- **Bagian A:** client + refresh token Sheets (sudah dibuat, file ada di `~/secrets/`).
- **Bagian B:** OAuth client **Web** untuk login admin, dengan origin `https://sm.gpadaka.com`.

## 2. DNS

Di Cloudflare, buat record `sm` ke IP server Coolify, dengan pengaturan yang sama seperti app lain di
`gpadaka.com` yang sudah jalan di Coolify (proxied, SSL/TLS **Full (strict)**).

## 3. Postgres di Coolify

1. Project (misalnya **ShiftMaster**) → **+ New** → **Database** → **PostgreSQL**, image `postgres:17-alpine`.
2. Nama: `shiftmaster-db`. Biarkan Coolify membuat user dan password.
3. **Jangan** aktifkan *Make it publicly available*. App mengaksesnya lewat jaringan internal Coolify.
4. **Start**. Salin **Postgres URL (internal)** untuk `DATABASE_URL` di langkah 4.
5. **Backups** → aktifkan backup terjadwal, misalnya `0 2 * * *` (setiap 02:00), simpan 14 cadangan.
   Kalau punya S3/R2, tambahkan sebagai tujuan supaya cadangan tidak hanya di server yang sama.

## 4. Aplikasi di Coolify

1. Project yang sama → **+ New** → **Public Repository** → `https://github.com/GPadaka19/shiftmaster-node20`.
2. **Branch:** `production`. **Build Pack:** `Dockerfile`. **Ports Exposes:** `3000`.
3. **Domains:** `https://sm.gpadaka.com`.
4. **Health Check:** aktifkan, host `127.0.0.1` (bukan `localhost`: di Alpine itu IPv6, sedangkan Next.js
   hanya mendengarkan IPv4), path `/api/health`, port `3000`.
5. **Environment Variables** (centang *Is Literal* untuk nilai yang berisi `$`):

| Variabel | Isi |
|---|---|
| `DATABASE_URL` | Postgres URL (internal) dari langkah 3 |
| `GOOGLE_CLIENT_ID` | Client ID OAuth **Web** (bagian B) |
| `BOOTSTRAP_SUPERADMIN_EMAIL` | `gustipadaka19@gmail.com` |
| `BOOTSTRAP_SUPERADMIN_NICKNAME` | `Daka` |
| `SOURCE_SPREADSHEET_ID`, `SOURCE_READ_RANGE` | Sama dengan `.env.local` (`JADWAL!A1:Z200`) |
| `M_SOURCE_SPREADSHEET_ID`, `M_SOURCE_READ_RANGE` | Sama dengan `.env.local` (`AgendaLab!A1:Z200`) |
| `GOOGLE_SHEETS_CLIENT_ID`, `GOOGLE_SHEETS_CLIENT_SECRET`, `GOOGLE_SHEETS_REFRESH_TOKEN` | Dari bagian A |
| `CRON_SECRET` | String acak panjang (`openssl rand -base64 32`) |

   `NODE_ENV`, `PORT`, `HOSTNAME`, dan `RUN_MIGRATIONS=true` sudah diatur di `Dockerfile`.

6. **Deploy**. Pantau log build sampai container sehat, lalu buka `https://sm.gpadaka.com/api/health`.
   Hasilnya harus `{"status":"ok"}`.
7. Setiap merge ke `production` berikutnya: klik **Redeploy** (deploy tidak otomatis, lihat di atas).

## 5. GitHub Secrets untuk cron roster

Di `GPadaka19/shiftmaster-node20` → Settings → Secrets and variables → Actions:

| Secret | Isi |
|---|---|
| `APP_HOST` | `sm.gpadaka.com` |
| `CRON_SECRET` | Nilai yang **sama** dengan di Coolify |

Lalu jalankan **Actions → Weekly roster → Run workflow** sekali untuk memastikan cron bisa memanggil app.

## 6. Isi data (sekali, oleh superadmin/admin)

Tim awal (admin dan staf) dan roster minggu go-live (28 Sep – 2 Okt) sudah dibuat otomatis. Urutannya penting, karena setiap langkah dipakai langkah berikutnya.

1. **Masuk** lewat tab **Admin** dengan akun Google superadmin.
2. **Anggota:**
   - Periksa daftar, lengkapi nama lengkap, dan isi **Mulai bertugas** untuk staf Lab yang baru masuk
     (G7 saja selama 4 minggu roster pertama).
   - Staf mulai dengan PIN awal `123456` dan wajib membuat PIN sendiri saat login pertama.
     Beri tahu staf secara langsung; jangan tulis PIN awal di grup publik.
   - Staf yang lupa PIN: buka detailnya → **Reset ke PIN awal**.
3. **Kalender:**
   - Isi periode semester berjalan (Masa Kuliah) dan libur semester berikutnya.
   - Isi hari libur nasional dan kampus.
4. **Aturan:**
   - Isi pola Pagi/Siang tiap anggota, batas G2, dan kunci G2.
   - Pastikan tabel cakupan Lab menunjukkan 6/6 untuk setiap hari dan shift.
5. **Editor Roster:**
   - Generate draf minggu ini, periksa banner pelanggaran dan Distribusi, lalu terbitkan.
   - Minggu depan dibuat cron Jumat sore, atau generate manual.

## 7. Bersih-bersih

- Hapus OAuth client Sheets lama di project Google Cloud `ss-upt-480203` (ID diawali `99758034438-`).
  Kredensial itu masih aktif dan pernah ter-commit di riwayat git `jadwal-lab-upt`.
- Hapus resource app lama di Coolify kalau masih ada, dan record DNS `shiftmaster` kalau tidak dipakai lagi.
- Arsipkan repo `shiftmaster` dan `jadwal-lab-upt` di GitHub (Settings → Archive).
- Hapus `jadwal-lab-upt/secrets/` dan `~/secrets/env.local.before-rotation` dari laptop.

## Kalau ada masalah

- **Log aplikasi:** Coolify → aplikasi → **Logs**.
- **Rollback:** Coolify → aplikasi → **Deployments** → pilih deployment sebelumnya → **Redeploy**.
  Migrasi database tidak ikut mundur. Semua migrasi sejauh ini hanya menambah kolom/tabel, jadi versi lama tetap jalan.
- **Restore database:** Coolify → `shiftmaster-db` → **Backups** → pilih cadangan → **Restore**.
