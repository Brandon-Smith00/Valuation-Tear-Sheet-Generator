import { useState } from "react";

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  navy: "#0B1729",
  navyMid: "#1C3557",
  navyLight: "#2B5BA8",
  gold: "#C9A452",
  goldDim: "#A07C30",
  goldBg: "#FBF7ED",
  bg: "#ECEEF3",
  white: "#FFFFFF",
  border: "#DCE0E9",
  text: "#0B1729",
  sub: "#4A5770",
  muted: "#8592A6",
  green: "#1A7F5A",
  red: "#B03030",
  greenBg: "#F0FAF5",
  redBg: "#FEF2F2",
};

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmtB = (n, d = 1) => {
  if (n == null || isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1000) return `$${(n / 1000).toFixed(d)}T`;
  if (abs >= 1)    return `$${n.toFixed(d)}B`;
  if (abs > 0)     return `$${(n * 1000).toFixed(0)}M`;
  return "$0";
};
const fmtP   = (n) => (n != null && !isNaN(n) ? `$${Number(n).toFixed(2)}` : "—");
const fmtX   = (n) => (n != null && !isNaN(n) && n > 0 ? `${Number(n).toFixed(1)}x` : "N/A");
const fmtPct = (n) => (n != null && !isNaN(n) ? `${Number(n).toFixed(1)}%` : "—");
const safe   = (fn, ...args) => { try { return fn(...args); } catch { return "—"; } };

