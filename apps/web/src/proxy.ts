import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const renderHostnameSuffix = ".onrender.com";

/**
 * Keeps browser-auth cookies on the same canonical origin as Better Auth.
 *
 * Render's default hostname remains useful for service diagnostics, but it
 * must not begin an OAuth flow when its callback is configured for the
 * public WorkPlus domain.
 */
export function proxy(request: NextRequest) {
  const canonicalOrigin = process.env.BETTER_AUTH_URL;
  const requestHostname = request.nextUrl.hostname.toLowerCase();

  if (
    process.env.NODE_ENV !== "production" ||
    !canonicalOrigin ||
    !requestHostname.endsWith(renderHostnameSuffix)
  ) {
    return NextResponse.next();
  }

  try {
    const canonicalUrl = new URL(canonicalOrigin);

    canonicalUrl.pathname = request.nextUrl.pathname;
    canonicalUrl.search = request.nextUrl.search;

    return NextResponse.redirect(canonicalUrl);
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
