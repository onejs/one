from pathlib import Path
import hashlib,json,os,shutil,subprocess,tarfile

root=Path(__file__).resolve().parent
out=root/'evidence/tamagui-pr4334'
out.mkdir(parents=True,exist_ok=True)
source='c067377b354833535b866865a60c2fb5fe84182a'
remote_tree='/Users/n8/.worktrees/tamagui-one-276'
remote_out=remote_tree+'/.build/one-round2-s42774'
script="""set -euo pipefail
test "$(git rev-parse HEAD)" = c067377b354833535b866865a60c2fb5fe84182a
git diff --exit-code -- code/compiler/static
mkdir -p .build/one-round2-s42774
(cd code/compiler/static && bun run build) > .build/one-round2-s42774/build.log 2>&1
git rev-parse HEAD > .build/one-round2-s42774/source.txt
tar -czf .build/one-round2-s42774/static-dist.tgz -C code/compiler/static dist
shasum -a 256 .build/one-round2-s42774/static-dist.tgz
git status --short -- code/compiler/static
"""
with (out/'remote-build.log').open('w') as log:
    subprocess.run(['tm','exec','pro-128','--cwd',remote_tree,'--timeout','20m','--','tm','window','run','heavy','--local','--narrow','--wait','--timeout','15m','--','bash','-c',script],stdout=log,stderr=subprocess.STDOUT,check=True)
subprocess.run(['rsync','-a','-e','ssh -o BatchMode=yes',f'pro-128.local:{remote_out}/',str(out/'built')+'/'],check=True)
assert (out/'built/source.txt').read_text().strip()==source
candidate=out/'candidate'
candidate.mkdir(exist_ok=True)
with tarfile.open(out/'built/static-dist.tgz') as archive:
    archive.extractall(candidate,filter='data')
installed=root/'one/node_modules/@tamagui/static/dist'
backup=out/'control-dist'
assert not backup.exists()
def snapshot(folder):
    return {str(p.relative_to(folder)):hashlib.sha256(p.read_bytes()).hexdigest() for p in folder.rglob('*') if p.is_file()}
before=snapshot(installed)
shutil.copytree(installed,backup)
compiled=snapshot(candidate/'dist')
(out/'provenance.json').write_text(json.dumps({'source':source,'buildHost':'pro-128','fixtureHost':'studio-64','artifactSha256':hashlib.sha256((out/'built/static-dist.tgz').read_bytes()).hexdigest(),'control':before,'candidate':compiled,'performanceAcceptance':False},indent=2)+'\n')
try:
    shutil.rmtree(installed)
    shutil.copytree(candidate/'dist',installed)
    assert snapshot(installed)==compiled
    env={**os.environ,'ONE_ROUND2_DIAGNOSTIC':'1','ONE_ROUND2_CONTEXT_BRIDGE':'da7865e5f','ONE_ROUND2_TAMAGUI_SOURCE':source,'ONE_ROUND2_OUTPUT':'tamagui-pr4334/runtime'}
    with (out/'fixture-run.log').open('w') as log:
        result=subprocess.run(['tm','window','run','heavy','--local','--service','--timeout','30m','--','node',str(root/'confirm-vendor-memory.mjs'),'control','1'],env=env,stdout=log,stderr=subprocess.STDOUT)
finally:
    shutil.rmtree(installed)
    shutil.copytree(backup,installed)
    restored=snapshot(installed)
    assert restored==before
    (out/'restored.json').write_text(json.dumps({'restored':True,'files':len(restored),'source':source},indent=2)+'\n')
    cleanup="import shutil; shutil.rmtree('/Users/n8/.worktrees/tamagui-one-276/.build/one-round2-s42774')"
    with (out/'remote-cleanup.log').open('w') as log:
        subprocess.run(['tm','exec','pro-128','--timeout','30s','--','python3','-c',cleanup],stdout=log,stderr=subprocess.STDOUT,check=True)
print(json.dumps({'fixtureExitCode':result.returncode,'installedStaticRestored':True,'log':str(out/'fixture-run.log')}))
raise SystemExit(result.returncode)
