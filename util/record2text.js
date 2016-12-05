'use strict';
const Promise = require('bluebird');
const _ = require('lodash');

const config = require('./config');
const ctx = config.ctx;

module.exports = () => {
  return Promise.coroutine(function* () {
    let recordfile = yield ctx.runTask('audiorec', { max });
    let sttresult = yield ctx.runTask('speech2text', { file: recordfile.output[0].path, parameter: 'offline&online' });
    return sttresult.text;
  }.bind(this))();
};
