import re
import os
import subprocess
import pymupdf

BASE_DIR = '/Users/User/Downloads/Wedding-planners-outreach'
DOWNLOADS_DIR = '/Users/User/Downloads'
BRAIN_DIR = '/Users/User/.gemini/antigravity/brain/fd114c0c-04b2-4991-9b4c-0a3573ed8beb'
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

# 1. dorogo_wedding_client_rate_card_ru.html
def fix_ru_client():
    fpath = os.path.join(BASE_DIR, 'dorogo_wedding_client_rate_card_ru.html')
    with open(fpath, 'r', encoding='utf-8') as f:
        c = f.read()

    # Section 2 Standby Grid
    sec2_ru = """    <div class="standby-grid">
      <div class="standby-card">
        <div class="standby-title">Почасовая Аренда &amp; Ночные Часы</div>
        <div class="standby-desc">
          &bull; <strong>Ночные часы (22:00–06:00):</strong> +20% (ночная смена водителя по закону Италии)<br>
          &bull; <strong>Продление аренды:</strong> по стандартной почасовой ставке автомобиля из таблицы<br>
          &bull; <strong>Лимит пробега (10ч день):</strong> 200 км вкл. (перепробег &euro;2.50 / км)<br>
          &bull; <strong>Скидки за объем:</strong> спецтарифы при заказе на 2+ дня или нескольких авто
        </div>
      </div>
      <div class="standby-card">
        <div class="standby-title">Парковки в Аэропортах &amp; Трассы</div>
        <div class="standby-desc">
          &bull; <strong>Седаны &amp; V-Class:</strong> встреча с табличкой, 60 мин ожидания и парковка включены<br>
          &bull; <strong>Автобусы MXP:</strong> &euro;30 (терминал посадки автобусов Malpensa)<br>
          &bull; <strong>Автобусы BGY / LIN:</strong> &euro;15 в Бергамо, &euro;20 в Линате<br>
          &bull; <strong>Автомагистрали:</strong> все платные дороги включены в стоимость трансфера
        </div>
      </div>
      <div class="standby-card">
        <div class="standby-title">Центры Городов (ZTL) &amp; Багаж</div>
        <div class="standby-desc">
          &bull; <strong>Седаны &amp; V-Class:</strong> свободный въезд в закрытые центры (зоны ZTL Милана и Комо)<br>
          &bull; <strong>Автобусы (будни):</strong> пропуск в центр Милана: 19p — &euro;60 &bull; 30p — &euro;100 &bull; 50p — &euro;150<br>
          &bull; <strong>Выходные дни:</strong> въезд в центры городов бесплатный для всех классов авто<br>
          &bull; <strong>Багажный вэн:</strong> Mercedes Vito Cargo под пышные платья и чемоданы
        </div>
      </div>
    </div>"""
    c = re.sub(r'<div class="standby-grid">[\s\S]*?</div>\s*</div>\s*</div>', sec2_ru, c)

    # Section 3 Collab Cards
    sec3_ru = """    <div class="collab-grid">
      <div class="collab-card">
        <div class="collab-head">
          <span class="collab-title">Координация с Организатором &amp; Площадкой</span>
        </div>
        <div class="collab-desc">
          Согласуем тайминг подачи авто, катеров и ночных разъездов напрямую с вашим свадебным организатором и менеджером виллы. Ноль звонков вам в день свадьбы.
        </div>
      </div>
      <div class="collab-card">
        <div class="collab-head">
          <span class="collab-title">Забота о Гостях &amp; Ночные Разъезды</span>
        </div>
        <div class="collab-desc">
          Комфортная встреча родителей и гостей, трансферы подружек невесты и непрерывные челночные рейсы вилла ↔ отели до последнего гостя.
        </div>
      </div>
    </div>"""
    c = re.sub(r'<div class="collab-grid">[\s\S]*?</div>\s*</div>\s*</div>', sec3_ru, c)

    # Footer Terms (No repetition!)
    terms_ru = """        <div class="terms-title">Условия Бронирования &amp; Гарантии</div>
        <div class="terms-text">
          &bull; <strong>Предоплата:</strong> 40% депозит фиксирует автопарк; доплата 60% за 14 дней до события.<br>
          &bull; <strong>Правила отмены:</strong> Бесплатный перенос даты &gt;14 дней. Менее 14 дней &mdash; штраф 100%.<br>
          &bull; <strong>Официальный расчет:</strong> Счет от итальянской компании (EU VAT / Fattura Elettronica).<br>
          &bull; <strong>Гарантия подачи:</strong> 100% замена на авто аналогичного или высшего класса при форс-мажоре.
        </div>"""
    c = re.sub(r'<div class="terms-title">[^<]+</div>\s*<div class="terms-text">[\s\S]*?</div>', terms_ru, c)

    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print("Updated RU Client Rate Card")

