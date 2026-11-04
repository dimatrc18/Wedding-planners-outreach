import subprocess
import pymupdf
import shutil
import os

CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
BASE_DIR = '/Users/User/Downloads/Wedding-planners-outreach'
DOWNLOADS_DIR = '/Users/User/Downloads'
BRAIN_DIR = '/Users/User/.gemini/antigravity/brain/fd114c0c-04b2-4991-9b4c-0a3573ed8beb'

tasks = [
    # HTML file, Target PDF in Downloads, Target PDF aliases
    ('dorogo_wedding_partner_rate_card.html', 'Dorogo_Wedding_Partner_Rate_Card_2026.pdf', ['Dorogo_Wedding_Partner_Rate_Card_2026_EN.pdf', 'Dorogo_Wedding_Partner_Rate_Card.pdf', 'DOROGO_Tariffs_Logistics_EN.pdf']),
    ('dorogo_wedding_partner_rate_card_it.html', 'Dorogo_Wedding_Partner_Rate_Card_2026_IT.pdf', ['DOROGO_Tariffs_Logistics_IT.pdf']),
    ('dorogo_wedding_partner_rate_card_ru.html', 'Dorogo_Wedding_Partner_Rate_Card_2026_RU.pdf', ['DOROGO_Tariffs_Logistics_RU.pdf']),
    ('dorogo_wedding_client_rate_card_en.html', 'Dorogo_Wedding_Client_Tariffs_2026.pdf', ['Dorogo_Wedding_Client_Tariffs_2026_EN.pdf', 'DOROGO_Tariffs_Client_EN.pdf']),
    ('dorogo_wedding_client_rate_card_it.html', 'Dorogo_Wedding_Client_Tariffs_2026_IT.pdf', ['DOROGO_Tariffs_Client_IT.pdf']),
    ('dorogo_wedding_client_rate_card_ru.html', 'Dorogo_Wedding_Client_Tariffs_2026_RU.pdf', ['DOROGO_Tariffs_Client_RU.pdf']),
]

all_passed = True

for html_file, pdf_name, alias_name in tasks:
    html_path = os.path.join(BASE_DIR, html_file)
    pdf_out = os.path.join(DOWNLOADS_DIR, pdf_name)
    
    cmd = [
        CHROME,
        '--headless=new',
        '--disable-gpu',
        '--no-pdf-header-footer',
        '--print-to-pdf-no-header',
        f'--print-to-pdf={pdf_out}',
        html_path
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=15)
    
    # Also copy to repo directory
    shutil.copyfile(pdf_out, os.path.join(BASE_DIR, pdf_name))
    
    # Replicate to aliases in both Downloads and Wedding-planners-outreach
    aliases = alias_name if isinstance(alias_name, list) else [alias_name]
    for a in aliases:
        if a != pdf_name:
            shutil.copyfile(pdf_out, os.path.join(DOWNLOADS_DIR, a))
        shutil.copyfile(pdf_out, os.path.join(BASE_DIR, a))
        
    doc = pymupdf.open(pdf_out)
    pages = len(doc)
    page = doc.load_page(0)
    page_height = page.rect.height
    
    # Measure clearance and margins
    text_blocks = page.get_text('blocks')
    max_y1 = max(b[3] for b in text_blocks if b[4].strip())
    bottom_margin = page_height - max_y1
    
    print(f"✓ {pdf_name}: {pages} page(s), bottom margin {bottom_margin:.1f} pt")
    
    if pages != 1:
        print(f"❌ ERROR: {pdf_name} has {pages} pages! Expected exactly 1 page.")
        all_passed = False
        
    if bottom_margin < 20.0:
        print(f"❌ ERROR: {pdf_name} bottom margin is {bottom_margin:.1f} pt (< 20 pt minimum)!")
        all_passed = False
        
    # Language-specific header checks
    if '_RU' in pdf_name:
        ozh = page.search_for('ОЖИДАНИЕ')
        for r in ozh:
            if r.y0 < 150:
                clearance = 435.75 - r.x1
                print(f"   [RU Clearance] '(ОЖИДАНИЕ)' ends at x={r.x1:.1f} pt (clearance: {clearance:.1f} pt to divider at 435.8 pt)")
                if clearance < 10.0:
                    print(f"   ❌ ERROR: Insufficient clearance before divider line: {clearance:.1f} pt!")
                    all_passed = False
                    
    elif '_IT' in pdf_name:
        straord = [r for r in page.search_for('STRAORDINARI') if r.y0 < 150]
        intera = [r for r in page.search_for('INTERA') if r.y0 < 150]
        if straord and intera:
            gap = intera[0].x0 - straord[0].x1
            print(f"   [IT Clearance] Gap between STRAORDINARI and INTERA: {gap:.1f} pt")
            if gap < 15.0:
                print(f"   ❌ ERROR: Insufficient gap between IT sub-headers: {gap:.1f} pt!")
                all_passed = False
                
    elif 'Client_Tariffs_2026.pdf' in pdf_name or 'Partner_Rate_Card_2026.pdf' in pdf_name:
        hourly = [r for r in page.search_for('EXTRA HOURS') if r.y0 < 150]
        fullday = [r for r in page.search_for('FULL DAY') if r.y0 < 150]
        if hourly and fullday:
            gap = fullday[0].x0 - hourly[0].x1
            print(f"   [EN Clearance] Gap between EXTRA HOURS and FULL DAY: {gap:.1f} pt")
            if gap < 15.0:
                print(f"   ❌ ERROR: Insufficient gap between EN sub-headers: {gap:.1f} pt!")
                all_passed = False
    
    # Generate high quality preview for brain artifacts
    pix = page.get_pixmap(dpi=150)
    base_stem = pdf_name.replace('.pdf', '')
    preview_path = os.path.join(BRAIN_DIR, f"{base_stem}_preview.png")
    pix.save(preview_path)
    
    doc.close()

if not all_passed:
    raise SystemExit(1)

print("\n✓ ALL rate card PDFs compiled, verified & mirrored to Downloads and repo successfully!")
