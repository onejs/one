The speed benchmark uses a 4000 × 3000 JPEG crop of **Fronalpstock big**,
photographed by **Thomas Wolf** and shared under **CC BY-SA 3.0**.

Original and attribution: https://commons.wikimedia.org/wiki/File:Fronalpstock_big.jpg
License: https://creativecommons.org/licenses/by-sa/3.0/

Created with sharp from the original 10109 × 4542 JPEG, resizing with
`resize(4000, 3000, { fit: 'cover' })` and JPEG quality 95. Both implementations
read the same file and produce a 1000 × 750 result at JPEG quality 90, or PNG.
The source file and output dimensions are asserted before accepting timings.
