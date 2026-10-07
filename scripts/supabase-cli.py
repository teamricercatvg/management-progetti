#!/usr/bin/env python3
"""Supabase self-hosted via un tunnel SSH verificato e temporaneo."""
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import time
from urllib.parse import quote

CONFIG = Path.home() / '.config/ariadne-infra'
SSH_CONFIG = '/Users/stefanolaptop/.ssh/config_cdp_netcup'

def main():
    if len(sys.argv) < 2 or sys.argv[1] not in {'query', 'push', 'dump', 'lint', 'types'}:
        sys.exit('Uso: python3 scripts/supabase-cli.py query|push|dump|lint|types [argomenti]')
    credentials = json.loads((CONFIG / 'supabase-env.json').read_text())
    password = credentials['SERVICE_PASSWORD_POSTGRES']
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    tunnel = subprocess.Popen([
        'ssh', '-F', SSH_CONFIG, '-NT', '-o', 'BatchMode=yes',
        '-o', 'ExitOnForwardFailure=yes', '-L', f'127.0.0.1:{port}:127.0.0.1:25432',
        'cdp-netcup',
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        deadline = time.monotonic() + 15
        while True:
            if tunnel.poll() is not None:
                sys.exit('Impossibile aprire il tunnel SSH verificato.')
            try:
                with socket.create_connection(('127.0.0.1', port), timeout=0.3):
                    break
            except OSError:
                if time.monotonic() > deadline:
                    sys.exit('Timeout durante apertura tunnel SSH.')
                time.sleep(0.2)
        url = f'postgresql://postgres:{quote(password, safe="")}@127.0.0.1:{port}/postgres?sslmode=disable'
        command = ['supabase', 'gen', 'types'] if sys.argv[1] == 'types' else ['supabase', 'db', sys.argv[1]]
        command += ['--db-url', url, *sys.argv[2:]]
        env = os.environ.copy()
        env.pop('SUPABASE_ACCESS_TOKEN', None)
        result = subprocess.run(command, env=env, capture_output=True, text=True)
        for stream, target in [(result.stdout, sys.stdout), (result.stderr, sys.stderr)]:
            target.write(stream.replace(password, '[REDACTED]').replace(quote(password, safe=''), '[REDACTED]'))
        return result.returncode
    finally:
        tunnel.terminate()
        try:
            tunnel.wait(timeout=5)
        except subprocess.TimeoutExpired:
            tunnel.kill()
            tunnel.wait()

if __name__ == '__main__':
    sys.exit(main())
