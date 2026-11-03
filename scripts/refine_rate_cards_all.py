import re
import os
import subprocess
import pymupdf

BASE_DIR = '/Users/User/Downloads/Wedding-planners-outreach'
DOWNLOADS_DIR = '/Users/User/Downloads'
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

def clean_common_elements(html_str):
    # Remove Trustpilot link in reviews
    html_str = re.sub(r'\s*&bull;\s*Trustpilot\s*(?:&#8599;|↗)', '', html_str)
    html_str = re.sub(r'\s*•\s*Trustpilot\s*(?:&#8599;|↗)', '', html_str)
    
    # Change ★★★★★ 5.0 to ★★★★★ 5
    html_str = html_str.replace('&#9733;&#9733;&#9733;&#9733;&#9733; 5.0', '&#9733;&#9733;&#9733;&#9733;&#9733; 5')
    html_str = html_str.replace('★★★★★ 5.0', '★★★★★ 5')
    
    # Remove section-sub entirely
    html_str = re.sub(r'\s*<span class="section-sub">[^<]+</span>', '', html_str)
    
    # Remove standby-tag entirely
    html_str = re.sub(r'\s*<div class="standby-tag">[^<]+</div>', '', html_str)
    
    # Remove collab-payout entirely
    html_str = re.sub(r'\s*<span class="collab-payout">[^<]+</span>', '', html_str)
    
    return html_str

# -------------------------------------------------------------
# 1. PROCESS RUSSIAN CLIENT RATE CARD
# -------------------------------------------------------------
ru_client_path = os.path.join(BASE_DIR, 'dorogo_wedding_client_rate_card_ru.html')
with open(ru_client_path, 'r', encoding='utf-8') as f:
    ru_client = f.read()

ru_client = clean_common_elements(ru_client)

# Header regions & sub
ru_client = ru_client.replace(
    'Персональные Трансферы &amp; Групповая Мобильность • Милан, Озеро Комо &amp; Северная Италия',
    'Персональные Трансферы &amp; Автопарк • Озеро Комо, Тоскана, Венеция, Милан'
)
ru_client = ru_client.replace(
    '<div class="header-sub">Сезон 2026 / 2027 • Официальные Прозрачные Тарифы • Консьерж-Сервис 24/7</div>',
    '<div class="header-sub">Сезон 2026 / 2027 • Прозрачные Тарифы • Консьерж-Сервис 24/7</div>'
)

# Section 1 Title
ru_client = ru_client.replace(
    '<span class="section-title">1. Мастер-Тарифы Автопарка &amp; Маршрутная Логистика</span>',
    '<span class="section-title">1. Автопарк &amp; Стоимость Поездок</span>'
)

# Section 1 Table Headers
ru_client = ru_client.replace(
    '<th rowspan="2" style="width: 20%;">Класс Авто &amp; Вместимость</th>',
    '<th rowspan="2" style="width: 20%;">Автомобиль &amp; Вместимость</th>'
)
ru_client = ru_client.replace(
    '<th colspan="2" class="group-header group-transfer" style="width: 25%;">1. Трансферы (Точка-в-Точку A &rarr; B)</th>',
    '<th colspan="2" class="group-header group-transfer" style="width: 25%;">1. Трансферы (A &rarr; B)</th>'
)
ru_client = ru_client.replace(
    '<th colspan="2" class="group-header group-disposal" style="width: 26%;">2. Почасовая Аренда (Водитель на Standby)</th>',
    '<th colspan="2" class="group-header group-disposal" style="width: 26%;">2. Аренда с Водителем (Standby)</th>'
)
ru_client = ru_client.replace(
    '<th rowspan="2" style="width: 29%;">Когда Выбирать Этот Автомобиль</th>',
    '<th rowspan="2" style="width: 29%;">Назначение &amp; Логистика</th>'
)

ru_client = ru_client.replace(
    '<th style="width: 10.5%;">Тариф / КМ</th>',
    '<th style="width: 10.5%;">За 1 км</th>'
)
ru_client = ru_client.replace(
    '<th style="width: 15.5%;" class="num divider-col">Пример: MXP &harr; Комо</th>',
    '<th style="width: 15.5%;" class="num divider-col">MXP &harr; Комо (~50 км)</th>'
)
ru_client = ru_client.replace(
    '<th style="width: 13.5%;" class="num">Полдня (Мин. 4ч)</th>',
    '<th style="width: 13.5%;" class="num">4 часа (мин.)</th>'
)
ru_client = ru_client.replace(
    '<th style="width: 12.5%;" class="num divider-col">Полный День (10ч)</th>',
    '<th style="width: 12.5%;" class="num divider-col">10 часов (день)</th>'
)

