module.exports = {
  irc: {
    server: process.env.FRWATCHDOG_IRC_SERVER || 'irc.fuelrats.com',
    port: process.env.FRWATCHDOG_IRC_PORT || 6697,
    password: process.env.FRWATCHDOG_IRC_PASSWORD
  }
}