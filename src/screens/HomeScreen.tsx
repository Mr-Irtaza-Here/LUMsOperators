//This is HomeScreen.tsx
import EngineerManager from "../components/EngineerManager";
import EngineerMultiSelectModal from "../components/EngineerMultiSelectModal";

import Ionicons from "@expo/vector-icons/Ionicons";
import Slider from "@react-native-community/slider";
import { Picker } from "@react-native-picker/picker";
import React, { useState } from "react";

import {
    Animated,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { Calendar } from "react-native-calendars";

const styles = StyleSheet.create({
    container: { flexGrow: 1, padding: 16, paddingBottom: 120 },
    fieldContainer: { marginBottom: 12, },
    label: { fontSize: 14, fontWeight: "500", marginBottom: 4 },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        padding: 10,
        backgroundColor: "#fff",
    },
    heading: {
        fontSize: 20,
        fontWeight: "700",
        marginBottom: 10,
        textAlign: "center",
    },
    addClientButton: {
        position: "absolute",
        top: 10,
        right: 18,
        backgroundColor: "#2196F3",
        padding: 6,
        borderRadius: 8,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        padding: 10,
        backgroundColor: "#fff",
    },
    dateText: {
        fontSize: 14,
    },
    modalBackground: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    bottomModal: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        padding: 16,
        elevation: 5,
    },
    modalHandle: {
        width: 50,
        height: 5,
        backgroundColor: "#ccc",
        borderRadius: 5,
        alignSelf: "center",
        marginBottom: 10,
    },
    closeButton: {
        alignSelf: "center",
        marginTop: 10,
        padding: 10,
    },
    closeButtonText: {
        color: "#2196F3",
        fontWeight: "600",
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        backgroundColor: "#fff",
    },
    textArea: {
        height: 80,
        textAlignVertical: "top",
    },
    addButton: {
        backgroundColor: "#4CAF50",
        padding: 12,
        borderRadius: 8,
        alignItems: "center",
    },
    addButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
});

interface HomeScreenProps {
    uiState: {
        displayDate: string;
        modalVisible: boolean;
        modalTranslateY: any;
        selectedYear: number;
        selectedDate: string;
    };
    formState: {
        engName: string;
        cost: string;
        category: string;
        type: string;
        client: string;
        clients: string[];
        status: string;
        bikeNo: string;
        description: string;
        startingLocation: string;
        endingLocation: string;
        distanceKm: string;
        fuelCostPerKm: string;
        startTimeValue: number;
        endTimeValue: number;
        timeConsumed: string;
        engineersList: string[];

    };
    actions: {
        setEngName: (text: string) => void;
        openModal: () => void;
        closeModal: () => void;
        handleDayPress: (day: any) => void;
        handleCostChange: (text: string) => void;
        setCategory: (value: string) => void;
        setType: (value: string) => void;
        setClient: (value: string) => void;
        setStatus: (value: string) => void;
        handleBikeNoChange: (text: string) => void;
        setDescription: (text: string) => void;
        setStartingLocation: (text: string) => void;
        setEndingLocation: (text: string) => void;
        setDistanceKm: (text: string) => void;
        setFuelCostPerKm: (text: string) => void;
        setStartTimeValue: (value: number) => void;
        setEndTimeValue: (value: number) => void;
        calculateTimeConsumed: (start: number, end: number) => void;
        formatTime: (value: number) => string;
        openGoogleMaps: () => void;
        handleAddData: () => void;
        checkForUpdates: () => void;
        setClientModalVisible: (visible: boolean) => void;
        setSelectedYear: (year: number) => void;
        setSelectedDate: (date: string) => void;
        onEngineersUpdated: (list: string[]) => void;

    };
}


