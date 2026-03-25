import re
import os

file_path = os.path.abspath(r'C:\Users\User\Projects\projethexagon\gameplay\projet_hexagon_gdd_v6_0.html')

with open(file_path, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Extract the header (everything before the first <section>)
header_match = re.search(r'^(.*?)(\s*<!-- ============|    <section)', html, flags=re.DOTALL)
header = header_match.group(1)

# 2. Extract the footer (everything after the last </section>)
last_section_end = html.rfind('</section>')
if last_section_end != -1:
    footer = html[last_section_end + 10:]
else:
    footer = ""

# 3. Find all <section> tags
section_pattern = re.compile(r'(\s*<!-- ============ .*? ============ -->\s*<section class="section" id="([^"]+)">.*?</section>)', flags=re.DOTALL)
sections = section_pattern.findall(html)

section_dict = {}
for full_match, sec_id in sections:
    section_dict[sec_id] = full_match

# If 'defense' or 'roadmap' or 'antiragequit' or 'cohabitation' are not in section_dict, ignore them safely
# The user asked to merge Defense into Capture, but doing it correctly by placing it near Capture first.

pillars = {
    "1. Core Loop & Économie de Base": ["loop", "gems", "loot", "worldcycle", "balance"],
    "2. Conquête & Territoire": ["capture", "defense", "fortress", "siege", "hexjump", "antizerg"],
    "3. Personnalisation & Magie": ["badges", "dragon", "skins"],
    "4. Progression & Prestige": ["quests", "empreinte", "saisons"],
    "5. Engagement & Systèmes": ["modes", "retention", "coldstart", "anticheat"]
}

new_body = ""
nav_links = ""

for i, (pillar_title, sec_ids) in enumerate(pillars.items()):
    pillar_id = f"pillar{i+1}"
    nav_links += f'        <a href="#{pillar_id}">{pillar_title.split(". ")[1]}</a>\n'
    
    new_body += f'''
    <div class="pillar" id="{pillar_id}" style="margin: 5rem 0; padding: 2rem; background: rgba(255,255,255,0.02); border-left: 4px solid var(--primary-accent); border-radius: 12px;">
        <h1 style="color: var(--primary-accent); margin-bottom: 2rem; font-size: 2.2rem;">{pillar_title}</h1>
'''
    for sec_id in sec_ids:
        if sec_id in section_dict:
            new_body += section_dict[sec_id] + '\n    <div class="divider"></div>\n'
    
    new_body += "    </div>\n"

# 4. Update Header Nav links
# Find the <nav class="quick-nav"> container
header = re.sub(r'(<nav class="quick-nav">).*?(</nav>)', r'\1\n' + nav_links + r'    \2', header, flags=re.DOTALL)

final_html = header + new_body + footer

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(final_html)

print(f"Reorganized {len(section_dict)} sections into 5 Pillars.")
