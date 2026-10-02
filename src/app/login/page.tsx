import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { PUBLIC_LINKS } from "@/components/public-links";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { safeNextPath } from "@/lib/auth/redirect";
import { getCurrentMember } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { GoogleButton } from "./google-button";
import { PinForm } from "./pin-form";

export const metadata = { title: "Masuk" };

export default async function SignInPage({ searchParams }: PageProps<"/login">) {
  if (await getCurrentMember()) redirect("/");

  const { next } = await searchParams;
  const nextPath = safeNextPath(Array.isArray(next) ? next[0] : next);
  const googleClientId = env().GOOGLE_CLIENT_ID;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Brand large className="mb-10 text-xl" />
        <h1 className="text-2xl font-semibold tracking-tight">Masuk</h1>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">Staf masuk dengan nickname dan PIN. Admin masuk dengan Google.</p>

        <Tabs defaultValue="staf">
          <TabsList className="mb-4 h-10! w-full">
            <TabsTrigger value="staf">Staf</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
          </TabsList>
          <TabsContent value="staf">
            <PinForm next={nextPath} />
          </TabsContent>
          <TabsContent value="admin" className="grid gap-4">
            {googleClientId ? (
              <GoogleButton clientId={googleClientId} next={nextPath} />
            ) : (
              <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                Login Google belum dikonfigurasi. Isi <code className="font-mono">GOOGLE_CLIENT_ID</code> di server.
              </p>
            )}
            <p className="text-sm text-muted-foreground">Khusus admin dan superadmin yang emailnya sudah terdaftar.</p>
          </TabsContent>
        </Tabs>

        <nav aria-label="Tentang aplikasi" className="mt-8 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {PUBLIC_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className="underline underline-offset-4 hover:text-foreground">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
