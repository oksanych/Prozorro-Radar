import { headers } from "next/headers"

export async function getUserEmail(): Promise<string | null> {
  if (process.env.AUTH_DISABLED === "true") return null
  return headers().get("x-user-email")
}
