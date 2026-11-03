import re
import os
import subprocess
import pymupdf

BASE_DIR = '/Users/User/Downloads/Wedding-planners-outreach'
DOWNLOADS_DIR = '/Users/User/Downloads'
BRAIN_DIR = '/Users/User/.gemini/antigravity/brain/fd114c0c-04b2-4991-9b4c-0a3573ed8beb'
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

# Exact prices to apply across RU, IT, EN templates:
# E-Class: €3.00/km (Min €100) | MXP-Como: €150.00 | 4h: €90/hr (€360) | 10h: €900.00
# V-Class: €3.60/km (Min €120) | MXP-Como: €180.00 | 4h: €95/hr (€380) | 10h: €950.00
# S-Class: €5.00/km (Min €180) | MXP-Como: €250.00 | 4h: €180/hr (€720) | 10h: €1,800.00

def get_ru_rows():
    return """          <tr>
            <td>
              <span class="car-title">Mercedes-Benz E-Class (1–3 места)</span>
              <span class="car-sub">Бизнес-седан &bull; Багаж: 2 чемодана</span>
            </td>
            <td style="white-space:nowrap"><strong>&euro;3.00 / км</strong><span class="rate-sub">Мин. &euro;100</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;150.00</span><span class="rate-sub">Пример ~50 км</span></td>
            <td class="num"><span class="rate-val">&euro;90 / ч</span><span class="rate-sub">4 ч: &euro;360</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;900.00</span><span class="rate-sub">200 км вкл.</span></td>
            <td class="role-text"><strong>VIP-Гости &amp; Подрядчики:</strong> 1–2 пассажира (фотограф, стилист, ведущий). Свободный въезд в зоны ZTL.</td>
          </tr>
          <tr>
            <td>
              <span class="car-title">Mercedes-Benz V-Class (6–7 мест)</span>
              <span class="car-sub">Свадебный минивэн &bull; Багаж: 7 чемоданов</span>
            </td>
            <td style="white-space:nowrap"><strong>&euro;3.60 / км</strong><span class="rate-sub">Мин. &euro;120</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;180.00</span><span class="rate-sub">Пример ~50 км</span></td>
            <td class="num"><span class="rate-val">&euro;95 / ч</span><span class="rate-sub">4 ч: &euro;380</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;950.00</span><span class="rate-sub">200 км вкл.</span></td>
            <td class="role-text"><strong>Основной Шаттл:</strong> Развозка семьи, подружек невесты и гостей виллы. Ночные челночные рейсы.</td>
          </tr>
          <tr>
            <td>
              <span class="car-title">Mercedes-Benz S-Class (1–3 места)</span>
              <span class="car-sub">Флагманский седан &bull; Багаж: 2 чемодана</span>
            </td>
            <td style="white-space:nowrap"><strong>&euro;5.00 / км</strong><span class="rate-sub">Мин. &euro;180</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;250.00</span><span class="rate-sub">Пример ~50 км</span></td>
            <td class="num"><span class="rate-val">&euro;180 / ч</span><span class="rate-sub">4 ч: &euro;720</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;1,800.00</span><span class="rate-sub">200 км вкл.</span></td>
            <td class="role-text"><strong>Автомобиль Молодоженов:</strong> Главное авто жениха и невесты, фотосессии, просторный салон для платья.</td>
          </tr>
          <tr>
            <td>
              <span class="car-title">Executive Minibus (16–20 мест)</span>
              <span class="car-sub">Микроавтобус GT &bull; Багаж: до 20 мест</span>
            </td>
            <td style="white-space:nowrap"><strong>&euro;11.60 / км</strong><span class="rate-sub">Мин. &euro;420</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;580.00</span><span class="rate-sub">+ &euro;30 парк.</span></td>
            <td class="num"><span class="rate-val">&euro;145 / ч</span><span class="rate-sub">4 ч: &euro;580</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;950.00</span><span class="rate-sub">150 км вкл.</span></td>
            <td class="role-text"><strong>Узкие Серпантины:</strong> Для 10–20 гостей. Незаменим на набережных Комо, куда не проедет большой автобус.</td>
          </tr>
          <tr>
            <td>
              <span class="car-title">Executive Midibus (28–30 мест)</span>
              <span class="car-sub">Мидибус GT &bull; Вместительный багажник</span>
            </td>
            <td style="white-space:nowrap"><strong>&euro;13.80 / км</strong><span class="rate-sub">Мин. &euro;490</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;690.00</span><span class="rate-sub">+ &euro;30 парк.</span></td>
            <td class="num"><span class="rate-val">&euro;172.50 / ч</span><span class="rate-sub">4 ч: &euro;690</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;1,080.00</span><span class="rate-sub">150 км вкл.</span></td>
            <td class="role-text"><strong>Средние Группы:</strong> Для 20–30 гостей на pre-wedding ужины. Сочетает вместимость с маневренностью.</td>
          </tr>
          <tr>
            <td>
              <span class="car-title">Grand Turismo Coach (50–55 мест)</span>
              <span class="car-sub">Лайнер Gran Turismo &bull; Багажный отсек 50+</span>
            </td>
            <td style="white-space:nowrap"><strong>&euro;15.60 / км</strong><span class="rate-sub">Мин. &euro;550</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;780.00</span><span class="rate-sub">+ &euro;30 парк.</span></td>
            <td class="num"><span class="rate-val">&euro;205 / ч</span><span class="rate-sub">4 ч: &euro;820</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;1,200.00</span><span class="rate-sub">150 км вкл.</span></td>
            <td class="role-text"><strong>Магистральные Рейсы:</strong> Прямой трансфер групп 50+ гостей из аэропортов Милана к отелям и пирсам.</td>
          </tr>"""

