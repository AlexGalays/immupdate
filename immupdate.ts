
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


export interface AtUpdater<TARGET, CURRENT> {
  __T: [TARGET, CURRENT] // Strengthen structural typing

  /**
   * Selects this Object key for update or further at() chaining
   */
  at<K extends keyof CURRENT>(this: AtUpdater<TARGET, ObjectLiteral>, key: K): Updater<TARGET, CURRENT[K]>

  /**
   * Selects an Array index for update or further at() chaining
   */
  at<A>(this: AtUpdater<TARGET, A[]>, index: number): Updater<TARGET, A | undefined>
}

// The at interface carrying a pre-bound value
export interface BoundAtUpdater<TARGET, CURRENT> {
  __T: [TARGET, CURRENT]

  /**
   * Selects this Object key for update or further at() chaining
   */
  at<K extends keyof CURRENT>(this: BoundAtUpdater<TARGET, ObjectLiteral>, key: K): BoundUpdater<TARGET, CURRENT[K]>

  /**
   * Selects an Array index for update or further at() chaining
   */
  at<A>(this: BoundAtUpdater<TARGET, A[]>, index: number): BoundUpdater<TARGET, A | undefined>
}

export interface Updater<TARGET, CURRENT> extends AtUpdater<TARGET, CURRENT> {
  __T: [TARGET, CURRENT]

  /**
   * Sets the value at the currently selected path.
   */
  set(value: CURRENT): (target: TARGET) => TARGET

  /**
   * Modifies the value at the specified path. The current value is passed.
   */
  modify(modifier: (value: CURRENT) => CURRENT): (target: TARGET) => TARGET

  /**
   * Makes the previous nullable chain level 'safe' by using a default value
   */
  withDefault<B, C extends B>(this: Updater<TARGET, B | undefined>, defaultValue: C): Updater<TARGET, B>

  /**
   * Aborts the whole update operation if the previous chain level is null or undefined.
   */
  abortIfUndef<B>(this: Updater<TARGET, B | undefined>): Updater<TARGET, B>

  /**
   * Aborts the whole update operation if the previous chain level doesn't verify a type guard
   */
  abortIfNot<C extends CURRENT>(predicate: (value: CURRENT) => value is C): Updater<TARGET, C>

  /**
   * Aborts the whole update operation if the previous chain level doesn't verify a predicate
   */
  abortIfNot(predicate: (value: CURRENT) => boolean): Updater<TARGET, CURRENT>
}

export interface BoundUpdater<TARGET, CURRENT> extends BoundAtUpdater<TARGET, CURRENT> {
  __T: [TARGET, CURRENT]

  /**
   * Sets the value at the currently selected path.
   */
  set(value: CURRENT): TARGET

  /**
   * Modifies the value at the specified path. The current value is passed.
   */
  modify(modifier: (value: CURRENT) => CURRENT): TARGET

  /**
   * Makes the previous nullable chain level 'safe' by using a default value
   */
  withDefault<B, C extends B>(this: BoundUpdater<TARGET, B | undefined>, defaultValue: C): BoundUpdater<TARGET, B>

  /**
   * Aborts the whole update operation if the previous chain level is null or undefined.
   */
  abortIfUndef<B>(this: BoundUpdater<TARGET, B | undefined>): BoundUpdater<TARGET, B>

  /**
   * Aborts the whole update operation if the previous chain level doesn't verify a type guard
   */
  abortIfNot<C extends CURRENT>(predicate: (value: CURRENT) => value is C): BoundUpdater<TARGET, C>

  /**
   * Aborts the whole update operation if the previous chain level doesn't verify a predicate
   */
  abortIfNot(predicate: (value: CURRENT) => boolean): BoundUpdater<TARGET, CURRENT>
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

interface AbortIfNot {
  type: 'abortIfNot'
  predicate: any
  parent: any
}

type UpdaterData = Root | At | WithDefault | AbortIfNot



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

  abortIfNot(predicate: any): any {
    return new _Updater({ type: 'abortIfNot', parent: this, predicate })
  }

  abortIfUndef(): any {
    return this.abortIfNot((value: any) => value !== undefined)
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

    if (this.data.type === 'abortIfNot' && this.data.predicate(host) === false) {
      return { host, field, aborted: true }
    }

    if (this.data.type === 'withDefault' && previousHost[field] === undefined) {
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

export function deepUpdate<TARGET extends object>(target: TARGET): BoundAtUpdater<TARGET, TARGET>
export function deepUpdate<TARGET extends object>(): AtUpdater<TARGET, TARGET>
export function deepUpdate(target?: any): any {
  return new _Updater({ type: 'root', boundTarget: target })
}