import { SERVER_BASE_URL } from "./ApiClient";
import type { DevicesPool, FilePoolTransfer, FunctionResult } from "./types/interfaces";
import { GenerateUuid, IsCodeOk, IsEmptyString } from "./utils";
import EventSource from "react-native-sse";

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

type SSEData<T extends DevicesPool | FilePoolTransfer> = T extends DevicesPool
  ? {
      Pool: DevicesPool;
    }
  : { Transfer: FilePoolTransfer };

type CustomEvents = "connected" | "pool" | "transfer" | "logout";
export default class SSEClient {
  private static _handler: SSEClient;

  private sse_connection: EventSource<CustomEvents>;

  private poolListeners: { [K in string]: callbackFn<"on_pool"> } = {};
  private transferListeners: { [K in string]: callbackFn<"on_transfer"> } = {};
  private logoutListeners: { [K in string]: callbackFn<"on_logout"> } = {};
  private errorListeners: { [K in string]: callbackFn<"onerror"> } = {};
  private closeListeners: { [K in string]: callbackFn<"onclosed"> } = {};

  private constructor(sse_connection: EventSource<CustomEvents>) {
    this.sse_connection = sse_connection;
  }

  private static new_handler(sse_connection: EventSource<CustomEvents>) {
    this._handler = new this(sse_connection);
    return this._handler;
  }

  public static async new_connection(
    device_id: string,
    key_phrase: string
  ): Promise<FunctionResult<SSEClient>> {
    if (IsEmptyString(device_id) || !IsCodeOk(key_phrase)) return { succeed: false };

    const sse_connection = new EventSource<CustomEvents>(
      `${SERVER_BASE_URL}/events?device_id=${device_id}&key_phrase=${key_phrase}`,
      {}
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

    const handler = this.new_handler(sse_connection);
    handler.listenToEvent();

    return { succeed: true, data: handler };
  }

  private listenToEvent() {
    this.sse_connection.addEventListener("pool", (msg) => {
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
        Object.values(this.poolListeners).forEach((cb) => cb(pool));
      } catch {}
    });
    this.sse_connection.addEventListener("transfer", (msg) => {
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
        Object.values(this.transferListeners).forEach((cb) => cb(transfer));
      } catch {}
    });
    this.sse_connection.addEventListener("logout", (msg) => {
      if (msg.type !== "logout" || typeof msg.data !== "string") return;
      Object.values(this.logoutListeners).forEach((cb) => cb());
    });
    this.sse_connection.addEventListener("close", () => {
      Object.values(this.closeListeners).forEach((cb) => cb());
    });
    this.sse_connection.addEventListener("error", () => {
      this.sse_connection.close();
      Object.values(this.errorListeners).forEach((cb) => cb());
    });
  }

  public addEventListener<T extends Events>(event: T, cb: callbackFn<T>): string {
    const id = GenerateUuid();
    switch (event) {
      case "on_pool":
        this.poolListeners[id] = cb as callbackFn<"on_pool">;
        break;
      case "on_transfer":
        this.transferListeners[id] = cb as callbackFn<"on_transfer">;
        break;
      case "on_logout":
        this.logoutListeners[id] = cb as callbackFn<"on_logout">;
        break;
      case "onclosed":
        this.closeListeners[id] = cb as callbackFn<"onclosed">;
        break;
      case "onerror":
        this.errorListeners[id] = cb as callbackFn<"onerror">;
        break;
      default:
        break;
    }
    return id;
  }

  public removeEventListener<T extends Events>(event: T, id: string) {
    switch (event) {
      case "on_pool":
        delete this.poolListeners[id];
        break;
      case "on_transfer":
        delete this.transferListeners[id];
        break;
      case "on_logout":
        delete this.logoutListeners[id];
        break;
      case "onclosed":
        delete this.closeListeners[id];
        break;
      case "onerror":
        delete this.errorListeners[id];
        break;
      default:
        break;
    }
  }
}
