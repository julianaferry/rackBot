// node_modules/partysocket/dist/chunk-KQKM3KLR.mjs
if (!globalThis.EventTarget || !globalThis.Event) {
  console.error(`
  PartySocket requires a global 'EventTarget' class to be available!
  You can use the 'event-target-shim' package to polyfill this. See https://www.npmjs.com/package/event-target-shim. 
  First, run:
  \`\`\`
  npm install event-target-shim
  \`\`\`
  Then, add this in your code:
  \`\`\`
  import {Event, EventTarget} from 'event-target-shim';
  if(!globalThis.Event) {
    globalThis.Event = Event;
  }
  if(!globalThis.EventTarget) {
    globalThis.EventTarget = EventTarget;
  }
  \`\`\`
  Please file an issue at https://github.com/partykit/partykit if you're still having trouble.
`);
}
var ErrorEvent = class extends Event {
  message;
  error;
  constructor(error, target) {
    super("error", target);
    this.message = error.message;
    this.error = error;
  }
};
var CloseEvent = class extends Event {
  code;
  reason;
  wasClean = true;
  constructor(code = 1e3, reason = "", target) {
    super("close", target);
    this.code = code;
    this.reason = reason;
  }
};
var Events = {
  Event,
  ErrorEvent,
  CloseEvent
};
function assert(condition, msg) {
  if (!condition) {
    throw new Error(msg);
  }
}
function cloneEventBrowser(e) {
  return new e.constructor(e.type, e);
}
function cloneEventNode(e) {
  const evt = new Event(e.type, e);
  if ("data" in e) {
    evt.data = e.data;
  }
  if ("code" in e) {
    evt.code = e.code;
  }
  if ("reason" in e) {
    evt.reason = e.reason;
  }
  if ("error" in e) {
    evt.error = e.error;
  }
  return evt;
}
var isNode = typeof process !== "undefined" && typeof process.versions?.node !== "undefined" && typeof document === "undefined";
var cloneEvent = isNode ? cloneEventNode : cloneEventBrowser;
var DEFAULT = {
  maxReconnectionDelay: 1e4,
  minReconnectionDelay: 1e3 + Math.random() * 4e3,
  minUptime: 5e3,
  reconnectionDelayGrowFactor: 1.3,
  connectionTimeout: 4e3,
  maxRetries: Infinity,
  maxEnqueuedMessages: Infinity,
  startClosed: false,
  debug: false
};
var ReconnectingWebSocket = class _ReconnectingWebSocket extends EventTarget {
  _ws;
  _retryCount = -1;
  _uptimeTimeout;
  _connectTimeout;
  _shouldReconnect = true;
  _connectLock = false;
  _binaryType = "blob";
  _closeCalled = false;
  _messageQueue = [];
  _url;
  _protocols;
  _options;
  constructor(url, protocols, options = {}) {
    super();
    this._url = url;
    this._protocols = protocols;
    this._options = options;
    if (this._options.startClosed) {
      this._shouldReconnect = false;
    }
    this._connect();
  }
  static get CONNECTING() {
    return 0;
  }
  static get OPEN() {
    return 1;
  }
  static get CLOSING() {
    return 2;
  }
  static get CLOSED() {
    return 3;
  }
  get CONNECTING() {
    return _ReconnectingWebSocket.CONNECTING;
  }
  get OPEN() {
    return _ReconnectingWebSocket.OPEN;
  }
  get CLOSING() {
    return _ReconnectingWebSocket.CLOSING;
  }
  get CLOSED() {
    return _ReconnectingWebSocket.CLOSED;
  }
  get binaryType() {
    return this._ws ? this._ws.binaryType : this._binaryType;
  }
  set binaryType(value) {
    this._binaryType = value;
    if (this._ws) {
      this._ws.binaryType = value;
    }
  }
  /**
   * Returns the number or connection retries
   */
  get retryCount() {
    return Math.max(this._retryCount, 0);
  }
  /**
   * The number of bytes of data that have been queued using calls to send() but not yet
   * transmitted to the network. This value resets to zero once all queued data has been sent.
   * This value does not reset to zero when the connection is closed; if you keep calling send(),
   * this will continue to climb. Read only
   */
  get bufferedAmount() {
    const bytes = this._messageQueue.reduce((acc, message) => {
      if (typeof message === "string") {
        acc += message.length;
      } else if (message instanceof Blob) {
        acc += message.size;
      } else {
        acc += message.byteLength;
      }
      return acc;
    }, 0);
    return bytes + (this._ws ? this._ws.bufferedAmount : 0);
  }
  /**
   * The extensions selected by the server. This is currently only the empty string or a list of
   * extensions as negotiated by the connection
   */
  get extensions() {
    return this._ws ? this._ws.extensions : "";
  }
  /**
   * A string indicating the name of the sub-protocol the server selected;
   * this will be one of the strings specified in the protocols parameter when creating the
   * WebSocket object
   */
  get protocol() {
    return this._ws ? this._ws.protocol : "";
  }
  /**
   * The current state of the connection; this is one of the Ready state constants
   */
  get readyState() {
    if (this._ws) {
      return this._ws.readyState;
    }
    return this._options.startClosed ? _ReconnectingWebSocket.CLOSED : _ReconnectingWebSocket.CONNECTING;
  }
  /**
   * The URL as resolved by the constructor
   */
  get url() {
    return this._ws ? this._ws.url : "";
  }
  /**
   * Whether the websocket object is now in reconnectable state
   */
  get shouldReconnect() {
    return this._shouldReconnect;
  }
  /**
   * An event listener to be called when the WebSocket connection's readyState changes to CLOSED
   */
  onclose = null;
  /**
   * An event listener to be called when an error occurs
   */
  onerror = null;
  /**
   * An event listener to be called when a message is received from the server
   */
  onmessage = null;
  /**
   * An event listener to be called when the WebSocket connection's readyState changes to OPEN;
   * this indicates that the connection is ready to send and receive data
   */
  onopen = null;
  /**
   * Closes the WebSocket connection or connection attempt, if any. If the connection is already
   * CLOSED, this method does nothing
   */
  close(code = 1e3, reason) {
    this._closeCalled = true;
    this._shouldReconnect = false;
    this._clearTimeouts();
    if (!this._ws) {
      this._debug("close enqueued: no ws instance");
      return;
    }
    if (this._ws.readyState === this.CLOSED) {
      this._debug("close: already closed");
      return;
    }
    this._ws.close(code, reason);
  }
  /**
   * Closes the WebSocket connection or connection attempt and connects again.
   * Resets retry counter;
   */
  reconnect(code, reason) {
    this._shouldReconnect = true;
    this._closeCalled = false;
    this._retryCount = -1;
    if (!this._ws || this._ws.readyState === this.CLOSED) {
      this._connect();
    } else {
      this._disconnect(code, reason);
      this._connect();
    }
  }
  /**
   * Enqueue specified data to be transmitted to the server over the WebSocket connection
   */
  send(data) {
    if (this._ws && this._ws.readyState === this.OPEN) {
      this._debug("send", data);
      this._ws.send(data);
    } else {
      const { maxEnqueuedMessages = DEFAULT.maxEnqueuedMessages } = this._options;
      if (this._messageQueue.length < maxEnqueuedMessages) {
        this._debug("enqueue", data);
        this._messageQueue.push(data);
      }
    }
  }
  _debug(...args) {
    if (this._options.debug) {
      console.log.apply(console, ["RWS>", ...args]);
    }
  }
  _getNextDelay() {
    const {
      reconnectionDelayGrowFactor = DEFAULT.reconnectionDelayGrowFactor,
      minReconnectionDelay = DEFAULT.minReconnectionDelay,
      maxReconnectionDelay = DEFAULT.maxReconnectionDelay
    } = this._options;
    let delay = 0;
    if (this._retryCount > 0) {
      delay = minReconnectionDelay * Math.pow(reconnectionDelayGrowFactor, this._retryCount - 1);
      if (delay > maxReconnectionDelay) {
        delay = maxReconnectionDelay;
      }
    }
    this._debug("next delay", delay);
    return delay;
  }
  _wait() {
    return new Promise((resolve) => {
      setTimeout(resolve, this._getNextDelay());
    });
  }
  _getNextProtocols(protocolsProvider) {
    if (!protocolsProvider)
      return Promise.resolve(null);
    if (typeof protocolsProvider === "string" || Array.isArray(protocolsProvider)) {
      return Promise.resolve(protocolsProvider);
    }
    if (typeof protocolsProvider === "function") {
      const protocols = protocolsProvider();
      if (!protocols)
        return Promise.resolve(null);
      if (typeof protocols === "string" || Array.isArray(protocols)) {
        return Promise.resolve(protocols);
      }
      if (protocols.then) {
        return protocols;
      }
    }
    throw Error("Invalid protocols");
  }
  _getNextUrl(urlProvider) {
    if (typeof urlProvider === "string") {
      return Promise.resolve(urlProvider);
    }
    if (typeof urlProvider === "function") {
      const url = urlProvider();
      if (typeof url === "string") {
        return Promise.resolve(url);
      }
      if (url.then) {
        return url;
      }
    }
    throw Error("Invalid URL");
  }
  _connect() {
    if (this._connectLock || !this._shouldReconnect) {
      return;
    }
    this._connectLock = true;
    const {
      maxRetries = DEFAULT.maxRetries,
      connectionTimeout = DEFAULT.connectionTimeout
    } = this._options;
    if (this._retryCount >= maxRetries) {
      this._debug("max retries reached", this._retryCount, ">=", maxRetries);
      return;
    }
    this._retryCount++;
    this._debug("connect", this._retryCount);
    this._removeListeners();
    this._wait().then(
      () => Promise.all([
        this._getNextUrl(this._url),
        this._getNextProtocols(this._protocols || null)
      ])
    ).then(([url, protocols]) => {
      if (this._closeCalled) {
        this._connectLock = false;
        return;
      }
      const WS = this._options.WebSocket || WebSocket;
      this._debug("connect", { url, protocols });
      this._ws = protocols ? new WS(url, protocols) : new WS(url);
      this._ws.binaryType = this._binaryType;
      this._connectLock = false;
      this._addListeners();
      this._connectTimeout = setTimeout(
        () => this._handleTimeout(),
        connectionTimeout
      );
    }).catch((err) => {
      this._connectLock = false;
      this._handleError(new Events.ErrorEvent(Error(err.message), this));
    });
  }
  _handleTimeout() {
    this._debug("timeout event");
    this._handleError(new Events.ErrorEvent(Error("TIMEOUT"), this));
  }
  _disconnect(code = 1e3, reason) {
    this._clearTimeouts();
    if (!this._ws) {
      return;
    }
    this._removeListeners();
    try {
      this._ws.close(code, reason);
      this._handleClose(new Events.CloseEvent(code, reason, this));
    } catch (error) {
    }
  }
  _acceptOpen() {
    this._debug("accept open");
    this._retryCount = 0;
  }
  _handleOpen = (event2) => {
    this._debug("open event");
    const { minUptime = DEFAULT.minUptime } = this._options;
    clearTimeout(this._connectTimeout);
    this._uptimeTimeout = setTimeout(() => this._acceptOpen(), minUptime);
    assert(this._ws, "WebSocket is not defined");
    this._ws.binaryType = this._binaryType;
    this._messageQueue.forEach((message) => this._ws?.send(message));
    this._messageQueue = [];
    if (this.onopen) {
      this.onopen(event2);
    }
    this.dispatchEvent(cloneEvent(event2));
  };
  _handleMessage = (event2) => {
    this._debug("message event");
    if (this.onmessage) {
      this.onmessage(event2);
    }
    this.dispatchEvent(cloneEvent(event2));
  };
  _handleError = (event2) => {
    this._debug("error event", event2.message);
    this._disconnect(
      void 0,
      event2.message === "TIMEOUT" ? "timeout" : void 0
    );
    if (this.onerror) {
      this.onerror(event2);
    }
    this._debug("exec error listeners");
    this.dispatchEvent(cloneEvent(event2));
    this._connect();
  };
  _handleClose = (event2) => {
    this._debug("close event");
    this._clearTimeouts();
    if (this._shouldReconnect) {
      this._connect();
    }
    if (this.onclose) {
      this.onclose(event2);
    }
    this.dispatchEvent(cloneEvent(event2));
  };
  _removeListeners() {
    if (!this._ws) {
      return;
    }
    this._debug("removeListeners");
    this._ws.removeEventListener("open", this._handleOpen);
    this._ws.removeEventListener("close", this._handleClose);
    this._ws.removeEventListener("message", this._handleMessage);
    this._ws.removeEventListener("error", this._handleError);
  }
  _addListeners() {
    if (!this._ws) {
      return;
    }
    this._debug("addListeners");
    this._ws.addEventListener("open", this._handleOpen);
    this._ws.addEventListener("close", this._handleClose);
    this._ws.addEventListener("message", this._handleMessage);
    this._ws.addEventListener("error", this._handleError);
  }
  _clearTimeouts() {
    clearTimeout(this._connectTimeout);
    clearTimeout(this._uptimeTimeout);
  }
};

