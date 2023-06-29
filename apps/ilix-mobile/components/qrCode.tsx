import React, { useState, useEffect } from "react";
import { Text, View, StyleSheet, Dimensions, ViewStyle } from "react-native";
import { BarCodeScanner } from "expo-barcode-scanner";
import type { BarCodeScannedCallback } from "expo-barcode-scanner";

type QrProps = {
  style?: ViewStyle;
  onScanned: (data: string) => void;
};
const QrCodeScanner: React.FC<QrProps> = ({ style, onScanned }) => {
  const [hasPermission, setHasPermission] = useState(false);
  const [scanned, setScanned] = useState(false);

  const getBarCodeScannerPermissions = async () => {
    const { status } = await BarCodeScanner.requestPermissionsAsync();
    setHasPermission(status === "granted");
  };

  useEffect(() => {
    getBarCodeScannerPermissions();
  }, []);

  const handleBarCodeScanned: BarCodeScannedCallback = ({ data }) => {
    setScanned(true);
    onScanned(data);
  };

  return !hasPermission ? (
    <Text>Access to camera required</Text>
  ) : (
    <View
      style={{
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "#fff",
        zIndex: 10,
      }}
    >
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={{
          ...StyleSheet.absoluteFillObject,
        }}
      />
    </View>
  );
};
export default QrCodeScanner;
