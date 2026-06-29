# Valuation Tear Sheet Generator

Generates institutional-grade 3-page valuation PDF tear sheets for any public company using AI. Covers comparable company analysis, precedent M&A transactions, and asset-based NAV — all formatted like a bulge bracket pitch book.

---

## Output

A 3-page PDF named `{TICKER}_Valuation_Tear_Sheet.pdf` containing:

- **Page 1** — Company header with key metrics + public comparable company universe
- **Page 2** — Precedent M&A transactions + asset schedule with fair value adjustments
- **Page 3** — Asset-based NAV bridge + football field chart + valuation summary table

---

## Setup (one time)

**1. Install dependencies**
```
pip install groq reportlab
```

**2. Get a free Groq API key**
- Go to [console.groq.com](https://console.groq.com)
- Sign up with Google
- Click **API Keys** → **Create API Key**
- Copy the key (starts with `gsk_`)

**3. Add your key to the script**

Open `Valuation Tear Sheet.py` and update lines 14–15:
```python
COMPANY      = "ExxonMobil"       # ← company name or ticker
GROQ_API_KEY = "gsk_..."          # ← your Groq key
```

---

## Running It

Open a terminal in the project folder and run:
```
python "Valuation Tear Sheet.py"
```

In Cursor, open the terminal with `Ctrl + ~` then navigate to the folder:
```
cd "C:\Users\Brand\OneDrive\Desktop\Cursor Valuation Tear Sheet"
python "Valuation Tear Sheet.py"
```

Takes about 15–20 seconds. The PDF will appear in the same folder.

---

## Changing the Company

Open `Valuation Tear Sheet.py` and change line 14:
```python
COMPANY = "JPMorgan Chase"
```
Save (`Ctrl + S`) and run again. That's it.

---

## Model

Uses **Llama 3.3 70B** via Groq's free API tier. Groq has generous free rate limits — you can run many tear sheets per day at no cost.

---

## Files

| File | Description |
|------|-------------|
| `Valuation Tear Sheet.py` | Main script — change `COMPANY` and `GROQ_API_KEY` here |
| `{TICKER}_Valuation_Tear_Sheet.pdf` | Output PDF (generated after each run) |
| `TSMC.ini` | Previous TSMC session data |

---

## Valuation Methodologies

| Method | Description |
|--------|-------------|
| **Comparable Companies** | 5–7 public peers benchmarked on EV/Revenue, EV/EBITDA, P/E, P/BV |
| **Precedent Transactions** | 5–7 relevant M&A deals with acquisition premiums |
| **Asset-Based (NAV)** | Book vs. fair value adjustment for each asset and liability category |
| **Football Field** | Visual summary of all three implied share price ranges vs. current price |

---

## Disclaimer

All output is AI-generated for illustrative and educational purposes only. Data may differ from actual company financials. This does not constitute investment advice.
