import { ToastAndroid } from "react-native";
import * as Clipboard from "expo-clipboard";

import { SHA3 } from "sha3";

/**
 * Converts degrees into radians
 * @param {number} deg
 * @returns {number} the radian converted degree
 */
export const DegToRad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Simple helper function that check if the provided string is empty or not
 * @param {string} str
 * @returns {boolean} whether the string is empty or not
 */
export const IsEmptyString = (str: string): boolean =>
  typeof str === "string" && str.trim().length === 0;

/**
 * Simple helper function that hash the provided string following the `SHA3-256` standard
 * @param {string} str string to hash
 * @returns {string} the hashed value
 */
export const Hash = (str: string): string => {
  const hash = new SHA3(256);
  return hash.update(str).digest("hex");
};

export enum ToastDuration {
  SHORT,
  LONG,
}

/**
 * UI function that will display a native message to the user (little toast to the bottom of the screen)
 * @param {string} msg the message to display (not too big to keep the UI clean)
 * @param {ToastDuration} duration you cannot use a custom amount of time, since it's a native feature, you have to use `ToastDuration`
 */
export const pushToast = (msg: string, duration = ToastDuration.SHORT) =>
  ToastAndroid.showWithGravity(
    msg,
    duration,
    duration === ToastDuration.SHORT ? ToastAndroid.SHORT : ToastAndroid.LONG
  );

/**
 * Converts a `Blob` object to a `base64` string
 * @param {Blob} blob the blob data
 * @returns {Promise<string>} a promise containing the base64 version of the blob data
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Blob
 */
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

/**
 * Simple helper function to check if the given string is a valid app key_phrase,
 * which are both the unique identifier of an pool and its password
 * @param {string} code
 * @returns {boolean} whether the `code` is valid or not (it should contains 20 words separated by a `-`)
 */
export const IsCodeOk = (code: string): boolean => code.split("-").length === 20;

/**
 * Wrapper function of the expo `Clipboard.setStringAsync`,
 * it's just a way to rename and have a unified function across the app
 *
 * @see https://docs.expo.dev/versions/latest/sdk/clipboard/#setstringasynctext-options
 *
 * ---
 *
 * Here is the original doc:
 *
 *
 * Sets the content of the user's clipboard.
 *
 * @param text The string to save to the clipboard.
 * @returns On web, this returns a promise that fulfills to a boolean value indicating whether or not
 * the string was saved to the user's clipboard. On iOS and Android, the promise always resolves to `true`.
 *
 */
export const copyToClipboard = (text: string) => Clipboard.setStringAsync(text);
