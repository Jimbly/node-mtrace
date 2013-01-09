try {
  var binding = require('./build/Release/mtrace.node');
  module.exports = binding;
} catch (e) {
  console.error('error loading mtracer: ' + e.stack);
  module.exports = {
    mtrace: function() { },
    muntrace: function() { },
    gc: function() { }
  };
}
