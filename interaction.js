'use strict';

const _ = require('lodash');
const uuid = require('uuid');
const Promise = require('bluebird');
const sdk = require('nodecontainer-sdk');

const config = require('./config');

const store = config.store;
const evt = config.evt;
const mqtt = sdk.mqtt;

module.exports = (path, type) => {
  return Promise.coroutine(function* () {
    let correlationId = uuid.v4();
    yield new Promise(resolve => {
      let interaction_stopped_evt = (topic, payload) => {
        let ret = {};
        try {
          msg = JSON.parse(msg.payload.toString());
        } catch (e) {
          console.log(e);
        }
        if (ret.correlationId == correlationId) {
          resolve();
        }
      }
      evt.removeListener('interaction/stopped', interaction_stopped_evt);
      mqtt.publish('interaction/' + (type ? type : 'start'), JSON.stringify({
        dir: path,
        correlationId
      }), () => {
        mqtt.on('interaction/stopped', interaction_stopped_evt);
      });
    });
  }.bind(this))();
};
