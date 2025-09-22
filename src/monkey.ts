import { AxiosRequestConfig, AxiosResponse } from "axios";
import { API } from "./app.ts";
import db from "./db.ts";
import { setpResults } from "./fakeData/seizure.ts";
import { lastResult, lastThousandResults, profile } from "./fakeData/wibla.ts";

class Monkey {
  API_URL: string;
  reqConfig: AxiosRequestConfig;
  apeKey: string | undefined;

  constructor() {
    this.API_URL = "https://api.monkeytype.com";
    this.reqConfig = { headers: { Authorization: "" } };
    this.apeKey = undefined;
  }

  setToken(token: string) {
    const tokenPattern = /^[A-Za-z0-9\-_]{76}$/;

    if (typeof token !== "string" || !tokenPattern.test(token))
      throw new Error("[Monkey] Invalid token format.");

    this.reqConfig.headers!.Authorization = `ApeKey ${token}`;
    this.apeKey = token;
    console.log("[Monkey] API key set");
  }

  deleteToken() {
    this.reqConfig.headers!.Authorization = undefined;
    delete this.apeKey;
    console.log("[Monkey] API key deleted");
  }

  async isKeyValid(apeKey?: string): Promise<boolean> {
    if (apeKey) this.setToken(apeKey);

    if (!this.reqConfig) {
      console.error("[Monkey] No API token set. Use setToken() first.");
      return Promise.resolve(false);
    }

    try {
      const res = await API.get(this.API_URL + "/psas", this.reqConfig);

      if (res.status === 200) {
        db.setActive(this.apeKey!, true);
        return Promise.resolve(true);
      }

      if (res.status === 471) {
        console.error("[Monkey] ApeKey is inactive", this.apeKey);
        db.setActive(this.apeKey!, false);
        return Promise.resolve(false);
      }

      console.error("[Monkey] Unknown HTTP Status code : ", res.status);
      return Promise.resolve(false);
    } catch (err) {
      console.error("[Monkey] Request error:", err);
      return Promise.resolve(false);
    }
  }

  async get(path: string): Promise<AxiosResponse> {
    if (!this.apeKey) {
      console.error("[Monkey] No API token set. Use setToken() first.");
      throw new Error("Unauthorized: API token not set");
    }

    try {
      const res = await API.get(this.API_URL + path, this.reqConfig);
      return res.data;
    } catch (err) {
      console.error("[Monkey] Request error:", err);
      throw err;
    }
  }

  async fakeGet(path: string, fakeData: any): Promise<AxiosResponse> {
    if (!this.apeKey) {
      console.error("[Monkey] No API token set. Use setToken() first.");
      throw new Error("Unauthorized: API token not set");
    }

    console.log(`[Monkey] [GET] ${this.API_URL + path}`);
    return Promise.resolve(fakeData);
  }

  async getProfileByID(uid: string) {
    try {
      const data = await this.get(`/users/${uid}/profile?isUid=true`);
      console.debug({ data });
      return data?.data ?? {};
    } catch (err) {
      console.error("[Monkey] Failed to fetch profile:", err);
      return {};
    }
  }

  async fakeProfileByID(uid: string) {
    try {
      const data = await this.fakeGet(
        `/users/${uid}/profile?isUid=true`,
        profile,
      );
      return data?.data ?? {};
    } catch (err) {
      console.error("[Monkey] Failed to fetch profile:", err);
      return {};
    }
  }

  async getProfileByUsername(username: string) {
    try {
      const data = await this.get(`/users/${username}/profile`);
      console.debug({ data });
      return data?.data ?? {};
    } catch (err) {
      console.error("[Monkey] Failed to fetch profile:", err);
      return {};
    }
  }

  async getTags() {
    try {
      const data = await this.get("/users/tags");
      console.debug({ data });
      return data?.data ?? {};
    } catch (err) {
      console.error("[Monkey] Failed to fetch tags:", err);
      return {};
    }
  }

  async getResults(
    timestamp: number | null = null,
    offset = 0,
  ): Promise<Result[]> {
    const params = new URLSearchParams();
    if (timestamp) params.append("onOrAfterTimestamp", timestamp + "");
    if (offset) params.append("offset", offset + "");

    try {
      const data = await this.get(`/results?${params.toString()}`);
      // console.debug({ data });
      Deno.writeTextFileSync(
        `results_${timestamp}_${offset}.txt`,
        JSON.stringify(data),
      );
      return data?.data ?? [];
    } catch (err) {
      console.error("[Monkey] Failed to fetch results:", err);
      return [];
    }
  }

  async fakeResults(
    timestamp: number | null = null,
    offset = 0,
  ): Promise<Result[]> {
    const params = new URLSearchParams();
    if (timestamp) params.append("onOrAfterTimestamp", timestamp + "");
    if (offset) params.append("offset", offset + "");

    try {
      const data = await this.fakeGet(
        `/results?${params.toString()}`,
        offset === 0 ? lastThousandResults : setpResults,
      );
      return data?.data ?? [];
    } catch (err) {
      console.error("[Monkey] Failed to fetch results:", err);
      return [];
    }
  }

  async getLastResult() {
    try {
      const data = await this.get("/results/last");
      console.debug({ data });
      return data?.data ?? [];
    } catch (err) {
      console.error("[Monkey] Failed to fetch last result:", err);
      return [];
    }
  }

  async fakeLastResult() {
    try {
      const data = await this.fakeGet("/results/last", lastResult);
      return data?.data ?? [];
    } catch (err) {
      console.error("[Monkey] Failed to fetch last result:", err);
      return [];
    }
  }
}

export default new Monkey();
