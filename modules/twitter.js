var request = require('request');
var fs = require('fs');
var Twitter = require('twitter');
var moment = require('moment');
var data = require('../tweeters.json');
var tweeters = data.TWEETERS;

var debug = false;

var config = (!debug) ? require('../config.json') : require('../debug.json');
var channels = config.CHANNELS;

var bot_channels;
var db = {};

module.exports = {
  startWatch: startWatch,
  follow: follow,
  unfollow: unfollow,
  getTweeters: getTweeters,
};

var client = new Twitter({
  consumer_key: config.TWITTER.CONSUMER_KEY,
  consumer_secret: config.TWITTER.CONSUMER_SECRET,
  access_token_key: config.TWITTER.ACCESS_TOKEN_KEY,
  access_token_secret: config.TWITTER.ACCESS_TOKEN_SECRET,
});

function startWatch(c) {
  bot_channels = c;
  setInterval(checkTwitter, 1000*30);
}

function checkTwitter() {
  for (var i = 0; i < tweeters.length; i++) {
    checkFeed(tweeters[i])
    .then(function(url) {
      bot_channels.get(channels.FEED).sendMessage(url)
      .then(function(message) {

      }).catch(function(err) {
        console.log('err =', err);
      })
    }).catch(function(err) {
      if (err === 'already posted previously') {
        return;
      }
      
      console.log('err =', err);
    });
    
  }
}

function checkFeed(name) {
  var params = {
    screen_name: name,
    exclude_replies: true,
    include_rts: false,
    count: 200,
  };

  return new Promise(function(resolve, reject) {
    client.get('statuses/user_timeline', params, function(err, tweets, response) {
      if (err) {
        return reject(err);
      }

      var tweet = tweets[0];

      if (tweet.id_str in db) {
        return reject('already posted previously');
      }

      var tweet_time = moment(new Date(tweet.created_at));
      var url = 'https://twitter.com/' + tweet.user.screen_name + '/status/' + tweet.id_str;

      var cutoff = moment().subtract(3, 'minutes');
      if (tweet_time.isAfter(cutoff)) {
        db[tweet.id_str] = true;
        return resolve(url);
      }
    });
  });
}

function follow(name) {
  return new Promise(function(resolve, reject) {
    if (tweeters.includes(name)) {
      return reject(name + ' is already being followed.');
    }

    tweeters.push(name);
    fs.writeFile('./tweeters.json', JSON.stringify(data), function(err) {
      if (err) {
        return reject(err);
      }

      return resolve();
    });
  });
}

function unfollow(name) {
  return new Promise(function(resolve, reject) {
    if (!tweeters.includes(name)) {
      return reject(name + ' was not found.');
    }

    tweeters = tweeters.filter(function(n) {
      return n!==name;
    });

    fs.writeFile('./tweeters.json', JSON.stringify(data), function(err) {
      if (err) {
        return reject(err);
      }

      return resolve();
    });
  });
}

function getTweeters() {
  return tweeters.toString();
}