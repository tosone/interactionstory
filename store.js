'use strict';

const fs = require('fs-extra');
const _ = require('lodash');

const config = require('./config');

const dbname = config.dbname;
let storylist = [];

if (fs.existsSync(dbname)) {
  storylist = require(dbname);
}

function save(name, type, path, version) {
  if (!search(name)) {
    storylist.push({ name, type, version, path });
    fs.writeJsonSync(dbname, storylist);
  }
  return storylist;
}

function getAll() {
  return storylist;
}

function search(name) {
  for (let story of storylist) {
    if (story.name.indexOf(name) !== -1) {
      return story;
    }
  };
  return null;
}

function remove(name) {
  _.remove(storylist, story => story.name === name);
  return storylist;
}

module.exports = {
  save,
  getAll,
  search,
  remove
};
