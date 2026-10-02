import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "@/components/brand";
import { SESSION_TTL_DAYS } from "@/lib/auth/constants";

export const metadata = {
  title: "Kebijakan Privasi",
  description: "Data apa yang disimpan ShiftMaster, untuk apa, dan bagaimana data dari Google dipakai.",
};

const UPDATED_ON = "1 Oktober 2026";

// Public: reachable without a session (see proxy.ts), because Google's OAuth
// branding check needs to open it.
export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 lg:py-16">
      <Link href="/login" className="inline-flex rounded-md">
        <Brand />
      </Link>

      <header className="mt-10 mb-8 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Kebijakan Privasi</h1>
        <p className="text-sm text-muted-foreground">Terakhir diperbarui {UPDATED_ON}</p>
      </header>

      <div className="grid gap-8 text-sm leading-6">
        <p>
          ShiftMaster adalah aplikasi internal UPT Laboratorium untuk melihat jadwal shift, jadwal lab, dan mengajukan
          tukar shift. Aplikasi ini hanya bisa dipakai oleh staf dan admin yang akunnya sudah didaftarkan oleh admin.
        </p>

        <Section title="Data yang kami simpan">
          <ul className="grid list-disc gap-1.5 pl-5">
            <li>Nama lengkap, nickname, peran, dan kelompok roster kamu, yang diisi oleh admin.</li>
            <li>Alamat email, hanya untuk akun admin, sebagai penanda akun saat masuk dengan Google.</li>
            <li>PIN staf, disimpan dalam bentuk hash sehingga PIN aslinya tidak bisa dibaca siapa pun.</li>
            <li>Jadwal shift kamu dan permintaan tukar shift, termasuk alasan yang kamu tulis.</li>
            <li>Catatan perubahan yang dilakukan di aplikasi (siapa mengubah apa dan kapan).</li>
          </ul>
        </Section>

        <Section title="Masuk dengan Google">
          <p>
            Hanya admin yang masuk dengan Google. Saat itu Google mengirimkan tanda identitas ke ShiftMaster, dan kami
            hanya memakai alamat email di dalamnya untuk mencocokkan dengan akun admin yang sudah terdaftar. Kami tidak
            menyimpan nama, foto profil, atau token Google kamu, dan tidak meminta akses ke Gmail, Drive, Kalender, atau
            data Google lainnya.
          </p>
          <p>Kalau email kamu tidak terdaftar sebagai admin, permintaan masuk ditolak dan email itu tidak disimpan.</p>
        </Section>

        <Section title="Cookie dan penyimpanan di perangkat">
          <p>
            Setelah kamu masuk, ShiftMaster memasang satu cookie sesi supaya kamu tetap masuk selama {SESSION_TTL_DAYS}{" "}
            hari atau sampai kamu keluar. Pilihan tema terang atau gelap disimpan di perangkatmu saja. Tidak ada cookie
            iklan atau pelacak.
          </p>
        </Section>

        <Section title="Untuk apa data dipakai">
          <p>
            Data dipakai hanya untuk menjalankan aplikasi: mengenali siapa yang masuk, menyusun dan menampilkan roster,
            serta memproses tukar shift. Kami tidak menjual data dan tidak memakainya untuk iklan.
          </p>
        </Section>

        <Section title="Siapa yang bisa melihat data">
          <p>
            Nama dan jadwal shift terlihat oleh sesama pengguna ShiftMaster yang sudah masuk. Email dan pengaturan akun
            hanya terlihat oleh admin. Data tidak dibagikan ke pihak di luar UPT Laboratorium, kecuali penyedia
            infrastruktur yang menjalankan aplikasi ini, yaitu server tempat aplikasi berjalan dan Cloudflare sebagai
            perantara jaringan.
          </p>
        </Section>

        <Section title="Berapa lama data disimpan">
          <p>
            Data akun disimpan selama kamu masih terdaftar di ShiftMaster. Sesi masuk berakhir setelah {SESSION_TTL_DAYS}{" "}
            hari. Riwayat roster dan catatan perubahan disimpan sebagai arsip kerja UPT Laboratorium.
          </p>
        </Section>

        <Section title="Hak kamu">
          <p>
            Kamu bisa meminta admin ShiftMaster di UPT Laboratorium untuk memperbaiki data kamu, menonaktifkan akun, atau
            menghapus data akunmu. Pertanyaan soal kebijakan ini juga bisa disampaikan ke admin yang sama.
          </p>
        </Section>

        <Section title="Perubahan kebijakan">
          <p>Kalau kebijakan ini berubah, halaman ini diperbarui dan tanggal di atas ikut berubah.</p>
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-2">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <div className="grid gap-2 text-muted-foreground">{children}</div>
    </section>
  );
}
