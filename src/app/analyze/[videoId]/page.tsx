import Dashboard from "@/components/dashboard";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Video investigation" };

export default async function VideoAnalysisPage({
  params,
}: {
  params: Promise<{ videoId: string }>;
}) {
  const { videoId } = await params;
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) notFound();
  return (
    <Dashboard key={videoId} initialReport={null} initialVideoId={videoId} />
  );
}
