import re
import os
import subprocess
import pymupdf

BASE_DIR = '/Users/User/Downloads/Wedding-planners-outreach'
DOWNLOADS_DIR = '/Users/User/Downloads'
BRAIN_DIR = '/Users/User/.gemini/antigravity/brain/fd114c0c-04b2-4991-9b4c-0a3573ed8beb'
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

# ==========================================
# 1. RUSSIAN SECTION 2
# ==========================================
ru_section2 = """    <!-- Section 2: Standby & Night Logistics -->
    <div class="section-heading">
      <span class="section-title">2. Регламент Почасовой Аренды &amp; Дополнительные Сборы</span>
    </div>

    <div class="standby-grid">
      <div class="standby-card">
        <div class="standby-title">Почасовая Аренда &amp; Ночные Часы</div>
        <div class="standby-desc">
          &bull; <strong>Ночные часы (22:00–06:00):</strong> +20% к базовой ставке трансфера или часа.<br>
          &bull; <strong>Сверхурочные часы:</strong> Базовая ставка + 25% сверх забронированного времени.<br>
          &bull; <strong>Лимит пробега:</strong> 200 км включено на 10ч; перепробег &euro;2.50 / км.<br>
          &bull; <strong>Гибкие условия:</strong> При бронировании на несколько дней или заказе нескольких авто действует система скидок.
        </div>
      </div>
      <div class="standby-card">
        <div class="standby-title">Парковки в Аэропортах &amp; Трассы</div>
        <div class="standby-desc">
          &bull; <strong>Седаны &amp; V-Class:</strong> Встреча в зале прилета, мониторинг рейса и 60 мин ожидания/парковки включены бесплатно.<br>
          &bull; <strong>Автобусы (19–55 мест):</strong> Автобусные паркинги по тарифу аэропорта: MXP &euro;30, BGY &euro;15, LIN &euro;20.<br>
          &bull; <strong>Автомагистрали:</strong> Все платные дороги (Tolls) включены в стоимость трансфера.
        </div>
      </div>
      <div class="standby-card">
        <div class="standby-title">Городские Зоны ZTL &amp; Багажный Вэн</div>
        <div class="standby-desc">
          &bull; <strong>Седаны &amp; V-Class:</strong> Свободный бесплатный проезд в любые закрытые зоны ZTL Милана и Комо.<br>
          &bull; <strong>Пропуска ZTL для автобусов:</strong> Действуют в Милане в будни (19p &euro;60, 30p &euro;100, 50p &euro;150; в выходные &mdash; бесплатно).<br>
          &bull; <strong>Багажный автомобиль:</strong> При необходимости предоставим отдельный Mercedes Vito Cargo для объемного багажа и нарядов.
        </div>
      </div>
    </div>"""

# ==========================================
# 2. ITALIAN SECTION 2
# ==========================================
it_section2 = """    <!-- Section 2: Standby & Night Logistics -->
    <div class="section-heading">
      <span class="section-title">2. Disposizione Oraria, Supplementi &amp; Servizi Aggiuntivi</span>
    </div>

    <div class="standby-grid">
      <div class="standby-card">
        <div class="standby-title">Disposizione Oraria &amp; Servizio Notturno</div>
        <div class="standby-desc">
          &bull; <strong>Servizio notturno (22:00–06:00):</strong> +20% sulla tariffa base del transfer o oraria.<br>
          &bull; <strong>Ore straordinarie:</strong> Tariffa oraria concordata + 25% oltre l'orario previsto.<br>
          &bull; <strong>Chilometraggio incluso:</strong> 200 km inclusi su 10h (km extra a &euro;2.50 / km).<br>
          &bull; <strong>Tariffe agevolate:</strong> Per servizi su più giorni o flotta combinata applichiamo condizioni su misura.
        </div>
      </div>
      <div class="standby-card">
        <div class="standby-title">Parcheggi Aeroportuali &amp; Autostrade</div>
        <div class="standby-desc">
          &bull; <strong>Berline &amp; V-Class:</strong> Accoglienza in arrivi, tracciamento volo e primi 60 min di attesa e sosta inclusi gratis.<br>
          &bull; <strong>Bus e Minibus (19–55 pax):</strong> Terminal bus aeroportuali a consumo (MXP &euro;30, BGY &euro;15, LIN &euro;20).<br>
          &bull; <strong>Pedaggi autostradali:</strong> Sempre inclusi nei prezzi dei transfer punto a punto.
        </div>
      </div>
      <div class="standby-card">
        <div class="standby-title">ZTL Cittadine &amp; Van per Bagagli</div>
        <div class="standby-desc">
          &bull; <strong>Berline &amp; V-Class:</strong> Accesso libero e sempre autorizzato in tutte le ZTL di Milano e Como.<br>
          &bull; <strong>Pass ZTL Bus Milano:</strong> Obbligatorio solo nei feriali lun–ven (19p &euro;60, 30p &euro;100, 50p &euro;150; gratis nei weekend).<br>
          &bull; <strong>Van supporto bagagli:</strong> Su richiesta forniamo un Mercedes Vito Cargo dedicato al trasporto di abiti e valigie.
        </div>
      </div>
    </div>"""

