#!/usr/bin/python3
"""Restricted SSH receiver for this site only. Installed root-owned on the host."""
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import sys
import tarfile
import tempfile
import time
import urllib.request
import uuid

BASE = Path('/srv/demosha2026')
RELEASES = BASE / 'releases'
HOST = 'demosha2026.storkyproduct.ru'
MAX_UPLOAD = 50 * 1024 * 1024
MAX_EXPANDED = 150 * 1024 * 1024


def switch_link(name, target):
    temporary = BASE / ('.' + name + '-' + uuid.uuid4().hex)
    temporary.symlink_to(target)
    os.replace(temporary, BASE / name)


def validate_member(member):
    name = PurePosixPath(member.name)
    if name.is_absolute() or '..' in name.parts or '\\' in member.name:
        raise ValueError('Unsafe archive path')
    if not (member.isdir() or member.isfile()):
        raise ValueError('Links and special files are not allowed')
    return name


def main():
    command = os.environ.get('SSH_ORIGINAL_COMMAND', '')
    match = re.fullmatch(r'deploy ([0-9a-f]{40})', command)
    if not match:
        raise ValueError('Only deploy <40-character commit SHA> is allowed')
    revision = match[1]
    release = RELEASES / (time.strftime('%Y%m%dT%H%M%SZ', time.gmtime()) + '-' + revision[:12] + '-' + uuid.uuid4().hex[:6])
    previous = (BASE / 'current').resolve() if (BASE / 'current').is_symlink() else None
    if previous and previous.parent != RELEASES:
        raise ValueError('Current release points outside the site directory')
    activated = False
    try:
        with tempfile.TemporaryFile(dir=BASE / 'incoming') as upload:
            size = 0
            while chunk := sys.stdin.buffer.read(64 * 1024):
                size += len(chunk)
                if size > MAX_UPLOAD:
                    raise ValueError('Upload exceeds the size limit')
                upload.write(chunk)
            upload.seek(0)
            with tarfile.open(fileobj=upload, mode='r:gz') as archive:
                members = archive.getmembers()
                if len(members) > 10000 or sum(m.size for m in members) > MAX_EXPANDED:
                    raise ValueError('Archive exceeds extraction limits')
                for member in members:
                    validate_member(member)
                release.mkdir(mode=0o755)
                for member in members:
                    name = validate_member(member)
                    destination = release.joinpath(*name.parts)
                    if not destination.resolve().is_relative_to(release):
                        raise ValueError('Archive path escapes release directory')
                    if member.isdir():
                        destination.mkdir(parents=True, exist_ok=True, mode=0o755)
                    else:
                        destination.parent.mkdir(parents=True, exist_ok=True, mode=0o755)
                        with archive.extractfile(member) as source, destination.open('wb') as output:
                            shutil.copyfileobj(source, output)
                        destination.chmod(0o644)
        if not (release / 'index.html').is_file() or not list((release / 'assets').glob('*.js')):
            raise ValueError('The archive does not contain a built website')
        (release / 'deployment.json').write_text(json.dumps({'commit': revision}), encoding='utf-8')
        switch_link('current', release)
        activated = True
        request = urllib.request.Request('http://127.0.0.1/healthz', headers={'Host': HOST})
        with urllib.request.urlopen(request, timeout=10) as response:
            if json.load(response)['commit'] != revision:
                raise ValueError('Health check returned a different deployment')
        if previous:
            switch_link('previous', previous)
        print('Deployed ' + revision + ' to https://' + HOST, flush=True)
    except BaseException:
        if activated:
            if previous:
                switch_link('current', previous)
            else:
                (BASE / 'current').unlink(missing_ok=True)
        if release.exists() and release.parent == RELEASES:
            shutil.rmtree(release)
        raise
    # Only old releases belonging to this site may be removed.
    keep = {release, previous}
    old = sorted((p for p in RELEASES.iterdir() if p.is_dir() and not p.is_symlink()), reverse=True)
    for candidate in old[5:]:
        if candidate not in keep and candidate.resolve().parent == RELEASES:
            shutil.rmtree(candidate)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('Deployment failed: ' + str(error), file=sys.stderr)
        sys.exit(1)
