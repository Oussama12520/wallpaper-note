/**
 * NoteWall - Bridge Layer
 * Handles communication between WebView2 (C# backend) and Web Frontend.
 * Provides fallback mock methods when running in standalone browser.
 */

window.NoteWallBridge = (function () {
  const isWebView = window.chrome && window.chrome.webview;
  const pendingRequests = new Map();
  const eventListeners = new Map();

  if (isWebView) {
    window.chrome.webview.addEventListener('message', function (event) {
      try {
        const msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!msg) return;

        // Check if this is an event from backend
        const eventName = msg.Event || msg.event;
        if (eventName) {
          const listeners = eventListeners.get(eventName) || [];
          listeners.forEach(fn => fn(msg.Data !== undefined ? msg.Data : msg.data));
          return;
        }

        // Response to request
        const reqId = msg.RequestId || msg.requestId;
        if (reqId && pendingRequests.has(reqId)) {
          const { resolve, reject } = pendingRequests.get(reqId);
          pendingRequests.delete(reqId);

          const isSuccess = msg.Success !== undefined ? msg.Success : msg.success;
          const data = msg.Data !== undefined ? msg.Data : msg.data;
          const errorMsg = msg.Error || msg.error;

          if (isSuccess) {
            resolve(data);
          } else {
            reject(new Error(errorMsg || 'Unknown error'));
          }
        }
      } catch (err) {
        console.error('Failed to parse bridge message:', err);
      }
    });
  }

  function callNative(action, payload = {}) {
    const requestId = 'req_' + Math.random().toString(36).substr(2, 9);

    if (!isWebView) {
      // Mock fallback for browser testing
      return mockNativeCall(action, payload);
    }

    return new Promise((resolve, reject) => {
      pendingRequests.set(requestId, { resolve, reject });
      window.chrome.webview.postMessage(JSON.stringify({
        action,
        requestId,
        payload
      }));

      // Timeout safety
      setTimeout(() => {
        if (pendingRequests.has(requestId)) {
          pendingRequests.delete(requestId);
          reject(new Error(`Native call ${action} timed out.`));
        }
      }, 30000);
    });
  }

  function on(eventName, callback) {
    if (!eventListeners.has(eventName)) {
      eventListeners.set(eventName, []);
    }
    eventListeners.get(eventName).push(callback);
  }

  // Fallback simulator for standard browser preview
  function mockNativeCall(action, payload) {
    return new Promise((resolve) => {
      setTimeout(() => {
        switch (action.toLowerCase()) {
          case 'getdisplays':
            resolve([{
              index: 0,
              deviceName: 'DISPLAY1',
              deviceId: 'DISPLAY1',
              width: window.screen.width || 1920,
              height: window.screen.height || 1080,
              isPrimary: true,
              boundsX: 0,
              boundsY: 0,
              scaleFactor: 1.0,
              displayLabel: `Monitor 1 (${window.screen.width || 1920}x${window.screen.height || 1080}) - Primary`
            }]);
            break;

          case 'setwallpaper':
            // In browser, trigger download or save to local storage
            console.log('Mock SetWallpaper invoked with image length:', payload.base64 ? payload.base64.length : 0);
            try {
              localStorage.setItem('notewall_last_wallpaper', Date.now());
            } catch (e) {}
            resolve({ path: 'Applied to Windows Desktop (Simulated in browser)' });
            break;

          case 'exportpng':
            // Trigger automatic download in browser
            const a = document.createElement('a');
            a.href = payload.base64;
            a.download = payload.fileName || 'notewall_wallpaper.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            resolve({ filePath: payload.fileName || 'notewall_wallpaper.png' });
            break;

          case 'saveproject':
            try {
              localStorage.setItem('notewall_saved_project_' + (payload.projectName || 'default'), payload.projectJson);
            } catch (e) {}
            resolve({ filePath: (payload.projectName || 'project') + '.notewall', name: payload.projectName || 'Workspace' });
            break;

          case 'loadproject':
            const saved = localStorage.getItem('notewall_autosave');
            if (saved) {
              resolve({ json: saved, filePath: 'autosave.notewall', name: 'Saved Workspace' });
            } else {
              resolve(null);
            }
            break;

          case 'autosave':
            try {
              localStorage.setItem('notewall_autosave', payload.projectJson);
            } catch (e) {}
            resolve({ saved: true });
            break;

          case 'loadautosave':
            resolve({ json: localStorage.getItem('notewall_autosave') });
            break;

          case 'getwallpaperhistory':
            resolve([]);
            break;

          case 'getrecentprojects':
            resolve([]);
            break;

          default:
            resolve({});
            break;
        }
      }, 50);
    });
  }

  return {
    isNative: !!isWebView,
    call: callNative,
    on
  };
})();
