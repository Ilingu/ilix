export interface FunctionResult<T = never> {
  succeed: boolean;
  data?: T;
  reason?: string;
}

export interface ServerResponse<T = never> {
  success: boolean;
  status_code: number;
  data?: T;
  reason?: string;
}

/* DB Structs */
export interface DevicesPool {
  pool_name: string;
  devices_id: string[];
  devices_id_to_name: { [device_id: string]: string };
}

export interface StoredDevicesPool extends DevicesPool {
  SS_key_hashed_kp: string;
}

export interface FilePoolTransfer {
  _id: string; // transfer id
  to: string; // device id
  from: string; // device id
  files_id: string[]; // _id pointer reference to files
}

export interface FileInfo {
  _id: {
    $oid: string; // file_id
  };
  filename: string;
  chunkSize: number;
  length: number;
  uploadDate: {
    $date: {
      $numberLong: number;
    };
  };
}
