/* Loaded only by the standalone loopback preview, never by an inline renderer. */
(function (root) {
  'use strict';
  function connect(name, session, env, local) {
    if (!['claude-code', 'deepseek'].includes(name) || !local || env.location.origin !== local.origin) throw new Error('Open the current local preview.');
    const key = 'show-me:' + session.task + ':' + session.revision;
    return {
      get available() { return typeof env.fetch === 'function'; },
      readState() { try { return JSON.parse(env.sessionStorage.getItem(key)); } catch (_) { return null; } },
      async saveState(snapshot) { env.sessionStorage.setItem(key, JSON.stringify(snapshot)); },
      subscribe() {},
      async send(message, packet) {
        const response = await env.fetch('/response', {
          method: 'POST', credentials: 'omit',
          headers: {'Content-Type': 'application/json', 'X-Show-Me-Token': local.token},
          body: JSON.stringify(packet)
        });
        if (!response.ok) throw new Error('The receiving task did not accept this response.');
        const receipt = await response.json();
        if (receipt.status !== 'received' || receipt.submission !== packet.submission) throw new Error('The receipt did not match this response.');
      }
    };
  }
  const api = {connect};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ShowMeHosts = api;
})(typeof globalThis === 'undefined' ? this : globalThis);
