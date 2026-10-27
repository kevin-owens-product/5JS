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
    "packages/connectors/package.json", "packages/connectors/tsconfig.json",
    "packages/connectors/README.md", "packages/connectors/LICENSE",
)


class SourceArchiveChecks(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="fivejs-archive-check-")
        self.addCleanup(self.temporary.cleanup)
        self.project = Path(self.temporary.name) / "source"
        (self.project / "scripts").mkdir(parents=True)
        (self.project / "docs").mkdir()
        for name in REQUIRED:
            (self.project / name).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(ROOT / name, self.project / name)

    def build(self):
        return subprocess.run(
            ["python3", "scripts/package-examples.py"], cwd=self.project,
            capture_output=True, text=True,
        )

    def names(self):
        with ZipFile(self.project / "public/examples/5js-examples.zip") as archive:
            return {name.removeprefix("fivejs-examples/") for name in archive.namelist()}

    def test_preserves_agent_entry_points_without_git(self):
        for name in ("AGENTS.md", "llms.txt"):
            shutil.copy2(ROOT / name, self.project / name)
        result = self.build()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue({"AGENTS.md", "llms.txt"} <= self.names())

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
            ignores.write("\ndocs/internal-only.md\npackages/connectors/src/internal-only.ts\n")
        (self.project / "docs/internal-only.md").write_text("HARMLESS_IGNORED_CANARY\n")
        (self.project / "packages/connectors/src").mkdir()
        (self.project / "packages/connectors/src/internal-only.ts").write_text("HARMLESS_IGNORED_CANARY\n")
        (self.project / "docs/guide.md").write_text("# Public guide\n")
        result = self.build()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn("docs/internal-only.md", self.names())
        self.assertNotIn("packages/connectors/src/internal-only.ts", self.names())
        self.assertIn("docs/guide.md", self.names())

    def test_includes_connector_sources_and_exact_manifests_but_no_private_or_generated_files(self):
        included = {
            "packages/connectors/src/index.ts", "packages/connectors/src/adapters/example.ts",
            "packages/connectors/examples/server.ts", "packages/connectors/examples/index.html",
            "packages/connectors/docs/GUIDE.md",
        }
        excluded = {
            "packages/connectors/.env", "packages/connectors/credentials.json",
            "packages/connectors/local.json", "packages/connectors/private.md",
            "packages/connectors/src/credentials.json", "packages/connectors/src/data.json",
            "packages/connectors/src/client.private.ts", "packages/connectors/src/.local/notes.md",
            "packages/connectors/src/private/internal.ts", "packages/connectors/docs/secrets/access.md",
            "packages/connectors/src/client.key", "packages/connectors/examples/certificate.pem",
            "packages/connectors/dist/index.js", "packages/connectors/dist/index.d.ts",
            "packages/connectors/node_modules/vendor/index.ts",
            "packages/connectors/src/dist/nested.ts", "packages/connectors/examples/node_modules/vendor.ts",
            "packages/connectors/coverage/report.html", "packages/unrelated/src/index.ts",
        }
        for name in included | excluded:
            path = self.project / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("HARMLESS_CONNECTOR_CANARY\n")
        result = self.build()
        self.assertEqual(result.returncode, 0, result.stderr)
        names = self.names()
        self.assertTrue(included <= names)
        self.assertTrue({name for name in REQUIRED if name.startswith("packages/")} <= names)
        self.assertFalse(names & excluded)

    def test_requires_connector_manifest_configuration_and_license(self):
        for name in ("packages/connectors/package.json", "packages/connectors/tsconfig.json", "packages/connectors/LICENSE"):
            with self.subTest(name=name):
                path = self.project / name
                original = path.read_bytes()
                path.unlink()
                result = self.build()
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(name, result.stderr)
                path.write_bytes(original)

    def test_includes_authored_guides_and_generator_but_omits_generated_routes(self):
        included = {"connectors/content/types.ts", "connectors/content/databases.ts", "connectors/render.ts",
                    "connectors/client.ts", "connectors/style.css", "scripts/generate-connector-pages.ts"}
        excluded = {"connectors/index.html", "connectors/postgresql/index.html", "connectors/.local/private.ts"}
        for name in included | excluded:
            path = self.project / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("HARMLESS_GUIDE_CANARY\n")
        result = self.build()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(included <= self.names())
        self.assertFalse(excluded & self.names())

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
