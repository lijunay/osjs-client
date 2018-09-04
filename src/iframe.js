/*
 * OS.js - JavaScript Cloud/Web Desktop Platform
 *
 * Copyright (c) 2011-2018, Anders Evenrud <andersevenrud@gmail.com>
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * @author  Anders Evenrud <andersevenrud@gmail.com>
 * @licence Simplified BSD License
 */
import Window from './window';

/**
 * OS.js Iframe Handler
 * @desc Creates iframes and communication channels
 */
export default class IFrame {

  /**
   * Creates a new IFrame handler
   *
   * @param {Core} core Core reference
   */
  constructor(core) {
    this.core = core;
  }

  /**
   * Initializes base events etc.
   */
  init() {
    window.addEventListener('message', ({data}) => {
      if (data) {
        const wid = data.__osjs_window;
        const refNum = data.__osjs_reference;

        if (wid >= 0) {
          const win = Window.getWindows()
            .find(w => w.wid === wid);

          if (win) {
            win.emit('message', refNum, data.payload);
          }
        }
      }
    });
  }

  /**
   * Creates a new iframe dom element
   * @param {Function} onload The onload callback
   * @return {Node}
   */
  createIframe(onload) {
    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.setAttribute('border', '0');

    iframe.addEventListener('load', ev => {
      return onload(ev, iframe, iframe.contentWindow);
    });

    return iframe;
  }

  /**
   * Creates a new iframe window (abstraction)
   * @param {Application} proc The base process
   * @param {Object} [options] The window constructor options
   * @see {Window}
   */
  createWindow(proc, options = {}) {
    const win = proc.createWindow(options);

    const iframe = this.createIframe((ev, iframe, ref) => {
      // This will proxy the window focus events to iframe
      win.on('focus', () => ref.focus());
      win.on('blur', () => ref.blur());

      // Create message sending wrapper
      const send = (payload, refNum = -1, type = 'message') => ref.postMessage({
        __osjs_message: type,
        __osjs_reference: refNum,
        payload
      }, window.location.href);

      // Processes all incoming events from iframe
      win.on('message', (refNum, payload) => {
        const respond = response => send(response, refNum);

        if (refNum >= 0) {
          win.emit('iframe:message', {win, iframe, send, respond}, payload);
        } else {
          win.emit('iframe:message', {win, iframe, send}, payload);
        }
      });

      send(win.wid, -1, 'handshake');

      win.emit('iframe:init', {win, iframe, send});
    });

    win.iframe = iframe;

    win.open = src => {
      win.render($content => {
        iframe.src = src;

        $content.appendChild(iframe);
      });
    };

    return win;
  }
}