// ─── Shared components ────────────────────────────────────────────────────────
function StatBox({ label, value, highlight, wide }) {
  return (
    <div style={{
      background: highlight ? C.navyMid : C.bg,
      border: `1px solid ${highlight ? "#26487A" : C.border}`,
      borderRadius: 6, padding: "13px 16px",
      gridColumn: wide ? "span 2" : undefined,
    }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", color: highlight ? "rgba(255,255,255,0.5)" : C.muted, textTransform: "uppercase", marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: highlight ? C.white : C.navy, lineHeight: 1.2 }}>{value}</div>
    </div>
  );
}

function Commentary({ text }) {
  return (
    <div style={{ borderLeft: `3px solid ${C.gold}`, background: C.goldBg, padding: "14px 18px", borderRadius: "0 6px 6px 0", marginTop: 18 }}>
      <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.09em", color: C.goldDim, marginBottom: 7, textTransform: "uppercase" }}>Analyst Commentary</div>
      <p style={{ fontSize: 13, color: C.text, lineHeight: 1.72, margin: 0 }}>{text}</p>
    </div>
  );
}

function THead({ headers }) {
  return (
    <thead>
      <tr style={{ background: C.navy }}>
        {headers.map((h, i) => (
          <th key={i} style={{
            padding: "9px 12px", color: C.white, fontWeight: 600,
            textAlign: i === 0 ? "left" : "right",
            fontSize: 10, letterSpacing: "0.06em", whiteSpace: "nowrap",
            textTransform: "uppercase"
          }}>{h}</th>
        ))}
      </tr>
    </thead>
  );
}

function TRow({ cells, alt, highlight }) {
  return (
    <tr style={{
      background: highlight ? C.goldBg : alt ? "#F7F9FC" : C.white,
      borderBottom: `1px solid ${C.border}`,
      borderTop: highlight ? `2px solid ${C.gold}` : undefined,
    }}>
      {cells.map((cell, ci) => (
        <td key={ci} style={{
          padding: "8px 12px",
          textAlign: ci === 0 ? "left" : "right",
          fontWeight: ci === 0 || highlight ? 600 : 400,
          color: highlight ? C.navy : ci === 0 ? C.text : C.sub,
          fontSize: 12.5, whiteSpace: "nowrap",
          fontVariantNumeric: "tabular-nums"
        }}>{cell}</td>
      ))}
    </tr>
  );
}

// ─── Football Field ───────────────────────────────────────────────────────────
function FootballField({ data }) {
  const { compsValuation: cv, precedentValuation: pv, assetBasedValuation: av, company: co } = data;

  const rows = [
    { label: "Comparable Companies",   color: C.navyLight, low: cv.impliedSharePriceLow, high: cv.impliedSharePriceHigh },
    { label: "Precedent Transactions", color: C.navyMid,   low: pv.impliedSharePriceLow, high: pv.impliedSharePriceHigh },
    { label: "Asset-Based Approach",   color: "#4A6FA5",   low: av.impliedSharePriceLow, high: av.impliedSharePriceHigh },
  ];

  const current = co.currentPrice;
  const allVals = [...rows.flatMap(r => [r.low, r.high]), current].filter(n => n > 0);
  const minV = Math.min(...allVals) * 0.84;
  const maxV = Math.max(...allVals) * 1.16;
  const span = maxV - minV;
  const toX  = (v) => Math.max(0, Math.min(1, (v - minV) / span));

  const PAD_L = 192, PAD_R = 64, BAR_H = 27, ROW_H = 58, W = 720;
  const CW    = W - PAD_L - PAD_R;
  const H     = rows.length * ROW_H + 50;
  const ticks = [0, .25, .5, .75, 1];

  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, padding: "22px 16px 10px", marginBottom: 22 }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: C.navyMid, marginBottom: 14 }}>
        Football Field — Implied Share Price
      </div>
      <div style={{ overflowX: "auto" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", minWidth: 520, display: "block", fontFamily: "system-ui,sans-serif" }}>
          {/* Grid */}
          {ticks.map((t, i) => {
            const x = PAD_L + t * CW;
            return (
              <g key={i}>
                <line x1={x} y1={0} x2={x} y2={H - 28} stroke={C.border} strokeWidth={1} />
                <text x={x} y={H - 9} textAnchor="middle" fill={C.muted} fontSize={10}>{fmtP(minV + t * span)}</text>
              </g>
            );
          })}

          {rows.map((row, i) => {
            const barY  = i * ROW_H + 18 + (ROW_H - BAR_H) / 2;
            const x1    = PAD_L + toX(row.low)  * CW;
            const x2    = PAD_L + toX(row.high) * CW;
            const barW  = Math.max(x2 - x1, 6);
            return (
              <g key={i}>
                <text x={PAD_L - 10} y={barY + BAR_H / 2 + 4} textAnchor="end" fill={C.text} fontSize={11.5} fontWeight="600">{row.label}</text>
                <rect x={x1} y={barY} width={barW} height={BAR_H} fill={row.color} opacity={0.15} rx={3} />
                <rect x={x1} y={barY} width={barW} height={BAR_H} fill={row.color} opacity={0.72} rx={3} />
                <rect x={x1} y={barY} width={4} height={BAR_H} fill={row.color} />
                <rect x={x2 - 4} y={barY} width={4} height={BAR_H} fill={row.color} />
                <text x={x1 - 5} y={barY + BAR_H / 2 + 4} textAnchor="end"   fill={row.color} fontSize={10} fontWeight="700">{fmtP(row.low)}</text>
                <text x={x2 + 5} y={barY + BAR_H / 2 + 4} textAnchor="start" fill={row.color} fontSize={10} fontWeight="700">{fmtP(row.high)}</text>
              </g>
            );
          })}

          {/* Current price marker */}
          {(() => {
            const cx = PAD_L + toX(current) * CW;
            return (
              <g>
                <line x1={cx} y1={18} x2={cx} y2={H - 28} stroke={C.gold} strokeWidth={2.5} strokeDasharray="6,3" />
                <rect x={cx - 38} y={0} width={76} height={20} fill={C.gold} rx={3} />
                <text x={cx} y={14} textAnchor="middle" fill={C.white} fontSize={10} fontWeight="800">Current {fmtP(current)}</text>
                <polygon points={`${cx},${H - 28} ${cx - 6},${H - 19} ${cx + 6},${H - 19}`} fill={C.gold} />
              </g>
            );
          })()}
        </svg>
      </div>
    </div>
  );
}

