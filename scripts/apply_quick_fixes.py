import re
import os
import glob
import subprocess
import pymupdf

BASE_DIR = '/Users/User/Downloads/Wedding-planners-outreach'
DOWNLOADS_DIR = '/Users/User/Downloads'
BRAIN_DIR = '/Users/User/.gemini/antigravity/brain/fd114c0c-04b2-4991-9b4c-0a3573ed8beb'
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

html_files = sorted(glob.glob(os.path.join(BASE_DIR, 'dorogo_wedding_*.html')))

for fpath in html_files:
    fname = os.path.basename(fpath)
    with open(fpath, 'r', encoding='utf-8') as f:
        c = f.read()
    
    # 1. Remove 5 just leave the stars
    c = c.replace('&#9733;&#9733;&#9733;&#9733;&#9733; 5', '&#9733;&#9733;&#9733;&#9733;&#9733;')
    c = c.replace('★★★★★ 5', '★★★★★')
    
    # 2. Website: dorogo.eu and not with weddings
    c = c.replace('dorogo.eu/weddings', 'dorogo.eu')
    c = re.sub(r'https?://(?:www\.)?dorogo\.eu/weddings/?', 'https://dorogo.eu/', c)
    # in case there is a link
    c = c.replace('>dorogo.eu/weddings<', '>dorogo.eu<')
    
    # 3. Remove text under dorogo completely (<div class="brand-sub">...</div>)
    c = re.sub(r'\s*<div class="brand-sub">[^<]+</div>', '', c)
    
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f"✓ Updated {fname}")

