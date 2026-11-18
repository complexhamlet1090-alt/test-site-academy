from pathlib import Path
from lxml import html

root = Path(r"C:\Users\User\Documents\deepseek-harness\default-workspace\cyber-course")
doc = html.fromstring((root / "index.html").read_text(encoding="utf-8"))
ids = doc.xpath("//@id")
assert len(ids) == len(set(ids)), "Duplicate element IDs"
anchors = doc.xpath("//a[starts-with(@href, '#')]/@href")
missing = [anchor for anchor in anchors if anchor != "#" and anchor[1:] not in ids]
assert not missing, f"Missing anchors: {missing}"
references = doc.xpath("//img/@src | //link[@rel='stylesheet']/@href | //script/@src")
missing_assets = [ref for ref in references if not (root / ref).is_file()]
assert not missing_assets, f"Missing assets: {missing_assets}"
images = doc.xpath("//img")
assert all(image.get("alt") is not None for image in images), "Image alt is missing"
labels = set(doc.xpath("//label/@for"))
inputs = set(doc.xpath("//input/@id | //textarea/@id"))
assert {"name", "contact", "question", "consent"}.issubset(inputs | labels)
print("PASS: unique IDs, valid anchors, existing local assets, image alt text and form labels")
