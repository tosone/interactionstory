'use strict';
const _ = require('lodash');
const request = require('request');
const Promise = require('bluebird');
const sdk = require('nodecontainer-sdk');

const macAddress = sdk.macAddress;
const baseurl = "http://bbcloud.com/api/devices/" + macAddress;

let storyType = 'interaction';
let getBabyloveUrl = baseurl + "/babylove?q=";
let getInteractionUrl = baseurl + "/interactiveStories?q=";
let searchInteractionUrl = baseurl + "/searchInteractiveStories?q=";

module.exports = (name, type, search) => {
  let url = getInteractionUrl;
  if (type === 'babystory') {
    storyType = 'babystory';
  }
  if (search && storyType === 'interaction') { url = searchInteractionUrl; }
  if (storyType === 'babystory') { url = getBabyloveUrl; }
  url += name;
  return Promise.coroutine(function* () {
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
        let storylist = type === 'babystory' ? info.babystory : info.storyList;
        return { bucket: info.bucket, storylist };
      }
    })
  }.bind(this))();
};