# 2. dorogo_wedding_client_rate_card_en.html
def fix_en_client():
    fpath = os.path.join(BASE_DIR, 'dorogo_wedding_client_rate_card_en.html')
    with open(fpath, 'r', encoding='utf-8') as f:
        c = f.read()

    sec2_en = """    <div class="standby-grid">
      <div class="standby-card">
        <div class="standby-title">Hourly Standby &amp; Night Window</div>
        <div class="standby-desc">
          &bull; <strong>Night shift (22:00–06:00):</strong> +20% (compensates Italian mandatory driver night rate)<br>
          &bull; <strong>Extra hours:</strong> billed at the vehicle's standard hourly rate from the table<br>
          &bull; <strong>Daily allowance (10h):</strong> 200 km included (excess mileage at &euro;2.50 / km)<br>
          &bull; <strong>Volume savings:</strong> bespoke package rates for multi-day weddings or multi-vehicle fleets
        </div>
      </div>
      <div class="standby-card">
        <div class="standby-title">Airport Parking &amp; Highway Tolls</div>
        <div class="standby-desc">
          &bull; <strong>Sedans &amp; V-Class:</strong> meet &amp; greet, live flight tracking, and 60 min wait included<br>
          &bull; <strong>Coaches MXP:</strong> dedicated coach holding bay at cost (&euro;30 Malpensa)<br>
          &bull; <strong>Coaches BGY / LIN:</strong> &euro;15 at Bergamo, &euro;20 at Linate airport bays<br>
          &bull; <strong>Motorway tolls:</strong> 100% included in all point-to-point transfer rates
        </div>
      </div>
      <div class="standby-card">
        <div class="standby-title">City Centers (ZTL) &amp; Luggage</div>
        <div class="standby-desc">
          &bull; <strong>Sedans &amp; V-Class:</strong> free entry into restricted old-town centers (ZTL zones in Milan &amp; Como)<br>
          &bull; <strong>Coaches (Mon–Fri):</strong> Milan city center bus permits: 19p &euro;60 &bull; 30p &euro;100 &bull; 50p &euro;150<br>
          &bull; <strong>Weekend access:</strong> city center access is completely free on Saturdays &amp; Sundays<br>
          &bull; <strong>Luggage support van:</strong> dedicated Mercedes Vito Cargo for gowns and heavy luggage
        </div>
      </div>
    </div>"""
    c = re.sub(r'<div class="standby-grid">[\s\S]*?</div>\s*</div>\s*</div>', sec2_en, c)

    sec3_en = """    <div class="collab-grid">
      <div class="collab-card">
        <div class="collab-head">
          <span class="collab-title">Planner &amp; Venue Timeline Synchronization</span>
        </div>
        <div class="collab-desc">
          We align all pickup schedules, boat dock arrivals, and night departures directly with your wedding planner and villa manager. Zero phone calls to you on your wedding day.
        </div>
      </div>
      <div class="collab-card">
        <div class="collab-head">
          <span class="collab-title">Guest Care &amp; Continuous Late-Night Shuttles</span>
        </div>
        <div class="collab-desc">
          Dedicated transfers for parents and VIPs, bridal party mobility, and continuous shuttle loops between the villa and guest hotels until the final guest is safely home.
        </div>
      </div>
    </div>"""
    c = re.sub(r'<div class="collab-grid">[\s\S]*?</div>\s*</div>\s*</div>', sec3_en, c)

    terms_en = """        <div class="terms-title">Booking Terms &amp; Guarantees</div>
        <div class="terms-text">
          &bull; <strong>Payment schedule:</strong> 40% deposit secures fleet allocation; final balance due 14 days prior.<br>
          &bull; <strong>Cancellation policy:</strong> Free date reschedule &gt;14 days. Inside 14 days: 100% cancellation fee.<br>
          &bull; <strong>Official invoicing:</strong> Issued by licensed Italian NCC carrier (EU VAT / electronic invoice).<br>
          &bull; <strong>Replacement guarantee:</strong> 100% guaranteed replacement with equal or higher class vehicle.
        </div>"""
    c = re.sub(r'<div class="terms-title">[^<]+</div>\s*<div class="terms-text">[\s\S]*?</div>', terms_en, c)

    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print("Updated EN Client Rate Card")

