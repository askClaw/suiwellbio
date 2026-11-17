"""Publish a clean committed dist/ through a verified atomic release switch."""
from datetime import datetime, timezone
from pathlib import Path
import hashlib, json, subprocess, tarfile, tempfile

root=Path(__file__).resolve().parent.parent
if subprocess.check_output(['git','status','--porcelain'],cwd=root,text=True).strip():
    raise SystemExit('Commit the worktree before deploying.')
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
version=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'-'+commit[:12]
files=sorted(p for p in (root/'dist').rglob('*') if p.is_file())
if not files or len(list((root/'dist').glob('*.html')))!=8:
    raise SystemExit('Build dist/ with npm run build:site first.')
remote=r'''
from pathlib import Path
import hashlib, json, os, re, sys, tarfile
version,commit,archive,manifest=sys.argv[1:]
assert re.fullmatch(r'[0-9TZ]+-[a-f0-9]{12}',version)
base=Path('/srv/nickidea');current=base/'current';web=Path('/home/plus.forsize.cn/nickidea')
target=base/'releases'/version;backup=base/'backups'/version
assert current.is_symlink() and web.is_symlink() and os.readlink(web)==str(current)
previous=os.readlink(current)
assert Path(previous).is_dir() and not target.exists() and not backup.exists()
target.mkdir(mode=0o755);backup.mkdir(mode=0o755)
with tarfile.open(archive,'r:gz') as bundle:
    for member in bundle.getmembers():
        path=Path(member.name)
        assert member.isfile() and not path.is_absolute() and '..' not in path.parts
    bundle.extractall(target,filter='data')
expected={}
for line in Path(manifest).read_text().splitlines():
    digest,name=line.split('  ',1);expected[name]=digest
actual={p.relative_to(target).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in target.rglob('*') if p.is_file()}
assert actual==expected,'Release manifest mismatch'
for path in [target,*target.rglob('*')]:path.chmod(0o755 if path.is_dir() else 0o644)
record={'release':str(target),'previous':previous,'source_commit':commit,'files':len(actual)}
(backup/'source-commit.txt').write_text(commit+'\n')
(backup/'files.sha256').write_text(Path(manifest).read_text())
(backup/'deployment.json').write_text(json.dumps(record,indent=2)+'\n')
assert os.readlink(current)==previous,'Current release changed during staging'
temporary=base/('current.'+version+'.next');temporary.symlink_to(target);os.replace(temporary,current)
Path(archive).unlink();Path(manifest).unlink()
print(json.dumps(record))
'''
with tempfile.TemporaryDirectory(prefix='nickidea-release-') as directory:
    directory=Path(directory);archive=directory/f'{version}.tar.gz';manifest=directory/f'{version}.sha256'
    manifest.write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.relative_to(root/'dist').as_posix()+'\n' for p in files))
    with tarfile.open(archive,'w:gz') as bundle:
        for path in files:bundle.add(path,arcname=path.relative_to(root/'dist').as_posix(),recursive=False)
    subprocess.run(['scp','-q',str(archive),str(manifest),'forsize:/tmp/'],check=True)
    result=subprocess.run(['ssh','-o','BatchMode=yes','forsize','python3','-',version,commit,'/tmp/'+archive.name,'/tmp/'+manifest.name],input=remote,text=True,capture_output=True)
    print(result.stdout,end='');print(result.stderr,end='')
    if result.returncode:raise SystemExit(result.returncode)
