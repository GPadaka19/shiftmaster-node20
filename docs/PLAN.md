# ShiftMaster v2 — Rencana Rewrite

Dokumen ini jadi pegangan rewrite ShiftMaster dari nol di repo `shiftmaster-fe`.
Isinya: keputusan yang sudah diambil, arsitektur, data model, daftar halaman,
arah visual, dan urutan pengerjaan. Kalau ada yang berubah, ubah dokumen ini dulu
baru kodenya.

Referensi sistem lama (read-only, jangan diubah):

- `../shiftmaster` — frontend lama (Vite + React + Express). Sumber aturan roster.
- `../jadwal-lab-upt` — backend Go (baca Google Sheets, login PIN/Google, anggota).
- `../../shiftmaster-laravel` — percobaan rewrite Agustus 2026 (ada aturan tukar shift).

---

## 1. Keputusan

| # | Keputusan | Catatan |
|---|---|---|
| 1 | Satu aplikasi **Next.js full-stack** di `shiftmaster-fe` | Tidak ada Express, tidak ada Go. Lihat bagian 3. |
| 2 | Database **PostgreSQL, dibangun dari nol** | Tidak ada impor data lama. Anggota, pola, dan aturan diisi admin lewat aplikasi. |
| 3 | Jadwal kuliah dan agenda lab **tetap dari Google Sheets** | Auth OAuth client + refresh token akun kampus (bukan service account). Cara membuatnya: `docs/google-sheets-credentials.md`. |
| 4 | Mode **lecture** = masa perkuliahan, **maintenance** = libur semester | Fitur mode maintenance sama seperti sekarang: agenda lab + roster. Tidak ada checklist. |
| 5 | Mode ditentukan **data periode** (tanggal), bukan env var | Ganti mode tidak perlu deploy. |
| 6 | Tampilan **clean, flat, modern** | Menggantikan arahan lama di `shiftmaster/docs/design/google-stitch-prompt.md`. |
| 7 | Roster diedit **di aplikasi** oleh **semua admin dan superadmin** | Tidak ada lagi CSV + commit git. |
| 8 | Staf login **nickname + PIN** | Wajib karena fitur tukar shift nanti butuh identitas yang bisa dipercaya. |
| 9 | Hak akses diputuskan **di server** | Tidak ada daftar nama, email admin, atau kunci di bundle browser. |
| 10 | Ruangan `VL.01–03`, `S 2.0.1`, `S 4.4.1`, `S 4.4.2` **disembunyikan** | Disimpan dengan `visible = false`. |
| 11 | **PKL tetap ada** (2 orang) | Pool `pkl`, tugas per gedung dengan pola harian bergantian. |

### Istilah (supaya tidak rancu lagi)

- **mode** — `lecture` | `maintenance`. Hanya dua arti ini.
- **agenda** — data dari sheet AgendaLab (peminjaman lab + kegiatan maintenance). Di sistem
  lama namanya "maintenance", di sini disebut `agenda`.
- **downtime** — layar "sistem sedang perbaikan". Di sistem lama juga disebut maintenance.
- Kode: identifier bahasa Inggris (`members`, `rosterWeeks`, `assignments`).
  Teks UI: bahasa Indonesia.

---

## 2. Stack

| Bagian | Pilihan |
|---|---|
| Framework | Next.js 16.3 (App Router), React 19.2, TypeScript `strict` |
| Styling | Tailwind CSS v4 + shadcn/ui + lucide-react |
| Database | PostgreSQL + Drizzle ORM + drizzle-kit (migrasi skema) |
| Validasi | zod |
| Tanggal | date-fns v4 + `@date-fns/tz` (semua hitungan di `Asia/Jakarta`) |
| Auth | Sesi buatan sendiri (desainnya diambil dari Go): token acak, disimpan sebagai hash SHA-256, cookie HttpOnly, berlaku 30 hari. PIN 4–8 angka, bcrypt. Admin: verifikasi Google ID token (`google-auth-library`). |
| Google Sheets | `google-auth-library` (OAuth2 + refresh token) + REST `values:batchGet` |
| Test | Vitest untuk logika murni (parser, generator, validasi, mode). Playwright untuk smoke test belakangan. |
| Deploy | Docker (`output: "standalone"`) + container Postgres, pipeline VPS/Traefik, branch `prod` |

