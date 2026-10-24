import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t bg-background/50 py-6 text-center text-xs text-muted-foreground">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 px-4 md:px-6">
        <p>© {new Date().getFullYear()} Cantor. All rights reserved.</p>
        <div className="flex items-center gap-6">
          <Link
            href="/privacy"
            className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
