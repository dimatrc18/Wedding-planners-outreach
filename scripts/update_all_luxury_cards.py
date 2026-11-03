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

print("CSS rules ready.")
