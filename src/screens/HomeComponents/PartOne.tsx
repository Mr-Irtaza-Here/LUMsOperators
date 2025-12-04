// src/screens/HomeComponents/PartOne.tsx
import Ionicons from "@expo/vector-icons/Ionicons";
import { Picker } from "@react-native-picker/picker";
import React from "react";
import { Animated, Modal, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Calendar } from "react-native-calendars";

interface PartOneProps {
  styles: any;
  selectedEngineers: string[];
  setMultiSelectVisible: (visible: boolean) => void;
  setClientModalVisible: (visible: boolean) => void;
  openModal: () => void;
  closeModal: () => void;
  displayDate: string;
  modalVisible: boolean;
  modalTranslateY: any;
  selectedYear: number;
  selectedDate: string;
  setSelectedYear: (year: number) => void;
  setSelectedDate: (date: string) => void;
  handleDayPress: (day: any) => void;
  cost: string;
  handleCostChange: (text: string) => void;
  category: string;
  setCategory: (value: string) => void;
  type: string;
  setType: (value: string) => void;
  client: string;
  setClient: (value: string) => void;
  clients: string[];
  status: string;
  setStatus: (value: string) => void;
}

const PartOne: React.FC<PartOneProps> = ({
  styles,
  selectedEngineers,
  setMultiSelectVisible,
  setClientModalVisible,
  openModal,
  closeModal,
  displayDate,
  modalVisible,
  modalTranslateY,
  selectedYear,
  selectedDate,
  setSelectedYear,
  setSelectedDate,
  handleDayPress,
  cost,
  handleCostChange,
  category,
  setCategory,
  type,
  setType,
  client,
  setClient,
  clients,
  status,
  setStatus,
}) => {
  return (
    <>
      {/* Client Button */}
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
            {selectedEngineers.length > 0 ? selectedEngineers.join(", ") : "Select Engineers"}
          </Text>
          <Ionicons name="chevron-down-outline" size={20} color="#555" />
        </TouchableOpacity>
      </View>

      {/* Date */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Date</Text>
        <TouchableOpacity
          style={styles.inputContainer}
          onPress={openModal} // ✅ Correct function to open calendar
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
                { transform: [{ translateY: modalTranslateY }], paddingBottom: 50 },
              ]}
            >
              <View style={styles.modalHandle} />

              {/* Year Selector + Calendar */}
              <View style={{ marginBottom: 10 }}>
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
                      const d = new Date(selectedDate);
                      const newDate = `${year}-${(d.getMonth() + 1)
                        .toString()
                        .padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
                      setSelectedDate(newDate);
                    }}
                  >
                    {Array.from({ length: 61 }, (_, i) => 2020 + i).map((year) => (
                      <Picker.Item key={year} label={`${year}`} value={year} />
                    ))}
                  </Picker>
                </View>

                <Calendar
                key={selectedYear}
                  current={
                    selectedDate
                      ? `${selectedYear}-${(new Date(selectedDate).getMonth() + 1)
                          .toString()
                          .padStart(2, "0")}-01`
                      : `${selectedYear}-01-01`
                  }
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
              <Picker.Item key={index} label={c} value={c} />
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
    </>
  );
};

export default PartOne;
