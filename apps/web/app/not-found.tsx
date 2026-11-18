import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="container max-w-lg py-24">
      <div className="tile-pop bg-butter p-6 text-butter-deep sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow text-current opacity-80">[ 404 ] not found</p>
          <Search className="h-4 w-4 shrink-0" aria-hidden />
        </div>
        <h1 className="mt-2 text-2xl text-current">Nothing lives at this address.</h1>
        <p className="mt-2 text-[13px] leading-relaxed opacity-90">
          The page may have moved, or the link was never right.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/">Go home</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/new">Start an interview</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
