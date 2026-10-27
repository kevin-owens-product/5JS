"""Bundle the runnable project without following links or including local files."""
import os
from pathlib import Path
import subprocess
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parent.parent
destination = root / "public/examples/5js-examples.zip"
required_files = [root / name for name in (
    "package.json", "package-lock.json", "index.html", "README.md", ".gitignore", "LICENSE", "THIRD_PARTY_NOTICES.md",
    "tsconfig.json", "tsconfig.lib.json", "vite.config.ts", "vite.demo.config.ts",
    "packages/connectors/package.json", "packages/connectors/tsconfig.json",
    "packages/connectors/README.md", "packages/connectors/LICENSE",
)]
files = list(required_files)
files.extend(root / name for name in (
    "LICENSE.md", "LICENSE.txt", "NOTICE", "NOTICE.md",
    "CONTRIBUTING.md", "SECURITY.md",
    "CODE_OF_CONDUCT.md", "CHANGELOG.md", "AGENTS.md", "llms.txt",
    "artifacts/business-motion-reactor.jpg",
) if (root / name).exists())
excluded_directories = {"node_modules", "dist", "demo-dist", "__pycache__", "coverage"}
private_names = {"private", "secret", "secrets", "credentials"}
allowed_suffixes = {".ts", ".mts", ".mjs", ".html", ".css", ".md", ".py", ".yml", ".yaml"}


def excluded_name(name):
    return name.startswith(".") or bool(set(name.lower().split(".")) & private_names)


# Package manifests/configuration are exact required paths above; arbitrary JSON,
# root package files, keys, local snapshots, and other packages are not included.
source_folders = (
    "src", "demo", "examples", "connectors", "tests", "scripts", "docs", ".github",
    "packages/connectors/src", "packages/connectors/examples", "packages/connectors/docs",
)
for folder in source_folders:
    base = root / folder
    if base.is_symlink():
        raise ValueError(f"Refusing to archive symlink: {folder}")
    for parent, directories, filenames in os.walk(base, followlinks=False):
        # Explicitly prune dependency/build and hidden directories even when
        # assembling from an extracted source ZIP with no Git metadata.
        for name in directories[:]:
            path = Path(parent) / name
            if excluded_name(name) or name in excluded_directories:
                directories.remove(name)
            elif path.is_symlink():
                raise ValueError(f"Refusing to archive symlink: {path.relative_to(root)}")
        for name in filenames:
            path = Path(parent) / name
            if folder == "connectors" and name == "index.html":
                continue
            if not excluded_name(name) and path.suffix in allowed_suffixes:
                files.append(path)

if (root / ".git").exists():
    # Respect repository exclusions too, while retaining newly authored source.
    visible = subprocess.run(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
        cwd=root, check=True, stdout=subprocess.PIPE,
    ).stdout.decode("utf-8").split("\0")
    visible = set(visible)
    files = [path for path in files if path.relative_to(root).as_posix() in visible]

if set(required_files) - set(files):
    missing = sorted(path.relative_to(root).as_posix() for path in set(required_files) - set(files))
    raise ValueError(f"Required source files are excluded from the repository: {', '.join(missing)}")

files = sorted(set(files))
for path in files:
    if any(parent.is_symlink() for parent in (path, *path.parents) if parent != root and root in parent.parents) or not path.is_file():
        raise ValueError(f"Refusing to archive a symlink or missing source: {path.relative_to(root)}")
    path.resolve().relative_to(root)

destination.parent.mkdir(parents=True, exist_ok=True)
with ZipFile(destination, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
    for path in files:
        archive.write(path, Path("fivejs-examples") / path.relative_to(root))
print(f"Created {destination.relative_to(root)} ({len(files)} files, {destination.stat().st_size:,} bytes)")
