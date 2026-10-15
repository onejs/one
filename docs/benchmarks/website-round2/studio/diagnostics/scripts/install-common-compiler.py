from pathlib import Path
import hashlib,json,shutil,subprocess
root=Path(__file__).resolve().parent
proof=root/'evidence/tamagui-pr4334'
original=json.loads((proof/'provenance.json').read_text())
fixed=proof/'candidate/dist'
def hashes(folder):
    return {str(p.relative_to(folder)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(folder.rglob('*')) if p.is_file()}
assert hashes(fixed)==original['candidate']
assert hashlib.sha256((proof/'built/static-dist.tgz').read_bytes()).hexdigest()==original['artifactSha256']
out=root/'evidence/ssr-vendor-source'
compiler={k:original[k] for k in ['source','buildHost','artifactSha256']}
compiler['files']=original['candidate']
compiler['fixtureManifests']={}
for name in ['one','start']:
    installed=root/name/'node_modules/@tamagui/static/dist'
    before=out/(name+'-compiler-original')
    assert not before.exists()
    shutil.copytree(installed,before)
    compiler['fixtureManifests'][name]=json.loads((installed.parent/'package.json').read_text())['version']
    shutil.rmtree(installed)
    shutil.copytree(fixed,installed)
    assert hashes(installed)==compiler['files']
provenance={'baseline':'13e6ab192ae5256bb4bcf35f3c01fb1e625b7967','candidate':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'compiler':compiler,'familyBuild':'normal release --into, SKIP_TYPES=1 for inherited type-generation failure; runtime builds unchanged','quietAcceptance':False}
(out/'provenance.json').write_text(json.dumps(provenance,indent=2)+'\n')
print(json.dumps({'compilerSource':compiler['source'],'files':len(compiler['files']),'fixtures':['one','start']}))
