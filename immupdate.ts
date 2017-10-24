
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


export interface AtUpdater<R, O> {
  __T: [R, O] // Strengthen structural typing

  /**
   * Selects this Object key for update or further at() chaining
   */
  at<K extends keyof O>(this: AtUpdater<R, ObjectLiteral>, key: K): Updater<R, O[K]>

  /**
   * Selects an Array index for update or further at() chaining
   */
  at<A>(this: AtUpdater<R, A[]>, index: number): Updater<R, A | undefined>
}

// The at interface carrying a pre-bound value
export interface BoundAtUpdater<R, O> {
  __T: [R, O]

  /**
   * Selects this Object key for update or further at() chaining
   */
  at<K extends keyof O>(this: BoundAtUpdater<R, ObjectLiteral>, key: K): BoundUpdater<R, O[K]>

  /**
   * Selects an Array index for update or further at() chaining
   */
  at<A>(this: BoundAtUpdater<R, A[]>, index: number): BoundUpdater<R, A | undefined>
}

export interface Updater<R, O> extends AtUpdater<R, O> {
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

export interface BoundUpdater<R, O> extends BoundAtUpdater<R, O> {
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


interface Root {
  type: 'root'
  boundTarget: {} | undefined
}

interface At {
  type: 'at'
  field: string | number
  parent: any
}

interface WithDefault {
  type: 'withDefault'
  defaultValue: any
  parent: any
}

interface AbortIfUndef {
  type: 'abortIfUndef'
  parent: any
}

type UpdaterData = Root | At | WithDefault | AbortIfUndef



class _Updater {
  constructor(public data: UpdaterData) {}

  at(keyOrIndex: any): any {
    return new _Updater({ type: 'at', parent: this, field: keyOrIndex })
  }

  set(value: any) {
    const doSet = (target: any) => {
      const [clonedTarget, leafHost, field, aborted] = this.cloneForUpdate(target)
      if (aborted) return target

      value === DELETE ? delete leafHost[field] : leafHost[field] = value
      return clonedTarget
    }

    const boundTarget = this.findBoundTarget()

    return boundTarget
      ? doSet(boundTarget)
      : doSet
  }

  modify<V>(modifier: (value: V) => V) {
    const doModify = (target: any) => {
      const [clonedTarget, leafHost, field, aborted] = this.cloneForUpdate(target)
      if (aborted) return target

      const value = modifier(leafHost[field])
      value === DELETE ? delete leafHost[field] : leafHost[field] = value
      return clonedTarget
    }

    const boundTarget = this.findBoundTarget()

    return boundTarget
      ? doModify(boundTarget)
      : doModify
  }

  withDefault(value: any): any {
    return new _Updater({ type: 'withDefault', parent: this, defaultValue: value })
  }

  abortIfUndef(): any {
    return new _Updater({ type: 'abortIfUndef', parent: this })
  }

  findBoundTarget() {
    let current = this
    while (true) {
      if (current.data.type === 'root') return current.data.boundTarget
      current = current.data.parent
    }
  }

  parentUpdaters() {
    let updaters = [this]
    let parentUpdater = (this.data as any).parent

    // Ignore the root updater
    while (parentUpdater && parentUpdater.data.parent) {
      updaters.unshift(parentUpdater)
      parentUpdater = parentUpdater.data.parent
    }

    return updaters
  }

  cloneForUpdate(target: any) {
    const updaters = this.parentUpdaters()
    const obj = clone(target)

    let currentObj = obj
    let lastObj = obj

    for (let i = 0; i < updaters.length - 1; i++) {
      const data = updaters[i].data
      const nextData = updaters[i+1].data

      if (data.type !== 'at') continue

      let newObj = currentObj[data.field]

      if (newObj !== undefined)
        newObj = clone(newObj)
      else if (nextData.type === 'abortIfUndef')
        return [,,, true]
      else if (nextData.type === 'withDefault')
        newObj = nextData.defaultValue

      lastObj = currentObj
      currentObj = currentObj[data.field] = newObj
    }

    const leafHost = this.data.type === 'at'
      ? currentObj
      : lastObj

    const field = this.data.type === 'at'
      ? this.data.field
      : (updaters[updaters.length - 2].data as At).field

    return [obj, leafHost, field, false]
  }
}


function clone(obj: any): any {
  if (Array.isArray(obj)) return obj.slice()

  const cloned = {}
  Object.keys(obj).forEach(key => { (cloned as any)[key] = (obj as any)[key] })
  return cloned
}

export function deepUpdate<O extends object>(target: O): BoundAtUpdater<O, O>
export function deepUpdate<O extends object>(): AtUpdater<O, O>
export function deepUpdate(target?: any): any {
  return new _Updater({ type: 'root', boundTarget: target })
}