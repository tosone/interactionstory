'use strict';

const path = require('path');

const _ = require('lodash');
const glob = require('glob');
const fs = require('fs-extra');

const config = require('./config');

const dbname = config.dbname;

glob('../userdata/resource/interaction_story/**/*/package.json', (err, files) => {
  Promise.all(files.map(file => {
    let packageFile = require(path.join(file));
    let name = packageFile.name;
    let version = packageFile.version;
    let type = packageFile.type;
    return Promise.resolve({ name, version, type, path: path.dirname(path.join('/home/root/' + file.slice(3))) });
  })).then(data => {
    fs.writeJsonSync(dbname, data);
  });
});
