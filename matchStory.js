'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const betterMatch = require('betterMatch');

const store = require('./store');
const config = require('./config');
const player = require('./util/play');
const recommend = require('./recommend');
const request = require('./util/request');
const interaction = require('./interaction');

const file = config.file;

let bucket = '';

module.exports = (text, storyType, search) => {
  console.log(storyType);
  return Promise.coroutine(function* () {
    let storylist = store.getAll();
    let nameList = [];
    for (let item of storylist) {
      nameList.push(item.name);
    }
    let matchResult = betterMatch(text, nameList);
    if (!matchResult) { // 模糊匹配结果为空去云端查找
      let onlineStorys = yield request(text, storyType, search);
      console.log(onlineStorys);
      if (onlineStorys.storylist.length === 0) {
        recommend();
        return;
      }
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
      if (matchResult || matchResult.length === 0) { // 不知道用户在说什么
        util.exitWithAudio(file.storyexit, false, true);
      } else { // 用户说了其中一个数字
        let onlineStory = onlineStorys[matchText.indexOf(matchResult)];
        if (onlineStory) {
          if (store.search(onlineStory['name'])) {
            interaction(onlineStory);
          } else {
            if (onlineStory['priority'] === 1) {
              download(bucket, onlineStory[storyType === 'interaction' ? 'filename' : 'storyAudioFile'], storyType);
            } else {
              util.exitWithAudio(file.storybuy, false, true);
            }
          }
        } else {
          util.exitWithAudio(file.storyexit, false, true);
        }
      }
    } else {
      let story = store.search(matchResult);
      if (_.isArray(story)) {
        story = _.sample(story);
      }
      interaction(story.path);
    }
  }.bind(this))();
};
