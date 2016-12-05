'use strict';
const _ = require('lodash');
const uuid = require('uuid');
const fs = require('fs-extra');
const request = require('request');
const Promise = require('bluebird');
const sdk = require('nodecontainer-sdk');
const exec = require('child_process').exec;

const util = require('../util');
const player = require('./play');
const config = require('../config');
const request = require('./request');

const mqtt = sdk.mqtt;
const app = config.app;
const file = config.file;
const storyBasePath = '/home/root/userdata/resource/interaction_story/';

let getBabyloveUrl = baseurl + "/babylove?q=";
let getInteractionUrl = baseurl + "/interactiveStories?q=";
let downloadList = [];
let correlationIdList = [];

let pop = (list, str) => {
  let temp = [];
  for (let item of list) {
    if (item !== str) {
      temp.push(item);
    }
  }
  return temp;
}

module.exports = (bucket, name, storyType) => {
  return Promise.coroutine(function* () {
    if (downloadList.indexOf(name) !== -1) {
      downloadList.push(name);
    } else {
      util.exitWithAudio(file.download_exist, true, true);
      return;
    }
    let correlationId = uuid.v4();
    correlationIdList.push(correlationId);
    yield player(file.download_promat);
    mqtt.publish("download_manager/download/start", JSON.stringify({
      "correlationId": correlationId,
      "bucket": bucket,
      "filename": filename
    }), () => {
      let clear = () => {
        mqtt.removeListener('download_manager/download/done', download_done_evt);
        mqtt.removeListener('download_manager/download/failed', download_failed_evt);
      }
      let download_done_evt = (topic, payload) => {
        let msg = JSON.parse(payload);
        let correlationId = msg.correlationId;
        let packagePath = msg.file;
        if (correlationIdList.indexOf(correlationId)) {
          pop(correlationIdList, correlationId);
          clear();
          let storyPath = storyBasePath + uuid.v4();
          fs.mkdirSync(storyPath);
          let child = exec("tar -zxf " + packagePath + ' -C ' + storyPath);
          child.on('exit', () => {
            fs.removeSync(packagepath);
            if (util.ask(file.downloadover_promat)) {
              interaction(storyPath);
            } else {
              // 我先去睡一会儿
            }
          });
          child.on('error', function (err) {
            fs.removeSync(packagepath);
            yield player(file.downloadfail_promat);
          });
        }
      }
      let download_failed_evt = (topic, payload) => {
        let correlationId = JSON.parse(payload).correlationId;
        if (correlationIdList.indexOf(correlationId)) {
          pop(correlationIdList, correlationId);
          clear();
          yield player(file.downloadfail_promat);
        }
      }
      mqtt.on('download_manager/download/done', download_done_evt);
      mqtt.on('download_manager/download/failed', download_failed_evt);
    });
  }.bind(this))();
};
