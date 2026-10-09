import base64
import os
import subprocess

base_dir = '/Users/User/Downloads/Wedding-planners-outreach'
asset_dir = os.path.join(base_dir, 'deck_assets')

def to_b64(fname):
    p = os.path.join(asset_dir, fname)
    with open(p, 'rb') as f:
        return 'data:image/jpeg;base64,' + base64.b64encode(f.read()).decode('utf-8')

img_hero = to_b64('vclass_como.jpg')
img_sprinter = to_b64('sprinter_22.jpg')
img_coach = to_b64('coach_50.jpg')
img_boat = to_b64('vclass_boat.jpg')

html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DOROGO - Lake Como Wedding Partner Pitch Deck 2026/2027</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,400&display=swap');

  @page {{
    size: A4 portrait;
    margin: 0;
  }}

  * {{
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }}

  html, body {{
    margin: 0;
    padding: 0;
    width: 210mm;
    height: 297mm;
    max-height: 297mm;
    overflow: hidden;
    background: #ffffff;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    color: #18181b;
  }}

  .sheet {{
    width: 210mm;
    height: 297mm;
    padding: 7mm 9mm 6mm 9mm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
  }}

  /* Top Bar */
  .header {{
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-bottom: 2px solid #18181b;
    padding-bottom: 4px;
    margin-bottom: 5px;
  }}
  .brand-title {{
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 24px;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: #000000;
    line-height: 1;
    margin: 0;
    text-transform: uppercase;
  }}
  .brand-sub {{
    font-size: 7.5px;
    font-weight: 700;
    letter-spacing: 0.16em;
    color: #9B7D50;
    text-transform: uppercase;
    margin-top: 2px;
  }}
  .header-meta {{
    text-align: right;
    font-size: 7.5px;
    color: #52525b;
    line-height: 1.3;
  }}
  .badge-confidential {{
    display: inline-block;
    background: #18181b;
    color: #ffffff;
    font-size: 6.8px;
    font-weight: 700;
    letter-spacing: 0.1em;
    padding: 1.5px 5px;
    border-radius: 2px;
    text-transform: uppercase;
    margin-bottom: 2px;
  }}

  /* Hero Section: 2 Columns */
  .hero {{
    display: grid;
    grid-template-columns: 1.1fr 0.9fr;
    gap: 7px;
    background: #fafafa;
    border: 1px solid #e4e4e7;
    border-radius: 3px;
    padding: 6px;
    margin-bottom: 5px;
  }}
  .hero-visual {{
    position: relative;
    border-radius: 3px;
    overflow: hidden;
    height: 106px;
    background: #000;
  }}
  .hero-visual img {{
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }}
  .hero-caption {{
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(transparent, rgba(0,0,0,0.85));
    color: #ffffff;
    padding: 5px 7px 3px 7px;
    font-size: 7px;
    font-weight: 500;
  }}
  .hero-text {{
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 1px 3px;
  }}
  .hero-eyebrow {{
    font-size: 7.2px;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #9B7D50;
  }}
  .hero-heading {{
    font-family: 'Playfair Display', serif;
    font-size: 14px;
    line-height: 1.2;
    font-weight: 700;
    color: #09090b;
    margin: 2px 0 3px 0;
  }}
  .hero-desc {{
    font-size: 7.5px;
    line-height: 1.35;
    color: #3f3f46;
  }}
  .pillar-pills {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    margin-top: 4px;
  }}
  .pillar-pill {{
    background: #ffffff;
    border: 1px solid #e4e4e7;
    border-radius: 2px;
    padding: 2.5px 4.5px;
    font-size: 6.8px;
    line-height: 1.2;
  }}
  .pillar-pill strong {{
    color: #09090b;
    display: block;
    font-size: 7.2px;
  }}

  /* Section Title */
  .section-head {{
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    border-bottom: 1px solid #e4e4e7;
    padding-bottom: 2px;
    margin-top: 4px;
    margin-bottom: 4px;
  }}
  .section-title {{
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #09090b;
  }}
  .section-subtitle {{
    font-size: 6.8px;
    color: #9B7D50;
    font-weight: 600;
  }}

  /* Fleet Row */
  .fleet-row {{
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    margin-bottom: 5px;
  }}
  .fleet-card {{
    border: 1px solid #e4e4e7;
    border-radius: 3px;
    overflow: hidden;
    background: #ffffff;
    display: flex;
    flex-direction: column;
  }}
  .fleet-thumb {{
    height: 52px;
    width: 100%;
    object-fit: cover;
    display: block;
    background: #18181b;
  }}
  .fleet-info {{
    padding: 3.5px 5px;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }}
  .fleet-title-row {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1px;
  }}
  .fleet-name {{
    font-size: 8px;
    font-weight: 700;
    color: #09090b;
  }}
  .fleet-badge {{
    font-size: 6px;
    font-weight: 700;
    padding: 1px 3px;
    border-radius: 2px;
    background: #18181b;
    color: #ffffff;
    text-transform: uppercase;
  }}
  .fleet-badge.gold {{
    background: #9B7D50;
  }}
  .fleet-detail {{
    font-size: 6.8px;
    color: #52525b;
    line-height: 1.25;
  }}

  /* Core Service Pillars (Replaces Fixed Price Table) */
  .services-grid {{
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 5px;
    margin-bottom: 5px;
  }}
  .service-card {{
    border: 1px solid #e4e4e7;
    border-radius: 3px;
    padding: 5px 6px;
    background: #fafafa;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }}
  .service-card.highlight {{
    background: #fffcf8;
    border-color: #9B7D50;
  }}
  .service-header {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2px;
  }}
  .service-tag {{
    font-size: 6.2px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #9B7D50;
  }}
  .service-badge {{
    font-size: 6px;
    font-weight: 700;
    padding: 1px 3px;
    border-radius: 2px;
    background: #18181b;
    color: #ffffff;
    text-transform: uppercase;
  }}
  .service-title {{
    font-size: 8px;
    font-weight: 800;
    color: #09090b;
    margin-bottom: 2px;
    line-height: 1.2;
  }}
  .service-desc {{
    font-size: 6.8px;
    color: #3f3f46;
    line-height: 1.35;
  }}
  .service-desc strong {{
    color: #09090b;
  }}

  /* Operational Features & Partner Commercial Models */
  .grid-2col {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    margin-bottom: 5px;
  }}
  .panel-box {{
    border: 1px solid #e4e4e7;
    border-radius: 3px;
    padding: 4px 6px;
    background: #fafafa;
  }}
  .panel-box.featured {{
    border-color: #9B7D50;
    background: #fffcf8;
  }}
  .panel-title {{
    font-size: 7.5px;
    font-weight: 800;
    color: #09090b;
    margin-bottom: 1.5px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }}
  .panel-title.gold {{
    color: #9B7D50;
  }}
  .panel-text {{
    font-size: 6.8px;
    color: #3f3f46;
    line-height: 1.3;
  }}
  .panel-text strong {{
    color: #09090b;
  }}

  /* Verified Trustpilot Reviews */
  .reviews-row {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    margin-bottom: 5px;
  }}
  .review-card {{
    background: #fafafa;
    border: 1px solid #e4e4e7;
    border-left: 2.5px solid #9B7D50;
    border-radius: 2px;
    padding: 4px 6px;
  }}
  .review-quote {{
    font-size: 6.8px;
    line-height: 1.3;
    color: #27272a;
    font-style: italic;
    margin-bottom: 2px;
  }}
  .review-meta {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 6.5px;
    font-weight: 700;
    color: #52525b;
  }}
  .review-stars {{
    color: #00b67a;
    font-size: 7.5px;
    letter-spacing: 1px;
  }}

  /* Footer Strip */
  .footer {{
    background: #09090b;
    color: #ffffff;
    border-radius: 3px;
    padding: 5px 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }}
  .footer-terms {{
    font-size: 6.8px;
    line-height: 1.3;
    color: #a1a1aa;
    max-width: 60%;
  }}
  .footer-terms strong {{
    color: #ffffff;
  }}
  .footer-contacts {{
    text-align: right;
    font-size: 6.8px;
    line-height: 1.3;
    color: #d4d4d8;
  }}
  .footer-contacts strong {{
    color: #ffffff;
  }}
  .footer-lead {{
    font-weight: 800;
    color: #9B7D50;
    font-size: 7.2px;
    margin-bottom: 1px;
  }}
