import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { getServerDictionary } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getServerDictionary();
  const copy = t.errors.notFound;

  return (
    <div className="container max-w-lg py-24">
      <div className="tile-pop bg-butter p-6 text-butter-deep sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow text-current opacity-80">{copy.eyebrow}</p>
          <Search className="h-4 w-4 shrink-0" aria-hidden />
        </div>
        <h1 className="mt-2 text-2xl text-current">{copy.title}</h1>
        <p className="mt-2 text-[13px] leading-relaxed opacity-90">{copy.body}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/">{copy.goHome}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/new">{copy.startInterview}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
