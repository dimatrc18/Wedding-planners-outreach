import re
import os
import subprocess
import pymupdf

BASE_DIR = '/Users/User/Downloads/Wedding-planners-outreach'
DOWNLOADS_DIR = '/Users/User/Downloads'
BRAIN_DIR = '/Users/User/.gemini/antigravity/brain/fd114c0c-04b2-4991-9b4c-0a3573ed8beb'
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

fpath = os.path.join(BASE_DIR, 'dorogo_wedding_client_rate_card_ru.html')
with open(fpath, 'r', encoding='utf-8') as f:
    c = f.read()

# Replace rows in RU client card
replacements = [
    # E-Class
    (r'<span class="car-title">Mercedes-Benz E-Class</span>\s*<span class="car-sub">[^<]+</span>',
     '<span class="car-title">Mercedes-Benz E-Class (1–3 места)</span>\n              <span class="car-sub">Бизнес-седан &bull; Багаж: 2 чемодана</span>'),
    # V-Class
    (r'<span class="car-title">Mercedes-Benz V-Class</span>\s*<span class="car-sub">[^<]+</span>',
     '<span class="car-title">Mercedes-Benz V-Class (6–7 мест)</span>\n              <span class="car-sub">Свадебный минивэн &bull; Багаж: 7 чемоданов</span>'),
    # S-Class
    (r'<span class="car-title">Mercedes-Benz S-Class</span>\s*<span class="car-sub">[^<]+</span>',
     '<span class="car-title">Mercedes-Benz S-Class (1–3 места)</span>\n              <span class="car-sub">Флагманский седан &bull; Багаж: 2 чемодана</span>'),
    # Minibus
    (r'<span class="car-title">Executive Minibus 16–20p</span>\s*<span class="car-sub">[^<]+</span>',
     '<span class="car-title">Executive Minibus (16–20 мест)</span>\n              <span class="car-sub">Микроавтобус GT &bull; Багаж: до 20 мест</span>'),
    # Midibus
    (r'<span class="car-title">Executive Midibus 28–30p</span>\s*<span class="car-sub">[^<]+</span>',
     '<span class="car-title">Executive Midibus (28–30 мест)</span>\n              <span class="car-sub">Мидибус GT &bull; Вместительный багажник</span>'),
    # Coach
    (r'<span class="car-title">Grand Turismo Coach 50–55p</span>\s*<span class="car-sub">[^<]+</span>',
     '<span class="car-title">Grand Turismo Coach (50–55 мест)</span>\n              <span class="car-sub">Лайнер Gran Turismo &bull; Багажный отсек 50+</span>'),
]

for pat, repl in replacements:
    c = re.sub(pat, repl, c)

# Let's also check if white-space: nowrap in .car-title needs adjustment or if column 1 needs width: 22%
# Let's adjust table column widths slightly to ensure no truncation
c = re.sub(r'<th rowspan="2" style="width: 20%;">', '<th rowspan="2" style="width: 22%;">', c)
c = re.sub(r'<th rowspan="2" style="width: 29%;">', '<th rowspan="2" style="width: 27%;">', c)

with open(fpath, 'w', encoding='utf-8') as f:
    f.write(c)

pdf_out = os.path.join(DOWNLOADS_DIR, 'Dorogo_Wedding_Client_Tariffs_2026_RU.pdf')
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
print(f"Result: {pages} page(s)")
blocks = doc[0].get_text('blocks')
lowest_y = max(b[3] for b in blocks)
print('Lowest text Y:', lowest_y, 'Page height:', doc[0].rect.height)
print('Remaining bottom space:', doc[0].rect.height - lowest_y)

pix = doc[0].get_pixmap(dpi=150)
pix.save(os.path.join(BRAIN_DIR, 'Dorogo_Wedding_Client_Tariffs_2026_RU_preview.png'))
doc.close()
