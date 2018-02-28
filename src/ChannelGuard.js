import FloodProtection from 'flood-protection'
import Mutes from './classes/Mutes'

const users = {}


const TIMEOUT_LENGTH = 5 * 60 * 1000 // 5 minutes

export default class ChannelGuard {
  client = null

  constructor (client) {
    this.client = client

    client.addListener('message#', this.onMessage.bind(this))
  }

  onMessage (sender, channel, text, message) {
    let voiced = false

    let isMod = this.client.isModerator(channel, message)
    if (isMod) {
      if (text.startsWith('!unmute')) {
        this.unmute(sender, channel, text, message)
      }
      return
    }

    if (!users[channel]) {
      users[channel] = {}
    }

    if (!users[channel][sender]) {
      users[channel][sender] = new FloodProtection({ rate: 3, per: 5 })
    }

    let userMessageRate = users[channel][sender]
    if (!userMessageRate.check()) {
      if (this.client.getUserModeSymbol(channel, sender) === '+') {
        voiced = true
        this.client.send('MODE', channel, '-v', sender)
      }

      this.client.send('MODE', channel, '+b', `~q:*!*@${message.host}`)
      this.client.say(sender, `You have been automatically muted in ${channel} for 5 minutes due to too many messages in a short period of time.`)

      let timer = setTimeout(() => {
        let mute = Mutes.get(channel, sender)
        if (!mute) {
          return
        }


        if (mute.voiced) {
          this.client.send('MODE', channel, '+v', nick)
        }
        this.client.send('MODE', channel, '-b', `~q:*!*@${mute.host}`)
      }, TIMEOUT_LENGTH)

      let mute = {
        timer, voiced, host: message.host
      }

      Mutes.add(channel, sender, mute)
    }
  }

  unmute (sender, channel, text, message) {
    let getUnmuteParameters = /!unmute ([A-Za-z0-9_´\[\]]*)/gi
    let [, unmuteName] = getUnmuteParameters.exec(text)

    if (!unmuteName) {
      return this.client.notice(sender, 'You need to supply a nick to unmute. Syntax: !unmute <nickname>')
    }

    let mute = Mutes.get(channel, unmuteName)
    if (!mute) {
      return this.client.notice(sender, 'Could not find a currently muted user with that name')
    }


    if (mute.voiced) {
      this.client.send('MODE', channel, '+v', nick)
    }
    this.client.send('MODE', channel, '-b', `~q:*!*@${mute.host}`)
    this.client.notice(sender, `Removing mute for user ${unmuteName}`)
  }
}