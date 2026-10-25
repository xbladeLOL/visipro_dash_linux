"""Réveil d'un seul PC VisiPro avec confirmation Tailscale.

Un envoi UDP réussi ne prouve pas que le PC a démarré. Le plan reste donc en
attente jusqu'à ce que le nœud Tailscale cible soit réellement en ligne, ou
jusqu'à l'expiration du délai de confirmation.
"""
import os, sys, json, time, socket, uuid, tempfile, subprocess
from pathlib import Path
try:
    import fcntl
except ImportError:
    fcntl = None
MAC = '04:D9:F5:D3:61:C6'
BROADCAST = '192.168.1.255'
TARGET_HOST = 'windows_pue'
RETRY_SECONDS = 60
MAX_ATTEMPTS = 10
CONFIRMATION_TIMEOUT_SECONDS = 15 * 60

def validate_when(value, now):
    if isinstance(value, bool) or not isinstance(value, (int,float)) or not now+30 <= value <= now+8*86400:
        raise ValueError('INVALID_WAKE_TIME')
    return int(value)

def packet(mac=MAC):
    return bytes.fromhex('FF'*6 + mac.replace(':','')*16)

def tailscale_online():
    """Retourne True/False, ou None si l'état Tailscale est indisponible."""
    try:
        result = subprocess.run(
            ['/usr/bin/tailscale', 'status', '--json'],
            check=True,
            capture_output=True,
            text=True,
            timeout=5,
        )
        peers = json.loads(result.stdout).get('Peer', {}).values()
        for peer in peers:
            host = str(peer.get('HostName', '')).lower()
            dns = str(peer.get('DNSName', '')).lower()
            if host == TARGET_HOST.lower() or dns.startswith(TARGET_HOST.lower() + '.'):
                return bool(peer.get('Online'))
        return False
    except (OSError, subprocess.SubprocessError, ValueError, TypeError, json.JSONDecodeError):
        return None

def send_magic_packet():
    with socket.socket(socket.AF_INET,socket.SOCK_DGRAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET,socket.SO_BROADCAST,1)
        sock.sendto(packet(),(BROADCAST,9))

def operate(action, payload, folder, now=None, send=None, online=None):
    now = time.time() if now is None else now
    send = send_magic_packet if send is None else send
    online = tailscale_online if online is None else online
    folder = Path(folder); folder.mkdir(parents=True, exist_ok=True); os.chmod(folder,0o700)
    if fcntl is None: raise RuntimeError('LINUX_REQUIRED')
    with open(folder/'state.lock','a+') as lock:
        os.chmod(folder/'state.lock',0o600); fcntl.flock(lock,fcntl.LOCK_EX)
        file = folder/'wake.json'
        state = json.loads(file.read_text()) if file.exists() else {'status':'none'}
        changed = False
        if action == 'schedule':
            when = validate_when(payload.get('wakeAt'),now)
            request = payload.get('requestId')
            if not isinstance(request,str) or len(request)>100 or not request: raise ValueError('INVALID_REQUEST_ID')
            if state.get('requestId') == request:
                if state.get('wakeAt') != when: raise ValueError('IDEMPOTENCY_CONFLICT')
                return state
            if state.get('status') in ['pending','waking','awaiting_online']: raise ValueError('WAKE_PLAN_EXISTS')
            state = {'id':str(uuid.uuid4()),'requestId':request,'wakeAt':when,'status':'pending','attempts':0,'createdAt':int(now)};changed=True
        elif action == 'cancel':
            if payload.get('id') != state.get('id'): raise ValueError('PLAN_NOT_FOUND')
            state['status']='cancelled';changed=True
        elif action == 'status': pass
        elif action == 'tick':
            # "sent" est l'ancien faux état terminal. Il est volontairement repris
            # afin que les plans existants obtiennent enfin un résultat confirmé.
            if state.get('status') in ['pending','waking','awaiting_online','sent'] and now>=state['wakeAt']:
                is_online = online()
                if is_online is True:
                    state['status']='online_confirmed';state['confirmedAt']=int(now)
                    state.pop('failureReason',None);changed=True
                elif now-state['wakeAt']>CONFIRMATION_TIMEOUT_SECONDS:
                    state['status']='failed'
                    state['failureReason']='TAILSCALE_CONFIRMATION_UNAVAILABLE' if is_online is None else 'PC_DID_NOT_COME_ONLINE'
                    state['failedAt']=int(now);changed=True
                elif state.get('attempts',0)<MAX_ATTEMPTS and now>=state.get('nextAttemptAt',0):
                    send()
                    state['attempts']=state.get('attempts',0)+1
                    state['lastAttemptAt']=int(now);state['nextAttemptAt']=int(now+RETRY_SECONDS)
                    state['status']='awaiting_online';changed=True
        else: raise ValueError('INVALID_ACTION')
        if changed:
            fd,tmp=tempfile.mkstemp(dir=folder,prefix='wake-');os.fchmod(fd,0o600)
            with os.fdopen(fd,'w') as stream: json.dump(state,stream)
            os.replace(tmp,file)
        return state

if __name__ == '__main__':
    try:
        action=sys.argv[1] if len(sys.argv)>1 else 'status'
        raw=sys.stdin.read(4097) if action!='tick' else '{}'
        if len(raw)>4096:raise ValueError('BODY_TOO_LARGE')
        print(json.dumps(operate(action,json.loads(raw or '{}'),Path(__file__).resolve().parents[1]/'.visipro/power')))
    except Exception as exc:
        code=str(exc) if isinstance(exc,ValueError) else 'POWER_SERVICE_UNAVAILABLE'
        print(json.dumps({'error':code}));sys.exit(1)
