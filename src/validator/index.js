/**
 * validator module for dashboard
 * @module validator
 */

class ValidatorHandler {
  /**
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = config;
    this.initialized = false;
  }

  /**
   * Execute workflow YAML schema validation
   * @param {...*} args - Arguments
   * @returns {Promise<*>} Result
   */
  async execute(...args) {
    if (!this.initialized) {
      await this._init();
    }
    return this._run(...args);
  }

  async _init() {
    this.initialized = true;
  }

  _run(...args) {
    throw new Error('Not implemented');
  }

  get isReady() {
    return this.initialized;
  }
}

module.exports = { ValidatorHandler };
