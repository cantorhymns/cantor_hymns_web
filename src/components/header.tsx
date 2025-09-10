import Link from 'next/link';
import { Music4 } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-background/80 backdrop-blur-sm border-b sticky top-0 z-40">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 group">
          <Music4 className="h-8 w-8 text-primary transition-transform duration-300 group-hover:rotate-12" />
          <span className="text-2xl font-headline font-bold text-primary">
            Cantor
          </span>
        </Link>
      </div>
    </header>
  );
}
