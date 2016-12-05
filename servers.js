'use strict';

const co = require("co");
const _ = require("lodash");
const uuid = require("uuid");
const betterMatch = require('betterMatch');

const util = require("./util");
const config = require("./config");
const player = require('./util/play');
const recommend = require('./recommend');
const matchStory = require('./matchStory');
const interaction = require('./interaction');
const record2text = require('./util/record2text');

const file = config.file;
const resource = config.resource;
const request_url = config.request_url;
const feedback_url = config.feedback_url;

let currStory = null;

//入口分配
//这里包括说话进入和手机端点播模拟push2talk进入
exports.startdispacher = function (entities, ctx) {
  co(function* () {
    let storyType = 'interaction';

    if (entities && entities.length !== 0 && entities[1].value === "babystory") {
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
        matchStory(entities[0].value, 'name', ctx);
      }
    }
  });
}

//下载完成后再启动
exports.downloadoverstart = function (operate, name, path, type) {
  return co(function* () {
    if (operate) { //下载成功
      if (yield util.ask(file.downloadover_promat)) { //要听之前下载的故事
        exports.continueplay({ "name": name, "path": path, "type": type });
      } else { //不听之前下载的故事
        exports.playandexit(file.story_end, false, true);
      }
    } else { //下载失败
      exports.playandexit(file.downloadfail_promat, false, true);
    }
  });
}

//匹配列表的参数初始
//text是查找的文本
//type是查找的方式，分为故事名查找  name，文本查找 words
exports.matchparameter = function (text, type, ctx) {
  return co(function* () {

    let storylist = config.store.getAll();
    let list = [];
    for (let item of storylist) {
      list.push(item.name);
    }

    // list = yield util.bettermatch(text, list);
    list = bettermatch(text, list);

    if (list === null || list.length === 0) {
      //本地找不到，去云端找
      storylist = yield exports.getbbcloudstory(text, type);

      if (JSON.stringify(storylist) != "{}") { //云端有这个故事

        if (storylist.info.length == 0) { //云端没有传入数据，进推荐列表
          console.log('play no match story and so on ');
          yield util.playsound(file.story_nomatch, 'play', ctx);
          console.log('play no match story and so on ');
          yield exports.tiplists();

        } else if (storylist.info.length == 1) {
          //云端找到了一个故事，先去设备上查找有没有这个故事，然后再决定是否要下载
          device_storylist = yield util.querythestory(storylist.info[0].name, config.storytype);

          if (device_storylist.length == 0) {
            //下载这个故事

            exports.downloadstory(storylist.info[0].name, storylist.info[0].version, storylist.info[0].filename, storylist.info[0].bucket, util.bbcloudtypetodevice(storylist.info[0].type), storylist.info[0].correlationId);
          } else {
            exports.continueplay(device_storylist[0]);
          }

        } else {
          //云端找到多个故事
          let namelist = [];
          let pathlist = [];
          let typelist = [];
          let ossinfo = [];

          for (let item of storylist.info) {
            if (namelist.length >= 3) {
              break;
            }
            namelist.push(item.name);
            ossinfo.push({
              "name:": item.name,
              "type": item.type,
              "bucket": storylist.bucket,
              "filename": item.filename,
              "authorized": item.authorized,
              "correlationId": item.correlationId || '',
              "version": item.version
            });
          }

          let filelist = [
            file.storyfind1,
            "oss://" + storylist.bucket + storylist.info[0].storyNameAudioFile,
            file.storyfind2,
            "oss://" + storylist.bucket + storylist.info[1].storyNameAudioFile,
          ];

          if (list.length == 3) {
            namelist.push(storylist.info[2].name);
            filelist.push(file.storyfind3);
            filelist.push("oss://" + storylist.bucket + storylist.info[2].storyNameAudioFile);
          }

          filelist.push(file.storyfind4);
          yield exports.matchlist(namelist, filelist, pathlist, typelist, ossinfo);

        }
      } else { //云端也没有这个故事，进推荐列表
        yield util.playsound(file.story_nomatch, 'play');
        console.log('xiaoguo ok');
        try {
          console.log('no story');
          yield exports.tiplists();
        } catch (e) { console.log(e); }
      }



    } else if (list.length == 1) { //本地找到一个，播放这个故事
      storylist = _.filter(storylist, { 'name': list[0] });
      exports.continueplay(storylist[0]);
    } else { //本地找到多个，去匹配列表

      storylist = _.map(list, (item) => {
        _.filter(storylist, { 'name': item });
      });

      let namelist = [storylist[0][0].name, storylist[1][0].name];
      let filelist = [
        file.storyfind1,
        storylist[0][0].path + "/title.ogg",
        file.storyfind2,
        storylist[1][0].path + "/title.ogg",
      ];
      let pathlist = [storylist[0][0].path, storylist[1][0].path];
      let typelist = [storylist[0][0].type, storylist[1][0].type];
      let ossinfo = [];

      if (list.length == 3) {
        namelist.push(storylist[2][0].name);
        filelist.push(file.storyfind3);
        filelist.push(storylist[2][0].path + "/title.ogg");
        pathlist.push(storylist[2][0].path);
        typelist.push(storylist[2][0].type);
      }

      filelist.push(file.storyfind4);
      yield exports.matchlist(namelist, filelist, pathlist, typelist, ossinfo);
    }
  });
}

