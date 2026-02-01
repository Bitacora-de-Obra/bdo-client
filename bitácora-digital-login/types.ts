export interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export enum LoginStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}