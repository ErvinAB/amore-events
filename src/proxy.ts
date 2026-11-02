import { NextResponse, type NextRequest } from "next/server";
import { isLocale, localeCookie } from "@/i18n/config";
import { negotiateLocale } from "@/i18n/negotiate";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Admin is not localised; auth handling is added with the admin shell.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return NextResponse.next();
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
  // Skip Next internals, API-like files and anything with a file extension.
  matcher: ["/((?!_next/|api/|.*\\..*).*)"],
};
