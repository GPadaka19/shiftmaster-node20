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

- `pnpm db:seed --demo` (development saja) menambah:
  - akun staf `demo` untuk mencoba login PIN (PIN-nya tertulis di `src/lib/db/seed.ts`);
  - 18 staf fiktif dan roster terbit untuk minggu ini dan minggu lalu.
- Superadmin pertama dibuat dari `BOOTSTRAP_SUPERADMIN_EMAIL` saat `pnpm db:seed`.
  Login admin butuh `GOOGLE_CLIENT_ID` (lihat [docs/google-sheets-credentials.md](docs/google-sheets-credentials.md) bagian B).

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

Merge ke branch `production` men-deploy ke VPS lewat GitHub Actions (`.github/workflows/deploy.yml`).
Stack di VPS ada di `docker-compose.yml`:

- **App:** image `output: "standalone"`. Saat start, app menjalankan migrasi, mengisi konfigurasi
  awal, dan membuat superadmin pertama.
- **Postgres 17.**
- **Halaman maintenance** saat app restart.

Workflow lain:

- `ci.yml`: lint, typecheck, test, dan build di `development`.
- `weekly-roster.yml`: membuat roster minggu depan tiap Jumat 17:30 WIB.

Langkah go-live, daftar GitHub Secrets, backup, dan pindah domain ada di
[docs/GO-LIVE.md](docs/GO-LIVE.md).

## Catatan untuk yang melanjutkan

- Ini **Next.js 16**. Baca panduan di `node_modules/next/dist/docs/` sebelum menulis kode
  (`middleware` sekarang `proxy.ts`, `params`/`cookies()` async, dll).
- Hak akses selalu dicek di server: `requireMember()` / `requireRole()` di setiap halaman
  dan Server Action (`src/lib/auth/session.ts`). `proxy.ts` hanya pengecekan awal.
- Kode berbahasa Inggris, teks UI berbahasa Indonesia.
- Warna hanya lewat token di `src/app/globals.css`. Oranye (`brand`) khusus penanda
  "sekarang/aktif".
