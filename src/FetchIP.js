import request from 'request'
import emojiFlags from 'emoji-flags'


export default class FetchIP {
  client = null

  constructor (client) {
    this.client = client

    client.addListener('message#', this.onMessage.bind(this))
  }

  onMessage (sender, channel, text, message) {
    if (this.client.isModerator(channel, message)) {
      if (text.startsWith('!fetch')) {
        this.fetch(sender, channel, text, message)
      }
    }
  }

  fetch (sender, channel, text, message) {
    let [, address] = /!fetch ([0-9.:A-F-a-f]*)/gi.exec(text)

    if (!address) {
      return this.client.notice(sender, 'You need to supply an IP to fetch. Syntax: !fetch <IP>')
    }


    request(`https://ipinfo.io/${address}`, (error, res, body) => {
      if (error || res.statusCode !== 200) {
        return this.client.notice(sender, 'Unable to retrieve IP information')
      }

      try {
        let data = JSON.parse(body)

        this.client.say(channel, `IP Information ${data.ip}: ${prettyPrint(data)} ${emojiFlags.countryCode(data.country).emoji} ISP: ${data.org}`)
      } catch (ex) {
        this.client.notice(sender, 'Unable to parse IP information')
      }
    })
  }
}

function prettyPrint(data) {
  if (data.city) {
    return `${data.city}, ${data.region}, ${data.country}`
  } else if (data.region) {
    return `${data.region}, ${data.country}`
  } else {
    return data.country
  }
}