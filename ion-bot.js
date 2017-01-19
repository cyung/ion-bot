var Discord = require('discord.js');
var twitch = require('./modules/twitch');
var twitter = require('./modules/twitter');

var debug = false;

var config = (!debug) ? require('./config.json') : require('./debug.json');
var channels = config.CHANNELS;
var bot = new Discord.Client();


bot.on('ready', function() {
  console.log('Ready.');
  bump();
  twitch.startWatch(bot.channels);
  twitter.startWatch(bot.channels);
});

bot.on('message', function(message) {
  var content = message.content;
  if (message.author.id === bot.user.id) {
    return;
  }
  if (content.match(/https?:\/\//)) {
    if (!bot.guilds.has(config.GUILDS.CASUALGAMING)) {
      return;
    }

    var roles;

    try {
      roles = bot.guilds.get(config.GUILDS.CASUALGAMING)
        .members.get(message.author.id)._roles;
      if (roles.length === 0) {
        message.delete();
        return;
      }
    } catch(err) {
      console.log('err =', err);
      console.log('message.content =', message.content);
    }
  }
  
  if (content.match(/^!mute\s.+$/)) {
    reply(message, 'so abusive');
  }
  else if (content.match(/^!add_streamer\s[a-zA-Z0-9_]+$/)) {
    if (!isAuthorized(message)) {
      return;
    }

    var name = content.split(' ')[1];
    twitch.addStreamer(name)
    .then(function() {
      reply(message, 'added ' + name + ' to the streamer list.');
    }).catch(function(err) {
      reply(message, err);
    });
  }
  else if (content.match(/^!follow\s[a-zA-Z0-9_]+$/)) {
    if (!isAuthorized(message)) {
      return;
    }

    var name = content.split(' ')[1];
    twitter.follow(name)
    .then(function() {
      reply(message, 'started following ' + name);
    }).catch(function(err) {
      reply(message, err);
    });
  }
  else if (content.match(/^!remove_streamer\s[a-zA-Z0-9_]+$/)) {
    if (!isAuthorized(message)) {
      return;
    }

    var name = content.split(' ')[1];
    twitch.removeStreamer(name)
    .then(function() {
      reply(message, 'removed ' + name + ' from the streamer list.');
    }).catch(function(err) {
      reply(message, err);
    });
  }
  else if (content.match(/^!unfollow\s[a-zA-Z0-9_]+$/)) {
    if (!isAuthorized(message)) {
      return;
    }

    var name = content.split(' ')[1];
    twitter.unfollow(name)
    .then(function() {
      reply(message, 'unfollowed ' + name);
    }).catch(function(err) {
      reply(message, err);
    });
  }
  else if (content.match(/^!streamers$/)) {
    var streamers = twitch.getStreamers();
    reply(message, streamers);
  }
  else if (content.match(/^!tweeters$/)) {
    var tweeters = twitter.getTweeters();
    reply(message, tweeters);
  }
  else if (content.match(/^!test$/)) {
    reply(message, message.channel.id);
  }
  else if (content.match(/^!newsletter\s[\s\S]+$/)) {
    if (!isAuthorized(message)) {
      return;
    }

    var regexp = /^!newsletter\s([\s\S]+)$/;
    var match = regexp.exec(content);
    var members = message.channel.guild.members;
    notifyAll(members, match[1]);
  }
  else if (content.match(/^You can only bump once every.*/)) {
    setTimeout(function() {
      message.delete();
    }, 2000);
  }
});

function isAuthorized(message) {
  if (debug) {
    return true;
  }

  if (message.channel.id !== channels.ADMIN) {
    reply(message, 'you are unauthorized in this channel.');
  }

  return message.channel.id === channels.ADMIN;
}

function reply(message, output) {
  message.reply(output)
  .then(function() {
    
  }).catch(function(err) {
    console.log('err =', err);
  });
}

function bump() {
  var message = '=bump';
  bot.channels.get(channels.TESTING).sendMessage(message)
  .then(function(message) {
    setTimeout(function() {
      message.delete();
    }, 2000);
    setTimeout(bump, 1000*60*61);
  }).catch(function(err) {
    console.log('err =', err);
  });
}

function notifyAll(members, output) {
  for (var [key, member] of members) {
    if (member.id === bot.user.id) {
      continue;
    }
    member.sendMessage(output)
    .then(function() {

    }).catch(function(err) {
      console.log('err =', err);
    });
  }
}

bot.login(config.TOKEN)
.then(function() {
  console.log('Logged in.');
}).catch(function(err) {
  console.log('err =', err);
});