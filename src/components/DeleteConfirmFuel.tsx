import React from "react";
import {
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

type Props = {
  // 🔹 Delete Client Modal Props
  deleteClientVisible: boolean;
  setDeleteClientVisible: (v: boolean) => void;
  clients: string[];
  setConfirmDeleteClient: (v: string | null) => void;
  confirmDeleteClient: string | null;
  saveClients: (c: string[]) => Promise<void>;

  // 🔹 Fuel-Cost Modal Props
  fuelCostModalVisible: boolean;
  setFuelCostModalVisible: (v: boolean) => void;
  newFuelCost: string;
  setNewFuelCost: (v: string) => void;
  handleSaveFuelCost: () => void;

  // 🔹 Styles from parent
  styles: any;
};

export default function DeleteConfirmFuel({
  deleteClientVisible,
  setDeleteClientVisible,
  clients,
  setConfirmDeleteClient,
  confirmDeleteClient,
  saveClients,
  fuelCostModalVisible,
  setFuelCostModalVisible,
  newFuelCost,
  setNewFuelCost,
  handleSaveFuelCost,
  styles,
}: Props) {
  return (
    <>
      {/* === Delete Client Modal === */}
      <Modal visible={deleteClientVisible} transparent animationType="fade">
        <View style={styles.centeredModalBackground}>
          <View style={[styles.centeredModal, { width: "85%", maxHeight: "70%" }]}>
            <Text style={styles.modalHeading}>Delete Client</Text>

            <ScrollView style={{ width: "100%" }}>
              {clients.length === 0 ? (
                <Text style={{ textAlign: "center", color: "#777", marginVertical: 10 }}>
                  No clients available
                </Text>
              ) : (
                clients.map((c, index) => (
                  <TouchableOpacity
                    key={index}
                    style={{
                      padding: 12,
                      borderBottomWidth: 1,
                      borderColor: "#ddd",
                      width: "100%",
                    }}
                    onPress={() => setConfirmDeleteClient(c)}
                  >
                    <Text style={{ fontSize: 16 }}>{c}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.optionButton, { backgroundColor: "#9e9e9e" }]}
              onPress={() => setDeleteClientVisible(false)}
            >
              <Text style={styles.optionButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* === Confirm Delete Modal === */}
      <Modal visible={!!confirmDeleteClient} transparent animationType="fade">
        <View style={styles.centeredModalBackground}>
          <View style={styles.centeredModal}>
            <Text style={[styles.modalHeading, { fontSize: 18 }]}>
              Do you want to delete "{confirmDeleteClient}"?
            </Text>

            <View style={{ flexDirection: "row", marginTop: 20 }}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: "#4caf50" }]}
                onPress={() => {
                  const updated = clients.filter((c) => c !== confirmDeleteClient);
                  saveClients(updated);
                  setConfirmDeleteClient(null);
                }}
              >
                <Text style={styles.actionButtonText}>Yes</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: "#f44336" }]}
                onPress={() => setConfirmDeleteClient(null)}
              >
                <Text style={styles.actionButtonText}>No</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- Add Fuel-Cost Modal --- */}
      <Modal
        visible={fuelCostModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFuelCostModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Add Fuel-Cost (per km)</Text>

            <TextInput
              style={styles.modalInput}
              keyboardType="decimal-pad"
              placeholder="Enter cost per km"
              placeholderTextColor="#888"
              value={newFuelCost}
              onChangeText={(text) => {
                const valid = text.replace(/[^0-9.]/g, "");
                setNewFuelCost(valid);
              }}
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={styles.modalButton} onPress={handleSaveFuelCost}>
                <Text style={styles.modalButtonText}>Done</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => setFuelCostModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
