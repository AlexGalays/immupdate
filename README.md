![immupdate_logo](http://i171.photobucket.com/albums/u320/boubiyeah/immupdate_logo_zpso5d7ao18.png)

immutable update util for JS `Object`.

This branch (master) holds the typescript optimized version (shallow update).  
For the previous 0.x version (deep update), see [here](https://github.com/AlexGalays/immupdate/tree/0.x)


* [Update multiple properties](#update-multiple-properties)
* [Update a dynamic property](#update-dynamic-property)
* [Replace a nested property](#replace-nested-property)
* [More safety with Object.freeze](#object-freeze)


# Why not just recursively deep clone defensively
It's very wasteful and can often be too slow for nested structures.
immupdate updates the paths that really changed and only at update time, not defensively everytime an object is handed out in fear it might be mutated in place.


# Why Object/Array instead of immutable data structures

Pros:

- This lib is tiny and only manipulate JS' native data structures. Immutable data structures with a rich API will usually come packaged as a fairly big library.
- No need for encoding/decoding when the server sends JSON data structures. With immutable data structures, they must first be converted into deeply nested data structures.
- The client sends back JSON to the server: the deeply nested data structures must be converted back to JSON.
- Many rendering libraries (mithril, virtual-dom, d3, knockout, etc) expect native Arrays to render a list of DOM nodes. This means our shiny data structure must be converted back to an Array **every time** a re-render is necessary.
- Persisting to localStorage is often done via JSON.stringify() for convenience, this is trivial when we are this close to the metal.
- Popular third party libraries work with plain Objects or Arrays; This might change in a few years when JS has higher level abstractions like iterators available in mainstream browsers and libraries make use of it instead of having a hard dependency on Arrays (or with new languages directly compiling to byte code).
- Ironically, standard Objects and Arrays are heavily optimized by the JS engines and are often faster and use less memory compared to immutable collections using structural sharing.
- Any utility functions you may have written for Arrays/Objects will always be portable. Utils for the popular immutable lib of the month will not.

Cons:

- Immutability can NOT be enforced at compile time as the underlying JS structures are still mutable.  
Coding conventions and discipline is more important than with well designed immutable data structures.


# Examples

<a name="update-multiple-properties"></a>
## Updating multiple properties

```ts
import { update, DELETE } from 'immupdate'

type Person = { id: number, name: string, tatoo?: string }

const jose: Person = {
  id: 33,
  name: 'Jose',
  tatoo: '自由'
}

const carla = update(jose, {
  name: 'Carla',
  tatoo: DELETE
})
```


<a name="update-dynamic-property"></a>
## Updating a dynamic property

Sometimes, there are so many properties that we'd rather just update a property by name, losing typesafety for convenience.  

```ts
import { update, DELETE } from 'immupdate'

const form: Record<string, string> = {}

const myKey = 'input33'

const updatedForm = update(form, { [myKey]: 'hello' })
```


<a name="replace-nested-property"></a>
## Replacing a nested property

`immupdate` performs shallow updates, so we will just have to call it multiple times.

```ts
import { update } from 'immupdate'

const person = {
  id: 33,
  prefs: {
    csvSep: ',',
    timezone: 2,
    otherData: {
      nestedData: {}
    }
  },
  friends: [1, 2, 3]
}

const newPrefs = update(person.prefs, { csvSep: ';' })

const personWithNewPrefs = update(person, { prefs: newPrefs })
```

`person` was only updated where necessary. Below in green are the paths that were updated. This is much more efficient than deep cloning.  
![update](http://i171.photobucket.com/albums/u320/boubiyeah/Screen%20Shot%202015-04-19%20at%2000.15.12_zps4gvttcxd.png)


<a name="object-freeze"></a>
## More safety with Object.freeze

The object returned by `update` can optionally be deeply frozen.
This can be useful in development mode, to catch mutation attempts as early as possible.  

To enable this mode, ensure your dev build sets the value of `process.env.IMMUPDATE_DEEP_FREEZE` to `'true'`.
