from pathlib import Path
import tarfile,hashlib,json,subprocess,shutil
root=Path(__file__).resolve().parent
archive=root/'compiler.tgz'
assert hashlib.sha256(archive.read_bytes()).hexdigest()=='d66598611834ba95c890f21272109362074ad8a20a67c7b3adf4ae9aeb6afabd'
for site in ['one','start']:
 target=root/site/'node_modules/@tamagui/static'
 with tarfile.open(archive) as t:
  t.extractall(target,filter='data')
versions={site:{name:json.loads((root/site/'node_modules'/name/'package.json').read_text())['version'] for name in ['react','react-dom','vite','tamagui','@vxrn/mdx-rust','oxc-transform-react']} for site in ['one','start']}
assert versions['one']==versions['start'],versions
proof={'source':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'compilerArtifact':hashlib.sha256(archive.read_bytes()).hexdigest(),'compilerSource':'c067377b354833535b866865a60c2fb5fe84182a','versions':versions,'host':subprocess.check_output(['hostname'],text=True).strip()}
(root/'evidence/setup/provenance.json').write_text(json.dumps(proof,indent=2)+'\n')
print(json.dumps(proof))
