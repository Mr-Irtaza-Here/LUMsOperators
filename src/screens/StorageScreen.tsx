//This is StorageScreen.tsx
import EngineerMultiSelectModal from "../components/EngineerMultiSelectModal";
import { LocalExpense } from "../utils/LocalDB";

import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { Picker } from "@react-native-picker/picker";
import React from "react";
import {
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { Calendar } from "react-native-calendars";


interface StorageScreenProps {
    expenses: LocalExpense[];
    clients: string[];

    renderExpenseItem: ({ item, index }: { item: LocalExpense; index: number }) => React.ReactElement;

    engineersList: string[];

    // edit-related states
    editModalVisible: boolean;
    editEngName: string;
    editDate: string;
    editSelectedDate: string;
    editCost: string;
    editCategory: string;
    editType: string;
    editClient: string;
    editStatus: string;
    editBikeNo: string;
    editDescription: string;
    editStarting: string;
    editEnding: string;
    editDistance: string;
    editFuelCost: string;
    editStartTimeValue: number;
    editEndTimeValue: number;
    editTimeConsumed: string;
    editCalendarVisible: boolean;
    selectedYear: number;

    // actions
    setEditEngName: (v: string) => void;
    setEditCalendarVisible: (v: boolean) => void;
    setEditSelectedDate: (v: string) => void;
    setEditDate: (v: string) => void;
    handleEditDayPress: (day: any) => void;
    handleEditCostChange: (t: string) => void;
    setEditCategory: (v: string) => void;
    setEditType: (v: string) => void;
    setEditClient: (v: string) => void;
    setEditStatus: (v: string) => void;
    handleEditBikeNoChange: (t: string) => void;
    setEditDescription: (v: string) => void;
    setEditStarting: (v: string) => void;
    setEditEnding: (v: string) => void;
    setEditDistance: (v: string) => void;
    setEditFuelCost: (v: string) => void;
    setEditStartTimeValue: (v: number) => void;
    setEditEndTimeValue: (v: number) => void;
    calculateEditTimeConsumed: (s: number, e: number) => void;
    formatTime: (v: number) => string;
    handleSaveEdit: () => void;
    handleDelete: () => void;
    handleCancelEdit: () => void;
    setSelectedYear: (y: number) => void;
    styles: any;
}

const StorageScreen: React.FC<StorageScreenProps> = (props) => {
    const {
        expenses,
        clients,
        renderExpenseItem,
        engineersList,
        editModalVisible,
        editEngName,
        editDate,
        editSelectedDate,
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
        editFuelCost,
        editStartTimeValue,
        editEndTimeValue,
        editTimeConsumed,
        editCalendarVisible,
        selectedYear,
        setEditEngName,
        setEditCalendarVisible,
        setEditSelectedDate,
        setEditDate,
        handleEditDayPress,
        handleEditCostChange,
        setEditCategory,
        setEditType,
        setEditClient,
        setEditStatus,
        handleEditBikeNoChange,
        setEditDescription,
        setEditStarting,
        setEditEnding,
        setEditDistance,
        setEditFuelCost,
        setEditStartTimeValue,
        setEditEndTimeValue,
        calculateEditTimeConsumed,
        formatTime,
        handleSaveEdit,
        handleDelete,
        handleCancelEdit,
        setSelectedYear,
        styles,
    } = props;

    // Multi-select states for EDIT mode
    const [editSelectedEngineers, setEditSelectedEngineers] = React.useState<string[]>([]);
    const [editMultiSelectVisible, setEditMultiSelectVisible] = React.useState(false);

    return (
        <>
            {/* Data Header and FlatList */}
            <Text style={[styles.heading, { marginBottom: 18, marginTop: 6 }]}>Data Storage Form</Text>
            <ScrollView horizontal>
                <View>
                    <View style={[styles.dataRow, styles.dataHeaderRow]}>
                        {/* Header Cells */}
                        <Text style={[styles.dataCell, styles.dataHeaderCell]}>Eng_Name</Text>
                        <Text style={[styles.dataCell, styles.dataHeaderCell]}>Date</Text>
                        <Text style={[styles.dataCell, styles.dataHeaderCell]}>Cost (PKR)</Text>
                        <Text style={[styles.dataCell, styles.dataHeaderCell]}>Category</Text>
                        <Text style={[styles.dataCell, styles.dataHeaderCell]}>Type</Text>
                        <Text style={[styles.dataCell, styles.dataHeaderCell]}>Client</Text>
                        <Text style={[styles.dataCell, styles.dataHeaderCell]}>Status</Text>
                        <Text style={[styles.dataCell, styles.dataHeaderCell]}>Bike/Car-No</Text>
                        <Text style={[styles.dataCell, styles.dataHeaderCell]}>Description</Text>
                        <Text style={[styles.dataCell, styles.dataHeaderCell]}>Starting</Text>
                        <Text style={[styles.dataCell, styles.dataHeaderCell]}>Ending</Text>
                        <Text style={[styles.dataCell, styles.dataHeaderCell]}>Distance (km)</Text>
                        <Text style={[styles.dataCell, styles.dataHeaderCell]}>Fuel-Cost</Text>
                        <Text style={[styles.dataCell, styles.dataHeaderCell]}>Start Time</Text>
                        <Text style={[styles.dataCell, styles.dataHeaderCell]}>End Time</Text>
                        <Text style={[styles.dataCell, styles.dataHeaderCell]}>Time (hrs)</Text>
                        <Text style={[styles.dataCell, styles.dataHeaderCell]}>Action</Text>
                    </View>

                    <FlatList
                        data={expenses}
                        keyExtractor={(_, index) => index.toString()}
                        renderItem={renderExpenseItem}
                        ListEmptyComponent={
                            <Text style={{ padding: 20, textAlign: "center", color: "#666" }}>
                                No data added yet.
                            </Text>
                        }
                    />
                </View>
            </ScrollView>

            {/* --- Edit Modal (exactly your block) --- */}
            {/* --- Edit Modal --- */}
            <Modal visible={editModalVisible} transparent animationType="slide">
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={0}
                >
                    <View style={styles.modalBackground}>

                        <View style={[styles.bottomModal, { maxHeight: "90%" }]}>
                            <ScrollView contentContainerStyle={{ padding: 16, }}>
                                <Text style={[styles.heading, { marginBottom: 15 }]}>Edit Entry</Text>

                                {/* Same fields as home, using edit states */}

                                {/* Eng_Name Multi-Select (Edit Mode) */}
                                <View style={styles.fieldContainer}>
                                    <Text style={styles.label}>Eng_Name</Text>

                                    <TouchableOpacity
                                        style={styles.inputContainer}
                                        onPress={() => setEditMultiSelectVisible(true)}
                                    >
                                        <Text style={{ fontSize: 14, color: editSelectedEngineers.length ? "#000" : "#888" }}>
                                            {editSelectedEngineers.length > 0
                                                ? editSelectedEngineers.join(", ")
                                                : "Select Engineers"}
                                        </Text>

                                        <Ionicons name="chevron-down-outline" size={20} color="#555" />
                                    </TouchableOpacity>
                                </View>


                                <View style={styles.fieldContainer}>
                                    <Text style={styles.label}>Date</Text>
                                    <TouchableOpacity
                                        style={styles.inputContainer}
                                        onPress={() => setEditCalendarVisible(true)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.dateText, !editDate && { color: "#999" }]}>
                                            {editDate || "Select Date"}
                                        </Text>
                                        <Ionicons name="calendar-outline" size={22} color="#555" />
                                    </TouchableOpacity>

                                    <Modal visible={editCalendarVisible} transparent animationType="fade">
                                        <View style={styles.modalBackground}>

                                            <View style={styles.bottomModal}>
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
                                                                const d = new Date(editSelectedDate || new Date());
                                                                const newDate = `${year}-${(d.getMonth() + 1)
                                                                    .toString()
                                                                    .padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
                                                                setEditSelectedDate(newDate);
                                                                setEditDate(
                                                                    new Date(newDate).toLocaleDateString("en-US", {
                                                                        weekday: "long",
                                                                        year: "numeric",
                                                                        month: "long",
                                                                        day: "numeric",
                                                                    })
                                                                );
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
                                                            editSelectedDate
                                                                ? `${selectedYear}-${(new Date(editSelectedDate).getMonth() + 1)
                                                                    .toString()
                                                                    .padStart(2, "0")}-01`
                                                                : `${selectedYear}-01-01`
                                                        }
                                                        onDayPress={handleEditDayPress}
                                                        markedDates={{
                                                            [editSelectedDate]: { selected: true, selectedColor: "#3f51b5" },
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
                                                    onPress={() => setEditCalendarVisible(false)}
                                                >
                                                    <Text style={styles.closeButtonText}>Cancel</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </Modal>
                                </View>

                                <View style={styles.fieldContainer}>
                                    <Text style={styles.label}>Cost (PKR)</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={editCost}
                                        onChangeText={handleEditCostChange}
                                        keyboardType="numeric"
                                    />
                                </View>

                                <View style={styles.fieldContainer}>
                                    <Text style={styles.label}>Category</Text>
                                    <View style={styles.pickerContainer}>
                                        <Picker selectedValue={editCategory} onValueChange={setEditCategory}>
                                            <Picker.Item label="Select Category" value="" />
                                            <Picker.Item label="Compliance" value="Compliance" />
                                            <Picker.Item label="Step_0" value="Step_0" />
                                            <Picker.Item label="Step_1" value="Step_1" />
                                            <Picker.Item label="Installation" value="Installation" />
                                            <Picker.Item label="Client Meetings" value="Client Meetings" />
                                        </Picker>
                                    </View>
                                </View>

                                <View style={styles.fieldContainer}>
                                    <Text style={styles.label}>Type</Text>
                                    <View style={styles.pickerContainer}>
                                        <Picker selectedValue={editType} onValueChange={setEditType}>
                                            <Picker.Item label="Select Type" value="" />
                                            <Picker.Item label="Cargo/Bykea/Parcel" value="Cargo/Bykea/Parcel" />
                                            <Picker.Item label="Fuel" value="Fuel" />
                                            <Picker.Item label="Bike Maintenance" value="Bike Maintenance" />
                                            <Picker.Item label="Food" value="Food" />
                                        </Picker>
                                    </View>
                                </View>

                                <View style={styles.fieldContainer}>
                                    <Text style={styles.label}>Client</Text>
                                    <View style={styles.pickerContainer}>
                                        <Picker
                                            selectedValue={editClient}
                                            onValueChange={(value) => setEditClient(value)}
                                        >
                                            <Picker.Item label="Select Client" value="" />
                                            {clients.map((c, index) => (
                                                <Picker.Item label={c} value={c} />
                                            ))}
                                        </Picker>
                                    </View>
                                </View>

                                <View style={styles.fieldContainer}>
                                    <Text style={styles.label}>Status</Text>
                                    <View style={styles.pickerContainer}>
                                        <Picker selectedValue={editStatus} onValueChange={setEditStatus}>
                                            <Picker.Item label="Select Status" value="" />
                                            <Picker.Item label="Paid" value="Paid" />
                                            <Picker.Item label="Unpaid" value="Unpaid" />
                                        </Picker>
                                    </View>
                                </View>

                                <View style={styles.fieldContainer}>
                                    <Text style={styles.label}>Bike/Car-No.</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={editBikeNo}
                                        onChangeText={handleEditBikeNoChange}
                                        keyboardType="numeric"
                                        maxLength={4}
                                    />
                                </View>

                                <View style={styles.fieldContainer}>
                                    <Text style={styles.label}>Description</Text>
                                    <TextInput
                                        style={[styles.input, styles.textArea]}
                                        value={editDescription}
                                        onChangeText={setEditDescription}
                                        multiline
                                    />
                                </View>

                                {/* New edit fields */}
                                <View style={styles.fieldContainer}>
                                    <Text style={styles.label}>Starting</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={editStarting}
                                        onChangeText={setEditStarting}
                                    />
                                </View>

                                <View style={styles.fieldContainer}>
                                    <Text style={styles.label}>Ending</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={editEnding}
                                        onChangeText={setEditEnding}
                                    />
                                </View>

                                <View style={styles.fieldContainer}>
                                    <Text style={styles.label}>Distance (km)</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={editDistance}
                                        onChangeText={setEditDistance}
                                        keyboardType="numeric"
                                    />
                                </View>

                                {/* Fuel-Cost (PKR) */}
                                <View style={styles.fieldContainer}>
                                    <Text style={styles.label}>Fuel-Cost (PKR)</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={editFuelCost?.toString() || ""}
                                        onChangeText={setEditFuelCost}
                                        keyboardType="decimal-pad"
                                    />
                                </View>

                                {/* --- Start Time Slider (Edit Mode) --- */}
                                <View style={styles.fieldContainer}>
                                    <Text style={styles.label}>Start Time</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Slider
                                            style={{ flex: 1 }}
                                            minimumValue={0}
                                            maximumValue={24}
                                            step={0.01}
                                            value={editStartTimeValue}
                                            onValueChange={(value) => {
                                                setEditStartTimeValue(value);
                                                calculateEditTimeConsumed(value, editEndTimeValue);
                                            }}
                                        />
                                        <Text style={{ marginLeft: 10, width: 80, textAlign: 'right' }}>
                                            {formatTime(editStartTimeValue)}
                                        </Text>
                                    </View>
                                </View>

                                {/* --- End Time Slider (Edit Mode) --- */}
                                <View style={styles.fieldContainer}>
                                    <Text style={styles.label}>End Time</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Slider
                                            style={{ flex: 1 }}
                                            minimumValue={0}
                                            maximumValue={24}
                                            step={0.01}
                                            value={editEndTimeValue}
                                            onValueChange={(value) => {
                                                setEditEndTimeValue(value);
                                                calculateEditTimeConsumed(editStartTimeValue, value);
                                            }}
                                        />
                                        <Text style={{ marginLeft: 10, width: 80, textAlign: 'right' }}>
                                            {formatTime(editEndTimeValue)}
                                        </Text>
                                    </View>
                                </View>

                                {/* --- Time Consumed (Auto Calculated) --- */}
                                <View style={styles.fieldContainer}>
                                    <Text style={styles.label}>Time Consumed (decimal hours)</Text>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: '#f0f0f0' }]}
                                        value={editTimeConsumed}
                                        editable={false}
                                        placeholder="Auto-calculated"
                                    />
                                </View>

                                {/* Buttons */}
                                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 20, paddingBottom: 20 }}>
                                    <TouchableOpacity
                                        style={[styles.actionButton, { backgroundColor: "#4caf50" }]}
                                        onPress={handleSaveEdit}
                                    >
                                        <Text style={styles.actionButtonText}>Save</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.actionButton, { backgroundColor: "#f44336" }]}
                                        onPress={handleDelete}
                                    >
                                        <Text style={styles.actionButtonText}>Delete</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.actionButton, { backgroundColor: "#607D8B" }]}
                                        onPress={handleCancelEdit}
                                    >
                                        <Text style={styles.actionButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        </View>

                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <EngineerMultiSelectModal
                visible={editMultiSelectVisible}
                engineers={engineersList}
                selected={editSelectedEngineers}
                onClose={() => setEditMultiSelectVisible(false)}
                onDone={(list) => {
                    setEditSelectedEngineers(list);       // store selected array
                    setEditEngName(list.join(", "));      // update original edit variable
                    setEditMultiSelectVisible(false);
                }}
            />

        </>
    );
};

export default StorageScreen;
