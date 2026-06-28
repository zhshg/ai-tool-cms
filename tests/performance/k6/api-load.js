import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 50 },
    { duration: "1m", target: 100 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"],
    http_req_failed: ["rate<0.001"],
  },
};

const BASE = __ENV.API_URL || "http://localhost:4000";
const API_KEY = __ENV.API_KEY || "";

export default function () {
  const headers = API_KEY ? { "X-Api-Key": API_KEY } : {};
  const health = http.get(`${BASE}/v1/health/live`, { headers });
  check(health, { "health live": (r) => r.status === 200 });

  if (API_KEY) {
    const tools = http.get(`${BASE}/v1/api/v1/tools?limit=10`, { headers });
    check(tools, { "public tools": (r) => r.status === 200 });
  }

  sleep(0.1);
}
