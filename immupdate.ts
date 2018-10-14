
//--------------------------------------
//  Shallow update
//--------------------------------------


/** Performs a shallow update of an object using a partial object of the same shape. A new object is returned. */
export function update<Obj extends {}, K extends keyof Obj>(host: Obj, spec: Pick<Obj, K>): Obj {
  const result = cloneObject(host)
  let hasChanged = false;

  for (let key in spec) {
    const specValue = spec[key]

    if (specValue === DELETE) {
      delete result[key]
      hasChanged = hasChanged || key in host;
    }
    else {
      result[key] = specValue
      hasChanged = hasChanged || host[key] !== specValue;
    }
  }

  return hasChanged ? result : host;
}


// We lie about the public type so that only a property that is optional or that can be assigned to undefined can be DELETE'd
/** Marker used to delete a key */
export const DELETE = {} as any as undefined


//--------------------------------------
//  Deep update
//--------------------------------------

export type Leaf = string | number | boolean | null | symbol | Date | Function

export type OptionContent<Opt extends OptionLike<any>> = Exclude<ReturnType<Opt['get']>, undefined>

export type Updater<TARGET, CURRENT> =
  [CURRENT] extends [OptionLike<any>] ? ObjectUpdater<TARGET, OptionContent<CURRENT> | undefined> :
  [CURRENT] extends [any[]] ? ArrayUpdater<TARGET, CURRENT> :
  [CURRENT] extends [Leaf] ? AnySetter<TARGET, CURRENT> :
  ObjectUpdater<TARGET, CURRENT>


export interface ArrayUpdater<TARGET, CURRENT> extends AnyUpdater<TARGET, CURRENT> {
  /**
   * Selects an Array index for update or further at() chaining
   */
  at(index: number): Updater<TARGET, [CURRENT] extends [any[]] ? CURRENT[number & keyof CURRENT] | undefined : never>
}

export interface ObjectUpdater<TARGET, CURRENT> extends AnyUpdater<TARGET, CURRENT> {
  /**
   * Selects this Object key for update or further at() chaining
   */
  at<K extends keyof CURRENT>(key: K): Updater<TARGET, CURRENT[K]>
}

export interface AnySetter<TARGET, CURRENT> {
  /**
   * Sets the value at the currently selected path.
   */
  set(value: CURRENT): TARGET

  /**
   * Modifies the value at the specified path. The current value is passed.
   */
  modify(modifier: (value: CURRENT) => CURRENT): TARGET
}

export interface AnyUpdater<TARGET, CURRENT> extends AnySetter<TARGET, CURRENT> {
  /**
   * Makes the previous nullable chain level 'safe' by using a default value
   */
  withDefault(defaultValue: CURRENT): Updater<TARGET, NonNullable<CURRENT>>

  /**
   * Aborts the whole update operation if the previous chain level is null or undefined.
   */
  abortIfUndef(): Updater<TARGET, NonNullable<CURRENT>>

  /**
   * Aborts the whole update operation if the previous chain level doesn't verify a type guard
   */
  abortIfNot<B extends CURRENT>(predicate: (value: CURRENT) => value is B): Updater<TARGET, B>

  /**
   * Aborts the whole update operation if the previous chain level doesn't verify a predicate
   */
  abortIfNot(predicate: (value: CURRENT) => boolean): Updater<TARGET, CURRENT>
}


interface Root {
  type: 'root'
  target: any
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

type CloneResult =
  { name: 'aborted' } |
  { name: 'result', clonedTarget: any, leafHost: any, field: any, structurallyModified: boolean }

type UpdaterData = Root | At | WithDefault | AbortIfNot


class _Updater {
  constructor(public data: UpdaterData) {}

  at(keyOrIndex: any): any {
    return new _Updater({ type: 'at', parent: this, field: keyOrIndex })
  }

  set(value: any) {
    return this.modify(_ => value)
  }

  modify<V>(modifier: (value: V) => V) {
    const target = this.findTarget()
    const result = this.cloneForUpdate(target)

    if (result.name === 'aborted') return target

    const { clonedTarget, leafHost, field, structurallyModified } = result

    const leafHostIsOption = isOptionLike(leafHost)
    const currentValue = leafHostIsOption ? leafHost.get() : leafHost[field]
    const value = modifier(currentValue)

    // Actually shallow update, e.g deepUpdate(obj).set(otherObj)
    // Not much point but the typings make it possible ¯\_(ツ)_/¯
    if (field === '')
      return leafHostIsOption
        ? leafHost.Option(value)
        : value

    let modified = structurallyModified

    if (value === DELETE) {
      
      if (leafHostIsOption) {
        if (field in leafHost.value) modified = true
        delete leafHost.value[field]
      }
      else {
        if (field in leafHost) modified = true
        delete leafHost[field]
      } 
    }
    else {
      if (currentValue !== value)
      modified = true

      if (leafHostIsOption) {
        leafHost.value[field] = value
      }
      else {
        // Setting a T | undefined as the value of an Option
        // should actually build a new Option<T>
        const finalValue = isOptionLike(currentValue)
          ? (currentValue as any).Option(value)
          : value

        leafHost[field] = finalValue
      }
    }

    return modified ? clonedTarget : target
  }

