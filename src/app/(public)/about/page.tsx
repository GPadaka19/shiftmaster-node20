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
import type { ReactNode } from "react";
import { ProseLink, ProseSection } from "@/components/prose";
import { Button } from "@/components/ui/button";
import type { PublicLang } from "@/lib/public-lang";

// The public home page: proxy.ts serves this at "/" to visitors who are not
// signed in. Google's OAuth branding check needs a home page that is open
// without a login, shows the app name, explains what the app is for and how it
// uses Google data, and links to the privacy policy. Both languages are in the
// HTML; the header switch shows one.
export const metadata: Metadata = {
  title: { absolute: "Shift Master" },
  description:
    "Shift Master adalah aplikasi internal UPT Laboratorium untuk melihat jadwal shift, jadwal dan agenda lab, serta tukar shift antarstaf.",
};

type Copy = {
  eyebrow: string;
  intro: string;
  signIn: string;
  privacy: string;
  featuresTitle: string;
  features: { icon: LucideIcon; title: string; description: string }[];
  sections: { title: string; body: ReactNode }[];
};

const COPY: Record<PublicLang, Copy> = {
  id: {
    eyebrow: "Aplikasi internal UPT Laboratorium",
    intro:
      "Shift Master adalah aplikasi jadwal kerja untuk staf UPT Laboratorium. Di sini staf melihat shift mereka hari ini, roster mingguan, jadwal pemakaian lab, dan agenda lab, serta mengajukan tukar shift. Admin memakainya untuk menyusun dan menerbitkan roster.",
    signIn: "Masuk",
    privacy: "Kebijakan Privasi",
    featuresTitle: "Yang bisa dilakukan di Shift Master",
    features: [
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
    ],
    sections: [
      {
        title: "Siapa yang memakai",
        body: (
          <p>
            Shift Master hanya untuk staf dan admin UPT Laboratorium. Tidak ada pendaftaran mandiri: setiap akun dibuat
            oleh admin. Staf masuk dengan nickname dan PIN, sedangkan admin masuk dengan akun Google.
          </p>
        ),
      },
      {
        title: "Kenapa Shift Master memakai akun Google",
        body: (
          <>
            <p>
              Tombol masuk Google dipakai hanya untuk memastikan bahwa yang masuk adalah admin yang sudah terdaftar.
              Dari akun Google, Shift Master hanya memakai alamat email untuk dicocokkan dengan daftar admin. Shift
              Master tidak meminta akses ke Gmail, Drive, Kalender, kontak, atau data Google lain milikmu, dan tidak
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
          </>
        ),
      },
    ],
  },
  en: {
    eyebrow: "Internal app of UPT Laboratorium",
    intro:
      "Shift Master is a work scheduling app for the staff of UPT Laboratorium, a university laboratory unit. Staff use it to see today's shift, the weekly roster, the lab timetable and lab bookings, and to request shift swaps. Admins use it to build and publish the roster.",
    signIn: "Sign in",
    privacy: "Privacy Policy",
    featuresTitle: "What you can do in Shift Master",
    features: [
      {
        icon: CalendarCheck,
        title: "Today",
        description: "Your duty today: shift, hours, area and colleagues in the same area, with the lab timetable or bookings for your area.",
      },
      {
        icon: LayoutGrid,
        title: "Roster",
        description: "The weekly roster, Monday to Friday: who works in which area and shift, including earlier weeks.",
      },
      {
        icon: CalendarDays,
        title: "Lab timetable",
        description: "Each lab room's lectures per day, marked as in use, free or double-booked.",
      },
      {
        icon: ClipboardList,
        title: "Lab bookings",
        description: "Lab bookings and maintenance for the next few days. Shown in the menu during the semester break.",
      },
      {
        icon: ArrowLeftRight,
        title: "Shift swaps",
        description: "Staff ask a colleague in the same pool to swap shifts. Once the colleague accepts, an admin approves.",
      },
      {
        icon: SquarePen,
        title: "Roster management",
        description: "Admins build and publish the roster and set shift patterns and the period calendar.",
      },
    ],
    sections: [
      {
        title: "Who uses it",
        body: (
          <p>
            Shift Master is only for the staff and admins of UPT Laboratorium. There is no public sign-up: every account
            is created by an admin. Staff sign in with a nickname and a PIN; admins sign in with Google.
          </p>
        ),
      },
      {
        title: "Why Shift Master uses Google accounts",
        body: (
          <>
            <p>
              Google Sign-In is used only to confirm that the person signing in is a registered admin. Shift Master uses
              the email address of the Google account for that check and nothing else. It does not request access to
              Gmail, Drive, Calendar, contacts or any other Google data of yours, and it does not store your Google
              name, profile picture or tokens.
            </p>
            <p>
              The lab timetable and lab bookings are read from two Google Sheets spreadsheets owned by UPT Laboratorium,
              through the operator&apos;s account with read-only access. Users&apos; own spreadsheets are never read.
            </p>
            <p>
              Details are in the <ProseLink href="/privacy#english">Privacy Policy</ProseLink> and the{" "}
              <ProseLink href="/terms#english">Terms of Service</ProseLink>.
            </p>
          </>
        ),
      },
    ],
  },
};

export default function AboutPage() {
  return (
    <>
      <Home lang="id" />
      <Home lang="en" />
    </>
  );
}

function Home({ lang }: { lang: PublicLang }) {
  const copy = COPY[lang];
  return (
    <div data-lang={lang} lang={lang} id={lang === "en" ? "english" : undefined} className="grid gap-12">
      <section className="grid gap-4">
        <p className="text-sm font-medium text-muted-foreground">{copy.eyebrow}</p>
        {/* The app name stays the page's only h1 text in both languages. */}
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Shift Master</h1>
        <p className="max-w-3xl text-base leading-7 text-muted-foreground">{copy.intro}</p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button asChild className="h-11 px-5 text-base">
            <Link href="/login">{copy.signIn}</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 px-5 text-base">
            <Link href="/privacy">{copy.privacy}</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4">
        <h2 className="text-base font-semibold tracking-tight">{copy.featuresTitle}</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {copy.features.map(({ icon: Icon, title, description }) => (
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

      <div className="grid gap-8 text-sm leading-6 lg:grid-cols-2 lg:gap-12">
        {copy.sections.map(({ title, body }) => (
          <ProseSection key={title} title={title}>
            {body}
          </ProseSection>
        ))}
      </div>
    </div>
  );
}