### Catatan Next.js 16 (baca `node_modules/next/dist/docs/` sebelum menulis kode)

- `middleware.ts` sekarang **`proxy.ts`**, export `proxy`, runtime nodejs.
- `params`, `searchParams`, `cookies()`, `headers()` **async**.
- `cacheComponents` sengaja **tidak** diaktifkan. Hampir semua halaman membaca sesi login, dan dengan
  `cacheComponents` setiap pembacaan sesi wajib dibungkus `<Suspense>`. Manfaatnya kecil untuk aplikasi
  internal ini. Cache Sheets dibuat sendiri (memori + `sheet_snapshots`).
- Tipe rute (`PageProps`, `LayoutProps`) dibuat oleh `next typegen`; `pnpm typecheck` menjalankannya.
- Turbopack jadi default. `next lint` sudah dihapus, jadi ESLint dijalankan langsung.

---

## 3. Arsitektur

### Sistem lama: kenapa ada Express di samping Go

```
Browser (React SPA)
   │  /roster.json, /api/proxy/*, /api/roster/history, /log
   ▼
Express — shiftmaster/server.ts
   ├─ roster disimpan sebagai file JSON (roster.json, roster-history.json, ...)
   ├─ cron mingguan generate roster + kirim Telegram
   │  X-API-Key
   ▼
Go — jadwal-lab-upt ──OAuth──► Google Sheets
   └─ Postgres (anggota/sesi — ditambah 20 Sep 2026, belum aktif di produksi)
```

Express muncul karena dua hal:

1. **Proxy untuk menyembunyikan API key Go.** SPA berjalan di browser dan tidak bisa
   menyimpan rahasia, jadi butuh server perantara.
2. **Roster tidak pernah dipindah ke Go.** Go cuma mengurus Sheets. Roster, riwayat,
   aturan, dan generator tinggal di server frontend sebagai file JSON.

Hasilnya ada dua backend dengan tugas terpisah, ditambah file JSON yang diedit lewat git.

### Sistem baru: satu server

```
Browser (HP staf / laptop admin)
   │  HTML + data halaman, submit form (Server Action)
   ▼
Next.js — 1 container
   ├─ proxy.ts            cek cookie sesi, arahkan ke /masuk
   ├─ Halaman (Server Components)   baca DB + cache Sheets langsung di server
   ├─ Server Actions      ubah roster/anggota/aturan → cek role → audit log
   ├─ Route Handlers      /api/health, /api/cron/weekly-roster
   ├─ lib/sheets ──OAuth──► Google Sheets (cache 15 menit + snapshot di DB)
   └─ lib/db ──────────────► Postgres — container kedua
Cron di host ──► /api/cron/weekly-roster (dijaga CRON_SECRET)
```

Next.js punya server sendiri, jadi peran Express (perantara, penyimpan roster, cron) dan
peran Go (Sheets, login) ditangani oleh satu aplikasi TypeScript:

- Data diambil di Server Component. Browser tidak memanggil Sheets dan tidak memegang kunci.
- Mutasi lewat Server Action, divalidasi zod, dicek role, lalu dicatat ke `audit_log`.
- **Sheets:** hasil parse di-cache di memori selama 15 menit. Setiap fetch yang berhasil juga
  disimpan ke `sheet_snapshots`. Kalau Sheets gagal atau server restart,
  aplikasi memakai snapshot terakhir dan menampilkan "Diperbarui HH:MM".
- **Roster mingguan otomatis:** cron di host/PaaS memanggil `POST /api/cron/weekly-roster`
  Jumat 17:30 WIB. Kalau cron luar tidak tersedia, pakai scheduler di `instrumentation.ts`.
  Kalau minggu depan belum punya roster, route ini men-generate dan menerbitkannya.
  Admin tetap bisa mengedit sesudahnya.
