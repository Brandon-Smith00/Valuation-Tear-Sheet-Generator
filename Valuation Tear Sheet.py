"""
Valuation Tear Sheet Generator
Change COMPANY and GROQ_API_KEY below, then run: python valuation_tearsheet.py
pip install groq reportlab
"""

import os, json, sys
from groq import Groq
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.lib.colors import HexColor, white

# ─────────────────────────────────────────────────────────────────────────────
COMPANY      = "Taiwan Semiconductor Manufacturing Company"      # ← change this
GROQ_API_KEY = ""         # ← paste your Groq key here (console.groq.com)
# ─────────────────────────────────────────────────────────────────────────────

OUTPUT_DIR = "."
MODEL      = "llama-3.3-70b-versatile"

NAVY     = HexColor('#0B1729')
NAVY_MID = HexColor('#1C3557')
NAVY_LT  = HexColor('#2B5BA8')
BLUE_BAR = HexColor('#4A6FA5')
GOLD     = HexColor('#C9A452')
GOLD_DIM = HexColor('#A07C30')
GOLD_BG  = HexColor('#FBF7ED')
BG       = HexColor('#ECEEF3')
BORDER   = HexColor('#DCE0E9')
TEXT     = HexColor('#0B1729')
SUB      = HexColor('#4A5770')
MUTED    = HexColor('#8592A6')
GREEN    = HexColor('#1A7F5A')
RED      = HexColor('#B03030')
ROW_ALT  = HexColor('#F4F6FA')
W, H     = letter

def fmt_b(n, d=1):
    if n is None: return "—"
    a = abs(n)
    if a >= 1000: return f"${n/1000:.{d}f}T"
    if a >= 1:    return f"${n:.{d}f}B"
    return f"${n*1000:.0f}M"

def fmt_p(n):   return f"${n:.2f}" if n is not None else "—"
def fmt_x(n):   return f"{n:.1f}x" if (n is not None and n > 0) else "N/A"
def fmt_pct(n): return f"{n:.1f}%" if n is not None else "—"

def pg_stamp(c, pg, tot):
    c.setFont("Helvetica", 7); c.setFillColor(MUTED)
    c.drawString(36, H-22, "CONFIDENTIAL — FOR ILLUSTRATIVE AND EDUCATIONAL PURPOSES ONLY")
    c.drawRightString(W-36, H-22, f"Page {pg} of {tot}")
    c.setStrokeColor(BORDER); c.setLineWidth(0.5); c.line(36, H-26, W-36, H-26)

def box(c, x, y, w, h, fill=None, stroke=None, sw=0.5):
    if fill:   c.setFillColor(fill);    c.rect(x, y, w, h, fill=1, stroke=0)
    if stroke: c.setStrokeColor(stroke); c.setLineWidth(sw); c.rect(x, y, w, h, fill=0, stroke=1)

def hl(c, x1, y, x2, col=None, lw=0.4):
    c.setStrokeColor(col or BORDER); c.setLineWidth(lw); c.line(x1, y, x2, y)

def vl(c, x, y1, y2, col=None, lw=0.4):
    c.setStrokeColor(col or BORDER); c.setLineWidth(lw); c.line(x, y1, x, y2)

def tx(c, x, y, s, font="Helvetica", sz=8, col=TEXT, align="left"):
    c.setFont(font, sz); c.setFillColor(col); s = str(s)
    if   align == "right":  c.drawRightString(x, y, s)
    elif align == "center": c.drawCentredString(x, y, s)
    else:                   c.drawString(x, y, s)

def wrap(c, text, x, y, max_w, font="Helvetica", sz=8, col=TEXT, lead=11, max_l=4):
    c.setFont(font, sz); c.setFillColor(col)
    words = text.split(); line, lines = "", []
    for w in words:
        test = (line + " " + w).strip()
        if c.stringWidth(test, font, sz) <= max_w: line = test
        else: lines.append(line); line = w
    if line: lines.append(line)
    for i, ln in enumerate(lines[:max_l]): c.drawString(x, y - i * lead, ln)

