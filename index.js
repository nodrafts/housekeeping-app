/**
 * @format
 */
/* global globalThis */

import { Buffer } from 'buffer';
import process from 'process';
import { TextDecoder, TextEncoder } from 'text-encoding';

import { registerRootComponent } from 'expo';
import App from './App';

// Polyfills for libraries that expect Node globals (SockJS/STOMP/Avro).
globalThis.Buffer = Buffer;
globalThis.process = process;
if (!globalThis.TextDecoder) globalThis.TextDecoder = TextDecoder;
if (!globalThis.TextEncoder) globalThis.TextEncoder = TextEncoder;

registerRootComponent(App);

// Register the PWA service worker only in browser builds.
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}
