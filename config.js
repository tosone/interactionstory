'use strict';

const path = require('path');
const os = require('os');

const sdl = require('nodecontainer-sdk');

const store = require('./store');

const appId = "interaction_story";
const basepath_app = "/home/root/userdata/apps/" + appId + "/";
const basepath_resource = "/home/root/userdata/resource/" + appId + "/";

let macaddress = null;
let networkInterfaces = os.networkInterfaces();

for (let netName in networkInterfaces) {
  for (let o of networkInterfaces[netName]) {
    if (o.mac != "00:00:00:00:00:00") {
      macaddress = o.mac;
    }
  }
}

const bbcloudstory = "bbcloud-story";
const macAddress = macaddress;
//const baseurl = "http://bbcloud.com/"+bbcloudstory + "/api/devices/" + macAddress;
const baseurl = "http://bbcloud.com/api/devices/" + macAddress;


const thunder = require('thunder-sdk');
const app = thunder.app('interaction_story');


const client = require("mqtt").connect('mqtt://localhost:1883');
const event = require('events').EventEmitter;
const evt = new event();

const file = {
  "identification_failed": basepath_app + "identification_failed.ogg", //我没有听清你说的话，可以再说一次么
  "after_story": basepath_app + "after_story.ogg", // 故事听完了,你还想听其他的故事么?
  "story_start": basepath_app + "story_start.ogg", // 亲爱的小朋友，你想听什么故事呢？
  "download_promat": basepath_app + "download_promat.ogg", // 现在正在下载故事，来玩点别的吧
  "downloadover_promat": basepath_app + "downloadover_promat.ogg", // 亲爱的小朋友，故事下载成功了，现在就要听吗？大声的说出你的回答吧！
  "file_crashed": basepath_app + "file_crashed.ogg", // 故事被我们不小心弄坏了。（故事文件找不到或者损坏）
  "story_play": basepath_app + "story_play.ogg", // 亲爱的小朋友，开始播。
  "no_story_found": basepath_app + "no_story_found.ogg", // 你还没有这个故事呢
  "storyfind1": basepath_app + "storyfind1.ogg", // 酱酱酱~~，我帮你找了几个故事，第一个
  "storyfind2": basepath_app + "storyfind2.ogg", // 第二个
  "storyfind3": basepath_app + "storyfind3.ogg", // 第三个
  "storyfind4": basepath_app + "storyfind4.ogg", // 你想听哪个
  "storybuy": basepath_app + "storybuy.ogg", // 卖故事啦卖故事啦！要买了这个故事才能听哦，你要买吗？
  "storyexit": basepath_app + "storyexit.ogg", // 哼！没有你想听的故事么，那我去睡觉去了！
  "story_nomatch": basepath_app + "story_nomatch.ogg", //  啊哦~ 我脑袋里没有这个故事呢
  "excuse1": basepath_app + "excuse1.ogg", // （一个简短的音效）我有想到几个，嗯~，你要不要听
  "excuse2": basepath_app + "excuse2.ogg", // 那
  "excuse3": basepath_app + "excuse3.ogg", // 要不要听
  "excuse4": basepath_app + "excuse4.ogg", // 还有
  "excuse5": basepath_app + "excuse5.ogg", // 要听吗
  "excuse6": basepath_app + "excuse6.ogg", // 好吧
  "excuse7": basepath_app + "excuse7.ogg", // 要不要
  "downloadfail_promat": basepath_app + "downloadfail_promat.ogg", // 故事下载失败了...
  "identification_null": basepath_app + "identification_null.ogg", //你好像说的不对哦，再说一次吧。
  "record_ask": basepath_app + "record_ask.ogg", // 之前你没有听完这个故事，要不要继续听！
  "download_exist": basepath_app + "download_exist.ogg", //  故事正在下载，请耐心等待。
  "empty_story": basepath_app + "empty_story.ogg", //  我发现你就根本木有故事哦！
  "story_end": basepath_app + "story_end.ogg", // 拜拜喽！（退出故事应用时的提示音）
  "nfc_null": basepath_app + "nfc_null.ogg" // 你没有刷卡哟
}

const resource = {
  'basic': basepath_resource + 'basic/',
  'interaction': basepath_resource + 'interaction/',
  'picture': basepath_resource + 'picture/',
  'babylove': basepath_resource + 'babylove/'

};

const request_url = {
  "interactiveStories": baseurl + "/interactiveStories?q=",
  "searchInteractiveStories": baseurl + "/searchInteractiveStories?q=",
  "tipsFiles": baseurl + "/tipsFiles?name=",
  "babylove": baseurl + "/babylove?q=",
};

const feedback_url = {
  "storyfeedback": baseurl + "/interactiveStories/download-reply",
  "babylovefeedback": baseurl + "/babylove/download-reply",
};


module.exports = {
  //资源部分
  file,
  resource,
  request_url,
  feedback_url,

  //框架部分
  thunder,
  app,
  ctx: null,
  webService: null,
  audio: null,
  appDispatcher: null,

  //依赖部分
  client: sdk.mqtt,
  evt,

  //应用部分
  appId,
  storyshed: [],
  storytype: [],
  storyindexlist: [],
  downloadlist: [],
  dbname: path.resolve('storylist.json'),
  store
};
