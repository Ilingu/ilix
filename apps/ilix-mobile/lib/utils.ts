import { ToastAndroid } from "react-native";
import { SHA3 } from "sha3";

export const DegToRad = (deg: number): number => (deg * Math.PI) / 180;

export const IsEmptyString = (str: string): boolean => str.trim().length === 0;

export const Hash = (str: string): string => {
  const hash = new SHA3(256);
  return hash.update(str).digest("hex");
};

export enum ToastDuration {
  SHORT,
  LONG,
}
export const pushToast = (msg: string, duration = ToastDuration.SHORT) =>
  ToastAndroid.showWithGravity(
    msg,
    duration,
    duration === ToastDuration.SHORT ? ToastAndroid.SHORT : ToastAndroid.LONG
  );

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, rej) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const fileB64 = reader.result?.toString();
      if (!fileB64) return rej();
      resolve(fileB64);
    };
    reader.onerror = rej;
    reader.readAsDataURL(blob);
  });
}
