import React, { useState, useEffect } from "react";
import { type NativeStackScreenProps } from "@react-navigation/native-stack";
import { Text, View } from "react-native";
import { BarCodeScanner, type BarCodeScannedCallback } from "expo-barcode-scanner";

// types
import type { AuthNestedStack } from "../../../screens/Auth";

// ui
import tw from "twrnc";

// expo
import { Camera } from "expo-camera";

// utils
import { ToastDuration, pushToast } from "../../../lib/utils";

// -- end import

type QrScannerNavigationProps = NativeStackScreenProps<AuthNestedStack, "QrCodeScanner">;
const QrCodeScanner: React.FC<QrScannerNavigationProps> = ({ navigation }) => {
  const [permission, requestPermission] = Camera.useCameraPermissions();
  const hasPermission = permission?.granted ?? false;

  const [scanned, setScanned] = useState(false);

  const getBarCodeScannerPermissions = async () => {
    const { granted } = await requestPermission();
    if (!granted) pushToast("Access to camera is required to scan the QR code", ToastDuration.LONG);
  };

  useEffect(() => {
    !hasPermission && getBarCodeScannerPermissions();
  }, [hasPermission]);

  const handleBarCodeScanned: BarCodeScannedCallback = ({ data }) => {
    setScanned(true);
    navigation.navigate("Join", { qrResult: data });
  };

  return !hasPermission ? (
    <Text style={tw`text-xl font-bold text-center`}>Access to camera is required</Text>
  ) : (
    <View style={tw`flex-1`}>
      {!scanned && (
        <Camera
          style={tw`w-full h-full`}
          ratio="16:9"
          onBarCodeScanned={handleBarCodeScanned}
          barCodeScannerSettings={{
            barCodeTypes: [BarCodeScanner.Constants.BarCodeType.qr],
          }}
        />
      )}
    </View>
  );
};
export default QrCodeScanner;