# ==========================================
# 3. ENGLISH SECTION 2
# ==========================================
en_section2 = """    <!-- Section 2: Standby & Night Logistics -->
    <div class="section-heading">
      <span class="section-title">2. Hourly Disposal, Operational Surcharges &amp; Logistics</span>
    </div>

    <div class="standby-grid">
      <div class="standby-card">
        <div class="standby-title">Hourly Standby &amp; Night Surcharges</div>
        <div class="standby-desc">
          &bull; <strong>Night window (22:00–06:00):</strong> +20% on the base transfer or hourly rate.<br>
          &bull; <strong>Overtime hours:</strong> Base hourly rate + 25% beyond the agreed schedule.<br>
          &bull; <strong>Daily mileage allowance:</strong> 200 km included on 10h disposal (excess mileage at &euro;2.50 / km).<br>
          &bull; <strong>Tailored pricing:</strong> Multi-day wedding itineraries and multi-vehicle bookings benefit from package rates.
        </div>
      </div>
      <div class="standby-card">
        <div class="standby-title">Airport Parking &amp; Highway Tolls</div>
        <div class="standby-desc">
          &bull; <strong>Sedans &amp; V-Class:</strong> Terminal meet &amp; greet, live flight tracking, and 60 minutes free parking/wait included.<br>
          &bull; <strong>Minibuses &amp; Coaches (19–55p):</strong> Dedicated airport coach holding bays billed at cost (MXP &euro;30, BGY &euro;15, LIN &euro;20).<br>
          &bull; <strong>Highway Tolls:</strong> All motorway tolls are fully included in fixed point-to-point transfer rates.
        </div>
      </div>
      <div class="standby-card">
        <div class="standby-title">City ZTL Permits &amp; Luggage Support</div>
        <div class="standby-desc">
          &bull; <strong>Sedans &amp; V-Class:</strong> Unrestricted, fee-free entry to all restricted traffic zones (ZTL) in Milan and Como.<br>
          &bull; <strong>Milan ZTL Bus Permits:</strong> Required for coaches on weekdays Mon–Fri (19p &euro;60, 30p &euro;100, 50p &euro;150; free on weekends).<br>
          &bull; <strong>Luggage Support Van:</strong> On request, we can provide a dedicated Mercedes Vito Cargo van for wedding gowns, decor, and luggage.
        </div>
      </div>
    </div>"""

def replace_section2(content, replacement):
    # Pattern matching from Section 2 heading down to before Section 3 heading
    pattern = r'<!-- Section 2: Standby & Night Logistics -->[\s\S]*?(?=<!-- Section 3:)'
    if re.search(pattern, content):
        return re.sub(pattern, replacement + '\n\n    ', content)
    else:
        # Fallback regex
        pattern2 = r'<div class="section-heading">\s*<span class="section-title">2\.[^<]+</span>[\s\S]*?<div class="standby-grid">[\s\S]*?</div>\s*</div>\s*(?=<div class="section-heading">\s*<span class="section-title">3\.)'
        return re.sub(pattern2, replacement + '\n\n    ', content)

# Update Russian files
for fname in ['dorogo_wedding_client_rate_card_ru.html', 'dorogo_wedding_partner_rate_card_ru.html']:
    fpath = os.path.join(BASE_DIR, fname)
    with open(fpath, 'r', encoding='utf-8') as f:
        c = f.read()
    c = replace_section2(c, ru_section2)
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f"✓ Replaced Section 2 in {fname}")

# Update Italian files
for fname in ['dorogo_wedding_client_rate_card_it.html', 'dorogo_wedding_partner_rate_card_it.html']:
    fpath = os.path.join(BASE_DIR, fname)
    with open(fpath, 'r', encoding='utf-8') as f:
        c = f.read()
    c = replace_section2(c, it_section2)
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f"✓ Replaced Section 2 in {fname}")

# Update English files
for fname in ['dorogo_wedding_client_rate_card_en.html', 'dorogo_wedding_partner_rate_card.html']:
    fpath = os.path.join(BASE_DIR, fname)
    with open(fpath, 'r', encoding='utf-8') as f:
        c = f.read()
    c = replace_section2(c, en_section2)
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f"✓ Replaced Section 2 in {fname}")

