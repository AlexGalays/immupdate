
import { update, DELETE, deepUpdate } from '../'


//--------------------------------------
//  Update
//--------------------------------------

// Updating with a non-object @shouldNotCompile
update({ a: 33 }, 'nani')

// Updating with null @shouldNotCompile
update({ a: 33 }, null)

// Updating with undefined @shouldNotCompile
update({ a: 33 }, undefined)

// Updating with a nullable object @shouldNotCompile
const nullableObject = {} as {} | undefined
update({ a: 33 }, nullableObject)

// Updating with a non existing key @shouldNotCompile
update({ a: 33 }, { b: 44 })

// Updating with the wrong key type @shouldNotCompile
update({ a: 33 }, { a: '44' })

// Updating a primitive with an empty object @shouldNotCompile
update({ a: 33 }, { a: {} })

// Updating with the wrong key Array type @shouldNotCompile
update({ a: [33] }, { a: ['44'] })

// Updating a non nullable key with null @shouldNotCompile
update({ a: 33 }, { a: null })

// Updating a non nullable key with undefined @shouldNotCompile
update({ a: 33 }, { a: undefined })

// Updating a non nullable key with DELETE @shouldNotCompile
update({ a: 33 }, { a: DELETE })

// Updating a key | null with DELETE @shouldNotCompile
update({ a: 33 } as { a: number | null }, { a: DELETE })

// Updating a nested nullable object @shouldNotCompile
type B = { a?: { b: number } }
const obj = {} as B
update(obj, { a: update(obj.a, { b: 44 }) })

// Nested update with the wrong leaf type @shouldNotCompile
const state = { a: { b: { c: { d: { e: ['0'] } } } } }
update(state, {
  a: update(state.a, {
    b: update(state.a.b, {
      c: update(state.a.b.c, {
        d: update(state.a.b.c.d, {
          e: new Date()
        })
      })
    })
})})

// Assigning to the wrong object type @shouldNotCompile
const result: { a: string } = update({ a: 33 }, { a: 44 })

// Trying to update with a numeric index @shouldNotCompile
const daIndex = 8000
update({ a: 33 }, { [daIndex]: 'lol' })



//--------------------------------------
//  Deep update
//--------------------------------------

// Updating a primitive @shouldNotCompile
deepUpdate<number>()

// Trying to update the root @shouldNotCompile
deepUpdate<{}>().set({})({})

// update with the wrong target type @shouldNotCompile
deepUpdate<{ a: number }>()
  .at('a')
  .set(10)({ b: 1 })

// Chaining a nested primitive @shouldNotCompile
deepUpdate<{ kiki: { koko: number } }>()
  .at('kiki')
  .at('koko')
  .at('toExponential')

// Chaining a nested Function @shouldNotCompile
deepUpdate<{ kiki: { koko: () => number } }>()
  .at('kiki')
  .at('koko')
  .at('bind')

// Updating an Array with a string key instead of an index @shouldNotCompile
deepUpdate<number[]>()
  .at('join')
  .set(3)([])

// Updating an Object with a number key instead of a string @shouldNotCompile
deepUpdate<{ hello: number }>()
  .at(10)
  .set(3)({ hello: 10 })

// Updating an Object with a nullable path in the middle @shouldNotCompile
deepUpdate<{ hello?: { hi: number } }>()
  .at('hello')
  .at('hi')

// Setting a nullable path's default with the wrong type @shouldNotCompile
deepUpdate<{ hello?: { hi: number } }>()
  .at('hello')
  .withDefault({ hi: '10' })
  .at('hi')

// A non leaf at(index) on an Array without a withDefault @shouldNotCompile
deepUpdate<{ a: number }[]>()
  .at(10)
  .at('a')

// A bound update with the wrong type @shouldNotCompile
deepUpdate({ a: 10 })
  .at('b')

// A bound update with the wrong type @shouldNotCompile
deepUpdate({ a: 10 })
  .at(0)

// A bound update with the wrong type @shouldNotCompile
deepUpdate({ a: 10 })
  .at('a')
  .set('20')

// A modify() with the wrong type @shouldNotCompile
type Prim = string | undefined
deepUpdate({ a: 'aa' } as { a: Prim })
  .at('a')
  .modify(x => x.substr(0))