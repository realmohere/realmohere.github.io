"""Build the project cards and project pages from projects/projects.json.

Run from the repository root:  python3 tools/build_projects.py

It rewrites:
  - the project list in index.html, between <!-- PROJECTS:START --> and <!-- PROJECTS:END -->
  - one page per project in projects/<slug>.html
  - the project URLs in sitemap.xml, between <!-- PROJECTS:START --> and <!-- PROJECTS:END -->
The growing plant on the home page reads the list from index.html, so it adapts to any number of projects.
"""
import html, json, os, re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SITE = 'https://momohammadi.nl/'
E = lambda s: html.escape(s or '', quote=True)

data = json.load(open(os.path.join(ROOT, 'projects', 'projects.json'), encoding='utf-8'))
projects = data['projects']


def img_tag(p, prefix='', lazy=True, sizes='(min-width: 900px) 360px, 100vw'):
    im = p['image']
    w, h = im.get('width', 800), im.get('height', 450)
    attrs = f'src="{prefix}{E(im["src"])}" width="{w}" height="{h}" alt="{E(im["alt"])}" decoding="async"'
    if lazy:
        attrs += ' loading="lazy"'
    badge = '<span class="badge">Illustration</span>' if im.get('kind') == 'illustration' else ''
    return f'<div class="pcard-media"><img {attrs}>{badge}</div>'


def card(p, i, prefix=''):
    n = f'{i + 1:02d}'
    meta = [f'<span class="num">{n}</span>']
    if p.get('year'):
        meta.append(f'<span>{E(p["year"])}</span>')
    if p.get('status'):
        meta.append(f'<span class="status">{E(p["status"])}</span>')
    outcome = (f'\n        <p class="pcard-outcome"><span class="k">Outcome</span> {E(p["outcome"])}</p>'
               if p.get('outcome') else '')
    href = f'{prefix}projects/{p["slug"]}.html'
    return f'''    <li class="project" id="project-{p["slug"]}" data-slug="{p["slug"]}">
      <article class="pcard" aria-labelledby="t-{p["slug"]}">
        {img_tag(p, prefix)}
        <div class="pcard-body">
        <p class="pcard-meta">{''.join(meta)}</p>
        <h3 class="pcard-title" id="t-{p["slug"]}">{E(p["title"])}</h3>
        <p class="pcard-role"><span class="k">Role</span> {E(p["role"])}</p>
        <p class="pcard-desc">{E(p["summary"])}</p>{outcome}
        <a class="pcard-link" href="{href}" data-goatcounter-click="project-{p["slug"]}">View project<span class="vh">: {E(p["title"])}</span> <span aria-hidden="true">→</span></a>
        </div>
      </article>
    </li>'''


def placeholder(what):
    return f'<p class="todo"><strong>Placeholder.</strong> {E(what)}</p>'


def detail_page(p, i):
    d = p['detail']
    prev_p = projects[i - 1] if i > 0 else None
    next_p = projects[i + 1] if i + 1 < len(projects) else None
    def sec(title, key, hint):
        body = f'<p>{E(d[key])}</p>' if d.get(key) else placeholder(hint)
        return f'<section class="d-sec"><h2>{title}</h2>{body}</section>'
    tags = ''.join(f'<li>{E(t)}</li>' for t in p.get('tags', []))
    meta = ' · '.join(E(x) for x in [p.get('year'), p.get('status')] if x)
    im = p['image']
    note = ''  # illustrations are shown without an editor's note; swap in a real image via projects.json
    nav = '<nav class="d-pn" aria-label="More projects">'
    nav += (f'<a class="prev" href="{prev_p["slug"]}.html"><span>Previous</span>{E(prev_p["title"])}</a>' if prev_p else '<span></span>')
    nav += (f'<a class="next" href="{next_p["slug"]}.html"><span>Next</span>{E(next_p["title"])}</a>' if next_p else '<span></span>')
    nav += '</nav>'
    desc = p['summary']
    ld = json.dumps({
        '@context': 'https://schema.org', '@type': 'CreativeWork', 'name': p['title'],
        'description': desc, 'url': f'{SITE}projects/{p["slug"]}.html',
        'creator': {'@type': 'Person', '@id': f'{SITE}#mo', 'name': 'Mohammadhossein Mohammadi'},
        'keywords': ', '.join(p.get('tags', [])),
    }, ensure_ascii=False)
    crumbs = json.dumps({
        '@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'Mohammadhossein Mohammadi', 'item': SITE},
            {'@type': 'ListItem', 'position': 2, 'name': 'Projects', 'item': f'{SITE}#projects'},
            {'@type': 'ListItem', 'position': 3, 'name': p['title'], 'item': f'{SITE}projects/{p["slug"]}.html'},
        ]}, ensure_ascii=False)
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{E(p["title"])} | Mohammadhossein Mohammadi</title>
<meta name="description" content="{E(desc)}">
<meta name="author" content="Mohammadhossein Mohammadi">
<link rel="canonical" href="{SITE}projects/{p["slug"]}.html">
<meta property="og:type" content="article">
<meta property="og:title" content="{E(p["title"])} | Mohammadhossein Mohammadi">
<meta property="og:description" content="{E(desc)}">
<meta property="og:url" content="{SITE}projects/{p["slug"]}.html">
<meta property="og:site_name" content="Mohammadhossein Mohammadi">
<meta property="og:image" content="{SITE}og-card.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Mohammadhossein Mohammadi at his M.A. graduation, with his name and momohammadi.nl">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">{ld}</script>
<script type="application/ld+json">{crumbs}</script>
<link rel="icon" href="../favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,560;1,9..144,400&family=Inter:wght@400;500;600&display=swap">
<link rel="stylesheet" href="../assets/site.css">
<script>try{{var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t)}}catch(e){{}}</script>
</head>
<body class="detail">
<a class="skip" href="#main">Skip to content</a>
<header class="top"><div class="top-in">
  <a class="mark" href="../">Mo Mohammadi</a>
  <nav class="nav" aria-label="Site"><a href="../#projects">All projects</a><a href="../#contact">Contact</a></nav>