const HomeScreen: React.FC<HomeScreenProps> = ({ uiState, formState, actions }) => {
    const { displayDate, modalVisible, modalTranslateY, selectedYear, selectedDate } = uiState;

    const {
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
    } = formState;

    const {
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
        setSelectedYear,  // 👈 add
        setSelectedDate,  // 👈 add
        onEngineersUpdated,
    } = actions;



    const [engineerManagementVisible, setEngineerManagementVisible] = useState(false);

    // Multi-select engineer state
    const [selectedEngineers, setSelectedEngineers] = useState<string[]>([]);
    const [multiSelectVisible, setMultiSelectVisible] = useState(false);

    // Forces the Calendar to update instantly when year changes
    const [calendarCurrent, setCalendarCurrent] = useState(
        selectedDate || `${selectedYear}-01-01`
    );

    // 🧩 This is where your Home UI goes
    return (

        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "position"}
            keyboardVerticalOffset={0}
        >
            <ScrollView contentContainerStyle={styles.container}>

                {/* Eng Name */}
                {/* Form Heading */}
                <Text style={styles.heading}>Data Entry Form</Text>

                <TouchableOpacity
                    style={styles.addClientButton}
                    onPress={() => setClientModalVisible(true)}
                >
                    <Ionicons name="menu-outline" size={24} color="#fff" />
                </TouchableOpacity>

                {/* Eng_Name Multi-Select */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Eng_Name</Text>

                    <TouchableOpacity
                        style={styles.inputContainer}
                        onPress={() => setMultiSelectVisible(true)}
                    >
                        <Text style={{ fontSize: 14, color: selectedEngineers.length ? "#000" : "#888" }}>
                            {selectedEngineers.length > 0
                                ? selectedEngineers.join(", ")
                                : "Select Engineers"}
                        </Text>

                        <Ionicons name="chevron-down-outline" size={20} color="#555" />
                    </TouchableOpacity>
                </View>

                {/* Date */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Date</Text>
                    <TouchableOpacity
                        style={styles.inputContainer}
                        onPress={openModal}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.dateText, !displayDate && { color: "#999" }]}>
                            {displayDate || "Select Date"}
                        </Text>
                        <Ionicons name="calendar-outline" size={22} color="#555" />
                    </TouchableOpacity>

                    <Modal visible={modalVisible} transparent animationType="none">
                        <View style={styles.modalBackground}>
                            <Animated.View
                                style={[
                                    styles.bottomModal,
                                    {
                                        transform: [{ translateY: modalTranslateY }],
                                        paddingBottom: 50   // ✅ Add it HERE
                                    }
                                ]}
                            >

                                <View style={styles.modalHandle} />


                                {/* === Year Dropdown + Calendar === */}
                                <View style={{ marginBottom: 10 }}>
                                    {/* Year Selector */}
                                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 5 }}>
                                        <Text style={{ fontWeight: "bold", marginRight: 10 }}>Select Year:</Text>
                                        <Picker
                                            selectedValue={selectedYear}
                                            style={{ height: 80, width: 100 }}
                                            onValueChange={(year) => {
                                                setSelectedYear(year);

                                                const d = new Date(selectedDate || `${year}-01-01`);

                                                const newDate = `${year}-${(d.getMonth() + 1)
                                                    .toString()
                                                    .padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;

                                                setSelectedDate(newDate);

                                                // 🔥 This makes the calendar instantly jump to new year
                                                setCalendarCurrent(`${year}-${(d.getMonth() + 1)
                                                    .toString()
                                                    .padStart(2, "0")}-01`);
                                            }}

                                        >
                                            {Array.from({ length: 61 }, (_, i) => 2020 + i).map((year) => (
                                                <Picker.Item label={`${year}`} value={year} />
                                            ))}
                                        </Picker>
                                    </View>

                                    {/* Calendar itself */}
                                    <Calendar
                                        current={calendarCurrent}   // ✅ This is the required fix
                                        onDayPress={handleDayPress}
                                        markedDates={{
                                            [selectedDate]: { selected: true, selectedColor: "#3f51b5" },
                                        }}
                                        theme={{
                                            selectedDayBackgroundColor: "#3f51b5",
                                            todayTextColor: "#3f51b5",
                                        }}
                                        firstDay={1}
                                    />

                                </View>


                                <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                                    <Text style={styles.closeButtonText}>Cancel</Text>
                                </TouchableOpacity>
                            </Animated.View>
                        </View>
                    </Modal>
                </View>

                {/* Cost */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Cost (PKR)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter Cost"
                        value={cost}
                        onChangeText={handleCostChange}
                        keyboardType="numeric"
                    />
                </View>

                {/* Category */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Category</Text>
                    <View style={styles.pickerContainer}>
                        <Picker selectedValue={category} onValueChange={setCategory}>
                            <Picker.Item label="Select Category" value="" />
                            <Picker.Item label="Compliance" value="Compliance" />
                            <Picker.Item label="Step_0" value="Step_0" />
                            <Picker.Item label="Step_1" value="Step_1" />
                            <Picker.Item label="Installation" value="Installation" />
                            <Picker.Item label="Client Meetings" value="Client Meetings" />
                        </Picker>
                    </View>
                </View>

                {/* Type */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Type</Text>
                    <View style={styles.pickerContainer}>
                        <Picker selectedValue={type} onValueChange={setType}>
                            <Picker.Item label="Select Type" value="" />
                            <Picker.Item label="Cargo/Bykea/Parcel" value="Cargo/Bykea/Parcel" />
                            <Picker.Item label="Bike Maintenance" value="Bike Maintenance" />
                            <Picker.Item label="Food" value="Food" />
                        </Picker>
                    </View>
                </View>

                {/* Client */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Client</Text>
                    <View style={styles.pickerContainer}>
                        <Picker selectedValue={client} onValueChange={setClient}>
                            <Picker.Item label="Select Client" value="" />
                            {clients.map((c, index) => (
                                <Picker.Item label={c} value={c} />
                            ))}
                        </Picker>
                    </View>
                </View>

                {/* Status */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Status</Text>
                    <View style={styles.pickerContainer}>
                        <Picker selectedValue={status} onValueChange={setStatus}>
                            <Picker.Item label="Select Status" value="" />
                            <Picker.Item label="Paid" value="Paid" />
                            <Picker.Item label="Unpaid" value="Unpaid" />
                        </Picker>
                    </View>
                </View>

                {/* Bike No */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Bike/Car-No.</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter 1–4 Digit Number"
                        value={bikeNo}
                        onChangeText={handleBikeNoChange}
                        keyboardType="numeric"
                        maxLength={4}
                    />
                </View>

                {/* Description */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Enter Description"
                        value={description}
                        onChangeText={setDescription}
                        multiline
                    />
                </View>

                {/* Starting Location */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Starting Location</Text>
                    <TextInput
                        style={styles.input}
                        value={startingLocation}
                        onChangeText={setStartingLocation}
                        placeholder="Enter starting location"
                    />
                </View>

                {/* Ending Location */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Ending Location</Text>
                    <TextInput
                        style={styles.input}
                        value={endingLocation}
                        onChangeText={setEndingLocation}
                        placeholder="Enter ending location"
                    />
                </View>

                {/* Distance (km) */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Distance (km)</Text>
                    <TextInput
                        style={styles.input}
                        value={distanceKm}
                        onChangeText={text => {
                            // Allow only numbers and one decimal point
                            const numericText = text.replace(/[^0-9.]/g, '');

                            // Prevent multiple decimal points
                            const validText = numericText.split('.').length > 2
                                ? numericText.substring(0, numericText.length - 1)
                                : numericText;

                            setDistanceKm(validText);
                        }}
                        placeholder="Enter distance in kilometers"
                        keyboardType="decimal-pad"
                    />
                </View>

                {/* Fuel-Cost (per km) */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Fuel-Cost (per km)</Text>
                    <TextInput
                        style={styles.input}
                        value={fuelCostPerKm}
                        onChangeText={text => {
                            const numericText = text.replace(/[^0-9.]/g, '');
                            const validText = numericText.split('.').length > 2
                                ? numericText.substring(0, numericText.length - 1)
                                : numericText;
                            setFuelCostPerKm(validText);
                        }}
                        placeholder="Enter fuel cost per km"
                        keyboardType="decimal-pad"
                    />
                </View>

                {/* --- Start Time Slider --- */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Start Time</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Slider
                            style={{ flex: 1 }}
                            minimumValue={0}
                            maximumValue={24}
                            step={0.01} // 0.01 = 36 seconds per step
                            value={startTimeValue}
                            onValueChange={(value) => {
                                setStartTimeValue(value);
                                calculateTimeConsumed(value, endTimeValue);
                            }}
                        />
                        <Text style={{ marginLeft: 10, width: 80, textAlign: 'right' }}>
                            {formatTime(startTimeValue)}
                        </Text>
                    </View>
                </View>

                {/* --- End Time Slider --- */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>End Time</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Slider
                            style={{ flex: 1 }}
                            minimumValue={0}
                            maximumValue={24}
                            step={0.01}
                            value={endTimeValue}
                            onValueChange={(value) => {
                                setEndTimeValue(value);
                                calculateTimeConsumed(startTimeValue, value);
                            }}
                        />
                        <Text style={{ marginLeft: 10, width: 80, textAlign: 'right' }}>
                            {formatTime(endTimeValue)}
                        </Text>
                    </View>
                </View>

                {/* --- Time Consumed (Auto) --- */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Time Consumed (decimal hours)</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: '#f0f0f0' }]}
                        value={timeConsumed}
                        editable={false}
                        placeholder="Auto-calculated"
                    />
                </View>

                {/* Maps Button */}
                <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: "#2196F3", marginBottom: 10 }]}
                    onPress={openGoogleMaps}
                >
                    <Text style={styles.addButtonText}>Open Maps</Text>
                </TouchableOpacity>

                {/* Add Data Button */}
                <TouchableOpacity style={styles.addButton} onPress={handleAddData}>
                    <Text style={styles.addButtonText}>Add Data to Storage</Text>
                </TouchableOpacity>

                {/* Check for Updates Button */}
                <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: "#2196F3", marginTop: 10 }]}
                    onPress={checkForUpdates} // 👈 now using your function
                >
                    <Text style={styles.addButtonText}>Check for Updates</Text>
                </TouchableOpacity>

            </ScrollView>

            {/* Engineer Manager (handles Add/Delete and notifies HomeScreen) */}
            <EngineerManager
                visible={engineerManagementVisible}
                onClose={() => setEngineerManagementVisible(false)}
                onEngineersUpdated={onEngineersUpdated}
                initialEngineers={formState.engineersList}
            />

            <EngineerMultiSelectModal
                visible={multiSelectVisible}
                engineers={formState.engineersList}
                selected={selectedEngineers}
                onClose={() => setMultiSelectVisible(false)}
                onDone={(list) => {
                    setSelectedEngineers(list);
                    setEngName(list.join(", ")); // store final result
                    setMultiSelectVisible(false);
                }}
            />

        </KeyboardAvoidingView>

    );
};

export default HomeScreen;