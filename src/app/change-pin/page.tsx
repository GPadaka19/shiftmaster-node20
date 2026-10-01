import { redirect } from "next/navigation";
import { signOut } from "@/app/(app)/account/actions";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { getCurrentMember } from "@/lib/auth/session";
import { ChoosePinForm } from "./choose-pin-form";

export const metadata = { title: "Buat PIN" };

// Every page and Server Action sends a member here (via requireMember) until
// they replace the PIN an admin gave them.
export default async function ChoosePinPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/login");
  if (!member.pinMustChange) redirect("/");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Brand large className="mb-10 text-xl" />
        <h1 className="text-2xl font-semibold tracking-tight">Halo, {member.nickname}</h1>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">
          Sebelum lanjut, buat PIN sendiri (6–8 angka). PIN dari admin tidak bisa dipakai lagi setelah ini.
        </p>
        <ChoosePinForm />
        <form action={signOut} className="mt-6">
          <Button type="submit" variant="ghost" className="h-10 px-0 text-muted-foreground">
            Keluar
          </Button>
        </form>
      </div>
    </main>
  );
}
