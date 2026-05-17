export async function apiGet(apiUrl: string): Promise<any> {
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Failed to fetch data from external API: ${response.status}`);
    }

    return data;
  } catch (error: any) {
    // Log for diagnostics and rethrow so callers can handle the error
    // Caller code should use try/catch around apiGet/apiPost.
    // eslint-disable-next-line no-console
    console.error("Error fetching external data:", error);
    throw error;
  }
}

export async function apiPost(formData: any, apiUrl: string): Promise<any> {
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Failed to post to external API: ${response.status}`);
    }
    return data;
  } catch (error: any) {
    // Log then rethrow so callers don't get undefined
    // eslint-disable-next-line no-console
    console.error("Error posting external data:", error);
    throw error;
  }
}

export default { apiGet, apiPost };
