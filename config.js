const defaultChannels = ['#ratchat', '#doersofstuff', '#drillrats', '#drillrats2', '#drillrats3']
let channels = process.env.FRWATCHDOG_IRC_CHANNELS

if (!channels) {
  channels = defaultChannels
} else {
  channels = channels.split(',')
}

module.exports = {
  irc: {
    server: process.env.FRWATCHDOG_IRC_SERVER || 'irc.fuelrats.com',
    port: process.env.FRWATCHDOG_IRC_PORT || 6697,
    nickname: process.env.FRWATCHDOG_IRC_NICKNAME || 'FIDO',
    password: process.env.FRWATCHDOG_IRC_PASSWORD,
    channels: channels
  }
}