def get_it_rows():
    return """          <tr>
            <td>
              <span class="car-title">Mercedes-Benz E-Class (1–3 posti)</span>
              <span class="car-sub">Berlina Executive &bull; Bagagli: 2 valigie</span>
            </td>
            <td style="white-space:nowrap"><strong>&euro;3.00 / km</strong><span class="rate-sub">Min. &euro;100</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;150.00</span><span class="rate-sub">Esempio tratta ~50 km</span></td>
            <td class="num"><span class="rate-val">&euro;90 / hr</span><span class="rate-sub">4h min: &euro;360</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;900.00</span><span class="rate-sub">200 km inclusi</span></td>
            <td class="role-text"><strong>VIP &amp; Fornitori:</strong> 1–2 passeggeri (foto, stylist, celebrante). Accesso libero ZTL.</td>
          </tr>
          <tr>
            <td>
              <span class="car-title">Mercedes-Benz V-Class (6–7 posti)</span>
              <span class="car-sub">Navetta Ville &bull; Bagagli: 7 valigie</span>
            </td>
            <td style="white-space:nowrap"><strong>&euro;3.60 / km</strong><span class="rate-sub">Min. &euro;120</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;180.00</span><span class="rate-sub">Esempio tratta ~50 km</span></td>
            <td class="num"><span class="rate-val">&euro;95 / hr</span><span class="rate-sub">4h min: &euro;380</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;950.00</span><span class="rate-sub">200 km inclusi</span></td>
            <td class="role-text"><strong>Navetta Principale:</strong> Famiglie, damigelle e ospiti. Spole continue fino a notte.</td>
          </tr>
          <tr>
            <td>
              <span class="car-title">Mercedes-Benz S-Class (1–3 posti)</span>
              <span class="car-sub">Ammiraglia Sposi &bull; Bagagli: 2 valigie</span>
            </td>
            <td style="white-space:nowrap"><strong>&euro;5.00 / km</strong><span class="rate-sub">Min. &euro;180</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;250.00</span><span class="rate-sub">Esempio tratta ~50 km</span></td>
            <td class="num"><span class="rate-val">&euro;180 / hr</span><span class="rate-sub">4h min: &euro;720</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;1,800.00</span><span class="rate-sub">200 km inclusi</span></td>
            <td class="role-text"><strong>Ammiraglia Sposi:</strong> Auto d'onore e shooting. Massimo comfort per l'abito.</td>
          </tr>
          <tr>
            <td>
              <span class="car-title">Executive Minibus (16–20 posti)</span>
              <span class="car-sub">Minibus GT Executive &bull; Fino a 20 valigie</span>
            </td>
            <td style="white-space:nowrap"><strong>&euro;11.60 / km</strong><span class="rate-sub">Min. &euro;420</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;580.00</span><span class="rate-sub">+ &euro;30/h parking</span></td>
            <td class="num"><span class="rate-val">&euro;145 / hr</span><span class="rate-sub">4h min: &euro;580</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;950.00</span><span class="rate-sub">150 km inclusi</span></td>
            <td class="role-text"><strong>Strade del Lago:</strong> 10–20 ospiti. Maneggevole dove i grandi bus non passano.</td>
          </tr>
          <tr>
            <td>
              <span class="car-title">Executive Midibus (28–30 posti)</span>
              <span class="car-sub">Midibus GT Executive &bull; Ampia stiva bagagli</span>
            </td>
            <td style="white-space:nowrap"><strong>&euro;13.80 / km</strong><span class="rate-sub">Min. &euro;490</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;690.00</span><span class="rate-sub">+ &euro;30/h parking</span></td>
            <td class="num"><span class="rate-val">&euro;172.50 / hr</span><span class="rate-sub">4h min: &euro;690</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;1,080.00</span><span class="rate-sub">150 km inclusi</span></td>
            <td class="role-text"><strong>Gruppi Medi:</strong> 20–30 ospiti per cene nozze. Perfetto tra capienza e agilità.</td>
          </tr>
          <tr>
            <td>
              <span class="car-title">Grand Turismo Coach (50–55 posti)</span>
              <span class="car-sub">Coach Gran Turismo &bull; Bagagliaio passante 50+</span>
            </td>
            <td style="white-space:nowrap"><strong>&euro;15.60 / km</strong><span class="rate-sub">Min. &euro;550</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;780.00</span><span class="rate-sub">+ &euro;30/h parking</span></td>
            <td class="num"><span class="rate-val">&euro;205 / hr</span><span class="rate-sub">4h min: &euro;820</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;1,200.00</span><span class="rate-sub">150 km inclusi</span></td>
            <td class="role-text"><strong>Grandi Gruppi:</strong> 50+ ospiti diretti da Malpensa a hotel e pontili del lago.</td>
          </tr>"""

