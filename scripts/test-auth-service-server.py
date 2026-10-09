"""Exercise real GoTrue using synthetic users, shared isolated network namespace."""
import base64
import hashlib
import hmac
import json
from pathlib import Path
import secrets
import subprocess
import sys
import time

work = Path(sys.argv[1])
assert str(work).startswith('/tmp/ariadne-auth-')
pg = 'ariadne-auth-pg-' + work.name.split('-')[-1]
auth = pg + '-api'
secret = secrets.token_hex(32)

def run(*args, data=None):
    result = subprocess.run(args, input=data, text=True, capture_output=True)
    if result.returncode:
        # No request bodies or tokens in diagnostic output.
        raise RuntimeError('Command failed: ' + args[0] + ': ' + result.stderr[:300])
    return result.stdout.strip()

def sql(query):
    return run('docker', 'exec', '-i', pg, 'psql', '-XAt', '-h', '/tmp', '-U', 'postgres', '-d', 'auth_test', '-v', 'ON_ERROR_STOP=1', data=query)

def jwt(role):
    enc = lambda obj: base64.urlsafe_b64encode(json.dumps(obj).encode()).decode().rstrip('=')
    body = enc({'alg': 'HS256', 'typ': 'JWT'}) + '.' + enc({'role': role, 'aud': 'authenticated', 'exp': int(time.time()) + 3600})
    return body + '.' + base64.urlsafe_b64encode(hmac.new(secret.encode(), body.encode(), hashlib.sha256).digest()).decode().rstrip('=')

def api(path, body=None, token=None, method=None):
    args = ['docker', 'exec', '-i', pg, 'curl', '-sS', '--max-time', '10', '-w', '\n%{http_code}', '-X', method or ('POST' if body is not None else 'GET'), '-H', 'Content-Type: application/json']
    if token: args += ['-H', 'Authorization: Bearer ' + token]
    if body is not None: args += ['--data-binary', '@-']
    result = run(*args, 'http://127.0.0.1:9999' + path, data=json.dumps(body) if body is not None else None)
    payload, status = result.rsplit('\n', 1) if '\n' in result else ('', result)
    return int(status), json.loads(payload) if payload else {}

def check(ok, message):
    if not ok: raise RuntimeError('FAIL: ' + message)
    print('PASS: ' + message, flush=True)

