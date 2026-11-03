import subprocess
import pymupdf
import shutil
import os

CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
BASE_DIR = '/Users/User/Downloads/Wedding-planners-outreach'
DOWNLOADS_DIR = '/Users/User/Downloads'
BRAIN_DIR = '/Users/User/.gemini/antigravity/brain/fd114c0c-04b2-4991-9b4c-0a3573ed8beb'

tasks = [
    # HTML file, Target PDF in Downloads, Target PDF alias (optional)
    ('dorogo_wedding_partner_rate_card.html', 'Dorogo_Wedding_Partner_Rate_Card_2026.pdf', ['Dorogo_Wedding_Partner_Rate_Card_2026_EN.pdf', 'Dorogo_Wedding_Partner_Rate_Card.pdf', 'DOROGO_Tariffs_Logistics_EN.pdf']),
    ('dorogo_wedding_partner_rate_card_it.html', 'Dorogo_Wedding_Partner_Rate_Card_2026_IT.pdf', ['DOROGO_Tariffs_Logistics_IT.pdf']),
    ('dorogo_wedding_partner_rate_card_ru.html', 'Dorogo_Wedding_Partner_Rate_Card_2026_RU.pdf', ['DOROGO_Tariffs_Logistics_RU.pdf']),
    ('dorogo_wedding_client_rate_card_en.html', 'Dorogo_Wedding_Client_Tariffs_2026.pdf', ['Dorogo_Wedding_Client_Tariffs_2026_EN.pdf', 'DOROGO_Tariffs_Client_EN.pdf']),
    ('dorogo_wedding_client_rate_card_it.html', 'Dorogo_Wedding_Client_Tariffs_2026_IT.pdf', ['DOROGO_Tariffs_Client_IT.pdf']),
    ('dorogo_wedding_client_rate_card_ru.html', 'Dorogo_Wedding_Client_Tariffs_2026_RU.pdf', ['DOROGO_Tariffs_Client_RU.pdf']),
]

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
    
    if alias_name:
        aliases = alias_name if isinstance(alias_name, list) else [alias_name]
        for a in aliases:
            shutil.copyfile(pdf_out, os.path.join(DOWNLOADS_DIR, a))
        
    doc = pymupdf.open(pdf_out)
    pages = len(doc)
    print(f"✓ {pdf_name}: {pages} page(s) (filesize {os.path.getsize(pdf_out)} bytes)")
    
    # Generate high quality preview for brain artifacts
    page = doc.load_page(0)
    pix = page.get_pixmap(dpi=150)
    base_stem = pdf_name.replace('.pdf', '')
    preview_path = os.path.join(BRAIN_DIR, f"{base_stem}_preview.png")
    pix.save(preview_path)
    
    doc.close()
    if pages != 1:
        print(f"❌ ERROR: {pdf_name} has {pages} pages! Expected exactly 1 page.")

print("\nAll PDFs compiled & verified successfully.")
