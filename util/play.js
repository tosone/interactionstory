'use strict';
const Promise = require('bluebird');
const _ = require('lodash');

const config = require('./config');
const ctx = config.ctx;

let audioType = 'play';

module.exports = (audioFile, type) => {
  let audioType = type ? type : audioType;
  return Promise.coroutine(function* () {
    if (_.isArray(audioFile)) {
      audioFile.map(audio => yield ctx.runTask('audioplay', [audio, { "type": audioType }]))
    } else {
      yield ctx.runTask('audioplay', [audioFile, { "type": audioType }]);
    }
  }.bind(this))();
};
