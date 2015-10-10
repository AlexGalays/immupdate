var assert          = require('better-assert'),
    assertDeepEqual = require('deep-equal'),
    _               = require('ramda'),
    update          = require('./immupdate');


suite('immupdate', function() {

  test('Updating object properties', function() {
    var obj = {
      a: 'apples',
      o: 'oranges',
      b: 'bananas'
    },
    objBefore = _.cloneObj(obj);

    var updated = update(obj, {
      a: sleepy, // update
      k: 'kiwi'  // add
    });

    assert(updated != obj);
    deepEqual(obj, objBefore);
    deepEqual(updated, {
      a: 'appleszzz',
      o: 'oranges',
      b: 'bananas',
      k: 'kiwi'
    });
  });


  test('Updating nested object properties', function() {
    var obj = {
      a: 'apples',
      o: { name: 'oranges' },
      b: { name: 'bananas' },
      c: { name: { first: 'coconut' } }
    },
    objBefore = _.cloneObj(obj);

    var updated = update(obj, {
      o: { name: sleepy },            // nested update
      c: { name: { last: 'slice' } }, // even more nested update
      k: { name: 'kiwi' },            // add object
      l: 'lettuce'                    // add primitive,
    });

    // Shortcut for single path updates
    var updated2 = update(obj, 'k.name', 'kiwi');
    var updated3 = update(updated2, 'c.name', { second: 'sliced' });

    assert(updated != obj);
    deepEqual(obj, objBefore);
    deepEqual(updated, {
      a: 'apples',
      o: { name: 'orangeszzz' },
      b: { name: 'bananas' },
      c: { name: { first: 'coconut', last: 'slice' } },
      k: { name: 'kiwi' },
      l: 'lettuce'
    });
    deepEqual(updated2, {
      a: 'apples',
      o: { name: 'oranges' },
      b: { name: 'bananas' },
      c: { name: { first: 'coconut' } },
      k: { name: 'kiwi' }
    });
    deepEqual(updated3, {
      a: 'apples',
      o: { name: 'oranges' },
      b: { name: 'bananas' },
      c: { name: { first: 'coconut', second: 'sliced' } },
      k: { name: 'kiwi' }
    });

    // The reference was kept because we didn't mutate that element
    assert(obj.b == updated.b);
    assert(obj.b == updated2.b);
    // The name of 'o' was mutated, therefore 'o' is considered different.
    assert(obj.o != updated.o);

    assert(obj.c != updated.c);
    assert(obj.c.name != updated.c.name);
  });


  test('Updating array elements', function() {
    var arr = [1, 2, 3],
        arrBefore = _.clone(arr);

    var updated = update(arr, { 1: 22, 4: 44 });

    assert(updated != arr);
    deepEqual(arr, arrBefore);
    assert(updated[0] == 1);
    assert(updated[1] == 22);
    assert(updated[2] == 3);
    assert(updated[3] === undefined);
    assert(updated[4] == 44);
  });


  test('Updating nested arrays', function() {
    var arr = [1, [2, 3, 4], [5, [6, 7]]];
        arrBefore = deepCopy(arr);

    var updated = update(arr, { 
      2: {
        0: 55,
        1: { 0: 66 } 
      }
    });

    assert(updated != arr);
    deepEqual(arr, arrBefore);

    // The reference was kept because we didn't mutate that element
    assert(arr[1] == updated[1]);
    assert(arr[2] != updated[2]);
    assert(arr[2][1] != updated[2][1]);
    deepEqual(updated, [1, [2, 3, 4], [55, [66, 7]]]);
  });


  test('Tree of objects and arrays', function() {
    var people = [
      { id: 'tom', friends: ['jon', 'alex', 'leo'], foes: ['flag'] },
      { id: 'alex', friends: ['leo'] },
      { id: 'jon', friends: [] }
    ],
    peopleBefore = deepCopy(people);

    var updated = update(people, {
      0: { friends: function(f) {
        var withoutAlex = _.reject(_.eq('alex'), f);
        return _.append('bob', withoutAlex);
      }},
      2: { friends: function(f) { return f.concat('bob') } }
    });

    assert(updated != people);
    deepEqual(people, peopleBefore);

    assert(people[0] != updated[0]);
    assert(people[0].friends != updated[0].friends);
    assert(people[0].foes == updated[0].foes);

    assert(people[1] == updated[1]);

    assert(people[2] != updated[2]);
    assert(people[2].friends != updated[2].friends);    


    deepEqual(updated, [
      { id: 'tom', friends: ['jon', 'leo', 'bob'], foes: ['flag'] },
      { id: 'alex', friends: ['leo'] },
      { id: 'jon', friends: ['bob'] }
    ]);

  });


  test('Updating an empty object should end up being a deep copy of the spec', function() {
    var host = {};
    var spec = {
      'uno': 33,
      'dos': [1, 2, 3]
    };

    var updated = update(host, spec);

    deepEqual(updated, spec);
    assert(updated != spec && updated && host);
    assert(Array.isArray(updated.dos));
  });


  test('Pushing to an Array', function() {
    var host = { array: [ 10, 20, 30 ] };

    var updated = update(host, 'array.' + host.array.length, 40);
    deepEqual(updated, { array: [ 10, 20, 30, 40 ] });

    updated = update(host, 'array', function(array) { return array.concat(40) });
    deepEqual(updated, { array: [ 10, 20, 30, 40 ] });
  });


  test('Replacing an object entirely, by reference', function() {
    var host = [ {}, {} ];
    var replacement = {};
    var updated = update(host, '1', function() { return replacement });

    // Alternate notation
    var updated2 = update(host, '1', update.replace(replacement));

    assert(updated[1] == replacement && updated[1] == updated2[1]);
  });


  test('Deleting an object key', function() {
    var host = { a: 33, b: 44 };
    var spec = { a: update.DELETE };
    var updated = update(host, spec);
    deepEqual(updated, { b: 44 });
  });


  test('Deleting an array value', function() {
    var host = [ 10, 20, 30 ];
    var spec = { 1: update.DELETE };
    var updated = update(host, spec);
    deepEqual(updated, [ 10, 30 ]);
  });

});


function deepEqual(a, b) {
  var result = assertDeepEqual(a, b);
  if (!result) {
    var errorMsg = 'deepEqual assertion failed: \n' +
    JSON.stringify(a) + '\n' +
    'is not equal to: \n' +
    JSON.stringify(b);

    throw new Error(errorMsg);
  }
  return result;
}

function sleepy(str) {
  return (str + 'zzz');
}

function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}
