#!/usr/bin/env python3
"""Read-only checks against the dedicated backend through verified SSH."""
import base64
import json
from pathlib import Path
import socket
import subprocess
import time
import urllib.error
import urllib.request

values = json.loads((Path.home() / '.config/ariadne-infra/supabase-env.json').read_text())
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    port = sock.getsockname()[1]
tunnel = subprocess.Popen([
    'ssh', '-F', str(Path.home() / '.ssh/config_cdp_netcup'), '-NT',
    '-o', 'BatchMode=yes', '-o', 'ExitOnForwardFailure=yes',
    '-L', f'127.0.0.1:{port}:127.0.0.1:28080', 'cdp-netcup',
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    deadline = time.monotonic() + 15
    while True:
        if tunnel.poll() is not None:
            raise SystemExit('SSH tunnel could not start')
        try:
            with socket.create_connection(('127.0.0.1', port), timeout=.3):
                break
        except OSError:
            if time.monotonic() > deadline:
                raise SystemExit('SSH tunnel timeout')
            time.sleep(.2)

    def request(path, key=None, basic=False):
        headers = {}
        if key:
            headers = {'apikey': key, 'Authorization': 'Bearer ' + key}
        if basic:
            credentials = values['SERVICE_USER_ADMIN'] + ':' + values['SERVICE_PASSWORD_ADMIN']
            headers['Authorization'] = 'Basic ' + base64.b64encode(credentials.encode()).decode()
        req = urllib.request.Request(f'http://127.0.0.1:{port}' + path, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                return response.status, response.read()
        except urllib.error.HTTPError as error:
            return error.code, error.read()

    for path, key, basic, expected in [
        ('/auth/v1/health', values['SERVICE_SUPABASEANON_KEY'], False, 200),
        ('/rest/v1/', values['SERVICE_SUPABASEANON_KEY'], False, 200),
        ('/rest/v1/', values['SERVICE_SUPABASESERVICE_KEY'], False, 200),
        ('/', None, False, 401),
        ('/', None, True, 200),
        ('/rest/v1/', 'invalid-key', False, 401),
    ]:
        status, _ = request(path, key, basic)
        assert status == expected, (path, status, expected)
        print(f'{path}: HTTP {status}, as expected')
    status, body = request('/auth/v1/settings', values['SERVICE_SUPABASEANON_KEY'])
    settings = json.loads(body)
    assert status == 200 and settings['disable_signup']
    assert not settings.get('external', {}).get('anonymous_users', False)
    print('Public signup and anonymous users disabled')
finally:
    tunnel.terminate()
    try:
        tunnel.wait(timeout=5)
    except subprocess.TimeoutExpired:
        tunnel.kill()
        tunnel.wait()