- Email peminjam dari agenda **tidak pernah** dikirim ke browser.

Contoh alur "Hari Ini":

1. `proxy.ts` melihat ada cookie sesi.
2. Halaman membaca sesi → anggota → mode dari periode → tugas hari ini dari `assignments`
   → sesi lab dari cache Sheets.
3. HTML jadi di server lalu dikirim ke browser. Tidak ada fetch dari browser.

### Struktur folder

```
src/
  app/
    masuk/                      login: page, form PIN, tombol Google, Server Actions
    (app)/layout.tsx            shell: sidebar/bottom nav + badge mode
    (app)/page.tsx              Hari Ini
    (app)/roster/page.tsx       roster minggu ini + riwayat
    (app)/jadwal/page.tsx       jadwal lab mingguan (lecture)
    (app)/agenda/page.tsx       agenda lab (maintenance)
    (app)/akun/                 profil, tema, ganti PIN, keluar
    (app)/admin/...             lihat bagian 6
    api/health/route.ts
    api/cron/weekly-roster/route.ts
    manifest.ts, icon.svg       PWA (bisa di-install)
  proxy.ts                      cek cookie sesi → /masuk
  instrumentation.ts            migrasi DB saat server start (RUN_MIGRATIONS=true)
  lib/
    auth/                       sesi, PIN, Google, role (fungsi murni + *.test.ts)
    db/                         schema, client, seed, migrate
    period/                     resolveMode + query
    roster/                     query tugas hari ini (generator menyusul)
    sheets/                     client, parser jadwal & agenda, cache + snapshot
    env.ts, time.ts, theme.ts, audit.ts
  components/{ui,shell}/, brand, mode-badge, page-header, empty-state, theme-switcher
drizzle/                        file migrasi SQL (hasil `pnpm db:generate`)
scripts/sheets-token.mjs        buat refresh token Sheets
docs/
```

---

## 4. Data model

Semua tabel punya `created_at` / `updated_at` kecuali disebut lain. Tabel dibuat lewat
migrasi skema drizzle-kit. Isi awal hanya **seed konfigurasi** (area, ruangan, shift, kursi)
dan superadmin dari `BOOTSTRAP_SUPERADMIN_EMAIL`. Data lainnya diisi lewat aplikasi.

### Identitas

**members**

| Kolom | Tipe | Catatan |
|---|---|---|
| id | bigserial | |
| nickname / nickname_normalized | text | yang normalized UNIQUE |
| full_name | text | |
| email | text null, UNIQUE | wajib untuk admin/superadmin |
| role | `superadmin` \| `admin` \| `staff` | |
| pool | `lab` \| `studio` \| `pkl` \| null | null = tidak masuk roster (admin murni) |
| duty_label | text null | contoh "Admin Gedung 2", ditampilkan di kartu Hari Ini admin |
| max_g2_per_week | smallint null | null = default global; 0 = hanya G7 |
| pin_hash, failed_pin_attempts, pin_locked_until | | lockout 15 menit setelah 5x salah |
| active | bool | nonaktifkan, jangan hapus |

**sessions** (`token_hash` PK, `member_id`, `expires_at`) · **audit_log** (`actor_id`, `action`, `subject`, `detail` jsonb)

Aturan (desainnya diambil dari Go):

- Admin/superadmin wajib login Google. Staf login nickname + PIN.
- Ganti role, status aktif, atau PIN mencabut semua sesi anggota itu.
- Superadmin tidak bisa menurunkan atau menonaktifkan dirinya sendiri.

### Tempat

**areas** — wilayah tugas.

| Kolom | Catatan |
|---|---|
| id, code, name | contoh `g7-l3` "G7 Lantai 3" |
| building | `G2` \| `G7` |
| kind | `floor` \| `studio` \| `building` |
| pool | `lab` \| `studio` |
| sort_order | |

