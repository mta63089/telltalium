import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Veyra — Signal Intelligence", template: "%s · Veyra" },
  description: "Explore YouTube engagement anomalies and comment patterns with transparent, reviewable heuristics.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
