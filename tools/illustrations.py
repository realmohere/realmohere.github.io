"""Line illustrations used as project previews until real screenshots or photos are added.
Run: python3 tools/illustrations.py  (writes projects/img/<slug>.svg)"""
import os
OUT = os.path.join(os.path.dirname(__file__), '..', 'projects', 'img')
F, L, T, P, BG = '#183D30', '#78916B', '#BA7355', '#20251F', '#ECE6D8'
def svg(body):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
<rect width="800" height="450" fill="{BG}"/>
<g fill="none" stroke="{F}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
<path d="M60 380H740" stroke="{L}" stroke-width="1.5" opacity=".6"/>
{body}
</g></svg>'''
art = {}
art['hydrogen-prototype'] = '''
<path d="M250 150h300v220a20 20 0 0 1-20 20H270a20 20 0 0 1-20-20z" opacity=".9"/>
<path d="M250 210h300" stroke="#78916B" stroke-width="2"/>
<rect x="330" y="120" width="26" height="230" rx="3" fill="#ECE6D8"/>
<rect x="444" y="120" width="26" height="230" rx="3" fill="#ECE6D8"/>
<path d="M343 120V92h114v28" stroke="#BA7355"/>
<g stroke="#78916B" stroke-width="2.5">
<circle cx="380" cy="320" r="7"/><circle cx="396" cy="282" r="5"/><circle cx="382" cy="246" r="8"/>
<circle cx="420" cy="300" r="6"/><circle cx="410" cy="262" r="4"/><circle cx="424" cy="230" r="6"/>
<circle cx="500" cy="300" r="5"/><circle cx="296" cy="290" r="5"/></g>
<path d="M457 92c60 0 90-30 150-30v120" /><rect x="580" y="182" width="54" height="80" rx="10"/>
<path d="M592 200h30" stroke="#BA7355"/>'''
art['research-assistant'] = '''
<path d="M140 120l150-30 160 30 170-30v250l-170 30-160-30-150 30z" opacity=".9"/>
<path d="M290 90v250M450 120v250" stroke="#78916B" stroke-width="2"/>
<g fill="#BA7355" stroke="none"><circle cx="220" cy="180" r="7"/><circle cx="360" cy="250" r="7"/><circle cx="530" cy="190" r="7"/><circle cx="580" cy="290" r="7"/><circle cx="250" cy="300" r="7"/></g>
<path d="M220 180L360 250L530 190" stroke="#78916B" stroke-width="2" stroke-dasharray="2 8"/>
<circle cx="470" cy="230" r="70" fill="#ECE6D8" fill-opacity=".55"/><path d="M520 280l70 70" stroke-width="7"/>
<g stroke="#20251F" stroke-width="2.5"><path d="M440 215h60M440 235h45M440 255h52"/></g>'''
art['zon-op-haarlemmermeer'] = '''
<circle cx="620" cy="110" r="38" stroke="#BA7355"/><g stroke="#BA7355" stroke-width="2.5"><path d="M620 48v-18M620 190v-18M558 110h-18M700 110h-18M576 66l-12-12M676 166l-12-12M664 66l12-12M564 166l12-12"/></g>
<path d="M120 380V250l170-90 170 90v130"/>
<path d="M170 236l120-64 120 64" stroke="#78916B" stroke-width="2"/>
<path d="M190 222l100-53 100 53v18H190z" fill="#ECE6D8"/>
<g stroke-width="2"><path d="M223 205v35M256 188v52M290 170v70M324 188v52M357 205v35M190 222h200"/></g>
<rect x="250" y="300" width="80" height="80"/>
<g stroke="#78916B" stroke-width="2.5"><circle cx="530" cy="330" r="13"/><path d="M510 380c0-25 40-25 40 0"/><circle cx="590" cy="330" r="13"/><path d="M570 380c0-25 40-25 40 0"/><circle cx="650" cy="330" r="13"/><path d="M630 380c0-25 40-25 40 0"/></g>'''
art['linear-to-circular-thesis'] = '''
<path d="M120 380V260h50v-60h40v60h40V180l60 40v-40l60 40v160" opacity=".9"/>
<path d="M190 200v-40" stroke="#78916B" stroke-width="2"/>
<path d="M430 230c40-110 220-110 250 0 30 110-150 160-220 80" stroke="#78916B" stroke-width="3.5"/>
<path d="M460 310l-14-24 30 4" stroke="#78916B" stroke-width="3.5"/>
<path d="M120 140h240" stroke="#BA7355" stroke-dasharray="1 0"/><path d="M345 128l18 12-18 12" stroke="#BA7355"/>
<path d="M556 236c-20-30 0-60 40-62 2 40-18 64-40 62zM556 236c10-18 22-30 34-40" />'''
art['personal-website'] = ''
art['meetout'] = '''
<path d="M180 330c80-120 180 40 260-60s180-40 200-110" stroke="#78916B" stroke-width="2.5" stroke-dasharray="2 10"/>
<g fill="#ECE6D8"><path d="M180 330c-30-36-30-70 0-70s30 34 0 70z"/><path d="M440 270c-30-36-30-70 0-70s30 34 0 70z"/><path d="M640 160c-30-36-30-70 0-70s30 34 0 70z"/></g>
<g fill="#BA7355" stroke="none"><circle cx="180" cy="285" r="7"/><circle cx="440" cy="225" r="7"/><circle cx="640" cy="115" r="7"/></g>
<path d="M240 160h120a14 14 0 0 1 14 14v40a14 14 0 0 1-14 14h-80l-26 20v-20h-14a14 14 0 0 1-14-14v-40a14 14 0 0 1 14-14z"/>
<g stroke="#78916B" stroke-width="2.5"><path d="M250 186h90M250 206h60"/></g>
<path d="M500 300h110a14 14 0 0 1 14 14v34a14 14 0 0 1-14 14h-14v18l-24-18h-72a14 14 0 0 1-14-14v-34a14 14 0 0 1 14-14z"/>'''
art['dogout'] = '''
<path d="M120 340c120-40 200 40 320 0s160-80 240-60" stroke="#78916B" stroke-width="2.5" stroke-dasharray="2 10"/>
<g fill="#ECE6D8">
<g transform="translate(200 250) rotate(-15)"><ellipse cx="0" cy="18" rx="22" ry="18"/><circle cx="-24" cy="-12" r="9"/><circle cx="-8" cy="-24" r="9"/><circle cx="10" cy="-24" r="9"/><circle cx="26" cy="-12" r="9"/></g>
<g transform="translate(360 180) rotate(10)"><ellipse cx="0" cy="18" rx="22" ry="18"/><circle cx="-24" cy="-12" r="9"/><circle cx="-8" cy="-24" r="9"/><circle cx="10" cy="-24" r="9"/><circle cx="26" cy="-12" r="9"/></g>
<g transform="translate(500 250) rotate(-8)"><ellipse cx="0" cy="18" rx="22" ry="18"/><circle cx="-24" cy="-12" r="9"/><circle cx="-8" cy="-24" r="9"/><circle cx="10" cy="-24" r="9"/><circle cx="26" cy="-12" r="9"/></g></g>
<circle cx="640" cy="200" r="34" stroke="#BA7355"/><path d="M610 186c20 10 40 10 60 0M610 214c20-10 40-10 60 0" stroke="#BA7355" stroke-width="2.5"/>'''
art['tend'] = '''
<rect x="250" y="70" width="300" height="300" rx="44"/>
<path d="M400 300v-80" stroke="#78916B" stroke-width="4"/>
<path d="M400 250c-10-40-50-50-80-40 10 34 40 50 80 40zM400 228c14-44 56-54 88-42-12 38-48 52-88 42z" fill="#ECE6D8" stroke="#78916B"/>
<ellipse cx="400" cy="310" rx="60" ry="12" stroke="#78916B" stroke-width="2"/>
<g stroke-width="2.5"><circle cx="385" cy="262" r="2"/><circle cx="415" cy="262" r="2"/></g>
<g><rect x="600" y="120" width="26" height="26" rx="6"/><path d="M606 133l6 6 10-12" stroke="#BA7355"/><path d="M640 133h70" stroke="#20251F" stroke-width="2"/>
<rect x="600" y="180" width="26" height="26" rx="6"/><path d="M606 193l6 6 10-12" stroke="#BA7355"/><path d="M640 193h56" stroke="#20251F" stroke-width="2"/>
<rect x="600" y="240" width="26" height="26" rx="6"/><path d="M640 253h64" stroke="#20251F" stroke-width="2"/></g>'''
art['ai-workflow-automation'] = '''
<g fill="#ECE6D8"><rect x="90" y="190" width="120" height="70" rx="14"/><rect x="280" y="120" width="120" height="70" rx="14"/><rect x="280" y="260" width="120" height="70" rx="14"/><rect x="470" y="190" width="120" height="70" rx="14"/></g>
<path d="M210 225c40 0 30-70 70-70M210 225c40 0 30 70 70 70M400 155c40 0 30 70 70 70M400 295c40 0 30-70 70-70" stroke="#78916B" stroke-width="2.5"/>
<g stroke="#20251F" stroke-width="2"><path d="M110 215h80M110 235h54M300 145h80M300 165h50M300 285h80M300 305h60M490 215h80M490 235h44"/></g>
<path d="M590 225h50"/><circle cx="690" cy="225" r="42" stroke="#BA7355"/><path d="M668 226l15 15 30-34" stroke="#BA7355" stroke-width="4"/>'''
os.makedirs(OUT, exist_ok=True)
for slug, body in art.items():
    if not body: continue
    open(os.path.join(OUT, slug + '.svg'), 'w').write(svg(body))
print('ok')
