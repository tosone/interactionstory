'use strict';

const _ = require('lodash');
const uuid = require('uuid');
const bluebird = require('bluebird');
const sdk = require('nodecontainer-sdk');

const config = require('./config');

const store = config.store;
const evt = config.evt;
const mqtt = sdk.mqtt;

module.exports = (path, type) => {
  return Promise.coroutine(function* () {
    let correlationId = uuid.v4();
    let interaction_stopped_evt = msg => {
      let ret = {};
      try {
        msg = JSON.parse(msg.payload);
      } catch (e) {
        console.log(e);
      }
      if (ret.correlationId == correlationId) {
        resolve(true);
      }
    }
    evt.removeListener('interaction/stopped', interaction_stopped_evt);
    mqtt.publish('interaction/' + type, JSON.stringify({
      dir: path,
      correlationId
    }), () => {
      evt.on('interaction/stopped', interaction_stopped_evt);
    });
  }.bind(this));
};
