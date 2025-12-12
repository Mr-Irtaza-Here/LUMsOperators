// src/EngineerManager.tsx
import NetInfo from "@react-native-community/netinfo";
import { collection, getDocs } from "firebase/firestore";
import {
  addEngineerToDB,
  getAllEngineers,
  markEngineerAsDeleted,
  syncEngineersToCloud,
} from "../EngineersDatabase";
import { db as engDB, ensureSignedIn as engEnsureSignedIn } from "../EngineersDatabase/firebase";

import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// -----------------------------
// FETCH ENGINEERS FROM FIREBASE
// -----------------------------
const fetchEngineersFromFirebase = async (): Promise<string[]> => {
  try {
    // Use the engineers-dedicated Firebase project to read the collection
    await engEnsureSignedIn();
    const snapshot = await getDocs(collection(engDB, "engineers"));
    return snapshot.docs
      .map(d => {
        const data: any = d.data();
        // Respect remote deletion flag: skip docs explicitly marked deleted === 1
        const deletedFlag = data?.deleted;
        if (deletedFlag === 1 || deletedFlag === true) return null;
        return (data.engName || data.name || "").toString();
      })
      .filter((name: string | null) => typeof name === "string" && name.trim() !== "") as string[];
  } catch (err) {
    console.warn("Failed to fetch engineers from Engineers Firebase:", err);
    return [];
  }
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onEngineersUpdated: (list: string[]) => void;
  initialEngineers?: string[];
};