try:
    run('docker', 'run', '-d', '--name', pg, '--network', 'none', '--user', 'postgres', '--tmpfs', '/tmp:rw,nosuid,size=512m', '--entrypoint', 'bash', 'supabase/postgres:15.8.1.085', '-c', "mkdir /tmp/pgdata; initdb -D /tmp/pgdata -A trust --no-locale >/dev/null; exec postgres -D /tmp/pgdata -k /tmp -c listen_addresses=127.0.0.1")
    for _ in range(30):
        try:
            run('docker', 'exec', pg, 'pg_isready', '-h', '/tmp', '-U', 'postgres')
            break
        except RuntimeError: time.sleep(1)
    run('docker', 'exec', pg, 'createdb', '-h', '/tmp', '-U', 'postgres', 'auth_test')
    sql('create role supabase_auth_admin login; create schema auth authorization supabase_auth_admin; alter role supabase_auth_admin set search_path=auth; grant all on database auth_test to supabase_auth_admin; create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;')
    settings = {
      'GOTRUE_API_HOST': '127.0.0.1', 'GOTRUE_API_PORT': '9999',
      'API_EXTERNAL_URL': 'http://127.0.0.1:9999', 'GOTRUE_SITE_URL': 'http://127.0.0.1:3000',
      'GOTRUE_DB_DRIVER': 'postgres', 'GOTRUE_DB_DATABASE_URL': 'postgres://supabase_auth_admin@127.0.0.1:5432/auth_test?sslmode=disable',
      'GOTRUE_JWT_SECRET': secret, 'GOTRUE_JWT_EXP': '3600', 'GOTRUE_JWT_AUD': 'authenticated',
      'GOTRUE_JWT_ADMIN_ROLES': 'service_role', 'GOTRUE_JWT_DEFAULT_GROUP_NAME': 'authenticated',
      'GOTRUE_DISABLE_SIGNUP': 'true', 'GOTRUE_EXTERNAL_EMAIL_ENABLED': 'true',
      'GOTRUE_MAILER_AUTOCONFIRM': 'false', 'GOTRUE_PASSWORD_MIN_LENGTH': '12',
    }
    # Synthetic JWT secret only; no production config is read.
    args = ['docker', 'run', '-d', '--name', auth, '--network', 'container:' + pg]
    for key, value in settings.items(): args += ['-e', key + '=' + value]
    run(*args, 'supabase/gotrue:v2.186.0')
    for _ in range(40):
        try:
            if api('/health')[0] == 200: break
        except RuntimeError: pass
        time.sleep(1)
    else:
        print(run('docker', 'logs', '--tail', '8', auth))
        raise RuntimeError('Isolated GoTrue did not become healthy')
    sql("create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated,anon,service_role; grant execute on function auth.uid() to authenticated,anon,service_role;")
    for migration in sorted((work / 'supabase/migrations').glob('*.sql')): sql(migration.read_text())
    admin = jwt('service_role')
    status, _ = api('/signup', {'email': 'public@example.test', 'password': 'Synthetic-password-123'})
    check(status >= 400, 'public signup disabled by real Auth')
    status, invite = api('/admin/generate_link', {'type': 'invite', 'email': 'alice@example.test', 'data': {'display_name': 'Alice', 'role': 'admin'}}, admin)
    check(status == 200 and 'hashed_token' in invite, 'real invitation token generated without sending email')
    user_id = invite['id']
    check(sql("select display_name from public.profiles where id='" + user_id + "'") == 'Alice', 'real Auth insertion creates application profile')
    check(sql('select count(*) from public.global_user_roles') == '0', 'invited user metadata cannot grant admin')
    status, session = api('/verify', {'type': 'invite', 'token_hash': invite['hashed_token']})
    check(status == 200 and 'access_token' in session, 'invitation verifies and creates session')
    check(api('/verify', {'type': 'invite', 'token_hash': invite['hashed_token']})[0] >= 400, 'invitation cannot be replayed')
    token = session['access_token']
    check(api('/user', {'password': 'Synthetic-password-123'}, token, 'PUT')[0] == 200, 'invited user sets password')
    check(api('/token?grant_type=password', {'email': 'alice@example.test', 'password': 'wrong-password'})[0] >= 400, 'incorrect password denied')
    status, login = api('/token?grant_type=password', {'email': 'alice@example.test', 'password': 'Synthetic-password-123'})
    check(status == 200, 'password login succeeds')
    check(api('/user', token=login['access_token'])[0] == 200, 'server validates authenticated identity')
    sql("begin; set local app.system_reason='synthetic bootstrap'; select app_private.bootstrap_admin('" + user_id + "'); commit;")
    check(sql('select count(*) from public.global_user_roles') == '1', 'first confirmed admin bootstrapped')
    status, recovery = api('/admin/generate_link', {'type': 'recovery', 'email': 'alice@example.test'}, admin)
    check(status == 200, 'recovery token generated')
    status, recovered = api('/verify', {'type': 'recovery', 'token_hash': recovery['hashed_token']})
    check(status == 200, 'password recovery verifies')
    check(api('/user', {'password': 'Synthetic-new-password-456'}, recovered['access_token'], 'PUT')[0] == 200, 'recovery updates password')
    check(api('/token?grant_type=password', {'email': 'alice@example.test', 'password': 'Synthetic-password-123'})[0] >= 400, 'previous password no longer works')
    check(api('/logout?scope=local', {}, recovered['access_token'])[0] == 204, 'logout succeeds')
    check(api('/token?grant_type=refresh_token', {'refresh_token': recovered['refresh_token']})[0] >= 400, 'logged-out refresh token rejected')
finally:
    for name in [auth, pg]: subprocess.run(['docker', 'rm', '-f', '-v', name], capture_output=True)
