//This is index.tsx
import Constants from 'expo-constants';
import { getAllEngineers, getUnsyncedEngineers, initEngineersTable, startEngineerListener, syncEngineersToCloud } from "../../src/EngineersDatabase";
import { ensureSignedIn as engEnsureSignedIn } from "../../src/EngineersDatabase/firebase";
import { ensureSignedIn } from "../../src/utils/firebase"; // <- adjust path if needed
import {
  pushUnsyncedToCloud,
  startRealTimeCloudListener
} from "../../src/utils/SyncManager";

import NetInfo from "@react-native-community/netinfo";

import {
  addLocalExpense,
  getAllLocal
} from "../../src/utils/LocalDB";

import {
  addClientToDB,
  getAllClients,
  initClientsTable,
  markClientAsDeleted as markClientAsDeletedClient,
  startClientListener,
  syncClientsToCloud as syncClientsToCloudFn
} from "../../src/ClientsDatabase";
import {
  getFuelCostValue,
  initFuelCostSettingsTable,
  setFuelCostValue,
  startFuelCostListener,
  syncFuelCostToCloud
} from "../../src/FuelCostDatabase";
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
  // APK-only debug state
  const [debugUid, setDebugUid] = useState<string | null>(null);
  const [localCount, setLocalCount] = useState<number>(0);
  const [unsyncedCount, setUnsyncedCount] = useState<number>(0);
  const [listenerError, setListenerError] = useState<string | null>(null);

  useEffect(() => {
    ensureSignedIn();  // 🔥 login before Firestore loads
    // Also try to sign into the engineers Firebase instance and capture UID for debug panel
    (async () => {
      try {
        const user = await engEnsureSignedIn();
        setDebugUid(user?.uid ?? null);
      } catch (e) {
        console.warn('Engineers auth failed at startup', e);
        setDebugUid(null);
      }
    })();
  }, []);

  // Start realtime listener for clients so cloud changes are applied to local DB
  useEffect(() => {
    let unsubscribeClients: any;

    (async () => {
      try {
        unsubscribeClients = await startClientListener(async () => {
          try {
            const localClients = await getAllClients();
            const deduped = Array.from(
              new Map(localClients.map(c => [c.name.trim().toLowerCase(), c.name.trim()])).values()
            );
            setClients(deduped);
          } catch (e) {
            console.warn("Error refreshing clients after listener update:", e);
          }
        });
      } catch (e) {
        console.warn("startClientListener failed:", e);
      }
    })();

    return () => {
      try {
        if (typeof unsubscribeClients === "function") unsubscribeClients();
      } catch (e) { }
    };
  }, []);

  // Start realtime listener for engineers so cloud changes are applied to local DB
  useEffect(() => {
    let unsubscribe: any;

    (async () => {
      try {
        unsubscribe = await startEngineerListener(async () => {
          try {
            const localEngineers = await getAllEngineers();
            const deduped = Array.from(
              new Map(localEngineers.map(e => [e.engName.trim().toLowerCase(), e.engName.trim()])).values()
            );
            setEngineersList(deduped);
            // update debug counts
            try {
              const uns = await getUnsyncedEngineers();
              setLocalCount(localEngineers.length);
              setUnsyncedCount(uns.length);
              setListenerError(null);
            } catch (e) {
              console.warn('Failed to update engineers debug counts', e);
            }
          } catch (e) {
            console.warn("Error refreshing engineers after listener update:", e);
          }
        });
      } catch (e) {
        console.warn("startEngineerListener failed:", e);
        setListenerError(String(e));
      }
    })();

    return () => {
      try {
        if (typeof unsubscribe === "function") unsubscribe();
      } catch (e) { }
    };
  }, []);

  // APK-only debug helpers
  const refreshDebugCounts = async () => {
    try {
      const all = await getAllEngineers();
      const uns = await getUnsyncedEngineers();
      setLocalCount(all.length);
      setUnsyncedCount(uns.length);
    } catch (e) {
      console.warn('refreshDebugCounts failed', e);
    }
  };

  const forceSyncEngineers = async () => {
    try {
      await syncEngineersToCloud();
      await refreshDebugCounts();
      alert('Forced engineer sync completed (check logs for details)');
    } catch (e) {
      console.warn('forceSyncEngineers failed', e);
      alert('Forced sync failed: ' + String(e));
    }
  };

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
      // Determine additions and removals compared to current UI state
      const prev = clients || [];
      const added = newClients.filter(n => !prev.includes(n));
      const removed = prev.filter(n => !newClients.includes(n));

      // Add new clients to local DB
      for (const name of added) {
        try {
          await addClientToDB(name);
        } catch (e) {
          console.warn("Failed to add client to local DB:", name, e);
        }
      }

      // Mark removed clients as deleted locally
      if (removed.length > 0) {
        const allLocal = await getAllClients();
        for (const name of removed) {
          const entry = allLocal.find(c => c.name === name);
          if (entry && entry.id != null) {
            await markClientAsDeletedClient(entry.id);
          }
        }
      }

      // Try to sync to cloud now (if online the SyncManager will also push later)
      try {
        await syncClientsToCloudFn();
      } catch (e) {
        console.warn("Clients sync failed (will retry later):", e);
      }

      // Refresh UI from local DB authoritative source
      try {
        const refreshed = await getAllClients();
        setClients(refreshed.map(r => r.name));
      } catch (e) {
        console.warn('Failed to refresh clients after save:', e);
        setClients(newClients);
      }
    } catch (e) {
      console.error("Failed to save clients", e);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // 1️⃣ Initialize SQLite DB
        await initDB();
        console.log("SQLite database ready");

        // Ensure engineers table exists and run migrations if needed
        try {
          await initEngineersTable();
        } catch (e) {
          console.warn("initEngineersTable failed:", e);
        }

        // 2️⃣ Load expenses from SQLite
        const localExpenses = await getAllLocal();
        setExpenses(localExpenses);

        // 3️⃣ Initialize clients table and load clients from local SQLite
        try {
          await initClientsTable();
          const localClients = await getAllClients();
          const clientNames = localClients.map(c => c.name).filter(n => n && n.trim() !== "");
          setClients(clientNames);
        } catch (e) {
          console.warn("Failed to initialize/load clients from ClientsDatabase:", e);
        }

        // 4️⃣ Load engineers from SQLite (dedupe case-insensitive)
        const localEngineers = await getAllEngineers();
        const deduped = Array.from(
          new Map(localEngineers.map(e => [e.engName.trim().toLowerCase(), e.engName.trim()])).values()
        );
        setEngineersList(deduped);

        // If running as a standalone APK and the engineers list is empty,
        // surface an alert with debug options so the user can diagnose APK-specific issues.
        try {
          const isStandalone = (Constants as any)?.appOwnership === 'standalone';
          if (isStandalone && deduped.length === 0) {
            const all = localEngineers || [];
            const unsynced = await getUnsyncedEngineers();
            let uid: string | null = null;
            try {
              const user = await engEnsureSignedIn();
              uid = user?.uid ?? null;
            } catch (e) {
              // ignore; we'll show that auth failed in the dialog message
            }

            const shouldShow = (all.length > 0) || (unsynced.length > 0) || !!uid;
            if (shouldShow) {
              Alert.alert(
                "Engineers List Missing (APK)",
                "The engineers list is empty in this build. Possible causes: Firestore rules blocking reads, the APK is running an older JS bundle, or local DB migration failed.\n\nTap 'Log Debug' to print diagnostic info to device logs, or 'Open Rules' to jump to Firebase rules in console.",
                [
                  {
                    text: "Log Debug", onPress: () => {
                      console.log("[Engineers Debug] uid=", uid);
                      console.log("[Engineers Debug] localCount=", all.length, "unsynced=", unsynced.length);
                      console.log("[Engineers Debug] suggestion: Check Firestore rules (allow if request.auth != null) and ensure Anonymous Auth is enabled for the engineers project.");
                    }
                  },
                  {
                    text: "Open Rules", onPress: () => {
                      try {
                        const url = 'https://console.firebase.google.com/project/engineersnamelist/firestore/rules';
                        Linking.openURL(url).catch(() => console.log('Failed to open Firebase Console URL'));
                      } catch (_) { }
                    }
                  },
                  { text: "OK", style: 'cancel' }
                ],
                { cancelable: true }
              );
            }
          }
        } catch (e) {
          console.warn('Engineers health check failed:', e);
        }

        // 5️⃣ Push unsynced data if online
        const net = await NetInfo.fetch();
        if (net.isConnected) {
          await pushUnsyncedToCloud();
        }
      } catch (err) {
        console.error("Failed to load initial data:", err);
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    const unsubscribeExpenses = startRealTimeCloudListener(async () => {
      try {
        const all = await getAllLocal();
        setExpenses(all);
      } catch (err) {
        console.warn("Failed to refresh expenses from local DB:", err);
      }
    });

    return () => {
      if (unsubscribeExpenses) unsubscribeExpenses();
    };
  }, []);

  // Watch network connectivity — when we become online, push unsynced to cloud
  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        pushUnsyncedToCloud().catch(err =>
          console.warn("pushUnsyncedToCloud failed:", err)
        );
        // Also sync fuel cost when coming online
        syncFuelCostToCloud().catch(err =>
          console.warn("syncFuelCostToCloud failed:", err)
        );
        // Sync clients when coming online (handles offline add/delete)
        syncClientsToCloudFn().catch(err =>
          console.warn("syncClientsToCloud failed:", err)
        );
        // Sync engineers when coming online
        syncEngineersToCloud().catch(err =>
          console.warn("syncEngineersToCloud failed:", err)
        );
      }
    });

    return () => unsub();
  }, []);

  // Load saved fuel cost from SQLite and start Firestore listener for sync
  useEffect(() => {
    let unsubscribeFuelCost: any;

    (async () => {
      // Initialize fuel cost settings table
      try {
        await initFuelCostSettingsTable();
      } catch (e) {
        console.warn("initFuelCostSettingsTable failed:", e);
      }

      // Load fuel cost from SQLite
      const savedCost = await getFuelCostValue();
      if (savedCost != null) {
        setDefaultFuelCost(savedCost.toString());
        setFuelCostPerKm(savedCost.toString());
      }

      // Start Firestore listener for real-time sync across users
      try {
        unsubscribeFuelCost = await startFuelCostListener((cost) => {
          if (cost != null) {
            setDefaultFuelCost(cost.toString());
            setFuelCostPerKm(cost.toString());
          }
        });
      } catch (e) {
        console.warn("startFuelCostListener failed:", e);
      }
    })();

    return () => {
      try {
        if (typeof unsubscribeFuelCost === "function") unsubscribeFuelCost();
      } catch (e) { }
    };
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
      const currentRows = await getAllLocal();

      const isDuplicate = currentRows.some((item: any) =>
        item.engName?.trim().toLowerCase() === engName.trim().toLowerCase() &&
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

      // Refresh engineers list in case a new engineer was added
      const localEngineers = await getAllEngineers();
      const deduped2 = Array.from(
        new Map(localEngineers.map(e => [e.engName.trim().toLowerCase(), e.engName.trim()])).values()
      );
      setEngineersList(deduped2);

      // 6️⃣ Refresh UI from SQLite only (true source of data)
      const refreshed = await getAllLocal();
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

    const costValue = parseFloat(newFuelCost);
    if (isNaN(costValue)) {
      alert("⚠️ Please enter a valid number for fuel cost.");
      return;
    }

    // 1. Save to local SQLite (unsynced)
    await setFuelCostValue(costValue, 0);

    // 2. Update UI immediately
    setDefaultFuelCost(newFuelCost);
    setFuelCostPerKm(newFuelCost);

    // 3. Try to sync if online
    const net = await NetInfo.fetch();
    if (net.isConnected) {
      try {
        await syncFuelCostToCloud();
      } catch (err) {
        console.warn("Immediate fuel cost sync failed, will retry:", err);
      }
    }

    setFuelCostModalVisible(false);
    setNewFuelCost('');
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
    await updateLocalExpense(localId, changes);

    // Refresh UI from SQLite
    const allLocal = await getAllLocal();
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
    const allLocal = await getAllLocal();
    setExpenses(allLocal);

    // 2️⃣ Cloud delete (soft delete) if online
    const net = await NetInfo.fetch();
    if (net.isConnected && cloudId) {
      try {
        await deleteExpenseInCloud(cloudId);
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

      {/* APK-only debug panel */}
      {(Constants as any)?.appOwnership === 'standalone' && (
        <View style={styles.debugPanel}>
          <Text style={styles.debugTitle}>APK Debug</Text>
          <Text style={styles.debugLine}>UID: {debugUid ?? 'not signed'}</Text>
          <Text style={styles.debugLine}>Local rows: {localCount}</Text>
          <Text style={styles.debugLine}>Unsynced: {unsyncedCount}</Text>
          {listenerError ? <Text style={[styles.debugLine, { color: 'red' }]}>Listener error: {listenerError}</Text> : null}
          <View style={{ flexDirection: 'row', marginTop: 6 }}>
            <TouchableOpacity style={styles.debugBtn} onPress={refreshDebugCounts}>
              <Text style={styles.debugBtnText}>Refresh</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.debugBtn, { marginLeft: 8 }]} onPress={forceSyncEngineers}>
              <Text style={styles.debugBtnText}>Force Sync</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
        setExpenses={setExpenses}
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

  debugPanel: {
    backgroundColor: '#fff4e5',
    padding: 8,
    margin: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffd27a'
  },
  debugTitle: { fontWeight: '700', marginBottom: 4 },
  debugLine: { fontSize: 12 },
  debugBtn: {
    backgroundColor: '#3f51b5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  debugBtnText: { color: '#fff', fontWeight: '700' },

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
    paddingHorizontal: 45,
    borderRadius: 8,
  },

  modalButtonCancel: {
    backgroundColor: "#888",
    paddingVertical: 10,
    paddingHorizontal: 36,
    borderRadius: 8,
  },

  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

});