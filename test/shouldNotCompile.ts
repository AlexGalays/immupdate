
import { update, DELETE } from '../'


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
