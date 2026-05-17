import { toast } from "react-toastify";

export type ToastKind = "success" | "failed" | "info" | "error" | "warning";

export function showSimpleToast(message: string, response?: ToastKind) {
  // Backward-compat: treat 'error' as 'failed'
  const kind = response === 'error' ? 'failed' : response;

  if (kind === "success") {
    toast.success(message, {
      position: "top-center",
      autoClose: 2000,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: false,
      draggable: true,
      progress: undefined,
      theme: "colored",
    });
    return;
  }

  if (kind === "failed") {
    toast.error(message, {
      position: "top-center",
      autoClose: 3000,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "colored",
    });
    return;
  }

  if (kind === "warning") {
    toast.warn(message, {
      position: "top-center",
      autoClose: 3000,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "colored",
    });
    return;
  }

  if (kind === "info") {
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
    return;
  }

  // Default to an info toast when response type is omitted
  toast.info(message, {
    position: "top-center",
    autoClose: 2000,
  });
}

export default { showSimpleToast };
