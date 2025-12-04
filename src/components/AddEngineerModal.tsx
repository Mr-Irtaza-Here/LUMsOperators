//This is my AddEngineerModal.tsx
// src/components/AddEngineerModal.tsx
import React, { useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { addEngineerToDB, getAllEngineers } from "../utils/LocalDB";
import { syncEngineersToCloud } from "../utils/SyncManager";

interface AddEngineerModalProps {
  visible: boolean;
  onClose: () => void;
  onAdded: (updatedList: string[]) => void;
}

const AddEngineerModal: React.FC<AddEngineerModalProps> = ({
  visible,
  onClose,
  onAdded,
}) => {
  const [name, setName] = useState("");

const handleAdd = async () => {
  const trimmed = name.trim();
  if (!trimmed) {
    console.log("Name is empty, nothing to add");
    return;
  }

  try {
    console.log("Adding engineer locally:", trimmed);

    // 1️⃣ Save to SQLite (LocalDB)
    addEngineerToDB(trimmed, { synced: false });

    // 2️⃣ Refresh local list
    const updatedList = getAllEngineers();
    console.log("Updated local engineers list:", updatedList);

    // 3️⃣ Sync with Firestore
    await syncEngineersToCloud();
    console.log("Sync to Firestore done");

    // 4️⃣ Reset and close
    setName("");
    onAdded(updatedList);
    onClose();
  } catch (err) {
    console.error("Failed to add engineer:", err);
  }
};

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.heading}>Add New Engineer</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter Engineer Name"
            value={name}
            onChangeText={setName}
          />

          <View style={styles.row}>
            <TouchableOpacity style={styles.btn} onPress={handleAdd}>
              <Text style={styles.btnText}>Enter</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: "#777" }]}
              onPress={onClose}
            >
              <Text style={styles.btnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  box: {
    width: "80%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
  },
  heading: { fontSize: 18, fontWeight: "700", marginBottom: 15 },
  input: {
    borderWidth: 1,
    borderColor: "#aaa",
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  btn: {
    flex: 1,
    marginHorizontal: 5,
    backgroundColor: "#4CAF50",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700" },
});

export default AddEngineerModal;
