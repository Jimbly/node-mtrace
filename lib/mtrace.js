#!/usr/bin/env node

var fs = require('fs');
var child_process = require('child_process');
var Table = require('easy-table')

// add our own ".total()" method on the Table object
Table.prototype.totals = function(keys, label) {
    keys = keys || Object.keys(this.columns);
    label = label || 'Totals';
    var totals = {};
    var ii, jj, key;
    for (ii in this.rows) {
        var line = this.rows[ii];
        for (jj in keys) {
            key = keys[jj];
            var val = line[key];
            if (typeof val === 'number') {
                totals[key] = (totals[key] || 0) + val;
            }
        }
    }
    // then totals
    var first = true;
    for (key in this.columns) {
        if (totals[key]) {
            this.cell(key, totals[key]);
        } else if (first) {
            // first item, add label
            this.cell(key, label);
        } else {
            // Put in empty string instead of 'undefined'
            this.cell(key, '');
        }
        first = false;
    }
    // save totals cells
    var totalLine = this.row;
    this.row = {__printers : {}};
    // build divider
    for (key in this.columns) {
        var col = this.columns[key];
        this.cell(key, (new Array(col.length+1)).join('-'));
    }
    // but insert it manually before our totals
    this.rows.push(this.row);
    this.rows.push(totalLine);
    this.row = {__printers : {}};
};

var _bytes_unit_spec = [
  { name: 'bytes', threshold: 1000, singular: 'byte' },
  { name: 'KB', divisor: 1024, threshold: 1000 * 1000 },
  { name: 'MB', divisor: 1024 * 1024, threshold: 1000 * 1000 * 1000 },
  { name: 'GB', divisor: 1024 * 1024 * 1024, threshold: 1000 * 1000 * 1000 * 1000 },
  { name: 'TB', divisor: 1024 * 1024 * 1024 * 1024, threshold: 1000 * 1000 * 1000 * 1000 * 1000 }
];

function friendlyBytes(num_bytes) {
  var ii;
  var us = _bytes_unit_spec;
  for (ii = 0; ii < us.length-1 && num_bytes >= us[ii].threshold; ++ii) {
  }
  if (us[ii].divisor) {
    num_bytes = (num_bytes / us[ii].divisor).toFixed(2);
  } else if (num_bytes === 1 && us[ii].singular) {
    return '1 ' + us[ii].singular;
  }
  return num_bytes + ' ' + us[ii].name;
}


function errexit() {
  console.log('Expected usage: mtrace tracefile [pid]');
  console.log('  If provided, an active process will be used to look up symbol information');
  process.stdout.write('', function() {
    process.exit(1);
  });
}

if (process.argv.length < 3) {
  return errexit();
}

var symbol_lookup_pid;
if (process.argv.length >= 4) {
  symbol_lookup_pid = process.argv[3];
}

var stream = fs.createReadStream(process.argv[2]);
if (!stream) {
    console.log('File not found: ' + process.argv[2]);
    return errexit();
}
stream.on('error', function(err) {
  console.log('Error reading file: ' + err);
  errexit();
});

function h2i(hex_string) {
  if (!hex_string) {
    return 0;
  }
  return parseInt(hex_string, 16);
}
function i2h(int) {
  if (!int) {
    return ''; 
  }
  return '0x' + int.toString(16);
}

