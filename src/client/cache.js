/**
 * LRU Cache with TTL for client
 */

class TTLCache {
  constructor(maxsize = 128, ttl = 300000) {
    this.cache = new Map();
    this.maxsize = maxsize;
    this.ttl = ttl;
    this.hits = 0;
    this.misses = 0;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }
    if (Date.now() - entry.time > this.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    // Move to end (most recent)
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.hits++;
    return entry.value;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxsize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, { value, time: Date.now() });
  }

  get hitRate() {
    const total = this.hits + this.misses;
    return total > 0 ? this.hits / total : 0;
  }

  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

module.exports = { TTLCache };
