import re
import os
import subprocess
import pymupdf

BASE_DIR = '/Users/User/Downloads/Wedding-planners-outreach'
DOWNLOADS_DIR = '/Users/User/Downloads'
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

fpath = os.path.join(BASE_DIR, 'dorogo_wedding_client_rate_card_ru.html')
with open(fpath, 'r', encoding='utf-8') as f:
    c = f.read()

# Make Section 2 concise and scannable
clean_ru_standby = """    <div class="standby-grid">
      <div class="standby-card">
        <div class="standby-title">Почасовая Аренда &amp; Ночные Часы</div>
        <div class="standby-desc">
          &bull; <strong>Ночные часы (22:00–06:00):</strong> +20% к тарифу трансфера или часа<br>
          &bull; <strong>Сверхурочные часы:</strong> базовая ставка + 25% сверх графика<br>
          &bull; <strong>Пробег (10ч день):</strong> 200 км вкл. (перепробег &euro;2.50 / км)<br>
          &bull; <strong>Скидки:</strong> спецпакеты при заказе на 2+ дня или несколько авто
        </div>
      </div>
      <div class="standby-card">
        <div class="standby-title">Парковки в Аэропортах &amp; Трассы</div>
        <div class="standby-desc">
          &bull; <strong>Седаны &amp; V-Class:</strong> 60 мин ожидания и парковка включены<br>
          &bull; <strong>Автобусы MXP:</strong> &euro;30 (терминал посадки автобусов Malpensa)<br>
          &bull; <strong>Автобусы BGY / LIN:</strong> &euro;15 в Бергамо, &euro;20 в Линате<br>
          &bull; <strong>Автомагистрали:</strong> все платные дороги включены в трансфер
        </div>
      </div>
      <div class="standby-card">
        <div class="standby-title">Городские Зоны ZTL &amp; Багаж</div>
        <div class="standby-desc">
          &bull; <strong>Седаны &amp; V-Class:</strong> свободный въезд в ZTL Милана и Комо<br>
          &bull; <strong>ZTL автобусы (будни):</strong> 19p — &euro;60 &bull; 30p — &euro;100 &bull; 50p — &euro;150<br>
          &bull; <strong>ZTL в выходные:</strong> бесплатно для всех классов авто<br>
          &bull; <strong>Багажный вэн:</strong> Mercedes Vito Cargo под наряды и багаж
        </div>
      </div>
    </div>"""

c = re.sub(r'<div class="standby-grid">[\s\S]*?</div>\s*</div>\s*</div>', clean_ru_standby, c)

# Shorten table role descriptions so table is not cramped
table_roles = {
    'Mercedes-Benz E-Class': '<strong>VIP-Гости &amp; Подрядчики:</strong> 1–2 пассажира (фотограф, стилист, ведущий). Свободный въезд в зоны ZTL.',
    'Mercedes-Benz V-Class': '<strong>Основной Шаттл:</strong> Развозка семьи, подружек невесты и гостей виллы. Ночные челночные рейсы.',
    'Mercedes-Benz S-Class': '<strong>Автомобиль Молодоженов:</strong> Главное авто жениха и невесты, фотосессии, просторный салон для платья.',
    'Executive Minibus 16–20p': '<strong>Узкие Серпантины:</strong> Для 10–20 гостей. Незаменим на набережных Комо, куда не проедет большой автобус.',
    'Executive Midibus 28–30p': '<strong>Средние Группы:</strong> Для 20–30 гостей на pre-wedding ужины. Сочетает вместимость с маневренностью.',
    'Grand Turismo Coach 50–55p': '<strong>Магистральные Рейсы:</strong> Прямой трансфер групп 50+ гостей из аэропортов Милана к отелям и пирсам.'
}

for car, role in table_roles.items():
    c = re.sub(
        rf'(<span class="car-title">{re.escape(car)}</span>[\s\S]*?<td class="role-text">)[\s\S]*?(</td>)',
        rf'\g<1>{role}\2',
        c
    )

# Font size improvements in CSS
c = c.replace('font-size: 8.3px;\n    line-height: 1.34;', 'font-size: 8.8px;\n    line-height: 1.38;')
c = c.replace('font-size: 7.5px;\n    color: #57514a;\n    line-height: 1.34;', 'font-size: 8.2px;\n    color: #4a433c;\n    line-height: 1.40;')
c = c.replace('font-size: 7.4px;\n    color: #57514a;\n    line-height: 1.30;', 'font-size: 8.0px;\n    color: #4a433c;\n    line-height: 1.35;')
c = c.replace('font-size: 7.1px;\n    color: #57514a;\n    line-height: 1.3;', 'font-size: 7.8px;\n    color: #4a433c;\n    line-height: 1.36;')
c = c.replace('font-size: 7.4px;\n    color: #57514a;\n    line-height: 1.32;', 'font-size: 8.2px;\n    color: #4a433c;\n    line-height: 1.38;')

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