# Table body replacement with perfectly harmonized Russian copy & prices
ru_table_tbody = """        <tbody>
          <tr>
            <td>
              <span class="car-title">Mercedes-Benz E-Class</span>
              <span class="car-sub">Бизнес-седан &bull; 1–3 гостя &bull; 2 чемодана</span>
            </td>
            <td><strong>&euro;3.60 / км</strong><span class="rate-sub">Мин. &euro;120</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;180.00</span><span class="rate-sub">Пример ~50 км</span></td>
            <td class="num"><span class="rate-val">&euro;90 / ч</span><span class="rate-sub">4 ч: &euro;360</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;900.00</span><span class="rate-sub">200 км вкл.</span></td>
            <td class="role-text"><strong>VIP-Гости &amp; Подрядчики:</strong> 1–2 пассажира (фотограф, стилист, ведущий или отдельный VIP-гость). Свободный въезд в зоны ZTL Милана и Комо.</td>
          </tr>
          <tr>
            <td>
              <span class="car-title">Mercedes-Benz V-Class</span>
              <span class="car-sub">Свадебный минивэн &bull; 6–7 гостей &bull; 7 чемоданов</span>
            </td>
            <td><strong>&euro;4.60 / км</strong><span class="rate-sub">Мин. &euro;140</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;230.00</span><span class="rate-sub">Пример ~50 км</span></td>
            <td class="num"><span class="rate-val">&euro;105 / ч</span><span class="rate-sub">4 ч: &euro;420</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;1,050.00</span><span class="rate-sub">200 км вкл.</span></td>
            <td class="role-text"><strong>Основной Свадебный Шаттл:</strong> Развозка семьи, гостей и подружек невесты. Легко проходит в узкие ворота вилл (Balbiano, Pizzo) и выполняет ночные рейсы.</td>
          </tr>
          <tr>
            <td>
              <span class="car-title">Mercedes-Benz S-Class</span>
              <span class="car-sub">Флагманский седан &bull; 1–3 гостя &bull; 2 чемодана</span>
            </td>
            <td><strong>&euro;7.00 / км</strong><span class="rate-sub">Мин. &euro;220</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;350.00</span><span class="rate-sub">Пример ~50 км</span></td>
            <td class="num"><span class="rate-val">&euro;150 / ч</span><span class="rate-sub">4 ч: &euro;600</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;1,500.00</span><span class="rate-sub">200 км вкл.</span></td>
            <td class="role-text"><strong>Автомобиль Молодоженов:</strong> Главный автомобиль для жениха и невесты, фотосессий и пышных платьев со шлейфом, требующих максимального простора.</td>
          </tr>
          <tr>
            <td>
              <span class="car-title">Executive Minibus 16–20p</span>
              <span class="car-sub">Микроавтобус GT &bull; 16–20 гостей</span>
            </td>
            <td><strong>&euro;11.60 / км</strong><span class="rate-sub">Мин. &euro;420</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;580.00</span><span class="rate-sub">+ &euro;30 парк.</span></td>
            <td class="num"><span class="rate-val">&euro;145 / ч</span><span class="rate-sub">4 ч: &euro;580</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;950.00</span><span class="rate-sub">150 км вкл.</span></td>
            <td class="role-text"><strong>Небольшие Группы &amp; Серпантины:</strong> Для 10–20 гостей. Незаменим на узких набережных озера Комо, куда 50-местные автобусы не могут проехать.</td>
          </tr>
          <tr>
            <td>
              <span class="car-title">Executive Midibus 28–30p</span>
              <span class="car-sub">Мидибус GT &bull; 28–30 гостей</span>
            </td>
            <td><strong>&euro;13.80 / км</strong><span class="rate-sub">Мин. &euro;490</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;690.00</span><span class="rate-sub">+ &euro;30 парк.</span></td>
            <td class="num"><span class="rate-val">&euro;172.50 / ч</span><span class="rate-sub">4 ч: &euro;690</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;1,080.00</span><span class="rate-sub">150 км вкл.</span></td>
            <td class="role-text"><strong>Средние Группы &amp; Ужины:</strong> Для 20–30 гостей на приветственные ужины и трансферы. Сочетает вместимость автобуса с маневренностью минивэна.</td>
          </tr>
          <tr>
            <td>
              <span class="car-title">Grand Turismo Coach 50–55p</span>
              <span class="car-sub">Лайнер Gran Turismo &bull; 50–55 гостей</span>
            </td>
            <td><strong>&euro;15.60 / км</strong><span class="rate-sub">Мин. &euro;550</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;780.00</span><span class="rate-sub">+ &euro;30 парк.</span></td>
            <td class="num"><span class="rate-val">&euro;205 / ч</span><span class="rate-sub">4 ч: &euro;820</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;1,200.00</span><span class="rate-sub">150 км вкл.</span></td>
            <td class="role-text"><strong>Магистральные Рейсы из Аэропорта:</strong> Прямой трансфер групп 50+ гостей из аэропортов Милана к отелям и причалам. Для вилл стыкуется с V-Class.</td>
          </tr>
        </tbody>"""

