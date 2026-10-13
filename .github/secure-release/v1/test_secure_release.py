#!/usr/bin/env python3
"""Observable-behavior tests for secure-release kit v1.

Definition:
  Exercise the public CLI in isolated Git repositories with a fake npm binary;
  no registry, credentials, or live repository is touched.

Parameters:
  Standard unittest parameters are supported.

Outputs:
  unittest results on stdout/stderr and a nonzero exit on failure.

Examples:
  python3 test_secure_release.py
  python3 -m unittest -v test_secure_release.py
"""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import threading
import unittest
from contextlib import contextmanager
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


SCRIPT = Path(__file__).with_name("secure_release.py")


class SecureReleaseTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory(prefix="secure-release-test-")
        self.root = Path(self.temporary.name)
        self.repo = self.root / "repo"
        self.repo.mkdir()
        self.git("init", "-q")
        self.git("config", "user.name", "Release Test")
        self.git("config", "user.email", "release@example.invalid")
        (self.repo / "tracked.txt").write_text("release\n", encoding="utf-8")
        self.git("add", "tracked.txt")
        self.git("commit", "-qm", "initial")
        self.git("branch", "-M", "main")
        self.git("-c", "tag.gpgSign=false", "tag", "v1.2.3")

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def git(self, *args: str) -> str:
        return subprocess.check_output(("git", *args), cwd=self.repo, text=True).strip()

    def cli(self, *args: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            (sys.executable, str(SCRIPT), *args),
            cwd=self.repo,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )

    @contextmanager
    def version_api(self, replies):
        requests = []

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                requests.append(self.path)
                status, payload = replies[min(len(requests) - 1, len(replies) - 1)]
                self.send_response(status)
                self.send_header('Content-Type', 'application/json')
                self.send_header('CF-Cache-Status', 'DYNAMIC')
                self.end_headers()
                self.wfile.write(payload if isinstance(payload, bytes) else json.dumps(payload).encode())

            def log_message(self, *args):
                pass

        server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            yield f'http://127.0.0.1:{server.server_port}/', requests
        finally:
            server.shutdown()
            server.server_close()
            thread.join()

    def api_smoke_npm(self, *, install_errors=(), installed=None):
        calls = self.root / 'smoke-calls.json'
        calls.write_text('[]')
        fake_npm = self.root / 'api-smoke-npm'
        fake_npm.write_text(f'''#!{sys.executable}
import json,sys
from pathlib import Path
log = Path({str(calls)!r})
calls = json.loads(log.read_text())
calls.append(sys.argv[1:])
log.write_text(json.dumps(calls))
command = sys.argv[1]
if command == 'view':
    print('npm error code E404', file=sys.stderr)
    sys.exit(1)
if command == 'init':
    Path('package.json').write_text('{{}}')
elif command == 'install':
    errors = {list(install_errors)!r}
    attempt = sum(call[0] == 'install' for call in calls) - 1
    if attempt < len(errors):
        print(errors[attempt], file=sys.stderr)
        sys.exit(1)
    output = Path('node_modules/@fixture/app/package.json')
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps({installed or {'name': '@fixture/app', 'version': '1.2.3'}!r}))
else:
    sys.exit(2)
''')
        fake_npm.chmod(0o755)
        return fake_npm, calls

    def api_smoke(self, registry, npm, retries=2):
        return self.cli('npm-smoke', '--package', '@fixture/app', '--version', '1.2.3',
                        '--registry', registry, '--npm', str(npm), '--metadata-source', 'version-api',
                        '--metadata-retries', str(retries), '--metadata-retry-delay', '0')

    def test_source_accepts_exact_reachable_tag_and_rejects_version_drift(self) -> None:
        result = self.cli(
            "source", "--tag", "v1.2.3", "--version", "1.2.3", "--primary-ref", "main"
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        drift = self.cli(
            "source", "--tag", "v1.2.3", "--version", "1.2.4", "--primary-ref", "main"
        )
        self.assertNotEqual(drift.returncode, 0)
        self.assertIn("does not match", drift.stderr)

    def test_manifest_detects_changed_and_extra_artifacts(self) -> None:
        release = self.repo / "release"
        release.mkdir()
        artifact = release / "package.tgz"
        artifact.write_bytes(b"exact bytes")
        manifest = release / "manifest.json"
        created = self.cli(
            "manifest-create",
            "--tag",
            "v1.2.3",
            "--version",
            "1.2.3",
            "--artifact",
            str(artifact),
            "--output",
            str(manifest),
        )
        self.assertEqual(created.returncode, 0, created.stderr)
        verified = self.cli(
            "manifest-verify", "--manifest", str(manifest), "--directory", str(release)
        )
        self.assertEqual(verified.returncode, 0, verified.stderr)
        artifact.write_bytes(b"changed")
        changed = self.cli(
            "manifest-verify", "--manifest", str(manifest), "--directory", str(release)
        )
        self.assertNotEqual(changed.returncode, 0)
        artifact.write_bytes(b"exact bytes")
        (release / ".unexpected").write_text("no\n", encoding="utf-8")
        extra = self.cli(
            "manifest-verify", "--manifest", str(manifest), "--directory", str(release)
        )
        self.assertNotEqual(extra.returncode, 0)
        self.assertIn("artifact set mismatch", extra.stderr)

    def test_changelog_extracts_only_exact_tag_section(self) -> None:
        changelog = self.repo / "CHANGELOG.md"
        changelog.write_text(
            "# Changelog\n\n## v1.2.3\n\n- Current.\n\n## v1.2.2\n\n- Previous.\n",
            encoding="utf-8",
        )
        notes = self.repo / "release" / "notes.md"
        result = self.cli(
            "changelog", "--tag", "v1.2.3", "--changelog", str(changelog), "--notes", str(notes)
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(notes.read_text(encoding="utf-8"), "## v1.2.3\n\n- Current.\n")

    def test_npm_pack_moves_one_tarball_and_creates_manifest(self) -> None:
        package = self.repo / "package"
        package.mkdir()
        (package / "package.json").write_text(
            json.dumps({"name": "fixture-package", "version": "1.2.3"}), encoding="utf-8"
        )
        fake_npm = self.root / "npm"
        fake_npm.write_text(
            "#!/bin/sh\n"
            "set -eu\n"
            "destination=''\n"
            "while [ \"$#\" -gt 0 ]; do\n"
            "  if [ \"$1\" = '--pack-destination' ]; then destination=$2; shift 2; else shift; fi\n"
            "done\n"
            "printf 'packed bytes' > \"$destination/fixture-package-1.2.3.tgz\"\n"
            "printf '{\"fixture-package\":{\"filename\":\"fixture-package-1.2.3.tgz\"}}\\n'\n",
            encoding="utf-8",
        )
        fake_npm.chmod(0o755)
        release = self.repo / "release"
        result = self.cli(
            "npm-pack",
            "--tag",
            "v1.2.3",
            "--package-dir",
            str(package),
            "--output-dir",
            str(release),
            "--manifest",
            str(release / "manifest.json"),
            "--npm",
            str(fake_npm),
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue((release / "fixture-package-1.2.3.tgz").is_file())
        manifest = json.loads((release / "manifest.json").read_text(encoding="utf-8"))
        self.assertEqual([item["name"] for item in manifest["artifacts"]], ["fixture-package-1.2.3.tgz"])

    def test_npm_pack_rejects_multiple_package_records(self) -> None:
        package = self.repo / "package"
        package.mkdir()
        (package / "package.json").write_text(
            json.dumps({"name": "fixture-package", "version": "1.2.3"}), encoding="utf-8"
        )
        fake_npm = self.root / "npm-multiple"
        fake_npm.write_text(
            "#!/bin/sh\n"
            "printf '{\"one\":{\"filename\":\"one.tgz\"},\"two\":{\"filename\":\"two.tgz\"}}\\n'\n",
            encoding="utf-8",
        )
        fake_npm.chmod(0o755)
        release = self.repo / "release"
        result = self.cli(
            "npm-pack",
            "--tag",
            "v1.2.3",
            "--package-dir",
            str(package),
            "--output-dir",
            str(release),
            "--manifest",
            str(release / "manifest.json"),
            "--npm",
            str(fake_npm),
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("must produce exactly one package", result.stderr)

    def test_registry_absence_fails_closed_on_non_404(self) -> None:
        fake_npm = self.root / "npm-error"
        fake_npm.write_text("#!/bin/sh\necho 'network timeout' >&2\nexit 1\n", encoding="utf-8")
        fake_npm.chmod(0o755)
        result = self.cli(
            "npm-absent",
            "--package",
            "fixture-package",
            "--version",
            "1.2.3",
            "--npm",
            str(fake_npm),
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("absence is unproven", result.stderr)

        fake_npm.write_text(
            "#!/bin/sh\necho 'upstream mentioned E404 but timed out' >&2\nexit 1\n",
            encoding="utf-8",
        )
        incidental = self.cli(
            "npm-absent",
            "--package",
            "fixture-package",
            "--version",
            "1.2.3",
            "--npm",
            str(fake_npm),
        )
        self.assertNotEqual(incidental.returncode, 0)
        self.assertIn("absence is unproven", incidental.stderr)

        fake_npm.write_text(
            "#!/bin/sh\necho 'npm error code E404' >&2\nexit 1\n", encoding="utf-8"
        )
        absent = self.cli(
            "npm-absent",
            "--package",
            "fixture-package",
            "--version",
            "1.2.3",
            "--npm",
            str(fake_npm),
        )
        self.assertEqual(absent.returncode, 0, absent.stderr)

    def test_existing_registry_version_requires_identical_tarball_bytes(self) -> None:
        artifact = self.repo / "intended.tgz"
        artifact.write_bytes(b"published bytes")
        fake_npm = self.root / "npm-existing"
        fake_npm.write_text(
            "#!/bin/sh\n"
            "set -eu\n"
            "destination=''\n"
            "while [ \"$#\" -gt 0 ]; do\n"
            "  if [ \"$1\" = '--pack-destination' ]; then destination=$2; shift 2; else shift; fi\n"
            "done\n"
            "printf 'published bytes' > \"$destination/downloaded.tgz\"\n"
            "printf '{\"fixture-package\":{\"filename\":\"downloaded.tgz\"}}\\n'\n",
            encoding="utf-8",
        )
        fake_npm.chmod(0o755)
        matched = self.cli(
            "npm-existing",
            "--package",
            "fixture-package",
            "--version",
            "1.2.3",
            "--artifact",
            str(artifact),
            "--npm",
            str(fake_npm),
        )
        self.assertEqual(matched.returncode, 0, matched.stderr)
        artifact.write_bytes(b"different bytes")
        mismatched = self.cli(
            "npm-existing",
            "--package",
            "fixture-package",
            "--version",
            "1.2.3",
            "--artifact",
            str(artifact),
            "--npm",
            str(fake_npm),
        )
        self.assertNotEqual(mismatched.returncode, 0)
        self.assertIn("differ", mismatched.stderr)

    def test_existing_registry_version_rejects_multiple_package_records(self) -> None:
        artifact = self.repo / "intended.tgz"
        artifact.write_bytes(b"published bytes")
        fake_npm = self.root / "npm-existing-multiple"
        fake_npm.write_text(
            "#!/bin/sh\n"
            "printf '{\"one\":{\"filename\":\"one.tgz\"},\"two\":{\"filename\":\"two.tgz\"}}\\n'\n",
            encoding="utf-8",
        )
        fake_npm.chmod(0o755)
        result = self.cli(
            "npm-existing",
            "--package",
            "fixture-package",
            "--version",
            "1.2.3",
            "--artifact",
            str(artifact),
            "--npm",
            str(fake_npm),
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("must produce exactly one package", result.stderr)

    def test_npm_publish_uses_exact_tarball_and_provenance(self) -> None:
        artifact = self.repo / "intended.tgz"
        artifact.write_bytes(b"publish bytes")
        arguments = self.root / "publish-arguments"
        fake_npm = self.root / "npm-publish"
        fake_npm.write_text(
            f"#!/bin/sh\nprintf '%s\\n' \"$@\" > '{arguments}'\n", encoding="utf-8"
        )
        fake_npm.chmod(0o755)
        result = self.cli("npm-publish", "--artifact", str(artifact), "--npm", str(fake_npm))
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(
            arguments.read_text(encoding="utf-8").splitlines(),
            [
                "publish",
                str(artifact),
                "--access",
                "public",
                "--tag",
                "latest",
                "--provenance",
                "--registry",
                "https://registry.npmjs.org/",
            ],
        )

    def test_npm_publish_private_source_disables_provenance(self) -> None:
        artifact = self.repo / "intended.tgz"
        artifact.write_bytes(b"publish bytes")
        arguments = self.root / "publish-arguments"
        fake_npm = self.root / "npm-publish"
        fake_npm.write_text(
            f"#!/bin/sh\nprintf '%s\\n' \"$@\" > '{arguments}'\n", encoding="utf-8"
        )
        fake_npm.chmod(0o755)
        result = self.cli("npm-publish", "--artifact", str(artifact), "--npm", str(fake_npm), "--provenance", "false")
        self.assertEqual(result.returncode, 0, result.stderr)
        observed = arguments.read_text(encoding="utf-8").splitlines()
        self.assertIn("--provenance=false", observed)
        self.assertNotIn("--provenance", observed)
        self.assertEqual(observed[1], str(artifact))

    def test_npm_smoke_retries_only_missing_metadata_with_a_bound(self) -> None:
        for error, misses, retries, expected_calls, succeeds in (
            ("E404", 2, 2, 3, True),
            ("E404", 5, 2, 3, False),
            ("E401", 2, 2, 1, False),
            ("ETIMEDOUT", 2, 2, 1, False),
        ):
            with self.subTest(error=error, misses=misses):
                counter = self.root / "lookup-count"
                counter.write_text("0")
                fake_npm = self.root / "npm-eventual"
                fake_npm.write_text(
                    "#!/bin/sh\nset -eu\ncase \"$1\" in\n"
                    f"view) n=$(cat '{counter}'); n=$((n+1)); echo $n > '{counter}'; "
                    f"if [ $n -le {misses} ]; then echo 'npm error code {error}' >&2; exit 1; fi; echo 1.2.3 ;;\n"
                    "init) echo '{}' > package.json ;;\n"
                    "install) mkdir -p node_modules/fixture-package; "
                    "printf '{\"name\":\"fixture-package\",\"version\":\"1.2.3\"}' > node_modules/fixture-package/package.json ;;\n"
                    "*) exit 2 ;;\nesac\n"
                )
                fake_npm.chmod(0o755)
                result = self.cli("npm-smoke", "--package", "fixture-package", "--version", "1.2.3", "--npm", str(fake_npm),
                                  "--metadata-retries", str(retries), "--metadata-retry-delay", "0")
                self.assertEqual(result.returncode == 0, succeeds, result.stderr)
                self.assertEqual(int(counter.read_text()), expected_calls)

    def test_npm_smoke_resolves_and_installs_exact_version(self) -> None:
        fake_npm = self.root / "npm-smoke"
        fake_npm.write_text(
            "#!/bin/sh\n"
            "set -eu\n"
            "case \"$1\" in\n"
            "  view) echo '1.2.3' ;;\n"
            "  init) printf '{\"name\":\"consumer\",\"version\":\"1.0.0\"}' > package.json ;;\n"
            "  install)\n"
            "    mkdir -p node_modules/fixture-package\n"
            "    printf '{\"name\":\"fixture-package\",\"version\":\"1.2.3\"}' "
            "> node_modules/fixture-package/package.json\n"
            "    ;;\n"
            "  *) exit 2 ;;\n"
            "esac\n",
            encoding="utf-8",
        )
        fake_npm.chmod(0o755)
        result = self.cli(
            "npm-smoke",
            "--package",
            "fixture-package",
            "--version",
            "1.2.3",
            "--npm",
            str(fake_npm),
        )
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_version_api_bypasses_stale_lookup_and_still_installs_named_version(self):
        npm, calls = self.api_smoke_npm()
        with self.version_api([(404, {}), (404, {}), (200, {'name': '@fixture/app', 'version': '1.2.3'})]) as (registry, requests):
            result = self.api_smoke(registry, npm)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(requests, ['/@fixture%2Fapp/1.2.3'] * 3)
        commands = json.loads(calls.read_text())
        self.assertEqual([call[0] for call in commands], ['init', 'install'])
        self.assertIn('@fixture/app@1.2.3', commands[-1])
        self.assertIn('cache=DYNAMIC', result.stdout)

    def test_version_api_rejects_errors_identity_drift_and_unbounded_absence(self):
        for status, metadata, attempts in (
            (404, {}, 3),
            (401, {}, 1),
            (500, {}, 1),
            (200, b'not JSON', 1),
            (200, {'name': '@other/app', 'version': '1.2.3'}, 1),
            (200, {'name': '@fixture/app', 'version': '1.2.4'}, 1),
        ):
            with self.subTest(status=status, metadata=metadata):
                npm, calls = self.api_smoke_npm()
                with self.version_api([(status, metadata)]) as (registry, requests):
                    result = self.api_smoke(registry, npm)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(len(requests), attempts)
                self.assertEqual(json.loads(calls.read_text()), [])

    def test_version_api_retries_only_the_requested_install_version_with_a_bound(self):
        missing = 'npm error code ETARGET\nnpm error notarget No matching version found for @fixture/app@1.2.3.'
        for errors, succeeds, installs in (
            ([missing, missing], True, 3),
            ([missing] * 3, False, 3),
            (['npm error code ETARGET\nnpm error notarget No matching version found for another@1.0.0.'], False, 1),
            (['npm error code E401'], False, 1),
            (['npm error code ETIMEDOUT'], False, 1),
            (['npm error code E404'], False, 1),
        ):
            with self.subTest(errors=errors):
                npm, calls = self.api_smoke_npm(install_errors=errors)
                with self.version_api([(200, {'name': '@fixture/app', 'version': '1.2.3'})]) as (registry, requests):
                    result = self.api_smoke(registry, npm)
                self.assertEqual(result.returncode == 0, succeeds, result.stderr)
                self.assertEqual(sum(call[0] == 'install' for call in json.loads(calls.read_text())), installs)

    def test_version_api_rejects_a_different_installed_identity(self):
        for identity in ({'name': '@other/app', 'version': '1.2.3'}, {'name': '@fixture/app', 'version': '1.2.4'}):
            with self.subTest(identity=identity):
                npm, calls = self.api_smoke_npm(installed=identity)
                with self.version_api([(200, {'name': '@fixture/app', 'version': '1.2.3'})]) as (registry, requests):
                    result = self.api_smoke(registry, npm)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn('does not match', result.stderr)


if __name__ == "__main__":
    unittest.main()
