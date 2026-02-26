import { auth } from "@/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const noopMiddleware = (_req: NextRequest) => NextResponse.next()

export const middleware =
  process.env.AUTH_DISABLED === "true" ? noopMiddleware : auth

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
}
