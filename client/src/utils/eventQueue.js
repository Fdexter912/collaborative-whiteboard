// client/src/utils/eventQueue.js

/**
 * Event Queue Manager
 * 
 * Handles event ordering and buffering for synchronization.
 * Ensures events are applied in correct sequence order.
 */
export class EventQueue {
  constructor() {
    this.lastAppliedSeq = 0;
    this.pendingEvents = new Map(); // seq -> event
    this.appliedEvents = new Set(); // Track applied event IDs
    this.maxPending = 100; // Max events to buffer
  }

  /**
   * Initialize with starting sequence
   */
  initialize(startSeq) {
    this.lastAppliedSeq = startSeq;
    this.pendingEvents.clear();
    this.appliedEvents.clear();
    
    console.log(`📊 Event queue initialized at sequence ${startSeq}`);
  }

  /**
   * Get last applied sequence
   */
  getLastAppliedSeq() {
    return this.lastAppliedSeq;
  }

  /**
   * Check if event was already applied
   */
  wasApplied(eventId) {
    return this.appliedEvents.has(eventId);
  }

  /**
   * Add event to queue
   * Returns array of events ready to apply
   */
  addEvent(event) {
    const { seq } = event;

    // Validate sequence number
    if (typeof seq !== 'number') {
      console.error('❌ Event missing sequence number:', event);
      return [];
    }

    // Check for duplicate
    const eventId = this.getEventId(event);
    if (eventId && this.appliedEvents.has(eventId)) {
      console.warn(`⚠️  Duplicate event detected: ${eventId}`);
      return [];
    }

    // Event is next in sequence - can apply immediately
    if (seq === this.lastAppliedSeq + 1) {
      const ready = [event];
      this.lastAppliedSeq = seq;
      
      if (eventId) {
        this.appliedEvents.add(eventId);
      }

      // Check if we can apply buffered events
      while (this.pendingEvents.has(this.lastAppliedSeq + 1)) {
        const nextEvent = this.pendingEvents.get(this.lastAppliedSeq + 1);
        this.pendingEvents.delete(this.lastAppliedSeq + 1);
        
        ready.push(nextEvent);
        this.lastAppliedSeq++;
        
        const nextEventId = this.getEventId(nextEvent);
        if (nextEventId) {
          this.appliedEvents.add(nextEventId);
        }
      }

      console.log(`✅ Applied ${ready.length} event(s), now at seq ${this.lastAppliedSeq}`);
      return ready;
    }

    // Event is in the future - buffer it
    if (seq > this.lastAppliedSeq + 1) {
      // Check buffer size
      if (this.pendingEvents.size >= this.maxPending) {
        console.error(`❌ Event buffer full (${this.maxPending} events)`);
        return [];
      }

      this.pendingEvents.set(seq, event);
      console.log(
        `⏳ Buffered future event seq ${seq} ` +
        `(expected ${this.lastAppliedSeq + 1}, ${this.pendingEvents.size} pending)`
      );
      
      return [];
    }

    // Event is in the past - already applied, ignore
    console.warn(`⏪ Ignoring old event seq ${seq} (current: ${this.lastAppliedSeq})`);
    return [];
  }

  /**
   * Get missing sequence numbers
   */
  getMissingSequences() {
    if (this.pendingEvents.size === 0) {
      return [];
    }

    const pending = Array.from(this.pendingEvents.keys()).sort((a, b) => a - b);
    const firstPending = pending[0];
    
    const missing = [];
    for (let seq = this.lastAppliedSeq + 1; seq < firstPending; seq++) {
      missing.push(seq);
    }
    
    return missing;
  }

  /**
   * Check if we have gaps
   */
  hasGaps() {
    return this.getMissingSequences().length > 0;
  }

  /**
   * Get gap range
   */
  getGapRange() {
    const missing = this.getMissingSequences();
    if (missing.length === 0) {
      return null;
    }
    
    return {
      from: missing[0],
      to: missing[missing.length - 1]
    };
  }

  /**
   * Get event ID for deduplication
   */
  getEventId(event) {
    if (event.type === 'draw.stroke' && event.data?.id) {
      return event.data.id;
    }
    if (event.type === 'draw.deleteStroke' && event.data?.strokeId) {
      return `delete_${event.data.strokeId}`;
    }
    if (event.type === 'draw.clear') {
      return `clear_${event.seq}`;
    }
    return null;
  }

  /**
   * Clear all state
   */
  clear() {
    this.lastAppliedSeq = 0;
    this.pendingEvents.clear();
    this.appliedEvents.clear();
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      lastAppliedSeq: this.lastAppliedSeq,
      pendingCount: this.pendingEvents.size,
      appliedCount: this.appliedEvents.size,
      hasGaps: this.hasGaps(),
      gapRange: this.getGapRange()
    };
  }
}