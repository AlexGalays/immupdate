
/** Performs a shallow update of an object using a partial object of the same shape. A new object is returned. */
export function update<Obj extends {}, K extends keyof Obj>(host: Obj, spec: Pick<Obj, K>): Obj {
  const result = {} as Obj
  Object.keys(host).forEach(key => { (result as any)[key] = (host as any)[key] })

  for (let key in spec) {
    const specValue = spec[key]

    if (specValue === DELETE) {
      delete result[key]
    }
    else {
      result[key] = specValue
    }
  }

  return result
}


// We lie about the public type so that only a property that is optional or that can be assigned to undefined can be DELETE'd
/** Marker used to delete a key */
export const DELETE = {} as any as undefined
