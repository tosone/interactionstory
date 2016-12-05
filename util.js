const fs = require("fs");
const exec = require('child_process').exec;

const player = require('./util/play');

const config = require("./config");
const evt = config.evt;

const co = require('co');

const request = require("request");
const _ = require("lodash");
const uuid = require("uuid");
const ut = require('util');

const redisclient = require("redis").createClient({ db: 8 });
const client = config.client;

const betterMatch = require("betterMatch");
const thunder = config.thunder;
const app = config.app;



//选择判断
//text 文本字符串
//返回boolean
//功能判断一句话是肯定的还是否定的
exports.choose = function (text) {
  let result = betterMatch(text, ["不", "no", "没", "否", "不想", "不听", "不要"], true);
  return (result || result.length === 0) ? false : true;
}

//解压
//packagepath压缩文件路径
//path解压文件路径
//返回Promise
exports.tarpackage = function (packagepath, path) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path);

    let child = exec("tar -zxf " + packagepath + ' -C ' + path);

    child.on('exit', function () {
      fs.unlink(packagepath);
      resovle(true);
    });

    child.on('error', function (err) {
      fs.unlink(packagepath);
      resovle(false);
    });
  });
}

//获取云端信息
//如果失败则返回{}
//成功就把得到的info返回
exports.bbcloudinfo = function (url) {
  return new Promise((resolve, reject) => {
    console.log('in function bbcloudinfo', url);
    request(encodeURI(url), (err, res, body) => {

      if (err || res.state != 200) {

        resolve({});
      } else {
        let info = null;
        try {
          info = JSON.parse(body);
        } catch (e) {
          info = body;
        }
        resolve(info);
      }
    });
  });
}

//回馈云端
//返回Promise
//失败则返回false 成功则返回true
exports.bbcloudfeedback = function (url, body) {
  return new Promise((resolve, reject) => {
    request.post({
      url: url,
      body: body,
      json: true
    }, (err, res, body) => {
      if (err || res.status != 200) {
        resolve(false);
      } else {
        let info = {};
        try {
          info = JSON.parse(body);
        } catch (e) {
          info = body;
        }

        if (info.status == "ok") {
          resolve(true);
        } else {
          resolve(false);
        }
      }

    });
  });
}

exports.bbcloudtypetodevice = function (type) {
  if (config.storytype.join(",") == "basic,interaction,picture") {
    if (type == 1) {
      return "picture";
    }

    if (type == 2) {
      return "interaction";
    }
  }

  if (config.storytype.join(",") == "babylove") {
    return "babylove";
  }
}

//tts转换并播放
exports.playtext = function (text) {
  return config.ctx.runTask('text2speech', { text, parameter: 'offline&online' });
}

//模糊匹配
//words 匹配的字符串
//list Array 待匹配的列表
//number int 最大的限定
exports.bettermatch = function (words, list, number) {
  console.log('bettermath---words:', words);
  console.log('bettermath---list:', list);
  console.log('bettermath---number:', number);
  return new Promise((resolve, reject) => {
    let resultlist = betterMatch(words, list, true);
    if (resultlist) {
      if (resultlist.length >= number) {
        resultlist = _.dropRight(resultlist, resultlist.length - number);
      }
      resolve(resultlist);
    } else {
      resolve(resultlist);
    }
  });
}

//查询故事
//storyname 故事名
//type Array
exports.querythestory = function (storyname, type) {
  return new Promise((resolve, reject) => {
    let number = 5;

    redisclient.sort(storyname, "get", "story_*->id", "get", "story_*->name", "get", "story_*->type", "get", "story_*->path", "get", "story_*->version", (err, reply) => {

      if (err || !reply) {
        resolve([]);
      } else {
        var story = {};
        var storylist = [];
        config.storyindexlist = [];

        for (var i = 0; i < reply.length; i++) {

          if (type.indexOf(reply[Math.floor(i / number) * number + 2]) == -1) {
            continue;
          }

          switch (i % number) {
          case 0:
            story.id = reply[i];
            config.storyindexlist.push(reply[i]);
            break;
          case 1:
            story.name = reply[i];
            break;
          case 2:
            story.type = reply[i];
            break;
          case 3:
            story.path = reply[i];
            break;
          case 4:
            story.version = reply[i];
            storylist.push(story);
            story = {};
            break;
          default:
            break;
          }
        }
        resolve(storylist);
      }
    });
  });
}

//故事记录查询
exports.storyBreakPoint = function (record) {
  return new Promise((resolve, reject) => {
    redisclient.exists(record, (err, reply) => {
      if (err) {
        resolve(false);
      } else {
        if (reply != 0) {
          resolve(true)
        } else {
          resolve(false);
        }
      }
    });
  });
}