Seed:

| Area | kind | Ruangan |
|---|---|---|
| Studio G2 | studio | S 2.2.8, S 2.3.1, S 2.3.2 |
| G2 Lantai 2 & 3 | floor | L 2.2.1, L 2.3.3 |
| G2 Lantai 4 | floor | L 2.4.1 – L 2.4.5 |
| G7 Lantai 3 / 4 / 5 | floor | L 7.x.1 – L 7.x.3 |
| G7 Lantai 6 | floor | L 7.6.1, L 7.6.2, S 7.6.3, **L 6.2.1** |
| Gedung 2 / Gedung 7 | building | dipakai roster maintenance dan tugas PKL |

**rooms** (`code` PK seperti `L 7.3.2`, `building`, `floor`, `kind` lab/studio/virtual,
`area_id` null, `visible`). Pemetaan ruangan ke area disimpan eksplisit, jadi pengecualian
seperti L 6.2.1 tidak perlu di-hardcode. Seed `visible = false` untuk `VL.01–03`, `S 2.0.1`,
`S 4.4.1`, `S 4.4.2`. Kode ruangan dari Sheets yang belum terdaftar tampil di grup
"Lainnya", dan admin diberi peringatan.

### Shift dan kursi

**shifts**

| code | mode | Jam |
|---|---|---|
| pagi | lecture | 06:30–14:30 |
| siang | lecture | 09:30–17:30 |
| harian | maintenance | 08:00–16:00 |

**seat_templates** (`mode`, `area_id`, `shift_id`, `capacity`):

- Lecture: Studio G2 × pagi/siang = 2 kursi. Tiap area floor × pagi/siang = 1 kursi.
  Total 16 kursi per hari.
- Maintenance: Studio G2 = 4, Gedung 2 = 14, Gedung 7 = 14.

### Aturan roster

| Tabel | Isi |
|---|---|
| **member_patterns** (`member_id`, `weekday` 1–5, `shift_id`, `area_id` null) | Pola mingguan: siapa Pagi/Siang di hari apa. Untuk studio dan PKL, `area_id` ikut diisi (studio tetap, PKL per gedung). |
| **member_g2_locks** (`member_id`, `weekday`) | Wajib di G2 pada hari itu. |
| **settings** (`key`, `value` jsonb) | `max_g2_per_week_default` = 2, dll. |

### Roster

**roster_weeks**

| Kolom | Catatan |
|---|---|
| id | |
| week_start | date, Senin, UNIQUE |
| mode | mengikuti periode pada `week_start` |
| status | `draft` \| `published` |
| source | `generated` \| `manual` |
| published_at, published_by | |

**assignments** (`roster_week_id`, `date`, `area_id`, `shift_id`, `member_id`, `position`),
dengan UNIQUE (`roster_week_id`, `date`, `member_id`). Kursi kosong berarti tidak ada baris.

Riwayat = daftar `roster_weeks` yang sudah terbit.

### Kalender

- **periods** (`name`, `mode`, `start_date`, `end_date`). Contoh: "Ganjil 2026/2027" lecture, lalu "Libur Ganjil" maintenance.
- **holidays** (`date` PK, `name`, `description`).

### Sheets

**sheet_snapshots** (`source` timetable/agenda, `fetched_at`, `payload` jsonb, `error`)

### Disiapkan untuk tukar shift (bukan MVP)

**swap_requests** (`requester_id`, `target_id`, dua `assignment_id`, `status`
pending/approved/rejected/cancelled, `decided_by`, `decided_at`). Cukup **satu persetujuan**
dari admin mana pun atau superadmin. Aturan dari `shiftmaster-laravel/PRODUCT.md`: sesama
pool, hari yang sama, shift berlawanan.

---

## 5. Logika inti (port + test)

