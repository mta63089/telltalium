/** Shared URL parsing so in-app navigation and API validation accept the same videos. */
export function parseVideoId(input: string): string | null {
  const value = input.trim();
  const valid = /^[a-zA-Z0-9_-]{11}$/;
  if (valid.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const host = url.hostname.toLowerCase();
    if (
      ![
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "music.youtube.com",
        "youtu.be",
        "www.youtube-nocookie.com",
      ].includes(host)
    )
      return null;
    const parts = url.pathname.split("/").filter(Boolean);
    const id =
      host === "youtu.be"
        ? parts[0]
        : parts[0] === "watch"
          ? url.searchParams.get("v")
          : ["shorts", "live", "embed", "v"].includes(parts[0])
            ? parts[1]
            : null;
    return id && valid.test(id) ? id : null;
  } catch {
    return null;
  }
}