ru_client = re.sub(r'<tbody>[\s\S]*?</tbody>', ru_table_tbody, ru_client)

# Standby cards in Section 2 (clean titles, no tags)
ru_standby_grid = """    <div class="standby-grid">
      <div class="standby-card">
        <div class="standby-title">Ночные Челночные Шаттлы (23:00–03:00)</div>
        <div class="standby-desc">
          <strong>Фиксированные тарифы "все включено":</strong><br>
          &bull; <strong>Mercedes V-Class (7 мест):</strong> <strong>&euro;450 фикс</strong><br>
          &bull; <strong>Executive Minibus (19 мест):</strong> <strong>&euro;650 фикс</strong><br>
          &bull; <strong>Executive Midibus (30 мест):</strong> <strong>&euro;850 фикс</strong><br>
          Непрерывные челночные рейсы между виллой и отелями гостей. Ночная смена водителя, топливо и любые короткие поездки включены.
        </div>
      </div>
      <div class="standby-card">
        <div class="standby-title">Сверхурочные Часы &amp; Ночные Тарифы</div>
        <div class="standby-desc">
          &bull; <strong>Ночные трансферы (22:00–06:00):</strong> +20% к базовой ставке маршрута.<br>
          &bull; <strong>Сверхурочные часы:</strong> Базовая ставка + 25% сверх оговоренного графика.<br>
          &bull; <strong>Пробег при аренде на 10 часов:</strong> 200 км включено (доплата &euro;2.50 за км).
        </div>
      </div>
      <div class="standby-card">
        <div class="standby-title">Проезд к Виллам &amp; Багажные Автомобили</div>
        <div class="standby-desc">
          &bull; <strong>Узкие исторические ворота:</strong> Минивэны V-Class свободно заезжают на виллы (Balbiano, Pizzo). Автобусы 50 мест стыкуются с микроавтобусами 19 мест.<br>
          &bull; <strong>Багажный автомобиль поддержки:</strong> Вместительный Mercedes Vito Cargo за <strong>&euro;240 фикс</strong> для свадебных нарядов, декора и багажа гостей.
        </div>
      </div>
    </div>"""

ru_client = re.sub(r'<div class="standby-grid">[\s\S]*?</div>\s*</div>\s*</div>', ru_standby_grid, ru_client)

# Section 3 Collab cards (single clean titles)
ru_collab_grid = """    <div class="collab-grid">
      <div class="collab-card">
        <div class="collab-head">
          <span class="collab-title">Синхронизация с Вашим Организатором</span>
        </div>
        <div class="collab-desc">
          Мы согласуем все графики подачи автомобилей, прибытие катеров и вечерние разъезды напрямую с вашим свадебным организатором и менеджером виллы. Ваши гости вовремя на месте, а вы спокойно наслаждаетесь праздником.
        </div>
      </div>
      <div class="collab-card">
        <div class="collab-head">
          <span class="collab-title">Прямое Бронирование &amp; Прозрачный Расчет</span>
        </div>
        <div class="collab-desc">
          Детальный официальный счет без скрытых комиссий, с учетом всех дорожных сборов, въездов в ZTL и налогов. Предоплата 40% бронирует транспорт, остаток 60% за 14 дней. Персональный русско- и англоязычный координатор в WhatsApp на связи.
        </div>
      </div>
    </div>"""

