import irc from "irc"

const clientConnecting = /Client connecting: ([A-Za-z0-9_´|\[\]]*) \(([A-Za-z0-9_´|\[\]]*)@([A-Za-z0-9._\-]*)\) \[([0-9.:A-F-a-f]*)\]/gi
const clientExiting = /Client exiting: ([A-Za-z0-9_´|\[\]]*) \(([A-Za-z0-9_´|\[\]]*)@([A-Za-z0-9._\-]*)\) \[([0-9.:A-F-a-f]*)\] \(.*\)$/gi
const nicknameBrackets = /\[.*\]/gi

export default class SessionTracker {
  client = null
  addresses = {}

  constructor (client) {
    this.client = client

    client.addListener('notice', this.onNotice.bind(this))
  }

  onNotice (sender, receiver, text) {
    if (sender) {
      return
    }

    let connectingMatches = clientConnecting.exec(text)
    if (connectingMatches) {
      let [, nickname, user, host, ip] = connectingMatches
      nickname = nickname.replace(nicknameBrackets, '')

      if (!this.addresses[ip]) {
        this.addresses[ip] = []
      }

      let exists = this.addresses[ip].some((session) => session.nickname === nickname.toLowerCase())

      if (!exists) {
        this.addresses[ip].push({
          nickname: nickname.toLowerCase(),
          user,
          host
        })
      }

      let previousSessions = this.addresses[ip].filter((session) => session.nickname !== nickname.toLowerCase())
      if (previousSessions.length === 0) {
        return
      }
      let names = previousSessions.map((session) => session.nickname)

      this.client.say('#opers', `${irc.colors.wrap('light_red', 'CLONES ')} ${nickname} has connected from ${ip}. Previous names: ${names.join(', ')}`)
    }
    clientConnecting.lastIndex = 0
  }
}