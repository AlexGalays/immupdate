
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

      const result = this.cloneForUpdate(target)
      if (result.name === 'aborted') return target

      const { clonedTarget, leafHost, field } = result

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

      const result = this.cloneForUpdate(target)
      if (result.name === 'aborted') return target

      const { clonedTarget, leafHost, field } = result

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

  getNextValue(previousHost: any, host: any, field: string | number, isLast: boolean): any {

    if (this.data.type === 'at') {
      const newField = this.data.field
      const value = host[newField]
      const nextValue = isObjectOrArray(value) ? clone(value) : value
      const newHost = isLast ? host : nextValue
      host[this.data.field] = nextValue
      return { host: newHost, field: newField }
    }

    const value = previousHost[field]

    if (this.data.type === 'abortIfUndef' && value === undefined) {
      return { host, field, aborted: true }
    }

    if (this.data.type === 'withDefault' && value === undefined) {
      const nextValue = this.data.defaultValue
      const newHost = isLast ? previousHost : nextValue
      previousHost[field] = nextValue
      return { host: newHost, field }
    }

    const newHost = isLast ? previousHost : host
    return { host: newHost, field }
  }

  cloneForUpdate(target: any): { name: 'aborted' } | { name: 'result', clonedTarget: any, leafHost: any, field: any } {
    const updaters = this.parentUpdaters()
    const obj = clone(target)

    let previousHost = obj
    let host = obj
    let field: string | number = ''

    for (let i = 0; i < updaters.length; i++) {

      const result = updaters[i].getNextValue(
        previousHost,
        host,
        field,
        i === updaters.length - 1
      )

      if (result.aborted)
        return { name: 'aborted' }

      previousHost = host
      host = result.host
      field = result.field
    }

    return {
      name: 'result',
      clonedTarget: obj,
      leafHost: host,
      field
    }
  }
}

function isObjectOrArray(obj: any): boolean {
  return obj !== null && typeof obj === 'object'
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