# ShiftMaster v2

Jadwal shift staf dan jadwal lab UPT Laboratorium. Satu aplikasi Next.js full-stack
dengan PostgreSQL. Rencana lengkap, data model, dan urutan pengerjaan ada di
[docs/PLAN.md](docs/PLAN.md).

## Menjalankan di lokal

Butuh Node 24, pnpm 9, dan PostgreSQL (di laptop ini: Postgres 17 dari EnvKit, user `postgres`).

```bash
pnpm install
cp .env.example .env.local        # lalu isi nilainya
psql -U postgres -c "create database shiftmaster_dev;"
pnpm db:migrate                   # buat tabel
pnpm db:seed                      # area, ruangan, shift, kursi + superadmin
```

Server development dijalankan EnvKit (site `shiftmaster`, proses "Next.js dev") di
**https://shiftmaster.test** (port 5171). Tanpa EnvKit: `pnpm dev`.

- `pnpm db:seed` juga membuat:
  - superadmin pertama dari `BOOTSTRAP_SUPERADMIN_EMAIL`;
  - tim awal (admin dan staf) dari `MEMBERS` di `src/lib/db/seed-data.ts`, **sekali saja per database**.
    Setelah itu, anggota dikelola dari halaman Anggota. Staf mulai dengan PIN awal `123456` dan wajib
    membuat PIN sendiri saat login pertama.
- `pnpm db:seed --demo` (development saja) menambah:
  - akun staf `demo` untuk mencoba login PIN (PIN-nya tertulis di `src/lib/db/seed.ts`);
  - contoh pola Pagi/Siang untuk staf yang belum punya pola. Roster dibuat dari halaman admin Roster.
- Login admin butuh `GOOGLE_CLIENT_ID` (lihat [docs/google-sheets-credentials.md](docs/google-sheets-credentials.md) bagian B).
  Di lokal, login admin harus lewat **http://localhost:5171**, karena Google tidak menerima domain `.test`.

## Perintah

| Perintah | Fungsi |
|---|---|
| `pnpm dev` | Server development |
| `pnpm build` / `pnpm start` | Build dan jalankan versi produksi |
| `pnpm typecheck` | `next typegen` + `tsc` |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest (logika murni: auth, mode, parser Sheets, slot, roster, validasi, tukar shift) |
| `pnpm db:generate` | Buat file migrasi dari perubahan `src/lib/db/schema.ts` |
| `pnpm db:migrate` | Jalankan migrasi ke `DATABASE_URL` |
| `pnpm db:seed` | Isi konfigurasi awal (hanya menambah yang belum ada) |
| `pnpm db:studio` | Drizzle Studio untuk melihat isi database |
| `pnpm sheets:token` | Buat refresh token Google Sheets |

## Deploy

Produksi jalan di **Coolify** (`https://sm.gpadaka.com`):

- **App:** Coolify build `Dockerfile` (`output: "standalone"`) setiap ada push ke branch `production`.
  Saat start, app menjalankan migrasi, mengisi konfigurasi awal, superadmin pertama, dan tim awal.
- **Postgres 17:** resource database di Coolify, dengan backup terjadwal dari Coolify.
- Environment variables diatur di Coolify, bukan di repo.

Workflow GitHub Actions:

- `ci.yml`: lint, typecheck, test, build Next.js, dan build image Docker di `development` dan PR.
- `weekly-roster.yml`: membuat roster minggu depan tiap Jumat 17:30 WIB (butuh secret `APP_HOST` dan `CRON_SECRET`).

Langkah go-live, pengaturan Coolify, backup, dan rollback ada di [docs/GO-LIVE.md](docs/GO-LIVE.md).

## Catatan untuk yang melanjutkan

- Ini **Next.js 16**. Baca panduan di `node_modules/next/dist/docs/` sebelum menulis kode
  (`middleware` sekarang `proxy.ts`, `params`/`cookies()` async, dll).
- Hak akses selalu dicek di server: `requireMember()` / `requireRole()` di setiap halaman
  dan Server Action (`src/lib/auth/session.ts`). `proxy.ts` hanya pengecekan awal.
- Kode berbahasa Inggris, teks UI berbahasa Indonesia.
- Warna hanya lewat token di `src/app/globals.css`. Oranye (`brand`) khusus penanda
  "sekarang/aktif".
