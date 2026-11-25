import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://telltalium.xyz";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Telltalium — Read Between the Signals",
    template: "%s · Telltalium",
  },
  description:
    "Investigate YouTube engagement anomalies, suspicious comment patterns and coordination signals. Explore the evidence, not just the numbers.",
  applicationName: "Telltalium",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    type: "website",
    siteName: "Telltalium",
    title: "Telltalium — Read Between the Signals",
    description:
      "Look beyond YouTube views. Investigate engagement anomalies and comment patterns.",
    url: siteUrl,
    images: [
      {
        url: "/og-telltalium.png",
        width: 1200,
        height: 630,
        alt: "Telltalium — Read Between the Signals",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/og-telltalium.png"] },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
