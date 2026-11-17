"""Compare every published HTTPS file with dist/ and check private-path 404s."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import Request, urlopen
import hashlib,sys

root=Path(__file__).resolve().parent.parent/'dist'
base=(sys.argv[1] if len(sys.argv)>1 else 'https://plus.forsize.cn/nickidea/').rstrip('/')+'/'
files=sorted(p for p in root.rglob('*') if p.is_file())
if not files:raise SystemExit('Build dist/ before verifying.')
def verify(path):
    name=path.relative_to(root).as_posix()
    try:
        request=Request(base+quote(name),headers={'Accept-Encoding':'identity','Cache-Control':'no-cache'})
        with urlopen(request,timeout=25) as response:data=response.read();status=response.status
        if status!=200 or hashlib.sha256(data).digest()!=hashlib.sha256(path.read_bytes()).digest():return name+' mismatch'
    except Exception as error:return name+' '+str(error)
with ThreadPoolExecutor(max_workers=12) as pool:errors=[error for error in pool.map(verify,files) if error]
for name in ['__missing__.html','docs/PSD_PRECISION_REVIEW.md','.git/config']:
    try:
        with urlopen(base+name,timeout=25) as response:errors.append(name+' returned '+str(response.status))
    except HTTPError as error:
        if error.code!=404:errors.append(name+' returned '+str(error.code))
print(f'HTTPS files checked: {len(files)}; errors: {len(errors)}')
for error in errors:print(error)
if errors:raise SystemExit(1)
