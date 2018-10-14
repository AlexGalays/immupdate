import { update, DELETE, deepUpdate } from '../'
import { Option } from 'space-lift'

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
deepUpdate([])
  .at('join')
  .set(3)

// Updating an Object with a number key instead of a string @shouldNotCompile
deepUpdate({ hello: 10 })
  .at(10)
  .set(3)

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


// Trying to access an Option's value without a null check @shouldNotCompile
const opt = Option({ a: { b: 1 } })
deepUpdate(opt).at('a').at('b').set(10)

// Trying to access an Option<Object>'s content as if it was an Array @shouldNotCompile
deepUpdate({ a: Option({ b: 1 }) }).at('a').at(0)

// Trying to access an Option<Array>'s content as if it was an Object @shouldNotCompile
deepUpdate({ a: Option([1, 2, 3]) }).at('a').at('hey')

// Trying to access an Option<Array>'s item as if it was always defined @shouldNotCompile
deepUpdate({ a: Option([{ name: 'John' }]) }).at('a').abortIfUndef().at(0).at('name')

// Trying to access an Option<primitive>'s content as if it was an Object @shouldNotCompile
deepUpdate({ a: Option(10) }).at('a').at('hey')