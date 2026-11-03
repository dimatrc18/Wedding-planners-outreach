import re
import os
import subprocess
import pymupdf
import shutil

BASE_DIR = '/Users/User/Downloads/Wedding-planners-outreach'
DOWNLOADS_DIR = '/Users/User/Downloads'
BRAIN_DIR = '/Users/User/.gemini/antigravity/brain/fd114c0c-04b2-4991-9b4c-0a3573ed8beb'
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

CSS_REPLACEMENTS = [
    # Base body
    (r'font-family:\s*\'Plus Jakarta Sans\'[^\n]*\n\s*color:\s*#[0-9a-fA-F]+;\s*\n\s*background:\s*#[0-9a-fA-F]+;\s*\n\s*font-size:\s*[\d\.]+px;\s*\n\s*line-height:\s*[\d\.]+;',
     "font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;\n    color: #24201d;\n    background: #f6f4f0;\n    font-size: 8.8px;\n    line-height: 1.40;"),
    # Section title
    (r'\.section-title\s*\{[^}]*font-size:\s*[\d\.]+px;',
     ".section-title {\n    font-family: 'Cormorant Garamond', Georgia, serif;\n    font-size: 13.0px;"),
    # Car title
    (r'\.car-title\s*\{[^}]*font-size:\s*[\d\.]+px;',
     ".car-title {\n    font-family: 'Cormorant Garamond', Georgia, serif;\n    font-size: 12.5px;"),
    # Car sub
    (r'\.car-sub\s*\{[^}]*font-size:\s*[\d\.]+px;',
     ".car-sub {\n    font-size: 7.5px;"),
    # Rate val
    (r'\.rate-val\s*\{[^}]*font-size:\s*[\d\.]+px;',
     ".rate-val {\n    font-size: 10.8px;"),
    # Role text
    (r'\.role-text\s*\{[^}]*font-size:\s*[\d\.]+px;[^}]*line-height:\s*[\d\.]+;',
     ".role-text {\n    font-size: 8.0px;\n    color: #4a433c;\n    line-height: 1.35;"),
    # Standby card title
    (r'\.standby-title\s*\{[^}]*font-size:\s*[\d\.]+px;',
     ".standby-title {\n    font-family: 'Cormorant Garamond', Georgia, serif;\n    font-size: 11.2px;"),
    # Standby desc
    (r'\.standby-desc\s*\{[^}]*font-size:\s*[\d\.]+px;[^}]*line-height:\s*[\d\.]+;',
     ".standby-desc {\n    font-size: 8.3px;\n    color: #3e3832;\n    line-height: 1.44;"),
    # Collab title
    (r'\.collab-title\s*\{[^}]*font-size:\s*[\d\.]+px;',
     ".collab-title {\n    font-family: 'Cormorant Garamond', Georgia, serif;\n    font-size: 11.2px;"),
    # Collab desc
    (r'\.collab-desc\s*\{[^}]*font-size:\s*[\d\.]+px;[^}]*line-height:\s*[\d\.]+;',
     ".collab-desc {\n    font-size: 8.3px;\n    color: #3e3832;\n    line-height: 1.44;"),
    # Guarantee title
    (r'\.guarantee-title\s*\{[^}]*font-size:\s*[\d\.]+px;',
     ".guarantee-title {\n    font-family: 'Cormorant Garamond', Georgia, serif;\n    font-size: 10.5px;"),
    # Guarantee sub
    (r'\.guarantee-sub\s*\{[^}]*font-size:\s*[\d\.]+px;',
     ".guarantee-sub {\n    font-size: 7.3px;"),
    # Review quote
    (r'\.review-quote\s*\{[^}]*font-size:\s*[\d\.]+px;[^}]*line-height:\s*[\d\.]+;',
     ".review-quote {\n    font-family: 'Cormorant Garamond', Georgia, serif;\n    font-size: 9.8px;\n    color: #24201d;\n    line-height: 1.40;"),
    # Terms text
    (r'\.terms-text\s*\{[^}]*font-size:\s*[\d\.]+px;[^}]*line-height:\s*[\d\.]+;',
     ".terms-text {\n    font-size: 8.0px;\n    color: #3e3832;\n    line-height: 1.42;"),
    # Dispatch contact
    (r'\.dispatch-contact\s*\{[^}]*font-size:\s*[\d\.]+px;[^}]*line-height:\s*[\d\.]+;',
     ".dispatch-contact {\n    font-size: 8.0px;\n    color: #38322c;\n    line-height: 1.42;")
]