| Modul | Isi | Asal |
|---|---|---|
| `period.resolveMode(date)` | Periode yang mencakup tanggal. Kalau tidak ada: mode periode terakhir + peringatan untuk admin. | baru |
| `sheets/timetable` | Rentang baris per hari (SENIN `C6:H33` … JUMAT `C122:H149`) dan 5 slot waktu. Semua konfigurasi di satu file. Parse `"Matkul \| Kelas \| Dosen"`. Status: kosong → Empty, "BOOKED" → Booked, `"- XX"` → Schedule Conflict, lainnya → Planned. | `jadwal-lab-upt/internal/services` |
| `sheets/agenda` | Urutan kolom tetap. Tanggal Indonesia diubah ke ISO. Retry 3x saat "Loading...". Lewati header dan `#REF!`. Tag `maintenance` kalau keterangan/matkul berisi "maintenance" atau prodi berisi "laboratorium". | `jadwal-lab-upt`, `labUtils.ts` |
| `time` | Slot 07:00–08:40, 08:50–10:30, 10:40–12:20, 13:20–15:00, 15:30–17:10. NOW = di dalam slot. INCOMING = selama jeda sebelum slot (15/10/10/60/30 menit). Jumat 10:40–12:20 dikecualikan. Semua di WIB. | `lib/utils.ts` |
| `roster/generate` | Pagi/Siang tiap orang mengikuti pola. Studio dan PKL diletakkan langsung. Lantai dirotasi dalam satu shift dengan pengulangan seminimal mungkin. Kuota G2 per orang (default 2, cap per anggota, lock per hari). Retry 120x lalu ambil skor terbaik. Fungsi murni + seed acak supaya bisa dites. | `rosterGenerator.ts` |
| `roster/validate` | Pelanggaran kuota G2 dan lock G2, untuk banner admin. | `rosterValidation.ts` |
| `roster/partner` | Rekan = area sama, shift berlawanan, hari sama. Dua staf studio per shift digabung. | `Today.tsx`, `DaySchedule.tsx` |
| `roster/distribution` | Jumlah tugas G2 / G7 / Studio per orang per minggu. | `AdminRoster.tsx` |

Generator lama hanya boleh dijalankan Jumat 17:30 – Minggu karena langsung menimpa roster
aktif. Dengan status `draft`/`published`, admin bisa membuat draf kapan saja. Draf baru
terlihat staf setelah diterbitkan.

---

## 6. Halaman

Navigasi: mobile = bottom bar 4 item, desktop = sidebar kiri. Badge mode di header
("Masa Kuliah" / "Libur Semester"). Semua state penting ada di URL
(`/roster?minggu=2026-10-05&hari=selasa`) supaya bisa dibagikan.

### Staf (semua role)

| Halaman | Mode lecture | Mode maintenance |
|---|---|---|
| **Hari Ini** `/` | Kartu shift saya (shift, jam, area, rekan). Di bawahnya lab di area saya, masing-masing dengan 5 sesi dan penanda NOW/INCOMING. Varian: libur, PKL (satu gedung), admin (`duty_label`, 08:00–16:00), tidak bertugas. | Kartu tugas saya (gedung, 08:00–16:00) + agenda hari ini di gedung saya. |
| **Roster** `/roster` | Roster minggu ini per hari: area → Pagi/Siang → lab + sesi. Area saya dibuka otomatis. Tampilan tabel minggu (area × hari). Pemilih minggu untuk riwayat. Tombol "Shift Saya" untuk ringkasan pribadi. Filter nama. | Sama, dikelompokkan per gedung (Studio G2 / Gedung 2 / Gedung 7). |
| **Jadwal Lab** `/jadwal` | Jadwal kuliah mingguan: hari → gedung → lantai → lab × 5 slot. Filter gedung, lab, dosen. Hari ini terbuka otomatis. | Tidak tampil di navigasi. |
| **Agenda** `/agenda` | Tidak tampil di navigasi (URL tetap bisa diakses). | Agenda per tanggal, rentang 2/3/7 hari, dikelompokkan per lantai. Kegiatan maintenance diberi label. |
| **Akun** `/akun` | Profil, ganti PIN, tema terang/gelap/sistem, keluar, link admin. | sama |

