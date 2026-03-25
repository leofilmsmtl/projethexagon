import re

file_path = r'C:/Users/User/Projects/projethexagon/gameplay/projet_hexagon_gdd_v6_0.html'
with open(file_path, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. REMOVE 'ROADMAP' SECTION
html = re.sub(r'    <!-- ============ ROADMAP ============ -->.*?<section class="section" id="roadmap">.*?</section>', '', html, flags=re.DOTALL)
html = re.sub(r'\s*<a href="#roadmap">.*?</a>', '', html)

# 2. REMOVE NAV LINKS THAT NO LONGER NEED TO BE TOP LEVEL
html = re.sub(r'\s*<a href="#defense">.*?</a>', '', html)

# 3. MERGE 'DEFENSE PAR NOTIFICATION' INTO 'CAPTURE'
# Extract defense section
match = re.search(r'    <!-- ============ DEFENSE PAR NOTIFICATION ============ -->.*?<section class="section" id="defense">(.*?)</section>', html, flags=re.DOTALL)
if match:
    defense_content = match.group(1)
    # Remove it from its original spot (with its divider)
    html = re.sub(r'    <!-- ============ DEFENSE PAR NOTIFICATION ============ -->.*?</section>\s*<div class="divider"></div>\s*', '', html, flags=re.DOTALL)
    # Inject it into Capture near the end
    injection_point = r'(<section class="section" id="capture">.*?)(    </section>)'
    
    defense_html = f'''
        <div class="divider" style="margin: 3rem 0; width: 50%; opacity: 0.2"></div>
        <div class="section-header">
            <div class="section-tag cyan">📱 Temps Réel</div>
            <h2>Défense par Notification (Mode Salon)</h2>
            <p class="subtitle">Répondre à une notif push pour bloquer un raid — forcer l'attaquant à REVENIR physiquement.</p>
        </div>
        {defense_content.split('<div class="section-header">')[1].split('</div>', 1)[1]}
'''
    html = re.sub(injection_point, r'\1' + defense_html + r'\2', html, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(html)
print("Transformation completed.")
