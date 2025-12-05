//This is index.tsx
import { ensureSignedIn } from "../../src/utils/firebase"; // <- adjust path if needed
import { getAllEngineers, LocalEngineer } from "../../src/utils/LocalDB";
import {
  pushUnsyncedToCloud,
  startEngineerListener,
  startRealTimeCloudListener,
} from "../../src/utils/SyncManager";

import NetInfo from "@react-native-community/netinfo";

import {
  addLocalExpense,
  getAllLocal,
  markSynced,
} from "../../src/utils/LocalDB";

import { initDB, LocalExpense } from "../../src/utils/LocalDB";

import {
  softDeleteLocal,
  updateLocalExpense
} from "../../src/utils/LocalDB";


import {
  deleteExpenseInCloud,
  updateExpenseInCloud
} from "../../src/utils/CloudDB";

import CopyToAdd from "../../src/components/CopyManageAdd";
import DeleteConfirmFuel from "../../src/components/DeleteConfirmFuel";
import SheetModal, { exportClientSheet, exportPartialSheet } from "../../src/components/SheetModal";
import HomeScreen from "../../src/screens/HomeScreen";
import StorageScreen from "../../src/screens/StorageScreen";


import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from "@react-native-picker/picker";
import 'leaflet/dist/leaflet.css';
import { SafeAreaView } from 'react-native-safe-area-context';

