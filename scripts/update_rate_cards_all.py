import subprocess
import pymupdf
import re
import os
import shutil

BASE_DIR = '/Users/User/Downloads/Wedding-planners-outreach'
DOWNLOADS_DIR = '/Users/User/Downloads'
BRAIN_DIR = '/Users/User/.gemini/antigravity/brain/fd114c0c-04b2-4991-9b4c-0a3573ed8beb'
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

def update_html_en(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Brand Sub / Regions
    content = re.sub(
        r'Private Chauffeur &amp; Group Mobility • [^<]+',
        'Private Chauffeur &amp; Group Mobility • Lake Como, Tuscany, Venice, Milan &amp; Northern Italy',
        content
    )
    content = re.sub(
        r'<span class="section-sub">Lake Como Curated Wedding Mobility</span>',
        '<span class="section-sub">Lake Como, Tuscany &amp; Venice Curated Wedding Mobility</span>',
        content
    )

    # E-Class
    content = re.sub(
        r'(<span class="car-title">Mercedes-Benz E-Class</span>[\s\S]*?<td class="num divider-col"><span class="rate-val">&euro;)850\.00(</span>)',
        r'\g<1>900.00\2',
        content
    )

    # V-Class
    content = re.sub(
        r'(<span class="car-title">Mercedes-Benz V-Class</span>[\s\S]*?<span class="rate-val">&euro;)95 / hr(</span><span class="rate-sub">4h min: &euro;)380(</span>)',
        r'\g<1>105 / hr\g<2>420\3',
        content
    )
    content = re.sub(
        r'(<span class="car-title">Mercedes-Benz V-Class</span>[\s\S]*?<td class="num divider-col"><span class="rate-val">&euro;)880\.00(</span>)',
        r'\g<1>1,050.00\2',
        content
    )

    # S-Class
    content = re.sub(
        r'(<span class="car-title">Mercedes-Benz S-Class</span>[\s\S]*?<strong>&euro;7\.00 / km</strong><span class="rate-sub">Min\. &euro;)200(</span>)',
        r'\g<1>220\2',
        content
    )
    content = re.sub(
        r'(<span class="car-title">Mercedes-Benz S-Class</span>[\s\S]*?<span class="rate-val">&euro;)180 / hr(</span><span class="rate-sub">4h min: &euro;)720(</span>)',
        r'\g<1>150 / hr\g<2>600\3',
        content
    )
    content = re.sub(
        r'(<span class="car-title">Mercedes-Benz S-Class</span>[\s\S]*?<td class="num divider-col"><span class="rate-val">&euro;)1,650\.00(</span>)',
        r'\g<1>1,500.00\2',
        content
    )

    # Executive Minibus 16–20p
    content = re.sub(
        r'(<span class="car-title">Executive Minibus 16–20p</span>[\s\S]*?<strong>&euro;)9\.80( / km</strong><span class="rate-sub">Min\. &euro;)350(</span>)',
        r'\g<1>11.60\g<2>420\3',
        content
    )
    content = re.sub(
        r'(<span class="car-title">Executive Minibus 16–20p</span>[\s\S]*?<span class="rate-val">&euro;)490\.00(</span>)',
        r'\g<1>580.00\2',
        content
    )
    content = re.sub(
        r'(<span class="car-title">Executive Minibus 16–20p</span>[\s\S]*?<span class="rate-val">&euro;)155 / hr(</span><span class="rate-sub">4h min: &euro;)620(</span>)',
        r'\g<1>145 / hr\g<2>580\3',
        content
    )
    content = re.sub(
        r'(<span class="car-title">Executive Minibus 16–20p</span>[\s\S]*?<td class="num divider-col"><span class="rate-val">&euro;)1,350\.00(</span><span class="rate-sub">)200 km incl\.(</span>)',
        r'\g<1>950.00\g<2>150 km incl.\3',
        content
    )

    # Executive Midibus 28–30p
    content = re.sub(
        r'(<span class="car-title">Executive Midibus 28–30p</span>[\s\S]*?<strong>&euro;)11\.80( / km</strong><span class="rate-sub">Min\. &euro;)420(</span>)',
        r'\g<1>13.80\g<2>490\3',
        content
    )
    content = re.sub(
        r'(<span class="car-title">Executive Midibus 28–30p</span>[\s\S]*?<span class="rate-val">&euro;)590\.00(</span>)',
        r'\g<1>690.00\2',
        content
    )
    content = re.sub(
        r'(<span class="car-title">Executive Midibus 28–30p</span>[\s\S]*?<span class="rate-val">&euro;)170 / hr(</span><span class="rate-sub">4h min: &euro;)680(</span>)',
        r'\g<1>172.50 / hr\g<2>690\3',
        content
    )
    content = re.sub(
        r'(<span class="car-title">Executive Midibus 28–30p</span>[\s\S]*?<td class="num divider-col"><span class="rate-val">&euro;)1,450\.00(</span><span class="rate-sub">)200 km incl\.(</span>)',
        r'\g<1>1,080.00\g<2>150 km incl.\3',
        content
    )

    # Grand Turismo Coach 50–55p
    content = re.sub(
        r'(<span class="car-title">Grand Turismo Coach 50–55p</span>[\s\S]*?<strong>&euro;)14\.40( / km</strong><span class="rate-sub">Min\. &euro;)500(</span>)',
        r'\g<1>15.60\g<2>550\3',
        content
    )
    content = re.sub(
        r'(<span class="car-title">Grand Turismo Coach 50–55p</span>[\s\S]*?<span class="rate-val">&euro;)720\.00(</span>)',
        r'\g<1>780.00\2',
        content
    )
    content = re.sub(
        r'(<span class="car-title">Grand Turismo Coach 50–55p</span>[\s\S]*?<span class="rate-val">&euro;)195 / hr(</span><span class="rate-sub">4h min: &euro;)780(</span>)',
        r'\g<1>205 / hr\g<2>820\3',
        content
    )
    content = re.sub(
        r'(<span class="car-title">Grand Turismo Coach 50–55p</span>[\s\S]*?<td class="num divider-col"><span class="rate-val">&euro;)1,550\.00(</span><span class="rate-sub">)200 km incl\.(</span>)',
        r'\g<1>1,200.00\g<2>150 km incl.\3',
        content
    )

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✓ Updated {path}")


def update_html_it(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Brand Sub / Regions
    content = re.sub(
        r'Chauffeur Privato &amp; Mobilit&agrave; di Gruppo • [^<]+',
        'Chauffeur Privato &amp; Mobilit&agrave; di Gruppo • Lago di Como, Toscana, Venezia, Milano &amp; Nord Italia',
        content
    )
    content = re.sub(
        r'<span class="section-sub">Mobilit&agrave; Nuziale Esclusiva Lago di Como</span>',
        '<span class="section-sub">Lago di Como, Toscana &amp; Venezia &bull; Mobilit&agrave; Nuziale Esclusiva</span>',
        content
    )

    # E-Class
    content = re.sub(
        r'(<span class="car-title">Mercedes-Benz E-Class</span>[\s\S]*?<td class="num divider-col"><span class="rate-val">&euro;)850\.00(</span>)',
        r'\g<1>900.00\2',
        content
    )

    # V-Class
    content = re.sub(
        r'(<span class="car-title">Mercedes-Benz V-Class</span>[\s\S]*?<span class="rate-val">&euro;)95 / hr(</span><span class="rate-sub">4h min: &euro;)380(</span>)',
        r'\g<1>105 / hr\g<2>420\3',
        content
    )
    content = re.sub(
        r'(<span class="car-title">Mercedes-Benz V-Class</span>[\s\S]*?<td class="num divider-col"><span class="rate-val">&euro;)880\.00(</span>)',
        r'\g<1>1,050.00\2',
        content
    )

    # S-Class
    content = re.sub(
        r'(<span class="car-title">Mercedes-Benz S-Class</span>[\s\S]*?<strong>&euro;7\.00 / km</strong><span class="rate-sub">Min\. &euro;)200(</span>)',
        r'\g<1>220\2',
        content
    )
    content = re.sub(
        r'(<span class="car-title">Mercedes-Benz S-Class</span>[\s\S]*?<span class="rate-val">&euro;)180 / hr(</span><span class="rate-sub">4h min: &euro;)720(</span>)',
        r'\g<1>150 / hr\g<2>600\3',
        content
    )
    content = re.sub(
        r'(<span class="car-title">Mercedes-Benz S-Class</span>[\s\S]*?<td class="num divider-col"><span class="rate-val">&euro;)1,650\.00(</span>)',
        r'\g<1>1,500.00\2',
        content
    )

    # Executive Minibus 16–20p
    content = re.sub(
        r'(<span class="car-title">Executive Minibus 16–20p</span>[\s\S]*?<strong>&euro;)9\.80( / km</strong><span class="rate-sub">Min\. &euro;)350(</span>)',
        r'\g<1>11.60\g<2>420\3',
        content
    )
    content = re.sub(
        r'(<span class="car-title">Executive Minibus 16–20p</span>[\s\S]*?<span class="rate-val">&euro;)490\.00(</span>)',
        r'\g<1>580.00\2',
        content
    )
    content = re.sub(
        r'(<span class="car-title">Executive Minibus 16–20p</span>[\s\S]*?<span class="rate-val">&euro;)155 / hr(</span><span class="rate-sub">4h min: &euro;)620(</span>)',
        r'\g<1>145 / hr\g<2>580\3',
        content
    )
    content = re.sub(
        r'(<span class="car-title">Executive Minibus 16–20p</span>[\s\S]*?<td class="num divider-col"><span class="rate-val">&euro;)1,350\.00(</span><span class="rate-sub">)200 km inclusi(</span>)',
        r'\g<1>950.00\g<2>150 km inclusi\3',
        content
    )

    # Executive Midibus 28–30p
    content = re.sub(
        r'(<span class="car-title">Executive Midibus 28–30p</span>[\s\S]*?<strong>&euro;)11\.80( / km</strong><span class="rate-sub">Min\. &euro;)420(</span>)',
        r'\g<1>13.80\g<2>490\3',
        content
    )
    content = re.sub(
        r'(<span class="car-title">Executive Midibus 28–30p</span>[\s\S]*?<span class="rate-val">&euro;)590\.00(</span>)',
        r'\g<1>690.00\2',
        content
    )
    content = re.sub(
        r'(<span class="car-title">Executive Midibus 28–30p</span>[\s\S]*?<span class="rate-val">&euro;)170 / hr(</span><span class="rate-sub">4h min: &euro;)680(</span>)',
        r'\g<1>172.50 / hr\g<2>690\3',
        content
    )
    content = re.sub(
        r'(<span class="car-title">Executive Midibus 28–30p</span>[\s\S]*?<td class="num divider-col"><span class="rate-val">&euro;)1,450\.00(</span><span class="rate-sub">)200 km inclusi(</span>)',
        r'\g<1>1,080.00\g<2>150 km inclusi\3',
        content
    )

    # Grand Turismo Coach 50–55p
    content = re.sub(
        r'(<span class="car-title">Grand Turismo Coach 50–55p</span>[\s\S]*?<strong>&euro;)14\.40( / km</strong><span class="rate-sub">Min\. &euro;)500(</span>)',
        r'\g<1>15.60\g<2>550\3',
        content
    )
    content = re.sub(
        r'(<span class="car-title">Grand Turismo Coach 50–55p</span>[\s\S]*?<span class="rate-val">&euro;)720\.00(</span>)',
        r'\g<1>780.00\2',
        content
    )
    content = re.sub(
        r'(<span class="car-title">Grand Turismo Coach 50–55p</span>[\s\S]*?<span class="rate-val">&euro;)195 / hr(</span><span class="rate-sub">4h min: &euro;)780(</span>)',
        r'\g<1>205 / hr\g<2>820\3',
        content
    )
    content = re.sub(
        r'(<span class="car-title">Grand Turismo Coach 50–55p</span>[\s\S]*?<td class="num divider-col"><span class="rate-val">&euro;)1,550\.00(</span><span class="rate-sub">)200 km inclusi(</span>)',
        r'\g<1>1,200.00\g<2>150 km inclusi\3',
        content
    )

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✓ Updated {path}")


def update_html_ru(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Brand Sub / Regions
    content = re.sub(
        r'Премиальные трансферы и групповая логистика • [^<]+',
        'Премиальные трансферы и групповая логистика • Озеро Комо, Тоскана, Венеция, Милан',
        content
    )
    content = re.sub(
        r'<span class="section-sub">Свадебная транспортная логистика на Озере Комо</span>',
        '<span class="section-sub">Озеро Комо, Тоскана и Венеция &bull; Свадебная мобильность</span>',
        content
    )

    # E-Class
    content = re.sub(
        r'(<span class="car-title">Mercedes-Benz E-Class</span>[\s\S]*?<td class="num divider-col"><span class="rate-val">&euro;)850\.00(</span>)',
        r'\g<1>900.00\2',
        content
    )

    # V-Class
    content = re.sub(
        r'(<span class="car-title">Mercedes-Benz V-Class</span>[\s\S]*?<span class="rate-val">&euro;)95 / ч(</span><span class="rate-sub">мин 4ч: &euro;)380(</span>)',
        r'\g<1>105 / ч\g<2>420\3',
        content
    )
    content = re.sub(
        r'(<span class="car-title">Mercedes-Benz V-Class</span>[\s\S]*?<td class="num divider-col"><span class="rate-val">&euro;)880\.00(</span>)',
        r'\g<1>1,050.00\2',
        content
    )

    # S-Class
    content = re.sub(
        r'(<span class="car-title">Mercedes-Benz S-Class</span>[\s\S]*?<strong>&euro;7\.00 / км</strong><span class="rate-sub">Мин\. &euro;)200(</span>)',
        r'\g<1>220\2',
        content
    )
    content = re.sub(
        r'(<span class="car-title">Mercedes-Benz S-Class</span>[\s\S]*?<span class="rate-val">&euro;)180 / ч(</span><span class="rate-sub">мин 4ч: &euro;)720(</span>)',
        r'\g<1>150 / ч\g<2>600\3',
        content
    )
    content = re.sub(
        r'(<span class="car-title">Mercedes-Benz S-Class</span>[\s\S]*?<td class="num divider-col"><span class="rate-val">&euro;)1,650\.00(</span>)',
        r'\g<1>1,500.00\2',
        content
    )

    # Executive Minibus 16–20p
    content = re.sub(
        r'(<span class="car-title">Executive Minibus 16–20p</span>[\s\S]*?<strong>&euro;)9\.80( / км</strong><span class="rate-sub">Мин\. &euro;)350(</span>)',
        r'\g<1>11.60\g<2>420\3',
        content
    )
    content = re.sub(
        r'(<span class="car-title">Executive Minibus 16–20p</span>[\s\S]*?<span class="rate-val">&euro;)490\.00(</span>)',
        r'\g<1>580.00\2',
        content
    )
    content = re.sub(
        r'(<span class="car-title">Executive Minibus 16–20p</span>[\s\S]*?<span class="rate-val">&euro;)155 / ч(</span><span class="rate-sub">мин 4ч: &euro;)620(</span>)',
        r'\g<1>145 / ч\g<2>580\3',
        content
    )
    content = re.sub(
        r'(<span class="car-title">Executive Minibus 16–20p</span>[\s\S]*?<td class="num divider-col"><span class="rate-val">&euro;)1,350\.00(</span><span class="rate-sub">)200 км вкл\.(</span>)',
        r'\g<1>950.00\g<2>150 км вкл.\3',
        content
    )

    # Executive Midibus 28–30p
    content = re.sub(
        r'(<span class="car-title">Executive Midibus 28–30p</span>[\s\S]*?<strong>&euro;)11\.80( / км</strong><span class="rate-sub">Мин\. &euro;)420(</span>)',
        r'\g<1>13.80\g<2>490\3',
        content
    )
    content = re.sub(
        r'(<span class="car-title">Executive Midibus 28–30p</span>[\s\S]*?<span class="rate-val">&euro;)590\.00(</span>)',
        r'\g<1>690.00\2',
        content
    )
    content = re.sub(
        r'(<span class="car-title">Executive Midibus 28–30p</span>[\s\S]*?<span class="rate-val">&euro;)170 / ч(</span><span class="rate-sub">мин 4ч: &euro;)680(</span>)',
        r'\g<1>172.50 / ч\g<2>690\3',
        content
    )
    content = re.sub(
        r'(<span class="car-title">Executive Midibus 28–30p</span>[\s\S]*?<td class="num divider-col"><span class="rate-val">&euro;)1,450\.00(</span><span class="rate-sub">)200 км вкл\.(</span>)',
        r'\g<1>1,080.00\g<2>150 км вкл.\3',
        content
    )

    # Grand Turismo Coach 50–55p
    content = re.sub(
        r'(<span class="car-title">Grand Turismo Coach 50–55p</span>[\s\S]*?<strong>&euro;)14\.40( / км</strong><span class="rate-sub">Мин\. &euro;)500(</span>)',
        r'\g<1>15.60\g<2>550\3',
        content
    )
    content = re.sub(
        r'(<span class="car-title">Grand Turismo Coach 50–55p</span>[\s\S]*?<span class="rate-val">&euro;)720\.00(</span>)',
        r'\g<1>780.00\2',
        content
    )
    content = re.sub(
        r'(<span class="car-title">Grand Turismo Coach 50–55p</span>[\s\S]*?<span class="rate-val">&euro;)195 / ч(</span><span class="rate-sub">мин 4ч: &euro;)780(</span>)',
        r'\g<1>205 / ч\g<2>820\3',
        content
    )
    content = re.sub(
        r'(<span class="car-title">Grand Turismo Coach 50–55p</span>[\s\S]*?<td class="num divider-col"><span class="rate-val">&euro;)1,550\.00(</span><span class="rate-sub">)200 км вкл\.(</span>)',
        r'\g<1>1,200.00\g<2>150 км вкл.\3',
        content
    )

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✓ Updated {path}")


def compile_pdfs():
    tasks = [
        # Partner Rate Cards
        ('dorogo_wedding_partner_rate_card.html', 'Dorogo_Wedding_Partner_Rate_Card_2026.pdf'),
        ('dorogo_wedding_partner_rate_card.html', 'Dorogo_Wedding_Partner_Rate_Card_2026_EN.pdf'),
        ('dorogo_wedding_partner_rate_card_it.html', 'Dorogo_Wedding_Partner_Rate_Card_2026_IT.pdf'),
        ('dorogo_wedding_partner_rate_card_ru.html', 'Dorogo_Wedding_Partner_Rate_Card_2026_RU.pdf'),
        # Client Tariffs
        ('dorogo_wedding_client_rate_card_en.html', 'Dorogo_Wedding_Client_Tariffs_2026.pdf'),
        ('dorogo_wedding_client_rate_card_en.html', 'Dorogo_Wedding_Client_Tariffs_2026_EN.pdf'),
        ('dorogo_wedding_client_rate_card_it.html', 'Dorogo_Wedding_Client_Tariffs_2026_IT.pdf'),
        ('dorogo_wedding_client_rate_card_ru.html', 'Dorogo_Wedding_Client_Tariffs_2026_RU.pdf'),
    ]

    for html_file, pdf_name in tasks:
        in_path = os.path.join(BASE_DIR, html_file)
        out_path = os.path.join(DOWNLOADS_DIR, pdf_name)

        cmd = [
            CHROME,
            '--headless=new',
            '--disable-gpu',
            '--no-pdf-header-footer',
            f'--print-to-pdf={out_path}',
            in_path
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode != 0:
            print(f"✗ Error compiling {pdf_name}:", res.stderr)
            continue

        doc = pymupdf.open(out_path)
        pcount = len(doc)
        print(f"✓ {pdf_name}: {pcount} page(s) ({os.path.getsize(out_path)} bytes)")
        if pcount > 1:
            print(f"  WARNING: {pdf_name} has {pcount} pages! Checking overflow...")
            p1 = doc[1]
            for b in p1.get_text('blocks'):
                print("    Overflow block:", repr(b[4].strip()))

        # Render preview png to brain dir
        preview_name = pdf_name.replace('.pdf', '_preview.png')
        preview_path = os.path.join(BRAIN_DIR, preview_name)
        page0 = doc[0]
        pix = page0.get_pixmap(dpi=150)
        pix.save(preview_path)

def main():
    print("Updating 6 Rate Card HTML files...")
    update_html_en(os.path.join(BASE_DIR, 'dorogo_wedding_partner_rate_card.html'))
    update_html_en(os.path.join(BASE_DIR, 'dorogo_wedding_client_rate_card_en.html'))

    update_html_it(os.path.join(BASE_DIR, 'dorogo_wedding_partner_rate_card_it.html'))
    update_html_it(os.path.join(BASE_DIR, 'dorogo_wedding_client_rate_card_it.html'))

    update_html_ru(os.path.join(BASE_DIR, 'dorogo_wedding_partner_rate_card_ru.html'))
    update_html_ru(os.path.join(BASE_DIR, 'dorogo_wedding_client_rate_card_ru.html'))

    print("\nCompiling all PDFs via Chrome...")
    compile_pdfs()
    print("\nAll files successfully updated and compiled!")

if __name__ == '__main__':
    main()
