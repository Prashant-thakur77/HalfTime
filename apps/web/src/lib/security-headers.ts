/** Security headers sent with every response. next.config.ts applies them; /docs/security prints them. */
export function securityHeaders(dev = process.env.NODE_ENV === "development"): { key: string; value: string }[] {
  return [
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
    {
      key: "Content-Security-Policy",
      value: [
        "default-src 'self'",
        `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self'",
        "connect-src 'self' https://api.anthropic.com",
        "worker-src 'self' blob:",
        "frame-src 'none'",
        "frame-ancestors 'none'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'"
      ].join("; ")
    }
  ];
}