# 3. dorogo_wedding_client_rate_card_it.html
def fix_it_client():
    fpath = os.path.join(BASE_DIR, 'dorogo_wedding_client_rate_card_it.html')
    with open(fpath, 'r', encoding='utf-8') as f:
        c = f.read()

    sec2_it = """    <div class="standby-grid">
      <div class="standby-card">
        <div class="standby-title">Disposizione Oraria &amp; Servizio Notturno</div>
        <div class="standby-desc">
          &bull; <strong>Servizio notturno (22:00–06:00):</strong> +20% (indennità notturna autista da CCNL Italia)<br>
          &bull; <strong>Ore supplementari:</strong> conteggiate alla normale tariffa oraria dell'auto a tabella<br>
          &bull; <strong>Chilometraggio (10h):</strong> 200 km inclusi (eccedenza a &euro;2.50 / km)<br>
          &bull; <strong>Tariffe agevolate:</strong> condizioni su misura per matrimoni su 2+ giorni o flotta mista
        </div>
      </div>
      <div class="standby-card">
        <div class="standby-title">Parcheggi Aeroportuali &amp; Autostrade</div>
        <div class="standby-desc">
          &bull; <strong>Berline &amp; V-Class:</strong> accoglienza in arrivi, tracciamento volo e 60 min attesa inclusi<br>
          &bull; <strong>Bus e Minibus MXP:</strong> stallo dedicato terminal bus aeroportuale (&euro;30 Malpensa)<br>
          &bull; <strong>Bus BGY / LIN:</strong> &euro;15 a Bergamo Orio al Serio, &euro;20 a Milano Linate<br>
          &bull; <strong>Pedaggi autostradali:</strong> 100% inclusi in tutte le tariffe punto a punto
        </div>
      </div>
      <div class="standby-card">
        <div class="standby-title">Centri Storici (ZTL) &amp; Van Bagagli</div>
        <div class="standby-desc">
          &bull; <strong>Berline &amp; V-Class:</strong> transito libero nelle ZTL e aree pedonali di Milano e Como<br>
          &bull; <strong>Pass Bus (lun–ven):</strong> ticket ecologico centro Milano: 19p &euro;60 &bull; 30p &euro;100 &bull; 50p &euro;150<br>
          &bull; <strong>Weekend:</strong> accesso ai centri storici completamente gratuito sabato e domenica<br>
          &bull; <strong>Van supporto bagagli:</strong> Mercedes Vito Cargo dedicato per abiti da sposa e valigie
        </div>
      </div>
    </div>"""
    c = re.sub(r'<div class="standby-grid">[\s\S]*?</div>\s*</div>\s*</div>', sec2_it, c)

    sec3_it = """    <div class="collab-grid">
      <div class="collab-card">
        <div class="collab-head">
          <span class="collab-title">Coordinamento con Planner &amp; Location</span>
        </div>
        <div class="collab-desc">
          Coordiniamo orari di presa, arrivi ai pontili e partenze notturne direttamente con il tuo wedding planner e il gestore della villa. Zero chiamate a voi il giorno delle nozze.
        </div>
      </div>
      <div class="collab-card">
        <div class="collab-head">
          <span class="collab-title">Cura degli Ospiti &amp; Spole Notturne Continue</span>
        </div>
        <div class="collab-desc">
          Accoglienza dedicata per genitori e ospiti d'onore, transfer corteo e navette continue villa ↔ hotel fino a notte inoltrata, per la massima serenità di tutti.
        </div>
      </div>
    </div>"""
    c = re.sub(r'<div class="collab-grid">[\s\S]*?</div>\s*</div>\s*</div>', sec3_it, c)

    terms_it = """        <div class="terms-title">Termini di Prenotazione &amp; Garanzie</div>
        <div class="terms-text">
          &bull; <strong>Acconto &amp; Saldo:</strong> 40% all'ordine per bloccare la flotta; saldo dovuto a 14 giorni dall'evento.<br>
          &bull; <strong>Politica di cancellazione:</strong> Modifica data gratuita &gt;14 giorni. Entro 14 giorni: penale del 100%.<br>
          &bull; <strong>Fatturazione ufficiale:</strong> Emessa da azienda NCC italiana registrata (fattura elettronica / IVA UE).<br>
          &bull; <strong>Garanzia di continuità:</strong> Sostituzione garantita al 100% con veicolo di pari o superiore categoria.
        </div>"""
    c = re.sub(r'<div class="terms-title">[^<]+</div>\s*<div class="terms-text">[\s\S]*?</div>', terms_it, c)

    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print("Updated IT Client Rate Card")