// ─── Company Header ───────────────────────────────────────────────────────────
function CompanyHeader({ company: co }) {
  const metrics = [
    { label: "Share Price",       value: fmtP(co.currentPrice) },
    { label: "Market Cap",        value: fmtB(co.marketCap) },
    { label: "Enterprise Value",  value: fmtB(co.enterpriseValue) },
    { label: "Revenue",           value: fmtB(co.revenue) },
    { label: "EBITDA",            value: fmtB(co.ebitda) },
    { label: "EBITDA Margin",     value: fmtPct(co.ebitdaMargin) },
    { label: "Net Income",        value: fmtB(co.netIncome) },
    { label: "Net Debt",          value: fmtB(co.netDebt) },
  ];

  return (
    <div style={{ background: `linear-gradient(140deg, #0B1729 0%, #1C3557 100%)`, borderRadius: "8px 8px 0 0", padding: "26px 28px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 7, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: C.white, letterSpacing: "-0.025em" }}>{co.name}</h2>
            <span style={{ background: C.gold, color: C.navy, fontWeight: 800, fontSize: 11, padding: "3px 9px", borderRadius: 3, letterSpacing: "0.05em" }}>{co.ticker}</span>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>{co.exchange}</span>
          </div>
          <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, marginBottom: 9, letterSpacing: "0.02em" }}>
            {co.sector} &nbsp;·&nbsp; {co.industry}
          </div>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 12.5, lineHeight: 1.68, margin: 0, maxWidth: 600 }}>{co.description}</p>
        </div>
        <div style={{ textAlign: "right", paddingLeft: 24, flexShrink: 0 }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.09em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", marginBottom: 3 }}>Fiscal Period</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.65)" }}>{co.fiscalYear}</div>
          <div style={{ fontSize: 9.5, marginTop: 12, fontWeight: 700, letterSpacing: "0.09em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", marginBottom: 3 }}>Analysis Type</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.55)" }}>Market · Asset-Based</div>
        </div>
      </div>

      <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        {metrics.map((m, i) => (
          <div key={i} style={{
            flex: 1, padding: "13px 10px",
            borderRight: i < metrics.length - 1 ? "1px solid rgba(255,255,255,0.09)" : "none",
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(255,255,255,0.37)", textTransform: "uppercase", marginBottom: 5 }}>{m.label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.white }}>{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Comparable Companies ────────────────────────────────────────────────
function CompsTab({ data }) {
  const { comparableCompanies: comps, compsValuation: cv, company: co } = data;

  const rows = [
    ...comps.map((c) => [
      c.name,
      <span style={{ color: C.navyLight, fontFamily: "monospace", fontWeight: 700, fontSize: 11.5 }}>{c.ticker}</span>,
      fmtB(c.marketCap),
      fmtB(c.enterpriseValue),
      fmtX(c.evRevenue),
      fmtX(c.evEbitda),
      fmtX(c.peRatio),
      fmtX(c.pbRatio),
      fmtPct(c.ebitdaMargin),
    ]),
    [
      `${co.name} (Subject)`,
      <span style={{ color: C.gold, fontFamily: "monospace", fontWeight: 800, fontSize: 11.5 }}>{co.ticker}</span>,
      fmtB(co.marketCap),
      fmtB(co.enterpriseValue),
      safe(fmtX, co.enterpriseValue / co.revenue),
      safe(fmtX, co.enterpriseValue / co.ebitda),
      safe(fmtX, co.netIncome > 0 ? co.marketCap / co.netIncome : null),
      "—",
      fmtPct(co.ebitdaMargin),
    ],
  ];

  return (
    <div>
      <SectionLabel>Public Comparable Company Universe</SectionLabel>
      <div style={{ overflowX: "auto", marginBottom: 20 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <THead headers={["Company", "Ticker", "Mkt Cap", "EV", "EV / Rev", "EV / EBITDA", "P / E", "P / BV", "EBITDA Mgn"]} />
          <tbody>
            {rows.map((r, i) => (
              <TRow key={i} cells={r} alt={i % 2 !== 0} highlight={i === rows.length - 1} />
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 4 }}>
        <StatBox label="Multiple Range Applied" value={`${fmtX(cv.evEbitdaRange?.[0])} – ${fmtX(cv.evEbitdaRange?.[1])} EV/EBITDA`} />
        <StatBox label="Implied Share Price" value={`${fmtP(cv.impliedSharePriceLow)} – ${fmtP(cv.impliedSharePriceHigh)}`} highlight />
        <StatBox label="Implied Equity Value" value={`${fmtB(cv.impliedEquityLow)} – ${fmtB(cv.impliedEquityHigh)}`} />
      </div>
      <Commentary text={cv.commentary} />
    </div>
  );
}

// ─── Tab: Precedent Transactions ──────────────────────────────────────────────
function PrecedentTab({ data }) {
  const { precedentTransactions: txns, precedentValuation: pv } = data;
  const validPremiums = txns.filter(t => t.premiumPaid > 0);
  const avgPrem = validPremiums.reduce((s, t) => s + t.premiumPaid, 0) / (validPremiums.length || 1);

  const rows = txns.map((t) => [
    t.target,
    t.acquirer,
    String(t.year),
    fmtB(t.dealValue),
    fmtX(t.evRevenue),
    fmtX(t.evEbitda),
    <span style={{ color: t.premiumPaid > 0 ? C.green : C.sub, fontWeight: 600 }}>{fmtPct(t.premiumPaid)}</span>,
  ]);

  return (
    <div>
      <SectionLabel>Selected M&amp;A Transaction Universe</SectionLabel>
      <div style={{ overflowX: "auto", marginBottom: 20 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <THead headers={["Target", "Acquirer", "Year", "Deal Value", "EV / Revenue", "EV / EBITDA", "Acq. Premium"]} />
          <tbody>
            {rows.map((r, i) => (
              <TRow key={i} cells={r} alt={i % 2 !== 0} />
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 4 }}>
        <StatBox label="Mean Control Premium" value={fmtPct(avgPrem)} />
        <StatBox label="Implied Share Price" value={`${fmtP(pv.impliedSharePriceLow)} – ${fmtP(pv.impliedSharePriceHigh)}`} highlight />
        <StatBox label="Implied Equity Value" value={`${fmtB(pv.impliedEquityLow)} – ${fmtB(pv.impliedEquityHigh)}`} />
      </div>
      <Commentary text={pv.commentary} />
    </div>
  );
}

// ─── Tab: Asset-Based ─────────────────────────────────────────────────────────
function AssetTab({ data }) {
  const { assetBasedValuation: av } = data;

  const totalBA = av.assets.reduce((s, a) => s + a.bookValue, 0);
  const totalAA = av.assets.reduce((s, a) => s + a.adjustedValue, 0);
  const totalBL = av.liabilities.reduce((s, l) => s + l.bookValue, 0);
  const totalAL = av.liabilities.reduce((s, l) => s + l.adjustedValue, 0);

  const DeltaCell = ({ adj, book, invert }) => {
    const d = adj - book;
    const pos = invert ? d <= 0 : d >= 0;
    return <span style={{ color: pos ? C.green : C.red, fontWeight: 600 }}>{d >= 0 ? "+" : ""}{fmtB(d)}</span>;
  };

  const assetRows = [
    ...av.assets.map((a) => [
      a.category,
      fmtB(a.bookValue),
      fmtB(a.adjustedValue),
      <DeltaCell adj={a.adjustedValue} book={a.bookValue} />,
      <span style={{ fontSize: 11, color: C.muted }}>{a.adjustmentNote}</span>,
    ]),
    [
      "Total Assets",
      fmtB(totalBA),
      <strong>{fmtB(totalAA)}</strong>,
      <DeltaCell adj={totalAA} book={totalBA} />,
      "",
    ],
  ];

  const liabRows = [
    ...av.liabilities.map((l) => [
      l.category,
      fmtB(l.bookValue),
      fmtB(l.adjustedValue),
      <DeltaCell adj={l.adjustedValue} book={l.bookValue} invert />,
      <span style={{ fontSize: 11, color: C.muted }}>{l.adjustmentNote}</span>,
    ]),
    [
      "Total Liabilities",
      fmtB(totalBL),
      <strong>{fmtB(totalAL)}</strong>,
      <DeltaCell adj={totalAL} book={totalBL} invert />,
      "",
    ],
  ];

  return (
    <div>
      <SectionLabel>Asset Schedule — Fair Value Adjustments</SectionLabel>

      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", color: C.navyMid, marginBottom: 7 }}>Assets</div>
      <div style={{ overflowX: "auto", marginBottom: 18 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <THead headers={["Category", "Book Value", "Fair Value", "Δ Adjustment", "Methodology / Notes"]} />
          <tbody>
            {assetRows.map((r, i) => (
              <TRow key={i} cells={r} alt={i % 2 !== 0} highlight={i === assetRows.length - 1} />
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", color: C.navyMid, marginBottom: 7 }}>Liabilities</div>
      <div style={{ overflowX: "auto", marginBottom: 20 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <THead headers={["Category", "Book Value", "Adj. Value", "Δ Adjustment", "Methodology / Notes"]} />
          <tbody>
            {liabRows.map((r, i) => (
              <TRow key={i} cells={r} alt={i % 2 !== 0} highlight={i === liabRows.length - 1} />
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 4 }}>
        <StatBox label="Book NAV" value={fmtB(av.bookNAV)} />
        <StatBox label="Adjusted NAV" value={fmtB(av.adjustedNAV)} highlight />
        <StatBox label="Implied Share Price" value={`${fmtP(av.impliedSharePriceLow)} – ${fmtP(av.impliedSharePriceHigh)}`} />
        <StatBox label="Implied Equity Range" value={`${fmtB(av.impliedEquityLow)} – ${fmtB(av.impliedEquityHigh)}`} />
      </div>
      <Commentary text={av.commentary} />
    </div>
  );
}

// ─── Tab: Valuation Summary ───────────────────────────────────────────────────
function SummaryTab({ data }) {
  const { compsValuation: cv, precedentValuation: pv, assetBasedValuation: av, company: co } = data;

  const methods = [
    { label: "Comparable Companies",   low: cv.impliedSharePriceLow, high: cv.impliedSharePriceHigh, eqLow: cv.impliedEquityLow, eqHigh: cv.impliedEquityHigh },
    { label: "Precedent Transactions", low: pv.impliedSharePriceLow, high: pv.impliedSharePriceHigh, eqLow: pv.impliedEquityLow, eqHigh: pv.impliedEquityHigh },
    { label: "Asset-Based Approach",   low: av.impliedSharePriceLow, high: av.impliedSharePriceHigh, eqLow: av.impliedEquityLow, eqHigh: av.impliedEquityHigh },
  ];

  return (
    <div>
      <FootballField data={data} />

      <SectionLabel>Valuation Summary Bridge</SectionLabel>
      <div style={{ overflowX: "auto", marginBottom: 20 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <THead headers={["Methodology", "Low", "Midpoint", "High", "Equity (Low)", "Equity (High)", "vs. Current"]} />
          <tbody>
            {methods.map((m, i) => {
              const mid = (m.low + m.high) / 2;
              const vs  = ((mid - co.currentPrice) / co.currentPrice) * 100;
              return (
                <TRow key={i} cells={[
                  m.label,
                  <span style={{ color: C.sub }}>{fmtP(m.low)}</span>,
                  <strong style={{ color: C.navy }}>{fmtP(mid)}</strong>,
                  <span style={{ color: C.sub }}>{fmtP(m.high)}</span>,
                  <span style={{ color: C.sub }}>{fmtB(m.eqLow)}</span>,
                  <span style={{ color: C.sub }}>{fmtB(m.eqHigh)}</span>,
                  <span style={{ color: vs >= 0 ? C.green : C.red, fontWeight: 700 }}>
                    {vs >= 0 ? "+" : ""}{fmtPct(vs)}
                  </span>,
                ]} alt={i % 2 !== 0} />
              );
            })}
            <TRow cells={[
              "Current Market Price",
              <strong style={{ fontSize: 15 }}>{fmtP(co.currentPrice)}</strong>,
              "",
              "",
              <span style={{ color: C.sub }}>Market Cap: {fmtB(co.marketCap)}</span>,
              <span style={{ color: C.sub }}>EV: {fmtB(co.enterpriseValue)}</span>,
              "",
            ]} highlight />
          </tbody>
        </table>
      </div>

      <div style={{ background: "#F0F3FA", border: `1px solid ${C.border}`, borderRadius: 6, padding: "11px 16px", fontSize: 11, color: C.muted, lineHeight: 1.65 }}>
        <strong style={{ color: C.sub }}>Disclaimer:</strong> This analysis is AI-generated for illustrative and educational purposes only. Financial data is modeled and may not reflect actual current financials. This does not constitute investment advice or a fairness opinion.
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", color: C.navyMid, marginBottom: 10 }}>
      {children}
    </div>
  );
}

// ─── API call ─────────────────────────────────────────────────────────────────
async function fetchValuation(company) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: "You are a senior investment banking analyst at Goldman Sachs. Generate realistic, detailed, and internally consistent valuation analyses using accurate market knowledge about real companies. Respond ONLY with a valid JSON object. No markdown, no backticks, no explanation, no preamble. All dollar values in billions. All per-share prices in dollars.",
      messages: [{
        role: "user",
        content: `Generate a complete institutional valuation tear sheet for: ${company}

Return ONLY this JSON. Use real, publicly known financial data where possible and make all figures internally consistent:

{
  "company": {
    "name": "Full legal company name",
    "ticker": "TICKER",
    "exchange": "NYSE or NASDAQ",
    "sector": "Sector",
    "industry": "Industry subsector",
    "description": "2-sentence company description",
    "currentPrice": 185.50,
    "marketCap": 85.2,
    "enterpriseValue": 92.1,
    "revenue": 28.4,
    "ebitda": 8.1,
    "ebitdaMargin": 28.5,
    "netIncome": 5.2,
    "netDebt": 6.9,
    "totalAssets": 45.2,
    "totalLiabilities": 28.1,
    "fiscalYear": "FY2024"
  },
  "comparableCompanies": [
    { "name": "string", "ticker": "string", "marketCap": 0, "enterpriseValue": 0, "evRevenue": 0, "evEbitda": 0, "peRatio": 0, "pbRatio": 0, "revenue": 0, "ebitda": 0, "ebitdaMargin": 0 }
  ],
  "compsValuation": {
    "evRevenueRange": [0, 0],
    "evEbitdaRange": [0, 0],
    "peRange": [0, 0],
    "impliedSharePriceLow": 0,
    "impliedSharePriceHigh": 0,
    "impliedEquityLow": 0,
    "impliedEquityHigh": 0,
    "commentary": "2-3 sentence professional analyst commentary on the comparable company analysis, key observations, and what the multiple spread implies."
  },
  "precedentTransactions": [
    { "target": "string", "acquirer": "string", "year": 2023, "dealValue": 0, "evRevenue": 0, "evEbitda": 0, "premiumPaid": 0, "strategicRationale": "string" }
  ],
  "precedentValuation": {
    "evRevenueRange": [0, 0],
    "evEbitdaRange": [0, 0],
    "impliedSharePriceLow": 0,
    "impliedSharePriceHigh": 0,
    "impliedEquityLow": 0,
    "impliedEquityHigh": 0,
    "commentary": "2-3 sentence commentary on the transaction universe, control premium trends, and how strategic vs. financial buyer dynamics affect valuation."
  },
  "assetBasedValuation": {
    "assets": [
      { "category": "Cash & Equivalents", "bookValue": 0, "adjustedValue": 0, "adjustmentNote": "string" },
      { "category": "Accounts Receivable", "bookValue": 0, "adjustedValue": 0, "adjustmentNote": "string" },
      { "category": "Inventory", "bookValue": 0, "adjustedValue": 0, "adjustmentNote": "string" },
      { "category": "PP&E, Net", "bookValue": 0, "adjustedValue": 0, "adjustmentNote": "string" },
      { "category": "Intangible Assets", "bookValue": 0, "adjustedValue": 0, "adjustmentNote": "string" },
      { "category": "Goodwill", "bookValue": 0, "adjustedValue": 0, "adjustmentNote": "string" },
      { "category": "Other Assets", "bookValue": 0, "adjustedValue": 0, "adjustmentNote": "string" }
    ],
    "liabilities": [
      { "category": "Accounts Payable", "bookValue": 0, "adjustedValue": 0, "adjustmentNote": "string" },
      { "category": "Short-term Debt", "bookValue": 0, "adjustedValue": 0, "adjustmentNote": "string" },
      { "category": "Long-term Debt", "bookValue": 0, "adjustedValue": 0, "adjustmentNote": "string" },
      { "category": "Operating Liabilities", "bookValue": 0, "adjustedValue": 0, "adjustmentNote": "string" },
      { "category": "Other Liabilities", "bookValue": 0, "adjustedValue": 0, "adjustmentNote": "string" }
    ],
    "bookNAV": 0,
    "adjustedNAV": 0,
    "impliedSharePriceLow": 0,
    "impliedSharePriceHigh": 0,
    "impliedEquityLow": 0,
    "impliedEquityHigh": 0,
    "commentary": "2-3 sentence commentary on the asset-based approach, which asset categories required the most significant adjustments, and the limitations of this method for the subject company."
  }
}

Include 5-7 comparable companies and 5-7 precedent transactions. Make all data realistic, current, and internally consistent.`
      }]
    })
  });

  const json = await res.json();
  const raw  = (json.content || []).map((b) => b.text || "").join("");
  const clean = raw.replace(/```json\n?|```\n?/g, "").trim();
  return JSON.parse(clean);
}

// ─── Loading messages ─────────────────────────────────────────────────────────
const MSGS = [
  "Screening comparable universe…",
  "Benchmarking transaction multiples…",
  "Marking assets to fair value…",
  "Computing implied equity ranges…",
  "Building institutional tear sheet…",
];

const TABS = [
  { id: "comps",     label: "Comparable Companies" },
  { id: "precedent", label: "Precedent Transactions" },
  { id: "asset",     label: "Asset-Based Approach" },
  { id: "summary",   label: "Valuation Summary" },
];

const EXAMPLES = ["Apple Inc.", "ExxonMobil", "JPMorgan Chase", "NVIDIA", "Caterpillar", "Marriott International"];

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function ValuationTearSheet() {
  const [input,     setInput]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [data,      setData]      = useState(null);
  const [activeTab, setActiveTab] = useState("comps");
  const [error,     setError]     = useState("");
  const [loadMsg,   setLoadMsg]   = useState(MSGS[0]);

  const run = async (q) => {
    const query = (q || input).trim();
    if (!query || loading) return;
    setLoading(true);
    setError("");
    setData(null);
    setLoadMsg(MSGS[0]);

    let mi = 0;
    const iv = setInterval(() => { mi = (mi + 1) % MSGS.length; setLoadMsg(MSGS[mi]); }, 2800);

    try {
      const result = await fetchValuation(query);
      setData(result);
      setActiveTab("comps");
    } catch (e) {
      setError("Analysis failed — please try a different company name or check your connection.");
      console.error(e);
    } finally {
      clearInterval(iv);
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,BlinkMacSystemFont,sans-serif", background: C.bg, minHeight: "100vh", padding: "20px 16px 48px" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        button:hover { opacity: 0.88; }
        input:focus { border-color: #1C3557 !important; box-shadow: 0 0 0 3px rgba(28,53,87,0.12) !important; }
      `}</style>

      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        {/* Tool header */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: C.gold, marginBottom: 4 }}>
            Valuation Intelligence Platform
          </div>
          <h1 style={{ margin: "0 0 5px", fontSize: 24, fontWeight: 900, color: C.navy, letterSpacing: "-0.025em" }}>
            Market &amp; Asset-Based Valuation
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: C.sub }}>
            Comparable company analysis · Precedent M&amp;A transactions · Asset-based NAV · Institutional tear sheets
          </p>
        </div>

        {/* Search bar */}
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder="Company name or ticker — e.g. Apple, MSFT, ExxonMobil, JPMorgan Chase"
            style={{
              flex: 1, padding: "12px 16px", fontSize: 13.5,
              border: `1.5px solid ${C.border}`, borderRadius: 6,
              background: C.white, color: C.text, outline: "none",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)", transition: "border-color 0.2s, box-shadow 0.2s"
            }}
          />
          <button
            onClick={() => run()}
            disabled={loading}
            style={{
              padding: "12px 26px", background: loading ? C.muted : C.navy,
              color: C.white, border: "none", borderRadius: 6, fontWeight: 800,
              fontSize: 13.5, cursor: loading ? "not-allowed" : "pointer",
              letterSpacing: "0.02em", whiteSpace: "nowrap", transition: "background 0.2s, opacity 0.2s"
            }}
          >
            {loading ? "Analyzing…" : "Run Valuation →"}
          </button>
        </div>

        {/* Example chips */}
        {!data && !loading && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            <span style={{ fontSize: 11.5, color: C.muted, alignSelf: "center" }}>Try:</span>
            {EXAMPLES.map((ex) => (
              <button key={ex} onClick={() => { setInput(ex); run(ex); }} style={{
                padding: "5px 12px", fontSize: 11.5, border: `1px solid ${C.border}`,
                borderRadius: 20, background: C.white, color: C.sub,
                cursor: "pointer", fontWeight: 500, transition: "all 0.15s"
              }}>{ex}</button>
            ))}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div style={{ textAlign: "center", padding: "70px 0" }}>
            <div style={{ width: 38, height: 38, margin: "0 auto 18px", border: `3px solid ${C.border}`, borderTopColor: C.navy, borderRadius: "50%", animation: "spin 0.75s linear infinite" }} />
            <div style={{ fontSize: 14, color: C.sub, fontWeight: 600 }}>{loadMsg}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>Generating institutional-grade analysis…</div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: C.redBg, border: "1px solid #FCA5A5", borderRadius: 6, padding: "13px 18px", color: C.red, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Tear sheet */}
        {data && !loading && (
          <div style={{ boxShadow: "0 6px 40px rgba(0,0,0,0.13)", borderRadius: 8, overflow: "hidden" }}>
            <CompanyHeader company={data.company} />

            {/* Tabs */}
            <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, display: "flex", overflowX: "auto" }}>
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: "13px 22px", fontWeight: activeTab === tab.id ? 800 : 500,
                    fontSize: 13, color: activeTab === tab.id ? C.navy : C.sub,
                    background: "none", border: "none", cursor: "pointer",
                    borderBottom: activeTab === tab.id ? `2.5px solid ${C.gold}` : "2.5px solid transparent",
                    marginBottom: -1, transition: "all 0.15s", whiteSpace: "nowrap",
                    letterSpacing: "0.01em"
                  }}
                >{tab.label}</button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ background: C.white, padding: "26px 28px 34px", borderRadius: "0 0 8px 8px" }}>
              {activeTab === "comps"     && <CompsTab     data={data} />}
              {activeTab === "precedent" && <PrecedentTab data={data} />}
              {activeTab === "asset"     && <AssetTab     data={data} />}
              {activeTab === "summary"   && <SummaryTab   data={data} />}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!data && !loading && !error && (
          <div style={{ textAlign: "center", padding: "64px 20px", color: C.muted }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>📊</div>
            <div style={{ fontSize: 15.5, fontWeight: 700, color: C.sub, marginBottom: 7 }}>Enter a company to generate a valuation tear sheet</div>
            <div style={{ fontSize: 13, lineHeight: 1.7 }}>
              Produces comparable company analysis, precedent transaction benchmarking,<br />
              and an asset-based NAV with institutional-grade formatting and commentary.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
