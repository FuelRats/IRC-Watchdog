import FloodProtection from 'flood-protection'

const users = {}
const moderatorUserModes = ['~', '&', '@', '%']

const TIMEOUT_LENGTH = 5 * 60 * 1000 // 5 minutes

export default class ChannelGuard {
  client = null

  constructor (client) {
    this.client = client

    client.addListener('message#', this.onMessage.bind(this))
  }

  onMessage (sender, channel, text, message) {
    let isVoiced = false

    if (isModerator(this.client, sender)) {
      return
    }

    if (!users[sender]) {
      users[sender] = new FloodProtection({ rate: 3, per: 5 })
    }

    let userMessageRate = users[sender]
    if (!userMessageRate.check()) {
      if (getUserModeSymbol(this.client, channel, sender) === '+') {
        isVoiced = true
        this.client.send('MODE', channel, '-v', sender)
      }

      this.client.send('MODE', channel, '+b', `~q:*!*@${message.host}`)
      this.client.notice(sender, 'You have been automatically silenced for 5 minutes due to too many messages in a short period of time.')

      setTimeout(() => {
        if (isVoiced) {
          this.client.send('MODE', channel, '+v', sender)
        }
        this.client.send('MODE', channel, '-b', `~q:*!*@${message.host}`)
      }, TIMEOUT_LENGTH)
    }
  }
}

function isModerator(client, channel, nickname) {
  let umode = getUserModeSymbol(client, channel, nickname)
  return moderatorUserModes.some(u => u === umode)
}

function getUserModeSymbol(client, channel, nickname) {
  if (!client.chans[channel]) {
    return null
  }
  return client.chans[channel].users[nickname]
}