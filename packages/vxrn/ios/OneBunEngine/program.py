# the bun engine links its runtime into the app executable and the compiled
# program into the executable's __TEXT,__bun, so an App Store binary keeps one
# executable segment. a program is bound to its runtime only by the stamp and
# identity (the executable's LC_UUID) in its image header, so it compiles
# against a template executable before the app links and gets the app's
# identity after.
#   template <executable> <out> [identity source]: copies a linked executable
#     for bun compile without the LC_ENCRYPTION_INFO_64 it cannot move, and
#     with the LC_UUID of another executable when given
#   extract <compiled> <out>: writes bun compile's program, its __BUN,__bun
#   identity <app> <program>: writes the stamp and identity of a program
#     compiled against the app's identity into the app's own program
import struct, sys

LC_SEGMENT_64, LC_UUID, LC_ENCRYPTION_INFO_64 = 0x19, 0x1b, 0x2c
IMAGE_MAGIC, PAGE = b'BUNAOT01', 0x4000


def commands(b):
    offset = 32
    for _ in range(struct.unpack_from('<I', b, 16)[0]):
        command, size = struct.unpack_from('<II', b, offset)
        yield command, offset
        offset += size


def uuid_at(b):
    return next(offset + 8 for command, offset in commands(b) if command == LC_UUID)


def section(b, segment, name):
    for command, offset in commands(b):
        if command == LC_SEGMENT_64 and b[offset + 8:offset + 24].rstrip(b'\0') == segment:
            for index in range(struct.unpack_from('<I', b, offset + 64)[0]):
                at = offset + 72 + 80 * index
                if b[at:at + 16].rstrip(b'\0') == name:
                    size, = struct.unpack_from('<Q', b, at + 40)
                    file_offset, = struct.unpack_from('<I', b, at + 48)
                    return file_offset, size
    sys.exit(f'[one] bun engine: no {segment.decode()},{name.decode()} section')


def image_header(b, start, size):
    for at in range(start, start + size, PAGE):
        if b[at:at + 8] == IMAGE_MAGIC:
            return at
    sys.exit('[one] bun engine: the program has no image header')


action, source, target = sys.argv[1:4]
b = bytearray(open(source, 'rb').read())
if action == 'template':
    for command, offset in commands(b):
        if command == LC_ENCRYPTION_INFO_64:
            count, size = struct.unpack_from('<II', b, 16)
            end = 32 + size
            b[offset:end] = b[offset + 24:end] + bytes(24)
            struct.pack_into('<II', b, 16, count - 1, size - 24)
            break
    if len(sys.argv) > 4:
        other = open(sys.argv[4], 'rb').read()
        at = uuid_at(b)
        b[at:at + 16] = other[uuid_at(other):uuid_at(other) + 16]
    open(target, 'wb').write(b)
elif action == 'extract':
    offset, size = section(b, b'__BUN', b'__bun')
    open(target, 'wb').write(b[offset:offset + size])
elif action == 'identity':
    program = open(target, 'rb').read()
    reference = image_header(program, 0, len(program))
    offset, size = section(b, b'__TEXT', b'__bun')
    header = image_header(b, offset, size)
    identity = b[uuid_at(b):uuid_at(b) + 16]
    if program[reference + 16:reference + 32] != identity:
        sys.exit('[one] bun engine: the reference program was compiled for another identity')
    b[header + 8:header + 32] = program[reference + 8:reference + 32]
    open(source, 'wb').write(b)
else:
    sys.exit('usage: program.py template|extract|identity <source> <target> [identity source]')
