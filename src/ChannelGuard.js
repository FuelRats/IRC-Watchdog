import FloodProtection from 'flood-protection'
import Mutes from './classes/Mutes'
import { isZalgo }  from 'unzalgo'

const killMessage = `You must not attempt to disrupt the IRC servers, services or the servers they run on, including but not limited to DDoS attacks, attempts to gain privileges, flooding or otherwise interfering with the service(s).`

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

    if (isZalgo(text)) {
      this.client.send('KILL', sender, killMessage)
      this.client.say('#opers', `KILLED ${sender} (${message.host}) has been automatically killed for posting harmful unicode characters in ${channel}`)
    }

    let highlightCount = getHighlightCountForMessage(this.client, channel, text)
    if (highlightCount >= 5) {
      this.client.send('KILL', sender, killMessage)
      this.client.say('#opers', `KILLED ${sender} (${message.host}) has been automatically killed for highlight spam in ${channel}`)
    }

    if (!users[channel]) {
      users[channel] = {}
    }

    if (!users[channel][sender]) {
      users[channel][sender] = new FloodProtection({ rate: 3, per: 6 })
    }

    let userMessageRate = users[channel][sender]
    if (!userMessageRate.check()) {
      if (this.client.getUserModeSymbol(channel, sender) === '+') {
        voiced = true
        this.client.send('MODE', channel, '-v', sender)
      }

      this.client.send('MODE', channel, '+b', `~q:*!*@${message.host}`)
      this.client.say('#rat-ops', `MUTED ${sender} (${message.host}) has been muted for flooding in ${channel}`)
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
    let getUnmuteParameters = /!unmute ([A-Za-z0-9_´|\[\]]*)/gi
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

function getHighlightCountForMessage (client, channel, text) {
  if (!client.chans[channel]) {
    return 0
  }

  let userlist = Object.keys(client.chans[channel].users)

  return text.split(' ').reduce((acc, word) => {
    if (userlist.includes(word)) {
      console.log(word)
      acc += 1
    }
    return acc
  }, 0)
}