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

# 1. Update Section 3 Collab Cards with punchy, readable copy
ru_collab_clean = """    <div class="collab-grid">
      <div class="collab-card">
        <div class="collab-head">
          <span class="collab-title">Координация с Организатором &amp; Виллой</span>
        </div>
        <div class="collab-desc">
          Согласуем тайминг подачи авто, катеров и ночных разъездов напрямую с вашим свадебным организатором и менеджером площадки. Ноль звонков вам в день свадьбы.
        </div>
      </div>
      <div class="collab-card">
        <div class="collab-head">
          <span class="collab-title">Прозрачный Расчет &amp; Диспетчер 24/7</span>
        </div>
        <div class="collab-desc">
          Официальный детальный счет без скрытых комиссий (все налоги, ZTL и сборы включены). Депозит 40% бронирует автопарк. Выделенный координатор на связи в WhatsApp.
        </div>
      </div>
    </div>"""

c = re.sub(r'<div class="collab-grid">[\s\S]*?</div>\s*</div>\s*</div>', ru_collab_clean, c)

# 2. Update Footer Terms with punchy 1-line bullets and readable size
ru_terms_clean = """        <div class="terms-title">Условия Бронирования &amp; Регламент</div>
        <div class="terms-text">
          &bull; <strong>Предоплата:</strong> 40% депозит фиксирует автопарк; доплата 60% за 14 дней до события.<br>
          &bull; <strong>Отмена:</strong> Бесплатный перенос даты &gt;14 дней. Менее 14 дней &mdash; штраф 100%.<br>
          &bull; <strong>Стандарты автопарка:</strong> Черные Mercedes без рекламы; водители в темных костюмах.<br>
          &bull; <strong>Включенный сервис:</strong> WhatsApp диспетчер, трекинг рейсов и Портал трансферов для гостей.
        </div>"""

c = re.sub(r'<div class="terms-title">[^<]+</div>\s*<div class="terms-text">[\s\S]*?</div>', ru_terms_clean, c)

# 3. CSS Typography boost across the whole document
css_updates = [
    # Base body
    (r'font-size:\s*[\d\.]+px;\s*line-height:\s*[\d\.]+;', 'font-size: 8.8px;\n    line-height: 1.40;'),
    # Section title
    (r'\.section-title\s*\{[^}]*font-size:\s*[\d\.]+px;', '.section-title {\n    font-family: \'Cormorant Garamond\', Georgia, serif;\n    font-size: 13.0px;'),
    # Car title
    (r'\.car-title\s*\{[^}]*font-size:\s*[\d\.]+px;', '.car-title {\n    font-family: \'Cormorant Garamond\', Georgia, serif;\n    font-size: 12.5px;'),
    # Car sub
    (r'\.car-sub\s*\{[^}]*font-size:\s*[\d\.]+px;', '.car-sub {\n    font-size: 7.5px;'),
    # Rate val
    (r'\.rate-val\s*\{[^}]*font-size:\s*[\d\.]+px;', '.rate-val {\n    font-size: 10.8px;'),
    # Standby card title
    (r'\.standby-title\s*\{[^}]*font-size:\s*[\d\.]+px;', '.standby-title {\n    font-family: \'Cormorant Garamond\', Georgia, serif;\n    font-size: 11.2px;'),
    # Standby desc
    (r'\.standby-desc\s*\{[^}]*font-size:\s*[\d\.]+px;[^}]*line-height:\s*[\d\.]+;', '.standby-desc {\n    font-size: 8.3px;\n    color: #3e3832;\n    line-height: 1.44;'),
    # Collab title
    (r'\.collab-title\s*\{[^}]*font-size:\s*[\d\.]+px;', '.collab-title {\n    font-family: \'Cormorant Garamond\', Georgia, serif;\n    font-size: 11.2px;'),
    # Collab desc
    (r'\.collab-desc\s*\{[^}]*font-size:\s*[\d\.]+px;[^}]*line-height:\s*[\d\.]+;', '.collab-desc {\n    font-size: 8.3px;\n    color: #3e3832;\n    line-height: 1.44;'),
    # Guarantee title
    (r'\.guarantee-title\s*\{[^}]*font-size:\s*[\d\.]+px;', '.guarantee-title {\n    font-family: \'Cormorant Garamond\', Georgia, serif;\n    font-size: 10.5px;'),
    # Guarantee sub
    (r'\.guarantee-sub\s*\{[^}]*font-size:\s*[\d\.]+px;', '.guarantee-sub {\n    font-size: 7.3px;'),
    # Review quote
    (r'\.review-quote\s*\{[^}]*font-size:\s*[\d\.]+px;[^}]*line-height:\s*[\d\.]+;', '.review-quote {\n    font-family: \'Cormorant Garamond\', Georgia, serif;\n    font-size: 9.8px;\n    color: #24201d;\n    line-height: 1.40;'),
    # Terms text
    (r'\.terms-text\s*\{[^}]*font-size:\s*[\d\.]+px;[^}]*line-height:\s*[\d\.]+;', '.terms-text {\n    font-size: 8.0px;\n    color: #3e3832;\n    line-height: 1.42;'),
    # Dispatch contact
    (r'\.dispatch-contact\s*\{[^}]*font-size:\s*[\d\.]+px;[^}]*line-height:\s*[\d\.]+;', '.dispatch-contact {\n    font-size: 8.0px;\n    color: #38322c;\n    line-height: 1.42;')
]

for pat, repl in css_updates:
    c = re.sub(pat, repl, c, count=1)

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
