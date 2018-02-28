export default class Mutes {
  static list = {}

  static add(channel, nickname, mute) {
    if (!Mutes.list[channel]) {
      Mutes.list[channel] = {}
    }

    if (Mutes.exists(channel, nickname, mute)) {
      return
    }

    Mutes.list[channel][nickname] = mute
  }

  static get (channel, nickname) {
    if (!Mutes.list[channel]) {
      return null
    }

    return Mutes.list[channel][nickname]
  }

  static remove(channel, nickname) {
    if (!Mutes.list[channel]) {
      Mutes.list[channel] = {}
    }

    if (!Mutes.exists(channel, nickname)) {
      return
    }

    delete Mutes.list[channel][nickname]
  }

  static exists (channel, nickname) {
    if (!Mutes.list[channel]) {
      return false
    }

    return Boolean(Mutes.list[channel][nickname])
  }
}