def apply_css(content):
    for pat, repl in CSS_REPLACEMENTS:
        content = re.sub(pat, repl, content, count=1)
    return content

# 1. Update IT Client Rate Card
def update_it_client():
    fpath = os.path.join(BASE_DIR, 'dorogo_wedding_client_rate_card_it.html')
    with open(fpath, 'r', encoding='utf-8') as f:
        c = f.read()
    c = apply_css(c)
    
    # Table roles (punchy Italian)
    roles = [
        ('VIP-Гости &amp; Подрядчики|Ospiti VIP Singoli &amp; Fornitori',
         '<strong>Ospiti VIP &amp; Fornitori:</strong> 1–2 passeggeri (fotografo, stylist, celebrante). Accesso libero alle ZTL.'),
        ('Основной Свадебный Шаттл|Navetta Matrimonio Principale',
         '<strong>Navetta Principale:</strong> Famiglie, corteo e transfer ospiti. Giri continui e navette serali.'),
        ('Автомобиль Молодоженов|Ammiraglia Sposi',
         '<strong>Ammiraglia Sposi:</strong> Auto d\'onore per gli sposi e shooting. Massimo comfort per l\'abito nuziale.'),
        ('Небольшие Группы &amp; Серпантины|Piccoli Gruppi &amp; Strade del Lago',
         '<strong>Strade Strette del Lago:</strong> Per 10–20 ospiti. Maneggevole dove i pullman grandi non transitano.'),
        ('Средние Группы &amp; Ужины|Gruppi Medi &amp; Cene di Nozze',
         '<strong>Gruppi Medi:</strong> 20–30 ospiti per cene di benvenuto. Ideale equilibrio tra capienza e agilità.'),
        ('Магистральные Рейсы из Аэропорта|Dorsale Aeroportuale Grandi Gruppi',
         '<strong>Grandi Gruppi &amp; Aeroporti:</strong> Oltre 50 ospiti diretti da Malpensa agli hotel e ai pontili.')
    ]
    for pattern, repl in roles:
        c = re.sub(r'<td class="role-text"><strong>(?:' + pattern + r'):?</strong>.*?</td>',
                   f'<td class="role-text">{repl}</td>', c, flags=re.DOTALL)
                   
    # Section 3 Collab Cards
    it_collab = """    <div class="collab-grid">
      <div class="collab-card">
        <div class="collab-head">
          <span class="collab-title">Coordinamento con Planner &amp; Location</span>
        </div>
        <div class="collab-desc">
          Coordiniamo orari di presa, arrivi ai pontili e navette notturne direttamente con il tuo wedding planner e la villa. Zero chiamate a voi il giorno delle nozze.
        </div>
      </div>
      <div class="collab-card">
        <div class="collab-head">
          <span class="collab-title">Trasparenza Totale &amp; Dispatcher H24</span>
        </div>
        <div class="collab-desc">
          Preventivo trasparente all-inclusive (ZTL, pedaggi e imposte inclusi). Acconto del 40% per bloccare la flotta. Coordinatore dedicato su WhatsApp sempre disponibile.
        </div>
      </div>
    </div>"""
    c = re.sub(r'<div class="collab-grid">[\s\S]*?</div>\s*</div>\s*</div>', it_collab, c)
    
    # Footer Terms
    it_terms = """        <div class="terms-title">Termini di Prenotazione &amp; Centrale Operativa</div>
        <div class="terms-text">
          &bull; <strong>Acconto:</strong> Il 40% all'ordine blocca la flotta a calendario; saldo a 14 giorni dall'evento.<br>
          &bull; <strong>Cancellazione:</strong> Modifica data gratuita &gt;14 giorni. Entro 14 giorni: penale 100%.<br>
          &bull; <strong>Standard Flotta:</strong> Mercedes neri senza insegne commerciali; autisti in abito scuro bilingue.<br>
          &bull; <strong>Servizi Inclusi:</strong> Dispatcher WhatsApp dedicato, monitoraggio voli live e Portale Transfer Ospiti.
        </div>"""
    c = re.sub(r'<div class="terms-title">[^<]+</div>\s*<div class="terms-text">[\s\S]*?</div>', it_terms, c)
    
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print("Updated dorogo_wedding_client_rate_card_it.html")

