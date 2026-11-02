import { NextResponse, type NextRequest } from "next/server";
import { isLocale, localeCookie } from "@/i18n/config";
import { negotiateLocale } from "@/i18n/negotiate";
import { redirectKeepingCookies, updateAdminSession } from "@/lib/supabase/proxy-session";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Admin (not localised). Refresh the session; bounce signed-out users to
  // the login page. This is a convenience only — requireAdmin() and RLS are
  // the real security boundary.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const { response, signedIn } = await updateAdminSession(request);
    const isLogin = pathname === "/admin/login";
    if (!signedIn && !isLogin) {
      return redirectKeepingCookies(response, new URL("/admin/login", request.url));
    }
    response.headers.set("x-robots-tag", "noindex, nofollow");
    return response;
  }

  const first = pathname.split("/")[1];
  if (isLocale(first)) return NextResponse.next();

  // Unprefixed storefront path → redirect to the negotiated locale.
  const locale = negotiateLocale(request.cookies.get(localeCookie)?.value, request.headers.get("accept-language"));
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  url.search = search;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip Next internals and anything with a file extension.
  matcher: ["/((?!_next/|.*\\..*).*)"],
};
