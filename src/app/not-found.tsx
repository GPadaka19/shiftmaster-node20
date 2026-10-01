import Link from "next/link";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <Brand />
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Halaman tidak ditemukan</h1>
        <p className="text-sm text-muted-foreground">Alamatnya mungkin salah atau halamannya sudah dipindah.</p>
      </div>
      <Button asChild variant="outline" className="h-11 px-4">
        <Link href="/">Kembali ke Hari Ini</Link>
      </Button>
    </main>
  );
}
