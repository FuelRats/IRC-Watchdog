import irc from  'irc'
import ChannelGuard from './ChannelGuard'
import FetchIP from './FetchIP'
import Nexmo from 'nexmo'

const config = require('../config')

const spamfilterMatch = /\[Spamfilter\] ([A-Za-z0-9_´\[\]]*)!([A-Za-z0-9_´\[\]]*)@([A-Za-z0-9._\-]*) matches filter '(.*)': \[([A-Za-z0-9]* ([A-Za-z0-9#_`\[\]]*): .*)] /gi

const moderatorUserModes = ['~', '&', '@', '%']
const moderatorHostnames = [
  'admin.fuelrats.com',
  'netadmin.fuelrats.com'
]

const options = {
  userName: 'bot',
  realName: 'Fuel (Rats) Inspection and Defense Operations',
  port: config.irc.port,
  autoConnect: true,
  autoRejoin: true,
  selfSigned: true,
  certExpired: true,
  floodProtection: false,
  messageSplit: 512,
  secure: true,
  password: config.irc.password,
  channels: config.irc.channels
}

try {
  const client = new irc.Client(config.irc.server, config.irc.nickname, options)

  client.nexmo = new Nexmo({
    apiKey: config.nexmo.key,
    apiSecret: config.nexmo.secret
  })

  client.textNotification = function (message) {
    for (let number of config.nexmo.numbers) {
      client.nexmo.message.sendSms('The Fuel Rats', number, message, {}, function (error, response) {
        if (error) {
          console.log('NEXMO Error', error)
        } else {
          console.log('NEXMO', response)
        }
      })
    }
  }

  client.isModerator = function (channel, message)  {
    let hasAdminHostname = moderatorHostnames.some(h => h === message.host)

    let umode = this.getUserModeSymbol (channel, message.nick)
    let hasAdminUserMode = moderatorUserModes.some(u => u === umode)

    return Boolean(hasAdminHostname || hasAdminUserMode)
  }


  client.getUserModeSymbol = function (channel, nickname) {
    if (!this.chans[channel]) {
      return null
    }
    return this.chans[channel].users[nickname]
  }

  new ChannelGuard(client)
  new FetchIP(client)

  client.addListener('error', (message) => {
    console.log('error: ', message)
  })

  client.addListener('raw', (message) => {
    let [ sender, msg ] = message.args
    console.log(sender, msg, message)
  })


  client.addListener('notice', (sender, receiver, text) => {
    if (!sender) {
      let match
      while (match = spamfilterMatch.exec(text)) {
        let [capture, nick, user, host, filter, message, target] = match

        if (filter === '*opsignal*' || filter === '*opssignal*') {
          client.say('#opers', `${irc.colors.wrap('red', 'OPSIGNAL')} by ${nick} in channel/query ${target}. Original message: "${message}"`)
          client.textNotification(`OPSIGNAL by ${nick} in channel/query ${target}. Original message: ${message}`)
        } else {
          client.say('#opers', `${irc.colors.wrap('red', 'SPAMFILTER')} triggered by ${nick} in channel/query ${target}.`)
        }
      }
    }
  })
} catch (ex) {
  console.log(ex)
}