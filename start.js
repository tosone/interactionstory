const config = require("./config");
const util = require("./util");
const co = require("co");
const betterMatch = require("betterMatch");

const app = config.app;
const client = config.client;
const file = config.file;
const topic = config.topic;


exports.startdispacher = function (payload) {
  //我想听故事
  //我想听小红帽的故事
}

exports.start_name = function (payload) {
  co(function* () {
    let story = payload.entities[0].value;

    let storyArr = yield new Promise((resolve, reject) => {
      client.keys("story_" + story, (err, reply) => {
        if (err) {
          resolve([]);
        } else {
          resolve(reply);
        }
      });
    });

    if (storyArr.length == 0) {//没有故事

    } else {
      let storyArr = betterMatch(story, storyArr, true);

      if (storyArr.length == 0) {
        let soundpass = yield new Promise((resolve, reject) => {
          util.soundmanager(file.no_story_found, 0, "break", resolve, reject);
        });

        if (soundpass) {
          exports.over_story();
        }
      } else {
        let reply = yield new Promise((resolve, reject) => {
          client.sort("story_" + story, "get", "*->name", "get", "*->path", (err, reply) => {
            if (err) {
              resolve([]);
            } else {
              console.log("reply:" + reply);
              resolve(reply);
            }
          });
        });

        let record = yield new Promise((resolve, reject) => {
          client.exists(reply[0].path.split("/").reverse()[0], (err, reply) => {
            if (err || reply == 0) {
              resolve(false);
            } else {
              resolve(true);
            }
          });
        });

        if (record) {//有记录
          let soundpass = yield new Promise((resolve, reject) => {
            util.soundmanager(file.record_ask, 0, "break", resolve, reject);
          });

          if(soundpass){
            let text = yield new Promise((resolve, reject) => {
              util.speechtotext(5, resolve);
            });

            if(util.choose(text)){
              
            }else{

            }
          }
        } else {//没有记录
          mqtt.publish(topic.interaciton_start, JSON.stringify({
            "dir": reply[0].path
          }));
        }
      }
    }
  });
}

exports.start_noname = function (payload) { }

exports.over_story = function () {
  config.changestate(false);
  mqtt.publish(topic.appstop, JSON.stringify({}));
}

exports.init = function (payload) { }
