/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Architectural Performance — implements a world-class LRU Cache.
 * Structure: Doubly Linked List + Map ($O(1)$ get/set/evict).
 */

class LruNode<K, V> {
  public next: LruNode<K, V> | null = null;
  public prev: LruNode<K, V> | null = null;
  constructor(
    public key: K,
    public value: V,
  ) {}
}

export class LruCache<K, V> {
  private capacity: number;
  private map: Map<K, LruNode<K, V>> = new Map();
  private head: LruNode<K, V> | null = null;
  private tail: LruNode<K, V> | null = null;

  constructor(capacity = 1000) {
    this.capacity = capacity;
  }

  /**
   * Retrieves a value from the cache.
   * Moves the accessed node to the head of the list.
   */
  public get(key: K): V | null {
    const node = this.map.get(key);
    if (!node) return null;

    this.moveToHead(node);
    return node.value;
  }

  /**
   * Inserts or updates a value in the cache.
   * Evicts the least recently used entry if at capacity.
   */
  public set(key: K, value: V): void {
    let node = this.map.get(key);

    if (node) {
      node.value = value;
      this.moveToHead(node);
    } else {
      node = new LruNode(key, value);
      this.map.set(key, node);
      this.addToHead(node);

      if (this.map.size > this.capacity) {
        this.evict();
      }
    }
  }

  /**
   * Removes a specific key from the cache.
   */
  public delete(key: K): void {
    const node = this.map.get(key);
    if (!node) return;

    this.removeNode(node);
    this.map.delete(key);
  }

  /**
   * Clears the entire cache.
   */
  public clear(): void {
    this.map.clear();
    this.head = null;
    this.tail = null;
  }

  private addToHead(node: LruNode<K, V>): void {
    node.next = this.head;
    node.prev = null;
    if (this.head) this.head.prev = node;
    this.head = node;
    if (!this.tail) this.tail = node;
  }

  private removeNode(node: LruNode<K, V>): void {
    if (node.prev) node.prev.next = node.next;
    else this.head = node.next;

    if (node.next) node.next.prev = node.prev;
    else this.tail = node.prev;
  }

  private moveToHead(node: LruNode<K, V>): void {
    this.removeNode(node);
    this.addToHead(node);
  }

  private evict(): void {
    if (!this.tail) return;
    this.map.delete(this.tail.key);
    this.removeNode(this.tail);
  }
}
