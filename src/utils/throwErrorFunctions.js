// THROW ERROR MESSAGE ON LOGIN ERROR
export const extractAndThrowLoginError = (response) => {
  // Check if the response contains the error object
  if (response.error.validation) {
    const validationError = response.error.validation;
    const errorMessages = [];

    if (validationError.message) {
      errorMessages.push(validationError.message);
    }
    // If there are any error messages, concatenate them and throw a new error
    if (errorMessages.length > 0) {
      throw new Error(errorMessages.join(" "));
    }
  }

  // If no specific error properties are found, throw a generic error
  throw new Error(response.msg || "An unknown error occurred!");
};

// THROW ERROR MESSAGE ON VERIFY OTP ERROR
export const extractAndThrowVerifyOTPError = (response) => {
  // Check if the response contains the error object
  if (response.error) {
    const validationError = response.error;
    const errorMessages = [];

    // Check for specific error properties and extract their messages
    if (validationError.message) {
      errorMessages.push(validationError.message);
    }

    // If there are any error messages, concatenate them and throw a new error
    if (errorMessages.length > 0) {
      throw new Error(errorMessages.join(" "));
    }
  }

  // If no specific error properties are found, throw a generic error
  throw new Error(response.msg || "An unknown error occurred");
};
