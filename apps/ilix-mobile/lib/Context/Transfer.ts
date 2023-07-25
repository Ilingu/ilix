import { createContext } from "react";
import { FilePoolTransfer } from "../types/interfaces";

export type TransfersCtx = [boolean, boolean | null, FilePoolTransfer[]];
const TransfersContext = createContext<TransfersCtx>([false, null, []]);
export default TransfersContext;
