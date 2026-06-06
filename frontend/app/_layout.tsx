import { Stack } from "expo-router";
import { AuthProvider } from "../hooks/auth/AuthContext";
import { ModalProvider } from "../hooks/ModalContext";
import { ToastProvider } from "../hooks/ToastContext";
import { ToastContainer } from "../components/ToastContainer";

export default function Layout() {
  return (
    <AuthProvider>
      <ModalProvider>
        <ToastProvider>
          <Stack screenOptions={{ headerShown: false }} />
          <ToastContainer />
        </ToastProvider>
      </ModalProvider>
    </AuthProvider>
  );
}
