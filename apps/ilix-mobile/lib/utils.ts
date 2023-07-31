import { ToastAndroid } from "react-native";
import { SHA3 } from "sha3";
import * as Clipboard from "expo-clipboard";

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
      if (!fileB64) return rej(new Error("failed to convert"));
      resolve(fileB64);
    };
    reader.onerror = rej;
    reader.readAsDataURL(blob);
  });
}

export const IsCodeOk = (code: string): boolean => code.split("-").length === 20;

export const range = (from: number, to: number): number[] => {
  if (from === to) return [from];

  const rev = from > to;
  if (rev) [from, to] = [to, from];

  const range = Array(to - from + 1)
    .fill(0)
    .map((_, idx) => from + idx);

  if (rev) range.reverse();
  return range;
};

/**
 * Sets the content of the user's clipboard.
 *
 * @param text The string to save to the clipboard.
 * @returns On web, this returns a promise that fulfills to a boolean value indicating whether or not
 * the string was saved to the user's clipboard. On iOS and Android, the promise always resolves to `true`.
 */
export const copyToClipboard = async (text: string) => await Clipboard.setStringAsync(text);
