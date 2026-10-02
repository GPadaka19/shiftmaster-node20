import type { Metadata } from "next";
import { ProseLink, ProseList, ProseSection } from "@/components/prose";
import { ACTIVITY_RETENTION_DAYS } from "@/lib/activity/constants";
import { PIN_LOCK_MINUTES, PIN_MAX_ATTEMPTS, SESSION_TTL_DAYS } from "@/lib/auth/constants";

export const metadata: Metadata = {
  title: "Kebijakan Privasi (Privacy Policy)",
  description:
    "Kebijakan privasi Shift Master: data yang dikumpulkan dan cara data itu dipakai, disimpan, dibagikan, dan dihapus, termasuk data pengguna Google. Shift Master privacy policy: what data is collected and how it is used, stored, shared and deleted, including Google user data.",
};

const UPDATED_ON = { id: "2 Oktober 2026", en: "2 October 2026" };
const GOOGLE_USER_DATA_POLICY = "https://developers.google.com/terms/api-services-user-data-policy";

// Google's OAuth branding check reads this page. It has to say, for Google user
// data specifically, what is accessed, how it is used, stored and shared, how
// it is protected, and how long it is kept. Keep it true to the code: update it
// when what the app stores or reads from Google changes.
export default function PrivacyPage() {
  return (
    <article className="grid gap-12">
      <div className="grid gap-8 text-sm leading-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Kebijakan Privasi Shift Master</h1>
          <p className="text-muted-foreground">
            Terakhir diperbarui {UPDATED_ON.id} · <ProseLink href="#english"><span lang="en">Privacy Policy in English</span></ProseLink>
          </p>
        </header>

        <p>
          Shift Master adalah aplikasi internal UPT Laboratorium untuk melihat jadwal shift, jadwal dan agenda lab,
          serta mengajukan tukar shift. Aplikasi ini beralamat di sm.gpadaka.com dan hanya dipakai oleh staf dan admin
          yang akunnya dibuat oleh admin. Kebijakan ini menjelaskan data apa yang dikumpulkan Shift Master, untuk apa
          data itu dipakai, di mana disimpan, dengan siapa dibagikan, dan bagaimana cara memintanya dihapus.
        </p>

        <ProseSection title="1. Data yang dikumpulkan">
          <p>Shift Master menyimpan data berikut tentang kamu:</p>
          <ProseList>
            <li>
              <strong>Data akun</strong>, diisi oleh admin: nama lengkap,
              nickname, peran (staf, admin, atau superadmin), pool roster (Lab, Studio, atau PKL), label tugas, tanggal
              mulai bertugas, dan status akun aktif atau nonaktif. Alamat email wajib untuk akun admin dan opsional
              untuk staf.
            </li>
            <li>
              <strong>PIN staf</strong>, disimpan hanya sebagai hash bcrypt
              sehingga PIN yang kamu pilih tidak bisa dibaca siapa pun, termasuk admin. Admin hanya bisa menggantinya
              dengan PIN awal, yang wajib kamu ganti saat masuk berikutnya.
            </li>
            <li>
              <strong>Data kerja</strong>: jadwal shift kamu di roster, pola
              shift mingguan dan aturan penempatanmu, serta permintaan tukar shift beserta alasan dan catatan yang
              ditulis.
            </li>
            <li>
              <strong>Catatan perubahan</strong>: siapa mengubah apa dan kapan,
              misalnya menerbitkan roster, mengubah data anggota, atau mengganti PIN.
            </li>
            <li>
              <strong>Data sesi</strong>: hash dari token sesi, waktu masuk, dan
              waktu sesi berakhir, serta jumlah percobaan PIN yang salah.
            </li>
            <li>
              <strong>Data pemakaian</strong>: kapan kamu masuk, halaman yang kamu buka, dan nama tombol yang kamu
              tekan. Teks yang kamu ketik, termasuk PIN dan alasan tukar shift, tidak ikut dicatat.
            </li>
          </ProseList>
          <p>
            Shift Master tidak menyimpan alamat IP, lokasi, atau data perangkat di databasenya. Data pemakaian dicatat
            oleh Shift Master sendiri; tidak ada layanan analitik pihak ketiga atau pelacak iklan.
          </p>
        </ProseSection>

        <ProseSection id="google" title="2. Data pengguna Google">
          <p>
            <strong>Yang diakses.</strong> Hanya admin yang masuk dengan Google.
            Saat admin menekan tombol masuk Google, Google mengirim tanda identitas (ID token) ke Shift Master, hanya
            dengan izin dasar untuk masuk (openid, email, profile). Tanda itu berisi ID akun Google, alamat email, status
            verifikasi email, nama, dan foto profil. Shift Master tidak meminta izin ke Gmail, Drive, Kalender, kontak,
            atau data Google lain milikmu.
          </p>
          <p>
            <strong>Cara dipakai.</strong> Dari tanda itu Shift Master hanya
            membaca alamat email dan status verifikasinya, lalu mencocokkannya dengan daftar admin yang sudah
            didaftarkan. Tujuannya satu: memastikan bahwa yang masuk memang admin terdaftar. Data Google tidak dipakai
            untuk iklan, pembuatan profil, atau melatih model AI.
          </p>
          <p>
            <strong>Cara disimpan.</strong> Shift Master tidak menyimpan ID
            akun Google, nama, foto profil, atau ID token milik orang yang masuk dengan Google, dan proses masuk itu
            tidak memberi Shift Master token akses atau token refresh untuk akun Google orang tersebut. Alamat email
            admin yang ada di database adalah email yang dimasukkan pengelola atau superadmin saat akun didaftarkan,
            bukan salinan dari Google.
            Kalau email Google kamu tidak terdaftar sebagai admin, permintaan masuk ditolak dan email itu tidak
            disimpan.
          </p>
          <p>
            <strong>Dengan siapa dibagikan.</strong> Data pengguna Google tidak
            dijual dan tidak dibagikan atau dipindahkan ke pihak ketiga mana pun. Permintaan masuk hanya melewati
            infrastruktur yang menjalankan aplikasi (lihat bagian 4) untuk sampai ke Shift Master.
          </p>
          <p>
            <strong>Google Sheets.</strong> Jadwal Lab dan Agenda Lab dibaca
            dari dua spreadsheet milik UPT Laboratorium lewat satu akun Google milik pengelola, dengan izin baca saja
            (spreadsheets.readonly). Token untuk akun pengelola itu adalah satu-satunya token Google yang disimpan
            Shift Master. Token itu ada di konfigurasi server, bukan di database, dan hanya dipakai untuk membaca dua
            spreadsheet tersebut. Isinya adalah jadwal kuliah (ruang, mata kuliah, kelas, nama dosen) dan agenda
            peminjaman lab (ruang, waktu, kegiatan, nama peminjam, keterangan). Kolom lain di lembar agenda, termasuk
            alamat email peminjam, ikut terbaca dari Google tetapi langsung dibuang: tidak disimpan dan tidak
            ditampilkan. Salinan terakhir disimpan di database supaya tetap tampil saat Google Sheets tidak
            bisa dihubungi, dan diganti setiap kali data diperbarui. Shift Master tidak pernah membaca spreadsheet milik
            pengguna dan tidak mengubah spreadsheet apa pun.
          </p>
          <p>
            Penggunaan dan pemindahan informasi yang diterima Shift Master dari Google API mematuhi{" "}
            <ProseLink href={GOOGLE_USER_DATA_POLICY}>Google API Services User Data Policy</ProseLink>, termasuk
            ketentuan Limited Use.
          </p>
        </ProseSection>

        <ProseSection title="3. Untuk apa data dipakai">
          <ProseList>
            <li>Mengenali siapa yang masuk dan menentukan halaman yang boleh dibuka sesuai perannya.</li>
            <li>Menyusun, menerbitkan, dan menampilkan roster serta jadwal dan agenda lab.</li>
            <li>Memproses permintaan tukar shift antara dua staf dan persetujuan admin.</li>
            <li>Mencatat perubahan supaya kesalahan pada roster bisa ditelusuri.</li>
            <li>Melihat seberapa sering Shift Master dipakai dan oleh siapa, lewat data pemakaian.</li>
          </ProseList>
          <p>Data tidak dipakai untuk tujuan lain, tidak dijual, dan tidak dipakai untuk iklan.</p>
        </ProseSection>

        <ProseSection title="4. Siapa yang bisa melihat data">
          <ProseList>
            <li>Nickname dan jadwal shift terlihat oleh sesama pengguna Shift Master yang sudah masuk.</li>
            <li>Permintaan tukar shift dan alasannya terlihat oleh kedua staf yang terlibat dan oleh admin.</li>
            <li>Data pemakaian terlihat oleh admin, sebagai jumlah per anggota dan per tombol.</li>
            <li>
              Jadwal dan agenda lab, termasuk nama dosen dan nama peminjam, terlihat oleh semua pengguna Shift Master
              yang sudah masuk.
            </li>
            <li>
              Nama lengkap dan email admin hanya terlihat oleh superadmin dan pemilik akun. Catatan perubahan akun hanya
              terlihat oleh superadmin.
            </li>
          </ProseList>
          <p>
            Data tidak dibagikan ke pihak di luar UPT Laboratorium. Pengecualiannya hanya penyedia infrastruktur yang
            menjalankan aplikasi: server tempat aplikasi dan database berjalan, serta Cloudflare sebagai perantara
            jaringan yang dilewati seluruh lalu lintas antara browser dan server. Cloudflare memprosesnya, termasuk data
            teknis seperti alamat IP, hanya untuk mengantarkan dan mengamankan lalu lintas.
          </p>
        </ProseSection>

        <ProseSection title="5. Cookie dan penyimpanan di perangkat">
          <p>
            Setelah kamu masuk, Shift Master memasang satu cookie sesi supaya kamu tetap masuk selama {SESSION_TTL_DAYS}{" "}
            hari atau sampai kamu keluar. Pilihan tema terang atau gelap disimpan di perangkatmu saja. Kalau
            kamu menutup kartu ajakan memasang aplikasi, hal itu juga dicatat di perangkatmu saja, dan browser menyimpan
            satu halaman pemberitahuan untuk saat tidak ada koneksi. Tombol masuk Google dimuat dari Google dan bisa
            memasang cookie milik Google sendiri. Tidak ada cookie iklan atau pelacak.
          </p>
        </ProseSection>

        <ProseSection title="6. Keamanan">
          <ProseList>
            <li>Seluruh lalu lintas memakai HTTPS.</li>
            <li>PIN disimpan sebagai hash bcrypt, dan token sesi disimpan sebagai hash SHA-256.</li>
            <li>Cookie sesi tidak bisa dibaca oleh skrip di halaman.</li>
            <li>
              Setelah {PIN_MAX_ATTEMPTS} kali salah PIN, akun dikunci selama {PIN_LOCK_MINUTES} menit.
            </li>
            <li>Setiap halaman dan tindakan memeriksa sesi dan peran di server.</li>
          </ProseList>
        </ProseSection>

        <ProseSection title="7. Berapa lama data disimpan dan cara menghapusnya">
          <ProseList>
            <li>Data akun disimpan selama kamu masih terdaftar di Shift Master.</li>
            <li>
              Sesi masuk berakhir setelah {SESSION_TTL_DAYS} hari, saat kamu keluar, atau saat PIN, peran, atau status
              akunmu berubah. Sesi yang sudah berakhir dihapus dari database.
            </li>
            <li>Riwayat roster, tukar shift, dan catatan perubahan disimpan sebagai arsip kerja UPT Laboratorium.</li>
            <li>Data pemakaian dihapus setelah {ACTIVITY_RETENTION_DAYS} hari.</li>
            <li>Salinan data Google Sheets diganti setiap kali data diperbarui.</li>
            <li>
              Database dicadangkan sekali sehari di server yang sama, dan 14 cadangan terakhir disimpan. Data yang sudah
              dihapus masih ada di cadangan sampai cadangan itu tergantikan, paling lama sekitar 14 hari.
            </li>
          </ProseList>
          <p>
            Kamu bisa meminta admin Shift Master di UPT Laboratorium untuk memperbaiki data kamu, menonaktifkan akunmu,
            atau menghapus data akunmu. Akun yang dinonaktifkan tidak bisa masuk lagi. Permintaan penghapusan dikerjakan
            pengelola langsung di database: akunmu dinonaktifkan, sesi masukmu dihapus, dan nama lengkap, nickname,
            email, serta PIN-mu dihapus atau diganti dengan penanda anonim, termasuk di catatan perubahan. Riwayat
            roster dan tukar shift tetap disimpan dengan penanda anonim itu.
          </p>
        </ProseSection>

        <ProseSection title="8. Perubahan kebijakan">
          <p>
            Kalau cara Shift Master memakai data berubah, halaman ini diperbarui sebelum perubahan itu berlaku dan
            tanggal di atas ikut berubah.
          </p>
        </ProseSection>

        <ProseSection title="9. Kontak">
          <p>
            Pertanyaan atau permintaan soal data kamu bisa disampaikan ke admin Shift Master di UPT Laboratorium.
          </p>
        </ProseSection>
      </div>

      <div id="english" lang="en" className="grid scroll-mt-6 gap-8 border-t border-border pt-10 text-sm leading-6">
        <header className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Shift Master Privacy Policy</h2>
          <p className="text-muted-foreground">Last updated {UPDATED_ON.en}</p>
        </header>

        <p>
          Shift Master is an internal app of UPT Laboratorium, a university laboratory unit, for viewing shift
          schedules, the lab timetable and lab bookings, and for requesting shift swaps. It is served at sm.gpadaka.com
          and is used only by staff and admins whose accounts were created by an admin. This policy explains what data
          Shift Master collects, how the data is used, where it is stored, with whom it is shared, and how to have it
          deleted.
        </p>

        <ProseSection level={3} title="1. Data collected">
          <p>Shift Master stores the following data about you:</p>
          <ProseList>
            <li>
              <strong>Account data</strong>, entered by an admin: full name,
              nickname, role (staff, admin or superadmin), roster pool (Lab, Studio or PKL), duty label, start date, and
              whether the account is active. An email address is required for admin accounts and optional for staff.
            </li>
            <li>
              <strong>Staff PIN</strong>, stored only as a bcrypt hash, so
              nobody, including admins, can read the PIN you choose. An admin can only replace it with a starting PIN,
              which you must change at your next sign-in.
            </li>
            <li>
              <strong>Work data</strong>: your shifts in the roster, your weekly
              shift pattern and placement rules, and shift swap requests with the reason and notes that were written.
            </li>
            <li>
              <strong>Change log</strong>: who changed what and when, for
              example publishing a roster, editing a member, or changing a PIN.
            </li>
            <li>
              <strong>Session data</strong>: a hash of the session token, the
              sign-in time and the session expiry time, and the number of wrong PIN attempts.
            </li>
            <li>
              <strong>Usage data</strong>: when you sign in, which pages you open, and the names of the buttons you
              press. Text you type, including your PIN and shift swap reasons, is not recorded.
            </li>
          </ProseList>
          <p>
            Shift Master does not store IP addresses, location or device data in its database. Usage data is recorded
            by Shift Master itself; there is no third-party analytics service and no advertising tracker.
          </p>
        </ProseSection>

        <ProseSection level={3} title="2. Google user data">
          <p>
            <strong>What is accessed.</strong> Only admins sign in with Google.
            When an admin uses the Sign in with Google button, Google sends Shift Master an ID token under the basic
            sign-in scopes only (openid, email, profile). The token contains the Google account ID, email address,
            email verification status, name and profile picture. Shift Master does not request access to Gmail, Drive,
            Calendar, contacts or any other Google data of yours.
          </p>
          <p>
            <strong>How it is used.</strong> From that token Shift Master reads
            only the email address and its verification status, and compares the email with the list of registered
            admins. The single purpose is to confirm that the person signing in is a registered admin. Google user data
            is not used for advertising, profiling, or training AI models.
          </p>
          <p>
            <strong>How it is stored.</strong> Shift Master does not store the
            Google account ID, name, profile picture or ID token of anyone who signs in with Google, and sign-in gives
            it no access token or refresh token for that person&apos;s Google account. The admin email address in the
            database is the one entered by the operator or a superadmin when the account was registered, not a copy
            taken from Google. If your Google email is not registered as an admin, the sign-in is rejected and the email is not
            stored.
          </p>
          <p>
            <strong>Who it is shared with.</strong> Google user data is not
            sold and is not shared with or transferred to any third party. The sign-in request only passes through the
            infrastructure that runs the app (see section 4) on its way to Shift Master.
          </p>
          <p>
            <strong>Google Sheets.</strong> The lab timetable and lab bookings
            are read from two spreadsheets owned by UPT Laboratorium, through a single Google account belonging to the
            operator, with read-only permission (spreadsheets.readonly). The token for that operator account is the only
            Google token Shift Master keeps. It is held in the server configuration, not in the database, and is used
            only to read those two spreadsheets. They contain the lecture timetable (room, course, class, lecturer
            name) and lab bookings (room, time, activity, borrower name, notes). Other columns of the bookings sheet,
            including the borrower&apos;s email address, are received from Google but discarded immediately: they are
            not stored and not shown. The latest copy is kept in the database so the
            schedule still shows when Google Sheets cannot be reached, and it is replaced every time the data is
            refreshed. Shift Master never reads users&apos; own spreadsheets and never changes any spreadsheet.
          </p>
          <p>
            Shift Master&apos;s use and transfer of information received from Google APIs adheres to the{" "}
            <ProseLink href={GOOGLE_USER_DATA_POLICY}>Google API Services User Data Policy</ProseLink>, including the
            Limited Use requirements.
          </p>
        </ProseSection>

        <ProseSection level={3} title="3. How data is used">
          <ProseList>
            <li>To recognise who is signed in and decide which pages their role may open.</li>
            <li>To build, publish and show the roster, the lab timetable and lab bookings.</li>
            <li>To process shift swap requests between two staff members and the admin&apos;s approval.</li>
            <li>To record changes so that mistakes in the roster can be traced.</li>
            <li>To see how often Shift Master is used and by whom, from the usage data.</li>
          </ProseList>
          <p>Data is not used for any other purpose, is not sold, and is not used for advertising.</p>
        </ProseSection>

        <ProseSection level={3} title="4. Who can see the data">
          <ProseList>
            <li>Nicknames and shifts are visible to other signed-in Shift Master users.</li>
            <li>A shift swap request and its reason are visible to the two staff members involved and to admins.</li>
            <li>Usage data is visible to admins, as counts per member and per button.</li>
            <li>
              The lab timetable and lab bookings, including lecturer and borrower names, are visible to all signed-in
              Shift Master users.
            </li>
            <li>
              Full names and admin emails are visible only to superadmins and the account owner. Account change logs are
              visible only to superadmins.
            </li>
          </ProseList>
          <p>
            Data is not shared outside UPT Laboratorium. The only exception is the infrastructure that runs the app: the
            server that hosts the app and its database, and Cloudflare as the network proxy that all traffic between
            the browser and the server passes through. Cloudflare processes it, including technical data such as IP
            addresses, only to deliver and protect traffic.
          </p>
        </ProseSection>

        <ProseSection level={3} title="5. Cookies and device storage">
          <p>
            After you sign in, Shift Master sets one session cookie that keeps you signed in for {SESSION_TTL_DAYS} days
            or until you sign out. Your light or dark theme choice is stored on your device only. If you
            close the card that invites you to install the app, that is also remembered on your device only, and the
            browser keeps one notice page for when there is no connection. The Sign in with Google button is loaded
            from Google and may set Google&apos;s own cookies. There are no advertising or
            tracking cookies.
          </p>
        </ProseSection>

        <ProseSection level={3} title="6. Security">
          <ProseList>
            <li>All traffic uses HTTPS.</li>
            <li>PINs are stored as bcrypt hashes, and session tokens as SHA-256 hashes.</li>
            <li>The session cookie cannot be read by scripts on the page.</li>
            <li>
              After {PIN_MAX_ATTEMPTS} wrong PIN attempts the account is locked for {PIN_LOCK_MINUTES} minutes.
            </li>
            <li>Every page and action checks the session and the role on the server.</li>
          </ProseList>
        </ProseSection>

        <ProseSection level={3} title="7. Data retention and deletion">
          <ProseList>
            <li>Account data is kept for as long as you are registered in Shift Master.</li>
            <li>
              A session ends after {SESSION_TTL_DAYS} days, when you sign out, or when your PIN, role or account status
              changes. Ended sessions are deleted from the database.
            </li>
            <li>Roster history, shift swaps and the change log are kept as working records of UPT Laboratorium.</li>
            <li>Usage data is deleted after {ACTIVITY_RETENTION_DAYS} days.</li>
            <li>The copy of the Google Sheets data is replaced every time the data is refreshed.</li>
            <li>
              The database is backed up once a day on the same server, and the 14 most recent backups are kept. Deleted
              data remains in those backups until they rotate out, at most about 14 days.
            </li>
          </ProseList>
          <p>
            You can ask the Shift Master admin at UPT Laboratorium to correct your data, deactivate your account, or
            delete your account data. A deactivated account can no longer sign in. Deletion requests are carried out by
            the operator directly in the database: your account is deactivated, your sessions are deleted, and your
            full name, nickname, email and PIN are removed or replaced with an anonymous placeholder, including in the
            change log. Roster and shift swap history is kept under that placeholder.
          </p>
        </ProseSection>

        <ProseSection level={3} title="8. Changes to this policy">
          <p>
            If the way Shift Master uses data changes, this page is updated before the change takes effect and the date
            above changes with it.
          </p>
        </ProseSection>

        <ProseSection level={3} title="9. Contact">
          <p>Questions or requests about your data can be addressed to the Shift Master admin at UPT Laboratorium.</p>
        </ProseSection>
      </div>
    </article>
  );
}
