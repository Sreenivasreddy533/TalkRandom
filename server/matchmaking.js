class Matchmaking {
  constructor() {
    this.waiting = new Map();
    this.activePairs = new Map();
    this.reports = new Map();
  }

  addToQueue(socketId, meta) {
    this.waiting.set(socketId, { socketId, ...meta });
  }

  removeFromQueue(socketId) {
    this.waiting.delete(socketId);
  }

  findPartner(candidate) {
    for (const [, user] of this.waiting) {
      if (user.socketId === candidate.socketId) continue;

      this.waiting.delete(user.socketId);
      this.waiting.delete(candidate.socketId);
      this.activePairs.set(candidate.socketId, user.socketId);
      this.activePairs.set(user.socketId, candidate.socketId);
      return user.socketId;
    }
    return null;
  }

  getPartner(socketId) {
    return this.activePairs.get(socketId) || null;
  }

  endPair(socketId) {
    const partnerId = this.activePairs.get(socketId);
    if (partnerId) {
      this.activePairs.delete(socketId);
      this.activePairs.delete(partnerId);
    }
    return partnerId;
  }

  clear(socketId) {
    this.removeFromQueue(socketId);
    const partner = this.endPair(socketId);
    return partner;
  }

  addReport(targetId) {
    const current = this.reports.get(targetId) || 0;
    const next = current + 1;
    this.reports.set(targetId, next);
    return next;
  }
}

module.exports = new Matchmaking();
