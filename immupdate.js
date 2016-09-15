
export default function update(host, spec) {
  // If any of the branches of an object changed, then than object changed too: clone it.
  // The type of the copy is inferred.
  const copy = host
    ? Array.isArray(host) ? host.slice() : clone(host)
    : Array.isArray(spec) ? [] : {}

  for (let key in spec) {
    const specValue = spec[key]

    if (specValue === DELETE) {
      Array.isArray(copy) ? copy.splice(key, 1) : delete copy[key]
    }
    else if (specValue && specValue.__replace) {
      copy[key] = specValue.value
    }
    // The spec continues deeper
    else if (isObject(specValue)) {
      copy[key] = update(copy[key], specValue)
    }
    // Leaf update
    else {
      copy[key] = specValue
    }
  }

  return copy
}

// Single path string update like: update(obj, 'path1.path2.name', 'John')
export function updateKey(host, keyPath, value) {
  const paths = keyPath.split('.')
  const spec = {}
  let currentObj = spec

  paths.forEach((path, index) => {
    if (index === paths.length - 1) currentObj[path] = value
    else currentObj[path] = currentObj = {}
  })

  return update(host, spec)
}

function clone(obj) {
  const result = {}
  Object.keys(obj).forEach(key => { result[key] = obj[key] })
  return result
}

function isObject(x) {
  return x &&
  typeof x === 'object' &&
  !Array.isArray(x) &&
  !(x instanceof Date)
}


export const DELETE = '__immupdate_DELETE';

export function replace(value) {
  return { __replace: true, value }
}
