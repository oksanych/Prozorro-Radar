import db from '@/lib/db';
import type { RiskLevel } from '@/lib/types';

export const dynamic = 'force-dynamic';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-slate-100 border-b border-slate-700 pb-2">{title}</h2>
      {children}
    </section>
  );
}

function SignalDoc({
  code, name, weight, severity, condition, threshold, rationale, limitation,
}: {
  code: string; name: string; weight: number; severity: string;
  condition: string; threshold: string; rationale: string; limitation: string;
}) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-bold text-slate-100">{name}</span>
        <code className="text-xs bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-mono">{code}</code>
        <span className="text-xs text-slate-500">+{weight} pts · {severity}</span>
      </div>
      <div>
        <span className="text-xs text-slate-500 uppercase tracking-wide">Condition: </span>
        <span className="text-sm text-slate-300">{condition}</span>
      </div>
      <div>
        <span className="text-xs text-slate-500 uppercase tracking-wide">Threshold: </span>
        <span className="text-sm text-slate-300">{threshold}</span>
        <span className="text-xs text-slate-500 ml-1">(configurable in config.json)</span>
      </div>
      <div>
        <span className="text-xs text-slate-500 uppercase tracking-wide">Rationale: </span>
        <span className="text-sm text-slate-300">{rationale}</span>
      </div>
      <div>
        <span className="text-xs text-slate-500 uppercase tracking-wide">Limitation: </span>
        <span className="text-sm text-slate-400 italic">{limitation}</span>
      </div>
    </div>
  );
}

