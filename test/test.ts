import { update, DELETE } from '../'

const expect = require('expect')


describe('immupdate', () => {

  it('should not modify the original object', () => {
    const obj = { a: 33 }
    const result = update(obj, { a: 44 })
    expect(result).toNotBe(obj)
  })

  it('can update a primitive key', () => {
    const result = update({ a: 33 }, { a: 44 })
    expect(result).toEqual({ a: 44 })
  })

  it('can update a key of type Object', () => {
    const obj = { a: { b: 33 } }
    const result = update(obj, { a: { b: 44 } })
    expect(result).toEqual({ a: { b: 44 } })
    expect(result.a).toNotBe(obj.a)
  })

  it('can update multiple keys', () => {
    const obj = { a: 33, b: 'bb', c: [] as number[] }
    const result = update(obj, { a: 44, c: [1, 2] })
    expect(result).toEqual({ a: 44, b: 'bb', c: [1, 2] })
  })

  it('can delete a nullable key', () => {
    const obj: { a?: number, b: number } = { a: 33, b: 44 }
    const result = update(obj, { a: DELETE })
    expect(result).toEqual({ b: 44 })
    expect(obj).toEqual({ a: 33, b: 44 })
  })

  it('can reset a key that can contain an undefined value', () => {
    const obj: { a: number | undefined, b: number } = { a: 33, b: 44 }
    const result = update(obj, { a: undefined })
    expect(result).toEqual({ a: undefined, b: 44 })
    expect(obj).toEqual({ a: 33, b: 44 })
  })

  it('can reset a key that can contain a null value', () => {
    const obj: { a: number | null, b: number } = { a: 33, b: 44 }
    const result = update(obj, { a: null })
    expect(result).toEqual({ a: null, b: 44 })
    expect(obj).toEqual({ a: 33, b: 44 })
  })

})
