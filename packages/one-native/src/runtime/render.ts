import React from 'react';
import { reconciler, NativeContainer } from './hostConfig';

const roots = new Map<number, any>();

export function render(element: React.ReactNode, containerId: number = 1) {
  let root = roots.get(containerId);
  if (!root) {
    const container: NativeContainer = {
      id: containerId,
      type: 'root',
      props: {},
      children: [],
    };

    root = reconciler.createContainer(
      container,
      1, // ConcurrentRoot
      null,
      false,
      null,
      '',
      (error: any) => console.error('[OneNative:UncaughtError]', error),
      (error: any) => console.error('[OneNative:CaughtError]', error),
      (error: any) => console.error('[OneNative:RecoverableError]', error),
      null
    );
    roots.set(containerId, root);
  }

  reconciler.updateContainer(element, root, null);
}
