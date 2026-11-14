# bun compile writes only into executables, so hide a dylib's LC_ID_DYLIB as a
# load command while it compiles and put it back after
import struct, sys

LC_ID_DYLIB, LC_LOAD_DYLIB = 0xd, 0xc
ID = b'@rpath/Bun.framework/Bun'
path, action = sys.argv[1], sys.argv[2]
b = bytearray(open(path, 'rb').read())
offset = 32
for _ in range(struct.unpack_from('<I', b, 16)[0]):
    command, size = struct.unpack_from('<II', b, offset)
    name_at = offset + struct.unpack_from('<I', b, offset + 8)[0]
    if command in (LC_ID_DYLIB, LC_LOAD_DYLIB) and b[name_at:b.index(0, name_at)] == ID:
        struct.pack_into('<I', b, offset, LC_LOAD_DYLIB if action == 'hide' else LC_ID_DYLIB)
        break
    offset += size
else:
    sys.exit(f'[one] bun engine: {path} names no {ID.decode()}')
open(path, 'wb').write(b)
