import { ENDPOINTS } from "../config";

export interface BackendHealth {
  status: string;
  message: string;
}

export async function checkBackend(): Promise<BackendHealth> {
  const response = await fetch(ENDPOINTS.health);

  if (!response.ok) {
    throw new Error(`Backend returned ${response.status}`);
  }

  return response.json();
}