// node_modules/partysocket/dist/chunk-KLZNPLSY.mjs
var valueIsNotNil = (keyValuePair) => keyValuePair[1] !== null && keyValuePair[1] !== void 0;
function generateUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  let d = (/* @__PURE__ */ new Date()).getTime();
  let d2 = typeof performance !== "undefined" && performance.now && performance.now() * 1e3 || 0;
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    let r = Math.random() * 16;
    if (d > 0) {
      r = (d + r) % 16 | 0;
      d = Math.floor(d / 16);
    } else {
      r = (d2 + r) % 16 | 0;
      d2 = Math.floor(d2 / 16);
    }
    return (c === "x" ? r : r & 3 | 8).toString(16);
  });
}
function getPartyInfo(partySocketOptions, defaultProtocol, defaultParams = {}) {
  const {
    host: rawHost,
    path: rawPath,
    protocol: rawProtocol,
    room,
    party,
    query
  } = partySocketOptions;
  let host = rawHost.replace(/^(http|https|ws|wss):\/\//, "");
  if (host.endsWith("/")) {
    host = host.slice(0, -1);
  }
  if (rawPath && rawPath.startsWith("/")) {
    throw new Error("path must not start with a slash");
  }
  const name = party ?? "main";
  const path = rawPath ? `/${rawPath}` : "";
  const protocol = rawProtocol || (host.startsWith("localhost:") || host.startsWith("127.0.0.1:") ? (
    // http / ws
    defaultProtocol
  ) : (
    // https / wss
    defaultProtocol + "s"
  ));
  const baseUrl = `${protocol}://${host}/${party ? `parties/${party}` : "party"}/${room}${path}`;
  const makeUrl = (query2 = {}) => `${baseUrl}?${new URLSearchParams([
    ...Object.entries(defaultParams),
    ...Object.entries(query2).filter(valueIsNotNil)
  ])}`;
  const urlProvider = typeof query === "function" ? async () => makeUrl(await query()) : makeUrl(query);
  return {
    host,
    path,
    room,
    name,
    protocol,
    partyUrl: baseUrl,
    urlProvider
  };
}
var PartySocket = class extends ReconnectingWebSocket {
  constructor(partySocketOptions) {
    const {
      id,
      host: _host,
      path: _path,
      party: _party,
      room: _room,
      protocol: _protocol,
      query: _query,
      protocols,
      ...socketOptions
    } = partySocketOptions;
    const _pk = id || generateUUID();
    const party = getPartyInfo(partySocketOptions, "ws", { _pk });
    super(party.urlProvider, protocols, socketOptions);
    this.partySocketOptions = partySocketOptions;
    this._pk = _pk;
    this._pkurl = party.partyUrl;
    this.name = party.name;
    this.room = party.room;
    this.host = party.host;
    this.path = party.path;
  }
  _pk;
  _pkurl;
  name;
  room;
  host;
  path;
  get id() {
    return this._pk;
  }
  /**
   * Exposes the static PartyKit room URL without applying query parameters.
   * To access the currently connected WebSocket url, use PartySocket#url.
   */
  get roomUrl() {
    return this._pkurl;
  }
  // a `fetch` method that uses (almost) the same options as `PartySocket`
  static async fetch(options, init) {
    const party = getPartyInfo(options, "http");
    const url = typeof party.urlProvider === "string" ? party.urlProvider : await party.urlProvider();
    const doFetch = options.fetch ?? fetch;
    return doFetch(url, init);
  }
};

// src/client.js
var pingInterval;
var output = document.getElementById("app");
function add(text) {
  output.appendChild(document.createTextNode(text));
  output.appendChild(document.createElement("br"));
}
var conn = new PartySocket({
  host: "127.0.0.1:1999",
  room: "my-new-room"
});
conn.addEventListener("message", function(event2) {
  add(`Received -> ${event2.data}`);
});
var getBot1 = document.getElementById("bot1");
getBot1.addEventListener("click", () => {
  pingInterval = setTimeout(function() {
    conn.addEventListener("message", function(event2) {
      add(`Forward -> ${event2.data}`);
    });
    add(`Forward -> ${event.data}`);
    add("Forward");
  }, 900);
});
var getBot2 = document.getElementById("bot2");
getBot2.addEventListener("click", () => {
  pingInterval = setTimeout(function() {
    add("Backward");
  }, 500);
});
var getBot3 = document.getElementById("bot3");
getBot3.addEventListener("click", () => {
  pingInterval = setTimeout(function() {
    add("Right");
  }, 500);
});
var getBot4 = document.getElementById("bot4");
getBot4.addEventListener("click", () => {
  pingInterval = setTimeout(function() {
    add("Left");
  }, 500);
});
getBot2.removeEventListener();
getBot3.removeEventListener();
/*! Bundled license information:

partysocket/dist/chunk-KQKM3KLR.mjs:
  (*!
   * Reconnecting WebSocket
   * by Pedro Ladaria <pedro.ladaria@gmail.com>
   * https://github.com/pladaria/reconnecting-websocket
   * License MIT
   *)
*/
//# sourceMappingURL=client.js.map
