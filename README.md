
Immutable updates for JS collections: `Object` and `Array`.


# Well, what is it?

immupdate is a snippet inspired by [React's immutable add-on](http://facebook.github.io/react/docs/update.html), but much simpler and without dependencies.

It is used to update a JS tree while guaranteeing that any sub-tree that changed (and only those) now have a new reference. 
This is very useful when using virtual-DOM based libraries such as [React](http://facebook.github.io/react/) or [mithril](http://lhorie.github.io/mithril/) where simple equality checks is the fastest way to determine whether a sub-tree should be re-rendered.

immupdate can be used together with a proper functional library for terse updates.


# Why Object/Array instead of immutable data structures

Apart from very niche uses, JS is not ready for immutable (persistent) data structures like [mori](http://swannodette.github.io/mori/) or [immutable-js](https://github.com/facebook/immutable-js).
These libraries are often quite heavy, and while they allow efficient updates and memory usage, these advantages are meaningless when various JS<->lib transformations must occur frequently:  

- The server sends JSON data structures: they must first be converted into deeply nested data structures.
- The client sends back JSON to the server: the deeply nested data structures must be converted back to JSON.
- Rendering libraries (react, mithril, virtual-dom, d3, knockout, etc) expect native Arrays to render a list of DOM nodes. This means our shiny data structure must be converted back to an Array **every time** a re-render is necessary.
- Persisting to localStorage is often done via JSON.stringify() for convenience.
- Popular third party libraries work with plain Objects or Arrays; This might change in a few years when JS has higher level abstractions like iterators.

# Why not just deepClone everything defensively
It's dog slow.

# Examples

```javascript
  var update = require('./update');

  var person = {
    id: 33,
    prefs: {
      csvSep: ',',
      timezone: 2
    },
    friends: [1, 2, 3]
  };

  var updated = update(person, {
    prefs: { csvSep: ';' }
  });

  // Assertions

  assert(updated != person);
  assert(updated.friends == person.friends);
  assert(updated.prefs != person.prefs);

  // Or the simple string path notation

  var updated2 = update(person, 'prefs.csvSep', ';');

```

```javascript
  var update = require('./update');

  var people = [
    {id: 1, name: 'tom', friends: [1, 2, 8]},
    {id: 2, name: 'john', friends: [2, 7]}
  ];

  var updated = update(people, {
    0: { friends: f => f.concat(10) }
  });

  // Or, for dynamic indexes

  function objAt(prop, value) {
    var o = {};
    o[prop] = value;
    return o;
  }

  var updated = update(people, {
    objAt(index, { friends: f => f.concat(10) })
  }

  // Assertions

  deepEqual(updated, [
    {id: 1, name: 'tom', friends: [1, 2, 8, 10]},
    {id: 2, name: 'john', friends: [2, 7]}
  ]);

  assert(updated != people);
  assert(updated[0] != people[0]);
  assert(updated[0].friends != people[0].friends);
  assert(updated[1] == people[1]);

```

# Running the tests
```
mocha --ui tdd
```