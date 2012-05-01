import Options
from os import unlink, symlink, popen
from os.path import exists

srcdir = "."
blddir = "build"
VERSION = "0.0.1"

def set_options(opt):
  opt.tool_options("compiler_cxx")

def configure(conf):
  conf.check_tool("compiler_cxx")
  conf.check_tool("node_addon")

def build(bld):
  obj = bld.new_task_gen("cxx", "shlib", "node_addon")
  obj.target = "mtrace"
  obj.source = "mtrace.cc"

def shutdown():
  if Options.commands['clean']:
    if exists('mtrace.node'): unlink('mtrace.node')
  else:
    if exists('build/Release/mtrace.node') and not exists('mtrace.node'):
      symlink('build/Release/mtrace.node', 'mtrace.node')
    else:
      if exists('build/default/mtrace.node') and not exists('mtrace.node'):
        symlink('build/default/mtrace.node', 'mtrace.node')

