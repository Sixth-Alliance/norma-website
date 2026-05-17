const extractDeliveryErrorMessage = (error: any): string | null => {
  // First check: ApiError.message (where our backend messages are stored)
  const msg = error?.message || "";
  
  // If error.message contains delivery-related keywords, return it immediately
  // This catches ApiError messages from backend validation errors
  if (
    msg.toLowerCase().includes("delivery") ||
    msg.toLowerCase().includes("distance") ||
    msg.toLowerCase().includes("outside") ||
    msg.toLowerCase().includes("address") ||
    msg.toLowerCase().includes("coordinate") ||
    msg.toLowerCase().includes("dropdown")
  ) {
    return msg;
  }

  // Second check: Axios-style error.response.data (for other HTTP clients)
  const data = error?.response?.data;

  // If backend explicitly says delivery not allowed (structured response)
  if (data?.is_deliverable === false) {
    return (
      data.delivery_area_message ||
      "Delivery address is far from the restaurant. Please choose a closer location."
    );
  }

  // Use the explicit message from the server if available
  if (data?.message) return data.message;
  if (data?.detail) return data.detail;
  if (data?.error) return data.error;

  return null;
};
export default extractDeliveryErrorMessage;