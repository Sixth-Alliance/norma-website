import { toast } from "react-toastify";

export const showSimpleToast = (message, response) => {
  if (response === "success") {
    toast.success(message, {
      position: "top-center",
      autoClose: 2000, // Reduced from 4000ms to 2000ms
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: false, // Don't pause on hover to keep them brief
      draggable: true,
      progress: undefined,
      theme: "colored",
    });
  } else if (response === "failed") {
    toast.error(message, {
      position: "top-center",
      autoClose: 3000, // Increased from 2000ms to 3000ms for errors
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "colored",
    });
  } else if (response === "info") {
    toast.info(message, {
      position: "top-center",
      autoClose: 2000,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: false,
      draggable: true,
      progress: undefined,
      theme: "colored",
    });
  }
};
