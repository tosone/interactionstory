'use strict';

const colors = require('colors');
const Promise = require('bluebird');
const sdk = require('nodecontainer-sdk');
const betterMatch = require('betterMatch');

const util = require('./util');
const config = require("./config");
const server = require('./servers');
const player = require('./util/play');
const recommend = require('./recommend');
const matchStory = require('./matchStory');
const interaction = require('./interaction');
const record2text = require('./util/record2text');

const mqtt = sdk.mqtt;
const evt = config.evt;
const app = config.app;
const file = config.file;

app.registerAction('app/story');
app.mount();

console.log(colors.green('interaction_story is ready.'));

// 我想听故事 1
// 我想听XXX的故事 2
// 我想听爸爸录得故事 3
// 我想听爸爸录得XXX的故事 4

app.mqttEmitter.on('PlayInteractiveStory', (msg, params, topic) => {
  let payload = {};
  payload.appId = app.appId;
  let value = '';
  try {
    value = JSON.parse(msg).name;
  } catch (e) {
    console.log(e);
  }
  payload.params = {
    entities: [
      { type: 'name', value: value }
    ]
  };
  mqtt.publish('notification_manager/notification/add', JSON.stringify(payload));
});

app.mqttEmitter.on('BabyLoveHearing', (msg, params, topic) => {
  let payload = {};
  payload.appId = app.appId;
  let value = '';
  try {
    value = JSON.parse(msg).name;
  } catch (e) {
    console.log(e);
  }
  payload.params = {
    entities: [
      { type: 'name', "value": value },
      { type: 'option', value: 'babystory' }
    ]
  };
  mqtt.publish('notification_manager/notification/add', JSON.stringify(payload));
});

app.post('start', function (ctx, intent) {
  config.ctx = ctx;
  startdispacher(intent.extras.entities || intent.extras.params.entities, this);
});

let startdispacher = entities => {
  return Promise.coroutine(function* () {
    let storyType = 'interaction';
    if (entities && entities.length !== 0 && entities[1] && entities[1].value === "babystory") {
      storyType = 'babystory';
    }
    if (!entities || entities.length === 0 || entities[0].value === "") { //没有故事名
      yield player(file.story_start); // 你想听什么故事
      let text = yield record2text(); // 录音
      let result = betterMatch(text, ["什么", "不知道", "什么故事"]);
      if (result) { // 用户不知道要听什么故事
        recommend();
      } else { // 用户说的话可能是个故事名
        matchStory(text, storyType, true); // 匹配搜索故事
      }
    } else if (entities[0].type === 'name') { // 推送的故事
      let story = config.store.search(entities[0].value);
      if (story.length !== 0) { // 设备上找得到
        interaction(story); // 直接播放这个故事
      } else { // 到云端下载
        matchStory(text, storyType, false);
      }
    } else { // 我想听XXX的故事
      let story = config.store.search(entities[0].value);
      if (story.length !== 0) { //设备上找得到
        interaction(story);
      } else { //设备上找不到
        matchStory(entities[0].value, 'name');
      }
    }
  }.bind(this))();
}

app.post('pause', function (ctx) {
  app.mqttEmitter.publish('interaction/pause');
  this.cancelAllTasks();
  this.end();
});

app.post('stop', function (ctx, intent) {
  util.exitWithAudio(file.story_end, true, true);
});
