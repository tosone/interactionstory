'use strict';

const store = require('./store');

console.log(store.getAll());
console.log(store.save('tosone', 'basic', '1.0.0', '///sss'));
console.log(store.search('toso'));
console.log(store.remove('tosone'));
