import Link from "next/link";
import type { ReactNode } from "react";

// Building blocks for the long-form public pages (home, privacy policy, terms).

export function ProseSection({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="grid scroll-mt-6 content-start gap-2">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <div className="grid gap-2 text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground">{children}</div>
    </section>
  );
}

export function ProseList({ children }: { children: ReactNode }) {
  return <ul className="grid list-disc gap-1.5 pl-5">{children}</ul>;
}

export function ProseLink({ href, children }: { href: string; children: ReactNode }) {
  const className = "font-medium text-foreground underline underline-offset-4";
  if (href.startsWith("/") || href.startsWith("#")) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}
