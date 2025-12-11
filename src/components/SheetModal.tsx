//This is my SheetModal.tsx
// src/components/SheetModal.tsx
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as XLSX from "xlsx";
import { db, LocalExpense } from "../utils/LocalDB";

/* ---------------------- Constants & Helpers ---------------------- */
const HEADINGS = [
  "Eng_Name","Date","Cost (PKR)","Category","Type","Client","Status",
  "Bike/Car-No","Description","Starting","Ending","Distance (km)",
  "Fuel-Cost","Start Time","End Time","Time (hrs)"
];

const cleanExpense = (exp: LocalExpense) => ({
  ...exp,
  cost: Number(exp.cost?.toString().replace(/[^0-9.+-]/g, "")) || 0,
  distance: Number(exp.distance) || 0,
  fuelCost: Number(exp.fuelCost) || 0,
  timeConsumed: Number(exp.timeConsumed) || 0,
});

const expensesToExcelData = (expenses: LocalExpense[]) => [
  HEADINGS,
  ...expenses.map(exp => {
    const e = cleanExpense(exp);
    return [
      e.engName || "",
      e.date || "",
      e.cost,
      e.category || "",
      e.type || "",
      e.client || "",
      e.status || "",
      e.bikeNo || "",
      e.description || "",
      e.starting || "",
      e.ending || "",
      e.distance,
      e.fuelCost,
      e.startTime || "",
      e.endTime || "",
      e.timeConsumed,
    ];
  })
];

async function saveAndShareExcel(wb: XLSX.WorkBook, sheetName: string) {
  const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileUri = (FileSystem as any).documentDirectory + `${sheetName}_${timestamp}.xlsx`;

  await FileSystem.writeAsStringAsync(fileUri, wbout, { encoding: "base64" });

  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    alert(`Sharing not available. File saved at:\n${fileUri}`);
    return;
  }

  await Sharing.shareAsync(fileUri, {
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    dialogTitle: `Share ${sheetName}`,
  });
}

/* ---------------------- Date Parser ---------------------- */
const parseDate = (dateStr: string): Date => {
  if (!dateStr) return new Date(NaN);

  // Try JS Date first
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;

  // Handle format like "Monday, November 3, 2025"
  const match = dateStr.match(/^(?:[A-Za-z]+,\s*)?([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
  if (match) {
    const [, monthName, day, year] = match;
    const monthIndex = [
      "January","February","March","April","May","June",
      "July","August","September","October","November","December"
    ].findIndex(m => m.toLowerCase() === monthName.toLowerCase());
    if (monthIndex >= 0) return new Date(Number(year), monthIndex, Number(day));
  }

  return new Date(NaN);
};

/* ---------------------- Fetch Functions ---------------------- */
const fetchAllExpenses = (): LocalExpense[] =>
  db.getAllSync("SELECT * FROM expenses WHERE deleted = 0 ORDER BY id DESC") as LocalExpense[];

const fetchPartialExpenses = (startDateStr: string, endDateStr: string): LocalExpense[] => {
  const allExpenses = fetchAllExpenses();
  const start = parseDate(startDateStr);
  const end = parseDate(endDateStr);
  return allExpenses.filter(exp => {
    const d = parseDate(exp.date);
    return d >= start && d <= end;
  });
};

const fetchClientExpenses = (clientName: string): LocalExpense[] => {
  const allExpenses = fetchAllExpenses();
  return allExpenses.filter(exp => exp.client === clientName);
};

/* ---------------------- Export Functions ---------------------- */
const exportFullSheet = async () => {
  try {
    const expenses = fetchAllExpenses();
    if (!expenses.length) return alert("⚠️ No data available to export!");
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(expensesToExcelData(expenses));
    XLSX.utils.book_append_sheet(wb, ws, "FullSheet");
    await saveAndShareExcel(wb, "FullSheet");
  } catch (err: any) {
    console.error("❌ Full sheet export failed:", err);
    alert("❌ Failed to export full sheet!\n" + (err?.message || JSON.stringify(err)));
  }
};

const exportPartialSheet = async (startDate: string, endDate: string) => {
  try {
    const expenses = fetchPartialExpenses(startDate, endDate);
    if (!expenses.length) return alert("⚠️ No entries found within this date range!");
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(expensesToExcelData(expenses));
    XLSX.utils.book_append_sheet(wb, ws, "PartialSheet");
    await saveAndShareExcel(wb, "PartialSheet");
  } catch (err: any) {
    console.error("❌ Partial sheet export failed:", err);
    alert("❌ Failed to export partial sheet!\n" + (err?.message || JSON.stringify(err)));
  }
};

const exportClientSheet = async (clientName: string) => {
  try {
    const expenses = fetchClientExpenses(clientName);
    if (!expenses.length) return alert(`⚠️ No entries found for client "${clientName}"`);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(expensesToExcelData(expenses));
    XLSX.utils.book_append_sheet(wb, ws, "ClientSheet");
    await saveAndShareExcel(wb, `ClientSheet_${clientName}`);
  } catch (err: any) {
    console.error("❌ Client sheet export failed:", err);
    alert("❌ Failed to export client sheet!\n" + (err?.message || JSON.stringify(err)));
  }
};

/* ---------------------- Sheet Modal Component ---------------------- */
const SheetModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onOpenPartial: () => void;
  onOpenClient: () => void;
}> = ({ visible, onClose, onOpenPartial, onOpenClient }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.centeredModalBackground}>
      <View style={styles.centeredModal}>
        <Text style={styles.modalHeading}>Export Options</Text>

        <TouchableOpacity style={[styles.optionButton, { backgroundColor: "#3f51b5" }]} onPress={() => { exportFullSheet(); onClose(); }}>
          <Text style={styles.optionButtonText}>Full Sheet</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.optionButton, { backgroundColor: "#4caf50" }]} onPress={() => { onOpenPartial(); onClose(); }}>
          <Text style={styles.optionButtonText}>Partial Sheet</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.optionButton, { backgroundColor: "#ff9800" }]} onPress={() => { onOpenClient(); onClose(); }}>
          <Text style={styles.optionButtonText}>Client Sheet</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.optionButton, { backgroundColor: "#f44336" }]} onPress={onClose}>
          <Text style={styles.optionButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

/* ---------------------- Styles ---------------------- */
const styles = StyleSheet.create({
  centeredModalBackground: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  centeredModal: { backgroundColor: "#fff", borderRadius: 12, width: "80%", padding: 20, elevation: 6 },
  modalHeading: { fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: 20, color: "#333" },
  optionButton: { borderRadius: 8, paddingVertical: 12, alignItems: "center", marginVertical: 6 },
  optionButtonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});

export default SheetModal;
export { exportClientSheet, exportFullSheet, exportPartialSheet };

