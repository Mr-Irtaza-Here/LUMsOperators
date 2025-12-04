//This is my DeleteEngineerModal.tsx
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { getAllEngineers, markEngineerAsDeleted } from "../utils/LocalDB";

import { syncEngineersToCloud } from "../utils/SyncManager";
interface DeleteEngineerModalProps {
  visible: boolean;
  onClose: () => void;
  onDeleted: (updatedList: string[]) => void;
}

const DeleteEngineerModal: React.FC<DeleteEngineerModalProps> = ({
  visible,
  onClose,
  onDeleted,
}) => {
  const [list, setList] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

useEffect(() => {
  if (visible) {
    const engineers = getAllEngineers(); // load from SQLite
    setList(engineers);
  }
}, [visible]);

const [loading, setLoading] = useState(false);

const deleteName = async () => {
  if (!selected || loading) return;
  setLoading(true);

  // Soft delete locally
  markEngineerAsDeleted(selected, { synced: false });

  // Sync deletion to Firebase
  await syncEngineersToCloud();

  // Update local state
  const updatedList = getAllEngineers(); 
  setList(updatedList);
  onDeleted(updatedList);

  setSelected(null);
  setLoading(false);
  onClose();
};

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.heading}>Delete Engineer</Text>

          <FlatList
            data={list}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.item,
                  item === selected && { backgroundColor: "#ddd" },
                ]}
                onPress={() => setSelected(item)}
              >
                <Text style={styles.itemText}>{item}</Text>
              </TouchableOpacity>
            )}
          />

          <View style={styles.row}>
            <TouchableOpacity
              disabled={!selected || loading} // ✅ disable during loading
              style={[styles.btn, { opacity: selected && !loading ? 1 : 0.5 }]}
              onPress={deleteName}
            >
              <Text style={styles.btnText}>{loading ? "Deleting..." : "Delete"}</Text>
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
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  box: {
    width: "80%",
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 10,
  },
  heading: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  item: {
    padding: 12,
    borderBottomWidth: 1,
    borderColor: "#ccc",
  },
  itemText: { fontSize: 16 },
  row: { flexDirection: "row", marginTop: 12 },
  btn: {
    flex: 1,
    marginHorizontal: 5,
    backgroundColor: "#f44336",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700" },
});

export default DeleteEngineerModal;