  withDefault(value: any): any {
    return new _Updater({ type: 'withDefault', parent: this, defaultValue: value })
  }

  abortIfNot(predicate: any): any {
    return new _Updater({ type: 'abortIfNot', parent: this, predicate })
  }

  abortIfUndef(): any {
    return this.abortIfNot((value: any) => {
      if (isOptionLike(value)) return value.type === 'some'
      return value !== undefined
    })
  }

  findTarget() {
    let current = this
    while (true) {
      if (current.data.type === 'root') return current.data.target
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
    const hostIsOption = isOptionLike(host)
    const previousHostIsOption = isOptionLike(previousHost)

    if (this.data.type === 'at') {
      const newField = this.data.field

      if (hostIsOption) {
        if (host.type === 'none')
          return { host: undefined, field: newField }

        host.value = clone(host.value)

        const value = host.value[newField]
        const nextValue = clone(value)
        const newHost = isLast ? host : nextValue

        host.value[this.data.field] = nextValue

        return { host: newHost, field: newField }
      }
      else {
        if (!host) return { host: undefined, field: newField }

        const value = host[newField]
        const nextValue = clone(value)
        const newHost = isLast ? host : nextValue

        host[this.data.field] = nextValue

        return { host: newHost, field: newField }
      }
    }

    if (this.data.type === 'abortIfNot' && this.data.predicate(host) === false) {
      return { host, field, aborted: true }
    }

    if (this.data.type === 'withDefault' && (previousHost[field] === undefined || isOptionLike(previousHost[field]))) {
      const nextValue = isOptionLike(host)
        ? host.Option(this.data.defaultValue)
        : this.data.defaultValue

      const newHost = isLast
        ? previousHost
        : nextValue

      if (previousHostIsOption)
        previousHost.value[field] = nextValue
      else
        previousHost[field] = nextValue

      return { host: newHost, field, structurallyModified: true }
    }

    const newHost = isLast ? previousHost : host
    return { host: newHost, field }
  }

  cloneForUpdate(target: any): CloneResult {
    const updaters = this.parentUpdaters()
    const obj = cloneContainer(target)

    let previousHost = obj
    let host = obj
    let field: string | number = ''
    let structurallyModified = false

    for (let i = 0; i < updaters.length; i++) {

      const result = updaters[i].getNextValue(
        previousHost,
        host,
        field,
        i === updaters.length - 1
      )

      if (result.aborted)
        return { name: 'aborted' }

      structurallyModified = structurallyModified || result.structurallyModified
      previousHost = host
      host = result.host
      field = result.field
    }

    return {
      name: 'result',
      clonedTarget: obj,
      leafHost: host,
      field,
      structurallyModified
    }
  }
}

// TODO: This probably won't fly with some weird edge cases like deepUpdate(new Date()).set(), etc
// For completion sake, we should probably fix it.
function isContainer(obj: any): boolean {
  return obj !== null && typeof obj === 'object'
}

function clone(obj: any) {
  return isContainer(obj) ? cloneContainer(obj) : obj
}

function cloneContainer(obj: any): any {
  if (Array.isArray(obj)) return obj.slice()
  if (isOptionLike(obj)) return obj.map(identity)
  return cloneObject(obj)
}

function cloneObject(obj: any): any {
  const cloned = {}
  Object.keys(obj).forEach(key => { (cloned as any)[key] = (obj as any)[key] })
  return cloned
}

function identity(x: any) {
  return x
}

/**
 * Meant to match space-lift/option, but without requiring a hard (cyclic) dependency.
 */
interface OptionLike<A> {
  get(): A | undefined
  map<B>(fn: (a: A) => B | null | undefined): OptionLike<B>
}

function isOptionLike(obj: any) {
  return !!obj && (obj.type === 'some' || obj.type === 'none') && obj.Option
}

export function deepUpdate<TARGET>(target: TARGET): Updater<TARGET, TARGET> {
  return new _Updater({ type: 'root', target }) as any as Updater<TARGET, TARGET>
}