ru_client = re.sub(r'<div class="collab-grid">[\s\S]*?</div>\s*</div>\s*</div>', ru_collab_grid, ru_client)

# Guarantees text polish
ru_client = ru_client.replace('Ноль звонков молодоженам в день свадьбы', 'Ноль звонков вам в день свадьбы')

# Reviews text polish (clean meta)
ru_client = ru_client.replace(
    'Cocrzt &bull; 3-Дневная Свадьба (Пара из Франции)',
    'Cocrzt &bull; 3-Дневная Свадьба (Франция)'
)

# Footer polish in Russian
ru_footer = """    <div class="footer-strip">
      <div class="terms-col">
        <div class="terms-title">Условия Бронирования &amp; Регламент</div>
        <div class="terms-text">
          &bull; <strong>Предоплата и бронь:</strong> Депозит 40% закрепляет автопарк в графике диспетчерской; доплата 60% за 14 дней до события.<br>
          &bull; <strong>Правила отмены:</strong> Бесплатный перенос даты более чем за 14 дней. При отмене менее чем за 14 дней удерживается 100% стоимости.<br>
          &bull; <strong>Стандарты автопарка:</strong> Только черные автомобили Mercedes без коммерческих логотипов; англо- и русскоязычные водители в темных костюмах.<br>
          &bull; <strong>Включенный сервис:</strong> Выделенный русско- и англоязычный координатор в WhatsApp, отслеживание рейсов и Портал трансферов для гостей.
        </div>
      </div>
      <div class="dispatch-col">
        <div class="dispatch-lead">Dmitri &bull; DOROGO Private Transfers</div>
        <div class="dispatch-contact">
          WhatsApp &amp; Телефон: <a href="https://wa.me/393780940554" target="_blank" class="wa-link" title="Открыть чат в WhatsApp"><svg class="wa-icon" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg><strong>+39 378 094 0554</strong></a><br>
          Диспетчерская: <strong>dmitri@dorogo.eu</strong> &bull; <strong>booking@dorogo.eu</strong><br>
          Озеро Комо &bull; Тоскана &bull; Венеция &bull; Милан &bull; <strong>dorogo.eu/weddings</strong>
        </div>
      </div>
    </div>"""

ru_client = re.sub(r'<div class="footer-strip">[\s\S]*?</div>\s*</div>\s*</div>\s*</body>', ru_footer + '\n  </div>\n</body>', ru_client)

with open(ru_client_path, 'w', encoding='utf-8') as f:
    f.write(ru_client)
print("✓ Updated dorogo_wedding_client_rate_card_ru.html")

# -------------------------------------------------------------
# 2. PROCESS RUSSIAN PARTNER RATE CARD
# -------------------------------------------------------------
ru_partner_path = os.path.join(BASE_DIR, 'dorogo_wedding_partner_rate_card_ru.html')
with open(ru_partner_path, 'r', encoding='utf-8') as f:
    ru_partner = f.read()

ru_partner = clean_common_elements(ru_partner)

