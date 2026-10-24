import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Lock, EyeOff, HeartHandshake, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for the Cantor mobile application and web platform.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12">
      <div className="mb-8">
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2 text-muted-foreground hover:text-foreground">
          <Link href="/" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-headline font-bold tracking-tight text-foreground sm:text-4xl">
              Privacy Policy
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Last updated: October 24, 2026
            </p>
          </div>
        </div>
      </div>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-foreground/90">
        <section className="rounded-2xl border bg-card p-6 md:p-8 shadow-sm">
          <p className="text-base leading-relaxed text-muted-foreground">
            Welcome to <strong className="text-foreground">Cantor</strong> (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;). We are deeply committed to protecting your privacy. This Privacy Policy explains our practices regarding data collection, usage, and protection across the Cantor mobile application and related web services.
          </p>
          <p className="text-base leading-relaxed text-muted-foreground mt-3">
            In short: <strong className="text-foreground">Cantor is built for prayer and liturgical learning. We do not sell your data, track you across other apps, or require personal accounts to learn and chant hymns.</strong>
          </p>
        </section>

        {/* 1. Information We Collect */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <EyeOff className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-headline font-semibold text-foreground m-0">
              1. Information We Collect
            </h2>
          </div>
          <div className="rounded-xl border bg-card/50 p-6 space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              • <strong className="text-foreground">No Account Required:</strong> You do not need to register, log in, or provide personal details (such as your name, email, or phone number) to browse hymns, listen to audio tracks, or view synchronized lyrics.
            </p>
            <p>
              • <strong className="text-foreground">No Personal Identification Data:</strong> We do not collect, store, or transmit sensitive personal information, payment information, or biometric data.
            </p>
            <p>
              • <strong className="text-foreground">Local Preferences:</strong> App settings (such as playback speed preferences, theme modes, or recently viewed hymns) are stored locally on your device and are never transmitted to external servers.
            </p>
          </div>
        </section>

        {/* 2. Third-Party Services & Audio Delivery */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <Lock className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-headline font-semibold text-foreground m-0">
              2. Third-Party Services & Infrastructure
            </h2>
          </div>
          <div className="rounded-xl border bg-card/50 p-6 space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              Cantor delivers hymn recordings, audio markers, and textual lyrics securely via <strong>Google Firebase</strong> (Google Cloud Platform). When streaming hymns:
            </p>
            <p>
              • Standard technical transmission data (such as IP addresses and standard HTTP request headers) is processed by Google Cloud infrastructure strictly to deliver requested media files and prevent service abuse.
            </p>
            <p>
              • For more information on how Google manages technical data, please review the{' '}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4 hover:text-primary/80"
              >
                Google Privacy Policy
              </a>.
            </p>
          </div>
        </section>

        {/* 3. Audio & Device Permissions */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-headline font-semibold text-foreground m-0">
              3. Device Permissions
            </h2>
          </div>
          <div className="rounded-xl border bg-card/50 p-6 space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              • <strong className="text-foreground">Background Audio Playback:</strong> The app requests permission to play audio in the background so you can continue listening to and practicing hymns when your screen is locked.
            </p>
            <p>
              • <strong className="text-foreground">Microphone & Recordings:</strong> Cantor does not record your microphone, monitor your audio, or collect voice data without your explicit knowledge and consent.
            </p>
          </div>
        </section>

        {/* 4. Children's Privacy */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <HeartHandshake className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-headline font-semibold text-foreground m-0">
              4. Children&apos;s Privacy (COPPA Compliance)
            </h2>
          </div>
          <div className="rounded-xl border bg-card/50 p-6 space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              Cantor is designed for the whole family, including children learning hymns in Sunday school and youth deacons serving in the church. We comply with the Children&apos;s Online Privacy Protection Act (COPPA) and do not knowingly collect any personally identifiable information from children under the age of 13.
            </p>
          </div>
        </section>

        {/* 5. Policy Updates */}
        <section className="space-y-4">
          <h2 className="text-xl font-headline font-semibold text-foreground m-0">
            5. Changes to This Privacy Policy
          </h2>
          <div className="rounded-xl border bg-card/50 p-6 text-sm text-muted-foreground leading-relaxed">
            <p>
              We may update this Privacy Policy periodically to reflect new features (such as upcoming collaborative learning tools). Any updates will be posted on this page with a revised &ldquo;Last updated&rdquo; date.
            </p>
          </div>
        </section>

        {/* 6. Contact Us */}
        <section className="rounded-2xl border bg-primary/5 p-6 md:p-8 space-y-3">
          <div className="flex items-center gap-2 text-primary font-headline font-semibold text-lg">
            <Mail className="h-5 w-5" />
            Contact Us
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            If you have questions, feedback, or concerns regarding this Privacy Policy or your experience with Cantor, please reach out to us at:
          </p>
          <p className="text-base font-medium text-foreground">
            <a
              href="mailto:cantorhymns@gmail.com"
              className="text-primary hover:underline underline-offset-4"
            >
              cantorhymns@gmail.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
