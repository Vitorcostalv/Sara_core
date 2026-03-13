export async function apiGet(endpoint) {
    const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3333/api/v1";
    const response = await fetch(`${baseUrl}${endpoint}`);
    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }
    return (await response.json());
}
