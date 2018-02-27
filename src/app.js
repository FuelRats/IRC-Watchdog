import irc from  'irc'
const config = require('../config')

const spamfilterMatch = /\[Spamfilter\] ([A-Za-z0-9_´\[\]]*)!([A-Za-z0-9_´\[\]]*)@([A-Za-z0-9._\-]*) matches filter '(.*)': \[([A-Za-z0-9]* ([A-Za-z0-9#_`\[\]]*): .*)] /gi

const options = {
  userName: 'watchdog',
  realName: 'IRC WatchDog BOT',
  port: config.irc.port,
  autoConnect: true,
  autoRejoin: true,
  selfSigned: true,
  certExpired: true,
  floodProtection: false,
  messageSplit: 512,
  secure: true,
  password: config.irc.password
}

try {
  const client = new irc.Client(config.irc.server, 'WatchDog[BOT]', options)
  client.addListener('error', (message) => {
    console.log('error: ', message)
  })

  client.addListener('raw', (message) => {
    let [ sender, msg ] = message.args
    console.log(sender, msg)
  })


  client.addListener('notice', (sender, receiver, text) => {
    if (!sender) {
      let match
      while (match = spamfilterMatch.exec(text)) {
        let [capture, nick, user, host, filter, message, target] = match

        if (filter === '*opsignal*' || filter === '*opssignal*') {
          client.say('#opers', `${irc.colors.wrap('red', 'OPSIGNAL')} by ${nick} in channel/query ${target}. Original message: "${message}"`)
        } else {
          client.say('#opers', `${irc.colors.wrap('red', 'SPAMFILTER')} triggered by ${nick} in channel/query ${target}.`)
        }
      }
    }
  })
} catch (ex) {
  console.log(ex)
}