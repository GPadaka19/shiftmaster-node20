# Go-live ShiftMaster v2 (Fase 3)

Urutan memindahkan ShiftMaster dari sistem lama (`shiftmaster` + `jadwal-lab-upt`) ke
aplikasi ini. Langkah 1–4 sekali saja; langkah 5–6 adalah masa uji paralel.

## Cara deploy bekerja

- `development`: CI (lint, typecheck, test, build) di setiap push.
- `production`: setiap merge/push men-deploy ke VPS (`.github/workflows/deploy.yml`):
  1. Verifikasi + build image Docker.
  2. `.env` dibuat dari GitHub Secrets.
  3. File disalin ke `~/code/shiftmaster-v2` di VPS.
  4. `docker compose up -d --build`.
  5. Menunggu healthcheck.
- Saat start, container menjalankan migrasi database, mengisi konfigurasi awal (area, ruangan,
  shift, kursi), dan membuat superadmin pertama dari `BOOTSTRAP_SUPERADMIN_EMAIL`.
- Stack di VPS (`docker-compose.yml`):
  - `shiftmaster-app`: aplikasi;
  - `shiftmaster-db`: Postgres 17 dengan volume `shiftmaster-pgdata`;
  - `shiftmaster-maintenance`: halaman "sedang diperbarui" selama app restart.
- Roster minggu depan dibuat otomatis tiap Jumat 17:30 WIB oleh
  `.github/workflows/weekly-roster.yml`. Tidak perlu crontab di VPS.

## 1. Kredensial Google

Ikuti [google-sheets-credentials.md](google-sheets-credentials.md):

- **Bagian A:** rotasi client + refresh token Sheets. Catat client ID, client secret, refresh token.
- **Bagian B:** buat OAuth client **Web** untuk login admin. Isi Authorized JavaScript origins
  dengan domain uji (langkah 2), nanti juga domain akhir.

## 2. Domain uji paralel

Selama uji paralel, app lama tetap di `shiftmaster.gpadaka.com`. App baru butuh host lain,
misalnya `shiftmaster-v2.gpadaka.com`.

- Buat record DNS-nya di Cloudflare, mengarah ke VPS yang sama.
- Pakai subdomain **satu tingkat** (`shiftmaster-v2.gpadaka.com`, bukan
  `v2.shiftmaster.gpadaka.com`). Sertifikat Cloudflare gratis hanya mencakup satu tingkat.

## 3. GitHub Secrets

Isi di repo `GPadaka19/shiftmaster-fe` → Settings → Secrets and variables → Actions, atau lewat CLI:

```bash
gh secret set APP_HOST -R GPadaka19/shiftmaster-fe
```

| Secret | Isi |
|---|---|
| `VPS_HOST`, `VPS_USER`, `SSH_PRIVATE_KEY` | Sama dengan repo lama |
| `APP_HOST` | Domain app, mis. `shiftmaster-v2.gpadaka.com` |
| `TRAEFIK_NETWORK` | Opsional; default `jadwal-lab-upt-net` (network Traefik yang sama dengan app lama) |
| `POSTGRES_PASSWORD` | String acak panjang (`openssl rand -base64 32`). **Jangan diganti setelah deploy pertama**: Postgres hanya memakainya saat volume pertama kali dibuat |
| `GOOGLE_CLIENT_ID` | Client ID OAuth **Web** (bagian B) |
| `BOOTSTRAP_SUPERADMIN_EMAIL` | Email Google kamu (superadmin pertama) |
| `BOOTSTRAP_SUPERADMIN_NICKNAME` | Opsional; nickname kamu |
| `SOURCE_SPREADSHEET_ID`, `SOURCE_READ_RANGE` | Sama dengan backend Go (`JADWAL!A1:Z200`) |
| `M_SOURCE_SPREADSHEET_ID`, `M_SOURCE_READ_RANGE` | Sama dengan backend Go (`AgendaLab!A1:Z200`) |
| `GOOGLE_SHEETS_CLIENT_ID`, `GOOGLE_SHEETS_CLIENT_SECRET`, `GOOGLE_SHEETS_REFRESH_TOKEN` | Dari bagian A |
| `CRON_SECRET` | String acak panjang (`openssl rand -base64 32`) |

