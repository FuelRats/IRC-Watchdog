const defaultChannels = ['#ratchat', '#doersofstuff', '#drillrats', '#drillrats2', '#drillrats3', '#rat-ops']
let channels = process.env.FRWATCHDOG_IRC_CHANNELS

if (!channels) {
  channels = defaultChannels
} else {
  channels = channels.split(',')
}

let numbers = process.env.FRWATCHDOG_NEXMO_NUMBERS
if (!numbers) {
  numbers = []
} else {
  numbers = numbers.split(',')
}

module.exports = {
  irc: {
    server: process.env.FRWATCHDOG_IRC_SERVER || 'irc.fuelrats.com',
    port: process.env.FRWATCHDOG_IRC_PORT || 6697,
    nickname: process.env.FRWATCHDOG_IRC_NICKNAME || 'FIDO',
    password: process.env.FRWATCHDOG_IRC_PASSWORD,
    channels: channels
  },

  nexmo: {
    key: process.env.FRWATCHDOG_NEXMO_KEY,
    secret: process.env.FRWATCHDOG_NEXMO_SECRET,
    numbers: numbers
  }
}