export default function AboutPage() {
  const totalsRow = db.prepare('SELECT COUNT(*) as total FROM tenders').get() as { total: number };
  const dateRow = db.prepare('SELECT MIN(date_modified) as min_d, MAX(date_modified) as max_d FROM tenders').get() as { min_d: string | null; max_d: string | null };
  const methodRows = db.prepare('SELECT procurement_method, COUNT(*) as c FROM tenders GROUP BY procurement_method ORDER BY c DESC').all() as { procurement_method: string; c: number }[];
  const riskRows = db.prepare('SELECT risk_level, COUNT(*) as c FROM tenders GROUP BY risk_level').all() as { risk_level: RiskLevel; c: number }[];

  const dateRange = dateRow.min_d && dateRow.max_d
    ? `${dateRow.min_d.slice(0, 10)} – ${dateRow.max_d.slice(0, 10)}`
    : 'unknown';

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">About Prozorro Radar</h1>
        <p className="text-slate-400 text-sm mt-1">Methodology, data sources, and transparency notes</p>
      </div>

      <Section title="What is Prozorro Radar?">
        <p className="text-slate-300 leading-relaxed">
          Prozorro Radar is a risk signal triage tool for Ukrainian public procurement data. It ingests recent
          completed tenders from the official Prozorro public API, applies transparent and deterministic rules,
          and presents a ranked feed to help investigators prioritize which tenders to review.
        </p>
        <p className="text-slate-300 leading-relaxed">
          The tool does not make accusations. It surfaces statistical anomalies that may warrant closer inspection.
          Every signal has a documented threshold, weight, and evidence block showing the raw values that triggered it.
        </p>
      </Section>

      <Section title="Data Source">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-2.5">
          <div className="flex gap-4 text-sm">
            <span className="text-slate-500 w-32 flex-shrink-0">API</span>
            <span className="text-slate-200">Prozorro Public API v2.5 (read-only, no authentication)</span>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-slate-500 w-32 flex-shrink-0">Scope</span>
            <span className="text-slate-200">Last 90 days, completed tenders only</span>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-slate-500 w-32 flex-shrink-0">Methods</span>
            <span className="text-slate-200 font-mono text-xs">belowThreshold, aboveThresholdUA, aboveThresholdEU, negotiation, negotiation.quick</span>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-slate-500 w-32 flex-shrink-0">Dataset</span>
            <span className="text-slate-200">{totalsRow.total.toLocaleString()} tenders · {dateRange}</span>
          </div>
        </div>

        {methodRows.length > 0 && (
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Method Distribution</div>
            <div className="space-y-1">
              {methodRows.map(m => (
                <div key={m.procurement_method} className="flex items-center gap-3 text-sm">
                  <span className="font-mono text-xs text-slate-400 w-48">{m.procurement_method}</span>
                  <div className="flex-1 bg-slate-700 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full"
                      style={{ width: `${(m.c / totalsRow.total * 100).toFixed(0)}%` }}
                    />
                  </div>
                  <span className="text-slate-400 text-xs w-16 text-right">{m.c.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      <Section title="Risk Signals">
        <p className="text-slate-400 text-sm">
          Each signal is a pure function: <code className="text-xs bg-slate-700 px-1 rounded">(tender, config) → SignalResult | null</code>.
          Signals are independent — a tender can trigger multiple signals.
        </p>

        <SignalDoc
          code="SINGLE_BIDDER"
          name="No Competition"
          weight={35}
          severity="HIGH"
          condition="Only 1 bid submitted AND expected value ≥ ₴500,000"
          threshold="₴500,000 minimum value (S1_VALUE_THRESHOLD)"
          rationale="Single-bid tenders at significant values indicate reduced competitive pressure, which can reflect market barriers, short deadlines, or pre-coordination."
          limitation="Some specialized markets naturally attract few suppliers; single-bid may be legitimate in niche categories."
        />
        <SignalDoc
          code="TIGHT_DEADLINE"
          name="Rushed Deadline"
          weight={20}
          severity="MEDIUM"
          condition="Tender period ≤ threshold days for the given procurement method"
          threshold="belowThreshold: 3 days · aboveThresholdUA: 15 days · aboveThresholdEU: 30 days"
          rationale="Unusually short tender periods limit the time competitors have to prepare bids, potentially excluding all but pre-briefed suppliers."
          limitation="Urgency is sometimes legitimate (emergency procurement, time-sensitive goods). Context matters."
        />
        <SignalDoc
          code="NEGOTIATION_BYPASS"
          name="Competition Bypass"
          weight={25}
          severity="HIGH"
          condition="Procurement method is negotiation/negotiation.quick AND value ≥ ₴200,000"
          threshold="₴200,000 minimum value (S3_NEGOTIATION_THRESHOLD)"
          rationale="Negotiation procedures bypass open competitive bidding. At significant values, this warrants scrutiny of whether the exemption conditions were genuinely met."
          limitation="Negotiation is legally permitted in specific circumstances (single provider, national security, etc.)."
        />
        <SignalDoc
          code="BUYER_CONCENTRATION"
          name="Repeat Winner"
          weight={30}
          severity="HIGH"
          condition="Same buyer–supplier pair has ≥ 3 wins in the last 90 days AND total value ≥ ₴1,000,000"
          threshold="3 wins (S4_REPEAT_WIN_COUNT) · ₴1,000,000 total (S4_MIN_TOTAL_VALUE)"
          rationale="High concentration of wins between the same pair may indicate preferential treatment or a captive supplier relationship that discourages other bidders."
          limitation="Some long-term service contracts legitimately produce repeated wins with the same supplier."
        />
      </Section>

      <Section title="Scoring">
        <div className="space-y-3">
          <p className="text-slate-300 text-sm">
            <strong>Formula:</strong> <code className="text-xs bg-slate-700 px-1.5 py-0.5 rounded font-mono">score = min(100, sum of triggered signal weights)</code>
          </p>
          <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Level</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Score Range</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500">Count in Dataset</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { level: 'CLEAR', range: '0', color: 'text-slate-400' },
                  { level: 'LOW', range: '1 – 24', color: 'text-green-400' },
                  { level: 'MEDIUM', range: '25 – 49', color: 'text-yellow-400' },
                  { level: 'HIGH', range: '50 – 79', color: 'text-orange-400' },
                  { level: 'CRITICAL', range: '80 – 100', color: 'text-red-400' },
                ].map(({ level, range, color }) => {
                  const row = riskRows.find(r => r.risk_level === level);
                  return (
                    <tr key={level} className="border-b border-slate-700/50 last:border-0">
                      <td className={`px-4 py-2.5 font-semibold text-xs ${color}`}>{level}</td>
                      <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">{range}</td>
                      <td className="px-4 py-2.5 text-slate-300 text-right">{row ? row.c.toLocaleString() : 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-slate-400 text-sm">
            Example: A tender with SINGLE_BIDDER (35) + TIGHT_DEADLINE (20) = score 55 → HIGH risk.
          </p>
        </div>
      </Section>

      <Section title="Configuration">
        <p className="text-slate-300 text-sm">
          All thresholds are externalized in <code className="text-xs bg-slate-700 px-1 rounded">config.json</code> at the project root.
          No threshold is hardcoded. To adjust sensitivity, edit the config and re-run{' '}
          <code className="text-xs bg-slate-700 px-1 rounded">npm run score</code>.
        </p>
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 font-mono text-xs text-slate-300 space-y-1">
          <div><span className="text-slate-500">S1_VALUE_THRESHOLD:</span> ₴500,000</div>
          <div><span className="text-slate-500">S2_DEADLINE_THRESHOLDS:</span> belowThreshold=3d, aboveUA=15d, aboveEU=30d</div>
          <div><span className="text-slate-500">S3_NEGOTIATION_THRESHOLD:</span> ₴200,000</div>
          <div><span className="text-slate-500">S4_REPEAT_WIN_COUNT:</span> 3 wins</div>
          <div><span className="text-slate-500">S4_MIN_TOTAL_VALUE:</span> ₴1,000,000</div>
          <div><span className="text-slate-500">S4_WINDOW_DAYS:</span> 90 days</div>
        </div>
      </Section>

      <Section title="Limitations">
        <ul className="space-y-2 text-sm text-slate-300">
          {[
            'Dataset is a recent snapshot (last 90 days), not complete historical data. Patterns before the lookback window are not visible.',
            'Signals are heuristic rules. False positives (legitimate tenders flagged) and false negatives (irregular tenders not flagged) are expected.',
            'Only ~5–10% of ingested tenders are competitive (non-reporting). The dataset skews toward certain procurement types.',
            'Multi-lot tenders use top-level aggregate values. Per-lot analysis is not performed.',
            'Region data has ~40% coverage. Tenders with null regions are excluded from regional analysis.',
            'This is not a legal tool. Signals are starting points for investigation, not evidence of wrongdoing.',
          ].map((text, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-slate-600 flex-shrink-0">•</span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Technology">
        <div className="text-sm text-slate-300 space-y-1">
          <p>Built with Next.js 14 App Router · TypeScript strict · Tailwind CSS · SQLite (better-sqlite3) · Vitest</p>
          <p className="text-slate-500">All data processing happens locally. No third-party analytics. No network requests at runtime.</p>
        </div>
      </Section>

      <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-5">
        <div className="flex gap-3">
          <span className="text-yellow-500 text-lg flex-shrink-0">⚠️</span>
          <div className="space-y-1">
            <div className="font-semibold text-yellow-400">Disclaimer</div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Prozorro Radar shows risk signals based on transparent rules and publicly available data.
              A flagged tender is not proof of wrongdoing; it is a prompt for further review.
              All data is sourced from the official Prozorro public API and reflects the state at the time of ingestion.
              Use this tool as one input in an investigation, not as a final conclusion.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
