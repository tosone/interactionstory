'use strict';

const path = require('path');

const uuid = require('uuid');

const config = require('../config');

class Library {
  constructor() {
    this.config = config;

    this.play_soundId = uuid.v4();
    this.break_soundId = uuid.v4();
    this.correlationId = uuid.v4();

    this.mqtt = this.config.client;

    this.sound_manager = 'sound_manager';
    this.sound_manager_complete = 'complete';
    this.sound_manager_terminate = 'terminate';
    this.sound_manager_play = 'sound_manager/play';
    this.sound_manager_break = 'sound_manager/break';

    this.speech2text_request = 'speech2text/do/request';
    this.speech2text_reply = 'speech2text/do/reply';

    this.interaction_start = 'interaction/start';
    this.interaction_pause = 'interaction/pause';
    this.interaction_resume = 'interaction/resume';

    this.interaction_commnad = 'interaction/command';

    this.button_topic = 'input/keyboard/keydown';
    this.nfc_topic = 'input/NfcCardGame/nfc';

    this.stt_reply = '好的可以是';

    this.interaction_dir = path.resolve(__dirname, '../example/test');

    this.init();
  }

  init() {
    this.mqtt.on('connect', () => {
      console.log('Parsing test connect MQTT succ.');
      this.mqtt.subscribe(this.sound_manager_play);
      this.mqtt.subscribe(this.sound_manager_break);
    });

    this.mqtt.on('message', (topic, payload) => {
      let msg = {};
      try { msg = JSON.parse(payload.toString()); } catch (e) { msg = {}; }
      if (topic === this.sound_manager_play) {
        this.play_soundId = msg.soundId;
        let topic = this.sound_manager + '/' + this.play_soundId + '/' + this.sound_manager_complete;
        this.mqtt.publish(topic, JSON.stringify({}));
      } else if (topic === this.sound_manager_break) {
        this.break_soundId = msg.soundId;
        let topic = this.sound_manager + '/' + this.break_soundId + '/' + this.sound_manager_complete;
        this.mqtt.publish(topic, JSON.stringify({}));
      } else if (topic === this.speech2text_request) {
        let text = '小老鼠';
        this.correlationId = msg.correlationId;
        this.mqtt.publish('speech2text/do/reply', JSON.stringify({ text, correlationId: msg.correlationId }));
      } else if (topic === 'environmental_perception/mic/recording/start') {
        this.mqtt.publish('environmental_perception/mic/recording/done', JSON.stringify({ correlationId: msg.correlationId, file: '/tmp/tmp' }));
      } else if (topic === 'interaction/start' || topic === 'interaction/resume') {
        this.mqtt.publish('interaction/stopped', JSON.stringify({ correlationId: msg.correlationId }));
      }
    });
  }

  pause() {
    this.mqtt.publish(this.interaction_pause, JSON.stringify({}));
  }

  reply(reply) {
    let text = reply !== '' ? reply : this.stt_reply;
    let payload = JSON.stringify({ text, correlationId: this.correlationId });
    this.mqtt.publish(this.speech2text_reply, payload);
  }

  terminate(num) {
    let progress = num !== '' ? num : 3;
    let topic = this.sound_manager + '/' + this.play_soundId + '/' + this.sound_manager_terminate;
    let payload = JSON.stringify({ progress });
    this.mqtt.publish(topic, payload);
  }

  command(command) {
    let cmd = command !== '' ? command : '下一页';
    let topic = this.interaction_commnad;
    let payload = JSON.stringify({ "command": cmd });
    this.mqtt.publish(topic, payload);
  }

  complete() {
    let topic = this.sound_manager + '/' + this.play_soundId + '/' + this.sound_manager_complete;
    let payload = JSON.stringify({});
    this.mqtt.publish(topic, payload);
  }

  mode(dir) {
    let directory = (dir && dir !== '') ? path.resolve(__dirname, '../example', dir) : this.interaction_dir;
    let payload = JSON.stringify({ dir: directory });
    this.mqtt.publish(this.interaction_start, payload);
  }

  start(dir) {
    let directory = (dir && dir !== '') ? dir : this.interaction_dir;
    let payload = JSON.stringify({ dir: directory });
    this.mqtt.publish(this.interaction_start, payload);
  }

  resume(dir) {
    let directory = (dir && dir !== '') ? dir : this.interaction_dir;
    let payload = JSON.stringify({ dir: directory });
    this.mqtt.publish(this.interaction_resume, payload);
  }

  nfc(code) {
    let nfcId = code !== '' ? code : '043969CAEC4A80';
    if (code === 'a') nfcId = '043969CAEC4A80';
    if (code === 'o') nfcId = '042D69CAEC4A80';
    if (code === 'e') nfcId = '041567CAEC4A80';
    let payload = JSON.stringify({ nfcId });
    this.mqtt.publish(this.nfc_topic, payload);
  }

  story(dir) {
    let directory = (dir && dir !== '') ? dir : this.interaction_dir;
    let payload = JSON.stringify({ dir: directory });
    this.mqtt.publish('interaction_story/life_cycle/start', JSON.stringify({
      "entities": [{
        "type": "keyword",
        "value": ""
        }],
      "correlationId": "bf866a5d-faa8-4de3-bf38-42edc33b1f20"
    }));
  }
}

module.exports = Library;
