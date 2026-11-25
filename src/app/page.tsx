import Dashboard from "@/components/dashboard";
import { getDemoReport } from "@/lib/demo";
import type { Metadata } from "next";

export const metadata: Metadata = { alternates: { canonical: "/" } };

// Generate relative demo timestamps at request time instead of freezing them at build time.
export const dynamic = "force-dynamic";

export default function Home() {
  return <Dashboard initialReport={getDemoReport()} />;
}
