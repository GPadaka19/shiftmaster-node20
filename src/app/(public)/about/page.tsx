import {
  ArrowLeftRight,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  LayoutGrid,
  SquarePen,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ProseLink, ProseList, ProseSection } from "@/components/prose";
import { Button } from "@/components/ui/button";

// The public home page: proxy.ts serves this at "/" to visitors who are not
// signed in. Google's OAuth branding check needs a home page that is open
// without a login, shows the app name, explains what the app is for and how it
// uses Google data, and links to the privacy policy.
export const metadata: Metadata = {
  title: { absolute: "Shift Master" },
  description:
    "Shift Master adalah aplikasi internal UPT Laboratorium untuk melihat jadwal shift, jadwal dan agenda lab, serta tukar shift antarstaf.",
};

const FEATURES: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: CalendarCheck,
    title: "Hari Ini",
    description: "Tugas kamu hari ini: shift, jam, area, dan rekan satu area, beserta jadwal atau agenda lab di areamu.",
  },
  {
    icon: LayoutGrid,
    title: "Roster",
    description: "Roster mingguan Senin sampai Jumat: siapa bertugas di area dan shift mana, termasuk minggu-minggu sebelumnya.",
  },
  {
    icon: CalendarDays,
    title: "Jadwal Lab",
    description: "Jadwal kuliah tiap ruang lab per hari, dengan penanda ruang terisi, kosong, atau bentrok.",
  },
  {
    icon: ClipboardList,
    title: "Agenda Lab",
    description: "Peminjaman lab dan kegiatan maintenance beberapa hari ke depan. Tampil di menu saat libur semester.",
  },
  {
    icon: ArrowLeftRight,
    title: "Tukar Shift",
    description: "Staf mengajukan tukar shift ke rekan satu pool. Setelah rekan itu menerima, admin menyetujuinya.",
  },
  {
    icon: SquarePen,
    title: "Kelola roster",
    description: "Admin menyusun dan menerbitkan roster serta mengatur pola shift dan kalender periode.",
  },
];

export default function AboutPage() {
  return (
    <div className="grid gap-12">
      <section className="grid gap-4">
        <p className="text-sm font-medium text-muted-foreground">
          Aplikasi internal UPT Laboratorium ·{" "}
          <ProseLink href="#english">
            <span lang="en">English</span>
          </ProseLink>
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Shift Master</h1>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground">
          Shift Master adalah aplikasi jadwal kerja untuk staf UPT Laboratorium. Di sini staf melihat shift mereka hari
          ini, roster mingguan, jadwal pemakaian lab, dan agenda lab, serta mengajukan tukar shift. Admin memakainya
          untuk menyusun dan menerbitkan roster.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button asChild className="h-11 px-5 text-base">
            <Link href="/login">Masuk</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 px-5 text-base">
            <Link href="/privacy">Kebijakan Privasi</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4">
        <h2 className="text-base font-semibold tracking-tight">Yang bisa dilakukan di Shift Master</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <li key={title} className="flex gap-3 rounded-lg border border-border bg-card p-4">
              <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="grid gap-1 text-sm">
                <h3 className="font-medium">{title}</h3>
                <p className="text-muted-foreground">{description}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-8 text-sm leading-6">
        <ProseSection title="Siapa yang memakai">
          <p>
            Shift Master hanya untuk staf dan admin UPT Laboratorium. Tidak ada pendaftaran mandiri: setiap akun dibuat
            oleh admin. Staf masuk dengan nickname dan PIN, sedangkan admin masuk dengan akun Google.
          </p>
        </ProseSection>

        <ProseSection title="Kenapa Shift Master memakai akun Google">
          <p>
            Tombol masuk Google dipakai hanya untuk memastikan bahwa yang masuk adalah admin yang sudah
            terdaftar. Dari akun Google, Shift Master hanya memakai alamat email untuk dicocokkan dengan daftar admin.
            Shift Master tidak meminta akses ke Gmail, Drive, Kalender, kontak, atau data Google lain milikmu, dan tidak
            menyimpan nama, foto profil, atau token Google kamu.
          </p>
          <p>
            Jadwal Lab dan Agenda Lab dibaca dari dua spreadsheet Google Sheets milik UPT Laboratorium lewat akun
            pengelola dengan akses baca saja. Spreadsheet milik pengguna tidak pernah dibaca.
          </p>
          <p>
            Rinciannya ada di <ProseLink href="/privacy">Kebijakan Privasi</ProseLink> dan{" "}
            <ProseLink href="/terms">Ketentuan Layanan</ProseLink>.
          </p>
        </ProseSection>

        <section id="english" lang="en" className="grid scroll-mt-6 gap-2 border-t border-border pt-8">
          <h2 className="text-base font-semibold tracking-tight">About Shift Master (English)</h2>
          <div className="grid gap-2 text-muted-foreground">
            <p>
              Shift Master is an internal scheduling app for the staff of UPT Laboratorium, a university laboratory
              unit. Its purpose is to show each staff member their shift for today, publish the weekly duty roster, show
              the lab timetable and lab bookings, and let staff request shift swaps that a colleague accepts and an admin approves. Admins use
              it to build and publish the roster.
            </p>
            <ProseList>
              <li>Accounts are created by an admin. There is no public sign-up.</li>
              <li>Staff sign in with a nickname and a PIN. Admins sign in with Google.</li>
              <li>
                Google Sign-In is used only to confirm that the person signing in is a registered admin. Shift Master
                uses the email address of the Google account for that check and nothing else. It does not request
                access to Gmail, Drive, Calendar, contacts or any other Google data, and it does not store the
                Google name, profile picture or tokens.
              </li>
              <li>
                The lab timetable and lab bookings are read from two Google Sheets spreadsheets owned by UPT
                Laboratorium, through the operator&apos;s account with read-only access. Users&apos; own spreadsheets
                are never read.
              </li>
            </ProseList>
            <p>
              See the <ProseLink href="/privacy#english">Privacy Policy</ProseLink> and the{" "}
              <ProseLink href="/terms#english">Terms of Service</ProseLink> for details.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
