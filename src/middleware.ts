import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isMonkeSolHost, routeMonkeSolHost } from "@/lib/monke-sol";

export function middleware(req: NextRequest) {
  const hostHeader = req.headers.get("host") || "";
  const host = hostHeader.toLowerCase().split(":")[0];

  // www → apex for our web2 hosts
  if (
    host.startsWith("www.") &&
    (host.endsWith("monke.bar") ||
      host.endsWith("monke.sol.new") ||
      host === "www.monke.sol")
  ) {
    const url = req.nextUrl.clone();
    url.host = host.replace(/^www\./, "");
    url.protocol = "https";
    return NextResponse.redirect(url, 301);
  }

  // *.monke.sol host routing (SNS gateways / custom DNS → this Worker)
  if (isMonkeSolHost(host) && req.nextUrl.pathname === "/") {
    const route = routeMonkeSolHost(host);
    if (route.kind === "path") {
      const url = req.nextUrl.clone();
      url.pathname = route.path;
      return NextResponse.rewrite(url);
    }
    if (route.kind === "sns") {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("q", route.domain);
      url.searchParams.set("collection", "all");
      return NextResponse.rewrite(url);
    }
    // home — fall through
  }

  // If already on a path under monke.sol host, just serve
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts/|images/).*)"],
};
