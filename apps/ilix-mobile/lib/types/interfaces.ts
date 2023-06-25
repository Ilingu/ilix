export interface FunctionResult<T = never> {
  succeed: boolean;
  data?: T;
}
