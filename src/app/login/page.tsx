"use client";

import { useRouter } from "next/navigation";
import { LoginComponent } from "@/components/Login"; // Adjust path as needed

export default function LoginPage() {
  const router = useRouter();

  // Define what happens on a successful login: redirect to the dashboard.
  const handleLoginSuccess = () => {
    router.push("/marketplace");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <LoginComponent onLoginSuccess={handleLoginSuccess} />
    </main>
  );
}
