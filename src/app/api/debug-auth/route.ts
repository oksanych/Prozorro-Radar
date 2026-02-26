import { auth } from "@/auth"
import { headers } from "next/headers"
import { NextResponse } from "next/server"
import db from "@/lib/db"

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  const headerEmail = headers().get("x-user-email")

  const cases = db.prepare('SELECT id, user_email, title FROM cases').all()

  return NextResponse.json({
    env_AUTH_DISABLED: process.env.AUTH_DISABLED,
    auth_session: session,
    auth_email: session?.user?.email ?? null,
    header_email: headerEmail,
    cases_in_db: cases,
  })
}
