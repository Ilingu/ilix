import uuid from "react-native-uuid";
import EventSource from "react-native-sse";

import type { DevicesPool, FilePoolTransfer, FunctionResult } from "./types/interfaces";
import { IsCodeOk, IsEmptyString } from "./utils";
import { SERVER_BASE_URL } from "./ApiClient";

/**
 * @type the different events that the user can listen to
 */
type Events = "on_pool" | "on_transfer" | "on_logout" | "onerror" | "onclosed";
type callbackFn<T extends Events> = T extends "on_pool"
  ? (pool: DevicesPool) => void
  : T extends "on_transfer"
  ? (transfer: FilePoolTransfer) => void
  : T extends "on_logout" | "onclosed"
  ? () => void
  : T extends "onerror"
  ? (reason?: string) => void
  : never;

/**
 * @type data structure type returned by the server
 */
type SSEData<T extends DevicesPool | FilePoolTransfer> = T extends DevicesPool
  ? {
      Pool: DevicesPool;
    }
  : { Transfer: FilePoolTransfer };

/**
 * @type the different events that the sse server send
 */
type CustomEvents = "connected" | "pool" | "transfer" | "logout";

/**
 * @class Handle the client part of an SSE connection
 *
 * the entry point is `new_connection`
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
 */
export default class SSEClient {
  /**
   * @private
   */
  static #_handler: SSEClient;

  /**
   * @private
   */
  #sse_connection: EventSource<CustomEvents>;

  /**
   * @private
   */
  #poolListeners: { [K in string]: callbackFn<"on_pool"> } = {};
  /**
   * @private
   */
  #transferListeners: { [K in string]: callbackFn<"on_transfer"> } = {};
  /**
   * @private
   */
  #logoutListeners: { [K in string]: callbackFn<"on_logout"> } = {};
  /**
   * @private
   */
  #errorListeners: { [K in string]: callbackFn<"onerror"> } = {};
  /**
   * @private
   */
  #closeListeners: { [K in string]: callbackFn<"onclosed"> } = {};

  private constructor(sse_connection: EventSource<CustomEvents>) {
    this.#sse_connection = sse_connection;
  }

  static #new_handler(sse_connection: EventSource<CustomEvents>) {
    this.#_handler = new this(sse_connection);
    return this.#_handler;
  }

  /**
   * Create, handle and listen to an ilix event source, the params are here for security and Authentication purpose.
   *
   * There can only have one sse connection at the time, by calling this you'll
   *
   * @param {string} device_id
   * @param {string} key_phrase
   * @returns the sse handler client
   */
  public static async new_connection(
    device_id: string,
    key_phrase: string
  ): Promise<FunctionResult<SSEClient>> {
    if (IsEmptyString(device_id) || !IsCodeOk(key_phrase)) return { succeed: false };

    const sse_connection = new EventSource<CustomEvents>(
      `${SERVER_BASE_URL}/events?device_id=${device_id}`,
      { headers: { Authorization: key_phrase } }
    );

    const { succeed, reason } = await new Promise<FunctionResult>((res) => {
      sse_connection.addEventListener("open", () => res({ succeed: true }));
      sse_connection.addEventListener("error", () =>
        res({ succeed: false, reason: "failed to connect" })
      );
      setTimeout(() => res({ succeed: false, reason: "timeout" }), 5000);
    });
    if (!succeed) {
      sse_connection.close();
      return { succeed: false, reason };
    }

    const handler = this.#new_handler(sse_connection);
    handler.#listenToEvent();

    return { succeed: true, data: handler };
  }

  /** Listen the event source: message, error, events; in the background.
   *
   * It also trigger the client listeners
   * @method
   * @private
   */
  #listenToEvent() {
    this.#sse_connection.addEventListener("pool", (msg) => {
      if (msg.type !== "pool" || typeof msg.data !== "string") return;

      try {
        const resp_data: SSEData<DevicesPool> = JSON.parse(msg.data);
        if (!("Pool" in resp_data)) return;

        const pool = resp_data.Pool;
        if (
          pool === undefined ||
          !("pool_name" in pool) ||
          !("devices_id" in pool) ||
          !("devices_id_to_name" in pool)
        )
          return;
        Object.values(this.#poolListeners).forEach((cb) => cb(pool));
      } catch {}
    });
    this.#sse_connection.addEventListener("transfer", (msg) => {
      if (msg.type !== "transfer" || typeof msg.data !== "string") return;
      try {
        const resp_data: SSEData<FilePoolTransfer> = JSON.parse(msg.data);
        if (!("Transfer" in resp_data)) return;

        const transfer = resp_data.Transfer;
        if (
          transfer === undefined ||
          !("_id" in transfer) ||
          !("to" in transfer) ||
          !("from" in transfer) ||
          !("files_id" in transfer)
        )
          return;
        Object.values(this.#transferListeners).forEach((cb) => cb(transfer));
      } catch {}
    });
    this.#sse_connection.addEventListener("logout", (msg) => {
      if (msg.type !== "logout" || typeof msg.data !== "string") return;
      Object.values(this.#logoutListeners).forEach((cb) => cb());
    });
    this.#sse_connection.addEventListener("close", () => {
      Object.values(this.#closeListeners).forEach((cb) => cb());
    });
    this.#sse_connection.addEventListener("error", () => {
      this.#sse_connection.close();
      Object.values(this.#errorListeners).forEach((cb) => cb());
    });
  }

  /**
   * Register new listener to a given event
   * @param {Events} event event you want to listen to: `"on_pool" | "on_transfer" | "on_logout" | "onclosed" | "onerror"`
   * @param cb callback function that will be trigerred when to event happen
   * @returns the unique listener id, e.g: if you want  later on to remove this event listener (with `removeEventListener`) you will have to prodvide it
   */
  public addEventListener<T extends Events>(event: T, cb: callbackFn<T>): string {
    const id = uuid.v4() as string;
    switch (event) {
      case "on_pool":
        this.#poolListeners[id] = cb as callbackFn<"on_pool">;
        break;
      case "on_transfer":
        this.#transferListeners[id] = cb as callbackFn<"on_transfer">;
        break;
      case "on_logout":
        this.#logoutListeners[id] = cb as callbackFn<"on_logout">;
        break;
      case "onclosed":
        this.#closeListeners[id] = cb as callbackFn<"onclosed">;
        break;
      case "onerror":
        this.#errorListeners[id] = cb as callbackFn<"onerror">;
        break;
      default:
        break;
    }
    return id;
  }

  /**
   * Remove the listener for the given event
   * @param {Events} event event you want to stop listening to: `"on_pool" | "on_transfer" | "on_logout" | "onclosed" | "onerror"`
   * @param {string} id the id provided to you when creating this listener
   */
  public removeEventListener<T extends Events>(event: T, id: string) {
    switch (event) {
      case "on_pool":
        delete this.#poolListeners[id];
        break;
      case "on_transfer":
        delete this.#transferListeners[id];
        break;
      case "on_logout":
        delete this.#logoutListeners[id];
        break;
      case "onclosed":
        delete this.#closeListeners[id];
        break;
      case "onerror":
        delete this.#errorListeners[id];
        break;
      default:
        break;
    }
  }
}
