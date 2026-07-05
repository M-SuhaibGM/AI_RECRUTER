import { createContext } from "react";

interface UserDetail {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  credits?: number;
}

export const UserDetailContext = createContext<UserDetail | null>(null);