from pathlib import Path
p=Path(__file__).resolve().parents[1]
s=(p/'src/page_template.html').read_text()
s=s.replace('<!--STYLE-->','<style>'+(p/'docs/style.css').read_text()+'</style>')
s=s.replace('<!--SCRIPTS-->','<script>'+(p/'docs/data.js').read_text()+'</script><script>'+(p/'docs/app.js').read_text()+'</script>')
(p/'docs/index.html').write_text(s)
