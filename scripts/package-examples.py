"""Bundle the runnable example project, excluding dependencies and generated output."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parent.parent
destination = root / "public/examples/5js-examples.zip"
destination.parent.mkdir(parents=True, exist_ok=True)
files = [root / name for name in (
    "package.json", "package-lock.json", "index.html", "README.md", ".gitignore",
    "tsconfig.json", "tsconfig.lib.json", "vite.config.ts", "vite.demo.config.ts",
)]
files.extend(root / name for name in (
    "LICENSE", "LICENSE.md", "LICENSE.txt", "NOTICE", "NOTICE.md",
    "THIRD_PARTY_NOTICES.md", "CONTRIBUTING.md", "SECURITY.md",
    "CODE_OF_CONDUCT.md", "CHANGELOG.md",
    "artifacts/business-motion-reactor.jpg",
) if (root / name).is_file())
for folder in ("src", "demo", "examples", "tests", "scripts", "docs", ".github"):
    files.extend(path for path in (root / folder).rglob("*")
                 if path.is_file() and path.suffix in (".ts", ".mts", ".mjs", ".html", ".css", ".md", ".py", ".yml", ".yaml"))
with ZipFile(destination, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
    for path in sorted(files):
        archive.write(path, Path("fivejs-examples") / path.relative_to(root))
print(f"Created {destination.relative_to(root)} ({len(files)} files, {destination.stat().st_size:,} bytes)")