import React, { useEffect, useState } from "react";
import {
  Easing,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { Calendar } from "react-native-calendars";

import { Linking } from 'react-native';

import { Animated } from "react-native";

// Example handler for the Map button
const openGoogleMaps = () => {
  // This opens Google Maps app or browser with default coordinates
  Linking.openURL('https://www.google.com/maps');
};

import * as Updates from 'expo-updates';
import { Alert } from 'react-native';

export default function App() {
  // Form States
  const [engName, setEngName] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [displayDate, setDisplayDate] = useState<string>("");
  const [modalVisible, setModalVisible] = useState(false);
  const [cost, setCost] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");
  const [client, setClient] = useState("");
  const [status, setStatus] = useState("");
  const [bikeNo, setBikeNo] = useState("");
  const [description, setDescription] = useState("");

  const [fuelCostPerKm, setFuelCostPerKm] = useState("");

  // --- Time Handling States ---
  const [startTimeValue, setStartTimeValue] = useState(0); // value for slider
  const [endTimeValue, setEndTimeValue] = useState(0);     // value for slider
  const [timeConsumed, setTimeConsumed] = useState('');     // decimal output

  // --- Edit Time States (for slider-based time selection) ---
  const [editStartTimeValue, setEditStartTimeValue] = useState(0);
  const [editEndTimeValue, setEditEndTimeValue] = useState(0);
  const [editTimeConsumed, setEditTimeConsumed] = useState('');

  // Fuel-Cost storage states
  const [defaultFuelCost, setDefaultFuelCost] = useState('');
  const [fuelCostModalVisible, setFuelCostModalVisible] = useState(false);
  const [newFuelCost, setNewFuelCost] = useState('');

  const [engineersList, setEngineersList] = useState<string[]>([]);

  useEffect(() => {
    ensureSignedIn();  // 🔥 login before Firestore loads
  }, []);

useEffect(() => {
  const loadEngineers = async () => {
    try {
      // 1) Load engineers from local SQLite immediately on startup
      const localEngineers: LocalEngineer[] = await getAllEngineers();
      setEngineersList(localEngineers.map((e: LocalEngineer) => e.engName));

      // 2) Start Firestore → SQLite realtime sync and refresh UI when updates come in
      const unsubscribeEngineers = startEngineerListener(async () => {
        const updated: LocalEngineer[] = await getAllEngineers();
        setEngineersList(updated.map((e: LocalEngineer) => e.engName));
      });

      // 3) Cleanup listener
      return () => {
        if (unsubscribeEngineers) unsubscribeEngineers();
      };
    } catch (err) {
      console.error("Failed to initialize engineers from SQLite:", err);
    }
  };

  loadEngineers();
}, []);

  const onEngineersUpdated = (updatedList: string[]) => {
    setEngineersList(updatedList);
  };

  const [copyModalVisible, setCopyModalVisible] = useState(false);
  const [selectedCopyIndex, setSelectedCopyIndex] = useState<number | null>(null);

  // Data storage for added expenses
  const [expenses, setExpenses] = useState<LocalExpense[]>([]);

  const saveExpenses = async (newExpenses: LocalExpense[]) => {

    try {
      await AsyncStorage.setItem('expenses', JSON.stringify(newExpenses));
      setExpenses(newExpenses);
    } catch (e) {
      console.error('Failed to save expenses', e);
    }
  };

  const saveClients = async (newClients: string[]) => {
    try {
      await AsyncStorage.setItem("clients", JSON.stringify(newClients));
      setClients(newClients);
    } catch (e) {
      console.error("Failed to save clients", e);
    }
  };

  useEffect(() => {
    const loadExpenses = async () => {
      try {
        const saved = await AsyncStorage.getItem('expenses');
        if (saved !== null) {
          setExpenses(JSON.parse(saved));
        }
      } catch (e) {
        console.error('Failed to load expenses', e);
      }
    };

    loadExpenses();

    // Load saved clients
    const loadClients = async () => {
      try {
        const savedClients = await AsyncStorage.getItem("clients");
        if (savedClients) setClients(JSON.parse(savedClients));
      } catch (e) {
        console.error("Failed to load clients", e);
      }
    };
    loadClients();

  }, []);

  // This runs ONE TIME when app starts
  useEffect(() => {
    try {
      initDB();   // <-- this creates your table in SQLite
      console.log("SQLite database ready");
    } catch (e) {
      console.error("Database failed to initialize", e);
    }
  }, []);

  // Load all expenses from SQLite on startup
  useEffect(() => {
    try {
      const local = getAllLocal();
      setExpenses(local);
    } catch (e) {
      console.log("Failed to load local SQLite data on startup:", e);
    }
  }, []);

  // Start Firestore realtime listener once (and refresh UI whenever local DB changes)
useEffect(() => {
  // 1️⃣ Listen to expenses from Firestore
  const unsubscribeExpenses = startRealTimeCloudListener(() => {
    try {
      const all = getAllLocal();
      setExpenses(all);
    } catch (e) {
      console.warn("Failed to refresh local after cloud changes", e);
    }
  });

  // 2️⃣ Listen to engineers from Firestore
  const unsubscribeEngineers = startEngineerListener();

  // 3️⃣ Cleanup both listeners on unmount
  return () => {
    if (unsubscribeExpenses) unsubscribeExpenses();
    if (unsubscribeEngineers) unsubscribeEngineers();
  };
}, []);


  // Watch network connectivity — when we become online, push unsynced to cloud
  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        pushUnsyncedToCloud().catch(err =>
          console.warn("pushUnsyncedToCloud failed:", err)
        );
      }
    });

    return () => unsub();
  }, []);

  // Load saved fuel cost when app starts
  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem('fuelCost');
      if (saved) {
        setDefaultFuelCost(saved);
        setFuelCostPerKm(saved); // fill the home-screen input automatically
      }
    })();
  }, []);

  // Current screen: "home" or "data"
  const [currentScreen, setCurrentScreen] = useState<"home" | "data">("home");

  // Animation for bottom modal
  const slideAnim = useState(new Animated.Value(0))[0];

  // Edit Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // States for editing fields
  const [editEngName, setEditEngName] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editSelectedDate, setEditSelectedDate] = useState("");
  const [editCost, setEditCost] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editType, setEditType] = useState("");
  const [editClient, setEditClient] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editBikeNo, setEditBikeNo] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // New edit map/location fields
  const [editStarting, setEditStarting] = useState("");
  const [editEnding, setEditEnding] = useState("");
  const [editDistance, setEditDistance] = useState("");

  const [editFuelCost, setEditFuelCost] = useState("");

  const [editCalendarVisible, setEditCalendarVisible] = useState(false);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [addOptionsModalVisible, setAddOptionsModalVisible] = useState(false);

  // --- Partial Sheet Modal ---
  const [partialSheetModalVisible, setPartialSheetModalVisible] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [clientSheetModalVisible, setClientSheetModalVisible] = useState(false);
  const [selectedClientForExport, setSelectedClientForExport] = useState("");


  const [selectedStartDate, setSelectedStartDate] = useState("");
  const [selectedEndDate, setSelectedEndDate] = useState("");

  const [calendarVisible, setCalendarVisible] = useState<"start" | "end" | null>(null);

  const [startingLocation, setStartingLocation] = useState('');
  const [endingLocation, setEndingLocation] = useState('');
  const [distanceKm, setDistanceKm] = useState('');

  // --- Client Management States ---
  const [clients, setClients] = useState<string[]>([]);
  const [clientModalVisible, setClientModalVisible] = useState(false);
  const [addClientVisible, setAddClientVisible] = useState(false);
  const [deleteClientVisible, setDeleteClientVisible] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [confirmDeleteClient, setConfirmDeleteClient] = useState<string | null>(null);


  async function checkForUpdates() {
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        console.log("🆕 Update found, downloading...");
        await Updates.fetchUpdateAsync();
        console.log("✅ Update fetched, ready to reload...");
        Alert.alert(
          "Update Available",
          "A new version is ready to install. Restart now?",
          [
            { text: "Later", style: "cancel" },
            { text: "Restart Now", onPress: async () => await Updates.reloadAsync() },
          ]
        );
      } else {
        console.log("⚡ No new update available");
        Alert.alert("Up to Date", "✅ You already have the latest version.");
      }
    } catch (err: any) { // ✅ this fixes the TS error
      console.log("❌ Error checking update:", err);
      Alert.alert("Error", "⚠️ Error checking for updates:\n" + err.message);
    }
  }

  const openModal = () => {
    setModalVisible(true);
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 250,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => setModalVisible(false));
  };

  const modalTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });

  // Date picker handler (for home)
  const handleDayPress = (day: { dateString: string }) => {
    setSelectedDate(day.dateString);
    const date = new Date(day.dateString);
    const formatted = date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    setDisplayDate(formatted);
    closeModal();
  };

  // Cost formatter
  const handleCostChange = (text: string) => {
    const numericValue = text.replace(/[^0-9]/g, "");
    if (!numericValue) {
      setCost("");
      return;
    }
    const formatted = new Intl.NumberFormat("en-PK").format(Number(numericValue));
    setCost(`₨ ${formatted}`);
  };

  const handleBikeNoChange = (text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, "").slice(0, 4);
    setBikeNo(digitsOnly);
  };


  // --- Add Data ---
  const handleAddData = async () => {
    // 1️⃣ Validate fields
    const fields = {
      engName,
      displayDate,
      cost,
      category,
      type,
      client,
      status,
      bikeNo,
      description,
      starting: startingLocation,
      ending: endingLocation,
      distance: distanceKm,
    };

    const allFilled = Object.values(fields).every((v) =>
      typeof v === "string" ? v.trim().length > 0 : v !== undefined && v !== null
    );

    if (!allFilled) {
      alert("⚠️ Please fill in all the entries first before adding data.");
      return;
    }

    try {
      // 2️⃣ Fuel cost calculation
      const totalFuelCost =
        parseFloat(fuelCostPerKm || "0") * parseFloat(distanceKm || "0");

      // 3️⃣ Duplicate check using actual SQLite DB (not stale UI state)
      const currentRows = getAllLocal();
      const isDuplicate = currentRows.some(
        (item) =>
          item.engName?.trim().toLowerCase() ===
          engName.trim().toLowerCase() &&
          item.date === displayDate &&
          String(item.cost) === String(cost) &&
          item.category === category &&
          item.type === type &&
          item.client === client &&
          item.status === status &&
          item.bikeNo === bikeNo &&
          item.description === description &&
          item.starting === startingLocation &&
          item.ending === endingLocation &&
          String(item.distance) === String(distanceKm)
      );

      if (isDuplicate) {
        alert("⚠️ This entry already exists. Please modify or enter new data.");
        return;
      }

      // 4️⃣ Build local object for SQLite
      const nowIso = new Date().toISOString();
      const localObj: Partial<LocalExpense> = {
        cloudId: null,
        engName,
        date: displayDate,
        cost,
        category,
        type,
        client,
        status,
        bikeNo,
        description,
        starting: startingLocation,
        ending: endingLocation,
        distance: distanceKm,
        fuelCost: Number(totalFuelCost.toFixed(2)),
        startTime: formatTime(startTimeValue),
        endTime: formatTime(endTimeValue),
        timeConsumed: parseFloat(timeConsumed || "0"),
        deleted: 0,
        synced: 0,
        updatedAt: nowIso,
      };

      // 5️⃣ Save to LOCAL SQLite
      const localId = addLocalExpense(localObj);

      // 6️⃣ Refresh UI from SQLite only (true source of data)
      const refreshed = getAllLocal();
      setExpenses(refreshed);

      // 7️⃣ Optional: keep AsyncStorage cache updated
      try {
        await AsyncStorage.setItem("expenses", JSON.stringify(refreshed));
      } catch (e) {
        console.warn("Failed to write AsyncStorage cache:", e);
      }

      // 8️⃣ Try immediate cloud sync if online
      const net = await NetInfo.fetch();
      if (net.isConnected) {
        try {
          await pushUnsyncedToCloud(); // full sync manager
        } catch (err) {
          console.warn("Immediate cloud sync failed, will retry:", err);
        }
      }

      // 9️⃣ Clear the UI fields
      setEngName("");
      setSelectedDate("");
      setDisplayDate("");
      setCost("");
      setCategory("");
      setType("");
      setClient("");
      setStatus("");
      setBikeNo("");
      setDescription("");
      setStartingLocation("");
      setEndingLocation("");
      setDistanceKm("");
      setStartTimeValue(0);
      setEndTimeValue(0);
      setTimeConsumed("");

      alert("✅ Data added successfully!");
    } catch (err) {
      console.error("handleAddData error:", err);
      alert("❌ Failed to add data. Check console for details.");
    }
  };

  // --- Calculate Time Consumed (in decimal hours) ---
  const calculateTimeConsumed = (startValue: number, endValue: number) => {

    try {
      // convert slider values to minutes (0 - 24 hours)
      const startMinutes = startValue * 60;
      const endMinutes = endValue * 60;

      // handle next-day scenario
      let diffMinutes = endMinutes - startMinutes;
      if (diffMinutes < 0) diffMinutes += 24 * 60;

      const decimalHours = (diffMinutes / 60).toFixed(2); // 2 decimal places
      setTimeConsumed(decimalHours.toString());
    } catch (error) {
      console.log("Error calculating time consumed:", error);
      setTimeConsumed('');
    }
  };

  // --- Calculate Time Consumed for Edit Screen ---
  const calculateEditTimeConsumed = (startValue: number, endValue: number) => {
    try {
      const startMinutes = startValue * 60;
      const endMinutes = endValue * 60;
      let diffMinutes = endMinutes - startMinutes;
      if (diffMinutes < 0) diffMinutes += 24 * 60;

      const decimalHours = (diffMinutes / 60).toFixed(2);
      setEditTimeConsumed(decimalHours.toString());
    } catch (error) {
      console.log("Error calculating edit time consumed:", error);
      setEditTimeConsumed('');
    }
  };

  // --- Convert slider value (0-24) to readable time format ---
  const formatTime = (value: number) => {

    const totalMinutes = Math.round(value * 60);
    let hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;

    const formattedHours = hours.toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');

    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  };

  // --- Convert "HH:MM AM/PM" → slider decimal value (0–24) ---
  const parseTimeToSliderValue = (timeString: string): number => {
    if (!timeString) return 0;
    const match = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return 0;
    let [_, hourStr, minuteStr, ampm] = match;
    let hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    if (ampm.toUpperCase() === 'PM' && hour !== 12) hour += 12;
    if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;
    return hour + minute / 60;
  };

  // --- Save Fuel-Cost ---
  const handleSaveFuelCost = async () => {
    if (!newFuelCost.trim()) return;
    await AsyncStorage.setItem('fuelCost', newFuelCost); // permanently store the value
    setDefaultFuelCost(newFuelCost);
    setFuelCostPerKm(newFuelCost); // updates the Home-screen input immediately
    setFuelCostModalVisible(false); // close the popup
    setNewFuelCost(''); // clear input for next time
  };

  // --- Edit Functionality ---
  const handleEdit = (index: number) => {
    const item = expenses[index];
    setEditingIndex(index);
    setEditEngName(item.engName);
    setEditDate(item.date);
    setEditCost(item.cost);
    setEditCategory(item.category);
    setEditType(item.type);
    setEditClient(item.client);
    setEditStatus(item.status);
    setEditBikeNo(item.bikeNo);
    setEditDescription(item.description);

    setEditStarting(item.starting);
    setEditEnding(item.ending);
    setEditDistance(item.distance);

    // ✅ Fix: Preserve existing fuel cost when opening edit modal
    setEditFuelCost(item.fuelCost?.toString() || "");

    // 🕒 Load time fields into edit state
    setEditStartTimeValue(parseTimeToSliderValue(item.startTime));
    setEditEndTimeValue(parseTimeToSliderValue(item.endTime));
    setEditTimeConsumed(item.timeConsumed?.toString() || '');

    setEditModalVisible(true);
  };

  const handleEditCostChange = (text: string) => {
    const numericValue = text.replace(/[^0-9]/g, "");
    if (!numericValue) {
      setEditCost("");
      return;
    }
    const formatted = new Intl.NumberFormat("en-PK").format(Number(numericValue));
    setEditCost(`₨ ${formatted}`);
  };

  const handleEditBikeNoChange = (text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, "").slice(0, 4);
    setEditBikeNo(digitsOnly);
  };

  const handleEditDayPress = (day: { dateString: string }) => {
    setEditSelectedDate(day.dateString);
    const date = new Date(day.dateString);
    const formatted = date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    setEditDate(formatted);
    setEditCalendarVisible(false);
  };

  const handleSaveEdit = async () => {
    if (editingIndex === null) return;

    const oldItem = expenses[editingIndex]; // the item being edited
    const localId = oldItem.id!;             // SQLite row ID
    const cloudId = oldItem.cloudId || null;

    // 1️⃣ Validate updated fields
    const allFilled = [
      editEngName,
      editDate,
      editCost,
      editCategory,
      editType,
      editClient,
      editStatus,
      editBikeNo,
      editDescription,
      editStarting,
      editEnding,
      editDistance,
    ].every((v) => v && v.trim().length > 0);

    if (!allFilled) {
      alert("⚠️ Please fill all fields.");
      return;
    }

    // 2️⃣ Calculate fuel cost
    const totalFuelCost = parseFloat(editFuelCost || "0");

    // 3️⃣ Build update object for SQLite
    const changes = {
      engName: editEngName,
      date: editDate,
      cost: editCost,
      category: editCategory,
      type: editType,
      client: editClient,
      status: editStatus,
      bikeNo: editBikeNo,
      description: editDescription,
      starting: editStarting,
      ending: editEnding,
      distance: editDistance,
      fuelCost: Number(totalFuelCost.toFixed(2)),
      startTime: formatTime(editStartTimeValue),
      endTime: formatTime(editEndTimeValue),
      timeConsumed: parseFloat(editTimeConsumed || "0"),
    };

    // 4️⃣ UPDATE in SQLite (synced = 0 is applied inside LocalDB)
    updateLocalExpense(localId, changes);

    // Refresh UI from SQLite
    const allLocal = getAllLocal();
    setExpenses(allLocal);

    // 5️⃣ UPDATE in Firebase IF online
    const net = await NetInfo.fetch();

    if (net.isConnected && cloudId) {
      try {
        const fullExp: LocalExpense = {
          cloudId,
          ...changes,
          deleted: 0,
          synced: 0,
          updatedAt: new Date().toISOString(),
        };

        await updateExpenseInCloud(cloudId, fullExp);

        markSynced(localId, cloudId);
      } catch (err) {
        console.log("Cloud update failed — will retry later:", err);
      }
    }

    setEditModalVisible(false);
    alert("✅ Entry updated successfully!");
  };


  const handleDelete = async () => {
    if (editingIndex === null) return;

    const oldItem = expenses[editingIndex];
    const localId = oldItem.id!;
    const cloudId = oldItem.cloudId || null;

    // 1️⃣ Soft delete in SQLite
    softDeleteLocal(localId);

    // Refresh UI
    const allLocal = getAllLocal();
    setExpenses(allLocal);

    // 2️⃣ Cloud delete (soft delete) if online
    const net = await NetInfo.fetch();
    if (net.isConnected && cloudId) {
      try {
        await deleteExpenseInCloud(cloudId);
        markSynced(localId, cloudId);
      } catch (err) {
        console.log("Cloud delete failed — will retry later", err);
      }
    }

    setEditModalVisible(false);
    alert("🗑️ Entry deleted successfully!");
  };

  const handleCancelEdit = () => {
    setEditModalVisible(false);
  };

  // --- Render Each Row ---
  const renderExpenseItem = ({ item, index }: { item: LocalExpense; index: number }) => (

    <TouchableOpacity
      style={styles.dataRow}
      key={index}
      activeOpacity={0.8}
      onLongPress={() => {
        setSelectedCopyIndex(index);
        setCopyModalVisible(true);
      }}
      delayLongPress={500} // 0.5 second hold
    >
      <Text style={styles.dataCell}>{item.engName}</Text>
      <Text style={styles.dataCell}>{item.date}</Text>
      <Text style={styles.dataCell}>{item.cost}</Text>
      <Text style={styles.dataCell}>{item.category}</Text>
      <Text style={styles.dataCell}>{item.type}</Text>
      <Text style={styles.dataCell}>{item.client}</Text>
      <Text style={styles.dataCell}>{item.status}</Text>
      <Text style={styles.dataCell}>{item.bikeNo}</Text>
      <Text style={styles.dataCell}>{item.description}</Text>
      <Text style={styles.dataCell}>{item.starting}</Text>
      <Text style={styles.dataCell}>{item.ending}</Text>
      <Text style={styles.dataCell}>{item.distance}</Text>
      <Text style={styles.dataCell}>
        {item.fuelCost ? item.fuelCost.toFixed(2) : "0.00"}
      </Text>

      {/* 🕒 New time fields */}
      <Text style={styles.dataCell}>{item.startTime || "-"}</Text>
      <Text style={styles.dataCell}>{item.endTime || "-"}</Text>
      <Text style={styles.dataCell}>
        {item.timeConsumed !== undefined ? item.timeConsumed.toFixed(2) : "0.00"}
      </Text>

      <TouchableOpacity
        style={styles.editButton}
        onPress={() => handleEdit(index)}
      >
        <Ionicons name="create-outline" size={20} color="#3f51b5" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
  // 🧹 Cleanup when switching between Home and Storage
  useEffect(() => {
    // Prevent overlapping modals when switching screens
    if (currentScreen === "home") {
      setEditModalVisible(false);
    } else {
      setModalVisible(false);
      setClientModalVisible(false);
    }
  }, [currentScreen]);



  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
      {/* Bottom Buttons */}
      <View style={styles.topNav}>
        <TouchableOpacity
          style={[styles.navButton, currentScreen === "home" && styles.navButtonActive]}
          onPress={() => setCurrentScreen("home")}
        >
          <Ionicons name="home-outline" size={18} color={currentScreen === "home" ? "#3f51b5" : "#ffffffff"} />
          <Text
            style={[
              styles.navButtonText,
              currentScreen === "home" && styles.navButtonTextActive,
            ]}
          >
            {/* Entries */}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, currentScreen === "data" && styles.navButtonActive]}
          onPress={() => setCurrentScreen("data")}
        >
          <Ionicons name="document-text-outline" size={18} color={currentScreen === "data" ? "#3f51b5" : "#ffffffff"} />
          <Text
            style={[
              styles.navButtonText,
              currentScreen === "data" && styles.navButtonTextActive,
            ]}
          >
            {/* Storage */}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Home Screen */}
      {/* --- Screen Container (Keep Both Mounted to Prevent Crashes) --- */}
      <View style={{ flex: 1 }}>
        {/* === Home / Entries Screen === */}
        <View style={{ flex: 1, display: currentScreen === "home" ? "flex" : "none" }}>
          <HomeScreen
            uiState={{
              displayDate,
              modalVisible,
              modalTranslateY,
              selectedYear,
              selectedDate,
            }}
            formState={{
              engName,
              cost,
              category,
              type,
              client,
              clients,
              status,
              bikeNo,
              description,
              startingLocation,
              endingLocation,
              distanceKm,
              fuelCostPerKm,
              startTimeValue,
              endTimeValue,
              timeConsumed,

              engineersList: engineersList // 👈 ADD THIS
            }}
            actions={{
              setEngName,
              openModal,
              closeModal,
              handleDayPress,
              handleCostChange,
              setCategory,
              setType,
              setClient,
              setStatus,
              handleBikeNoChange,
              setDescription,
              setStartingLocation,
              setEndingLocation,
              setDistanceKm,
              setFuelCostPerKm,
              setStartTimeValue,
              setEndTimeValue,
              calculateTimeConsumed,
              formatTime,
              openGoogleMaps,
              handleAddData,
              checkForUpdates,
              setClientModalVisible,
              setSelectedYear,
              setSelectedDate,

              onEngineersUpdated: onEngineersUpdated // 👈 ADD THIS
            }}
          />
        </View>

        {/* === Storage / Data Screen === */}
        <View style={{ flex: 1, display: currentScreen === "data" ? "flex" : "none" }}>
          <View style={styles.dataScreenContainer}>
            <StorageScreen
              expenses={expenses}
              clients={clients}
              renderExpenseItem={renderExpenseItem}
              engineersList={engineersList}

              editModalVisible={editModalVisible}
              editEngName={editEngName}
              editDate={editDate}
              editSelectedDate={editSelectedDate}
              editCost={editCost}
              editCategory={editCategory}
              editType={editType}
              editClient={editClient}
              editStatus={editStatus}
              editBikeNo={editBikeNo}
              editDescription={editDescription}
              editStarting={editStarting}
              editEnding={editEnding}
              editDistance={editDistance}
              editFuelCost={editFuelCost}
              editStartTimeValue={editStartTimeValue}
              editEndTimeValue={editEndTimeValue}
              editTimeConsumed={editTimeConsumed}
              editCalendarVisible={editCalendarVisible}
              selectedYear={selectedYear}
              setEditEngName={setEditEngName}
              setEditCalendarVisible={setEditCalendarVisible}
              setEditSelectedDate={setEditSelectedDate}
              setEditDate={setEditDate}
              handleEditDayPress={handleEditDayPress}
              handleEditCostChange={handleEditCostChange}
              setEditCategory={setEditCategory}
              setEditType={setEditType}
              setEditClient={setEditClient}
              setEditStatus={setEditStatus}
              handleEditBikeNoChange={handleEditBikeNoChange}
              setEditDescription={setEditDescription}
              setEditStarting={setEditStarting}
              setEditEnding={setEditEnding}
              setEditDistance={setEditDistance}
              setEditFuelCost={setEditFuelCost}
              setEditStartTimeValue={setEditStartTimeValue}
              setEditEndTimeValue={setEditEndTimeValue}
              calculateEditTimeConsumed={calculateEditTimeConsumed}
              formatTime={formatTime}
              handleSaveEdit={handleSaveEdit}
              handleDelete={handleDelete}
              handleCancelEdit={handleCancelEdit}
              setSelectedYear={setSelectedYear}
              styles={styles}
            />

            {/* Floating Add Button */}
            <TouchableOpacity
              style={styles.floatingButton}
              onPress={() => setAddOptionsModalVisible(true)}
            >
              <Text style={styles.floatingButtonText}>+</Text>
            </TouchableOpacity>

            {/* ✅ Unified Sheet Export Modal */}
            <SheetModal
              visible={addOptionsModalVisible}
              onClose={() => setAddOptionsModalVisible(false)}
              onOpenPartial={() => setPartialSheetModalVisible(true)}
              onOpenClient={() => setClientSheetModalVisible(true)}
            />
          </View>
        </View>
      </View>


      {/* === CopyToAdd part is imported here === */}
      <CopyToAdd
        copyModalVisible={copyModalVisible}
        setCopyModalVisible={setCopyModalVisible}
        selectedCopyIndex={selectedCopyIndex}
        setSelectedCopyIndex={setSelectedCopyIndex}
        expenses={expenses}
        saveExpenses={saveExpenses}
        clientModalVisible={clientModalVisible}
        setClientModalVisible={setClientModalVisible}
        addClientVisible={addClientVisible}
        setAddClientVisible={setAddClientVisible}
        deleteClientVisible={deleteClientVisible}
        setDeleteClientVisible={setDeleteClientVisible}
        fuelCostModalVisible={fuelCostModalVisible}
        setFuelCostModalVisible={setFuelCostModalVisible}
        newClientName={newClientName}
        setNewClientName={setNewClientName}
        clients={clients}
        saveClients={saveClients}
        onEngineersUpdated={onEngineersUpdated}
      />

      {/* === DeleteConfirmFuel part is imported here === */}
      <DeleteConfirmFuel
        deleteClientVisible={deleteClientVisible}
        setDeleteClientVisible={setDeleteClientVisible}
        clients={clients}
        setConfirmDeleteClient={setConfirmDeleteClient}
        confirmDeleteClient={confirmDeleteClient}
        saveClients={saveClients}
        fuelCostModalVisible={fuelCostModalVisible}
        setFuelCostModalVisible={setFuelCostModalVisible}
        newFuelCost={newFuelCost}
        setNewFuelCost={setNewFuelCost}
        handleSaveFuelCost={handleSaveFuelCost}
        styles={styles}
      />

      {/* --- Client Sheet Modal --- */}
      <Modal
        visible={clientSheetModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setClientSheetModalVisible(false)}
      >
        <View style={styles.centeredModalBackground}>
          <View style={[styles.centeredModal, { width: "90%" }]}>
            <Text style={styles.modalHeading}>Export Client Sheet</Text>

            <View style={{ width: "100%", marginBottom: 15 }}>
              <Text style={{ fontWeight: "600", marginBottom: 6 }}>Select Client</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedClientForExport}
                  onValueChange={setSelectedClientForExport}
                >
                  <Picker.Item label="Select Client" value="" />
                  {clients.map((c, i) => (
                    <Picker.Item label={c} value={c} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Manage Clients Shortcut */}
            <TouchableOpacity
              style={[styles.optionButton, { backgroundColor: "#1f43a7ff" }]}
              onPress={() => {
                setClientSheetModalVisible(false);
                setClientModalVisible(true);
              }}
            >
              <Text style={styles.optionButtonText}>Manage Clients</Text>
            </TouchableOpacity>

            {/* Export + Cancel */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%" }}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: "#4caf50" }]}
                onPress={async () => {
                  if (!selectedClientForExport) {
                    alert("⚠️ Please select a client first!");
                    return;
                  }
                  setClientSheetModalVisible(false);
                  await exportClientSheet(selectedClientForExport);
                }}
              >
                <Text style={styles.actionButtonText}>Export</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: "#f44336" }]}
                onPress={() => setClientSheetModalVisible(false)}
              >
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- Partial Sheet Modal --- */}
      <Modal
        visible={partialSheetModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPartialSheetModalVisible(false)}
      >
        <View style={styles.centeredModalBackground}>
          <View style={[styles.centeredModal, { width: "90%" }]}>
            <Text style={styles.modalHeading}>Export Partial Sheet</Text>

            {/* Starting Date Field */}
            <View style={{ width: "100%", marginBottom: 20 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#333", marginBottom: 6 }}>
                Starting Date
              </Text>
              <TouchableOpacity
                style={styles.inputContainer}
                activeOpacity={0.8}
                onPress={() => setCalendarVisible("start")}
              >
                <Ionicons name="calendar-outline" size={22} color="#555" style={{ marginRight: 8 }} />
                <Text style={[styles.dateText, !startDate && { color: "#999" }]}>
                  {startDate || "Select Starting Date"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Ending Date Field */}
            <View style={{ width: "100%", marginBottom: 20 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#333", marginBottom: 6 }}>
                Ending Date
              </Text>
              <TouchableOpacity
                style={styles.inputContainer}
                activeOpacity={0.8}
                onPress={() => setCalendarVisible("end")}
              >
                <Ionicons name="calendar-outline" size={22} color="#555" style={{ marginRight: 8 }} />
                <Text style={[styles.dateText, !endDate && { color: "#999" }]}>
                  {endDate || "Select Ending Date"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%" }}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: "#4caf50" }]}
                onPress={async () => {
                  if (!startDate || !endDate) {
                    alert("⚠️ Please select both dates first!");
                    return;
                  }
                  setPartialSheetModalVisible(false);
                  await exportPartialSheet(selectedStartDate, selectedEndDate);
                }}
              >
                <Text style={styles.actionButtonText}>Export</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: "#f44336" }]}
                onPress={() => setPartialSheetModalVisible(false)}
              >
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Calendar Picker Modal */}
        {calendarVisible && (
          <Modal visible transparent animationType="fade">
            <View style={styles.modalBackground}>
              <View style={styles.bottomModal}>
                <View style={styles.modalHandle} />


                {/* === Year Dropdown + Calendar for Partial Sheet === */}
                <View style={{ marginBottom: 10 }}>
                  {/* Year Selector */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 5,
                    }}
                  >
                    <Text style={{ fontWeight: "bold", marginRight: 10 }}>Select Year:</Text>
                    <Picker
                      selectedValue={selectedYear}
                      style={{ height: 80, width: 100 }}
                      onValueChange={(year) => {
                        setSelectedYear(year);

                        const currentSelectedDate =
                          calendarVisible === "start"
                            ? selectedStartDate
                            : selectedEndDate;

                        const d = new Date(currentSelectedDate || new Date());

                        const newDate = `${year}-${(d.getMonth() + 1)
                          .toString()
                          .padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;

                        // Update whichever date is being edited
                        if (calendarVisible === "start") {
                          setSelectedStartDate(newDate);
                          setStartDate(
                            new Date(newDate).toLocaleDateString("en-US", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          );
                        } else {
                          setSelectedEndDate(newDate);
                          setEndDate(
                            new Date(newDate).toLocaleDateString("en-US", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          );
                        }
                      }}
                    >
                      {Array.from({ length: 61 }, (_, i) => 2020 + i).map((year) => (
                        <Picker.Item label={`${year}`} value={year} />
                      ))}
                    </Picker>
                  </View>

                  {/* Calendar itself */}
                  <Calendar
                    current={
                      calendarVisible === "start"
                        ? `${selectedYear}-${(new Date(
                          selectedStartDate || new Date()
                        ).getMonth() + 1)
                          .toString()
                          .padStart(2, "0")}-01`
                        : `${selectedYear}-${(new Date(
                          selectedEndDate || new Date()
                        ).getMonth() + 1)
                          .toString()
                          .padStart(2, "0")}-01`
                    }
                    onDayPress={(day) => {
                      const formatted = new Date(day.dateString).toLocaleDateString(
                        "en-US",
                        {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      );

                      if (calendarVisible === "start") {
                        setSelectedStartDate(day.dateString);
                        setStartDate(formatted);
                      } else {
                        setSelectedEndDate(day.dateString);
                        setEndDate(formatted);
                      }
                      setCalendarVisible(null);
                    }}
                    markedDates={{
                      [calendarVisible === "start"
                        ? selectedStartDate
                        : selectedEndDate]: {
                        selected: true,
                        selectedColor: "#3f51b5",
                      },
                    }}
                    theme={{
                      selectedDayBackgroundColor: "#3f51b5",
                      todayTextColor: "#3f51b5",
                    }}
                    firstDay={1}
                  />
                </View>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setCalendarVisible(null)}
                >
                  <Text style={styles.closeButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  topButtonContainer: { flexDirection: "row", justifyContent: "center", backgroundColor: "#e9e9ef" },

  screenButton: {
    flex: 1,
    paddingVertical: 15,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
    alignItems: "center",
  },

  screenButtonActive: { borderBottomColor: "#3f51b5", backgroundColor: "#fff" },

  screenButtonText: { fontSize: 16, fontWeight: "600", color: "#555" },

  screenButtonTextActive: { color: "#3f51b5" },

  container: { padding: 16, backgroundColor: "#ffffffff", paddingBottom: 40 },

  heading: { fontSize: 22, fontWeight: "700", textAlign: "center", color: "#3f51b5", marginBottom: 20 },

  fieldContainer: { marginBottom: 30 },

  label: { fontSize: 15, fontWeight: "600", color: "#333", marginBottom: 6 },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    justifyContent: "space-between",
    backgroundColor: "#fff",
    height: 48,
  },

  dateText: { flex: 1, fontSize: 15, color: "#000" },

  input: {
    flex: 1,
    fontSize: 15,
    color: "#000",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
  },

  textArea: { height: 100, textAlignVertical: "top" },

  pickerContainer: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, overflow: "hidden", backgroundColor: "#fff" },

  modalBackground: { flex: 1, backgroundColor: "#00000088", justifyContent: "flex-end" },

  bottomModal: { backgroundColor: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 50, paddingTop: 10 },

  modalHandle: { alignSelf: "center", width: 50, height: 5, borderRadius: 2.5, backgroundColor: "#ccc", marginBottom: 10 },

  closeButton: { paddingVertical: 12, alignItems: "center", borderTopWidth: 1, borderColor: "#eee" },

  closeButtonText: { fontSize: 16, color: "#3f51b5", fontWeight: "600" },

  addButton: { marginTop: 20, backgroundColor: "#3f51b5", paddingVertical: 14, borderRadius: 8, alignItems: "center" },

  addButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  dataScreenContainer: { flex: 1, padding: 12, paddingBottom: 120, backgroundColor: "#f8f9fa" },

  dataRow: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#ddd", paddingVertical: 10, backgroundColor: "#fff", borderRadius: 6, minWidth: 1000, shadowColor: "#000", },

  dataHeaderRow: { backgroundColor: "#3f51b5" },

  dataCell: { flex: 1, fontSize: 13, color: "#000", paddingHorizontal: 5, minWidth: 100, maxWidth: 100 },

  dataHeaderCell: { color: "#fff", fontWeight: "700" },

  editButton: { paddingHorizontal: 8, justifyContent: "center" },

  actionButton: { flex: 1, marginHorizontal: 5, paddingVertical: 12, borderRadius: 8, alignItems: "center" },

  actionButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  topNav: {
    flexDirection: "row",
    justifyContent: "center",
    backgroundColor: "#3f51b5",
    paddingTop: 15,
    paddingBottom: 25,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    paddingHorizontal: 10,
    marginTop: 3,
    zIndex: 9999,
    position: "absolute",
    bottom: 0,
  },

  navButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: 18,
    paddingHorizontal: 10,
    marginBottom: 33,
    borderRadius: 10,
    backgroundColor: "#3f51b5",
    // backgroundColor: "#f0f0f0",
    flex: 1,
    justifyContent: "center"
  },

  navButtonActive: {
    // backgroundColor: "#3f51b5",
    backgroundColor: "#f0f0f0",
  },

  navButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#3f51b5",
  },

  navButtonTextActive: {
    color: "#fff",
  },

  floatingButton: {
    position: "absolute",
    bottom: 125,
    right: 10,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#3f51b5",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },

  floatingButtonText: {
    fontSize: 30,
    color: "#fff",
    fontWeight: "700",
  },

  centeredModalBackground: {
    flex: 1,
    backgroundColor: "#00000088",
    justifyContent: "center",
    alignItems: "center",
  },

  centeredModal: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },

  modalHeading: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
    color: "#3f51b5",
    textAlign: "center",
  },

  optionButton: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: "center",
  },

  optionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  addClientButton: {
    flex: 1,
    marginBottom: 25,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#3f51b5",
    justifyContent: "center",
    alignItems: "center",
  },

  modalInput: {
    backgroundColor: '#ffffff',
    color: '#000000',
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    width: '100%',
  },

  // --- Fuel-Cost Modal Styles ---
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },

  modalBox: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 5,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#000",
  },

  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 15,
  },

  modalButton: {
    backgroundColor: "#3f51b5",
    paddingVertical: 10,
    paddingHorizontal: 31,
    borderRadius: 8,
  },

  modalButtonCancel: {
    backgroundColor: "#888",
    paddingVertical: 10,
    paddingHorizontal: 26,
    borderRadius: 8,
  },

  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

});