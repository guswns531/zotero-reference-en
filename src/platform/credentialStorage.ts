import { config } from "../../package.json";
import { reportError } from "../utils/errors";

const LOGIN_HOSTNAME = `chrome://${config.addonRef}`;
const LOGIN_REALM = `${config.addonName}: Semantic Scholar`;
const LOGIN_USERNAME = "apiKey";
const PREF_KEY = `${config.addonRef}.semanticScholar.apiKey`;

function getLoginManager() {
  const globalAny = globalThis as any;
  if (globalAny.Services?.logins) {
    return globalAny.Services.logins;
  }

  const components = globalAny.Components;
  return components?.classes?.["@mozilla.org/login-manager;1"]?.getService(
    components.interfaces.nsILoginManager,
  );
}

function createLoginInfo(password: string) {
  const globalAny = globalThis as any;
  const components = globalAny.Components;
  if (!components?.Constructor) {
    throw new Error("Login storage is unavailable in this Zotero runtime.");
  }

  const LoginInfo = components.Constructor(
    "@mozilla.org/login-manager/loginInfo;1",
    components.interfaces.nsILoginInfo,
    "init",
  );

  return new LoginInfo(
    LOGIN_HOSTNAME,
    null,
    LOGIN_REALM,
    LOGIN_USERNAME,
    password,
    "",
    "",
  );
}

function findExistingLogin() {
  const loginManager = getLoginManager();
  if (!loginManager) {
    throw new Error("Login storage is unavailable in this Zotero runtime.");
  }

  const logins = loginManager.findLogins(LOGIN_HOSTNAME, null, LOGIN_REALM);
  return logins.find((login: any) => login.username === LOGIN_USERNAME);
}

export function getSemanticScholarApiKey() {
  try {
    const loginValue = findExistingLogin()?.password || "";
    if (loginValue) {
      return loginValue;
    }
  } catch (error) {
    reportError(error, "credentialStorage.getSemanticScholarApiKey");
  }

  try {
    return (Zotero.Prefs.get(PREF_KEY) as string) || "";
  } catch (error) {
    reportError(error, "credentialStorage.getSemanticScholarApiKey.prefFallback");
    return "";
  }
}

export function setSemanticScholarApiKey(apiKey: string) {
  const trimmed = apiKey.trim();

  try {
    const loginManager = getLoginManager();
    if (!loginManager) {
      throw new Error("Login storage is unavailable in this Zotero runtime.");
    }

    const existingLogin = findExistingLogin();
    if (!trimmed) {
      if (existingLogin) {
        loginManager.removeLogin(existingLogin);
      }
      return;
    }

    const nextLogin = createLoginInfo(trimmed);
    if (existingLogin) {
      loginManager.modifyLogin(existingLogin, nextLogin);
    } else {
      loginManager.addLogin(nextLogin);
    }
    Zotero.Prefs.set(PREF_KEY, trimmed);
    return "credential";
  } catch (error) {
    reportError(error, "credentialStorage.setSemanticScholarApiKey");
  }

  try {
    Zotero.Prefs.set(PREF_KEY, trimmed);
    return "prefs";
  } catch (error) {
    throw reportError(error, "credentialStorage.setSemanticScholarApiKey.prefFallback");
  }
}

export function clearSemanticScholarApiKey() {
  try {
    const loginManager = getLoginManager();
    const existingLogin = findExistingLogin();
    if (loginManager && existingLogin) {
      loginManager.removeLogin(existingLogin);
    }
  } catch (error) {
    reportError(error, "credentialStorage.clearSemanticScholarApiKey");
  }

  try {
    Zotero.Prefs.set(PREF_KEY, "");
  } catch (error) {
    throw reportError(error, "credentialStorage.clearSemanticScholarApiKey.prefFallback");
  }
}
