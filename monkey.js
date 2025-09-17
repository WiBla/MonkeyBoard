import { API } from "./app.js";

class Monkey {
  constructor() {
    this.API_URL = "https://api.monkeytype.com";
    this.headers = undefined;
  }

  /**
   * Set the API key for authentication.
   * Token must be in the expected Base64-like format.
   * @param {string} token - Raw token string.
   */
  setToken(token) {
    const tokenPattern = /^[A-Za-z0-9\-_]{76}$/;

    if (typeof token !== "string" || !tokenPattern.test(token))
      throw new Error("[Monkey] Invalid token format.");

    this.headers = { Authorization: `ApeKey ${token}` };
    console.log("[Monkey] API key set");
  }

  /**
   * Delete the stored API key.
   */
  deleteToken() {
    this.headers = undefined;
    console.log("[Monkey] API key deleted");
  }

  /**
   * Verifies that the ApeKey is valid / active
   * @returns {boolean}
   */
  async isKeyValid() {
    if (!this.headers) {
      console.error("[Monkey] No API token set. Use setToken() first.");
      return false;
    }

    try {
      const res = await API.get(this.API_URL + "/psas", {
        headers: this.headers,
      });

      // TODO mettre à jour la BDD en fonction du résultat
      if (res.status === 200) return true;
      if (res.status === 471)
        console.error(
          "[Monkey] ApeKey is inactive",
          this.headers.Authorization,
        );

      return false;
    } catch (err) {
      console.error("[Monkey] Request error:", err.message);
      return false;
    }
  }

  /**
   * Perform a GET request with proper error handling.
   * @param {string} path - API path to fetch.
   */
  async get(path) {
    if (!this.headers) {
      console.error("[Monkey] No API token set. Use setToken() first.");
      throw new Error("Unauthorized: API token not set");
    }

    try {
      const res = await API.get(this.API_URL + path, { headers: this.headers });
      return res.data;
    } catch (err) {
      console.error("[Monkey] Request error:", err.message);
      throw err;
    }
  }

  /**
   * Fetch user profile by UID
   */
  async getProfileByID(uid) {
    try {
      const data = await this.get(`/users/${uid}/profile?isUid=true`);
      console.debug({ data });
      return data?.data ?? {};
    } catch (err) {
      console.error("[Monkey] Failed to fetch profile:", err.message);
      return {};
    }
  }

  /**
   * Fetch user profile by username
   */
  async getProfileByUsername(username) {
    try {
      const data = await this.get(`/users/${username}/profile`);
      console.debug({ data });
      return data?.data ?? {};
    } catch (err) {
      console.error("[Monkey] Failed to fetch profile:", err.message);
      return {};
    }
  }

  /**
   * Fetch user tags.
   */
  async getTags() {
    try {
      const data = await this.get("/users/tags");
      console.debug({ data });
      return data?.data ?? {};
    } catch (err) {
      console.error("[Monkey] Failed to fetch tags:", err.message);
      return {};
    }
  }

  /**
   * Fetch results after a given timestamp.
   * @param {number|null} timestamp - Unix timestamp in ms. If null, fetches up to 1000 results.
   */
  async getResults(timestamp = null, offset = 0) {
    const params = new URLSearchParams();
    if (timestamp) params.append("onOrAfterTimestamp", timestamp + 1);
    if (offset) params.append("offset", offset);

    try {
      const data = await this.get(`/results?${params.toString()}`);
      // console.debug({ data });
      return data?.data ?? [];
    } catch (err) {
      console.error("[Monkey] Failed to fetch results:", err.message);
      return [];
    }
  }

  /**
   * Fetch the last available result.
   */
  async getLastResult() {
    try {
      const data = await this.get("/results/last");
      // console.debug({ data });
      return data?.data ?? [];
    } catch (err) {
      console.error("[Monkey] Failed to fetch last result:", err.message);
      return [];
    }
  }
}

export default new Monkey();
