import { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Notification from '@/utils/Notification.js';
import userService from '@/components/users/userService.js';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Kullanıcı bilgisini almak için kullanılan fonksiyon
  const getUser = async (token) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/auth/login/success`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      if (response.status === 200) {
        const resObject = await response.json();
        console.log('Fetched User:', resObject.user); // Log the fetched user
        setUser({
          ...resObject.user,
          role: resObject.user.role,
          role_id: resObject.user.role_id
        });
        Notification.success("Successfully logged in!");
      } else {
        throw new Error("Authentication has failed!");
      }
    } catch (err) {
      console.error("Authentication error:", err);
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      setUser(null);
      Notification.error("Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  // Token'ları URL'den alıp localStorage'a kaydetmek ve kullanıcıyı yönlendirmek
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      getUser(token);
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const token = queryParams.get("token");
    const refreshToken = queryParams.get("refreshToken");

    if (token && refreshToken) {
      // Token'ları localStorage'a kaydet
      localStorage.setItem("token", token);
      localStorage.setItem("refreshToken", refreshToken);

      // Kullanıcı bilgilerini al ve ardından anasayfaya yönlendir
      getUser(token); // Kullanıcı bilgilerini doğrula
      navigate("/"); // Yönlendirme yap
    }
  }, [navigate]);

  const login = async (token, refreshToken) => {
    try {
      localStorage.setItem("token", token);
      localStorage.setItem("refreshToken", refreshToken);
      const userData = await userService.getCurrentUser();
      setUser(userData);
      Notification.success("Successfully logged in!");
    } catch (err) {
      console.error("Authentication error:", err);
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      setUser(null);
      Notification.error("Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = () => {
    window.open(`${import.meta.env.VITE_SERVER_URL}/auth/google`, "_self");
  };

  const logout = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/auth/logout`, {
        method: "GET",
        credentials: "include",
      });
      if (response.ok) {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        setUser(null); // Kullanıcıyı null yaparak oturumu sonlandır
        navigate("/");
        Notification.success("Başarıyla çıkış yapıldı.");
      }
    } catch (error) {
      console.error("Logout error:", error);
      Notification.error("Çıkış yaparken bir hata oluştu.");
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, googleLogin, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
