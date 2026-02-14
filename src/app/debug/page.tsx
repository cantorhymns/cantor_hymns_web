
import { DebugClientPage } from "@/components/debug/debug-client-page";
import { Suspense } from "react";

export default function DebugPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary tracking-tight">
          Data Integrity Debugger
        </h1>
        <p className="text-muted-foreground mt-2">
          This page checks for the existence of all linked files in your database (lyrics, audio, markers).
        </p>
      </div>
      <Suspense fallback={<div>Loading debugger...</div>}>
        <DebugClientPage />
      </Suspense>
    </div>
  );
}
