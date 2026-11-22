"""Inline engine, UI and CODEX into one self-contained dist/index.html."""
from pathlib import Path

root = Path(__file__).parent
html = (root / "src/index.template.html").read_text()
html = html.replace("/*__ENGINES__*/", (root / "src/engines/qmodsim.js").read_text())
html = html.replace("/*__APP__*/", (root / "src/ui/app.js").read_text())
html = html.replace("/*__CODEX__*/", (root / "src/codex.html").read_text())
assert "/*__" not in html
out = root / "docs/index.html"
out.parent.mkdir(exist_ok=True)
out.write_text(html)
print(out, len(html), "bytes")
