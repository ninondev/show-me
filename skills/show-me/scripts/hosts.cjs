/* Browser-side transports for views hosted by an agent or its local preview. */
(function (root) {
  'use strict';
  function connect(name, session, env) {
    const bridge = name === 'codex' ? env.openai : name === 'zcode' ? env.zcode : null;
    if (!['codex', 'zcode'].includes(name)) throw new Error('This view has no supported inline host.');
    let saves = Promise.resolve();
    return {
      get available() { return typeof bridge?.sendFollowUpMessage === 'function'; },
      readState() { return bridge?.widgetState; },
      saveState(snapshot) {
        const frozen = JSON.parse(JSON.stringify(snapshot));
        saves = saves.catch(() => {}).then(() => {
          if (typeof bridge?.setWidgetState !== 'function') throw new Error('Draft storage is unavailable.');
          return bridge.setWidgetState(frozen);
        });
        return saves;
      },
      subscribe(restore) {
        env.addEventListener((name === 'zcode' ? 'zcode' : 'openai') + ':set_globals', event => {
          if (Object.hasOwn(event.detail?.globals || {}, 'widgetState')) restore(event.detail.globals.widgetState);
        });
      },
      async send(message) {
        await saves;
        // A host's undocumented return fields cannot authorize another submission.
        await bridge.sendFollowUpMessage(message);
      }
    };
  }
  const api = {connect};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ShowMeHosts = api;
})(typeof globalThis === 'undefined' ? this : globalThis);