# 2. Update EN Client Rate Card
def update_en_client():
    fpath = os.path.join(BASE_DIR, 'dorogo_wedding_client_rate_card_en.html')
    with open(fpath, 'r', encoding='utf-8') as f:
        c = f.read()
    c = apply_css(c)
    
    # Table roles (punchy English)
    roles = [
        ('Solo VIPs &amp; Vendors',
         '<strong>Solo VIPs &amp; Vendors:</strong> 1–2 passengers (photographer, stylist, celebrant). Unrestricted ZTL access.'),
        ('Core Wedding Shuttle',
         '<strong>Core Wedding Shuttle:</strong> Wedding party, family, and guest villa loops. Fits narrow historic gates.'),
        ('Bride &amp; Groom Flagship',
         '<strong>Bride &amp; Groom Flagship:</strong> Grand ceremonial arrival and photo shoots. Extra rear cabin legroom for gowns.'),
        ('Small Groups &amp; Mountain Roads',
         '<strong>Tight Lakeside Roads:</strong> 10–20 guests. Navigates narrow lake roads where 50p coaches cannot go.'),
        ('Medium Groups &amp; Dinners',
         '<strong>Medium Groups:</strong> 20–30 guests for rehearsal dinners. Ideal balance of capacity and agility.'),
        ('Mass Airport Trunk Line',
         '<strong>Mass Airport Trunk Line:</strong> 50+ guests from Milan airports direct to central hotels and boat piers.')
    ]
    for pattern, repl in roles:
        c = re.sub(r'<td class="role-text"><strong>(?:' + pattern + r'):?</strong>.*?</td>',
                   f'<td class="role-text">{repl}</td>', c, flags=re.DOTALL)
                   
    # Section 3 Collab Cards
    en_collab = """    <div class="collab-grid">
      <div class="collab-card">
        <div class="collab-head">
          <span class="collab-title">Planner &amp; Venue Coordination</span>
        </div>
        <div class="collab-desc">
          We align all pickup schedules, boat dock arrivals, and night shuttles directly with your wedding planner and venue manager. Zero phone calls to you on your wedding day.
        </div>
      </div>
      <div class="collab-card">
        <div class="collab-head">
          <span class="collab-title">Transparent Invoicing &amp; 24/7 Dispatch</span>
        </div>
        <div class="collab-desc">
          Itemized official invoice with all tolls, ZTL permits, and taxes included. 40% deposit secures fleet allocation. Dedicated WhatsApp coordinator on call 24/7.
        </div>
      </div>
    </div>"""
    c = re.sub(r'<div class="collab-grid">[\s\S]*?</div>\s*</div>\s*</div>', en_collab, c)
    
    # Footer Terms
    en_terms = """        <div class="terms-title">Booking Terms &amp; Dispatch Protocol</div>
        <div class="terms-text">
          &bull; <strong>Deposit:</strong> 40% deposit secures fleet schedule; remaining balance due 14 days prior to event.<br>
          &bull; <strong>Cancellation:</strong> Free date reschedule &gt;14 days. Inside 14 days: 100% cancellation fee.<br>
          &bull; <strong>Fleet Standards:</strong> Unbranded all-black Mercedes fleet; dark-suited English-speaking chauffeurs.<br>
          &bull; <strong>Included Services:</strong> Dedicated WhatsApp dispatch desk, live flight tracking, and Guest Transfer Portal.
        </div>"""
    c = re.sub(r'<div class="terms-title">[^<]+</div>\s*<div class="terms-text">[\s\S]*?</div>', en_terms, c)
    
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print("Updated dorogo_wedding_client_rate_card_en.html")