Workflow deploy berhenti dengan pesan jelas kalau ada secret wajib yang kosong.

## 4. Deploy pertama

1. Buat PR `development` → `production`, lalu merge.
2. Pantau tab **Actions** → workflow **Deploy** sampai hijau.
3. Buka `https://<APP_HOST>/api/health`. Hasilnya harus `{"status":"ok"}`.
4. Masuk lewat tab **Admin** dengan akun Google dari `BOOTSTRAP_SUPERADMIN_EMAIL`.

Kalau gagal, log aplikasi ada di VPS: `sudo docker logs --tail 100 shiftmaster-app`.

## 5. Isi data (sekali, oleh superadmin/admin)

Urutannya penting, karena setiap langkah dipakai langkah berikutnya.

1. **Anggota:**
   - Tambah admin (peran Admin + email Google).
   - Tambah semua staf: pool Lab, Studio, atau PKL.
   - Atur PIN tiap staf dan bagikan secara pribadi.
2. **Kalender:**
   - Isi periode semester berjalan (Masa Kuliah) dan libur semester berikutnya.
   - Isi hari libur nasional dan kampus.
3. **Aturan:**
   - Isi pola Pagi/Siang tiap anggota (gedung untuk PKL), batas G2, dan kunci G2.
   - Pastikan tabel cakupan Lab menunjukkan 6/6 untuk setiap hari dan shift.
4. **Editor Roster:**
   - Generate draf minggu ini, periksa banner pelanggaran dan Distribusi, lalu terbitkan.
   - Ulangi untuk minggu depan, atau biarkan cron yang membuatnya Jumat sore.

## 6. Uji paralel (1–2 minggu)

- Minta staf login dengan nickname + PIN dan memakai Hari Ini, Roster, dan Jadwal Lab.
- Setiap hari, bandingkan roster dan jadwal lab di app baru dengan app lama.
- Coba **Actions → Weekly roster → Run workflow** sekali untuk memastikan cron jalan.
- Pasang backup harian di VPS. Jalankan `crontab -e`, lalu tambahkan baris ini:

```
0 2 * * * $HOME/code/shiftmaster-v2/scripts/backup-db.sh >> $HOME/backups/shiftmaster/backup.log 2>&1
```

## 7. Pindah domain

1. Matikan app lama yang memakai `shiftmaster.gpadaka.com`:

   ```bash
   cd ~/code/shiftmaster && sudo docker compose down
   ```

2. Ubah secret `APP_HOST` menjadi `shiftmaster.gpadaka.com`, dan tambahkan origin itu di OAuth client Web.
3. Jalankan **Actions → Deploy → Run workflow**.
4. Setelah yakin, matikan juga backend Go:

   ```bash
   cd ~/jadwal-lab-upt && sudo docker compose down
   ```

5. Hapus record DNS domain uji.

**Kembali ke app lama** (kalau ada masalah): jalankan `sudo docker compose up -d` di folder app lama,
lalu kembalikan `APP_HOST` ke domain uji dan deploy ulang.

## 8. Bersih-bersih

- Hapus OAuth client Sheets yang lama di Google Cloud Console (bagian A langkah 6). Kredensial
  lama pernah ter-commit di riwayat git `jadwal-lab-upt`.
- Arsipkan repo `shiftmaster` dan `jadwal-lab-upt` di GitHub (Settings → Archive).
- Hapus `jadwal-lab-upt/secrets/`, `shiftmaster/jadwal-lab-upt/` (salinan lama), dan
  `.env.local` lama dari laptop.
