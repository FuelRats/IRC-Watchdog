import irc from  'irc'
import fs from 'fs'
import tls from 'tls'
import ChannelGuard from './ChannelGuard'
import FetchIP from './FetchIP'
import SessionTracker from './SessionTracker'
import Nexmo from 'nexmo'

const config = require('../config')

const spamfilterMatch = /\[Spamfilter\] ([A-Za-z0-9_´|\[\]]*)!([A-Za-z0-9_´|\[\]]*)@([A-Za-z0-9._\-]*) matches filter '(.*)': \[([A-Za-z0-9]* ([A-Za-z0-9#_`\[\]]*): .*)] /gi
const killMatch = /Received KILL message for ([A-Za-z0-9_´|\[\]]*)!([A-Za-z0-9_´|\[\]]*)@([A-Za-z0-9._\-]*) from ([A-Za-z0-9_´|\[\]]*) Path: [A-Za-z0-9._\-]*![A-Za-z0-9_´|\[\]]* \((.*)\)$/gi
const operServMatch = /from OperServ: (.*)/gi
const expireMatch = /(Expiring Global [A-Z]*:Line .*)/gi
const banMatch = /(Global [A-Z]*:line added .*)/gi
const failedOper = /Failed OPER attempt/gi

const moderatorUserModes = ['~', '&', '@', '%']
const moderatorHostnames = [
  'admin.fuelrats.com',
  'netadmin.fuelrats.com'
]

let secureContext = tls.createSecureContext({
  key:   fs.readFileSync('ssl/client.pem'),
  cert:  fs.readFileSync('ssl/client.pem'),
  requestCert: true
})

const options = {
  userName: 'bot',
  realName: 'Fuel (Rats) Inspection and Defense Operations',
  port: config.irc.port,
  autoConnect: true,
  autoRejoin: true,
  selfSigned: true,
  floodProtection: false,
  messageSplit: 512,
  secure: secureContext,
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
      client.nexmo.message.sendSms('FuelRats', number, message, {}, function (error, response) {
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
  new SessionTracker(client)

  client.addListener('error', (message) => {
    console.log('error: ', message)
  })

  client.addListener('raw', (message) => {
    let [ sender, msg ] = message.args
    console.log(sender, msg, message)
  })

  client.addListener('notice', (sender, receiver, text) => {
    if (!sender) {
      let spamMatch = spamfilterMatch.exec(text)
      if (spamMatch) {
        let [capture, nick, user, host, filter, message, target] = spamMatch

        if (filter === '*opsignal*' || filter === '*opssignal*') {
          client.say('#opers', `${irc.colors.wrap('light_red', 'OPSIGNAL')} by ${nick} in channel/query ${target}. Original message: "${message}"`)
          client.textNotification(`OPSIGNAL by ${nick} in channel/query ${target}. Original message: ${message}`)
        } else {
          client.say('#opers', `${irc.colors.wrap('light_red', 'SPAMFILTER')} triggered by ${nick} in channel/query ${target}.`)
        }
      }
      spamfilterMatch.lastIndex = 0

      let killMatches = killMatch.exec(text)
      if (killMatches) {
        let [capture, nick, user, host, sender, message] = killMatches
        client.say('#opers', `${irc.colors.wrap('light_red', 'KILL')} ${nick} (${host}) was killed by ${sender} with message: ${message}`)
      }
      killMatch.lastIndex = 0

      let operServMatches = operServMatch.exec(text)
      if (operServMatches) {
        let [capture, message] = operServMatches
        client.say('#opers', `${irc.colors.wrap('light_red', 'OperServ')} ${message}`)
      }
      operServMatch.lastIndex = 0

      let expireMatches = expireMatch.exec(text)
      if (expireMatches) {
        let [capture, message] = expireMatches
        client.say('#opers', `${irc.colors.wrap('light_red', 'Expiring')} ${message}`)
      }
      expireMatch.lastIndex = 0

      let banMatches = banMatch.exec(text)
      if (banMatches) {
        let [message] = banMatches
        client.say('#opers', `${irc.colors.wrap('light_red', 'NETWORK BAN')} ${message}`)
      }
      expireMatch.lastIndex = 0

      let failedOperMatches = failedOper.exec(text)
      if (failedOperMatches) {
        let [message] = failedOperMatches
        client.say('#opers', `${irc.colors.wrap('light_red', 'OPER FAILED')} ${message}`)
      }
      failedOper.lastIndex = 0
    }
  })
} catch (ex) {
  console.log(ex)
}