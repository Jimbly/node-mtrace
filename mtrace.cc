#if defined(__APPLE__) || defined(__CYGWIN__) || defined(WIN32)
// mtrace doesn't seem to exist on OSX, simply have this module do nothing
#define DISABLED
#endif

#include <v8.h>
#include <node.h>

#ifndef DISABLED
#include <mcheck.h>
#include <unistd.h>
#endif
#include <stdio.h>
#include <stdlib.h>
#include <string>

using namespace v8;
using namespace node;

static Handle<Value> GC(const Arguments& args) {
	while (!V8::IdleNotification());
	return Undefined();
}

static Handle<Value> wrapMTrace(const Arguments &args) {
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
	return String::New(filename);
#else
	return Undefined();
#endif
}

static Handle<Value> wrapMUnTrace(const Arguments &args) {
#ifndef DISABLED
	muntrace();
#endif

	return Undefined();
}

extern "C" {
  static void init(Handle<Object> module_exports) {
    HandleScope scope;

		NODE_SET_METHOD(module_exports, "mtrace", wrapMTrace);
		NODE_SET_METHOD(module_exports, "muntrace", wrapMUnTrace);
		NODE_SET_METHOD(module_exports, "gc", GC);
  }

  NODE_MODULE(mtrace, init);
}
