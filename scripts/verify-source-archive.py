"""Regression checks for the source ZIP boundary, using harmless temp fixtures."""
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parent.parent
REQUIRED = (
    "package.json", "package-lock.json", "index.html", "README.md", ".gitignore",
    "LICENSE", "THIRD_PARTY_NOTICES.md", "tsconfig.json", "tsconfig.lib.json",
    "vite.config.ts", "vite.demo.config.ts", "scripts/package-examples.py",
)


class SourceArchiveChecks(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="fivejs-archive-check-")
        self.addCleanup(self.temporary.cleanup)
        self.project = Path(self.temporary.name) / "source"
        (self.project / "scripts").mkdir(parents=True)
        (self.project / "docs").mkdir()
        for name in REQUIRED:
            shutil.copy2(ROOT / name, self.project / name)

    def build(self):
        return subprocess.run(
            ["python3", "scripts/package-examples.py"], cwd=self.project,
            capture_output=True, text=True,
        )

    def names(self):
        with ZipFile(self.project / "public/examples/5js-examples.zip") as archive:
            return {name.removeprefix("fivejs-examples/") for name in archive.namelist()}

    def test_prunes_hidden_dependencies_and_generated_files_without_git(self):
        (self.project / "docs/guide.md").write_text("# Public guide\n")
        for name in ("docs/.private.md", "docs/.local/notes.md", "docs/node_modules/vendor.ts", "docs/dist/generated.ts"):
            path = self.project / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("HARMLESS_EXCLUSION_CANARY\n")
        result = self.build()
        self.assertEqual(result.returncode, 0, result.stderr)
        names = self.names()
        self.assertTrue({"LICENSE", "THIRD_PARTY_NOTICES.md", "docs/guide.md"} <= names)
        self.assertFalse(names & {"docs/.private.md", "docs/.local/notes.md", "docs/node_modules/vendor.ts", "docs/dist/generated.ts"})

    def test_respects_git_ignored_source_when_repository_is_present(self):
        subprocess.run(["git", "init", "--quiet"], cwd=self.project, check=True)
        with (self.project / ".gitignore").open("a") as ignores:
            ignores.write("\ndocs/private.md\n")
        (self.project / "docs/private.md").write_text("HARMLESS_IGNORED_CANARY\n")
        (self.project / "docs/guide.md").write_text("# Public guide\n")
        result = self.build()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn("docs/private.md", self.names())
        self.assertIn("docs/guide.md", self.names())

    def test_rejects_file_symlink_without_replacing_previous_archive(self):
        self.assertEqual(self.build().returncode, 0)
        archive = self.project / "public/examples/5js-examples.zip"
        before = archive.read_bytes()
        outside = Path(self.temporary.name) / "outside.md"
        outside.write_text("HARMLESS_OUTSIDE_CANARY\n")
        (self.project / "docs/linked.md").symlink_to(outside)
        result = self.build()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("symlink", result.stderr)
        self.assertEqual(archive.read_bytes(), before)

    def test_rejects_directory_symlink(self):
        outside = Path(self.temporary.name) / "outside"
        outside.mkdir()
        (outside / "secret.md").write_text("HARMLESS_OUTSIDE_CANARY\n")
        (self.project / "docs/linked").symlink_to(outside, target_is_directory=True)
        result = self.build()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("symlink", result.stderr)

    def test_rejects_missing_license(self):
        (self.project / "LICENSE").unlink()
        result = self.build()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("LICENSE", result.stderr)

    def test_rejects_ignored_license_in_repository(self):
        subprocess.run(["git", "init", "--quiet"], cwd=self.project, check=True)
        with (self.project / ".gitignore").open("a") as ignores:
            ignores.write("\nLICENSE\n")
        result = self.build()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("LICENSE", result.stderr)


if __name__ == "__main__":
    unittest.main(verbosity=2)
