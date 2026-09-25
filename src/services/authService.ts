import { UserAccount } from "../types";
import {
  getCurrentUser,
  isCurrentUserAdmin,
  isUserLoggedIn,
  loginWithCredentials,
  registerSubAccount,
  loginWithSocial,
  logoutUser,
  saveUserSession,
} from "../utils/userAuth";

export const authService = {
  getCurrentUser,
  isLoggedIn: isUserLoggedIn,
  isAdmin: isCurrentUserAdmin,
  login: loginWithCredentials,
  register: registerSubAccount,
  socialLogin: loginWithSocial,
  logout: logoutUser,
  saveSession: saveUserSession,
  getAuthToken: () => {
    const user = getCurrentUser();
    return user?.token || "";
  },
};