//匹配列表
//namelist是所有的故事名
//filelist是所有的播放文件
//pathlist是设备上的路径列表
//typelist是故事的类型
//ossinfo是云端的信息列表，JOSN数组，包含name, type, bucket， filename， version, authorized, correlationId
//这里的type采用的是basic，interaction，picture，babystory
exports.matchlist = function (namelist, filelist, pathlist, typelist, ossinfo) {
  return co(function* () {
    let index = 0;

    let stt_text = yield util.askquestion(filelist);
    let list = ["一", "二"];

    if (namelist.length == 3) {
      list.push("三");
    }

    let storylist = yield util.bettermatch(stt_text, list, 1);

    if (storylist.length == 0) { //没有符合一二三的故事
      list = namelist;
      storylist = yield util.bettermatch(stt_text, list, 1);

      if (storylist.length != 0) { //有匹配到故事名的故事
        index = list.indexOf(storylist[0]);
      }
    } else { //有符合一二三的故事
      index = list.indexOf(storylist[0]);
    }

    if (pathlist.length != 0) { //本地有此故事
      //播放此故事
      exports.continueplay({ "name": namelist[index], "path": pathlist[index], "type": typelist[index] });
    } else { //云端查询到的故事
      //本地数据库查询有无故事
      let storylist = yield util.querythestory(namelist[index], config.storytype);

      if (storylist.length != 0) {
        //播放此故事
        exports.continueplay(storylist[0]);
      } else {
        if (ossinfo[index].authorized == 1) { //有权限下载
          //下载此故事，并且记录在数据库并通知消息系统
          yield exports.downloadstory(ossinfo[index].name, ossinfo[index].version, ossinfo[index].filename, ossinfo[index].bucket, util.bbcloudtypetodevice(ossinfo[index].type), ossinfo[index].correlationId);
          util.exit(false, true);
        } else { //没有权限下载
          exports.playandexit(file.storybuy, false, true);
        }
      }
    }
  });
}

//获取云端数据并对数据进行一致性处理
exports.getbbcloudstory = function (text, type) {
  return co(function* () {
    let storylist = {};
    if (config.storytype.join(',') == 'basic,interaction,picture') {
      if (type == "name") {
        storylist = yield util.bbcloudinfo(request_url.interactiveStories + text);
      }
      if (type == "words") {
        storylist = yield util.bbcloudinfo(request_url.searchInteractiveStories + text);
      }
      if (JSON.stringify(storylist) != "{}") {
        storylist.info = storylist.storyList;
      }
    }

    if (config.storytype.join(',') == 'babylove') {
      storylist = yield util.bbcloudinfo(request_url.searchInteractiveStories + text);
      if (JSON.stringify(storylist) != "{}") {
        storylist.info = storylist.babystory;
        for (let item of storylist.info) {
          item.version = item.storyAudioFileVersion;
          item.storyNameAudioFile = nameAudioFile;
          item.authorized = item.priority;
        }
      }
    }
    return storylist;
  });

}

//下载故事，退出应用，数据库存储，通知消息系统
exports.downloadstory = function (name, version, filename, bucket, type, correlationId) {
  return co(function* () {
    if (config.downloadlist.indexOf(bucket + filename) != -1) { //已经在下载中
      exports.playandexit(file.download_exist, false, true);
    } else { //没有在下载中
      config.downloadlist.push(bucket + filename);
      exports.playandexit(file.download_promat, false, false);

      let packagepath = yield util.download(bucket, filename);
      if (packagepath != "") { //下载成功
        let path = resource[type] + uuid.v4;
        if (yield util.tarpackage(packagepath, path)) { //解压成功
          if (config.store.save(name, type, path, version)) { //存储成功
            //通知消息系统
            exports.notification(false, path, name, type);

            if (type == "basic" || type == "interaction" || type == "picture") {

              if (type == "interaction") {
                util.bbcloudfeedback([{ "name": name, "type": 2 }]);
              }

              if (type == "picture") {
                util.bbcloudfeedback([{ "name": name, "type": 1 }]);
              }
            }

            if (type == "babylove") {
              util.bbcloudfeedback([{ "correlationId": correlationId, "name": name, "version": version }]);
            }

            config.downloadlist = _.dropWhile(config.downloadlist, item => {
              return item != bucket + filename;
            });
          } else { //存储失败
            exports.notification(false, "", "", "");
            config.downloadlist = _.dropWhile(config.downloadlist, item => {
              return item != bucket + filename;
            });
          }
        } else { //解压失败
          exports.notification(false, "", "", "");
          config.downloadlist = _.dropWhile(config.downloadlist, item => {
            return item != bucket + filename;
          });
        }
      } else { //下载失败
        exports.notification(false, "", "", "");
        config.downloadlist = _.dropWhile(config.downloadlist, item => {
          return item != bucket + filename;
        });
      }
    }
  });
}

exports.continueplay = function (story) { // 查询故事是否有断点，询问是否要继续听
  return co(function* () {
    let continueplay = false;
    let path = story.path;

    if (yield util.storyBreakPoint(_.takeRight(path.split("/")))) {
      yield player(file.record_ask);
      let result = yield record2text()
      if (yield util.ask(file.record_ask)) {
        continueplay = true;
      }
    }

    currStory = path; // 存储当前正在播放的故事路径
    yield util.playinteraction(path, continueplay ? 'resume' : 'start');
    currStory = null; // 移除当前正在播放的故事的路径
    util.exit(false, true);
  });
}

// 播放一个声音然后退出应用
exports.playandexit = function (file, clear, remove) {
  return Promise.coroutine(function* () {
    yield player(file, 'break');
    util.exit(clear, remove);
  }.bind(this));
}

// 故事机通知notification
exports.notification = function (operate, path, name, type) {
  util.notification({ restart: true, operate, name, path, type });
}
