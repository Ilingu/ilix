import * as FileSystem from "expo-file-system";
import type {
  DevicesPool,
  FileInfo,
  FilePoolTransfer,
  FunctionResult,
  ServerResponse,
} from "./types/interfaces";
import { blobToBase64 } from "./utils";

// Get
type GetRoutes = "/pool" | "/file-transfer/{device_id}/all" | "/files/info?files_ids={files_ids}";
type GetPath<T extends GetRoutes> = T extends "/file-transfer/{device_id}/all"
  ? { device_id: string }
  : undefined;
type GetQuery<T extends GetRoutes> = T extends "/files/info?files_ids={files_ids}"
  ? { files_ids: string[] }
  : undefined;
type GetAuth<T extends GetRoutes> = T extends "/pool" | "/file-transfer/{device_id}/all"
  ? { pool_kp: string }
  : undefined;
type GetReturns<T extends GetRoutes> = T extends "/pool"
  ? DevicesPool
  : T extends "/file-transfer/{device_id}/all"
  ? FilePoolTransfer[]
  : T extends "/files/info?files_ids={files_ids}"
  ? FileInfo[]
  : never;

// Post
type PostRoutes =
  | "/pool/new"
  | "/file-transfer?from={from}&to={to}"
  | "/file-transfer/{transfer_id}/add_files";
type PostPath<T extends PostRoutes> = T extends "/file-transfer/{transfer_id}/add_files"
  ? { transfer_id: string }
  : undefined;
type PostQuery<T extends PostRoutes> = T extends "/file-transfer?from={from}&to={to}"
  ? { from: string; to: string }
  : undefined;
type PostAuth<T extends PostRoutes> = T extends
  | "/file-transfer?from={from}&to={to}"
  | "/file-transfer/{transfer_id}/add_files"
  ? { pool_kp: string }
  : undefined;
type PostBody<T extends PostRoutes> = T extends "/pool/new"
  ? {
      name: string;
      device_id: string;
      device_name: string;
    }
  : T extends "/file-transfer?from={from}&to={to}" | "/file-transfer/{transfer_id}/add_files"
  ? FormData
  : undefined;
type PostReturns<T extends PostRoutes> = T extends "/pool/new"
  ? string
  : T extends "/file-transfer?from={from}&to={to}"
  ? string
  : T extends "/file-transfer/{transfer_id}/add_files"
  ? string[]
  : never;

// Put
type PutRoutes = "/pool/join";
type PutAuth<T extends PutRoutes> = T extends "/pool/join" ? { pool_kp: string } : undefined;
type PutBody<T extends PutRoutes> = T extends "/pool/join"
  ? {
      device_id: string;
      device_name: string;
    }
  : undefined;
type PutReturns<T extends PutRoutes> = T extends "/pool/join" ? DevicesPool : never;

// Delete
type DeleteRoutes =
  | "/pool"
  | "/pool/leave"
  | "/file-transfer/{device_id}/{transfer_id}"
  | "/file/{file_id}";
type DeletePath<T extends DeleteRoutes> = T extends "/file-transfer/{device_id}/{transfer_id}"
  ? { device_id: string; transfer_id: string }
  : T extends "/file/{file_id}"
  ? { file_id: string }
  : undefined;
type DeleteAuth<T extends DeleteRoutes> = T extends
  | "/pool"
  | "/pool/leave"
  | "/file-transfer/{device_id}/{transfer_id}"
  | "/file/{file_id}"
  ? { pool_kp: string }
  : undefined;
type DeleteBody<T extends DeleteRoutes> = T extends "/pool/leave"
  ? {
      device_id: string;
    }
  : undefined;
type DeleteReturns<T extends DeleteRoutes> = T extends
  | "/pool"
  | "/pool/leave"
  | "/file-transfer/{device_id}/{transfer_id}"
  | "/file/{file_id}"
  ? null
  : never;