const EngineerManager: React.FC<Props> = ({ visible, onClose, onEngineersUpdated, initialEngineers }) => {
  const [engineers, setEngineers] = useState<string[]>([]);
  const [addVisible, setAddVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (visible) loadEngineers();
  }, [visible]);

  useEffect(() => {
    // Only run interval when component is visible to reduce load
    if (!visible) return;

    const interval = setInterval(async () => {
      const state = await NetInfo.fetch();
      if (state.isConnected) {
        try {
          await syncEngineersToCloud();
          console.log("✅ Engineers synced (online)");
        } catch (err) {
          console.warn("Sync failed:", err);
        }
      } else {
        console.log("Offline, skipping sync");
      }
    }, 30000); // Increased from 5s to 30s to reduce load

    return () => clearInterval(interval);
  }, [visible]);

  // ---------- LOAD ENGINEERS ----------
  const loadEngineers = async () => {
    // 1. Load from local SQLite DB
    const localObjects = await getAllEngineers();
    const localList = localObjects
      .map(e => e.engName)
      .filter(name => name && name.trim() !== "");

    const dedupeNames = (arr: string[]) =>
      Array.from(
        new Map(arr.map((n) => [n.trim().toLowerCase(), n.trim()])).values()
      );

    let merged = [...localList];

    try {
      // 2. Fetch from Firebase
      const firebaseList = await fetchEngineersFromFirebase();
      // 3. Filter out names that are already in local DB
      const newNames = firebaseList.filter(
        name => !localList.includes(name) && name.trim() !== ""
      );

      // 4. Add new Firebase names to local DB (offline-first)
      for (const name of newNames) {
        await addEngineerToDB(name);
      }

      // 5. Merge local + firebase names, remove duplicates (case-insensitive)
      merged = dedupeNames([...localList, ...firebaseList]).filter(
        (name) => name && name.trim() !== ""
      );
    } catch (err) {
      console.log("Firebase fetch failed, using local only", err);
    }

    // If no local rows but parent passed an initial list, use that as a fallback
    if ((merged == null || merged.length === 0) && initialEngineers && initialEngineers.length > 0) {
      const dedupedInit = Array.from(
        new Map(initialEngineers.map((n) => [n.trim().toLowerCase(), n.trim()])).values()
      );
      merged = dedupedInit;
    }

    // 6. Update state & notify parent
    setEngineers(merged);
    onEngineersUpdated(merged);
  };

  // ---------- ADD ENGINEER ----------
  const handleAddEnter = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      Alert.alert("Invalid", "Enter a valid name.");
      return;
    }
    if (engineers.includes(trimmed)) {
      Alert.alert("Duplicate", "This engineer already exists.");
      return;
    }

    // Add to SQLite
    try {
      await addEngineerToDB(trimmed); // ✅ await ensures DB write completes
    } catch (err) {
      console.error("Add failed:", err);
      Alert.alert("Error", `Could not add engineer. ${String(err)}`);
      return;
    }

    // Try syncing to Firebase
    try {
      await syncEngineersToCloud();
    } catch {
      console.log("Offline, will sync later");
    }

    // Refresh local list
    const updatedObjects = await getAllEngineers(); // ✅ await
    const updated = Array.from(
      new Map(updatedObjects.map(e => [e.engName.trim().toLowerCase(), e.engName.trim()])).values()
    );
    setEngineers(updated);
    onEngineersUpdated(updated);

    setNewName("");
    setAddVisible(false);
    Alert.alert("Success", "Engineer added successfully.");
  };

  // ---------- DELETE ENGINEER ----------
  const handleDelete = (name: string) => {
    Alert.alert(
      "Delete Engineer?",
      `Are you sure you want to delete "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const allEngineers = await getAllEngineers(); // ✅ await
            const eng = allEngineers.find(e => e.engName === name);
            if (eng && eng.id != null) {
              await markEngineerAsDeleted(eng.id); // ✅ await
            }

            // Try syncing to Firebase
            try {
              await syncEngineersToCloud();
            } catch {
              console.log("Offline, deletion will sync later");
            }

            // Refresh local list
            const updatedObjects = await getAllEngineers(); // ✅ await
            const updated = Array.from(
              new Map(updatedObjects.map(e => [e.engName.trim().toLowerCase(), e.engName.trim()])).values()
            );
            setEngineers(updated);
            onEngineersUpdated(updated);

            setDeleteVisible(false);
            Alert.alert("Deleted", `"${name}" removed.`);
          },
        },
      ]
    );
  };


  return (
    <>
      {/* Main Manager Menu */}
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.centeredModalBackground}>
          <View style={[styles.centeredModal, { width: "85%" }]}>
            <Text style={styles.modalHeading}>Engineers Management</Text>

            <TouchableOpacity
              style={[styles.optionButton, { backgroundColor: "#4caf50" }]}
              onPress={() => setAddVisible(true)}
            >
              <Text style={styles.optionButtonText}>Add Engineer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, { backgroundColor: "#f44336" }]}
              onPress={() => setDeleteVisible(true)}
            >
              <Text style={styles.optionButtonText}>Delete Engineer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, { backgroundColor: "#607D8B" }]}
              onPress={onClose}
            >
              <Text style={styles.optionButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ADD ENGINEER MODAL */}
      <Modal visible={addVisible} transparent animationType="fade">
        <View style={styles.centeredModalBackground}>
          <View style={[styles.centeredModal, { width: "85%" }]}>
            <Text style={styles.modalHeading}>Add Engineer</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Enter engineer name"
              placeholderTextColor="#777"
              value={newName}
              onChangeText={setNewName}
            />

            <View style={{ flexDirection: "row", marginTop: 16, width: "100%" }}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: "#4caf50", flex: 1, marginRight: 6 }]}
                onPress={handleAddEnter}
              >
                <Text style={styles.actionButtonText}>Add</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: "#f44336", flex: 1 }]}
                onPress={() => {
                  setNewName("");
                  setAddVisible(false);
                }}
              >
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DELETE ENGINEER MODAL */}
      <Modal visible={deleteVisible} transparent animationType="fade">
        <View style={styles.centeredModalBackground}>
          <View style={[styles.centeredModal, { width: "85%", maxHeight: "70%" }]}>
            <Text style={styles.modalHeading}>Delete Engineer</Text>

            {engineers.length === 0 ? (
              <Text style={{ marginTop: 10 }}>No engineers found.</Text>
            ) : (
              <FlatList
                data={engineers}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.listItem}
                    onPress={() => handleDelete(item)}
                  >
                    <Text style={{ fontSize: 16 }}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            )}

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: "#607D8B", marginTop: 10 }]}
              onPress={() => setDeleteVisible(false)}
            >
              <Text style={styles.actionButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default EngineerManager;

const styles = StyleSheet.create({
  centeredModalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  centeredModal: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 10,
    alignItems: "center",
  },
  modalHeading: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  optionButton: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
    alignItems: "center",
  },
  optionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ccc",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  listItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
});
