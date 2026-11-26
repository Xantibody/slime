import { describe, expect, it } from "vitest";
import { SLITE_HOST_SUFFIX, SLITE_MATCH_PATTERN, isSliteUrl } from "./url.ts";

describe(isSliteUrl, () => {
  it.each(["https://acme.slite.com/app/docs/abc", "https://acme.slite.com/"])(
    "should accept a workspace page: %s",
    (url) => {
      expect(isSliteUrl(url)).toBe(true);
    },
  );

  it.each([
    { url: undefined, reason: "no URL (a tab Firefox gives no URL for)" },
    { url: "", reason: "an empty string" },
    { url: "http://acme.slite.com/", reason: "plain http" },
    { url: "https://slite.com/", reason: "the marketing site, without a workspace" },
    { url: "https://acme.slite.com.example.com/", reason: "a host that only starts like Slite" },
    { url: "https://example.com/?next=https://acme.slite.com/", reason: "Slite in the query only" },
    { url: "about:blank", reason: "a browser page" },
    { url: "not a url", reason: "a string that is not a URL" },
  ])("should reject $reason", ({ url }) => {
    expect(isSliteUrl(url)).toBe(false);
  });
});

describe("the Slite match pattern", () => {
  it("should cover every workspace over https", () => {
    expect(SLITE_MATCH_PATTERN).toBe("https://*.slite.com/*");
  });

  it("should end with the host suffix the URL check uses", () => {
    expect(SLITE_MATCH_PATTERN).toContain(`${SLITE_HOST_SUFFIX}/`);
  });
});