export const SERVER_BASE_URL = (
  process.env.NODE_ENV === "development"
    ? "https://38af-193-32-126-236.ngrok-free.app"
    : process.env.EXPO_PUBLIC_API_URL ?? ""
).replace(/\/+$/g, ""); // trim_matches_end of "/"

/**
 * @namespace ApiClient - This namespace regroups all the functions related to using the ilix api server.
 *
 * It is fully typed.
 */
namespace ApiClient {
  /**
   * Get request to the ilix api
   * @param route all the valid get route on server
   * @param path associated path with `route`
   * @param query associated query with `route`
   * @param auth associated auth with `route`
   * @returns what the `route` returns
   */
  export async function Get<T extends GetRoutes>(
    route: T,
    path: GetPath<T>,
    query: GetQuery<T>,
    auth: GetAuth<T>
  ): Promise<FunctionResult<GetReturns<T>>> {
    let built_uri = route as string;
    if (path) built_uri = build_uri(built_uri, path);
    if (query) built_uri = build_uri(built_uri, query);

    const call_url = `${SERVER_BASE_URL}${built_uri}`;
    return await HandleRequest(call_url, "GET", undefined, auth);
  }
  /**
   * Post request to the ilix api
   * @param route all the valid post route on server
   * @param path associated path with `route`
   * @param query associated query with `route`
   * @param body associated body with `route`
   * @param auth associated auth with `route`
   * @returns what the `route` returns
   */
  export async function Post<T extends PostRoutes>(
    route: T,
    path: PostPath<T>,
    query: PostQuery<T>,
    body: PostBody<T>,
    auth: PostAuth<T>
  ): Promise<FunctionResult<PostReturns<T>>> {
    let built_uri = route as string;
    if (path) built_uri = build_uri(built_uri, path);
    if (query) built_uri = build_uri(built_uri, query);

    const call_url = `${SERVER_BASE_URL}${built_uri}`;
    const reqBody = body === undefined ? undefined : build_body(body);
    return await HandleRequest(call_url, "POST", reqBody, auth);
  }
  /**
   * Put request to the ilix api
   * @param route all the valid put route on server
   * @param body associated body with `route`
   * @param auth associated auth with `route`
   * @returns what the `route` returns
   */
  export async function Put<T extends PutRoutes>(
    route: T,
    body: PutBody<T>,
    auth: PutAuth<T>
  ): Promise<FunctionResult<PutReturns<T>>> {
    const call_url = `${SERVER_BASE_URL}${route}`;
    const reqBody = body === undefined ? undefined : build_body(body);
    return await HandleRequest(call_url, "PUT", reqBody, auth);
  }
  /**
   * Post request to the ilix api
   * @param route all the valid delete route on server
   * @param path associated path with `route`
   * @param body associated body with `route`
   * @param auth associated auth with `route`
   * @returns what the `route` returns
   */
  export async function Delete<T extends DeleteRoutes>(
    route: T,
    path: DeletePath<T>,
    body: DeleteBody<T>,
    auth: DeleteAuth<T>
  ): Promise<FunctionResult<DeleteReturns<T>>> {
    let built_uri = route as string;
    if (path) built_uri = build_uri(built_uri, path);

    const call_url = `${SERVER_BASE_URL}${built_uri}`;
    const reqBody = body === undefined ? undefined : build_body(body);
    return await HandleRequest(call_url, "DELETE", reqBody, auth);
  }

  export interface PickedFile {
    /**
     * Field indicating that the document pick has been successful.
     */
    type: "success";
    /**
     * Document original name.
     */
    name: string;
    /**
     * Document size in bytes.
     */
    size?: number;
    /**
     * An URI to the local document file.
     */
    uri: string;
    /**
     * Document MIME type.
     */
    mimeType?: string;
    /**
     * Timestamp of last document modification.
     */
    lastModified?: number;
    /**
     * `File` object for the parity with web File API.
     * @platform web
     */
    file?: File;
    /**
     * `FileList` object for the parity with web File API.
     * @platform web
     */
    output?: FileList | null;
  }

