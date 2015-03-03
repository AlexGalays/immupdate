
function update(host, spec) {
  // Single path string update like: update(obj, 'path1.path2.name', 'John');
  if (arguments.length == 3) {
    var value = arguments[2];
    var paths = spec.split('.');
    var specObj = {};
    var currentObj = specObj;
    paths.forEach(function(path, index) {
      if (index == paths.length - 1) currentObj[path] = value;
      else currentObj[path] = currentObj = {};
    });
    spec = specObj;
  }

  // If any of the branches of an object changed, then than object changed too: clone it.
  var copy = (host == null) ? {} :
    Array.isArray(host) ? host.slice() : clone(host);

  for (var key in spec) {
    var specValue = spec[key];

    // The spec continues deeper
    if (isObject(specValue)) {
      copy[key] = update(copy[key], specValue);
    }
    // Leaf update
    else {
      var newValue = (typeof specValue == 'function')
        ? specValue(copy[key])
        : specValue;

      copy[key] = newValue;
    }
  }

  return copy;
}

function clone(obj) {
  var result = {};
  Object.keys(obj).forEach(function(key) { result[key] = obj[key] });
  return result;
}

function isObject(x) { return x && typeof x == 'object' }


module.exports = update;