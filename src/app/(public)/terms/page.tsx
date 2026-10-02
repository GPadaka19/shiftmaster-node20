import type { Metadata } from "next";
import { ProseLink, ProseList, ProseSection } from "@/components/prose";

export const metadata: Metadata = {
  title: "Ketentuan Layanan (Terms of Service)",
  description: "Ketentuan pemakaian Shift Master untuk staf dan admin UPT Laboratorium.",
};

const UPDATED_ON = { id: "2 Oktober 2026", en: "2 October 2026" };

export default function TermsPage() {
  return (
    <article className="grid gap-12">
      <div className="grid gap-8 text-sm leading-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Ketentuan Layanan Shift Master</h1>
          <p className="text-muted-foreground">
            Terakhir diperbarui {UPDATED_ON.id} · <ProseLink href="#english"><span lang="en">Terms of Service in English</span></ProseLink>
          </p>
        </header>

        <p>
          Shift Master adalah aplikasi internal UPT Laboratorium untuk jadwal shift, jadwal dan agenda lab, serta tukar
          shift. Dengan memakai Shift Master, kamu menyetujui ketentuan di halaman ini.
        </p>

        <ProseSection title="1. Siapa yang boleh memakai">
          <p>
            Shift Master hanya untuk staf dan admin UPT Laboratorium yang akunnya dibuat oleh admin. Tidak ada
            pendaftaran mandiri. Admin bisa menonaktifkan akun kapan saja, misalnya saat seseorang tidak lagi bertugas.
          </p>
        </ProseSection>

        <ProseSection title="2. Akun dan keamanan">
          <ProseList>
            <li>Staf masuk dengan nickname dan PIN. Admin masuk dengan akun Google yang emailnya sudah didaftarkan.</li>
            <li>Jaga kerahasiaan PIN kamu dan ganti PIN awal dari admin saat pertama kali masuk.</li>
            <li>Jangan memakai akun orang lain atau meminjamkan akunmu.</li>
            <li>Beri tahu admin kalau kamu menduga akunmu dipakai orang lain.</li>
          </ProseList>
        </ProseSection>

        <ProseSection title="3. Pemakaian yang wajar">
          <ProseList>
            <li>Pakai Shift Master hanya untuk keperluan kerja di UPT Laboratorium.</li>
            <li>Isi permintaan tukar shift dengan data yang benar.</li>
            <li>Jangan mencoba membuka halaman atau data yang bukan hakmu, atau mengganggu jalannya aplikasi.</li>
          </ProseList>
        </ProseSection>

        <ProseSection title="4. Roster dan jadwal">
          <p>
            Roster yang berlaku adalah roster yang terbit di Shift Master, baik diterbitkan admin maupun dibuat otomatis
            setiap Jumat untuk minggu berikutnya. Admin bisa mengubahnya setelah itu. Jadwal Lab dan Agenda Lab diambil
            dari spreadsheet UPT Laboratorium dan bisa tertinggal dari sumbernya; waktu pembaruan terakhir tertulis di
            halamannya. Kalau ada perbedaan, yang berlaku adalah keputusan admin.
          </p>
        </ProseSection>

        <ProseSection title="5. Ketersediaan">
          <p>
            Shift Master disediakan apa adanya untuk keperluan internal. Aplikasi bisa tidak tersedia sewaktu-waktu,
            misalnya saat pemeliharaan, dan fiturnya bisa berubah.
          </p>
        </ProseSection>

        <ProseSection title="6. Privasi">
          <p>
            Cara Shift Master memakai data kamu, termasuk data dari akun Google, dijelaskan di{" "}
            <ProseLink href="/privacy">Kebijakan Privasi</ProseLink>.
          </p>
        </ProseSection>

        <ProseSection title="7. Perubahan dan kontak">
          <p>
            Kalau ketentuan ini berubah, halaman ini diperbarui dan tanggal di atas ikut berubah. Pertanyaan bisa
            disampaikan ke admin Shift Master di UPT Laboratorium.
          </p>
        </ProseSection>
      </div>

      <div id="english" lang="en" className="grid scroll-mt-6 gap-8 border-t border-border pt-10 text-sm leading-6">
        <header className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Shift Master Terms of Service</h2>
          <p className="text-muted-foreground">Last updated {UPDATED_ON.en}</p>
        </header>

        <p>
          Shift Master is an internal app of UPT Laboratorium, a university laboratory unit, for shift schedules, the lab timetable and lab bookings,
          and shift swaps. By using Shift Master you agree to the terms on this page.
        </p>

        <ProseSection level={3} title="1. Who may use it">
          <p>
            Shift Master is only for staff and admins of UPT Laboratorium whose accounts were created by an admin. There
            is no public sign-up. An admin may deactivate an account at any time, for example when someone no longer
            works in the unit.
          </p>
        </ProseSection>

        <ProseSection level={3} title="2. Accounts and security">
          <ProseList>
            <li>Staff sign in with a nickname and a PIN. Admins sign in with a Google account whose email is registered.</li>
            <li>Keep your PIN secret and replace the initial PIN from the admin at your first sign-in.</li>
            <li>Do not use someone else&apos;s account or lend yours.</li>
            <li>Tell an admin if you suspect someone else is using your account.</li>
          </ProseList>
        </ProseSection>

        <ProseSection level={3} title="3. Acceptable use">
          <ProseList>
            <li>Use Shift Master only for work at UPT Laboratorium.</li>
            <li>Fill in shift swap requests truthfully.</li>
            <li>Do not try to open pages or data you are not entitled to, or interfere with the app.</li>
          </ProseList>
        </ProseSection>

        <ProseSection level={3} title="4. Roster and schedules">
          <p>
            The roster in force is the one published in Shift Master, either by an admin or automatically each Friday
            for the following week. Admins can change it afterwards. The lab timetable and lab bookings come from UPT
            Laboratorium&apos;s spreadsheets and can lag behind the source; each page shows when its data was last
            updated. Where they differ, the admin&apos;s decision applies.
          </p>
        </ProseSection>

        <ProseSection level={3} title="5. Availability">
          <p>
            Shift Master is provided as is for internal use. It may be unavailable at times, for example during
            maintenance, and its features may change.
          </p>
        </ProseSection>

        <ProseSection level={3} title="6. Privacy">
          <p>
            How Shift Master uses your data, including data from your Google account, is described in the{" "}
            <ProseLink href="/privacy#english">Privacy Policy</ProseLink>.
          </p>
        </ProseSection>

        <ProseSection level={3} title="7. Changes and contact">
          <p>
            If these terms change, this page is updated and the date above changes with it. Questions can be addressed
            to the Shift Master admin at UPT Laboratorium.
          </p>
        </ProseSection>
      </div>
    </article>
  );
}
