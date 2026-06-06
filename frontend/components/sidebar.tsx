import { router, usePathname } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../hooks/auth/useAuth";
import { useModal } from "../hooks/useModal";
import { useToast } from "../hooks/useToast";

const NAV_ITEMS = [
  { label: "Início", icon: "🏠", route: "/(app)/inicio", key: "inicio" },
  { label: "Anamnese", icon: "🧾", route: "/(app)/anamnese", key: "anamnese" },
  {
    label: "Consultas",
    icon: "📅",
    route: "/(app)/consultas",
    key: "consultas",
  },
  {
    label: "Protocolos",
    icon: "📊",
    route: "/(app)/protocolos",
    key: "protocolos",
  },
  { label: "Perfil", icon: "👤", route: "/(app)/perfil", key: "perfil" },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { setOpenModal } = useModal();
  const { showToast } = useToast();

  async function handleLogout() {
    await logout();
    showToast("success", "Você saiu da sua conta.");
    router.replace("/login");
  }

  function isActive(key: string) {
    return pathname.includes(key);
  }

  return (
    <View style={styles.sidebar}>
      {/* Logo */}
      <View style={styles.logoRow}>
        <View style={styles.logoIcon}>
          <Text style={styles.logoIconText}>VG</Text>
        </View>
        <Text style={styles.logoText}>VitalGoal</Text>
      </View>

      <View style={styles.divider} />

      {/* Nav */}
      <View style={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.key);
          return (
            <Pressable
              key={item.key}
              style={({ pressed }) => [
                styles.navItem,
                active && styles.navItemActive,
                !active && pressed && styles.navItemPressed,
              ]}
              onPress={() => router.push(item.route)}
            >
              <Text style={styles.navIcon}>{item.icon}</Text>
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flex: 1 }} />

      {/* Agendar */}
      <Pressable
        style={({ pressed }) => [
          styles.scheduleBtn,
          pressed && { opacity: 0.85 },
        ]}
        onPress={() => setOpenModal(true)}
      >
        <Text style={styles.scheduleBtnText}>＋ Agendar Consulta</Text>
      </Pressable>

      {/* Logout */}
      <Pressable
        style={({ pressed }) => [
          styles.logoutBtn,
          pressed && { opacity: 0.75 },
        ]}
        onPress={handleLogout}
      >
        <Text style={styles.logoutBtnText}>↩ Sair</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 230,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 24,
    height: "100%",
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
  },

  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 4,
    marginBottom: 16,
  },

  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#19c10f",
    alignItems: "center",
    justifyContent: "center",
  },

  logoIconText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },

  logoText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
  },

  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginBottom: 12,
  },

  nav: {
    gap: 2,
  },

  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
  },

  navItemActive: {
    backgroundColor: "#f0fdf0",
  },

  navItemPressed: {
    backgroundColor: "#f8fafc",
  },

  navIcon: {
    fontSize: 16,
  },

  navLabel: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "500",
  },

  navLabelActive: {
    color: "#19c10f",
    fontWeight: "700",
  },

  scheduleBtn: {
    backgroundColor: "#19c10f",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#19c10f",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },

  scheduleBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },

  logoutBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },

  logoutBtnText: {
    color: "#64748b",
    fontWeight: "600",
    fontSize: 13,
  },
});
