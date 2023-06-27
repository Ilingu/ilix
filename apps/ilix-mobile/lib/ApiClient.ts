import * as FileSystem from "expo-file-system";
import {
  DevicesPool,
  FilePoolTransfer,
  FunctionResult,
  ServerResponse,
} from "./types/interfaces";
import { blobToBase64 } from "./utils";

// Get
type GetRoutes = "/pool/{pool_kp}" | "/file-transfer/{pool_kp}/{device_id}/all";
type GetPath<T extends GetRoutes> = T extends "/pool/{pool_kp}"
  ? { pool_kp: string }
  : T extends "/file-transfer/{pool_kp}/{device_id}/all"
  ? { pool_kp: string; device_id: string }
  : never;
type GetReturns<T extends GetRoutes> = T extends "/pool/{pool_kp}"
  ? DevicesPool
  : T extends "/file-transfer/{pool_kp}/{device_id}/all"
  ? FilePoolTransfer
  : never;

// Post
type PostRoutes =
  | "/pool/new"
  | "/file-transfer/{pool_kp}/add?from={from}&to={to}";
type PostPath<T extends PostRoutes> =
  T extends "/file-transfer/{pool_kp}/add?from={from}&to={to}"
    ? { pool_kp: string }
    : undefined;
type PostQuery<T extends PostRoutes> =
  T extends "/file-transfer/{pool_kp}/add?from={from}&to={to}"
    ? { from: string; to: string }
    : undefined;
type PostBody<T extends PostRoutes> = T extends "/pool/new"
  ? {
      name: string;
      device_id: string;
      device_name: string;
    }
  : undefined;
type PostReturns<T extends PostRoutes> = T extends "/pool/new"
  ? string
  : T extends "/file-transfer/{pool_kp}/add?from={from}&to={to}"
  ? null
  : never;

// Put
type PutRoutes = "/pool/{pool_kp}/join";
type PutPath<T extends PutRoutes> = T extends "/pool/{pool_kp}/join"
  ? { pool_kp: string }
  : undefined;
type PutBody<T extends PutRoutes> = T extends "/pool/{pool_kp}/join"
  ? {
      device_id: string;
      device_name: string;
    }
  : undefined;
type PutReturns<T extends PutRoutes> = T extends "/pool/{pool_kp}/join"
  ? DevicesPool
  : never;

// Delete
type DeleteRoutes =
  | "/pool/{pool_kp}"
  | "/pool/{pool_kp}/leave"
  | "/file-transfer/{pool_kp}/{device_id}/{transfer_id}"
  | "/files/{file_id}";
type DeletePath<T extends DeleteRoutes> = T extends
  | "/pool/{pool_kp}"
  | "/pool/{pool_kp}/leave"
  ? { pool_kp: string }
  : T extends "/file-transfer/{pool_kp}/{device_id}/{transfer_id}"
  ? { pool_kp: string; device_id: string; transfer_id: string }
  : T extends "/files/{file_id}"
  ? { file_id: string }
  : undefined;
type DeleteBody<T extends DeleteRoutes> = T extends "/pool/{pool_kp}/leave"
  ? {
      device_id: string;
    }
  : undefined;
type DeleteReturns<T extends DeleteRoutes> = T extends
  | "/pool/{pool_kp}"
  | "/pool/{pool_kp}/leave"
  | "/file-transfer/{pool_kp}/{device_id}/{transfer_id}"
  | "/files/{file_id}"
  ? null
  : never;

const SERVER_BASE_URL =
  process.env.NODE_ENV === "development"
    ? "https://904e-193-32-126-236.ngrok-free.app"
    : "";