</div></header>
<main id="main" class="d-wrap">
  <p class="d-back"><a href="../#projects"><span aria-hidden="true">←</span> All projects</a></p>
  <article>
    <header class="d-head">
      <p class="d-meta"><span class="num">{i + 1:02d}</span>{(' · ' + meta) if meta else ''}</p>
      <h1>{E(p["title"])}</h1>
      <p class="d-lede">{E(desc)}</p>
      <dl class="d-facts"><div><dt>My role</dt><dd>{E(p["role"])}</dd></div>{f'<div><dt>Outcome</dt><dd>{E(p["outcome"])}</dd></div>' if p.get('outcome') else ''}</dl>
      <ul class="d-tags" aria-label="Topics">{tags}</ul>
    </header>
    <figure class="d-fig"><img src="../{E(im["src"])}" width="{im.get("width", 800)}" height="{im.get("height", 450)}" alt="{E(im["alt"])}">{note}</figure>
    {sec("The problem", "problem", "What problem or question started this project, in two or three sentences.")}
    {sec("Approach", "approach", "How the work was done.")}
    {sec("My contribution", "contribution", "What I personally did.")}
    {sec("Outcome", "outcome", "No outcome recorded yet. Add a real result here when there is one, such as a launch, a grade, users or feedback.")}
  </article>
  {nav}
  <aside class="d-cta"><h2>Want to talk about this?</h2><p><a class="btn primary" href="mailto:contact@momohammadi.nl" data-goatcounter-click="detail-email-{p["slug"]}">contact@momohammadi.nl</a></p></aside>
</main>
<footer class="foot"><span>© Mohammadhossein Mohammadi</span><a href="../">momohammadi.nl</a></footer>
<script data-goatcounter="https://realmohere.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>
</body>
</html>
'''


def replace_block(path, block, indent='', marker='PROJECTS'):
    s = open(path, encoding='utf-8').read()
    new, n = re.subn(r'(<!-- ' + marker + r':START -->)(.*?)(\s*<!-- ' + marker + r':END -->)',
                     lambda m: m.group(1) + '\n' + block + m.group(3), s, flags=re.S)
    if n != 1:
        raise SystemExit(f'{marker} markers not found in {path}')
    open(path, 'w', encoding='utf-8').write(new)


replace_block(os.path.join(ROOT, 'index.html'), '\n'.join(card(p, i) for i, p in enumerate(projects)))


# The story told by the growing plant: the seed, then one branch per entry, in order
def story_item(s, i):
    if 'project' in s:
        k = next(j for j, p in enumerate(projects) if p['slug'] == s['project'])
        p = projects[k]
        li = card(p, k)
        li = re.sub(r' id="[^"]*"', '', li).replace(' aria-labelledby="t-' + p['slug'] + '"', '')
        li = li.replace('<li class="project"', f'<li class="story-item" data-label="{E(p.get("year") or "")}" data-short="{E(p["title"])}" data-href="#project-{p["slug"]}"', 1)
        return li
    cls = 'story-item seed' if s.get('seed') else 'story-item'
    return f'''    <li class="{cls}" data-label="{E(s["years"].split(" ")[0])}" data-short="{E(s.get("label") or s["title"])}" data-href="{E(s["link"])}">
      <article class="pcard pcard-mile">
        <div class="pcard-body">
        <p class="pcard-meta"><span class="num">{E(s["years"])}</span><span class="status">{E(s["kind"])}</span></p>
        <h3 class="pcard-title">{E(s["title"])}</h3>
        <p class="pcard-role">{E(s["org"])}</p>
        <p class="pcard-desc">{E(s["text"])}</p>
        <a class="pcard-link" href="{E(s["link"])}">Read more <span aria-hidden="true">→</span></a>
        </div>
      </article>
    </li>'''


story = data.get('story') or [{'project': p['slug']} for p in projects]
replace_block(os.path.join(ROOT, 'index.html'), '\n'.join(story_item(s, i) for i, s in enumerate(story)), marker='STORY')
for i, p in enumerate(projects):
    open(os.path.join(ROOT, 'projects', p['slug'] + '.html'), 'w', encoding='utf-8').write(detail_page(p, i))
def lastmod(slug):
    # Date of the last commit that touched this project's page or its data; today if not committed yet.
    import subprocess, datetime
    try:
        out = subprocess.run(['git', 'log', '-1', '--format=%cs', '--', f'projects/{slug}.html'],
                             cwd=ROOT, capture_output=True, text=True).stdout.strip()
    except OSError:
        out = ''
    return out or datetime.date.today().isoformat()
urls = '\n'.join(f'  <url><loc>{SITE}projects/{p["slug"]}.html</loc><lastmod>{lastmod(p["slug"])}</lastmod></url>' for p in projects)
replace_block(os.path.join(ROOT, 'sitemap.xml'), urls)
print(f'Built {len(projects)} projects.')
