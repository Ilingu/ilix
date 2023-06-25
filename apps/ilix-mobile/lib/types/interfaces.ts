export interface FunctionResult<T = never> {
  succeed: boolean;
  data?: T;
  reason?: string;
}

export interface ServerResponse<T = never> {
  succeed: boolean;
  status_code: number;
  data?: T;
  reason?: string;
}

/* DB Structs */
export interface DevicesPool {
  pool_name: string;
  devices_id: string[];
}

export interface FilePoolTransfer {
  _id: string;
  to: string; // device id
  from: string; // device id
  files_id: string[]; // _id pointer reference
}