ru_partner = ru_partner.replace(
    'Персональные Трансферы &amp; Групповая Мобильность • Милан, Озеро Комо &amp; Северная Италия',
    'Персональные Трансферы &amp; Автопарк • Озеро Комо, Тоскана, Венеция, Милан'
)
ru_partner = ru_partner.replace(
    '<div class="header-sub">Сезон 2026 / 2027 • Официальные Прозрачные Тарифы • Консьерж-Сервис 24/7</div>',
    '<div class="header-sub">Сезон 2026 / 2027 • Конфиденциальные B2B Тарифы • Консьерж-Сервис 24/7</div>'
)
ru_partner = ru_partner.replace(
    '<span class="section-title">1. Мастер-Тарифы Автопарка &amp; Маршрутная Логистика</span>',
    '<span class="section-title">1. B2B Автопарк &amp; Стоимость Поездок</span>'
)
ru_partner = ru_partner.replace(
    '<th rowspan="2" style="width: 20%;">Класс Авто &amp; Вместимость</th>',
    '<th rowspan="2" style="width: 20%;">Автомобиль &amp; Вместимость</th>'
)
ru_partner = ru_partner.replace(
    '<th colspan="2" class="group-header group-transfer" style="width: 25%;">1. Трансферы (Точка-в-Точку A &rarr; B)</th>',
    '<th colspan="2" class="group-header group-transfer" style="width: 25%;">1. Трансферы (A &rarr; B)</th>'
)
ru_partner = ru_partner.replace(
    '<th colspan="2" class="group-header group-disposal" style="width: 26%;">2. Почасовая Аренда (Водитель на Standby)</th>',
    '<th colspan="2" class="group-header group-disposal" style="width: 26%;">2. Аренда с Водителем (Standby)</th>'
)
ru_partner = ru_partner.replace(
    '<th rowspan="2" style="width: 29%;">Когда Выбирать Этот Автомобиль</th>',
    '<th rowspan="2" style="width: 29%;">Назначение &amp; Логистика</th>'
)
ru_partner = ru_partner.replace(
    '<th style="width: 10.5%;">Тариф / КМ</th>',
    '<th style="width: 10.5%;">За 1 км</th>'
)
ru_partner = ru_partner.replace(
    '<th style="width: 15.5%;" class="num divider-col">Пример: MXP &harr; Комо</th>',
    '<th style="width: 15.5%;" class="num divider-col">MXP &harr; Комо (~50 км)</th>'
)
ru_partner = ru_partner.replace(
    '<th style="width: 13.5%;" class="num">Полдня (Мин. 4ч)</th>',
    '<th style="width: 13.5%;" class="num">4 часа (мин.)</th>'
)
ru_partner = ru_partner.replace(
    '<th style="width: 12.5%;" class="num divider-col">Полный День (10ч)</th>',
    '<th style="width: 12.5%;" class="num divider-col">10 часов (день)</th>'
)

ru_partner = re.sub(r'<tbody>[\s\S]*?</tbody>', ru_table_tbody, ru_partner)
ru_partner = re.sub(r'<div class="standby-grid">[\s\S]*?</div>\s*</div>\s*</div>', ru_standby_grid, ru_partner)

# Partner collab cards
ru_partner_collab = """    <div class="collab-grid">
      <div class="collab-card">
        <div class="collab-head">
          <span class="collab-title">Вариант A: Модель White-Label (Прямая Наценка)</span>
        </div>
        <div class="collab-desc">
          Включайте наши конфиденциальные нетто-тарифы напрямую в смету свадьбы с вашей агентской комиссией. DOROGO работает как ваша собственная транспортная служба white-label с гарантией защиты клиента.
        </div>
      </div>
      <div class="collab-card">
        <div class="collab-head">
          <span class="collab-title">Вариант B: Агентское Вознаграждение</span>
        </div>
        <div class="collab-desc">
          Передайте нам контакты клиента и пожелания по трансферам &mdash; мы полностью берем на себя расчет маршрутов, координацию и выставление счетов. Ваша студия получает агентскую комиссию после оплаты заказа.
        </div>
      </div>
    </div>"""

ru_partner = re.sub(r'<div class="collab-grid">[\s\S]*?</div>\s*</div>\s*</div>', ru_partner_collab, ru_partner)
ru_partner = ru_partner.replace('Ноль звонков организатору свадьбы', 'Ноль звонков вам в день свадьбы')
ru_partner = ru_partner.replace(
    'Cocrzt &bull; 3-Дневная Свадьба (Пара из Франции)',
    'Cocrzt &bull; 3-Дневная Свадьба (Франция)'
)
ru_partner = re.sub(r'<div class="footer-strip">[\s\S]*?</div>\s*</div>\s*</div>\s*</body>', ru_footer + '\n  </div>\n</body>', ru_partner)

with open(ru_partner_path, 'w', encoding='utf-8') as f:
    f.write(ru_partner)
print("✓ Updated dorogo_wedding_partner_rate_card_ru.html")

