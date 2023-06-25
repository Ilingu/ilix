import * as FileSystem from "expo-file-system";
import {
  DevicesPool,
  FilePoolTransfer,
  FunctionResult,
  ServerResponse,
} from "./types/interfaces";

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
  process.env.NODE_ENV === "development" ? "http://127.0.0.1:3000" : "";

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
  filename: string,
  cb?: (progress: number) => void
): Promise<FunctionResult> => {
  const callback = (dlProgress: {
    totalBytesWritten: number;
    totalBytesExpectedToWrite: number;
  }) => {
    const progress =
      dlProgress.totalBytesWritten / dlProgress.totalBytesExpectedToWrite;
    cb && cb(progress);
  };

  /* Check if the app directory exists, if not create it */
  const appDirPath = FileSystem.documentDirectory + "ilix/";
  try {
    const appDirInfo = await FileSystem.getInfoAsync(appDirPath);
    if (!appDirInfo.exists) {
      await FileSystem.makeDirectoryAsync(appDirPath, {
        intermediates: true,
      });
    }
  } catch (e) {
    return { succeed: false, reason: "Couldn't create app directory" };
  }

  /* Download File from api */
  const call_url = `${SERVER_BASE_URL}/files/${file_id}`;
  console.log({ call_url });
  const downloadResumable = FileSystem.createDownloadResumable(
    call_url,
    appDirPath + filename,
    {},
    cb && callback
  );

  try {
    /* Save file to user storage in the app dir */
    await downloadResumable.downloadAsync();
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