# 3. Update RU Partner Rate Card
def update_ru_partner():
    fpath = os.path.join(BASE_DIR, 'dorogo_wedding_partner_rate_card_ru.html')
    with open(fpath, 'r', encoding='utf-8') as f:
        c = f.read()
    c = apply_css(c)
    
    roles = [
        ('VIP-Гости &amp; Подрядчики',
         '<strong>VIP-Гости &amp; Подрядчики:</strong> 1–2 пассажира (фотограф, стилист, ведущий). Свободный въезд в зоны ZTL.'),
        ('Основной Свадебный Шаттл',
         '<strong>Основной Шаттл:</strong> Развозка семьи, подружек невесты и гостей виллы. Ночные челночные рейсы.'),
        ('Автомобиль Молодоженов',
         '<strong>Автомобиль Молодоженов:</strong> Главное авто жениха и невесты, фотосессии, просторный салон для платья.'),
        ('Небольшие Группы &amp; Серпантины',
         '<strong>Узкие Серпантины:</strong> Для 10–20 гостей. Незаменим на набережных Комо, куда не проедет большой автобус.'),
        ('Средние Группы &amp; Ужины',
         '<strong>Средние Группы:</strong> Для 20–30 гостей на pre-wedding ужины. Сочетает вместимость с маневренностью.'),
        ('Магистральные Рейсы из Аэропорта',
         '<strong>Магистральные Рейсы:</strong> Прямой трансфер групп 50+ гостей из аэропортов Милана к отелям и пирсам.')
    ]
    for pattern, repl in roles:
        c = re.sub(r'<td class="role-text"><strong>(?:' + pattern + r'):?</strong>.*?</td>',
                   f'<td class="role-text">{repl}</td>', c, flags=re.DOTALL)
                   
    # Section 3 B2B Collab Cards
    ru_b2b = """    <div class="collab-grid">
      <div class="collab-card">
        <div class="collab-head">
          <span class="collab-title">Вариант A: Модель White-Label (Прямая Наценка)</span>
        </div>
        <div class="collab-desc">
          Включайте наши нетто-тарифы в смету свадьбы с вашей агентской комиссией. DOROGO работает как ваша собственная транспортная служба white-label с защитой клиента.
        </div>
      </div>
      <div class="collab-card">
        <div class="collab-head">
          <span class="collab-title">Вариант B: Агентское Вознаграждение 5%</span>
        </div>
        <div class="collab-desc">
          Передайте нам контакты клиента и маршруты &mdash; мы полностью берем на себя расчет, координацию и выставление счетов. Студия получает агентскую комиссию 5% после оплаты.
        </div>
      </div>
    </div>"""
    c = re.sub(r'<div class="collab-grid">[\s\S]*?</div>\s*</div>\s*</div>', ru_b2b, c)
    
    # Footer Terms
    ru_terms = """        <div class="terms-title">Условия Бронирования &amp; Регламент</div>
        <div class="terms-text">
          &bull; <strong>Предоплата:</strong> 40% депозит фиксирует автопарк; доплата 60% за 14 дней до события.<br>
          &bull; <strong>Отмена:</strong> Бесплатный перенос даты &gt;14 дней. Менее 14 дней &mdash; штраф 100%.<br>
          &bull; <strong>Стандарты автопарка:</strong> Черные Mercedes без рекламы; водители в темных костюмах.<br>
          &bull; <strong>Включенный сервис:</strong> WhatsApp диспетчер, трекинг рейсов и Портал трансферов для гостей.
        </div>"""
    c = re.sub(r'<div class="terms-title">[^<]+</div>\s*<div class="terms-text">[\s\S]*?</div>', ru_terms, c)
    
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print("Updated dorogo_wedding_partner_rate_card_ru.html")