export default class ApiClient {
  public static async get<T extends GetRoutes>(
    route: T,
    path: GetPath<T>
  ): Promise<FunctionResult<GetReturns<T>>> {
    let built_uri = route as string;
    if (path) built_uri = build_uri(built_uri, path);

    const call_url = `${SERVER_BASE_URL}${built_uri}`;
    return await HandleRequest(call_url, "GET", undefined);
  }
  public static async post<T extends PostRoutes>(
    route: T,
    path: PostPath<T>,
    query: PostQuery<T>,
    body: PostBody<T>
  ): Promise<FunctionResult<PostReturns<T>>> {
    let built_uri = route as string;
    if (path) built_uri = build_uri(built_uri, path);
    if (query) built_uri = build_uri(built_uri, query);

    const call_url = `${SERVER_BASE_URL}${built_uri}`;
    return await HandleRequest(
      call_url,
      "POST",
      body && JSON.stringify(body) // this is cleaner but it has a lot of unexpected behavior, becareful me of the future!
    );
  }
  public static async put<T extends PutRoutes>(
    route: T,
    path: PutPath<T>,
    body: PutBody<T>
  ): Promise<FunctionResult<PutReturns<T>>> {
    let built_uri = route as string;
    if (path) built_uri = build_uri(built_uri, path);

    const call_url = `${SERVER_BASE_URL}${built_uri}`;
    return await HandleRequest(
      call_url,
      "PUT",
      body && JSON.stringify(body) // this is cleaner but it has a lot of unexpected behavior, becareful me of the future!
    );
  }
  public static async delete<T extends DeleteRoutes>(
    route: T,
    path: DeletePath<T>,
    body: DeleteBody<T>
  ): Promise<FunctionResult<DeleteReturns<T>>> {
    let built_uri = route as string;
    if (path) built_uri = build_uri(built_uri, path);

    const call_url = `${SERVER_BASE_URL}${built_uri}`;
    return await HandleRequest(
      call_url,
      "DELETE",
      body && JSON.stringify(body) // this is cleaner but it has a lot of unexpected behavior, becareful me of the future!
    );
  }
}

export const HandleGetFileAndSave = async (
  file_id: string,
  filename: string
): Promise<FunctionResult> => {
  const permissions =
    await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permissions.granted)
    return { succeed: false, reason: "permission not granted" };

  try {
    /* Download File from api */
    const call_url = `${SERVER_BASE_URL}/files/${file_id}`;
    const resp = await fetch(call_url);
    if (!resp.ok)
      return { succeed: false, reason: "server failed to fetch file" };

    const fileBlob = await resp.blob();
    const base64File = await blobToBase64(fileBlob);

    const mimeType = resp.headers.get("content-type")?.split(";")[0];
    if (typeof mimeType !== "string")
      return { succeed: false, reason: "bad headers returned from server" };

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
  } catch (e) {
    return { succeed: false, reason: e as string };
  }
};

const HandleRequest = async <T = never>(
  call_url: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  body?: string,
  is_no_body_ok = false,
  is_no_data_ok = false
): Promise<FunctionResult<T>> => {
  try {
    const resp = await fetch(call_url, {
      method,
      body,
      headers: {
        "Content-Type": "application/json",
      },
    });

    let respBody: ServerResponse<string>;
    try {
      respBody = JSON.parse(await resp.json());
    } catch (_) {
      return { succeed: is_no_body_ok };
    }

    if (!("succeed" in respBody) || !("status_code" in respBody))
      return {
        succeed: false,
        reason: "",
      };

    let parsedData: T | undefined = undefined;
    if ("data" in respBody && typeof respBody.data === "string") {
      try {
        parsedData = JSON.parse(respBody.data);
      } catch (error) {
        return { succeed: is_no_data_ok, reason: respBody.reason };
      }
    }

    return {
      succeed: respBody.succeed,
      data: parsedData,
      reason: respBody.reason,
    };
  } catch (_) {
    return {
      succeed: false,
      reason: "Client failed to send request to the server",
    };
  }
};

const build_uri = (uri: string, datas: object): string => {
  for (const [key, val] of Object.entries(datas))
    uri = uri.replace(`{${key}}`, val);
  return uri;
};