'use strict';

const config = require("./config");

const file = config.file

const evt = config.evt;
const app = config.app;

const server = require('./servers');
const util = require('./util');

let push2talkinput = '';

app.registerAction('app/story');

app.mount();

//我想听故事 1
//我想听XXX的故事 2
//我想听爸爸录得故事 3
//我想听爸爸录得XXX的故事 4

app.mqttEmitter.on('PlayInteractiveStory', (msg, params, topic) => {
  let payload = {};
  payload.appId = app.appId;
  payload.params = {
    "entities": [
      { "type": "name", "value": JSON.parse(msg).name }
    ]
  };
  util.notification(payload);
});

app.mqttEmitter.on('BabyLoveHearing', (msg, params, topic) => {
  //模拟push2talk的输入
  let payload = {};
  payload.appId = app.appId;
  payload.params = {
    "entities": [
      //msg
      { "type": "name", "value": JSON.parse(msg).name },
      { "type": "option", "value": "babystory" }
    ]
  };

  app.mqttEmitter.publish('notification_manager/notification/add', JSON.stringify(payload));
});

/*app.mqttEmitter.on('interaction/not_related', (msg, params, topic) => {

  app.mqttEmitter.publish('life_cycle/half_lock_not_related', JSON.stringify(push2talkinput));
  app.mqttEmitter.publish('interaction/pause');

});

app.mqttEmitter.on('half_lock_confirm', msg => {

  push2talkinput = JSON.parse(msg.payload).text;

  let payload = {};
  payload.command = push2talkinput;

  client.publish('interaction/command', JSON.stringify(payload));
});*/


app.post('start', function (ctx, intent) {
  config.ctx = ctx;
  console.log('start intent', intent.extras.entities);
  if (intent.extras.entities) {
    server.startdispacher(intent.extras.entities, this);
  } else {
    console.log('start entities', intent.extras.params.entities);
    server.startdispacher(intent.extras.params.entities, this);
  }
});

app.post('pause', function (ctx) {

  console.log('paused');

  app.mqttEmitter.publish('interaction/pause');

  this.cancelAllTasks();

  this.end();

});


app.post('stop', function (ctx, intent) {

  server.playandexit(file.story_end, true, true);

});





//============================================
//这里还有半锁相关的东西未完成
//入口处应该分开下载之后的流程和语音手机输入流程
//这里还需要对手机端输入数据进行处理
