import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_LABEL } from "@/lib/auth/roles";
import { requireMember, type CurrentMember } from "@/lib/auth/session";
import { signOut } from "./actions";
import { ChangePinForm } from "./change-pin-form";

export const metadata = { title: "Akun" };

const POOL_LABEL: Record<NonNullable<CurrentMember["pool"]>, string> = {
  lab: "Lab (Gedung 2 & 7)",
  studio: "Studio",
  pkl: "PKL",
};

export default async function AccountPage() {
  const member = await requireMember();

  return (
    <>
      <PageHeader title="Akun" />
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Profil</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm sm:grid-cols-[10rem_1fr]">
              <Field label="Nama">{member.fullName}</Field>
              <Field label="Nickname">{member.nickname}</Field>
              <Field label="Peran">{ROLE_LABEL[member.role]}</Field>
              <Field label="Pool roster">{member.pool ? POOL_LABEL[member.pool] : "Tidak masuk roster"}</Field>
              {member.email && <Field label="Email">{member.email}</Field>}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tampilan</CardTitle>
            <CardDescription>Pilihan ini hanya berlaku di perangkat ini.</CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeSwitcher />
          </CardContent>
        </Card>

        {member.role === "staff" && (
          <Card>
            <CardHeader>
              <CardTitle>Ganti PIN</CardTitle>
              <CardDescription>PIN berupa 4–8 angka. Setelah diganti, perangkat lain otomatis keluar.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChangePinForm />
            </CardContent>
          </Card>
        )}

        <form action={signOut}>
          <Button type="submit" variant="outline" className="h-11 px-4">
            <LogOut aria-hidden="true" />
            Keluar
          </Button>
        </form>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="contents">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="-mt-2 font-medium sm:mt-0">{children}</dd>
    </div>
  );
}
