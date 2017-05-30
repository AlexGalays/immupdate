
//--------------------------------------
//  Shallow update
//--------------------------------------


/** Performs a shallow update of an object using a partial object of the same shape. A new object is returned. */
export function update<Obj extends {}, K extends keyof Obj>(host: Obj, spec: Pick<Obj, K>): Obj {
  const result = clone(host)

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



//--------------------------------------
//  Deep update
//--------------------------------------

export type ObjectLiteral = object & { reduceRight?: 'nope' }


export interface At<R, O> {
  __T: [R, O] // Strengthen structural typing

  /**
   * Selects this Object key for update or further at() chaining
   */
  at<K extends keyof O>(this: At<R, ObjectLiteral>, key: K): Updater<R, O[K]>

  /**
   * Selects an Array index for update or further at() chaining
   */
  at<A>(this: At<R, A[]>, index: number): Updater<R, A | undefined>
}

// The at interface carrying a pre-bound value
export interface BoundAt<R, O> {
  __T: [R, O]

  /**
   * Selects this Object key for update or further at() chaining
   */
  at<K extends keyof O>(this: BoundAt<R, ObjectLiteral>, key: K): BoundUpdater<R, O[K]>

  /**
   * Selects an Array index for update or further at() chaining
   */
  at<A>(this: BoundAt<R, A[]>, index: number): BoundUpdater<R, A | undefined>
}

export interface Updater<R, O> extends At<R, O> {
  __T: [R, O]

  /**
   * Sets the value at the currently selected path.
   */
  set(value: O): (target: R) => R

  /**
   * Modifies the value at the specified path. The current value is passed.
   */
  modify(modifier: (value: O) => O): (target: R) => R

  /**
   * Makes the previous nullable chain level 'safe' by using a default value
   */
  withDefault<B, C extends B>(this: Updater<R, B | undefined>, defaultValue: C): Updater<R, B>

  /**
   * Aborts the whole update operation if the previous chain level is null or undefined.
   */
  abortIfUndef<B>(this: Updater<R, B | undefined>): Updater<R, B>
}

export interface BoundUpdater<R, O> extends BoundAt<R, O> {
  __T: [R, O]

  /**
   * Sets the value at the currently selected path.
   */
  set(value: O): R

  /**
   * Modifies the value at the specified path. The current value is passed.
   */
  modify(modifier: (value: O) => O): R

  /**
   * Makes the previous nullable chain level 'safe' by using a default value
   */
  withDefault<B, C extends B>(this: BoundUpdater<R, B | undefined>, defaultValue: C): BoundUpdater<R, B>

  /**
   * Aborts the whole update operation if the previous chain level is null or undefined.
   */
  abortIfUndef<B>(this: BoundUpdater<R, B | undefined>): BoundUpdater<R, B>
}


function updater(options: {
  parent?: any,
  field?: any,
  boundTarget?: any,
  defaultValue?: any,
  abort?: boolean
}) {
  return new (Updater as any)(options)
}

function Updater(options: any) {
  this.parent = options.parent
  this.field = options.field
  this.boundTarget = options.boundTarget
  this.defaultValue = options.defaultValue
  this.abort = options.abort
}

Updater.prototype = {

  at(keyOrIndex: any): any {
    return updater({ parent: this, field: keyOrIndex })
  },

  set(value: any) {
    const doSet = (target: any) => {
      const [clonedTarget, leafHost, field, aborted] = this.cloneForUpdate(target)
      if (aborted) return target

      leafHost[field] = value
      return clonedTarget
    }

    const boundTarget = this.rootUpdater().boundTarget

    return boundTarget ? doSet(boundTarget) : doSet
  },

  modify<V>(modifier: (value: V) => V) {
    const doModify = (target: any) => {
      const [clonedTarget, leafHost, field, aborted] = this.cloneForUpdate(target)
      if (aborted) return target

      leafHost[field] = modifier(leafHost[field])
      return clonedTarget
    }

    const boundTarget = this.rootUpdater().boundTarget

    return boundTarget ? doModify(boundTarget) : doModify
  },

  withDefault(value: any): any {
    return updater({ parent: this, field: undefined, defaultValue: value })
  },

  abortIfUndef<B>(): any {
    return updater({ parent: this, field: undefined, abort: true })
  },


  rootUpdater() {
    let current = this
    while (true) {
      if (!current.parent) return current
      current = current.parent
    }
  },

  parentUpdaters() {
    let updaters: any[] = [this]
    let parentUpdater = this.parent

    // Ignore the root updater
    while (parentUpdater && parentUpdater.parent) {
      updaters.unshift(parentUpdater)
      parentUpdater = parentUpdater.parent
    }

    return updaters
  },

  cloneForUpdate(target: any) {
    const updaters = this.parentUpdaters()
    let obj = clone(target)
    let currentObj = obj
    let lastObj = obj

    for (let i = 0; i < updaters.length - 1; i++) {
      const updater = updaters[i]

      // Ignore abortIfUndef/withDefault Updaters who have nothing to contribute
      if (!updater.field) continue

      let newObj

      // The Updater reads an Object or Array
      if (currentObj[updater.field])
        newObj = clone(currentObj[updater.field])
      // The Updater reads a null/undefined value and the next Updater is an abortIfUndef()
      else if (updaters[i+1].abort)
        return [,,, true]
      // The Updater reads a null/undefined value and the next Updater is an withDefault()
      else
        newObj = updaters[i+1].defaultValue

      lastObj = currentObj
      currentObj = currentObj[updater.field] = newObj
    }

    const leafHost = this.field !== undefined
      ? currentObj
      : lastObj

    const field = this.field !== undefined
      ? this.field
      : updaters[updaters.length - 2].field

    return [obj, leafHost, field, false]
  }
}



function clone(obj: any): any {
  if (Array.isArray(obj)) return obj.slice()

  const cloned = {}
  Object.keys(obj).forEach(key => { (cloned as any)[key] = (obj as any)[key] })
  return cloned
}

export function deepUpdate<O extends object>(target: O): BoundAt<O, O>
export function deepUpdate<O extends object>(): At<O, O>
export function deepUpdate(target?: any): any {
  return updater({ boundTarget: target })
}