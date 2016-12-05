'use strict';
const _ = require('lodash');
const uuid = require('uuid');
const request = require('request');
const Promise = require('bluebird');
const sdk = require('nodecontainer-sdk');

const request = require('./request');

const mqtt = sdk.mqtt;

let getBabyloveUrl = baseurl + "/babylove?q=";
let getInteractionUrl = baseurl + "/interactiveStories?q=";

module.exports = (name, type) => {
  let url = getInteractionUrl;
  if (type === 'babystory') url = getBabyloveUrl;
  url += name;
  return Promise.coroutine(function* () {
    let bucket = '';
    request(encodeURI(url), (err, response, body) => {
      let info = null;
      if (err || response.state !== 200) {
        return null;
      } else {
        try {
          info = JSON.parse(body);
        } catch (e) {
          console.log(e);
        }
        bucket = info.bucket;
      }
    });

    let correlationId = uuid.v4();

    mqtt.publish("download_manager/download/start", JSON.stringify({
      "correlationId": correlationId,
      "bucket": bucket,
      "filename": filename
    }), () => {
      evt.on('download_manager_done', msg => {
        if (JSON.parse(msg.payload).correlationId == correlationId) {
          resolve(JSON.parse(msg.payload).file);
        }
      });

      evt.on('download_manager_failed', msg => {
        if (JSON.parse(msg.payload).correlationId == correlationId) {
          resolve("");
        }
      });
    });

  }.bind(this))();
};
