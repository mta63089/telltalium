import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#050912] px-5 py-10 text-[#e9edf9] sm:px-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-[#bfc2ff] hover:text-white"><ArrowLeft size={15} />Back to dashboard</Link>
        <div className="mt-12 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[.18em] text-[#b4aeeb]"><ShieldCheck size={17} />Privacy</div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">Privacy and data handling</h1>
        <p className="mt-4 text-sm leading-8 text-[#a1aec9]">This page describes the behavior of the included MVP code running by itself, not a guarantee about hosting providers or future deployments. Update it, add operator contact information, and arrange compliance review before public launch.</p>
        <div className="mt-10 space-y-4">
          <section className="panel p-6"><h2 className="text-base font-semibold text-white">Data accessed</h2><p className="mt-2 text-sm leading-8 text-[#9aa8c2]">In live mode the server requests public YouTube video and channel information, up to 100 recent upload IDs, and up to 200 latest public top-level comments with available author-channel creation dates. No YouTube sign-in, OAuth, browser cookies, or private commenter activity is requested by this code.</p></section>
          <section className="panel p-6"><h2 className="text-base font-semibold text-white">Storage and retention</h2><p className="mt-2 text-sm leading-8 text-[#9aa8c2]">The application contains no database or persistent user account system. Upstream YouTube responses may be cached by the Next.js fetch cache for five minutes. The API endpoint responds with no-store. Client-side reports are held only in page memory unless you click Export JSON. In-process rate limiting temporarily tracks a request IP key for approximately ten minutes; production hosting may add its own access logs and caches.</p></section>
          <section className="panel p-6"><h2 className="text-base font-semibold text-white">External services</h2><p className="mt-2 text-sm leading-8 text-[#9aa8c2]">Live mode transmits the selected video identifier to YouTube Data API v3 from the server. When a real analysis is displayed, video thumbnails and author avatars may load from YouTube or Google image domains in the user's browser. Follow Google's privacy and data-use requirements when using these services.</p></section>
          <section className="panel p-6"><h2 className="text-base font-semibold text-white">Public deployment</h2><p className="mt-2 text-sm leading-8 text-[#9aa8c2]">This is a development template. You must supply a real operator identity, contact address, hosting-specific disclosures, and any legally required consent or deletion procedures before release. Live derived analytics may require additional YouTube approval.</p></section>
        </div>
      </div>
    </main>
  );
}
