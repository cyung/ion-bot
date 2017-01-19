var request = require('request');
var fs = require('fs');
var moment = require('moment');
var data = require('../streamers.json');
var streamers = data.STREAMERS;

var debug = false;

var config = (!debug) ? require('../config.json') : require('../debug.json');
var channels = config.CHANNELS;

var bot_channels;
var stream_status = {};
var stream_messages = {};

module.exports = {
  startWatch: startWatch,
  addStreamer: addStreamer,
  removeStreamer: removeStreamer,
  getStreamers: getStreamers,
};

function startWatch(c) {
  bot_channels = c;
  for (var i = 0; i < streamers.length; i++) {
    stream_status[streamers[i]] = false;
  }
  setInterval(checkTwitch, 15000);
}

function checkTwitch() {
  for (var i = 0; i < streamers.length; i++) {
    checkStream(streamers[i])
    .then(function(data) {
      var name = data[1];
      if (data[0]) {
        var channel = data[0];
        
        if (stream_status[name]) {
          return;
        }

        stream_status[name] = moment();

        var output = '*' + channel['display_name'];
        output += '* is now streaming *' + channel['game'];
        output += '*.\n    Watch at https://twitch.tv/' + name + '';
        bot_channels.get(channels.STREAM).sendMessage(output)
        .then(function(message) {
          var exp = /https:\/\/twitch.tv\/(.+)$/;
          var match = exp.exec(message.content);
          stream_messages[match[1]] = message;
        });
      } else {
        // channel is currently offline
        if (!stream_status[name]) {
          return;
        }

        // don't mark offline till 5 minutes incase of stream downtime
        if (moment().valueOf() - stream_status[name].valueOf() < 1000*60*5) {
          return;
        }

        stream_status[name] = false;

        getLatestVOD(name).then(function(link) {
          var output = '*' + name + '* has finished streaming.\n';
          if (link !== '') {
            output += 'Check out the latest VOD at ' + link;
          }
          stream_messages[name].edit(output);
        }).catch(function(err) {
          console.log('err =', err);
        })
      }
    }).catch(function(err) {
      console.log('twitch api err =', err);
    });
  }
}

function checkStream(name) {
  var options = {
    url: 'https://api.twitch.tv/kraken/streams/' + name + '/',
    qs: {
      client_id: '363t19n5iw35offn856bvxqgs46ct64',
    }
  };

  return new Promise(function(resolve, reject) {
    var my_name = name;
    request(options, function(err, res, body) {
      if (err) {
        return reject(err);
      }

      var data;

      try {
        data = JSON.parse(body);
      } catch(e) {
        return reject(err);
      }

      if (data['stream']) {
        resolve([data['stream']['channel'], my_name]);
      } else {
        resolve([null, my_name]);
      }
    });
  });
}

function getLatestVOD(name) {
  var options = {
    url: 'https://api.twitch.tv/kraken/channels/' + name + '/videos',
    qs: {
      client_id: '363t19n5iw35offn856bvxqgs46ct64',
    }
  };

  return new Promise(function(resolve, reject) {
    request(options, function(err, res, body) {
      if (err) {
        return reject(err);
      }

      var videos = JSON.parse(body)['videos'];
      if (!videos) {
        return reject('no videos present');
      }

      if (videos.length === 0) {
        resolve('');
      } else {
        resolve(videos[0]['url']);
      }
    });
  });
}

function addStreamer(name) {
  return new Promise(function(resolve, reject) {
    if (streamers.includes(name)) {
      return reject(name + ' is already on the list.');
    }

    streamers.push(name);
    fs.writeFile('./streamers.json', JSON.stringify(data), function(err) {
      if (err) {
        return reject(err);
      }

      return resolve();
    });
  });
}

function removeStreamer(name) {
  return new Promise(function(resolve, reject) {
    if (!streamers.includes(name)) {
      return reject(name + ' is not on the list.');
    }

    streamers = streamers.filter(function(n) {
      return n!==name;
    });

    fs.writeFile('./streamers.json', JSON.stringify(data), function(err) {
      if (err) {
        return reject(err);
      }

      return resolve();
    });
  });
}

function getStreamers() {
  return streamers.toString();
}