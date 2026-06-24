import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import { useEffect, useRef } from "react";
import { useDocumentosConsulta, type DocumentoResponse } from "../../../hooks/useDocumentosConsulta";
import { VGTheme } from "../../../constants/theme";
import { useToast } from "../../../hooks/useToast";

export default function DocumentosScreen() {
  const { consultaId } = useLocalSearchParams<{ consultaId: string }>();
  const id = Number(consultaId);

  const {
    documents,
    isLoading,
    error,
    isUploading,
    uploadError,
    fetchDocuments,
    pickAndUpload,
  } = useDocumentosConsulta(id);

  const { showToast } = useToast();
  const prevIsUploading = useRef(false);

  useEffect(() => {
    if (uploadError) {
      showToast("error", "Falha ao enviar o documento. Tente novamente.");
    }
  }, [uploadError]);

  useEffect(() => {
    if (prevIsUploading.current && !isUploading && !uploadError) {
      showToast("success", "Documento enviado com sucesso.");
    }
    prevIsUploading.current = isUploading;
  }, [isUploading, uploadError]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          testID="loading-indicator"
          size="large"
          color={VGTheme.colors.primary}
        />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={fetchDocuments}>
          <Text style={styles.retryText}>Tentar novamente</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {documents.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Nenhum documento anexado ainda.</Text>
        </View>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(item: DocumentoResponse) => String(item.id)}
          renderItem={({ item }: { item: DocumentoResponse }) => (
            <View style={styles.docItem}>
              <Pressable onPress={() =>
                Platform.OS === "web"
                  ? window.open(item.url, "_blank")
                  : Linking.openURL(item.url)
              }>
                <Text style={styles.docName}>{item.nomeArquivo}</Text>
              </Pressable>
              <Text style={styles.docDate}>
                {new Date(item.criadoEm).toLocaleDateString()}
              </Text>
            </View>
          )}
        />
      )}

      <Pressable
        testID="upload-button"
        style={[styles.uploadButton, isUploading && styles.uploadButtonDisabled]}
        onPress={pickAndUpload}
        disabled={isUploading}
        accessibilityState={{ disabled: isUploading }}
      >
        {isUploading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.uploadButtonText}>Enviar documento</Text>
        )}
      </Pressable>

      {uploadError ? (
        <Text style={styles.uploadErrorText}>{uploadError}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: VGTheme.colors.background,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: VGTheme.colors.background,
  },
  errorText: {
    color: VGTheme.colors.error,
    fontSize: 16,
    marginBottom: 16,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: VGTheme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: VGTheme.radius.md,
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: VGTheme.colors.textTertiary,
    fontSize: 15,
  },
  docItem: {
    backgroundColor: VGTheme.colors.surface,
    padding: 16,
    borderRadius: VGTheme.radius.md,
    marginBottom: 10,
    ...VGTheme.shadow.card,
  },
  docName: {
    fontSize: 15,
    fontWeight: "600",
    color: VGTheme.colors.primary,
    marginBottom: 4,
  },
  docDate: {
    fontSize: 12,
    color: VGTheme.colors.textTertiary,
  },
  uploadButton: {
    backgroundColor: VGTheme.colors.primary,
    padding: 14,
    borderRadius: VGTheme.radius.md,
    alignItems: "center",
    marginTop: 16,
    ...VGTheme.shadow.button,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  uploadErrorText: {
    color: VGTheme.colors.error,
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
  },
});
