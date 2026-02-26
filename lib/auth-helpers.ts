import { auth } from "@/auth"

export async function getUserEmail(): Promise<string | null> {
  if (process.env.AUTH_DISABLED === "true") return null
  const session = await auth()
  return session?.user?.email ?? null
}
