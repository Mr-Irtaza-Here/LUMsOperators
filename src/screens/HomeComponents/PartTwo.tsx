// src/screens/HomeComponents/PartTwo.tsx
import Slider from "@react-native-community/slider";
import React from "react";
import { Text, TextInput, View } from "react-native";

interface PartTwoProps {
  styles: any;
  bikeNo: string;
  handleBikeNoChange: (text: string) => void;
  description: string;
  setDescription: (text: string) => void;
  startingLocation: string;
  setStartingLocation: (text: string) => void;
  endingLocation: string;
  setEndingLocation: (text: string) => void;
  distanceKm: string;
  setDistanceKm: (text: string) => void;
  fuelCostPerKm: string;
  setFuelCostPerKm: (text: string) => void;
  startTimeValue: number;
  setStartTimeValue: (value: number) => void;
  endTimeValue: number;
  setEndTimeValue: (value: number) => void;
  calculateTimeConsumed: (start: number, end: number) => void;
  timeConsumed: string;
  formatTime: (value: number) => string;
}

const PartTwo: React.FC<PartTwoProps> = ({
  styles,
  bikeNo,
  handleBikeNoChange,
  description,
  setDescription,
  startingLocation,
  setStartingLocation,
  endingLocation,
  setEndingLocation,
  distanceKm,
  setDistanceKm,
  fuelCostPerKm,
  setFuelCostPerKm,
  startTimeValue,
  setStartTimeValue,
  endTimeValue,
  setEndTimeValue,
  calculateTimeConsumed,
  timeConsumed,
  formatTime,
}) => {
  return (
    <>
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
          onChangeText={(text) => {
            const numericText = text.replace(/[^0-9.]/g, "");
            const validText = numericText.split(".").length > 2
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
          onChangeText={(text) => {
            const numericText = text.replace(/[^0-9.]/g, "");
            const validText = numericText.split(".").length > 2
              ? numericText.substring(0, numericText.length - 1)
              : numericText;
            setFuelCostPerKm(validText);
          }}
          placeholder="Enter fuel cost per km"
          keyboardType="decimal-pad"
        />
      </View>

      {/* Start Time Slider */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Start Time</Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Slider
            style={{ flex: 1 }}
            minimumValue={0}
            maximumValue={24}
            step={0.01}
            value={startTimeValue}
            onValueChange={(value) => {
              setStartTimeValue(value);
              calculateTimeConsumed(value, endTimeValue);
            }}
          />
          <Text style={{ marginLeft: 10, width: 80, textAlign: "right" }}>
            {formatTime(startTimeValue)}
          </Text>
        </View>
      </View>

      {/* End Time Slider */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>End Time</Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
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
          <Text style={{ marginLeft: 10, width: 80, textAlign: "right" }}>
            {formatTime(endTimeValue)}
          </Text>
        </View>
      </View>

      {/* Time Consumed */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Time Consumed (decimal hours)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: "#f0f0f0" }]}
          value={timeConsumed}
          editable={false}
          placeholder="Auto-calculated"
        />
      </View>
    </>
  );
};

export default PartTwo;
