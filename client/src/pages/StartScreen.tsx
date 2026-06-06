import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuthItem } from "../utils/authStorage";
import { HomePage } from "./marketing/HomePage";

export function StartScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = getAuthItem("token");
    if (token) {
      navigate("/lobby", { replace: true });
    }
  }, [navigate]);

  return <HomePage />;
}
