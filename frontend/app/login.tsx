import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLogin } from "../hooks/auth/useLogin";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const { handleLogin, isLoading, error } = useLogin();

  const inputStyle = (field: string, extra?: object) => [
    styles.input,
    extra,
    focusedField === field && styles.inputFocused,
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Logo */}
      <View style={styles.logoRow}>
        <View style={styles.logoIcon}>
          <Text style={styles.logoIconText}>VG</Text>
        </View>
        <Text style={styles.logoText}>VitalGoal</Text>
      </View>

      <Text style={styles.title}>Bem-vindo de volta! 👋</Text>
      <Text style={styles.subtitle}>Faça login para continuar.</Text>

      {/* Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Login</Text>

        <Text style={styles.label}>E-mail</Text>
        <TextInput
          placeholder="seu@email.com"
          value={email}
          onChangeText={setEmail}
          style={inputStyle("email")}
          onFocus={() => setFocusedField("email")}
          onBlur={() => setFocusedField(null)}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor="#94a3b8"
        />

        <Text style={styles.label}>Senha</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            placeholder="••••••••"
            value={senha}
            onChangeText={setSenha}
            secureTextEntry={!senhaVisivel}
            style={inputStyle("senha", styles.inputWithToggle)}
            onFocus={() => setFocusedField("senha")}
            onBlur={() => setFocusedField(null)}
            placeholderTextColor="#94a3b8"
          />
          <Pressable
            style={styles.eyeBtn}
            onPress={() => setSenhaVisivel((v) => !v)}
          >
            <Text style={styles.eyeText}>
              {senhaVisivel ? "Ocultar" : "Mostrar"}
            </Text>
          </Pressable>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Pressable>
          <Text style={styles.forgot}>Esqueceu a senha?</Text>
        </Pressable>

        <Pressable
          testID="login-button"
          style={({ pressed }) => [
            styles.button,
            pressed && { opacity: 0.85 },
            isLoading && styles.buttonDisabled,
          ]}
          onPress={() => handleLogin(email, senha)}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Entrar</Text>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.7 }]}
          onPress={() => router.push("/register")}
        >
          <Text style={styles.linkText}>
            Ainda não tem uma conta?{" "}
            <Text style={styles.linkBold}>Criar conta</Text>
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    position: "absolute",
    top: 52,
    left: 24,
    gap: 8,
  },

  logoIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#19c10f",
    alignItems: "center",
    justifyContent: "center",
  },

  logoIconText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
  },

  logoText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },

  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 6,
    textAlign: "center",
  },

  subtitle: {
    fontSize: 15,
    color: "#64748b",
    marginBottom: 28,
    textAlign: "center",
  },

  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    padding: 28,
    borderRadius: 20,
    shadowColor: "#64748b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 4,
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 20,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
    marginTop: 14,
  },

  input: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    padding: 14,
    borderRadius: 12,
    fontSize: 15,
    color: "#0f172a",
  },

  inputFocused: {
    borderColor: "#19c10f",
    backgroundColor: "#fff",
  },

  inputWrapper: {
    position: "relative",
  },

  inputWithToggle: {
    paddingRight: 80,
  },

  eyeBtn: {
    position: "absolute",
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },

  eyeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },

  errorBox: {
    marginTop: 12,
    backgroundColor: "#fef2f2",
    borderLeftWidth: 3,
    borderLeftColor: "#ef4444",
    padding: 12,
    borderRadius: 8,
  },

  errorText: {
    color: "#ef4444",
    fontSize: 13,
    fontWeight: "500",
  },

  forgot: {
    marginTop: 10,
    marginBottom: 4,
    color: "#19c10f",
    fontSize: 13,
    fontWeight: "500",
    textAlign: "right",
  },

  button: {
    backgroundColor: "#19c10f",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 18,
    shadowColor: "#19c10f",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  buttonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.3,
  },

  linkRow: {
    marginTop: 18,
    alignItems: "center",
  },

  linkText: {
    fontSize: 14,
    color: "#64748b",
  },

  linkBold: {
    color: "#19c10f",
    fontWeight: "700",
  },
});