//存储故事
exports.savestory = function (name, type, path, version) {
  return new Promise((resolve, reject) => {
    redisclient.incr("story_number", (err, reply) => {
      if (err) {
        resolve(false);
      } else {

        reply = "story_" + reply;

        let data = ["id", reply, "name", name, "type", type, "path", path, "version", version];

        redisclient.lpush("storylist", reply, (err, reply) => {
          if (err) {
            redisclient.decr("story_number");
            resolve(false);
          } else {
            redisclient.lpush("story_" + name, reply, (err, reply) => {
              if (err) {
                redisclient.decr("story_number");
                redisclient.lpop("storylist");
                resolve(false);
              } else {
                redisclient.hmset(reply, data, (err, reply) => {
                  if (err) {
                    redisclient.decr("story_number");
                    redisclient.lpop("storylist");
                    redisclient.lpop(name);
                    resolve(false);
                  } else {
                    resolve(true);
                  }
                });
              }
            });
          }
        });
      }
    });
  });
}



exports.storyshedoperate = function (path, operate) {
  let number = 3;
  let storylist = config.storyshed;
  let story = "";
  if (operate == "push") {
    storylist.push(path);
    story = path;
  }

  if (operate == "pop") {
    story = storylist.pop();
  }

  if (operate == "clear") {
    storylist = [];
  }

  if (operate == "query") {
    if (storylist.length != 0) {
      story = storylist[storylist.length - 1];
    }
  }

  if (storylist.length >= number) {
    storylist = _.drop(storylist, storylist.length - number);
  }

  config.storyshed = storylist;
  return story;
}

//=============================================================
//以下为未稳定版框架代码
//=============================================================

//播放声音
exports.playsound = function (file, type) {
  config.ctx.runTask('audioplay', [file, { "type": type }]);
}

//播放声音
//stt
//播放几段音频 意图询问
//返回为文本
exports.askquestion = function (file) {
  return co(function* () {
    let type = 'play';
    let max = 5;
    let stopType = 'active';

    if (_.isArray(file)) {
      for (let item of file) {
        yield config.ctx.runTask('audioplay', [item, { "type": type }]);
      }
    } else {
      yield config.ctx.runTask('audioplay', [file, { "type": type }]);
    }

    let recordfile = yield config.ctx.runTask('audiorec', { max });
    recordfile = recordfile.output[0].path;
    var sttresult = yield config.ctx.runTask('speech2text', { file: recordfile, parameter: 'offline&online' });

    return sttresult.text;
  });
}


//播放一段音频 意图询问
//返回为文本
exports.ask = function (file) {
  return new Promise.coroutine(function* () {
    if (file) yield player(file);
    let result = yield record2text();
    let matchResult = betterMatch(text, ["不", "no", "没", "否", "不想", "不听", "不要"], true);
    return (matchResult || matchResult.length === 0) ? false : true;
  }.bind(this));
}

exports.init = function (ctx) {
  config.ctx = ctx;
  config.appDispatcher = ctx.getService('app-dispatcher');
  config.audio = ctx.getService('audio');
  config.webService = ctx.getService('web-service');
}

exports.exit = function (clear, remove) {
  if (clear) {
    exports.storyshedoperate("", "clear");
  }
  if (remove) {
    client.removeListener("message");
  }
  config.ctx = null;
  config.appDispatcher = null;
  config.webService = null;
  config.audio = null;

  config.appDispatcher.unlockPush2Talk();

  config.storytype = [];
  config.storyindexlist = [];

  config.ctx.stop();
}

//======================================
//mqtt
//======================================

//下载
//filename oss文件名
//bucket oss bucket
//返回为Promise
//下载成功 返回为文件保存的位置
//下载失败 返回空
exports.download = function (bucket, filename) {
  return new Promise((resolve, reject) => {
    let correlationId = uuid.v4();

    client.publish("download_manager/download/start", JSON.stringify({
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
  });
}

//通知notification
exports.notification = function (data) {
  console.log('notification recieve ', data.params.entities);
  let payload = {
    "appId": config.appId,
    "params": data.params
  }

  console.log('in notification payload', payload.params.entities);
  client.publish("notification_manager/notification/add", JSON.stringify(payload));
}

//调用脚本解析器
//返回为Promise
//
exports.playinteraction = function (path, type) {
  return new Promise((resolve, reject) => {
    let interactionId = uuid.v4();


    // if (intent) {
    client.publish("interaction/" + type, JSON.stringify({
      "dir": path,
      "interactionId": interactionId
    }), () => {
      evt.on('interaction_stopped', msg => {
        if (JSON.parse(msg.payload).interactionId == interactionId) {
          resolve(true);
        }
      });
    });
    // }
  });
}

function exit() {
  if (clear) {
    exports.storyshedoperate("", "clear");
  }
  if (remove) {
    client.removeListener("message");
  }
  config.ctx = null;
  config.appDispatcher = null;
  config.webService = null;
  config.audio = null;

  config.appDispatcher.unlockPush2Talk();

  config.storytype = [];
  config.storyindexlist = [];

  config.ctx.stop();
}

module.exports.exitWithAudio = (file, clear, remove) => {
  return Promise.coroutine(function* () {
    yield player(file, 'break');
    exit(clear, remove);
  }.bind(this));
};