def stat_box(c, bx, by, bw, bh, label, value, hi=False):
    bg = NAVY_MID if hi else BG
    box(c, bx, by, bw, bh, fill=bg, stroke=BORDER if not hi else HexColor('#26487A'))
    lc = HexColor('#99AACC') if hi else MUTED
    c.setFont("Helvetica-Bold", 6); c.setFillColor(lc); c.drawString(bx+7, by+bh-10, label)
    vsz = 10 if len(value) > 14 else 12
    c.setFont("Helvetica-Bold", vsz); c.setFillColor(white if hi else NAVY)
    c.drawString(bx+7, by+7, value)

def comm_box(c, x, y, w, h, label, text):
    box(c, x, y, 4, h, fill=GOLD); box(c, x+4, y, w-4, h, fill=GOLD_BG)
    tx(c, x+10, y+h-10, label, "Helvetica-Bold", 7, GOLD_DIM)
    wrap(c, text, x+10, y+h-22, w-20, sz=8, col=TEXT)

def sec_label(c, x, y, text):
    tx(c, x, y, text, "Helvetica-Bold", 8, NAVY_MID)

def tbl_header(c, col_x, col_w, headers, top, rh=16):
    box(c, 36, top-rh, W-72, rh, fill=NAVY)
    for i, (h, x, w) in enumerate(zip(headers, col_x, col_w)):
        al = "left" if i == 0 else "right"
        xp = x+5 if al == "left" else x+w-5
        tx(c, xp, top-rh+5, h, "Helvetica-Bold", 6.5, white, al)

def tbl_row(c, ry, rh, cells, col_x, col_w, alt=False, hi=False,
            hi_bg=GOLD_BG, hi_bdr=GOLD, colors=None, bolds=None, sizes=None):
    if hi:
        box(c, 36, ry, W-72, rh, fill=hi_bg)
        c.setStrokeColor(hi_bdr); c.setLineWidth(1); c.rect(36, ry, W-72, rh, fill=0, stroke=1)
    elif alt:
        box(c, 36, ry, W-72, rh, fill=ROW_ALT)
    hl(c, 36, ry, W-36, BORDER, 0.3)
    for i, (cell, x, w) in enumerate(zip(cells, col_x, col_w)):
        col  = colors[i] if colors else (TEXT if i == 0 else SUB)
        bold = bolds[i]  if bolds  else (i == 0 or hi)
        sz   = sizes[i]  if sizes  else 8
        font = "Helvetica-Bold" if bold else "Helvetica"
        al   = "left" if i == 0 else "right"
        xp   = x+5 if al == "left" else x+w-5
        s = str(cell)
        while i == 0 and c.stringWidth(s, font, sz) > w-10 and len(s) > 12:
            s = s[:-4]+"..."
        tx(c, xp, ry+5, s, font, sz, col, al)

