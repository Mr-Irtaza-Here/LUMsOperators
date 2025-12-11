//This is my DeleteEngineerModal.tsx
import Constants from 'expo-constants';
import React, { useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { getAllEngineers, getUnsyncedEngineers, LocalEngineer, markEngineerAsDeleted, syncEngineersToCloud } from "../EngineersDatabase";
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
    // ✅ async function inside useEffect
    const loadEngineers = async () => {
      const engineers = await getAllEngineers(); // await the promise
      setList(engineers.map((e: LocalEngineer) => e.engName)); // map to string[]
    };
    loadEngineers();
  }
}, [visible]);

const [loading, setLoading] = useState(false);

const deleteName = async () => {
  if (!selected || loading) return;
  setLoading(true);

  try {
    // load current
    const engineers = await getAllEngineers();
    const engineerObj = engineers.find((e: LocalEngineer) => e.engName === selected);

    if (engineerObj && engineerObj.id != null) {
      // Soft delete locally
      await markEngineerAsDeleted(engineerObj.id); // markEngineerAsDeleted returns Promise<void>
    }

    // Sync deletion to Firebase
    await syncEngineersToCloud();

    // Update local state
    const updatedEngineers = await getAllEngineers();
    const updatedList = updatedEngineers.map((e: LocalEngineer) => e.engName);
    setList(updatedList);
    onDeleted(updatedList);

    // If running as APK and the list becomes empty unexpectedly,
    // show a helpful alert and log debug info.
    try {
      const isStandalone = (Constants as any)?.appOwnership === 'standalone';
      if (isStandalone && updatedList.length === 0) {
        const unsynced = await getUnsyncedEngineers();
        Alert.alert(
          'Engineers List Empty (APK)',
          'After deletion, the engineers list is empty. This can happen if all engineers were soft-deleted locally or if Firestore rules prevent the listener from restoring items.\n\nTap "Log Debug" to print debug info to device logs.',
          [
            { text: 'Log Debug', onPress: () => {
              console.log('[DeleteEngineer Debug] beforeCount=', engineers.length, 'afterCount=', updatedList.length);
              console.log('[DeleteEngineer Debug] unsynced=', unsynced.length);
            }},
            { text: 'OK', style: 'cancel' }
          ],
        );
      }
    } catch (e) {
      console.warn('Failed to show APK delete-alert:', e);
    }

    setSelected(null);
    setLoading(false);
    onClose();
  } catch (err) {
    console.error('Delete engineer failed:', err);
    try {
      const isStandalone = (Constants as any)?.appOwnership === 'standalone';
      if (isStandalone) {
        Alert.alert('Delete Failed (APK)', `Could not delete engineer: ${(err as any)?.message || String(err)}\n\nCheck adb logs for details.`);
      }
    } catch (e) {
      console.warn('Failed to show delete error alert:', e);
    }
    setLoading(false);
  }
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
