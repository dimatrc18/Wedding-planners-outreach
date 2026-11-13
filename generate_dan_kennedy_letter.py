import subprocess
import pymupdf
import os
import shutil

BASE_DIR = '/Users/User/Downloads/Wedding-planners-outreach'
DOWNLOADS_DIR = '/Users/User/Downloads'
BRAIN_DIR = '/Users/User/.gemini/antigravity/brain/fd114c0c-04b2-4991-9b4c-0a3573ed8beb'
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

html_content = '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Dorogo Private Transportation - Dan Kennedy Executive Sales Letter</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=EB+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Cinzel:wght@600;700&family=Courier+Prime:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<style>
  @page {
    size: A4 portrait;
    margin: 0;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body {
    margin: 0;
    padding: 0;
    background-color: #F8F6F0;
    font-family: 'EB Garamond', Georgia, serif;
    color: #1A1A1A;
    line-height: 1.38;
    font-size: 13px;
  }
  .page-container {
    width: 210mm;
    min-height: 297mm;
    padding: 14mm 18mm 12mm 18mm;
    position: relative;
    background: #FAF8F5;
    background-image: 
      radial-gradient(#e2ded4 0.5px, transparent 0.5px),
      linear-gradient(to bottom, #FAF8F5, #F5F1E8);
    background-size: 16px 16px, 100% 100%;
    box-shadow: 0 0 20px rgba(0,0,0,0.06);
  }

  /* Classical Dorogo Executive Letterhead */
  .letterhead {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-bottom: 2px solid #1A1A1A;
    padding-bottom: 12px;
    margin-bottom: 12px;
  }
  .brand-block h1 {
    font-family: 'Cinzel', serif;
    font-size: 20px;
    letter-spacing: 3.5px;
    margin: 0;
    font-weight: 700;
    color: #0A0A0A;
  }
  .brand-sub {
    font-size: 9.5px;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #8C6D37;
    font-weight: 600;
    margin-top: 3px;
  }
  .contact-meta {
    text-align: right;
    font-size: 10px;
    line-height: 1.35;
    color: #4A4A4A;
    font-family: 'EB Garamond', serif;
  }
  .contact-meta strong {
    color: #1A1A1A;
  }

  /* Top Handwritten Note in Margin (Dan Kennedy Style) */
  .top-hw-note {
    position: absolute;
    top: 14mm;
    right: 22mm;
    transform: rotate(-3.5deg);
    font-family: 'Caveat', cursive;
    font-size: 18px;
    font-weight: 700;
    color: #1A365D;
    background: rgba(254, 240, 138, 0.45);
    padding: 4px 10px;
    border: 1px dashed rgba(26, 54, 93, 0.35);
    border-radius: 4px;
    line-height: 1.2;
    z-index: 10;
  }

  /* Date & Recipient Block */
  .meta-dispatch {
    display: flex;
    justify-content: space-between;
    font-size: 13.5px;
    margin-bottom: 14px;
  }
  .recipient-box {
    line-height: 1.38;
  }
  .confidential-tag {
    display: inline-block;
    font-family: 'Courier Prime', monospace;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: #991B1B;
    background: #FEE2E2;
    padding: 2px 7px;
    border: 1px solid #F87171;
    margin-bottom: 6px;
    text-transform: uppercase;
  }
  .recipient-box strong {
    font-size: 13px;
    color: #0A0A0A;
  }
  .dispatch-date {
    font-style: italic;
    color: #555;
    font-size: 13px;
  }

  /* Dan Kennedy Headline */
  .headline-container {
    background: #1A1A1A;
    color: #FAF8F5;
    padding: 10px 14px;
    margin: 8px 0 10px 0;
    border-left: 4px solid #C5A059;
  }
  .headline-container h2 {
    margin: 0;
    font-family: 'EB Garamond', serif;
    font-size: 16.5px;
    font-weight: 700;
    line-height: 1.32;
    letter-spacing: 0.2px;
  }
  .headline-sub {
    font-size: 12px;
    color: #E5C378;
    margin-top: 4px;
    font-style: italic;
  }

  /* Letter Body */
  p {
    margin: 0 0 7px 0;
    text-align: justify;
  }
  p strong {
    color: #000;
  }

  /* Realistic Hand-drawn Annotations (Fountain Pen Blue) */
  .hw-blue {
    font-family: 'Caveat', cursive;
    color: #1A365D;
    font-weight: 700;
  }
  .circle-note {
    position: relative;
    display: inline-block;
  }
  .circle-note::after {
    content: '';
    position: absolute;
    top: -2px;
    left: -4px;
    right: -4px;
    bottom: -2px;
    border: 2px solid #2563EB;
    border-radius: 50% 45% 55% 40% / 40% 55% 45% 50%;
    pointer-events: none;
    transform: rotate(-1.5deg);
    opacity: 0.85;
  }
  .hw-underline {
    position: relative;
    display: inline-block;
  }
  .hw-underline::after {
    content: '';
    position: absolute;
    left: 0;
    bottom: -1px;
    width: 100%;
    height: 2px;
    background: #2563EB;
    border-radius: 2px;
    transform: rotate(-0.8deg);
    opacity: 0.85;
  }

  /* Bullet Grid for Dan Kennedy Proof Points */
  .benefit-list {
    margin: 6px 0 8px 12px;
    padding: 0;
    list-style-type: none;
  }
  .benefit-list li {
    position: relative;
    padding-left: 20px;
    margin-bottom: 4px;
    font-size: 14px;
    line-height: 1.36;
  }
  .benefit-list li::before {
    content: "■";
    position: absolute;
    left: 0;
    color: #C5A059;
    font-size: 10px;
    top: 2px;
  }

  /* Hand-drawn Margin Note on the Left/Right */
  .margin-arrow-note {
    font-family: 'Caveat', cursive;
    font-size: 17px;
    color: #1A365D;
    line-height: 1.15;
    background: rgba(239, 246, 255, 0.85);
    border-left: 3px solid #2563EB;
    padding: 6px 10px;
    margin: 6px 0 8px 10px;
    border-radius: 0 4px 4px 0;
  }

  /* Signoff & Signature */
  .signoff-block {
    margin-top: 8px;
  }
  .signature-container {
    margin: 6px 0 4px 0;
  }
  .signature-img {
    font-family: 'Caveat', cursive;
    font-size: 28px;
    font-weight: 700;
    color: #1A365D;
    transform: rotate(-2deg);
    display: inline-block;
    letter-spacing: 1px;
  }
  .signer-title {
    font-size: 13px;
    color: #333;
    line-height: 1.25;
  }

  /* Dan Kennedy Famous Post-Script (P.S.) */
  .ps-container {
    margin-top: 8px;
    padding-top: 10px;
    border-top: 1px dashed #C5A059;
    font-size: 14px;
    line-height: 1.38;
  }
  .ps-prefix {
    font-weight: 700;
    font-size: 15px;
    color: #991B1B;
    font-family: 'EB Garamond', serif;
  }
  .ps-handwritten {
    font-family: 'Caveat', cursive;
    font-size: 19px;
    font-weight: 700;
    color: #1A365D;
    line-height: 1.25;
    display: block;
    margin-top: 4px;
    background: rgba(254, 249, 195, 0.5);
    padding: 4px 8px;
    border-radius: 4px;
  }
</style>
</head>
<body>

<div class="page-container">
  
  <!-- Dan Kennedy Style Top Margin Note -->
  <div class="top-hw-note">
    Oliver - Private briefing for 2026/27 St. Moritz & Zermatt planning
  </div>

  <!-- Header -->
  <div class="letterhead">
    <div class="brand-block">
      <h1>DOROGO MILANO</h1>
      <div class="brand-sub">Private Chauffeur Service · Milan Gateway Hub</div>
    </div>
    <div class="contact-meta">
      <strong>Direct Executive Dispatch</strong><br>
      Via Monte Napoleone 8, 20121 Milano (MI), Italy<br>
      WhatsApp Priority: +39 342 092 5622 · concierge@dorogo.it
    </div>
  </div>

  <!-- Metadata / Recipient Block -->
  <div class="meta-dispatch">
    <div class="recipient-box">
      <span class="confidential-tag">Strictly Confidential · For Personal Attention</span><br>
      <strong>Mr. Oliver Corkhill, Chief Executive Officer</strong><br>
      <em>(Or to the Personal Attention of the Head of Guest Concierge)</em><br>
      <strong>Leo Trippi AG</strong><br>
      Kägiswilerstrasse 15, 6060 Sarnen, Switzerland<br>
      <span style="font-size: 12px; color: #666;">Resort Operations: Via Maistra 13, 7500 St. Moritz</span>
    </div>
    <div class="dispatch-date">
      Milan, Autumn 2026
    </div>
  </div>

  <!-- Dan Kennedy Headline -->
  <div class="headline-container">
    <h2>RE: Solving the Milan Malpensa (MXP) Bottleneck for Your Super-Prime Chalet Arrivals to St. Moritz and Zermatt this Winter</h2>
    <div class="headline-sub">Why elite Swiss Alpine operators lose high-margin ground revenue, and how a dedicated Milan-based fleet allocation eliminates transfer friction without capital expenditure.</div>
  </div>

  <!-- Letter Body -->
  <p>Dear Oliver,</p>

  <p>If your guest concierge team has ever experienced the frantic 4:00 PM panic on a peak Saturday during February half-term, when an incoming private Falcon from Dubai or an Emirates commercial first-class flight touches down 90 minutes late at Milan Malpensa, and your local Engadin chauffeur is either trapped on the Maloja Pass or charging €1,500 for a deadhead repositioning run, you already understand why ground mobility is the single most vulnerable link in a €50,000-per-week chalet stay.</p>

  <p>As the founder of Dorogo Private Transportation in Milan, I am writing to you directly because <span class="hw-underline">we are not asking you to replace your trusted in-resort drivers</span>. Rather, we want to solve the one specific operational headache that every Swiss and Italian chalet operator quietly complains about: <strong>the long-distance Milan airport transfer corridor</strong>.</p>

  <p>Local resort fleets in St. Moritz and Zermatt are built for high-margin local resort shuttles and restaurant runs. When they dispatch a car down to Malpensa, they burn 6 to 8 driver-hours and 360 kilometers round-trip on a single guest. That creates inflated prices, exhausted chauffeurs, and leaves your in-resort concierge desk understaffed.</p>

  <div class="margin-arrow-note">
    → Key Point: Dorogo stages directly inside Malpensa (MXP) and Linate (LIN). Zero deadhead empty kilometers. 100% fresh drivers upon touchdown.
  </div>

  <p>For the upcoming 2026/2027 alpine season, we have established a dedicated <strong>Chalet Concierge Fleet Reserve</strong> operating directly out of Milan Malpensa, Linate, and Bergamo gateways:</p>

  <ul class="benefit-list">
    <li><strong>Guaranteed Mercedes-Benz V-Class Extra-Long (4MATIC):</strong> Configured specifically for alpine snow conditions, fitted with Nokian winter tires, ski carry equipment, and cavernous luggage capacity for <span class="circle-note">8 to 12 full-sized Rimowa cases</span> plus ski bags.</li>
    <li><strong>Turnkey B2B Partner Protection:</strong> We provide your concierge desk with a clear Net Wholesale Tariff (allowing you to mark up the transfer) or a protected 12% to 15% agency commission with monthly consolidated invoicing.</li>
    <li><strong>15-Minute Concierge Dispatch SLA:</strong> A dedicated 24/7 WhatsApp concierge line reserved exclusively for your partner desk. Send a flight number and guest count, and your booking confirmation arrives within minutes.</li>
    <li><strong>Discreet White-Label Execution:</strong> Chauffeurs impeccably dressed in dark bespoke suits, greeting your UHNW clients at Malpensa Prime or commercial arrivals with your Leo Trippi digital welcome signage.</li>
  </ul>

  <p>You do not need to sign a binding long-term contract today. All I propose is that you introduce us to your Head of Concierge as your <strong>Official Milan Hub Black Book Partner</strong> for the upcoming winter season.</p>

  <!-- Signoff -->
  <div class="signoff-block">
    <p style="margin-bottom: 2px;">Respectfully yours,</p>
    <div class="signature-container">
      <span class="signature-img">Dmitri Traciuc</span>
    </div>
    <div class="signer-title">
      <strong>Dmitri Traciuc</strong> · Founder & Managing Director<br>
      Dorogo Luxury Transportation · Milan, Italy
    </div>
  </div>

  <!-- Dan Kennedy Post-Script -->
  <div class="ps-container">
    <span class="ps-prefix">P.S.</span>
    <span class="ps-handwritten">
      Oliver - To protect our service quality on the Maloja and Simplon alpine corridors, we cap our dedicated fleet allocation to exactly 6 chalet partners this season. Please send a quick WhatsApp to my personal mobile [+39 342 092 5622] or email me directly at dmitri@dorogo.it, and I will courier our full 2026/2027 Alpine Partner Fleet Dossier and Net Rate Card directly to your desk.
    </span>
  </div>

</div>

</body>
</html>
'''

with open(os.path.join(BASE_DIR, 'dorogo_dan_kennedy_letter.html'), 'w') as f:
    f.write(html_content)

print("Generated HTML letter!")

pdf_out = os.path.join(DOWNLOADS_DIR, 'Dorogo_Dan_Kennedy_Alpine_Sales_Letter.pdf')
cmd = [
    CHROME,
    '--headless=new',
    '--disable-gpu',
    f'--print-to-pdf={pdf_out}',
    os.path.join(BASE_DIR, 'dorogo_dan_kennedy_letter.html')
]
subprocess.run(cmd, check=True)
print(f"Generated PDF: {pdf_out}")

# Render to PNG for user preview in artifact directory
doc = pymupdf.open(pdf_out)
page = doc[0]
pix = page.get_pixmap(dpi=180)
png_brain = os.path.join(BRAIN_DIR, 'dan_kennedy_sales_letter_preview.png')
pix.save(png_brain)
print(f"Generated preview PNG: {png_brain}")

