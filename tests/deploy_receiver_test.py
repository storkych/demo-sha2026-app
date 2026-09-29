import importlib.util
import io
import json
import os
from pathlib import Path
import tarfile
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('receiver', Path(__file__).parents[1] / 'ops/deploy_receiver.py')
receiver = importlib.util.module_from_spec(spec)
spec.loader.exec_module(receiver)
REVISION = 'a' * 40


def website(extra=None):
    stream = io.BytesIO()
    with tarfile.open(fileobj=stream, mode='w:gz') as archive:
        for name, data in {'index.html': b'<script src="./assets/app.js"></script>', 'assets/app.js': b'console.log("quest")', **(extra or {})}.items():
            info = tarfile.TarInfo(name)
            info.size = len(data)
            archive.addfile(info, io.BytesIO(data))
    return stream.getvalue()


@unittest.skipIf(os.name == 'nt', 'The server receiver uses POSIX symlinks; run on Linux')
class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.base = Path(self.temp.name).resolve()
        (self.base / 'releases').mkdir()
        (self.base / 'incoming').mkdir()
        self.old = self.base / 'releases' / 'previous-good'
        self.old.mkdir()
        (self.old / 'index.html').write_text('old version')
        (self.base / 'current').symlink_to(self.old, target_is_directory=True)
        self.patches = [patch.object(receiver, 'BASE', self.base), patch.object(receiver, 'RELEASES', self.base / 'releases')]
        for item in self.patches:
            item.start()

    def tearDown(self):
        for item in self.patches:
            item.stop()
        self.temp.cleanup()

    def deploy(self, data, health_revision=REVISION, command='deploy ' + REVISION):
        response = io.BytesIO(json.dumps({'commit': health_revision}).encode())
        with patch.dict(os.environ, {'SSH_ORIGINAL_COMMAND': command}), patch.object(receiver.sys, 'stdin', SimpleNamespace(buffer=io.BytesIO(data))), patch.object(receiver.urllib.request, 'urlopen', return_value=response):
            receiver.main()

    def test_deploy_preserves_previous_and_activates_new_files(self):
        self.deploy(website())
        self.assertEqual((self.base / 'previous').resolve(), self.old)
        self.assertEqual(json.loads((self.base / 'current' / 'deployment.json').read_text())['commit'], REVISION)

    def test_failed_health_check_rolls_back(self):
        with self.assertRaises(ValueError):
            self.deploy(website(), health_revision='b' * 40)
        self.assertEqual((self.base / 'current').resolve(), self.old)
        self.assertEqual(list((self.base / 'releases').iterdir()), [self.old])

    def test_path_traversal_cannot_write_outside_release(self):
        with self.assertRaises(ValueError):
            self.deploy(website({'../../escape': b'unsafe'}))
        self.assertFalse((self.base / 'escape').exists())
        self.assertEqual((self.base / 'current').resolve(), self.old)

    def test_rejects_arbitrary_ssh_commands(self):
        with self.assertRaises(ValueError):
            self.deploy(website(), command='sh -c whoami')
        self.assertEqual((self.base / 'current').resolve(), self.old)

    def test_rejects_symlinks_and_absolute_paths(self):
        link = tarfile.TarInfo('assets/link')
        link.type = tarfile.SYMTYPE
        link.linkname = '/etc/passwd'
        with self.assertRaises(ValueError):
            receiver.validate_member(link)
        with self.assertRaises(ValueError):
            receiver.validate_member(tarfile.TarInfo('/etc/config'))


if __name__ == '__main__':
    unittest.main()
