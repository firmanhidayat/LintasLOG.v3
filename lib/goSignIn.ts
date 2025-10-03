export type GoSignInOptions = {
  routerReplace?: (url: string) => void;
  signinPath?: string;
  nextUrl?: string;
  clearAuth?: () => unknown;
  basePath?: string;
};

export function buildSignInUrl(
  opts?: Pick<GoSignInOptions, "signinPath" | "nextUrl" | "basePath">
) {
  const signinPath = (opts?.signinPath ?? "/maccount/signin").trim();
  const basePath = (opts?.basePath ?? "").trim().replace(/\/$/, ""); // hapus trailing slash
  const nextUrl =
    opts?.nextUrl ??
    (typeof window !== "undefined"
      ? window.location.pathname + window.location.search
      : "/");

  const prefix = basePath
    ? `${basePath}${signinPath.startsWith("/") ? "" : "/"}${signinPath}`
    : signinPath;
  const url = `${prefix}?next=${encodeURIComponent(nextUrl)}`;
  return url;
}

export function goSignIn(opts?: GoSignInOptions) {
  try {
    opts?.clearAuth?.();
  } catch {
    // ignore clean-up error
  }

  const dest = buildSignInUrl({
    signinPath: opts?.signinPath,
    nextUrl: opts?.nextUrl,
    basePath: opts?.basePath,
  });

  if (opts?.routerReplace) {
    opts.routerReplace(dest);
  } else if (typeof window !== "undefined") {
    window.location.assign(dest);
  }
}