# 4. dorogo_wedding_partner_rate_card_ru.html
def fix_ru_partner():
    fpath = os.path.join(BASE_DIR, 'dorogo_wedding_partner_rate_card_ru.html')
    with open(fpath, 'r', encoding='utf-8') as f:
        c = f.read()

    sec2_ru = """    <div class="standby-grid">
      <div class="standby-card">
        <div class="standby-title">Почасовая Аренда &amp; Ночные Часы</div>
        <div class="standby-desc">
          &bull; <strong>Ночные часы (22:00–06:00):</strong> +20% (ночная смена водителя по закону Италии)<br>
          &bull; <strong>Продление аренды:</strong> по стандартной почасовой ставке автомобиля из таблицы<br>
          &bull; <strong>Лимит пробега (10ч день):</strong> 200 км вкл. (перепробег &euro;2.50 / км)<br>
          &bull; <strong>Скидки за объем:</strong> спецтарифы при заказе на 2+ дня или нескольких авто
        </div>
      </div>
      <div class="standby-card">
        <div class="standby-title">Парковки в Аэропортах &amp; Трассы</div>
        <div class="standby-desc">
          &bull; <strong>Седаны &amp; V-Class:</strong> встреча с табличкой, 60 мин ожидания и парковка включены<br>
          &bull; <strong>Автобусы MXP:</strong> &euro;30 (терминал посадки автобусов Malpensa)<br>
          &bull; <strong>Автобусы BGY / LIN:</strong> &euro;15 в Бергамо, &euro;20 в Линате<br>
          &bull; <strong>Автомагистрали:</strong> все платные дороги включены в стоимость трансфера
        </div>
      </div>
      <div class="standby-card">
        <div class="standby-title">Центры Городов (ZTL) &amp; Багаж</div>
        <div class="standby-desc">
          &bull; <strong>Седаны &amp; V-Class:</strong> свободный въезд в закрытые центры (зоны ZTL Милана и Комо)<br>
          &bull; <strong>Автобусы (будни):</strong> пропуск в центр Милана: 19p — &euro;60 &bull; 30p — &euro;100 &bull; 50p — &euro;150<br>
          &bull; <strong>Выходные дни:</strong> въезд в центры городов бесплатный для всех классов авто<br>
          &bull; <strong>Багажный вэн:</strong> Mercedes Vito Cargo под пышные платья и чемоданы
        </div>
      </div>
    </div>"""
    c = re.sub(r'<div class="standby-grid">[\s\S]*?</div>\s*</div>\s*</div>', sec2_ru, c)

    terms_ru = """        <div class="terms-title">Условия Бронирования &amp; Гарантии</div>
        <div class="terms-text">
          &bull; <strong>Предоплата:</strong> 40% депозит фиксирует автопарк; доплата 60% за 14 дней до события.<br>
          &bull; <strong>Правила отмены:</strong> Бесплатный перенос даты &gt;14 дней. Менее 14 дней &mdash; штраф 100%.<br>
          &bull; <strong>Официальный расчет:</strong> Счет от итальянской компании (EU VAT / Fattura Elettronica).<br>
          &bull; <strong>Гарантия подачи:</strong> 100% замена на авто аналогичного или высшего класса при форс-мажоре.
        </div>"""
    c = re.sub(r'<div class="terms-title">[^<]+</div>\s*<div class="terms-text">[\s\S]*?</div>', terms_ru, c)

    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print("Updated RU Partner Rate Card")

