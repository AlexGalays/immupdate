
function update(host, spec) {
  // Single path string update like: update(obj, 'path1.path2.name', 'John');
  if (arguments.length === 3) {
    var value = arguments[2];
    var paths = spec.split('.');
    var specObj = {};
    var currentObj = specObj;
    paths.forEach(function(path, index) {
      if (index === paths.length - 1) currentObj[path] = value;
      else currentObj[path] = currentObj = {};
    });
    spec = specObj;
  }

  // If any of the branches of an object changed, then than object changed too: clone it.
  // The type of the copy is inferred.
  var copy = host
    ? Array.isArray(host) ? host.slice() : clone(host)
    : Array.isArray(spec) ? [] : {};

  for (var key in spec) {
    var specValue = spec[key];

    if (specValue === DELETE) {
      Array.isArray(copy) ? copy.splice(key, 1) : delete copy[key];
    }
    // The spec continues deeper
    else if (isObject(specValue)) {
      copy[key] = update(copy[key], specValue);
    }
    // Leaf update
    else {
      var newValue = (typeof specValue === 'function')
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

function isObject(x) { return x && typeof x === 'object' && !Array.isArray(x) }


var DELETE = update.DELETE = {};

update.replace = function(value) {
  return function() { return value };
};


module.exports = update;