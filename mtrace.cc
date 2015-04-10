#if defined(__APPLE__) || defined(__CYGWIN__) || defined(WIN32)
// mtrace doesn't seem to exist on OSX, simply have this module do nothing
#define DISABLED
#endif

#include <nan.h>

#ifndef DISABLED
#include <mcheck.h>
#include <unistd.h>
#endif
#include <stdio.h>
#include <stdlib.h>
#include <string>

using namespace node;
using namespace v8;

NAN_METHOD(GC) {
	NanScope();
	while (!NanIdleNotification(500));
	NanReturnValue(NanUndefined());
}

NAN_METHOD(wrapMTrace) {
	NanScope();
#ifndef DISABLED
	const char *filename;
	std::string sfilename;
	char buf[64];
	if (args.Length() >= 1 && args[0]->IsString()) {
		// get filename
		String::Utf8Value utf8_value(args[0]);
		sfilename.assign(*utf8_value);
		filename = sfilename.c_str();
	} else {
		static int counter = 0;
		pid_t pid = getpid();
		long long int llpid = pid;
		sprintf(buf, "mtrace.%Ld.%d", llpid, counter++);
		filename = buf;
	}
	setenv("MALLOC_TRACE", filename, 1);

	mtrace();
	NanReturnValue(NanNew<String>(filename));
#else
	NanReturnValue(NanUndefined());
#endif
}

NAN_METHOD(wrapMUnTrace) {
	NanScope();
#ifndef DISABLED
	muntrace();
#endif

	NanReturnValue(NanUndefined());
}

extern "C" {
  static void init(Handle<Object> module_exports) {
		NanScope();

		NODE_SET_METHOD(module_exports, "mtrace", wrapMTrace);
		NODE_SET_METHOD(module_exports, "muntrace", wrapMUnTrace);
		NODE_SET_METHOD(module_exports, "gc", GC);
  }

  NODE_MODULE(mtrace, init);
}