# 4. Update IT Partner Rate Card
def update_it_partner():
    fpath = os.path.join(BASE_DIR, 'dorogo_wedding_partner_rate_card_it.html')
    with open(fpath, 'r', encoding='utf-8') as f:
        c = f.read()
    c = apply_css(c)
    
    roles = [
        ('VIP-Гости &amp; Подрядчики|Ospiti VIP Singoli &amp; Fornitori',
         '<strong>Ospiti VIP &amp; Fornitori:</strong> 1–2 passeggeri (fotografo, stylist, celebrante). Accesso libero alle ZTL.'),
        ('Основной Свадебный Шаттл|Navetta Matrimonio Principale',
         '<strong>Navetta Principale:</strong> Famiglie, corteo e transfer ospiti. Giri continui e navette serali.'),
        ('Автомобиль Молодоженов|Ammiraglia Sposi',
         '<strong>Ammiraglia Sposi:</strong> Auto d\'onore per gli sposi e shooting. Massimo comfort per l\'abito nuziale.'),
        ('Небольшие Группы &amp; Серпантины|Piccoli Gruppi &amp; Strade del Lago',
         '<strong>Strade Strette del Lago:</strong> Per 10–20 ospiti. Maneggevole dove i pullman grandi non transitano.'),
        ('Средние Группы &amp; Ужины|Gruppi Medi &amp; Cene di Nozze',
         '<strong>Gruppi Medi:</strong> 20–30 ospiti per cene di benvenuto. Ideale equilibrio tra capienza e agilità.'),
        ('Магистральные Рейсы из Аэропорта|Dorsale Aeroportuale Grandi Gruppi',
         '<strong>Grandi Gruppi &amp; Aeroporti:</strong> Oltre 50 ospiti diretti da Malpensa agli hotel e ai pontili.')
    ]
    for pattern, repl in roles:
        c = re.sub(r'<td class="role-text"><strong>(?:' + pattern + r'):?</strong>.*?</td>',
                   f'<td class="role-text">{repl}</td>', c, flags=re.DOTALL)
                   
    # Section 3 B2B Collab Cards
    it_b2b = """    <div class="collab-grid">
      <div class="collab-card">
        <div class="collab-head">
          <span class="collab-title">Opzione A: Ricarico Studio White-Label</span>
        </div>
        <div class="collab-desc">
          Includi le tariffe nette nel budget nozze con il tuo margine. DOROGO opera come tuo reparto trasporti interno white-label con protezione totale del cliente.
        </div>
      </div>
      <div class="collab-card">
        <div class="collab-head">
          <span class="collab-title">Opzione B: Commissione Agenzia 5%</span>
        </div>
        <div class="collab-desc">
          Trasmettici i contatti del cliente: gestiamo noi quotazioni, fatturazione e logistica. La tua agenzia riceve il 5% di provvigione a saldo del contratto.
        </div>
      </div>
    </div>"""
    c = re.sub(r'<div class="collab-grid">[\s\S]*?</div>\s*</div>\s*</div>', it_b2b, c)
    
    # Footer Terms
    it_terms = """        <div class="terms-title">Termini di Prenotazione &amp; Centrale Operativa</div>
        <div class="terms-text">
          &bull; <strong>Acconto:</strong> Il 40% all'ordine blocca la flotta a calendario; saldo a 14 giorni dall'evento.<br>
          &bull; <strong>Cancellazione:</strong> Modifica data gratuita &gt;14 giorni. Entro 14 giorni: penale 100%.<br>
          &bull; <strong>Standard Flotta:</strong> Mercedes neri senza insegne commerciali; autisti in abito scuro bilingue.<br>
          &bull; <strong>Servizi Inclusi:</strong> Dispatcher WhatsApp dedicato, monitoraggio voli live e Portale Transfer Ospiti.
        </div>"""
    c = re.sub(r'<div class="terms-title">[^<]+</div>\s*<div class="terms-text">[\s\S]*?</div>', it_terms, c)
    
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print("Updated dorogo_wedding_partner_rate_card_it.html")

