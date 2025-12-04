//This is EngineerManager.tsx
import { collection, getDocs } from "firebase/firestore";
import { db, ensureSignedIn } from "../utils/firebase";
import {
  addEngineerToDB,
  getAllEngineers,
  markEngineerAsDeleted
} from "../utils/LocalDB";

import { syncEngineersToCloud } from "../utils/SyncManager";

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
    await ensureSignedIn(); // <-- make sure user is signed in
    const snapshot = await getDocs(collection(db, "engineers"));
    return snapshot.docs.map(doc => doc.data().name).filter(Boolean);
  } catch (err) {
    console.warn("Failed to fetch engineers from Firebase:", err);
    return [];
  }
};


type Props = {
  visible: boolean;
  onClose: () => void;
  onEngineersUpdated: (list: string[]) => void; // <-- NEW PROP
};

const EngineerManager: React.FC<Props> = ({ visible, onClose, onEngineersUpdated }) => {
  const [engineers, setEngineers] = useState<string[]>([]);
  const [addVisible, setAddVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);

  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (visible) loadEngineers();
  }, [visible]);

  useEffect(() => {
    const interval = setInterval(() => {
      syncEngineersToCloud(); // retries unsynced changes
    }, 5000); // or trigger on network reconnect
    return () => clearInterval(interval);
  }, []);

  const loadEngineers = async () => {
    // 1️⃣ Get local engineers
    const localList = getAllEngineers();

    // 2️⃣ Fetch engineers from Firebase
    let firebaseList: string[] = [];
    try {
      firebaseList = await fetchEngineersFromFirebase(); // <-- you need this helper
    } catch (err) {
      console.log("Firebase fetch failed, using local only", err);
    }

    // 3️⃣ Merge local + Firebase, remove duplicates
    const merged = Array.from(new Set([...localList, ...firebaseList]));

    // 4️⃣ Save merged list locally (SQLite) for offline use
    merged.forEach((name) => addEngineerToDB(name));

    // 5️⃣ Update state & parent
    setEngineers(merged);
    onEngineersUpdated(merged);
  };

  // ADD ENGINEER
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

    // ✅ Add to SQLite with synced=false
    addEngineerToDB(trimmed, { synced: false }); // <-- adjust LocalDB function to accept synced flag

    // ✅ Try syncing to Firebase
    try {
      await syncEngineersToCloud(); // pushes unsynced additions
    } catch {
      console.log("Offline, will sync later");
    }

    // Refresh local list
    const updated = getAllEngineers();
    setEngineers(updated);
    onEngineersUpdated(updated);

    setNewName("");
    setAddVisible(false);
    Alert.alert("Success", "Engineer added successfully.");
  };

  // DELETE ENGINEER
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
            // ✅ Mark as deleted but not synced
            markEngineerAsDeleted(name, { synced: false }); // <-- add this helper in LocalDB

            // ✅ Try syncing to Firebase
            try {
              await syncEngineersToCloud(); // pushes unsynced deletions
            } catch {
              console.log("Offline, deletion will sync later");
            }

            // Refresh local list
            const updated = getAllEngineers();
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
