import Link from "next/link";
import { Brand } from "@/components/brand";
import { PublicLangScript, PublicLangSwitch } from "@/components/public-lang";
import { PUBLIC_LINKS } from "@/components/public-links";
import { Button } from "@/components/ui/button";

const FOOTER_LINKS = [...PUBLIC_LINKS, { href: "/login", label: "Masuk", labelEn: "Sign in" }];

// Pages anyone can read without signing in (see PUBLIC_PATHS in proxy.ts).
// Google's OAuth branding check opens the home page and the privacy policy.
export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicLangScript />
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <Link href="/" className="rounded-md">
            <Brand />
          </Link>
          <div className="flex items-center gap-2">
            <PublicLangSwitch />
            <Button asChild className="h-10 px-4">
              <Link href="/login">
                <span data-lang="id">Masuk</span>
                <span data-lang="en" lang="en">
                  Sign in
                </span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 lg:py-14">{children}</main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-6 text-sm text-muted-foreground">
          <p>Shift Master · UPT Laboratorium</p>
          <nav aria-label="Navigasi bawah" className="flex flex-wrap gap-x-4 gap-y-1">
            {FOOTER_LINKS.map(({ href, label, labelEn }) => (
              <Link key={href} href={href} className="underline-offset-4 hover:text-foreground hover:underline">
                <span data-lang="id">{label}</span>
                <span data-lang="en" lang="en">
                  {labelEn}
                </span>
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
