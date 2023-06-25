import * as FileSystem from "expo-file-system";
import {
  DevicesPool,
  FilePoolTransfer,
  FunctionResult,
  ServerResponse,
} from "./types/interfaces";
import { blobToBase64 } from "./utils";

type GetRoutes = "/pool/{}" | "/file-transfer/{}/{}/all";
type GetPath<T extends GetRoutes> = T extends "/pool/{}"
  ? { pool_kp: string }
  : T extends "/file-transfer/{}/{}/all"
  ? { pool_kp: string; device_id: string }
  : never;
type GetReturns<T extends GetRoutes> = T extends "/pool/{}"
  ? DevicesPool
  : T extends "/file-transfer/{}/{}/all"
  ? FilePoolTransfer
  : never;

const SERVER_BASE_URL =
  process.env.NODE_ENV === "development"
    ? "https://904e-193-32-126-236.ngrok-free.app"
    : "";

export default class ApiClient {
  public static async get<T extends GetRoutes>(
    route: T,
    path: GetPath<T>,
    cb?: (progress: number) => void
  ): Promise<FunctionResult<GetReturns<T>>> {
    let built_uri = route as string;
    for (const pathVal of Object.values(path)) {
      built_uri = built_uri.replace("{}", pathVal);
    }

    let call_url = `${SERVER_BASE_URL}${built_uri}`;
    return await HandleRequest(call_url, "GET", undefined);
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