  /**
   * It will ask the user in what directory to save the files, thne down
   * @param {[string, string][]} files_to_download `[file_id, filename]`
   * @param {string} key_phrase
   * @returns whether it succeed or not
   */
  export const HandleGetFilesAndSave = async (
    files_to_download: [string, string][],
    key_phrase: string
  ): Promise<FunctionResult> => {
    try {
      const permissions =
        await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!permissions.granted) return { succeed: false, reason: "permission not granted" };

      const download_iter = files_to_download.map(
        async ([file_id, filename]): Promise<FunctionResult> => {
          try {
            /* Download File from api */
            const call_url = `${SERVER_BASE_URL}/file/${file_id}`;
            const resp = await fetch(call_url, { headers: { Authorization: key_phrase } });
            if (!resp.ok) return { succeed: false, reason: "server failed to fetch file" };

            const fileBlob = await resp.blob();
            const base64File = await blobToBase64(fileBlob);

            const mimeType = resp.headers.get("content-type")?.split(";")[0];
            if (typeof mimeType !== "string")
              return { succeed: false, reason: "missing 'content-type' header" };

            /* Save file to user storage in the app dir */
            const uri = await FileSystem.StorageAccessFramework.createFileAsync(
              permissions.directoryUri,
              filename.replace(/^\/+|\/+$/g, "").split(".")[0],
              mimeType
            );
            await FileSystem.writeAsStringAsync(uri, base64File.split("base64,")[1], {
              encoding: FileSystem.EncodingType.Base64,
            });

            return { succeed: true };
          } catch (error) {
            return { succeed: false, reason: `${error}` };
          }
        }
      );
      const download_result = await Promise.all(download_iter);

      const succeed = download_result.every(({ succeed }) => succeed);
      return { succeed };
    } catch (e) {
      return { succeed: false, reason: e as string };
    }
  };

  const HandleRequest = async <T = never>(
    call_url: string,
    method: "GET" | "POST" | "PUT" | "DELETE",
    body?: string | FormData,
    auth?: { pool_kp: string },
    is_no_body_ok = false,
    is_no_data_ok = false
  ): Promise<FunctionResult<T>> => {
    try {
      const headers = new Headers();
      if (typeof body === "string") headers.set("Content-Type", "application/json");
      if (auth?.pool_kp !== undefined) headers.set("Authorization", auth.pool_kp);

      const resp = await fetch(call_url, {
        method,
        body,
        headers,
      });

      let respBody: ServerResponse<string>;
      try {
        respBody = await resp.json();
      } catch {
        return { succeed: is_no_body_ok, reason: "failed to parse body" };
      }

      if (!("success" in respBody) || !("status_code" in respBody))
        return {
          succeed: false,
          reason: "wrong response type",
        };
      if (typeof respBody.success !== "boolean" || typeof respBody.status_code !== "number")
        return {
          succeed: false,
          reason: "wrong data type",
        };

      let parsedData: T | undefined = undefined;
      if ("data" in respBody && typeof respBody.data === "string") {
        try {
          parsedData = JSON.parse(respBody.data);
        } catch {
          return {
            succeed: is_no_data_ok,
            reason: respBody.reason ?? "failed to parse data",
          };
        }
      }

      return {
        succeed: respBody.success,
        data: parsedData,
        reason: respBody.reason,
      };
    } catch (e) {
      return {
        succeed: false,
        reason: `Client failed to send request to the server: ${e}}`,
      };
    }
  };

  const build_body = <T = any>(body: T | FormData): string | FormData => {
    if (body instanceof FormData) return body;
    else return JSON.stringify(body);
  };

  const build_uri = (uri: string, datas: object): string => {
    for (const [key, val] of Object.entries(datas))
      if (Array.isArray(val)) uri = uri.replace(`{${key}}`, val.join(","));
      else uri = uri.replace(`{${key}}`, val);
    return uri;
  };
}
export default ApiClient;
