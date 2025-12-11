//This is CopyManageAdd.tsx
import EngineerManager from "../components/EngineerManager"; // adjust path if needed

import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

/**
 * Props coming from index.tsx
 */
interface CopyToAddProps {
  // --- State & setters for Copy Confirmation Modal ---
  copyModalVisible: boolean;
  setCopyModalVisible: (visible: boolean) => void;
  selectedCopyIndex: number | null;
  setSelectedCopyIndex: (index: number | null) => void;

  // --- Data + save handler for copying ---
  expenses: any[];
  saveExpenses: (updated: any[]) => Promise<void>;

  // --- Client Management ---
  clientModalVisible: boolean;
  setClientModalVisible: (visible: boolean) => void;
  addClientVisible: boolean;
  setAddClientVisible: (visible: boolean) => void;
  deleteClientVisible: boolean;
  setDeleteClientVisible: (visible: boolean) => void;

  fuelCostModalVisible: boolean;
  setFuelCostModalVisible: (visible: boolean) => void;

  newClientName: string;
  setNewClientName: (name: string) => void;
  clients: string[];
  saveClients: (updated: string[]) => void;
  onEngineersUpdated: (list: string[]) => void;
}

/**
 * 🧩 Combined Modal Component extracted from index.tsx
 */
const CopyToAdd: React.FC<CopyToAddProps> = ({
  copyModalVisible,
  setCopyModalVisible,
  selectedCopyIndex,
  setSelectedCopyIndex,
  expenses,
  saveExpenses,
  clientModalVisible,
  setClientModalVisible,
  addClientVisible,
  setAddClientVisible,
  deleteClientVisible,
  setDeleteClientVisible,
  fuelCostModalVisible,
  setFuelCostModalVisible,
  newClientName,
  setNewClientName,
  clients,
  saveClients,
  onEngineersUpdated,
}) => {

  const [clientManagementVisible, setClientManagementVisible] = React.useState(false);
  const [engineerManagementVisible, setEngineerManagementVisible] = React.useState(false);

  return (
    <>
      {/* === Copy Confirmation Modal === */}
      <Modal visible={copyModalVisible} transparent animationType="fade">
        <View style={styles.modalBackground}>
          <View
            style={[styles.bottomModal, { padding: 20, paddingBottom: 70, alignItems: "center" }]}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                marginBottom: 20,
                textAlign: "center",
              }}
            >
              Do you want to copy this Data Row?
            </Text>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: "#4caf50" }]}
                onPress={async () => {
                  if (selectedCopyIndex !== null) {
                    const rowToCopy = expenses[selectedCopyIndex];
                    const updated = [...expenses];
                    updated.splice(selectedCopyIndex + 1, 0, { ...rowToCopy });
                    await saveExpenses(updated);
                  }
                  setCopyModalVisible(false);
                  setSelectedCopyIndex(null);
                }}
              >
                <Text style={styles.actionButtonText}>Yes</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: "#f44336" }]}
                onPress={() => {
                  setCopyModalVisible(false);
                  setSelectedCopyIndex(null);
                }}
              >
                <Text style={styles.actionButtonText}>No</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* === Manage Clients Modal === */}
      <Modal visible={clientModalVisible} transparent animationType="fade">
        <View style={styles.centeredModalBackground}>
          <View style={styles.centeredModal}>
            <Text style={styles.modalHeading}>Manage Clients</Text>

            {/* 🔹 New Client Management Button */}
            <TouchableOpacity
              style={[styles.optionButton, { backgroundColor: "#3f51b5" }]}
              onPress={() => {
                setClientModalVisible(false);
                setClientManagementVisible(true);
              }}
            >
              <Text style={styles.optionButtonText}>Manage Clients</Text>
            </TouchableOpacity>

            {/* 🔹 New Engineers Button */}
            <TouchableOpacity
              style={[styles.optionButton, { backgroundColor: "#3f51b5" }]}
              onPress={() => {
                setClientModalVisible(false);
                setEngineerManagementVisible(true);
              }}
            >
              <Text style={styles.optionButtonText}>Manage Engineers</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, { backgroundColor: "#1f43a7ff" }]}
              onPress={() => setFuelCostModalVisible(true)}
            >
              <Text style={styles.optionButtonText}>Add Fuel-Cost</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, { backgroundColor: "#607D8B" }]}
              onPress={() => setClientModalVisible(false)}
            >
              <Text style={styles.optionButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* === New Client Management Modal === */}
      <Modal visible={clientManagementVisible} transparent animationType="fade">
        <View style={styles.centeredModalBackground}>
          <View style={[styles.centeredModal, { width: "80%" }]}>
            <Text style={styles.modalHeading}>Client Management</Text>

            <TouchableOpacity
              style={[styles.optionButton, { backgroundColor: "#4caf50" }]}
              onPress={() => {
                setClientManagementVisible(false);
                setAddClientVisible(true);
              }}
            >
              <Text style={styles.optionButtonText}>Add Client</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, { backgroundColor: "#f44336" }]}
              onPress={() => {
                setClientManagementVisible(false);
                setDeleteClientVisible(true);
              }}
            >
              <Text style={styles.optionButtonText}>Delete Client</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, { backgroundColor: "#607D8B" }]}
              onPress={() => {
                setClientManagementVisible(false);
                setClientModalVisible(true);
              }}
            >
              <Text style={styles.optionButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* === Engineers Management (new component) === */}
      <EngineerManager
        visible={engineerManagementVisible}
        onClose={() => setEngineerManagementVisible(false)}
        onEngineersUpdated={onEngineersUpdated}
      />

      {/* === Add Client Modal === */}
      <Modal visible={addClientVisible} transparent animationType="fade">
        <View style={styles.centeredModalBackground}>
          <View style={[styles.centeredModal, { width: "85%" }]}>
            <Text style={styles.modalHeading}>Add New Client</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Enter client name"
              placeholderTextColor="#888"
              value={newClientName}
              onChangeText={setNewClientName}
            />

            <View style={{ flexDirection: "row", marginTop: 20 }}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: "#4caf50" }]}
                onPress={() => {
                  if (newClientName.trim().length === 0)
                    return alert("Enter a valid name!");
                  const updated = [...clients, newClientName.trim()];
                  saveClients(updated);
                  setNewClientName("");
                  setAddClientVisible(false);
                }}
              >
                <Text style={styles.actionButtonText}>Enter</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: "#f44336" }]}
                onPress={() => {
                  setNewClientName("");
                  setAddClientVisible(false);
                }}
              >
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default CopyToAdd;

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  bottomModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  centeredModalBackground: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  centeredModal: {
    backgroundColor: "#fff",
    borderRadius: 12,
    width: "80%",
    padding: 20,
    elevation: 6,
  },
  modalHeading: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
  },
  optionButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginVertical: 6,
  },
  optionButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: "#000",
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginHorizontal: 5,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
