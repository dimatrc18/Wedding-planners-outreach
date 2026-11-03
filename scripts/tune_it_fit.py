import re
import os
import subprocess
import pymupdf

BASE_DIR = '/Users/User/Downloads/Wedding-planners-outreach'
DOWNLOADS_DIR = '/Users/User/Downloads'
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

fpath = os.path.join(BASE_DIR, 'dorogo_wedding_client_rate_card_it.html')
with open(fpath, 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace(
    'Coordiniamo orari di presa, arrivi ai pontili e partenze notturne direttamente con il tuo wedding planner e il gestore della villa. Zero chiamate a voi il giorno delle nozze.',
    'Coordiniamo arrivi, pontili e rientri notturni con il wedding planner e la villa. Zero chiamate a voi il giorno delle nozze.'
)
c = c.replace(
    'Accoglienza dedicata per genitori e ospiti d\'onore, transfer corteo e navette continue villa ↔ hotel fino a notte inoltrata, per la massima serenità di tutti.',
    'Accoglienza per genitori e VIP, transfer corteo e navette continue villa ↔ hotel fino a notte inoltrata.'
)

with open(fpath, 'w', encoding='utf-8') as f:
    f.write(c)

pdf_out = os.path.join(DOWNLOADS_DIR, 'Dorogo_Wedding_Client_Tariffs_2026_IT.pdf')
cmd = [
    CHROME,
    '--headless=new',
    '--disable-gpu',
    '--no-pdf-header-footer',
    '--print-to-pdf-no-header',
    f'--print-to-pdf={pdf_out}',
    fpath
]
subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
doc = pymupdf.open(pdf_out)
pages = len(doc)
blocks = doc[0].get_text('blocks')
lowest_y = max(b[3] for b in blocks)
rem = doc[0].rect.height - lowest_y
print(f"Dorogo_Wedding_Client_Tariffs_2026_IT.pdf: {pages} page(s) | Lowest Y: {lowest_y:.1f}/{doc[0].rect.height:.1f} | Bottom margin: {rem:.1f}pt")
doc.close()
