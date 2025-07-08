export interface UserDocument {
  _id: string;
  name: string;  // Required per schema
  email: string;
  birthday: Date; // Required per schema
  timezone: string; // Required per schema
  active?: boolean;
  role?: string;
  birthdayReminder?: {
    lastProcessedYear: number | null;
    nextReminder: Date | null;
    active: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ErrorResponse {
  status: string;
  statusCode: number;
  message: string;
  stack?: string;
}

export interface ApiResponse<T> {
  status: string;
  statusCode: number;
  data: T;
  message?: string;
}
