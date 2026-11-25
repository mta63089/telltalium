import { DocsShell } from "@/components/docs-shell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  alternates: { canonical: "/privacy" },
};

const sections = [
  {
    title: "Data accessed",
    body: "In live mode Telltalium requests public YouTube video and channel information, up to 100 recent upload IDs, and up to 200 latest public top-level comments with available author-channel creation dates. No YouTube sign-in, OAuth, browser cookies, or private commenter activity is requested by this code.",
  },
  {
    title: "Storage and retention",
    body: "The MVP has no database or persistent user account system. Upstream YouTube responses may be cached by the Next.js fetch cache for five minutes. The API endpoint responds with no-store. Client-side reports exist only in page memory unless you export a JSON report. In-process rate limiting temporarily tracks a request IP key for approximately ten minutes; hosting can add independent logs and caches.",
  },
  {
    title: "External services",
    body: "Live mode sends the chosen video identifier to YouTube Data API v3 from the server. Thumbnails and avatars may be loaded directly from YouTube or Google image domains by the browser. Review Google's privacy and data-use requirements when using these services.",
  },
  {
    title: "Public deployment",
    body: "This is a development template, not a published production privacy policy. Supply an operator identity, contact address, hosting-specific disclosures, and applicable consent or deletion processes before launching publicly. Live derived analytics may require YouTube approval.",
  },
];

export default function PrivacyPage() {
  return (
    <DocsShell
      index="P"
      kicker="DATA / DISCLOSURE"
      title="Privacy, plainly"
      introduction="What Telltalium accesses, what it does not, and where the boundaries of this MVP are. Hosting providers may handle data differently."
    >
      <div className="docs-section-list">
        {sections.map((section, index) => (
          <section key={section.title} className="docs-section">
            <div className="docs-section-index">
              {String(index + 1).padStart(2, "0")}
            </div>
            <div>
              <h2>{section.title}</h2>
              <p>{section.body}</p>
            </div>
          </section>
        ))}
      </div>
    </DocsShell>
  );
}