</style>
</head>
<body>

<div class="sheet">
  <!-- Top Bar -->
  <div class="header">
    <div>
      <div class="brand-title">DOROGO</div>
      <div class="brand-sub">Private Transportation &bull; Lake Como &bull; Milan</div>
    </div>
    <div class="header-meta">
      <span class="badge-confidential">Partner Deck 2026 / 2027</span><br>
      Confidential Partner Trade Overview &bull; Dedicated Wedding Concierge Desk
    </div>
  </div>

  <!-- Hero Section -->
  <div class="hero">
    <div class="hero-visual">
      <img src="{img_hero}" alt="Mercedes-Benz V-Class on Lake Como">
      <div class="hero-caption">Mercedes-Benz V-Class Fleet &bull; Grand Hotel Tremezzo Waterfront</div>
    </div>
    <div class="hero-text">
      <div>
        <div class="hero-eyebrow">Lake Como Wedding Transport Logistics</div>
        <div class="hero-heading">One Dedicated Fleet for Multi-Day Celebrations</div>
        <div class="hero-desc">
          High-end guest logistics connecting Milan Malpensa, Linate, and Lugano to private villas across Bellagio, Tremezzina, and Varenna. We eliminate lost guests and midnight dispatch stress for luxury wedding planners.
        </div>
      </div>
      <div class="pillar-pills">
        <div class="pillar-pill">
          <strong>Airport Arrival Waves</strong>
          Real-time flight radar tracking &amp; staged terminal pickups
        </div>
        <div class="pillar-pill">
          <strong>Narrow Villa Access</strong>
          Custom V-Class &amp; Sprinter routing for historic lakeside gates
        </div>
        <div class="pillar-pill">
          <strong>Continuous Night Loops</strong>
          Dedicated late-night return shuttles until the final guest is home
        </div>
        <div class="pillar-pill">
          <strong>Self-Service Guest Portal</strong>
          Live flight collection so no guest ever calls your phone
        </div>
      </div>
    </div>
  </div>

  <!-- Fleet Showcase -->
  <div class="section-head">
    <span class="section-title">1. Coordinated Wedding Fleet</span>
    <span class="section-subtitle">Staged Black-Car Fleet &bull; Professional English &amp; Italian Speaking Chauffeurs</span>
  </div>
  <div class="fleet-row">
    <div class="fleet-card">
      <img class="fleet-thumb" src="{img_boat}" alt="Mercedes-Benz V-Class &amp; Riva Boat Sync">
      <div class="fleet-info">
        <div class="fleet-title-row">
          <span class="fleet-name">Mercedes-Benz V-Class Extra-Long</span>
          <span class="fleet-badge gold">Primary Fleet</span>
        </div>
        <div class="fleet-detail">7 passengers &bull; Luggage capacity for long-haul gowns &bull; Synced with boat piers</div>
      </div>
    </div>
    <div class="fleet-card">
      <img class="fleet-thumb" src="{img_sprinter}" alt="Mercedes-Benz Sprinter">
      <div class="fleet-info">
        <div class="fleet-title-row">
          <span class="fleet-name">Executive Minibus (16-22 Seats)</span>
          <span class="fleet-badge">Villa Gates</span>
        </div>
        <div class="fleet-detail">Optimized for tight hairpin turns (Balbiano, Pizzo, Balbianello access roads)</div>
      </div>
    </div>
    <div class="fleet-card">
      <img class="fleet-thumb" src="{img_coach}" alt="Luxury Coach">
      <div class="fleet-info">
        <div class="fleet-title-row">
          <span class="fleet-name">Executive Coach (50 Seats)</span>
          <span class="fleet-badge">Large Groups</span>
        </div>
        <div class="fleet-detail">50 passengers &bull; Coordinated multi-vehicle convoys for 200+ guests</div>
      </div>
    </div>
  </div>

  <!-- Core Service Capabilities Pillars (Replacing Fixed Price Table) -->
  <div class="section-head">
    <span class="section-title">2. Core Wedding Transport Capabilities</span>
    <span class="section-subtitle">Tailored Turnkey Execution &bull; Confidential Net Rates or 5% Partner Commission Upon Itinerary</span>
  </div>
  <div class="services-grid">
    <div class="service-card highlight">
      <div>
        <div class="service-header">
          <span class="service-tag">Airport &amp; Inter-City Waves</span>
          <span class="service-badge">Flight Radar</span>
        </div>
        <div class="service-title">Coordinated Airport Transfers (MXP &bull; LIN &bull; BGY &bull; LUG)</div>
        <div class="service-desc">
          Automated live radar flight tracking with <strong>60 minutes complimentary wait time</strong>. Seamless greeting at arrival gates, luggage assistance for bridal apparel, and direct express routing to Lake Como hotels and private estates.
        </div>
      </div>
    </div>
    <div class="service-card">
      <div>
        <div class="service-header">
          <span class="service-tag">Lakeside Precision</span>
          <span class="service-badge">Pier Sync</span>
        </div>
        <div class="service-title">Narrow Villa Gate &amp; Boat Pier Synchronization</div>
        <div class="service-desc">
          Direct navigation through restricted ZTL zones, narrow lakeside lanes, and private villa alleys (Balbiano, Balbianello, Cassinella, Erba, Pizzo). Timed handoffs between vehicles and Venetian water taxis or private lake steamers.
        </div>
      </div>
    </div>
    <div class="service-card">
      <div>
        <div class="service-header">
          <span class="service-tag">Evening Security</span>
          <span class="service-badge">Continuous Standby</span>
        </div>
        <div class="service-title">Late-Night Villa Return Loops (Post-Reception)</div>
        <div class="service-desc">
          Guaranteed dedicated vehicles on standby from midnight to 5:00 AM. Solves Lake Como's acute night taxi shortage with scheduled or on-demand return loops shuttling guests safely back to their distributed hotels and Airbnbs.
        </div>
      </div>
    </div>
    <div class="service-card highlight">
      <div>
        <div class="service-header">
          <span class="service-tag">Zero Planner Stress</span>
          <span class="service-badge">Live Technology</span>
        </div>
        <div class="service-title">Guest Transfer Portal &amp; Dedicated WhatsApp Desk</div>
        <div class="service-desc">
          White-label guest booking portal where attendees submit their flights and hotel locations. One dedicated <strong>WhatsApp dispatcher desk</strong> monitors the entire weekend, ensuring zero lost guest calls to the planner.
        </div>
      </div>
    </div>
  </div>

  <!-- Operational Guarantees & Commercial Partnership Models -->
  <div class="grid-2col">
    <div class="panel-box">
      <div class="panel-title">Turnkey Itinerary Quoting &amp; Fleet Standby</div>
      <div class="panel-text">
        &bull; <strong>Custom Event Quotes:</strong> Tailored package proposals calculated per guest count, venue itinerary, and vehicle rotation.<br>
        &bull; <strong>Chauffeur at Disposal:</strong> Hourly standby for bridal party rehearsals, photo sessions, and lake excursions with premium Mercedes S-Class &amp; V-Class.
      </div>
    </div>
    <div class="panel-box featured">
      <div class="panel-title gold">Partner Commercial Models (Choose Per Wedding)</div>
      <div class="panel-text">
        &bull; <strong>Model A (Net Trade Rates):</strong> Confidential wholesale net rates provided for your client proposals with your agency markup. DOROGO operates as your white-label fleet.<br>
        &bull; <strong>Model B (5% Commission):</strong> DOROGO handles guest bookings &amp; billing directly via portal and remits <strong>5% partner commission</strong> to your agency.
      </div>
    </div>
  </div>

  <!-- Verified Trustpilot Reviews -->
  <div class="section-head">
    <span class="section-title">3. Verified Couple &amp; Planner Reviews</span>
    <span class="section-subtitle">Trustpilot Verified &bull; 5.0 / 5.0 Stars</span>
  </div>
  <div class="reviews-row">
    <div class="review-card">
      <div class="review-quote">
        &ldquo;DOROGO s’est occupé de la logistique des transports de nos invités pendant 3 jours avec une tranquillité d’esprit incroyable. Je n’ai reçu aucun message d’un invité me disant qu’il avait perdu sa voiture ou qu'il attendait. Même lorsque le vol de ma mère a été annulé, l’équipe a réorganisé son trajet sans même avoir besoin de nous appeler.&rdquo;
      </div>
      <div class="review-meta">
        <span>Cocrzt &bull; 3-Day Wedding (French Couple)</span>
        <span class="review-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
      </div>
    </div>
    <div class="review-card">
      <div class="review-quote">
        &ldquo;Multumiri enorme soferilor si coordonatorilor DOROGO in timpul nuntii de la Como. Am avut 70 de invitati si ne-au pus la dispozitie 12 microbuze clasa V timp de 2 zile la dispozitia oaspetilor nostri. 5/5 stele pentru organizare, profesionalismul soferilor si flexibilitate.&rdquo;
      </div>
      <div class="review-meta">
        <span>Claudia C. &bull; Lake Como Wedding (70 Guests)</span>
        <span class="review-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
      </div>
    </div>
  </div>

  <!-- Footer Strip -->
  <div class="footer">
    <div class="footer-terms">
      <strong>Terms &amp; Guarantees:</strong> 25% deposit reserves dispatch calendar; balance due 7 days prior. Includes flight tracking, ZTL permits, Guest Transfer Portal, and dedicated WhatsApp coordinator desk.
    </div>
    <div class="footer-contacts">
      <div class="footer-lead">Dmitri &bull; DOROGO Private Transportation</div>
      Direct / WhatsApp Desk &bull; <strong>dmitri@dorogo.eu</strong><br>
      Desk: <strong>dorogo.eu/weddings</strong> &bull; Milan &bull; Lake Como
    </div>
  </div>
</div>

</body>
</html>
"""

out_html = os.path.join(base_dir, 'dorogo_luxury_pitch_deck.html')
with open(out_html, 'w') as f:
    f.write(html_content)

print("Generated HTML at:", out_html)
