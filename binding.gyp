{
  "targets": [
    {
      "target_name": "mtrace",
      "sources": [ "mtrace.cc" ],
      "include_dirs" : [
        "<!(node -e \"require('nan')\")"
      ]
    }
  ]
}
