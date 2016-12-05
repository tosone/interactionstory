'use strict';

const _ = require('lodash');
const bluebird = require('bluebird');
const betterMatch = require('betterMatch');

const config = require('./config');
const player = require('./util/play');
const request = require('./util/request');

const file = config.file;
const store = config.store;

let bucket = '';

module.exports = (text, storyType, search) => {
  return Promise.coroutine(function* () {
    let storylist = store.getAll();
    let nameList = [];
    for (let item of storylist) {
      list.push(item);
    }
    let matchResult = bettermatch(text, list);
    if (matchResult || matchResult.length === 0) { // 模糊匹配结果为空去云端查找
      let onlineStorys = yield request(text, storyType, search);
      bucket = onlineStorys.bucket;
      for (let index in onlineStorys.storylist) {
        yield player(file['storyfind' + (index + 1).toString()]);
        yield player('oss://' + bucket + '/' + onlineStorys[index].storyNameAudioFile);
        if (index === 2) {
          break;
        }
      }
      yield player(file['storyfind4']);
      let recordText = yield record2text();
      let matchText = ["一", "二", "三"];
      let matchResult = betterMatch(recordText, matchText);
      if (matchResult || matchResult.length === 0) {
        if (onlineStorys[matchText.indexOf(matchResult)]) {
          interaction(onlineStorys[matchText.indexOf(matchResult)])
        } else {
          util.exitWithAudio(file.storyexit, false, true);
        }
      } else {
        util.exitWithAudio(file.storyexit, false, true);
      }
    } else {
      let story = store.search(matchResult);
      if (_.isArray(story)) {
        story = _.sample(story);
      }
      interaction(story);
    }
  }.bind(this));
};
