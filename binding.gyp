{
  "targets": [
    {
      "target_name": "mtrace",
      "sources": [ "mtrace.cc" ],
      "actions": [
        {
          "action_name": "make_symlink",
          "inputs": [ ],
          "outputs": [ "dummy_output" ],
          "action": [ "ln", "-sf", "build/Release/mtrace.node" ]
        }
      ]
    }
  ]
}