# -------------------------------------------------------------
# 3. PROCESS ITALIAN CLIENT & PARTNER RATE CARDS
# -------------------------------------------------------------
it_standby_grid = """    <div class="standby-grid">
      <div class="standby-card">
        <div class="standby-title">Navette Notturne Dedicate (23:00–03:00)</div>
        <div class="standby-desc">
          <strong>100% Tutto Incluso a Tariffa Fissa:</strong><br>
          &bull; <strong>Mercedes V-Class (7p):</strong> <strong>&euro;450 netto a forfait</strong><br>
          &bull; <strong>Executive Minibus (19p):</strong> <strong>&euro;650 netto a forfait</strong><br>
          &bull; <strong>Executive Midibus (30p):</strong> <strong>&euro;850 netto a forfait</strong><br>
          Servizio continuativo villa &harr; hotel. Notturno autista, carburante e qualsiasi tragitto breve inclusi.
        </div>
      </div>
      <div class="standby-card">
        <div class="standby-title">Ore Straordinarie e Supplementi</div>
        <div class="standby-desc">
          &bull; <strong>Transfer Notturni (22:00–06:00):</strong> Flat +20% sulla tariffa base (quotato in fattura).<br>
          &bull; <strong>Straordinari Disposizione:</strong> Tariffa oraria base + 25% oltre l'orario concordato.<br>
          &bull; <strong>Chilometraggio 10h:</strong> 200 km inclusi; km eccedenti a &euro;2.50/km.
        </div>
      </div>
      <div class="standby-card">
        <div class="standby-title">Accesso alle Ville Storiche e Bagagli</div>
        <div class="standby-desc">
          &bull; <strong>Accesso ai Cancelli Storici:</strong> I van V-Class accedono agevolmente ai cancelli stretti (Balbiano, Pizzo). I bus 50 pax si sincronizzano con i minibus 19 pax per l'ultimo miglio.<br>
          &bull; <strong>Van Supporto Bagagli:</strong> Mercedes Vito Cargo dedicato a <strong>&euro;240 netto a forfait</strong> per abiti da cerimonia e bagagli ingombranti.
        </div>
      </div>
    </div>"""

it_footer = """    <div class="footer-strip">
      <div class="terms-col">
        <div class="terms-title">Termini di Prenotazione &amp; Centrale Operativa</div>
        <div class="terms-text">
          &bull; <strong>Acconto di Prenotazione:</strong> Il 40% all'ordine blocca la flotta; saldo a 14 giorni dall'evento.<br>
          &bull; <strong>Politica di Cancellazione:</strong> Riprogrammazione gratuita &gt;14 giorni. Entro 14 giorni: penale 100%.<br>
          &bull; <strong>Standard della Flotta:</strong> Flotta NCC total black, 100% unbranded, autisti in abito scuro parlanti inglese.<br>
          &bull; <strong>Servizi Inclusi:</strong> Dispatcher dedicato su WhatsApp, monitoraggio voli in tempo reale e Portale Transfer Ospiti inclusi.
        </div>
      </div>
      <div class="dispatch-col">
        <div class="dispatch-lead">Dmitri &bull; DOROGO Private Transfers</div>
        <div class="dispatch-contact">
          Contatto Diretto &amp; WhatsApp: <a href="https://wa.me/393780940554" target="_blank" class="wa-link" title="Apri WhatsApp"><svg class="wa-icon" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg><strong>+39 378 094 0554</strong></a><br>
          Ufficio Dispatch: <strong>dmitri@dorogo.eu</strong> &bull; <strong>booking@dorogo.eu</strong><br>
          Lago di Como &bull; Toscana &bull; Venezia &bull; Milano &bull; <strong>dorogo.eu/weddings</strong>
        </div>
      </div>
    </div>"""

for fname in ['dorogo_wedding_client_rate_card_it.html', 'dorogo_wedding_partner_rate_card_it.html']:
    fpath = os.path.join(BASE_DIR, fname)
    with open(fpath, 'r', encoding='utf-8') as f:
        it_c = f.read()
    it_c = clean_common_elements(it_c)
    it_c = re.sub(r'<div class="standby-grid">[\s\S]*?</div>\s*</div>\s*</div>', it_standby_grid, it_c)
    it_c = re.sub(r'<div class="footer-strip">[\s\S]*?</div>\s*</div>\s*</div>\s*</body>', it_footer + '\n  </div>\n</body>', it_c)
    it_c = it_c.replace('Cocrzt &bull; Matrimonio di 3 Giorni (Coppia Francese)', 'Cocrzt &bull; Matrimonio di 3 Giorni (Francia)')
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(it_c)
    print(f"✓ Updated {fname}")