# 5. Update EN Partner Rate Card
def update_en_partner():
    fpath = os.path.join(BASE_DIR, 'dorogo_wedding_partner_rate_card.html')
    with open(fpath, 'r', encoding='utf-8') as f:
        c = f.read()
    c = apply_css(c)
    
    roles = [
        ('Solo VIPs &amp; Vendors',
         '<strong>Solo VIPs &amp; Vendors:</strong> 1–2 passengers (photographer, stylist, celebrant). Unrestricted ZTL access.'),
        ('Core Wedding Shuttle',
         '<strong>Core Wedding Shuttle:</strong> Wedding party, family, and guest villa loops. Fits narrow historic gates.'),
        ('Bride &amp; Groom Flagship',
         '<strong>Bride &amp; Groom Flagship:</strong> Grand ceremonial arrival and photo shoots. Extra rear cabin legroom for gowns.'),
        ('Small Groups &amp; Mountain Roads',
         '<strong>Tight Lakeside Roads:</strong> 10–20 guests. Navigates narrow lake roads where 50p coaches cannot go.'),
        ('Medium Groups &amp; Dinners',
         '<strong>Medium Groups:</strong> 20–30 guests for rehearsal dinners. Ideal balance of capacity and agility.'),
        ('Mass Airport Trunk Line',
         '<strong>Mass Airport Trunk Line:</strong> 50+ guests from Milan airports direct to central hotels and boat piers.')
    ]
    for pattern, repl in roles:
        c = re.sub(r'<td class="role-text"><strong>(?:' + pattern + r'):?</strong>.*?</td>',
                   f'<td class="role-text">{repl}</td>', c, flags=re.DOTALL)
                   
    # Section 3 B2B Collab Cards
    en_b2b = """    <div class="collab-grid">
      <div class="collab-card">
        <div class="collab-head">
          <span class="collab-title">Option A: White-Label Studio Markup</span>
        </div>
        <div class="collab-desc">
          Include confidential net rates into your wedding budget with your agency margin. DOROGO operates as your white-label transport department with client protection.
        </div>
      </div>
      <div class="collab-card">
        <div class="collab-head">
          <span class="collab-title">Option B: 5% Referral Commission</span>
        </div>
        <div class="collab-desc">
          Pass us the client contact and itinerary &mdash; DOROGO handles 100% of quoting, billing, and on-ground logistics. Your studio receives a 5% commission upon settlement.
        </div>
      </div>
    </div>"""
    c = re.sub(r'<div class="collab-grid">[\s\S]*?</div>\s*</div>\s*</div>', en_b2b, c)
    
    # Footer Terms
    en_terms = """        <div class="terms-title">Booking Terms &amp; Dispatch Protocol</div>
        <div class="terms-text">
          &bull; <strong>Deposit:</strong> 40% deposit secures fleet schedule; remaining balance due 14 days prior to event.<br>
          &bull; <strong>Cancellation:</strong> Free date reschedule &gt;14 days. Inside 14 days: 100% cancellation fee.<br>
          &bull; <strong>Fleet Standards:</strong> Unbranded all-black Mercedes fleet; dark-suited English-speaking chauffeurs.<br>
          &bull; <strong>Included Services:</strong> Dedicated WhatsApp dispatch desk, live flight tracking, and Guest Transfer Portal.
        </div>"""
    c = re.sub(r'<div class="terms-title">[^<]+</div>\s*<div class="terms-text">[\s\S]*?</div>', en_terms, c)
    
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print("Updated dorogo_wedding_partner_rate_card.html")

update_it_client()
update_en_client()
update_ru_partner()
update_it_partner()
update_en_partner()
print("\nAll files successfully updated!")
