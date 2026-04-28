import { useState, useCallback } from 'react';

// Module-level so it persists across renders/navigations
let lastReadAt: number = Date.now();

export function markMessagesRead() {
  lastReadAt = Date.now();
}

export function useUnreadCount(messages: { createdAt?: string | null }[]) {
  return messages.filter((m) => {
    if (!m.createdAt) return false;
    return new Date(m.createdAt).getTime() > lastReadAt;
  }).length;
}
