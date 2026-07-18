export const getErrorMessage = (error, fallback = 'Something went wrong') => error?.response?.data?.message || error?.message || fallback;
