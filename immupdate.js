
function update(host, spec) {
  // If any of the branches of an object changed, then than object changed too: clone it.
  var copy = (host == null) ? {} :
    Array.isArray(host) ? host.slice() : Object.create(host);

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


function isObject(x) { return x && typeof x == 'object' }


module.exports = update;