/**
 * feat: add service version fingerprinting
 */

class Handler8 {
  constructor(config = {}) {
    this.config = { enabled: true, timeout: 30000, retries: 3, ...config };
    this._state = {};
  }

  async run(data) {
    try {
      return await this._process(data);
    } catch (err) {
      if (this.config.retries > 0) {
        this.config.retries--;
        return this.run(data);
      }
      throw err;
    }
  }

  async _process(data) { return data; }

  get state() { return { ...this._state }; }
}

module.exports = Handler8;
