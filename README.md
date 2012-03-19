# node-mtrace

Native memory tracing and mtrace log parsing for node.

## Usage

Build with node-waf.

Generating a mtrace:

``` javascript
var mtrace = require('mtrace.node');
var filename = mtrace.mtrace();
console.log('Saving mtrace to ' + filename);
// do stuff
// exit program, or, force a flush
mtrace.gc(); // Optionally force a garbage collect so destructors are called
mtrace.muntrace();
// start tracing again
mtrace.mtrace();
```

mtrace() takes an optional parameter to specify a filename to save to, otherwise
it generates a unique filename based on process pid and call count (first file
is "mtrace.[pid].0", etc).

## Viewing the mtrace log

There's a built-in command line tool that's part of GCC called mtrace.  I find
its output completely uselss in any real-world applications (lists thousands or
millions of allocations in an unsorted list, and has meager symbol lookup).
Your mileage on this may vary.

This module includes a simple little parser to generate summarized information
```
$ node mtrace.js mtrace.1234.0
Addr       Size       Count  Traffic  Module                            Symbol                                            Offs
---------  ---------  -----  -------  --------------------------------  ------------------------------------------------  ------
 0xd0c080   15 bytes      1      197  /lib/tls/i686/cmov/libc.so.6      __strdup                                          +0x30
0x84573f4  100 bytes      1      391  node                              eio_custom                                        +0x1a
 0x341fda  120 bytes      6        6  ...les/native/bullet/bullet.node  _ZN13PhysicsEntity16addCollisionMeshER11btTra...  +0x5e
0x844bd10  296 bytes      2        2  node                                                                                und...
0x840ddaf    9.43 KB      2     1024  node                              _ZN2v88internal8Malloced3NewEj                    +0xf
 0x34200d   13.59 KB      6        6  ...les/native/bullet/bullet.node  _ZN13PhysicsEntity16addCollisionMeshER11btTra...  +0x91
 0x341ff1   54.38 KB      6        6  ...les/native/bullet/bullet.node  _ZN13PhysicsEntity16addCollisionMeshER11btTra...  +0x75
 0x2c8c07    3.03 MB   8976    59094  /usr/lib/libstdc++.so.6           _Znwj                                             +0x27
 0x3c7bad   81.15 MB  10915    28901  ...les/native/bullet/bullet.node                                                    und...
---------  ---------  -----  -------  --------------------------------  ------------------------------------------------  ------
   TOTALS   84.25 MB  19915    90195
```

Or, even better, if the process the mtrace was dumped from is still running, we
can get very accurate symbol information by specifying a pid:
```
$ node mtrace.js mtrace.1234.0 pid
Addr       Size       Count  Traffic  Module                            Symbol
---------  ---------  -----  -------  --------------------------------  ------------------------------------------------
 0xd0c080   15 bytes      1      197  /lib/tls/i686/cmov/libc.so.6      strdup
0x84573f4  100 bytes      1      391  node                              eio_custom
 0x341fda  120 bytes      6        6  ...les/native/bullet/bullet.node  PhysicsEntity::addCollisionMesh(btTransform&,...
0x844bd10  296 bytes      2        2  node                              ev_realloc_emul
0x840ddaf    9.43 KB      2     1024  node                              v8::internal::Malloced::New(unsigned int)
 0x34200d   13.59 KB      6        6  ...les/native/bullet/bullet.node  PhysicsEntity::addCollisionMesh(btTransform&,...
 0x341ff1   54.38 KB      6        6  ...les/native/bullet/bullet.node  PhysicsEntity::addCollisionMesh(btTransform&,...
 0x2c8c07    3.03 MB   8976    59094  /usr/lib/libstdc++.so.6           operator new(unsigned int)
 0x3c7bad   81.15 MB  10915    28901  ...les/native/bullet/bullet.node  btAllocDefault(unsigned int)
---------  ---------  -----  -------  --------------------------------  ------------------------------------------------
   TOTALS   84.25 MB  19915    90195
```

If you want to use this module's sweet mtrace parsing functionality but not for
a node app, just change the one reference to "node" in mtrace.js (one of the
arguments to gdb) to your executable, or let me know and I can make it take it
as a parameter.

If you want to convert this module to use node-gyp and/or be npm-friendly (I
know nothing of either at the moment, we use our own custom build system),
please send me a pull request!

## Requirements

Tested on Ubuntu, should work on any flavor of Linux.

Requites gdb to be installed to get good symbol information.

## Special Thanks

Uses a modified version of [easy-table](https://github.com/eldargab/easy-table).