# 5. dorogo_wedding_partner_rate_card_it.html
def fix_it_partner():
    fpath = os.path.join(BASE_DIR, 'dorogo_wedding_partner_rate_card_it.html')
    with open(fpath, 'r', encoding='utf-8') as f:
        c = f.read()

    sec2_it = """    <div class="standby-grid">
      <div class="standby-card">
        <div class="standby-title">Disposizione Oraria &amp; Servizio Notturno</div>
        <div class="standby-desc">
          &bull; <strong>Servizio notturno (22:00–06:00):</strong> +20% (indennità notturna autista da CCNL Italia)<br>
          &bull; <strong>Ore supplementari:</strong> conteggiate alla normale tariffa oraria dell'auto a tabella<br>
          &bull; <strong>Chilometraggio (10h):</strong> 200 km inclusi (eccedenza a &euro;2.50 / km)<br>
          &bull; <strong>Tariffe agevolate:</strong> condizioni su misura per matrimoni su 2+ giorni o flotta mista
        </div>
      </div>
      <div class="standby-card">
        <div class="standby-title">Parcheggi Aeroportuali &amp; Autostrade</div>
        <div class="standby-desc">
          &bull; <strong>Berline &amp; V-Class:</strong> accoglienza in arrivi, tracciamento volo e 60 min attesa inclusi<br>
          &bull; <strong>Bus e Minibus MXP:</strong> stallo dedicato terminal bus aeroportuale (&euro;30 Malpensa)<br>
          &bull; <strong>Bus BGY / LIN:</strong> &euro;15 a Bergamo Orio al Serio, &euro;20 a Milano Linate<br>
          &bull; <strong>Pedaggi autostradali:</strong> 100% inclusi in tutte le tariffe punto a punto
        </div>
      </div>
      <div class="standby-card">
        <div class="standby-title">Centri Storici (ZTL) &amp; Van Bagagli</div>
        <div class="standby-desc">
          &bull; <strong>Berline &amp; V-Class:</strong> transito libero nelle ZTL e aree pedonali di Milano e Como<br>
          &bull; <strong>Pass Bus (lun–ven):</strong> ticket ecologico centro Milano: 19p &euro;60 &bull; 30p &euro;100 &bull; 50p &euro;150<br>
          &bull; <strong>Weekend:</strong> accesso ai centri storici completamente gratuito sabato e domenica<br>
          &bull; <strong>Van supporto bagagli:</strong> Mercedes Vito Cargo dedicato per abiti da sposa e valigie
        </div>
      </div>
    </div>"""
    c = re.sub(r'<div class="standby-grid">[\s\S]*?</div>\s*</div>\s*</div>', sec2_it, c)

    terms_it = """        <div class="terms-title">Termini di Prenotazione &amp; Garanzie</div>
        <div class="terms-text">
          &bull; <strong>Acconto &amp; Saldo:</strong> 40% all'ordine per bloccare la flotta; saldo dovuto a 14 giorni dall'evento.<br>
          &bull; <strong>Politica di cancellazione:</strong> Modifica data gratuita &gt;14 giorni. Entro 14 giorni: penale del 100%.<br>
          &bull; <strong>Fatturazione ufficiale:</strong> Emessa da azienda NCC italiana registrata (fattura elettronica / IVA UE).<br>
          &bull; <strong>Garanzia di continuità:</strong> Sostituzione garantita al 100% con veicolo di pari o superiore categoria.
        </div>"""
    c = re.sub(r'<div class="terms-title">[^<]+</div>\s*<div class="terms-text">[\s\S]*?</div>', terms_it, c)

    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print("Updated IT Partner Rate Card")