def get_en_rows():
    return """          <tr>
            <td>
              <span class="car-title">Mercedes-Benz E-Class (1–3 Seats)</span>
              <span class="car-sub">Executive Sedan &bull; Luggage: 2 large bags</span>
            </td>
            <td style="white-space:nowrap"><strong>&euro;3.00 / km</strong><span class="rate-sub">Min. &euro;100</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;150.00</span><span class="rate-sub">Example ~50 km route</span></td>
            <td class="num"><span class="rate-val">&euro;90 / hr</span><span class="rate-sub">4h min: &euro;360</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;900.00</span><span class="rate-sub">200 km incl.</span></td>
            <td class="role-text"><strong>Solo VIPs &amp; Vendors:</strong> 1–2 passengers (photographer, stylist, celebrant). Unrestricted ZTL access.</td>
          </tr>
          <tr>
            <td>
              <span class="car-title">Mercedes-Benz V-Class (6–7 Seats)</span>
              <span class="car-sub">Primary Villa Shuttle &bull; Luggage: 7 bags</span>
            </td>
            <td style="white-space:nowrap"><strong>&euro;3.60 / km</strong><span class="rate-sub">Min. &euro;120</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;180.00</span><span class="rate-sub">Example ~50 km route</span></td>
            <td class="num"><span class="rate-val">&euro;95 / hr</span><span class="rate-sub">4h min: &euro;380</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;950.00</span><span class="rate-sub">200 km incl.</span></td>
            <td class="role-text"><strong>Core Wedding Shuttle:</strong> Wedding party, family, and guest villa loops. Fits narrow historic gates.</td>
          </tr>
          <tr>
            <td>
              <span class="car-title">Mercedes-Benz S-Class (1–3 Seats)</span>
              <span class="car-sub">Bridal Flagship Sedan &bull; Luggage: 2 bags</span>
            </td>
            <td style="white-space:nowrap"><strong>&euro;5.00 / km</strong><span class="rate-sub">Min. &euro;180</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;250.00</span><span class="rate-sub">Example ~50 km route</span></td>
            <td class="num"><span class="rate-val">&euro;180 / hr</span><span class="rate-sub">4h min: &euro;720</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;1,800.00</span><span class="rate-sub">200 km incl.</span></td>
            <td class="role-text"><strong>Bride &amp; Groom Flagship:</strong> Grand ceremonial arrival and photo shoots. Extra rear cabin legroom for gowns.</td>
          </tr>
          <tr>
            <td>
              <span class="car-title">Executive Minibus (16–20 Seats)</span>
              <span class="car-sub">Executive Minibus GT &bull; Luggage: up to 20 bags</span>
            </td>
            <td style="white-space:nowrap"><strong>&euro;11.60 / km</strong><span class="rate-sub">Min. &euro;420</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;580.00</span><span class="rate-sub">+ &euro;30/h parking</span></td>
            <td class="num"><span class="rate-val">&euro;145 / hr</span><span class="rate-sub">4h min: &euro;580</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;950.00</span><span class="rate-sub">150 km incl.</span></td>
            <td class="role-text"><strong>Tight Lakeside Roads:</strong> 10–20 guests. Navigates narrow lake roads where 50p coaches cannot go.</td>
          </tr>
          <tr>
            <td>
              <span class="car-title">Executive Midibus (28–30 Seats)</span>
              <span class="car-sub">Executive Midibus GT &bull; Underfloor luggage bays</span>
            </td>
            <td style="white-space:nowrap"><strong>&euro;13.80 / km</strong><span class="rate-sub">Min. &euro;490</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;690.00</span><span class="rate-sub">+ &euro;30/h parking</span></td>
            <td class="num"><span class="rate-val">&euro;172.50 / hr</span><span class="rate-sub">4h min: &euro;690</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;1,080.00</span><span class="rate-sub">150 km incl.</span></td>
            <td class="role-text"><strong>Medium Groups:</strong> 20–30 guests for rehearsal dinners. Ideal balance of capacity and agility.</td>
          </tr>
          <tr>
            <td>
              <span class="car-title">Grand Turismo Coach (50–55 Seats)</span>
              <span class="car-sub">Grand Turismo Coach &bull; Full pass-through hold</span>
            </td>
            <td style="white-space:nowrap"><strong>&euro;15.60 / km</strong><span class="rate-sub">Min. &euro;550</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;780.00</span><span class="rate-sub">+ &euro;30/h parking</span></td>
            <td class="num"><span class="rate-val">&euro;205 / hr</span><span class="rate-sub">4h min: &euro;820</span></td>
            <td class="num divider-col"><span class="rate-val">&euro;1,200.00</span><span class="rate-sub">150 km incl.</span></td>
            <td class="role-text"><strong>Mass Airport Trunk Line:</strong> 50+ guests from Milan airports direct to central hotels and boat piers.</td>
          </tr>"""

def update_file(filename, rows_html):
    fpath = os.path.join(BASE_DIR, filename)
    with open(fpath, 'r', encoding='utf-8') as f:
        c = f.read()

    c = re.sub(r'<tbody>[\s\S]*?</tbody>', f'<tbody>\n{rows_html}\n        </tbody>', c)

    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f"Updated {filename}")

update_file('dorogo_wedding_client_rate_card_ru.html', get_ru_rows())
update_file('dorogo_wedding_partner_rate_card_ru.html', get_ru_rows())
update_file('dorogo_wedding_client_rate_card_it.html', get_it_rows())
update_file('dorogo_wedding_partner_rate_card_it.html', get_it_rows())
update_file('dorogo_wedding_client_rate_card_en.html', get_en_rows())
update_file('dorogo_wedding_partner_rate_card.html', get_en_rows())

print("\nSuccessfully updated all 6 templates!")
