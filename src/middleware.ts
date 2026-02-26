import { auth } from "@/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const noopMiddleware = (_req: NextRequest) => NextResponse.next()

const authMiddleware = auth((req) => {
  const { pathname } = req.nextUrl

  // Not authenticated → redirect to login (except login page itself)
  if (!req.auth && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // Already authenticated on login page → redirect home
  if (req.auth && pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.url))
  }

  // Pass user email to server components / route handlers via request header
  const requestHeaders = new Headers(req.headers)
  if (req.auth?.user?.email) {
    requestHeaders.set("x-user-email", req.auth.user.email)
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  })
})

export const middleware =
  process.env.AUTH_DISABLED === "true" ? noopMiddleware : authMiddleware

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
}
