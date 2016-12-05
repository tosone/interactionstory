'use strict';

const _ = require('lodash');
const Promise = require('bluebird');

let audioType = 'play';

module.exports = (audioFile, type) => {
  const config = require('../config');
  const ctx = config.ctx;
  audioType = type ? type : audioType;
  return Promise.coroutine(function* () {
    if (_.isArray(audioFile)) {
      for (let audio of audioFile) {
        yield ctx.runTask('audioplay', [audio, { "type": audioType }]);
      }
    } else {
      yield ctx.runTask('audioplay', [audioFile, { "type": audioType }]);
    }
  }.bind(this))();
};
