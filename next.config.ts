import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allows the dev server to be reached from ANY device on ANY LAN/network
  // (e.g. testing on a phone from a different subnet) — Next.js blocks
  // cross-origin dev requests from non-localhost origins by default.
  //
  // `*.*.*.*` matches any IPv4 host: Next's dev-origin matcher (see
  // csrf-protection's `isCsrfOriginAllowed`) splits the origin hostname on
  // "." and matches segment-by-segment, where each `*` matches exactly one
  // octet. A bare `*`/`**` is rejected on purpose, so four explicit `*`
  // segments is the universal IPv4 pattern. The port is stripped before
  // matching (it matches on `.hostname`), and localhost is always allowed
  // regardless. Dev-only setting — has no effect on production builds.
  allowedDevOrigins: ["*.*.*.*"],
};

export default nextConfig;
