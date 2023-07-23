import { createContext } from "react";
import { FilePoolTransfer } from "../types/interfaces";
import type TransferHook from "../hooks/Transfer";

export type TransfersCtx = FilePoolTransfer[];
const TransfersContext = createContext<ReturnType<typeof TransferHook>>([
  false,
  null,
  [],
]);
export default TransfersContext;
