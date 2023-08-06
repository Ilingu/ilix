import { createContext } from "react";
import type { FilePoolTransfer } from "../types/interfaces";

export type TransfersCtx = [boolean, boolean | null, FilePoolTransfer[], () => Promise<void>];
const TransfersContext = createContext<TransfersCtx>([false, null, [], async () => {}]);
export default TransfersContext;
