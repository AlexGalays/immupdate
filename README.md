![immupdate_logo](http://i171.photobucket.com/albums/u320/boubiyeah/immupdate_logo_zpso5d7ao18.png)

Terse immutable updates for JS data structures: `Object` and `Array`.


* [Update a property](#update-property)
* [Fully replace a property by reference](#replace-property)
* [Delete a property](#delete-property)
* [Update an object in an Array](#update-array-object)


# Well, what is it?

immupdate is inspired by [React's immutable add-on](http://facebook.github.io/react/docs/update.html), but much simpler, tiny and without dependencies.

It is used to update a JS tree while guaranteeing that any sub-tree that changed (and only those) now have a new reference.
This is very useful when using virtual-DOM based libraries where simple equality checks is the fastest way to determine whether a sub-tree should be re-rendered.

# Why not just recursively deep clone defensively
It's very wasteful and can often be too slow for nested structures.
immupdate only updates the paths that changed and only at update time, not defensively everytime an object is handed out in fear it might be mutated in place.


# Why Object/Array instead of immutable data structures

Pros:

- This lib is tiny and only manipulate JS' native data structures. Immutable data structures with a rich API will usually come packaged as a fairly big library.
- No need for encoding/decoding when the server sends JSON data structures. With immutable data structures, they must first be converted into deeply nested data structures.
- The client sends back JSON to the server: the deeply nested data structures must be converted back to JSON.
- Many rendering libraries (mithril, virtual-dom, d3, knockout, etc) expect native Arrays to render a list of DOM nodes. This means our shiny data structure must be converted back to an Array **every time** a re-render is necessary.
- Persisting to localStorage is often done via JSON.stringify() for convenience, this is trivial when we are this close to the metal.
- Popular third party libraries work with plain Objects or Arrays; This might change in a few years when JS has higher level abstractions like iterators available in mainstream browsers and libraries make use of it instead of having a hard dependency on Arrays (or with new languages directly compiling to byte code).

Cons:

- Immutability can NOT be enforced as the underlying structures are still mutable. Coding conventions and discipline is more important than with well designed immutable data structures.
- Due to the highly dynamic nature of the API, it is not possible to provide a proper typesafe interface (typescript, flow).  Type safety on writes are effectively exchanged for terse and performant update code. Note however that Immutable-js also doesn't provide type safety for many operations (Records, updateIn, mergeIn, etc).

# Examples

<a name="update-property"></a>
## Updating a property

By default, as this is by far the most common operation, `update` will merge (and replace if applicable) all the keys from the passed object unto the target object, key by key.

```javascript
import update, { updateKey } from 'immupdate';

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
};

const updated = update(person, {
  prefs: { csvSep: ';' }
});

// Or the simple string path notation, useful for single updates
const updated2 = updateKey(person, 'prefs.csvSep', ';');
```
`person` was only updated where necessary. Below in green are the paths that were updated.
![update](http://i171.photobucket.com/albums/u320/boubiyeah/Screen%20Shot%202015-04-19%20at%2000.15.12_zps4gvttcxd.png)


```javascript
import update from 'immupdate';

const people = [
  {id: 1, name: 'tom', friends: [1, 2, 8]},
  {id: 2, name: 'john', friends: [2, 7]}
];

const updated = update(people, {
  0: { friends: replace(people[0].friends.concat(10)) }
});

// Assertions

deepEqual(updated, [
  {id: 1, name: 'tom', friends: [1, 2, 8, 10]},
  {id: 2, name: 'john', friends: [2, 7]}
]);

assert(updated !== people);
assert(updated[0] !== people[0]);
assert(updated[0].friends !== people[0].friends);
assert(updated[1] === people[1]);

```

<a name="replace-property"></a>
## Fully replace a property by reference

By providing a function instead of a value, the function result will be used as-is to fully replace the target.
The current value is passed as the only argument to the function.
Be careful as it is now your responsability to provide a proper, non-mutated-in-place value.

```javascript
import { updateKey, replace } from 'immupdate';

const host = [ {}, {} ];
const replacement = { a: 1 };
const updated = updateKey(host, '1', replace(replacement));
```

<a name="delete-property"></a>
## Delete a property

By using a special marker, an object key can actually be deleted:

```javascript
import update, { DELETE } from 'immupdate';

const host = { a: 33, b: 44 };
const spec = { a: DELETE };
const updated = update(host, spec);

deepEqual(updated, { b: 44 });
```

<a name="update-array-object"></a>
## Update an object in an Array

```javascript
import update, { updateKey } from 'immupdate';

const host = { nestedArray: [ { a: 11 }, { b: 22 } ] };
const index = 1; // This is usually computed dynamically
const spec = { nestedArray: { [index]: { c: 33 } } };
const updated = update(host, spec);

// Or
const updated2 = updateKey(host, `nestedArray.${index}`, { c: 33 });

deepEqual(updated, { nestedArray: [ { a: 11 }, { b: 22, c: 33 } ] });
```