### Admin dan superadmin

| Halaman | Isi |
|---|---|
| `/admin/roster` | Editor minggu: grid area × hari, pilih anggota per kursi. "Generate draf", "Salin ke semua hari" (untuk maintenance), "Terbitkan". Banner pelanggaran aturan, panel Distribusi, hari libur diberi arsiran. |
| `/admin/aturan` | Pola mingguan per anggota, cap G2, lock G2 per hari, default kuota. |
| `/admin/kalender` | Periode (mode per rentang tanggal) + hari libur. |
| `/admin/status` | Kondisi sinkron Sheets (terakhir berhasil, error), tombol refresh, kode ruangan tak dikenal. |

### Superadmin saja

| Halaman | Isi |
|---|---|
| `/admin/anggota` | Tambah/ubah anggota, role, pool, status aktif, set/hapus PIN. Semua tercatat di audit log. |

### Login `/masuk`

Dua pilihan: **Staf** (nickname + PIN, dengan hitung mundur lockout) dan **Admin** (tombol Google).

### Ditunda (bukan MVP)

Tukar shift (lihat bagian 4), Hall of Fame, notifikasi Telegram, mode offline,
onboarding tour, command palette, shortcut keyboard, splash screen.

---

## 7. Arah visual: clean, flat, modern

Prinsip:

1. **Flat.** Pemisah pakai border 1px, bukan bayangan. Tidak ada gradient, glow, atau pulse.
   Bayangan tipis hanya untuk overlay (dialog, sheet, dropdown).
2. **Netral dulu.** Hampir semua UI hitam-putih-abu (skala zinc). Warna hanya untuk makna.
3. **Satu aksen.** Oranye brand lama (`#FF6D1F`) khusus untuk "sekarang/aktif": penanda NOW,
   slot berjalan, fokus. Tombol utama tetap gelap (monokrom).
4. **Status tidak hanya lewat warna.** Selalu ada teks atau ikon.
5. **Mobile-first.** Pengguna utama membuka dari HP di depan lab. Target sentuh ≥ 44px.

Token (didefinisikan sekali di `globals.css` via `@theme`, komponen tidak boleh pakai warna mentah):

| Token | Terang | Gelap |
|---|---|---|
| `--background` | `#fafafa` | `#09090b` |
| `--surface` (kartu) | `#ffffff` | `#18181b` |
| `--border` | `#e4e4e7` | `#27272a` |
| `--foreground` | `#18181b` | `#fafafa` |
| `--muted-foreground` | `#71717a` | `#a1a1aa` |
| `--primary` / `--primary-foreground` | `#18181b` / `#ffffff` | `#fafafa` / `#18181b` |
| `--accent` (indikator) | `#ff6d1f` | `#ff7a33` |
| `--accent-text` (teks beraksen) | `#c2410c` | `#fb923c` |
| `--danger` (bentrok, pelanggaran) | `#dc2626` | `#f87171` |
| `--info` (booked) | `#2563eb` | `#60a5fa` |
| `--success` (diterbitkan) | `#16a34a` | `#4ade80` |

- **Pagi / Siang** dibedakan dengan label + ikon (matahari / matahari terbenam), bukan warna.
- **Tipografi:** Geist Sans. Jam dan angka pakai `tabular-nums` (atau Geist Mono).
  Skala 12 / 14 / 16 / 20 / 24, bobot 400 / 500 / 600.
- **Radius:** 8px kartu, 6px kontrol dan badge. **Spasi:** kelipatan 4px.
- **Gerak:** transisi 150ms untuk perubahan state. Tanpa animasi dekoratif.
- **shadcn/ui:** hapus kelas `shadow-*` bawaan. Card = border saja.

---

## 8. Urutan pengerjaan

