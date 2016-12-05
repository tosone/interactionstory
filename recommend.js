'use strict';

const path = require('path');

const _ = require('lodash');
const Promise = require('bluebird');

const util = require('./util');
const store = require('./store');
const player = require('./util/play');
const config = require('./config');
const interaction = require('./interaction');

const file = config.file;

const recommentNum = 5;

module.exports = () => {
  return Promise.coroutine(function* () {
    let storylist = store.getAll();
    if (storylist.length === 0) {
      util.exitWithAudio(file.no_story_found, false, true);
    } else {
      if (storylist.length > recommentNum) {
        storylist = _.dropRight(storylist, storylist.length - recommentNum);
      }
      for (let index in storylist) {
        if (index === 2) {
          yield player(file['excuse4']);
        } else if (index === 3) {
          yield player(file['excuse2']);
        } else if (index === 4) {
          yield player(file['excuse6']);
        } else {
          yield player(file['excuse' + (index + 1).toString()]);
        }
        yield player(path.join(storylist[index].path, 'title.ogg'));
        if (index === 1) {
          yield player(file['excuse3']);
        } else if (index === 2 || index === 3) {
          yield player(file['excuse5']);
        } else if (index === 4) {
          yield player(file['excuse7']);
        }
        if (yield util.ask()) {
          interaction(storylist[index]);
          break;
        }
      }
      console.log('ok');
      util.exitWithAudio(file.storyexit, false, true);
    }
  }.bind(this))();
};
