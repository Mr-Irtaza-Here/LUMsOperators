//This is EngineerMultiSelectModal.tsx
import React, { useState } from "react";
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface Props {
    visible: boolean;
    engineers: string[];
    selected: string[];
    onClose: () => void;
    onDone: (list: string[]) => void;
}

export default function EngineerMultiSelectModal({
    visible,
    engineers,
    selected,
    onClose,
    onDone,
}: Props) {
    const [tempSelected, setTempSelected] = useState<string[]>(selected);

    const toggle = (name: string) => {
        if (tempSelected.includes(name)) {
            setTempSelected(tempSelected.filter((n) => n !== name));
        } else {
            setTempSelected([...tempSelected, name]);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.box}>
                    <Text style={styles.title}>Select Engineers</Text>

                    <ScrollView style={{ maxHeight: 300 }}>
                        {engineers.length === 0 ? (
                            <Text style={{ textAlign: "center", padding: 10, color: "#777" }}>
                                No engineers available
                            </Text>
                        ) : (
                            engineers.map((name, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.item}
                                    onPress={() => toggle(name)}
                                >
                                    <Text style={styles.itemText}>{name}</Text>

                                    <Text style={{ fontSize: 20 }}>
                                        {tempSelected.includes(name) ? "✓" : ""}
                                    </Text>
                                </TouchableOpacity>
                            ))
                        )}
                    </ScrollView>

                    <View style={styles.row}>
                        <TouchableOpacity style={[styles.btn, { backgroundColor: "#aaa" }]} onPress={onClose}>
                            <Text style={styles.btnText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.btn, { backgroundColor: "#4CAF50" }]}
                            onPress={() => onDone(tempSelected)}
                        >
                            <Text style={styles.btnText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    box: {
        width: "85%",
        backgroundColor: "#fff",
        padding: 20,
        borderRadius: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 15,
        textAlign: "center",
    },
    item: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderColor: "#ddd",
    },
    itemText: {
        fontSize: 16,
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 20,
    },
    btn: {
        flex: 1,
        marginHorizontal: 5,
        padding: 12,
        borderRadius: 8,
        alignItems: "center",
    },
    btnText: {
        color: "#fff",
        fontWeight: "700",
    },
});