var line_regex = /^@ ([^\:]+):(?:\(([^)]+)\+0x([0-9a-f]+)\))?\[0x([0-9a-f]+)\] (-|\+|<|>) 0x([0-9a-f]+)(?: 0x([0-9a-f]+))?$/;
var linenum=0;
var mem = {}; // ptr_addr -> {size, module, site_addr}
var addr = {}; // addr -> { module, [symbol], [symbol_offs], count, total_size, traffic_count, traffic_size }
function emitLine(line) {
  var c = line[0];
  ++linenum;
  if (c === '=') {
    // ignore
  } else if (c === '@') {
    var match = line.match(line_regex);
    if (!match) {
      return console.log('regex fail on line ' + linenum + ': "' + line + '"');
    }
    var module = match[1];
    var symbol = match[2]; // opt
    var symbol_offs = h2i(match[3]); // opt, hex
    var site_addr = h2i(match[4]); // hex
    var op = match[5]; // + or -, < or >
    var ptr_addr = h2i(match[6]); // hex
    var size = h2i(match[7]); // hex

    if (op === '-' || op === '<') {
      var alloc_data = mem[ptr_addr];
      if (alloc_data) {
        var site_data = addr[alloc_data.site_addr]
        --site_data.count;
        ++site_data.traffic_count;
        site_data.total_size -= alloc_data.size;
        site_data.traffic_size += alloc_data.size;
        delete mem[ptr_addr];
      } else {
        // warning: freeing unmatched alloc
      }
    } else if (op === '+' || op === '>') {
      mem[ptr_addr] = { size: size, site_addr: site_addr };
      var site_data = addr[site_addr];
      if (!site_data) {
        addr[site_addr] = site_data = { module: module, symbol: symbol, symbol_offs: symbol_offs, count: 0, total_size: 0, traffic_count: 0, traffic_size: 0 };
      }
      ++site_data.count;
      ++site_data.traffic_count;
      site_data.total_size += size;
      site_data.traffic_size += size;
    }
  } else {
    console.log('unrecognized type on line ' + linenum + ': "' + line + '"');
  }
}
function finish() {
  console.log('parsed ' + linenum + ' lines');
  var t = new Table();
  var total = { total_size: 0, count: 0, traffic_count: 0, traffic_size: 0 };
  function printBytes(obj, len) {
    return Table.padLeft(friendlyBytes(obj), len);
  }
  function printModule(obj) {
    if (!obj) {
      return '';
    }
    if (obj.length > 32) {
      return '...' + obj.slice(-29);
    }
    return obj;
  }
  function printSymbol(obj) {
    if (!obj) {
      return '';
    }
    if (obj.length > 48) {
      return obj.slice(0, 45) + '...';
    }
    return obj;
  }
  for (var site_addr in addr) {
    var site_data = addr[site_addr];
    t.cell('Addr', i2h(+site_addr), Table.padLeft);
    t.cell('Size', site_data.total_size, printBytes);
    t.cell('Count', site_data.count, Table.padLeft);
    t.cell('Traffic', site_data.traffic_count, Table.padLeft);
    t.cell('Module', site_data.module, printModule);
    if (site_data.symbol) {
      t.cell('Symbol', site_data.symbol, printSymbol);
    }
    if (site_data.symbol_offs) {
      t.cell('Offs', '+' + i2h(site_data.symbol_offs));
    }
    for (var key in total) {
      total[key] += site_data[key] || 0;
    }
    t.newRow();
  }
  t.sort(['Size', 'Count', 'Traffic']);
  t.totals(['Size', 'Count', 'Traffic']);
  console.log(t.toString());
}
function finishedParsing() {
  // Look up symbols
  if (!symbol_lookup_pid) {
    return finish();
  }
  var lines = [];
  var prefix = 'MTRACE_SYMBOL_';
  for (var site_addr in addr) {
    lines.push('echo ' + prefix + site_addr + ':');
    lines.push('info symbol ' + site_addr);
  }
  lines.push('q');
  var temp_file = '/tmp/mtrace_' + process.pid + '.cmds';
  fs.writeFile(temp_file, lines.join('\n'), function(err) {
    if (err) {
      console.error('Error writing ' + temp_file + ' for symbol lookup: ' + err + ', proceeding without symbols');
      return finish();
    }
    child_process.exec('gdb -x ' + temp_file + ' node ' + symbol_lookup_pid,
      function(err, stdout, stderr) {
        // remove temp file regardless of gdb run result
        fs.unlink(temp_file, function() {
          if (err) { // gdb error, not unlink error
            console.error('Error running gdb: ' + err);
            return finish();
          }
          for (var site_addr in addr) {
            var tag = prefix + site_addr + ':';
            var idx = stdout.indexOf(tag);
            if (idx === -1) {
              console.error('No gdb symbol line for ' + site_addr);
              continue;
            }
            idx += tag.length;
            var end_idx = stdout.indexOf('\n', idx);
            if (end_idx === -1) {
              end_idx = stdout.length;
            }
            if (end_idx === idx) {
              ++idx;
              end_idx = stdout.indexOf('\n', idx);
              if (end_idx === -1) {
                end_idx = stdout.length;
              }
            }
            var line = stdout.slice(idx, end_idx);
            if (line.slice(0, 9) === 'No symbol') {
              addr[site_addr].symbol = addr[site_addr].symbol || 'No symbol';
            } else {
              // found something!
              addr[site_addr].symbol = line.split(' + ')[0];
              addr[site_addr].symbol_offs = '';
            }
          }
          finish();
        });
      });
  });
}

var accum = '';
stream.on('data', function(data) {
  accum += data;
  var idx;
  while ((idx = accum.indexOf('\n')) !== -1) {
    var line = accum.slice(0, idx);
    accum = accum.slice(idx+1);
    emitLine(line);
  }
});
stream.on('end', function() {
  if (accum) {
    emitLine(accum);
  }
  finishedParsing();
});
