import { redirect } from "next/navigation"
import { signIn, auth } from "@/auth"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; callbackUrl?: string }
}) {
  const session = await auth()
  if (session) redirect("/")

  const error = searchParams.error

  return (
    <>
      <style>{`
        @keyframes radar-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes radar-ping {
          0% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.05; }
          100% { opacity: 0; transform: scale(1.5); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .radar-sweep {
          animation: radar-spin 4s linear infinite;
        }
        .radar-ping {
          animation: radar-ping 3s ease-out infinite;
        }
        .fade-in {
          animation: fade-in 0.6s ease-out both;
        }
        .fade-in-delay {
          animation: fade-in 0.6s ease-out 0.2s both;
        }
        .fade-in-delay-2 {
          animation: fade-in 0.6s ease-out 0.4s both;
        }
      `}</style>

      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 -mt-14 sm:-mt-16">
        <div className="w-full max-w-sm">
          {/* Radar graphic */}
          <div className="flex justify-center mb-10 fade-in">
            <div className="relative w-40 h-40">
              {/* Concentric rings */}
              <div className="absolute inset-0 rounded-full border border-slate-700/60" />
              <div className="absolute inset-4 rounded-full border border-slate-700/50" />
              <div className="absolute inset-8 rounded-full border border-slate-700/40" />
              <div className="absolute inset-12 rounded-full border border-slate-600/30" />

              {/* Crosshair lines */}
              <div className="absolute top-0 bottom-0 left-1/2 w-px bg-slate-700/40" />
              <div className="absolute left-0 right-0 top-1/2 h-px bg-slate-700/40" />

              {/* Sweep line */}
              <div className="absolute inset-0 radar-sweep" style={{ transformOrigin: "center" }}>
                <div
                  className="absolute top-1/2 left-1/2 h-px bg-gradient-to-r from-emerald-400/80 to-transparent"
                  style={{ width: "50%", transformOrigin: "left center" }}
                />
                {/* Sweep glow trail */}
                <div
                  className="absolute top-1/2 left-1/2 origin-left"
                  style={{
                    width: "50%",
                    height: "50%",
                    background: "conic-gradient(from 0deg, transparent 0deg, rgba(52, 211, 153, 0.08) 30deg, transparent 60deg)",
                    transformOrigin: "left top",
                  }}
                />
              </div>

              {/* Center dot */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />

              {/* Ping ring */}
              <div className="absolute inset-6 rounded-full border border-emerald-400/20 radar-ping" />

              {/* Blip dots */}
              <div className="absolute top-[28%] left-[62%] w-1.5 h-1.5 rounded-full bg-emerald-400/70" />
              <div className="absolute top-[55%] left-[30%] w-1 h-1 rounded-full bg-emerald-400/50" />
              <div className="absolute top-[70%] left-[65%] w-1 h-1 rounded-full bg-amber-400/60" />
            </div>
          </div>

          {/* Branding */}
          <div className="text-center mb-8 fade-in-delay">
            <h1 className="text-3xl font-bold font-mono text-slate-100 tracking-tight">
              👀 RADAR
            </h1>
            <p className="text-sm text-slate-500 font-mono mt-1 tracking-widest uppercase">
              Tender Risk Signals
            </p>
          </div>

          {/* Card */}
          <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-6 backdrop-blur fade-in-delay-2">
            {/* Error message */}
            {error && (
              <div className="mb-4 px-3 py-2 rounded border border-red-500/20 bg-red-500/10 text-red-400 text-xs font-mono">
                {error === "OAuthAccountNotLinked"
                  ? "This email is already linked to another account."
                  : error === "AccessDenied"
                    ? "Access was denied. Please try again."
                    : "Authentication failed. Please try again."}
              </div>
            )}

            <form
              action={async () => {
                "use server"
                await signIn("google", { redirectTo: searchParams.callbackUrl ?? "/" })
              }}
            >
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Sign in with Google
              </button>
            </form>

            <p className="mt-4 text-center text-xs text-slate-600 font-mono">
              Authorized personnel only
            </p>
          </div>

          {/* System info footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-slate-700 font-mono">
              SYS::PROZORRO_RADAR v0.1.0
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
