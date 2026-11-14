# bun compile writes a program only into an executable, behind the runtime's
# own segments. `template` copies the runtime dylib with its LC_ID_DYLIB shown as
# a load command so bun compile takes it; `extract` writes the compiled
# program, the __BUN,__bun section, to a file.
import struct, sys

LC_SEGMENT_64, LC_ID_DYLIB, LC_LOAD_DYLIB = 0x19, 0xd, 0xc
ID = b'@rpath/Bun.framework/Bun'
action, source, target = sys.argv[1:4]
b = bytearray(open(source, 'rb').read())


def commands():
    offset = 32
    for _ in range(struct.unpack_from('<I', b, 16)[0]):
        command, size = struct.unpack_from('<II', b, offset)
        yield command, offset
        offset += size


def name(at):
    return bytes(b[at:b.index(0, at)])


if action == 'template':
    for command, offset in commands():
        if command == LC_ID_DYLIB and name(offset + struct.unpack_from('<I', b, offset + 8)[0]) == ID:
            struct.pack_into('<I', b, offset, LC_LOAD_DYLIB)
            break
    else:
        sys.exit(f'[one] bun engine: {source} is not {ID.decode()}')
    open(target, 'wb').write(b)
elif action == 'extract':
    for command, offset in commands():
        if command == LC_SEGMENT_64 and name(offset + 8).startswith(b'__BUN'):
            for section in range(struct.unpack_from('<I', b, offset + 64)[0]):
                at = offset + 72 + 80 * section
                if name(at).startswith(b'__bun'):
                    size, = struct.unpack_from('<Q', b, at + 40)
                    file_offset, = struct.unpack_from('<I', b, at + 48)
                    open(target, 'wb').write(b[file_offset:file_offset + size])
                    sys.exit(0)
    sys.exit(f'[one] bun engine: {source} has no compiled program')
else:
    sys.exit(f'usage: program.py template|extract <source> <target>')
