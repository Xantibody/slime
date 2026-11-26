// Which pages are Slite's. Every workspace is a subdomain of slite.com, so the
// manifest, both backgrounds and the build all derive their check from here

export const SLITE_HOST_SUFFIX = ".slite.com";

export const SLITE_MATCH_PATTERN = `https://*${SLITE_HOST_SUFFIX}/*`;

export function isSliteUrl(url: string | undefined): boolean {
  if (url === undefined) {
    return false;
  }

  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && hostname.endsWith(SLITE_HOST_SUFFIX);
  } catch {
    return false;
  }
}
