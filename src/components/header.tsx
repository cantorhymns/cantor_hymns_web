import Link from 'next/link';
import { ListMusic } from 'lucide-react';

const CopticCrossIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="currentColor"
      {...props}
    >
      <circle cx="50" cy="50" r="6" />
      <path d="M47 10h6v80h-6z" />
      <path d="M10 47h80v6H10z" />
      
      <circle cx="50" cy="15" r="4" />
      <circle cx="42" cy="15" r="4" />
      <circle cx="58" cy="15" r="4" />

      <circle cx="50" cy="85" r="4" />
      <circle cx="42" cy="85" r="4" />
      <circle cx="58" cy="85" r="4" />

      <circle cx="15" cy="50" r="4" />
      <circle cx="15" cy="42" r="4" />
      <circle cx="15" cy="58" r="4" />

      <circle cx="85" cy="50" r="4" />
      <circle cx="85" cy="42" r="4" />
      <circle cx="85" cy="58" r="4" />
    </svg>
);


export function Header() {
  return (
    <header className="bg-background/80 backdrop-blur-sm border-b sticky top-0 z-40">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 group">
          <CopticCrossIcon className="h-8 w-8 text-primary transition-transform duration-300 group-hover:rotate-12" />
          <span className="text-2xl font-headline font-bold text-primary">
            Cantor
          </span>
        </Link>
        <div className="flex items-center gap-4">
            <Link href="/cantor-cloud" className="group text-primary hover:text-primary/80 transition-colors">
                <ListMusic className="h-7 w-7" />
                <span className="sr-only">CantorCloud</span>
            </Link>
        </div>
      </div>
    </header>
  );
}