PROMPT = """You are a senior Goldman Sachs investment banking analyst. Generate a realistic institutional valuation tear sheet for: {company}

Use the most current and accurate financial data available. Set fiscalYear to "FY2025" exactly.
CRITICAL: Valuation ranges must be TIGHT — no wider than 15% spread from midpoint. Use 35th-65th percentile multiples only.

Respond ONLY with valid JSON, no markdown, no backticks, no explanation:

{{
  "company": {{
    "name": "Full legal company name",
    "ticker": "TICKER",
    "exchange": "NYSE or NASDAQ",
    "sector": "Sector",
    "industry": "Industry subsector",
    "description": "2-sentence company description",
    "currentPrice": 0.00,
    "marketCap": 0.0,
    "enterpriseValue": 0.0,
    "revenue": 0.0,
    "ebitda": 0.0,
    "ebitdaMargin": 0.0,
    "netIncome": 0.0,
    "netDebt": 0.0,
    "fiscalYear": "FY2024"
  }},
  "comparableCompanies": [
    {{"name":"","ticker":"","marketCap":0,"enterpriseValue":0,"evRevenue":0,"evEbitda":0,"peRatio":0,"pbRatio":0,"ebitdaMargin":0}}
  ],
  "compsValuation": {{
    "multRange": "X.Xx - X.Xx EV/EBITDA",
    "impliedSharePriceLow": 0.00,
    "impliedSharePriceHigh": 0.00,
    "impliedEquityLow": 0.0,
    "impliedEquityHigh": 0.0,
    "commentary": "2-3 sentence professional commentary."
  }},
  "precedentTransactions": [
    {{"target":"","acquirer":"","year":2023,"dealValue":0,"evRevenue":0,"evEbitda":0,"premiumPaid":0}}
  ],
  "precedentValuation": {{
    "avgPremium": 0.0,
    "impliedSharePriceLow": 0.00,
    "impliedSharePriceHigh": 0.00,
    "impliedEquityLow": 0.0,
    "impliedEquityHigh": 0.0,
    "commentary": "2-3 sentence professional commentary."
  }},
  "assetBasedValuation": {{
    "assets": [
      {{"category":"Cash & Equivalents","bookValue":0,"adjustedValue":0,"adjustmentNote":""}},
      {{"category":"Accounts Receivable","bookValue":0,"adjustedValue":0,"adjustmentNote":""}},
      {{"category":"Inventory","bookValue":0,"adjustedValue":0,"adjustmentNote":""}},
      {{"category":"PP&E, Net","bookValue":0,"adjustedValue":0,"adjustmentNote":""}},
      {{"category":"Intangible Assets","bookValue":0,"adjustedValue":0,"adjustmentNote":""}},
      {{"category":"Goodwill","bookValue":0,"adjustedValue":0,"adjustmentNote":""}},
      {{"category":"Other Assets","bookValue":0,"adjustedValue":0,"adjustmentNote":""}}
    ],
    "liabilities": [
      {{"category":"Accounts Payable","bookValue":0,"adjustedValue":0,"adjustmentNote":""}},
      {{"category":"Short-term Debt","bookValue":0,"adjustedValue":0,"adjustmentNote":""}},
      {{"category":"Long-term Debt","bookValue":0,"adjustedValue":0,"adjustmentNote":""}},
      {{"category":"Operating Liabilities","bookValue":0,"adjustedValue":0,"adjustmentNote":""}},
      {{"category":"Other Liabilities","bookValue":0,"adjustedValue":0,"adjustmentNote":""}}
    ],
    "bookNAV": 0.0,
    "adjustedNAV": 0.0,
    "impliedSharePriceLow": 0.00,
    "impliedSharePriceHigh": 0.00,
    "impliedEquityLow": 0.0,
    "impliedEquityHigh": 0.0,
    "commentary": "2-3 sentence professional commentary."
  }}
}}

Include 5-7 comparable companies and 5-7 precedent transactions. All dollar values in billions. Per-share prices in dollars. Make all data realistic and internally consistent."""

def fetch_data(company):
    print(f"  Calling Groq ({MODEL}) for {company}...")
    client = Groq(api_key=GROQ_API_KEY)
    resp = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": PROMPT.format(company=company)}],
        temperature=0.2,
        max_tokens=4096,
    )
    raw = resp.choices[0].message.content.strip()
    raw = raw.replace("```json","").replace("```","").strip()
    return json.loads(raw)

