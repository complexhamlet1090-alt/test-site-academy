from pathlib import Path
from urllib.request import Request, urlopen
import re

root = Path(r"C:\Users\User\Documents\deepseek-harness\default-workspace\cyber-course\assets\fonts")
root.mkdir(parents=True, exist_ok=True)
url = "https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&family=Unbounded:wght@600&display=swap"
user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
css = urlopen(Request(url, headers={"User-Agent": user_agent}), timeout=45).read().decode()
blocks = re.findall(r"/\* (cyrillic|latin) \*/\s*(@font-face\s*\{.*?\})", css, flags=re.S)
selected = {}
for subset, block in blocks:
    family = re.search(r"font-family:\s*'([^']+)'", block).group(1)
    weight = re.search(r"font-weight:\s*(\d+)", block).group(1)
    font_url = re.search(r"url\((https://[^)]+)\)", block).group(1)
    selected.setdefault((family, weight), []).append((subset, font_url))

names = {("Onest", "400"): "onest-regular", ("Onest", "500"): "onest-medium", ("Onest", "600"): "onest-semibold", ("Onest", "700"): "onest-bold", ("Unbounded", "600"): "unbounded-semibold"}
for key, entries in selected.items():
    for subset, font_url in entries:
        if key not in names:
            continue
        suffix = "" if subset == "latin" else "-cyrillic"
        target = root / f"{names[key]}{suffix}.woff2"
        target.write_bytes(urlopen(Request(font_url, headers={"User-Agent": user_agent}), timeout=45).read())
        print(target.name, target.stat().st_size)

for font, slug in [("Onest", "onest"), ("Unbounded", "unbounded")]:
    license_url = f"https://raw.githubusercontent.com/google/fonts/main/ofl/{font.lower()}/OFL.txt"
    (root / f"{slug}-OFL.txt").write_bytes(urlopen(Request(license_url, headers={"User-Agent": user_agent}), timeout=45).read())
print("Local fonts and OFL licenses saved")
