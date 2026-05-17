
export const apiGet = async (apiUrl) => {
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        `Failed to fetch data from external API: ${response.status}`
      );
    }

  // console.log(data);
    return data;
  } catch (error) {
    console.error("Error fetching external data:", error);
  }
};

export const apiPost = async (formData, apiUrl) => {
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
      throw new Error("Failed to fetch external data");
    }
    return data;
  } catch (error) {
    console.error("Error fetching external data:", error);
  }
};