# -------------------------------------------------------------
# 4. PROCESS ENGLISH CLIENT & PARTNER RATE CARDS
# -------------------------------------------------------------
en_standby_grid = """    <div class="standby-grid">
      <div class="standby-card">
        <div class="standby-title">Dedicated Night Shuttle Loops (23:00–03:00)</div>
        <div class="standby-desc">
          <strong>100% All-Inclusive Fixed Shuttles:</strong><br>
          &bull; <strong>Mercedes V-Class (7p):</strong> <strong>&euro;450 net flat</strong><br>
          &bull; <strong>Executive Minibus (19p):</strong> <strong>&euro;650 net flat</strong><br>
          &bull; <strong>Executive Midibus (30p):</strong> <strong>&euro;850 net flat</strong><br>
          Continuous villa &harr; hotel guest loops. Driver overnight allowance, fuel, and all micro-trips included.
        </div>
      </div>
      <div class="standby-card">
        <div class="standby-title">Overtime &amp; Surcharges Policy</div>
        <div class="standby-desc">
          &bull; <strong>Night Transfers (22:00–06:00):</strong> Flat +20% on base route (quoted upfront).<br>
          &bull; <strong>Disposal Overtime:</strong> Base hourly rate + 25% beyond booked window.<br>
          &bull; <strong>10h Disposal Mileage:</strong> 200 km included; excess km billed at &euro;2.50/km.
        </div>
      </div>
      <div class="standby-card">
        <div class="standby-title">Historic Villa Gate Access &amp; Luggage</div>
        <div class="standby-desc">
          &bull; <strong>Historic Gate Access:</strong> V-Class vans clear narrow gates (Balbiano, Pizzo). 50p coaches synchronize with 19p minibuses for final-mile access.<br>
          &bull; <strong>Baggage Support Van:</strong> Mercedes Vito Cargo van at <strong>&euro;240 net flat</strong> for formal attire and overseas luggage.
        </div>
      </div>
    </div>"""

en_footer = """    <div class="footer-strip">
      <div class="terms-col">
        <div class="terms-title">Booking Terms &amp; Dispatch Protocol</div>
        <div class="terms-text">
          &bull; <strong>Booking Deposit:</strong> 40% deposit secures fleet on dispatch schedule; balance due 14 days prior.<br>
          &bull; <strong>Cancellation Policy:</strong> Free reschedule &gt;14 days. Inside 14 days: 100% cancellation penalty.<br>
          &bull; <strong>Fleet Integrity:</strong> All-black, unbranded NCC fleet with dark-suited English-speaking chauffeurs.<br>
          &bull; <strong>Included Services:</strong> Dedicated WhatsApp dispatch desk, live flight tracking, and Guest Transfer Portal included free.
        </div>
      </div>
      <div class="dispatch-col">
        <div class="dispatch-lead">Dmitri &bull; DOROGO Private Transfers</div>
        <div class="dispatch-contact">
          Direct &amp; WhatsApp: <a href="https://wa.me/393780940554" target="_blank" class="wa-link" title="Open WhatsApp Chat"><svg class="wa-icon" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg><strong>+39 378 094 0554</strong></a><br>
          Dispatch Desk: <strong>dmitri@dorogo.eu</strong> &bull; <strong>booking@dorogo.eu</strong><br>
          Lake Como &bull; Tuscany &bull; Venice &bull; Milan &bull; <strong>dorogo.eu/weddings</strong>
        </div>
      </div>
    </div>"""

for fname in ['dorogo_wedding_client_rate_card_en.html', 'dorogo_wedding_partner_rate_card.html']:
    fpath = os.path.join(BASE_DIR, fname)
    with open(fpath, 'r', encoding='utf-8') as f:
        en_c = f.read()
    en_c = clean_common_elements(en_c)
    en_c = re.sub(r'<div class="standby-grid">[\s\S]*?</div>\s*</div>\s*</div>', en_standby_grid, en_c)
    en_c = re.sub(r'<div class="footer-strip">[\s\S]*?</div>\s*</div>\s*</div>\s*</body>', en_footer + '\n  </div>\n</body>', en_c)
    en_c = en_c.replace('Cocrzt &bull; 3-Day Wedding (French Couple)', 'Cocrzt &bull; 3-Day Wedding (France)')
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(en_c)
    print(f"✓ Updated {fname}")

