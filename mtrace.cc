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

NAN_METHOD(GCMTrace) {
	Nan::HandleScope scope;
	while (!Nan::IdleNotification(500));
	info.GetReturnValue().SetUndefined();
}

NAN_METHOD(wrapMTrace) {
	Nan::HandleScope scope;
#ifndef DISABLED
	const char *filename;
	std::string sfilename;
	char buf[64];
	if (info.Length() >= 1 && info[0]->IsString()) {
		// get filename
		String::Utf8Value utf8_value(info[0]);
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
	info.GetReturnValue().Set(Nan::New<String>(filename).ToLocalChecked());
#else
	info.GetReturnValue().SetUndefined();
#endif
}

NAN_METHOD(wrapMUnTrace) {
	Nan::HandleScope scope;
#ifndef DISABLED
	muntrace();
#endif

	info.GetReturnValue().SetUndefined();
}

extern "C" {
  NAN_MODULE_INIT(init) {
		Nan::HandleScope scope;
		
		Nan::Set(target, Nan::New("mtrace").ToLocalChecked(), Nan::GetFunction(Nan::New<FunctionTemplate>(wrapMTrace)).ToLocalChecked() );
		Nan::Set(target, Nan::New("muntrace").ToLocalChecked(), Nan::GetFunction(Nan::New<FunctionTemplate>(wrapMUnTrace)).ToLocalChecked());
		Nan::Set(target, Nan::New("gc").ToLocalChecked(), Nan::GetFunction(Nan::New<FunctionTemplate>(GCMTrace)).ToLocalChecked());
  }

  NODE_MODULE(mtrace, init);
}
