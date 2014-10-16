# node-mtrace

Native memory tracing and mtrace log parsing for node.

## Supported Platforms

Linux only.

## Usage

Install with npm:
```npm install mtrace```

Generating a mtrace:

``` javascript
var mtrace = require('mtrace');
var filename = mtrace.mtrace();
if (filename) {
  console.log('Saving mtrace to ' + filename);
} else {
  console.log('mtrace not supported');
}
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
its output rather uselss in any real-world application (lists thousands or
millions of allocations in an unsorted list, and has meager symbol lookup).
Your mileage on this may vary.

The raw log can however sometimes be very useful for tracking harder to
identify allocations (like those that show up as just "operator new" from C++
files) by looking at allocation sizes and patterns and comparing them to known
structure sizes, etc.

This module includes a simple little parser to generate summarized information
showing useful high-level information on outstanding allocations.  The
"Traffic" column indicates total alloc/free events from that call site, which
can be useful for tracking performance-impacting heap thrashing.

```
$ ./node_modules/.bin/mtrace.js mtrace.1234.0
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
$ ./node_modules/.bin/mtrace.js mtrace.1234.0 1234
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

## Requirements

Tested on Ubuntu, should work on any flavor of Linux.

Requires gdb to be installed to get good symbol information.

## Special Thanks

Uses [easy-table](https://github.com/eldargab/easy-table).  
Initial NPM packaging by [christopherobin](https://github.com/christopherobin).
