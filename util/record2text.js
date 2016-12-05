'use strict';

const fs = require('fs-extra');
const child_process = require('child_process');

const _ = require('lodash');
const uuid = require('uuid');
const colors = require('colors');
const Promise = require('bluebird');

const max = 5;

module.exports = () => {
  const config = require('../config');
  const ctx = config.ctx;
  let recording_file = '/tmp/interaction_story_recording.fifo';
  return Promise.coroutine(function* () {
    yield new Promise(resolve => {
      child_process.exec('mkfifo -m 644 ' + recording_file, resolve);
    });
    let recording_wav_file = '/tmp/' + uuid.v4().split('-').join('') + '.wav';
    let output = [
      {
        'type': 'local',
        'path': recording_file
      }, {
        'type': 'local',
        'path': recording_wav_file
      }
    ];
    yield ctx.runTask('audiorec', { max, output });
    let sttresult = yield ctx.runTask('speech2text', { pipe: recording_file, parameter: 'online|stream=1' });
    return sttresult.text;
  }.bind(this))();
};
