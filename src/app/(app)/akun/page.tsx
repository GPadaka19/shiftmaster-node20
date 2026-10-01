import { ChevronRight, LogOut } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { adminItemsFor } from "@/components/shell/admin-items";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_LABEL } from "@/lib/auth/roles";
import { requireMember } from "@/lib/auth/session";
import { POOL_LABEL } from "@/lib/members/labels";
import { signOut } from "./actions";
import { ChangePinForm } from "./change-pin-form";

export const metadata = { title: "Akun" };

export default async function AccountPage() {
  const member = await requireMember();
  const adminItems = adminItemsFor(member.role);

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

        {adminItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Kelola</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="-my-1 divide-y divide-border">
                {adminItems.map(({ href, label, description, icon: Icon }) => (
                  <li key={href}>
                    <Link href={href} className="flex min-h-14 items-center gap-3 py-2 hover:text-foreground">
                      <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
                      <span className="flex-1">
                        <span className="block font-medium">{label}</span>
                        <span className="block text-muted-foreground">{description}</span>
                      </span>
                      <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

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