def build_pdf(d, output_path):
    co  = d["company"]
    cmp = d["comparableCompanies"]
    txn = d["precedentTransactions"]
    av  = d["assetBasedValuation"]
    cv  = d["compsValuation"]
    pv  = d["precedentValuation"]

    c = rl_canvas.Canvas(output_path, pagesize=letter)

    # PAGE 1
    pg_stamp(c, 1, 3)
    HDR_TOP = H-34; HDR_H = 152
    box(c, 36, HDR_TOP-HDR_H, W-72, HDR_H, fill=HexColor('#0D1E35'))
    c.setFont("Helvetica-Bold", 14); c.setFillColor(white)
    name = co["name"]
    while c.stringWidth(name,"Helvetica-Bold",14) > W-72-140 and len(name)>10:
        name = name[:-4]+"..."
    c.drawString(48, HDR_TOP-22, name)
    BY = HDR_TOP-38
    box(c, 48, BY-2, 30, 13, fill=GOLD)
    tx(c, 63, BY+2, co["ticker"], "Helvetica-Bold", 7.5, NAVY, "center")
    c.setFont("Helvetica", 8); c.setFillColor(HexColor('#8899AA'))
    c.drawString(84, BY+2, f"  {co['exchange']}  .  {co['sector']}  .  {co['industry']}")
    tx(c, W-48, HDR_TOP-20, "FISCAL PERIOD",    "Helvetica-Bold", 6.5, HexColor('#556677'), "right")
    tx(c, W-48, HDR_TOP-33, co["fiscalYear"],   "Helvetica-Bold", 11,  HexColor('#BBCCDD'), "right")
    tx(c, W-48, HDR_TOP-47, "ANALYSIS TYPE",    "Helvetica-Bold", 6.5, HexColor('#556677'), "right")
    tx(c, W-48, HDR_TOP-59, "Mkt+Asset-Based",  "Helvetica",      7.5, HexColor('#8899AA'), "right")
    desc = co.get("description","")
    words = desc.split(); line=""; lines=[]
    max_desc_w = (W - 72) - 180  # leave room for right-side fiscal/analysis block
    for w in words:
        test=(line+" "+w).strip()
        if c.stringWidth(test,"Helvetica",8)<max_desc_w: line=test
        else: lines.append(line); line=w
    if line: lines.append(line)
    c.setFont("Helvetica",8); c.setFillColor(HexColor('#889AAB'))
    for i,ln in enumerate(lines[:2]): c.drawString(48, BY-14-i*11, ln)
    metrics=[("SHARE PRICE",fmt_p(co["currentPrice"])),("MARKET CAP",fmt_b(co["marketCap"])),
             ("ENTERPRISE VAL",fmt_b(co["enterpriseValue"])),("REVENUE",fmt_b(co["revenue"])),
             ("EBITDA",fmt_b(co["ebitda"])),("EBITDA MARGIN",fmt_pct(co["ebitdaMargin"])),
             ("NET INCOME",fmt_b(co["netIncome"])),("NET DEBT",fmt_b(co["netDebt"]))]
    MET_TOP=HDR_TOP-HDR_H+36
    hl(c,48,MET_TOP+16,W-48,HexColor('#1C3A5A'),0.7)
    mw=(W-72)/len(metrics)
    for i,(lbl,val) in enumerate(metrics):
        mx=48+i*mw
        tx(c,mx,MET_TOP+6, lbl,"Helvetica-Bold",6,  HexColor('#556677'))
        tx(c,mx,MET_TOP-10,val,"Helvetica-Bold",11.5,white)
        if i>0: vl(c,mx-2,MET_TOP-14,MET_TOP+14,HexColor('#1C3A5A'),0.6)
    Y=HDR_TOP-HDR_H-18
    sec_label(c,36,Y,"PUBLIC COMPARABLE COMPANY UNIVERSE")
    CW=[142,56,50,50,48,60,38,38,58]; CX=[36]; [CX.append(CX[-1]+w) for w in CW[:-1]]
    RH=16; ttop=Y-10
    tbl_header(c,CX,CW,["COMPANY","TICKER","MKT CAP","EV","EV/REV","EV/EBITDA","P/E","P/BV","EBITDA MGN"],ttop,RH)
    rows=[[cc["name"],cc["ticker"],fmt_b(cc["marketCap"]),fmt_b(cc["enterpriseValue"]),
           fmt_x(cc["evRevenue"]),fmt_x(cc["evEbitda"]),
           fmt_x(cc.get("peRatio")),fmt_x(cc.get("pbRatio")),fmt_pct(cc.get("ebitdaMargin"))] for cc in cmp]
    ev,rev,ebitda=co["enterpriseValue"],co["revenue"],co["ebitda"]
    ni,mc=co.get("netIncome",1),co["marketCap"]
    rows.append([co["name"][:34]+"... (Subject)",co["ticker"],fmt_b(mc),fmt_b(ev),
                 fmt_x(ev/rev if rev else None),fmt_x(ev/ebitda if ebitda else None),
                 fmt_x(mc/ni if ni and ni>0 else None),"—",fmt_pct(co.get("ebitdaMargin"))])
    for ri,row in enumerate(rows):
        ry=ttop-RH-(ri+1)*RH; is_s=(ri==len(rows)-1)
        cc=[NAVY,GOLD,NAVY,NAVY,NAVY,NAVY,NAVY,SUB,NAVY] if is_s else [TEXT,NAVY_LT,SUB,SUB,TEXT,TEXT,TEXT,TEXT,TEXT]
        tbl_row(c,ry,RH,row,CX,CW,alt=(ri%2==1),hi=is_s,colors=cc)
    y_b=ttop-RH-(len(rows)+1)*RH-10; bw=(W-72-16)/3
    stat_box(c,36,          y_b-34,bw,40,"MULTIPLE RANGE",cv.get("multRange","—"))
    stat_box(c,36+bw+8,     y_b-34,bw,40,"IMPLIED SHARE PRICE",
             f"{fmt_p(cv['impliedSharePriceLow'])} - {fmt_p(cv['impliedSharePriceHigh'])}",hi=True)
    stat_box(c,36+2*(bw+8), y_b-34,bw,40,"IMPLIED EQUITY VALUE",
             f"{fmt_b(cv['impliedEquityLow'])} - {fmt_b(cv['impliedEquityHigh'])}")
    y_c=y_b-60
    comm_box(c,36,y_c-46,W-72,52,"ANALYST COMMENTARY - COMPARABLE COMPANIES",cv["commentary"])
    c.showPage()

    # PAGE 2
    pg_stamp(c,2,3); Y=H-44
    sec_label(c,36,Y,"SELECTED M&A TRANSACTION UNIVERSE")
    TW=[118,110,34,56,56,60,106]; TX=[36]; [TX.append(TX[-1]+w) for w in TW[:-1]]
    RH=16; ttop=Y-10
    tbl_header(c,TX,TW,["TARGET","ACQUIRER","YEAR","DEAL VALUE","EV/REVENUE","EV/EBITDA","ACQ. PREMIUM"],ttop,RH)
    for ri,tr in enumerate(txn):
        ry=ttop-RH-(ri+1)*RH; pr=tr.get("premiumPaid")
        row=[tr["target"],tr["acquirer"],str(tr["year"]),fmt_b(tr["dealValue"]),
             fmt_x(tr["evRevenue"]),fmt_x(tr["evEbitda"]),fmt_pct(pr) if pr else "—"]
        cc=[TEXT,SUB,MUTED,SUB,TEXT,TEXT,GREEN if pr and pr>0 else SUB]
        bb=[True,False,False,False,False,False,bool(pr and pr>0)]
        tbl_row(c,ry,RH,row,TX,TW,alt=(ri%2==1),colors=cc,bolds=bb)
    y_b=ttop-RH-(len(txn)+1)*RH-10; bw=(W-72-16)/3
    stat_box(c,36,          y_b-34,bw,40,"MEAN CONTROL PREMIUM",fmt_pct(pv.get("avgPremium")))
    stat_box(c,36+bw+8,     y_b-34,bw,40,"IMPLIED SHARE PRICE",
             f"{fmt_p(pv['impliedSharePriceLow'])} - {fmt_p(pv['impliedSharePriceHigh'])}",hi=True)
    stat_box(c,36+2*(bw+8), y_b-34,bw,40,"IMPLIED EQUITY VALUE",
             f"{fmt_b(pv['impliedEquityLow'])} - {fmt_b(pv['impliedEquityHigh'])}")
    y_c=y_b-60
    comm_box(c,36,y_c-46,W-72,52,"ANALYST COMMENTARY - PRECEDENT TRANSACTIONS",pv["commentary"])
    Y2=y_c-68; sec_label(c,36,Y2,"ASSET SCHEDULE - FAIR VALUE ADJUSTMENTS")
    AW=[124,68,68,70,210]; AX=[36]; [AX.append(AX[-1]+w) for w in AW[:-1]]
    RH=15; tx(c,36,Y2-12,"ASSETS","Helvetica-Bold",7,MUTED)
    atop=Y2-20
    tbl_header(c,AX,AW,["CATEGORY","BOOK VALUE","FAIR VALUE","D ADJ.","METHODOLOGY / NOTES"],atop,RH)
    assets=av["assets"]; tot_ba=sum(a["bookValue"] for a in assets); tot_aa=sum(a["adjustedValue"] for a in assets)
    for ri,a in enumerate(assets+[{"category":"Total Assets","bookValue":tot_ba,"adjustedValue":tot_aa,"adjustmentNote":""}]):
        ry=atop-RH-(ri+1)*RH; delta=a["adjustedValue"]-a["bookValue"]; is_t=(ri==len(assets))
        if is_t: box(c,36,ry,W-72,RH,fill=HexColor('#EEF2FA')); hl(c,36,ry+RH,W-36,NAVY_MID,1)
        elif ri%2==1: box(c,36,ry,W-72,RH,fill=ROW_ALT)
        hl(c,36,ry,W-36,BORDER,0.3)
        ds=("+" if delta>=0 else "")+fmt_b(delta); nc=NAVY_MID if is_t else TEXT
        tbl_row(c,ry,RH,[a["category"],fmt_b(a["bookValue"]),fmt_b(a["adjustedValue"]),ds,a.get("adjustmentNote","")],
                AX,AW,colors=[nc,NAVY_MID if is_t else SUB,nc,GREEN if delta>=0 else RED,MUTED],
                bolds=[True,is_t,True,True,False],sizes=[8,8,8,8,7.5])
    liabs=av["liabilities"]; tot_bl=sum(l["bookValue"] for l in liabs); tot_al=sum(l["adjustedValue"] for l in liabs)
    y_l=atop-RH-(len(assets)+2)*RH-8; tx(c,36,y_l,"LIABILITIES","Helvetica-Bold",7,MUTED)
    ltop=y_l-8; tbl_header(c,AX,AW,["CATEGORY","BOOK VALUE","ADJ. VALUE","D ADJ.","METHODOLOGY / NOTES"],ltop,RH)
    for ri,l in enumerate(liabs+[{"category":"Total Liabilities","bookValue":tot_bl,"adjustedValue":tot_al,"adjustmentNote":""}]):
        ry=ltop-RH-(ri+1)*RH; delta=l["adjustedValue"]-l["bookValue"]; is_t=(ri==len(liabs))
        if is_t: box(c,36,ry,W-72,RH,fill=HexColor('#EEF2FA')); hl(c,36,ry+RH,W-36,NAVY_MID,1)
        elif ri%2==1: box(c,36,ry,W-72,RH,fill=ROW_ALT)
        hl(c,36,ry,W-36,BORDER,0.3)
        ds=("+" if delta>=0 else "")+fmt_b(delta); nc=NAVY_MID if is_t else TEXT
        tbl_row(c,ry,RH,[l["category"],fmt_b(l["bookValue"]),fmt_b(l["adjustedValue"]),ds,l.get("adjustmentNote","")],
                AX,AW,colors=[nc,NAVY_MID if is_t else SUB,nc,RED if delta>=0 else GREEN,MUTED],
                bolds=[True,is_t,True,True,False],sizes=[8,8,8,8,7.5])
    c.showPage()

    # PAGE 3
    pg_stamp(c,3,3); Y=H-44
    sec_label(c,36,Y,"ASSET-BASED VALUATION - NAV BRIDGE")
    bw4=(W-72-24)/4; y_ab=Y-14
    stat_box(c,36,            y_ab-34,bw4,40,"BOOK NAV",        fmt_b(av["bookNAV"]))
    stat_box(c,36+bw4+8,      y_ab-34,bw4,40,"ADJUSTED NAV",    fmt_b(av["adjustedNAV"]),hi=True)
    stat_box(c,36+2*(bw4+8),  y_ab-34,bw4,40,"IMPLIED SHR PRICE",
             f"{fmt_p(av['impliedSharePriceLow'])} - {fmt_p(av['impliedSharePriceHigh'])}")
    stat_box(c,36+3*(bw4+8),  y_ab-34,bw4,40,"IMPLIED EQUITY",
             f"{fmt_b(av['impliedEquityLow'])} - {fmt_b(av['impliedEquityHigh'])}")
    y_ac=y_ab-56
    comm_box(c,36,y_ac-46,W-72,52,"ANALYST COMMENTARY - ASSET-BASED APPROACH",av["commentary"])
    Y3=y_ac-65; sec_label(c,36,Y3,"FOOTBALL FIELD - IMPLIED SHARE PRICE ANALYSIS")
    ff=[("Comparable Companies",NAVY_LT, cv["impliedSharePriceLow"],cv["impliedSharePriceHigh"]),
        ("Precedent Transactions",NAVY_MID,pv["impliedSharePriceLow"],pv["impliedSharePriceHigh"]),
        ("Asset-Based Approach",BLUE_BAR,av["impliedSharePriceLow"],av["impliedSharePriceHigh"])]
    cur=co["currentPrice"]
    all_v=[v for r in ff for v in [r[2],r[3]]]+[cur]
    mn=min(all_v)*0.88; mx_v=max(all_v)*1.12; sp=mx_v-mn
    FL=158; FW=W-36-FL-36; FT=Y3-18; BH=16; RG=32
    def to_x(v): return FL+36+((v-mn)/sp)*FW
    for t_pct in [0,.25,.5,.75,1.0]:
        gx=FL+36+t_pct*FW; pr=mn+t_pct*sp
        vl(c,gx,FT+4,FT-len(ff)*RG-6,BORDER,0.4)
        tx(c,gx,FT-len(ff)*RG-16,fmt_p(pr),"Helvetica",7,MUTED,"center")
    for ri,(lbl,col,lo,hi) in enumerate(ff):
        ry=FT-ri*RG; by=ry-BH/2; x1=to_x(lo); x2=to_x(hi); bw_ff=max(x2-x1,4)
        tx(c,FL+28,ry-4,lbl,"Helvetica-Bold",8,TEXT,"right")
        lr=min(255,int(col.red*255)+80); lg=min(255,int(col.green*255)+80); lb_=min(255,int(col.blue*255)+100)
        box(c,x1,by,bw_ff,BH,fill=HexColor('#%02X%02X%02X'%(lr,lg,lb_)))
        box(c,x1,by,bw_ff,BH,fill=col)
        box(c,x1,by,3,BH,fill=col); box(c,x2-3,by,3,BH,fill=col)
        tx(c,x1-4,ry-4,fmt_p(lo),"Helvetica-Bold",7.5,col,"right")
        tx(c,x2+4,ry-4,fmt_p(hi),"Helvetica-Bold",7.5,col,"left")
    cx_l=to_x(cur); vl(c,cx_l,FT+4,FT-len(ff)*RG-6,GOLD,1.5)
    box(c,cx_l-36,FT+2,72,14,fill=GOLD)
    tx(c,cx_l,FT+9,f"Current  {fmt_p(cur)}","Helvetica-Bold",7.5,white,"center")
    Y4=FT-len(ff)*RG-38; sec_label(c,36,Y4,"VALUATION SUMMARY BRIDGE")
    SW=[150,58,64,58,68,68,72]; SX=[36]; [SX.append(SX[-1]+w) for w in SW[:-1]]
    RH=17; stop=Y4-10
    tbl_header(c,SX,SW,["METHODOLOGY","LOW","MIDPOINT","HIGH","EQUITY (LOW)","EQUITY (HIGH)","VS. CURRENT"],stop,RH)
    sum_rows=[("Comparable Companies",cv["impliedSharePriceLow"],cv["impliedSharePriceHigh"],cv["impliedEquityLow"],cv["impliedEquityHigh"]),
              ("Precedent Transactions",pv["impliedSharePriceLow"],pv["impliedSharePriceHigh"],pv["impliedEquityLow"],pv["impliedEquityHigh"]),
              ("Asset-Based Approach",av["impliedSharePriceLow"],av["impliedSharePriceHigh"],av["impliedEquityLow"],av["impliedEquityHigh"])]
    for ri,(lbl,lo,hi,eql,eqh) in enumerate(sum_rows):
        ry=stop-RH-(ri+1)*RH; mid=(lo+hi)/2; vs=((mid-cur)/cur)*100; vc=GREEN if vs>=0 else RED
        tbl_row(c,ry,RH,[lbl,fmt_p(lo),fmt_p(mid),fmt_p(hi),fmt_b(eql),fmt_b(eqh),
                         ("+" if vs>=0 else "")+fmt_pct(vs)],
                SX,SW,alt=(ri%2==1),
                colors=[TEXT,SUB,NAVY,SUB,SUB,SUB,vc],
                bolds=[True,False,True,False,False,False,True],
                sizes=[8,8,9,8,8,8,8])
    ry_cur=stop-RH-(len(sum_rows)+1)*RH
    tbl_row(c,ry_cur,RH,["Current Market Price",fmt_p(cur),"","",
                          f"Market Cap: {fmt_b(co['marketCap'])}",f"EV: {fmt_b(co['enterpriseValue'])}",""],
            SX,SW,hi=True,colors=[NAVY,NAVY,NAVY,NAVY,SUB,SUB,SUB],
            bolds=[True,True,False,False,False,False,False],sizes=[8,11,8,8,8,8,8])
    y_d=ry_cur-20
    box(c,36,y_d-18,W-72,22,fill=HexColor('#F0F3FA'),stroke=BORDER)
    c.setFont("Helvetica-Bold",7); c.setFillColor(SUB); c.drawString(44,y_d-7,"Disclaimer:")
    c.setFont("Helvetica",7); c.setFillColor(MUTED)
    c.drawString(92,y_d-7,"AI-generated for illustrative and educational purposes only. Not investment advice.")
    c.save()

if __name__ == "__main__":
    print(f"\n{'='*50}")
    print(f"  Valuation Tear Sheet — {COMPANY}")
    print(f"{'='*50}")
    print("\n  Step 1/2 — Fetching data from Groq (free)...")
    data = fetch_data(COMPANY)
    ticker = data["company"]["ticker"].replace("/","-")
    out_path = os.path.join(OUTPUT_DIR, f"{ticker}_Valuation_Tear_Sheet.pdf")
    print(f"  Step 2/2 — Building PDF...")
    build_pdf(data, out_path)
    print(f"\n  Done! Saved: {out_path}\n")