# 6. dorogo_wedding_partner_rate_card.html (EN)
def fix_en_partner():
    fpath = os.path.join(BASE_DIR, 'dorogo_wedding_partner_rate_card.html')
    with open(fpath, 'r', encoding='utf-8') as f:
        c = f.read()

    sec2_en = """    <div class="standby-grid">
      <div class="standby-card">
        <div class="standby-title">Hourly Standby &amp; Night Window</div>
        <div class="standby-desc">
          &bull; <strong>Night shift (22:00–06:00):</strong> +20% (compensates Italian mandatory driver night rate)<br>
          &bull; <strong>Extra hours:</strong> billed at the vehicle's standard hourly rate from the table<br>
          &bull; <strong>Daily allowance (10h):</strong> 200 km included (excess mileage at &euro;2.50 / km)<br>
          &bull; <strong>Volume savings:</strong> bespoke package rates for multi-day weddings or multi-vehicle fleets
        </div>
      </div>
      <div class="standby-card">
        <div class="standby-title">Airport Parking &amp; Highway Tolls</div>
        <div class="standby-desc">
          &bull; <strong>Sedans &amp; V-Class:</strong> meet &amp; greet, live flight tracking, and 60 min wait included<br>
          &bull; <strong>Coaches MXP:</strong> dedicated coach holding bay at cost (&euro;30 Malpensa)<br>
          &bull; <strong>Coaches BGY / LIN:</strong> &euro;15 at Bergamo, &euro;20 at Linate airport bays<br>
          &bull; <strong>Motorway tolls:</strong> 100% included in all point-to-point transfer rates
        </div>
      </div>
      <div class="standby-card">
        <div class="standby-title">City Centers (ZTL) &amp; Luggage</div>
        <div class="standby-desc">
          &bull; <strong>Sedans &amp; V-Class:</strong> free entry into restricted old-town centers (ZTL zones in Milan &amp; Como)<br>
          &bull; <strong>Coaches (Mon–Fri):</strong> Milan city center bus permits: 19p &euro;60 &bull; 30p &euro;100 &bull; 50p &euro;150<br>
          &bull; <strong>Weekend access:</strong> city center access is completely free on Saturdays &amp; Sundays<br>
          &bull; <strong>Luggage support van:</strong> dedicated Mercedes Vito Cargo for gowns and heavy luggage
        </div>
      </div>
    </div>"""
    c = re.sub(r'<div class="standby-grid">[\s\S]*?</div>\s*</div>\s*</div>', sec2_en, c)

    terms_en = """        <div class="terms-title">Booking Terms &amp; Guarantees</div>
        <div class="terms-text">
          &bull; <strong>Payment schedule:</strong> 40% deposit secures fleet allocation; final balance due 14 days prior.<br>
          &bull; <strong>Cancellation policy:</strong> Free date reschedule &gt;14 days. Inside 14 days: 100% cancellation fee.<br>
          &bull; <strong>Official invoicing:</strong> Issued by licensed Italian NCC carrier (EU VAT / electronic invoice).<br>
          &bull; <strong>Replacement guarantee:</strong> 100% guaranteed replacement with equal or higher class vehicle.
        </div>"""
    c = re.sub(r'<div class="terms-title">[^<]+</div>\s*<div class="terms-text">[\s\S]*?</div>', terms_en, c)

    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print("Updated EN Partner Rate Card")

fix_ru_client()
fix_en_client()
fix_it_client()
fix_ru_partner()
fix_it_partner()
fix_en_partner()
print("\nAll 6 files updated with non-repetitive copy and clear ZTL explanations.")
