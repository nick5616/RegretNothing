export default function useAuth() {
  const signInWithCredentials = async ({
    email,
    password,
    callbackUrl = "/",
    redirect = false,
  }) => {
    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);
      formData.append("callbackUrl", callbackUrl);

      const response = await fetch("/api/auth/signin/credentials", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("CredentialsSignin");
      }

      if (redirect) {
        window.location.href = callbackUrl;
      }

      return response;
    } catch (error) {
      throw error;
    }
  };

  const signUpWithCredentials = async ({
    email,
    password,
    callbackUrl = "/",
    redirect = false,
  }) => {
    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);
      formData.append("callbackUrl", callbackUrl);

      const response = await fetch("/api/auth/signup/credentials", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "EmailCreateAccount");
      }

      if (redirect) {
        window.location.href = callbackUrl;
      }

      return response;
    } catch (error) {
      throw error;
    }
  };

  const signOut = async ({ callbackUrl = "/", redirect = false }) => {
    try {
      const response = await fetch("/api/auth/signout", {
        method: "POST",
        credentials: "include",
      });

      if (redirect) {
        window.location.href = callbackUrl;
      }

      return response;
    } catch (error) {
      throw error;
    }
  };

  return {
    signInWithCredentials,
    signUpWithCredentials,
    signOut,
  };
}