**Fase 0 — Fondasi** ✅ selesai 30 Sep 2026
- Setup: TypeScript strict, Tailwind v4 + token, shadcn/ui, Drizzle + Postgres (EnvKit lokal), Vitest, Dockerfile.
- Skema + migrasi, seed konfigurasi (area, ruangan, shift, kursi, superadmin).
- Auth: login PIN + Google, sesi, `proxy.ts`, izin per role, audit log.
- Shell aplikasi (navigasi, badge mode, tema).

**Fase 1 — Staf bisa pakai (read-only)** ✅ selesai 1 Okt 2026
- Integrasi Sheets (timetable + agenda), cache + snapshot, parser + test.
- `resolveMode` + halaman Kalender admin (periode **dan** hari libur).
- Halaman Anggota (superadmin): tambah, ubah, PIN, nonaktifkan, riwayat perubahan.
- Halaman Hari Ini, Roster (+ riwayat lewat navigasi minggu), Jadwal Lab, Agenda, Akun.
- Catatan:
  - Ruangan tersembunyi juga disaring dari agenda, bukan hanya dari jadwal lab.
  - Data demo untuk development: `pnpm db:seed --demo` (18 staf fiktif + roster 2 minggu).
  - Roster hanya bisa diisi lewat seed demo sampai editor di Fase 2 selesai.

**Fase 2 — Admin mengelola** ✅ selesai 1 Okt 2026
- Editor roster (`/admin/roster`): generate draf, salin dari minggu lalu, mulai kosong, terbitkan / tarik ke draf,
  hapus draf, isi/kosongkan kursi (memilih orang yang sudah duduk di tempat lain = memindahkan), salin satu hari
  ke seluruh minggu. Banner pelanggaran aturan + panel Distribusi.
- Generator (`lib/roster/generate.ts`) ditulis ulang dengan aturan yang sama: pola Pagi/Siang, kuota G2 merata
  dengan batas per anggota, kunci G2 per hari, rotasi lantai. Random ber-seed, 200 percobaan (~20 ms), dengan test.
- Validasi (`lib/roster/validate.ts`) dan Distribusi (`lib/roster/distribution.ts`), dengan test.
- Cron `POST /api/cron/weekly-roster` (Bearer `CRON_SECRET`): kalau minggu depan belum punya roster, masa kuliah →
  generate + terbit; libur semester → salin minggu ini + terbit. Roster buatan admin tidak pernah ditimpa.
- Halaman Aturan (`/admin/aturan`): batas G2 default, pola per anggota, batas & kunci G2, cakupan Pagi/Siang per hari.
- Halaman Status (`/admin/status`): sinkron Sheets + ambil ulang, kode ruangan tak dikenal, status roster, cron.
- Mengedit roster yang sudah terbit langsung berlaku (tercatat di audit log).

**Fase 3 — Pindah**
- Rotasi credentials Google Sheets (`docs/google-sheets-credentials.md`).
- Isi anggota, PIN, pola mingguan, periode, dan libur.
- Jalan paralel dengan sistem lama di subdomain selama 1–2 minggu, cocokkan hasilnya.
- Pindah domain, arsipkan `shiftmaster` dan `jadwal-lab-upt`.

**Selesai (MVP)** = staf bisa login dan melihat shift hari ini, roster, jadwal lab, dan
agenda. Admin bisa generate/edit/terbitkan roster serta mengatur periode dan libur.
Superadmin bisa mengelola anggota. Sistem lama dimatikan.

---

## 9. Environment variables

```
DATABASE_URL=
SOURCE_SPREADSHEET_ID=          # jadwal kuliah
SOURCE_READ_RANGE=
M_SOURCE_SPREADSHEET_ID=        # agenda lab
M_SOURCE_READ_RANGE=
GOOGLE_SHEETS_CLIENT_ID=        # OAuth client "Desktop app"
GOOGLE_SHEETS_CLIENT_SECRET=
GOOGLE_SHEETS_REFRESH_TOKEN=    # dari scripts/sheets-token.mjs
GOOGLE_CLIENT_ID=               # OAuth client "Web application" untuk login admin
BOOTSTRAP_SUPERADMIN_EMAIL=
CRON_SECRET=
```
